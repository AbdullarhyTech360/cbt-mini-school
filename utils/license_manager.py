"""
License file verification using RSA public key cryptography.

Reads a signed license.lic file and validates it against the current machine's
hardware fingerprint.
"""

import json
import os
import sys

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

from utils.machine_id import get_machine_id


def _get_license_dir() -> str:
    """
    Directory where license.lic is expected.

    - Frozen (exe): next to the executable
    - Dev mode: project root
    """
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def _get_public_key_path() -> str:
    """
    Path to the embedded public key.

    - Frozen (exe): sys._MEIPASS (bundled inside the exe)
    - Dev mode: project root
    """
    if getattr(sys, "frozen", False):
        return os.path.join(sys._MEIPASS, "public_key.pem")
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public_key.pem"))


def _load_public_key():
    """Load the RSA public key from the bundled public_key.pem."""
    path = _get_public_key_path()
    if not os.path.exists(path):
        raise FileNotFoundError(f"Public key not found at: {path}")
    with open(path, "rb") as f:
        return serialization.load_pem_public_key(f.read())


def _load_license_data() -> dict:
    """Read and parse the license.lic JSON file."""
    path = os.path.join(_get_license_dir(), "license.lic")
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _verify_signature(data: dict, signature_b64: str, public_key) -> bool:
    """Verify the RSA signature against the license payload."""
    import base64

    try:
        # Reconstruct the signed payload (all fields except signature)
        payload = {k: v for k, v in data.items() if k != "signature"}
        payload_bytes = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")

        signature = base64.b64decode(signature_b64)

        public_key.verify(
            signature,
            payload_bytes,
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
        return True
    except (InvalidSignature, Exception):
        return False


def verify_license() -> tuple[bool, str, str]:
    """
    Verify the license file against the current machine.

    Returns:
        Tuple of (is_valid, message, school_name).
        - is_valid: True if license is valid for this machine.
        - message: Human-readable status message.
        - school_name: The licensed school name (empty if invalid).
    """
    # Load license file
    license_data = _load_license_data()
    if not license_data:
        return False, "No license file found. Please activate your license.", ""

    # Check required fields
    required_fields = ["hwid", "school", "signature"]
    for field in required_fields:
        if field not in license_data:
            return False, "License file is corrupted or incomplete.", ""

    # Load public key and verify signature
    try:
        public_key = _load_public_key()
    except FileNotFoundError as e:
        return False, str(e), ""
    except Exception as e:
        return False, f"Failed to load verification key: {e}", ""

    if "signature" not in license_data:
        return False, "License file is missing its digital signature.", ""

    if not _verify_signature(license_data, license_data["signature"], public_key):
        return False, "License signature is invalid. The license file may have been tampered with.", ""

    # Check hardware ID match
    current_hwid = get_machine_id()
    licensed_hwid = license_data["hwid"]

    if current_hwid != licensed_hwid:
        return (
            False,
            "This license is not valid for this machine.\n"
            "  Licensed Hardware ID: " + licensed_hwid[:16] + "...\n"
            "  Your Hardware ID:     " + current_hwid[:16] + "...",
            "",
        )

    school_name = license_data.get("school", "Unknown School")
    return True, f"License verified for: {school_name}", school_name


def get_hwid() -> str:
    """Return the current machine's hardware ID."""
    return get_machine_id()
