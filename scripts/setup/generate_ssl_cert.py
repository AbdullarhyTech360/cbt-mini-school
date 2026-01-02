#!/usr/bin/env python3
"""
Script to generate SSL certificates for HTTPS
"""

import os
import subprocess
from datetime import datetime

def generate_ssl_certificate():
    """Generate a self-signed SSL certificate for development"""

    # Create certificates directory if it doesn't exist
    cert_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'certificates')
    os.makedirs(cert_dir, exist_ok=True)

    # Certificate paths
    key_path = os.path.join(cert_dir, 'server.key')
    cert_path = os.path.join(cert_dir, 'server.crt')

    # Check if certificates already exist
    if os.path.exists(key_path) and os.path.exists(cert_path):
        print("SSL certificates already exist. Skipping generation.")
        return

    # Generate certificate
    try:
        # Certificate details
        country = "US"
        state = "California"
        locality = "San Francisco"
        organization = "CBT Mini School"
        common_name = "localhost"

        # Build OpenSSL command
        cmd = [
            'openssl', 'req', '-x509', '-newkey', 'rsa:4096',
            '-keyout', key_path,
            '-out', cert_path,
            '-days', '365',
            '-nodes',
            '-subj', f'/C={country}/ST={state}/L={locality}/O={organization}/CN={common_name}'
        ]

        # Execute command
        subprocess.run(cmd, check=True)
        print(f"SSL certificate generated successfully at {cert_path}")
        print(f"Private key generated at {key_path}")

        # Add certificate information
        cert_info = f"""
# SSL Certificate Information
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Expires: 365 days from generation
Purpose: Development and testing only
For production, use certificates from a trusted CA
"""

        info_path = os.path.join(cert_dir, 'certificate_info.txt')
        with open(info_path, 'w') as f:
            f.write(cert_info)

    except subprocess.CalledProcessError as e:
        print(f"Error generating SSL certificate: {e}")
        print("Make sure OpenSSL is installed and accessible in your PATH")
    except Exception as e:
        print(f"Unexpected error: {e}")

if __name__ == "__main__":
    generate_ssl_certificate()
