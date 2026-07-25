"""
Hardware fingerprint collector — Cross-platform (Windows + Linux).

Uses hardware identifiers that do NOT change between reboots or network
connections. Avoids MAC address (randomized on modern systems).

Windows:
  - MachineGuid (registry)
  - CPU ProcessorId (PowerShell/wmic)
  - BIOS SerialNumber (PowerShell/wmic)
  - System UUID (PowerShell/wmic)

Linux:
  - /etc/machine-id (unique per OS install)
  - CPU ID (dmidecode or /proc/cpuinfo)
  - BIOS Serial (dmidecode)
  - System UUID (dmidecode)
"""

import hashlib
import os
import platform
import subprocess


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _run_cmd(cmd: list[str], timeout: int = 10) -> str:
    """Run a command and return stripped stdout. Returns empty string on failure."""
    try:
        creationflags = 0
        if platform.system() == "Windows":
            creationflags = subprocess.CREATE_NO_WINDOW
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            creationflags=creationflags,
        )
        return result.stdout.strip()
    except Exception:
        return ""


# ---------------------------------------------------------------------------
# Windows-specific
# ---------------------------------------------------------------------------

def _run_powershell(command: str, timeout: int = 10) -> str:
    """Run a PowerShell command and return stripped output."""
    return _run_cmd(["powershell", "-NoProfile", "-Command", command], timeout)


def _run_wmic(args: list[str], timeout: int = 10) -> str:
    """Run wmic command (older Windows fallback)."""
    lines = _run_cmd(["wmic"] + args, timeout).split("\n")
    lines = [l.strip() for l in lines if l.strip()]
    return lines[1] if len(lines) > 1 else ""


def _win_machine_guid() -> str:
    try:
        import winreg
        key = winreg.OpenKey(
            winreg.HKEY_LOCAL_MACHINE,
            r"SOFTWARE\Microsoft\Cryptography",
        )
        value, _ = winreg.QueryValueEx(key, "MachineGuid")
        winreg.CloseKey(key)
        return str(value)
    except Exception:
        return ""


def _win_cpu_id() -> str:
    val = _run_powershell("(Get-CimInstance -ClassName Win32_Processor).ProcessorId")
    return val if val else _run_wmic(["cpu", "get", "ProcessorId"])


def _win_bios_serial() -> str:
    val = _run_powershell("(Get-CimInstance -ClassName Win32_BaseBoard).SerialNumber")
    return val if val else _run_wmic(["bios", "get", "SerialNumber"])


def _win_system_uuid() -> str:
    val = _run_powershell("(Get-CimInstance -ClassName Win32_ComputerSystemProduct).UUID")
    return val if val else _run_wmic(["csproduct", "get", "UUID"])


# ---------------------------------------------------------------------------
# Linux-specific
# ---------------------------------------------------------------------------

def _read_sysfs(path: str) -> str:
    """Read a value from /sys/class/dmi/id/. No root required on most systems."""
    try:
        with open(path, "r") as f:
            val = f.read().strip()
            if val and val not in ("To Be Filled By O.E.M.", "Default string", "Not Specified"):
                return val
    except Exception:
        pass
    return ""


def _linux_machine_id() -> str:
    """Read /etc/machine-id — unique per OS install, very stable."""
    for path in ["/etc/machine-id", "/var/lib/dbus/machine-id"]:
        try:
            with open(path, "r") as f:
                val = f.read().strip()
                if val:
                    return val
        except Exception:
            continue
    return ""


def _linux_cpu_id() -> str:
    """Get CPU ID — try dmidecode, then /proc/cpuinfo."""
    # Try dmidecode (may need sudo)
    val = _run_cmd(["dmidecode", "-s", "processor-id"])
    if val and "permission" not in val.lower() and "not found" not in val.lower():
        return val

    # Fallback: /proc/cpuinfo (always readable)
    try:
        with open("/proc/cpuinfo", "r") as f:
            for line in f:
                if line.startswith("model name"):
                    return line.split(":", 1)[1].strip()
    except Exception:
        pass

    return ""


def _linux_bios_serial() -> str:
    """Get BIOS serial — try /sys first, then dmidecode."""
    # Try /sys (no root needed)
    val = _read_sysfs("/sys/class/dmi/id/board_serial")
    if val:
        return val

    # Try dmidecode
    val = _run_cmd(["dmidecode", "-s", "baseboard-serial-number"])
    if val and "permission" not in val.lower() and "not found" not in val.lower():
        return val

    return ""


def _linux_system_uuid() -> str:
    """Get system UUID — try /sys first, then dmidecode."""
    # Try /sys (no root needed)
    val = _read_sysfs("/sys/class/dmi/id/product_uuid")
    if val:
        return val

    # Try dmidecode
    val = _run_cmd(["dmidecode", "-s", "system-uuid"])
    if val and "permission" not in val.lower() and "not found" not in val.lower():
        return val

    return ""


def _linux_board_name() -> str:
    """Get motherboard product name — try /sys first, then dmidecode."""
    val = _read_sysfs("/sys/class/dmi/id/board_name")
    if val:
        return val

    val = _run_cmd(["dmidecode", "-s", "baseboard-product-name"])
    if val and "permission" not in val.lower() and "not found" not in val.lower():
        return val

    return ""


# ---------------------------------------------------------------------------
# Platform dispatcher
# ---------------------------------------------------------------------------

def _get_identifiers() -> dict[str, str]:
    """Collect hardware identifiers for the current platform."""
    system = platform.system()

    if system == "Windows":
        return {
            "machine_guid": _win_machine_guid(),
            "cpu_id": _win_cpu_id(),
            "bios_serial": _win_bios_serial(),
            "system_uuid": _win_system_uuid(),
        }
    elif system == "Linux":
        return {
            "machine_id": _linux_machine_id(),
            "cpu_id": _linux_cpu_id(),
            "bios_serial": _linux_bios_serial(),
            "system_uuid": _linux_system_uuid(),
            "board_name": _linux_board_name(),
        }
    else:
        # Fallback for macOS or unknown — use hostname + platform info
        return {
            "platform": f"{system}-{platform.machine()}",
            "node": platform.node(),
            "processor": platform.processor(),
        }


def get_machine_id() -> str:
    """
    Generate a unique, STABLE hardware fingerprint for this machine.

    Combines only hardware-level identifiers that do NOT change between
    reboots, network switches, or WiFi randomization.

    Returns:
        str: The machine's hardware ID (64-character SHA-256 hex digest).
    """
    components = _get_identifiers()

    # Filter out empty values
    valid = {k: v for k, v in components.items() if v}

    # Absolute fallback: hostname (least stable, but better than nothing)
    if not valid:
        valid["hostname"] = platform.node()

    # Sort keys for deterministic output
    raw = "|".join(f"{k}={valid[k]}" for k in sorted(valid.keys()))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


if __name__ == "__main__":
    print(f"Platform : {platform.system()} {platform.machine()}")
    print(f"Machine ID: {get_machine_id()}")
    print()

    print("Component breakdown:")
    components = _get_identifiers()
    for key, val in components.items():
        label = key.replace("_", " ").title()
        print(f"  {label:15s}: {val or '(not available)'}")
