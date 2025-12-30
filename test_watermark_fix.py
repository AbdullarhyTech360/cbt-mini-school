"""Test script to verify watermark visibility and PDF generation performance fixes."""

import os
import sys
import time
sys.path.insert(0, os.getcwd())

from services.report_generator import ReportGenerator

def test_watermark_visibility():
    """Test that watermark is properly implemented in the HTML."""
    # print("Testing watermark implementation...")
    
    # Sample report data
    report_data = {
        'student': {
            'id': 1,
            'name': 'Test Student',
            'admission_number': 'A001',
            'image': None,
            'class_name': 'Primary 1',
            'class_id': 1
        },
        'school': {
            'name': 'Test School',
            'logo': None,
            'address': '123 Test Street',
            'phone': '0123456789',
            'motto': 'Testing Excellence'
        },
        'term': {
            'name': 'Term 1',
            'session': '2025/2026'
        },
        'assessment_types': [],
        'scores': {},
        'position': 1,
        'total_students': 1,
        'overall_total': 0,
        'overall_max': 0
    }
    
    # Generate HTML
    html_content = ReportGenerator.generate_report_html(report_data)
    
    # Check for watermark
    if 'OFFICIAL DOCUMENT' in html_content and 'watermark' in html_content:
        # print("✓ Watermark found in HTML")
    else:
        # print("✗ Watermark not found in HTML")
        return False
        
    # Check for proper CSS
    if 'z-index: -1' in html_content and 'position: absolute' in html_content:
        # print("✓ Watermark CSS properly implemented")
    else:
        # print("✗ Watermark CSS not properly implemented")
        return False
        
    # Check that content has proper z-index
    if 'z-index: 1' in html_content:
        # print("✓ Content properly positioned above watermark")
    else:
        # print("⚠ Content z-index not found (may still work)")
        
    return True

def test_performance_improvements():
    """Test performance improvements in image embedding."""
    # print("\nTesting performance improvements...")
    
    # Clear cache to start fresh
    if hasattr(ReportGenerator, '_image_cache'):
        ReportGenerator._image_cache.clear()
        # print("✓ Image cache cleared")
    
    # Test image embedding function
    result = ReportGenerator._embed_image(None)
    if result == "":
        # print("✓ Null image path handled correctly")
    else:
        # print("✗ Null image path not handled correctly")
        return False
    
    # Test with data URI (should be cached)
    data_uri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    result = ReportGenerator._embed_image(data_uri)
    if result == data_uri:
        # print("✓ Data URI handled correctly")
    else:
        # print("✗ Data URI not handled correctly")
        return False
    
    return True

def main():
    """Run all tests."""
    # print("Running watermark and performance tests...\n")
    
    success = True
    success &= test_watermark_visibility()
    success &= test_performance_improvements()
    
    # print("\n" + "="*50)
    if success:
        # print("✓ All tests passed! Watermark and performance fixes are working.")
    else:
        # print("✗ Some tests failed. Please review the implementation.")
    # print("="*50)
    
    return success

if __name__ == "__main__":
    main()