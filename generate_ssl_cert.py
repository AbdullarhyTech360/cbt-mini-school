#!/usr/bin/env python3
"""
Script to generate self-signed SSL certificates for development
"""
import os
import ssl
from datetime import datetime, timedelta
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa


def generate_self_signed_cert():
    """Generate a self-signed certificate for development"""
    
    # Generate private key
    key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )
    
    # Generate a self-signed certificate
    subject = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Development"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, "Local"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "CBT Mini School Dev"),
        x509.NameAttribute(NameOID.COMMON_NAME, "localhost"),
    ])
    
    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        subject  # self-signed
    ).public_key(
        key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.utcnow()
    ).not_valid_after(
        datetime.utcnow() + timedelta(days=365)  # Valid for 1 year
    ).add_extension(
        x509.SubjectAlternativeName([
            x509.DNSName("localhost"),
            x509.DNSName("127.0.0.1"),
            x509.DNSName("0.0.0.0"),
            # Add the IP from the error logs if needed
            x509.DNSName("192.168.23.63"),
        ]),
        critical=False,
    ).sign(key, hashes.SHA256())
    
    # Write private key
    with open("key.pem", "wb") as f:
        f.write(key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ))
    
    # Write certificate
    with open("cert.pem", "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))
    
    print("SSL certificates generated successfully!")
    print("- cert.pem (certificate)")
    print("- key.pem (private key)")
    print("\nYour Flask app will now use SSL when both files are present.")


if __name__ == "__main__":
    # Check if certificates already exist
    if os.path.exists("cert.pem") and os.path.exists("key.pem"):
        print("SSL certificates already exist.")
        print("If you want to regenerate them, delete cert.pem and key.pem first.")
    else:
        try:
            from cryptography import x509
            generate_self_signed_cert()
        except ImportError:
            print("The 'cryptography' package is required to generate SSL certificates.")
            print("Install it with: pip install cryptography")
            print("\nAlternatively, you can run the app without SSL (the current setup will work).")