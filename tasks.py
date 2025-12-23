# import os
# import io
# import tempfile
# import traceback
# import sys

# # Ensure project root is on sys.path so that local packages like `models` are importable
# BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# if BASE_DIR not in sys.path:
#     sys.path.insert(0, BASE_DIR)

# # PDF libs (from report_routes.py)
# # PDF libraries are no longer used for main generation flow
# # Keeping variables for backward compatibility only
# WEASYPRINT_AVAILABLE = False
# XHTML2PDF_AVAILABLE = False


# try:
#     from pypdf import PdfWriter
#     PYFPDF_AVAILABLE = True
# except ImportError as e:
#     print(f"PyPDF not available: {e}")
#     PYFPDF_AVAILABLE = False

# def initialize_flask_context():
#     """Initialize Flask app and database context"""
#     try:
#         # Import and initialize the Flask app
#         from app import app, db
#         return app, db
#     except ImportError as e:
#         print(f"Failed to import Flask app: {e}")
#         return None, None

# def run_with_app_context(func, *args, **kwargs):
#     """Run a function within the Flask app context if available"""
#     app, db = initialize_flask_context()
#     if app and db:
#         with app.app_context():
#             # Check if function expects db parameter
#             import inspect
#             sig = inspect.signature(func)
#             if 'db' in sig.parameters:
#                 return func(db, *args, **kwargs)
#             else:
#                 return func(*args, **kwargs)
#     else:
#         # Run without app context if not available
#         return func(*args, **kwargs)

# # @celery.task(bind=True)
# # def generate_single_pdf_task(self, data, job_id):
# #     """Generate a single student PDF report - Deprecated: Use client-side PDF generation"""
# #     print("PDF generation is deprecated. Use client-side PDF generation.")
# #     return None

# # @celery.task(bind=True)
# # def generate_class_pdf_task(self, data, job_id):
# #     """Generate class reports PDF - Deprecated: Use client-side PDF generation"""
# #     print("PDF generation is deprecated. Use client-side PDF generation.")
# #     return None
