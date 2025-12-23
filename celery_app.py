# import os
# import sys

# # Celery is no longer used for PDF generation
# # Keeping this file for backward compatibility only

# # # Ensure project root is in sys.path BEFORE any other imports
# # BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# # if BASE_DIR not in sys.path:
# #     sys.path.insert(0, BASE_DIR)

# # # Dummy Celery instance for backward compatibility
# # class DummyCelery:
# #     def __init__(self, *args, **kwargs):
# #         pass

# #     def task(self, *args, **kwargs):
# #         # Return a dummy decorator
# #         def decorator(func):
# #             return func
# #         return decorator

# #     def conf(self):
# #         return {}

# #     def autodiscover_tasks(self, *args, **kwargs):
# #         pass

# # # Create a dummy Celery instance
# # celery = DummyCelery()

# # def make_celery(app):
# #     """Dummy function for backward compatibility"""
# #     return celery

# # # Print a message indicating Celery is deprecated
# # print("WARNING: Celery is deprecated. PDF generation now uses client-side JavaScript.")
