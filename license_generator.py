"""
License Generator — DEVELOPMENT/ADMIN ONLY

This script generates signed license.lic files for client machines.
It requires the private_key.pem (which should NEVER ship with the app).

Usage:
    python license_generator.py --machine-id <HWID> --school "School Name"
    python license_generator.py --machine-id <HWID> --school "School Name" --output ./license.lic

How to get the client's HWID:
    1. Send the client the app.exe
    2. Client runs: app.exe --get-hwid
    3. Client sends you the displayed Hardware ID
    4. You run this script with that HWID
"""

import argparse
import base64
import json
import os
import sys
from datetime import datetime, timezone

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

PRIVATE_KEY_PATH = os.path.join(os.path.dirname(__file__), "private_key.pem")


def load_private_key():
    """Load the RSA private key."""
    if not os.path.exists(PRIVATE_KEY_PATH):
        print(f"[ERROR] Private key not found at: {PRIVATE_KEY_PATH}")
        print("        You must have private_key.pem to generate licenses.")
        sys.exit(1)

    with open(PRIVATE_KEY_PATH, "rb") as f:
        return serialization.load_pem_private_key(f.read(), password=None)


def generate_license(machine_id: str, school_name: str, output_path: str):
    """Generate a signed license.lic file."""
    private_key = load_private_key()

    # Build the license payload (without signature)
    payload = {
        "hwid": machine_id.strip(),
        "school": school_name.strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # Sign the payload
    payload_bytes = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    signature = private_key.sign(
        payload_bytes,
        padding.PKCS1v15(),
        hashes.SHA256(),
    )

    # Add the base64-encoded signature to the payload
    license_data = payload.copy()
    license_data["signature"] = base64.b64encode(signature).decode("utf-8")

    # Write the license file
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(license_data, f, indent=2)

    print()
    print(f"  [OK] License generated successfully!")
    print(f"  School:  {school_name}")
    print(f"  HWID:    {machine_id[:16]}...")
    print(f"  Output:  {output_path}")
    print()
    print(f"  Send this file to the client.")
    print(f"  They should place it next to app.exe")
    print()


def main():
    parser = argparse.ArgumentParser(
        description="Generate a signed license file for CBT Mini School",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python license_generator.py --machine-id abc123... --school "Spring Board Academy"
  python license_generator.py --machine-id abc123... --school "ABC School" --output ./my_license.lic
        """,
    )
    parser.add_argument(
        "--machine-id",
        required=True,
        help="The client's hardware ID (from app.exe --get-hwid)",
    )
    parser.add_argument(
        "--school",
        required=True,
        help="The school name to embed in the license",
    )
    parser.add_argument(
        "--output",
        default="license.lic",
        help="Output file path (default: license.lic)",
    )

    args = parser.parse_args()
    generate_license(args.machine_id, args.school, args.output)


if __name__ == "__main__":
    main()
