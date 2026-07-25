"""
Console output formatting for license activation messages.

Uses ANSI escape codes for colored terminal output.
Works on Windows 10+ and all Unix terminals.
"""

# ANSI color codes
_RESET = "\033[0m"
_RED = "\033[91m"
_GREEN = "\033[92m"
_YELLOW = "\033[93m"
_WHITE = "\033[97m"
_BOLD = "\033[1m"
_DIM = "\033[2m"

_BANNER_WIDTH = 60


def _enable_ansi_on_windows():
    """Enable ANSI escape code processing on Windows."""
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
    except Exception:
        pass


_enable_ansi_on_windows()


def print_banner():
    """Print the license activation banner."""
    title = "CBT Mini School - License Activation"
    padding = (_BANNER_WIDTH - len(title) - 2) // 2
    print()
    print(f"{_BOLD}{_WHITE}{'=' * _BANNER_WIDTH}{_RESET}")
    print(f"{_BOLD}{_WHITE}{'=' * _BANNER_WIDTH}{_RESET}")
    print(f"{_BOLD}{_WHITE}{'=' * padding} {title} {'=' * (_BANNER_WIDTH - padding - len(title) - 2)}{_RESET}")
    print(f"{_BANNER_WIDTH * '='}")
    print()


def print_ok(message: str):
    """Print a success message in green."""
    print(f"  {_GREEN}[OK]{_RESET} {message}")


def print_error(message: str):
    """Print an error message in red."""
    print(f"  {_RED}[ERROR]{_RESET} {message}")


def print_warning(message: str):
    """Print a warning message in yellow."""
    print(f"  {_YELLOW}[WARNING]{_RESET} {message}")


def print_info(message: str):
    """Print an info message in white."""
    print(f"  {_WHITE}{message}{_RESET}")


def print_hwid_header():
    """Print the HWID display banner."""
    title = "CBT Mini School - Hardware ID"
    padding = (_BANNER_WIDTH - len(title) - 2) // 2
    print()
    print(f"{_BOLD}{_WHITE}{'=' * _BANNER_WIDTH}{_RESET}")
    print(f"{_BOLD}{_WHITE}{'=' * _BANNER_WIDTH}{_RESET}")
    print(f"{_BOLD}{_WHITE}{'=' * padding} {title} {'=' * (_BANNER_WIDTH - padding - len(title) - 2)}{_RESET}")
    print(f"{_BANNER_WIDTH * '='}")
    print()


def pause_and_exit(message: str = "Press Enter to exit...", exit_code: int = 1):
    """Wait for user input, then exit."""
    print()
    try:
        input(f"  {_DIM}{message}{_RESET}")
    except (EOFError, KeyboardInterrupt):
        pass
    import sys
    sys.exit(exit_code)
