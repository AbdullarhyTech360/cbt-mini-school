#!/usr/bin/env python3
"""
Script to start a fake Redis server for development
"""

import os
import sys
import threading
import time
from fakeredis import FakeServer, FakeStrictRedis

def start_fake_redis():
    """Start a fake Redis server for development"""
    print("Starting fake Redis server...")
    
    # Create a fake Redis server
    server = FakeServer()
    
    # Create a fake Redis client
    redis_client = FakeStrictRedis(server=server)
    
    # Test the connection
    redis_client.set('test_key', 'test_value')
    value = redis_client.get('test_key')
    print(f"Fake Redis test: {value.decode('utf-8')}")
    
    print("Fake Redis server is running. Press Ctrl+C to stop.")
    
    try:
        # Keep the server running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping fake Redis server...")
        sys.exit(0)

if __name__ == "__main__":
    # Set environment variable to use fakeredis
    os.environ['USE_FAKEREDIS'] = 'true'
    start_fake_redis()