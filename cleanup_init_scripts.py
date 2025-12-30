#!/usr/bin/env python3
"""
Script to clean up individual initialization scripts after creating the consolidated script.
This script deletes the individual initialization scripts that are no longer needed.
"""

import os
import shutil

# List of files to delete
files_to_delete = [
    "utils/initialize_defaults.py",
    "utils/complete_initialization.py",
    "scripts/create_admin_user.py",
    "scripts/create_default_users.py",
    "scripts/create_demo_user.py",
    "scripts/verify_admin_user.py",
    "scripts/verify_default_users.py",
    "scripts/run_grade_scale_migration.py",
]

# List of directories to delete
dirs_to_delete = [
    "scripts/archive",
]

def delete_files():
    """Delete individual initialization files"""
    deleted_files = []
    failed_files = []
    
    for file_path in files_to_delete:
        full_path = os.path.join(os.getcwd(), file_path)
        if os.path.exists(full_path):
            try:
                os.remove(full_path)
                deleted_files.append(file_path)
                # print(f"✓ Deleted: {file_path}")
            except Exception as e:
                failed_files.append((file_path, str(e)))
                # print(f"✗ Failed to delete {file_path}: {e}")
        else:
            # print(f"- File not found (already deleted): {file_path}")
    
    return deleted_files, failed_files

def delete_directories():
    """Delete directories containing initialization scripts"""
    deleted_dirs = []
    failed_dirs = []
    
    for dir_path in dirs_to_delete:
        full_path = os.path.join(os.getcwd(), dir_path)
        if os.path.exists(full_path):
            try:
                shutil.rmtree(full_path)
                deleted_dirs.append(dir_path)
                # print(f"✓ Deleted directory: {dir_path}")
            except Exception as e:
                failed_dirs.append((dir_path, str(e)))
                # print(f"✗ Failed to delete directory {dir_path}: {e}")
        else:
            # print(f"- Directory not found (already deleted): {dir_path}")
    
    return deleted_dirs, failed_dirs

def main():
    """Main cleanup function"""
    # print("Cleaning up individual initialization scripts...")
    # print("=" * 50)
    
    # Delete files
    deleted_files, failed_files = delete_files()
    
    # print()
    
    # Delete directories
    deleted_dirs, failed_dirs = delete_directories()
    
    # print("\n" + "=" * 50)
    # print("CLEANUP SUMMARY")
    # print("=" * 50)
    
    # print(f"Files deleted: {len(deleted_files)}")
    for file_path in deleted_files:
        # print(f"  ✓ {file_path}")
    
    # print(f"Directories deleted: {len(deleted_dirs)}")
    for dir_path in deleted_dirs:
        # print(f"  ✓ {dir_path}")
    
    if failed_files or failed_dirs:
        # print("\nFailed operations:")
        for file_path, error in failed_files:
            # print(f"  ✗ {file_path}: {error}")
        for dir_path, error in failed_dirs:
            # print(f"  ✗ {dir_path}: {error}")
    else:
        # print("\n✅ All cleanup operations completed successfully!")
    
    # print("\nNote: Only the consolidated initialize_all_data.py script is needed now.")

if __name__ == "__main__":
    # Confirm with user before proceeding
    response = input("This will delete individual initialization scripts. Are you sure? (y/N): ")
    if response.lower() in ['y', 'yes']:
        main()
    else:
        # print("Cleanup cancelled.")

