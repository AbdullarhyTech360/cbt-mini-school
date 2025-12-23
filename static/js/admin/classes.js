// Modal functionality
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Custom class name toggle handler
    const useCustomNameCheckbox = document.getElementById('useCustomName');
    const autoNameField = document.getElementById('autoNameField');
    const customNameField = document.getElementById('customNameField');
    const sectionField = document.getElementById('sectionField');
    const levelField = document.getElementById('levelField');
    const sectionSelect = document.getElementById('sectionId');
    const levelInput = document.getElementById('level');
    const customClassNameInput = document.getElementById('customClassName');
    
    if (useCustomNameCheckbox) {
        useCustomNameCheckbox.addEventListener('change', function() {
            const isCustom = this.checked;
            
            if (isCustom) {
                // Show custom name field, hide auto-generated
                autoNameField.classList.add('hidden');
                customNameField.classList.remove('hidden');
                
                // Make section and level optional
                sectionSelect.required = false;
                levelInput.required = false;
                customClassNameInput.required = true;
                
                // Hide required indicators
                document.getElementById('sectionRequired')?.classList.add('hidden');
                document.getElementById('levelRequired')?.classList.add('hidden');
            } else {
                // Show auto-generated field, hide custom
                autoNameField.classList.remove('hidden');
                customNameField.classList.add('hidden');
                
                // Make section and level required again
                sectionSelect.required = true;
                levelInput.required = true;
                customClassNameInput.required = false;
                
                // Show required indicators
                document.getElementById('sectionRequired')?.classList.remove('hidden');
                document.getElementById('levelRequired')?.classList.remove('hidden');
                
                // Regenerate class name
                generateClassName();
            }
        });
    }
    
    // Create class modal
    const createClassBtn = document.querySelector('[data-modal-target="createClassModal"]');
    createClassBtn?.addEventListener('click', () => {
        openModal('createClassModal');
        // Reset custom name checkbox
        if (useCustomNameCheckbox) {
            useCustomNameCheckbox.checked = false;
            useCustomNameCheckbox.dispatchEvent(new Event('change'));
        }
        // Generate initial class name on open
        generateClassName();
    });

    function generateClassName() {
        const sectionSelect = document.getElementById('sectionId');
        const levelInput = document.getElementById('level');
        const groupInput = document.getElementById('group');
        const classNameInput = document.getElementById('className');
        const previewEl = document.getElementById('classNamePreview');

        if (!sectionSelect || !classNameInput || !previewEl) return;

        const selectedOption = sectionSelect.options[sectionSelect.selectedIndex];
        const abbr = selectedOption ? (selectedOption.getAttribute('data-abbr') || '').trim() : '';
        const level = (levelInput?.value || '').trim();
        const groupRaw = (groupInput?.value || '').trim();
        const group = groupRaw ? groupRaw.toUpperCase() : '';

        let parts = [];
        if (abbr) parts.push(abbr);
        if (level) parts.push(level);
        if (group) parts.push(group);

        const generated = parts.length ? parts.join(' ') : '';
        classNameInput.value = generated;
        previewEl.textContent = generated || '—';
    }

    // Attach listeners for live updates
    ['sectionId','level','group'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', generateClassName);
        el.addEventListener('change', generateClassName);
    });

    // Import modal
    document.querySelector('[data-modal-target="importModal"]')?.addEventListener('click', () => openModal('importModal'));

    // Close modals when clicking outside
    document.querySelectorAll('[id$="Modal"]').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });

    // Close modals on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('[id$="Modal"]').forEach(modal => {
                closeModal(modal.id);
            });
        }
    });

    // Edit class functionality
    document.querySelectorAll('.edit-class-btn').forEach(button => {
        button.addEventListener('click', function() {
            const classId = this.getAttribute('data-class-id');
            const className = this.getAttribute('data-class-name');
            const formTeacher = this.getAttribute('data-form-teacher');
            const classCapacity = this.getAttribute('data-class-capacity');
            const sectionId = this.getAttribute('data-section-id');
            const level = this.getAttribute('data-level');
            const group = this.getAttribute('data-group');
            const academicYear = this.getAttribute('data-academic-year');
            const isActive = this.getAttribute('data-is-active') === 'true';
            
            // Populate edit form
            document.getElementById('editClassId').value = classId;
            document.getElementById('editClassName').value = className;
            document.getElementById('editFormTeacher').value = formTeacher || '';
            document.getElementById('editClassCapacity').value = classCapacity;
            document.getElementById('editSectionId').value = sectionId || '';
            document.getElementById('editLevel').value = level || '';
            document.getElementById('editGroup').value = group || '';
            document.getElementById('editAcademicYear').value = academicYear || '';
            document.getElementById('editIsActive').checked = isActive;
            document.getElementById('editClassNamePreview').textContent = className;

            // Attach listeners for live updates in edit modal
            ['editSectionId','editLevel','editGroup'].forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                el.addEventListener('input', generateEditClassName);
                el.addEventListener('change', generateEditClassName);
            });

            // Open edit modal
            openModal('editClassModal');
        });
    });

    // Delete class functionality
    document.querySelectorAll('.delete-class-btn').forEach(button => {
        button.addEventListener('click', function() {
            const classId = this.getAttribute('data-class-id');
            const className = this.getAttribute('data-class-name');

            // Use custom confirmation modal if available
            if (typeof window.showConfirmModal !== 'undefined') {
                window.showConfirmModal({
                    title: 'Delete Class',
                    message: `Are you sure you want to delete the class "${className}"? This action cannot be undone.`,
                    confirmText: 'Delete',
                    cancelText: 'Cancel',
                    confirmClass: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
                    onConfirm: function() {
                        deleteClass(classId);
                    }
                });
            } else {
                // Fallback to native confirm
                if (confirm(`Are you sure you want to delete the class "${className}"?`)) {
                    deleteClass(classId);
                }
            }
        });
    });

    // Function to delete a class
    function deleteClass(classId) {
        fetch(`/admin/delete/class/${classId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success message
                if (typeof window.showAlert !== 'undefined') {
                    window.showAlert({
                        type: 'success',
                        title: 'Success!',
                        message: data.message,
                        onConfirm: function() {
                            window.location.reload();
                        }
                    });
                } else {
                    alert(data.message);
                    window.location.reload();
                }
            } else {
                // Show error message
                if (typeof window.showAlert !== 'undefined') {
                    window.showAlert({
                        type: 'error',
                        title: 'Error',
                        message: data.message
                    });
                } else {
                    alert('Error: ' + data.message);
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            if (typeof window.showAlert !== 'undefined') {
                window.showAlert({
                    type: 'error',
                    title: 'Error',
                    message: 'An error occurred while deleting the class.'
                });
            } else {
                alert('An error occurred while deleting the class.');
            }
        });
    }

    // Edit class form submission
    document.getElementById('editClassForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const classId = document.getElementById('editClassId').value;
        const className = document.getElementById('editClassName').value;
        const formTeacher = document.getElementById('editFormTeacher').value;
        const classCapacity = document.getElementById('editClassCapacity').value;
        const description = document.getElementById('editDescription').value;
        const sectionId = document.getElementById('editSectionId').value;
        const level = document.getElementById('editLevel').value;
        const group = document.getElementById('editGroup').value;
        const academicYear = document.getElementById('editAcademicYear').value;
        const isActive = document.getElementById('editIsActive').checked;

        const data = {
            class_name: className,
            form_teacher: formTeacher,
            class_capacity: classCapacity,
            description: description,
            section_id: sectionId,
            level: level,
            group: group,
            academic_year: academicYear,
            is_active: isActive
        };

        fetch(`/admin/update/class/${classId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success message
                if (typeof window.showAlert !== 'undefined') {
                    window.showAlert({
                        type: 'success',
                        title: 'Success!',
                        message: data.message,
                        onConfirm: function() {
                            closeModal('editClassModal');
                            window.location.reload();
                        }
                    });
                } else {
                    alert(data.message);
                    closeModal('editClassModal');
                    window.location.reload();
                }
            } else {
                // Show error message
                if (typeof window.showAlert !== 'undefined') {
                    window.showAlert({
                        type: 'error',
                        title: 'Error',
                        message: data.message
                    });
                } else {
                    alert('Error: ' + data.message);
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            if (typeof window.showAlert !== 'undefined') {
                window.showAlert({
                    type: 'error',
                    title: 'Error',
                    message: 'An error occurred while updating the class.'
                });
            } else {
                alert('An error occurred while updating the class.');
            }
        });
    });

    // Create class form submission
    document.getElementById('createClassForm')?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const useCustomName = document.getElementById('useCustomName').checked;
        let className;
        
        if (useCustomName) {
            // Use custom class name
            className = document.getElementById('customClassName').value.trim();
            if (!className) {
                alert('Please enter a custom class name');
                return;
            }
        } else {
            // Ensure className is generated before submit
            generateClassName();
            className = document.getElementById('className').value;
            if (!className) {
                alert('Please fill in all required fields to generate class name');
                return;
            }
        }
        
        const formTeacher = document.getElementById('formTeacher').value;
        const classCapacity = document.getElementById('classCapacity').value;
        const description = document.getElementById('description').value;
        const sectionId = useCustomName ? null : document.getElementById('sectionId').value;
        const level = useCustomName ? null : document.getElementById('level').value;
        const group = document.getElementById('group').value;
        const academicYear = document.getElementById('academicYear').value;
        const isActive = document.getElementById('isActive').checked;

        const data = {
            className,
            formTeacher,
            classCapacity,
            description,
            sectionId,
            level,
            group,
            academicYear,
            isActive,
            isCustom: useCustomName
        };
        fetch('/admin/create_class', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            closeModal('createClassModal');
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });

    // Function for refreshing the table
    document.getElementById('refresh-button')?.addEventListener('click', () => window.location.reload());

    const searchInput = document.getElementById('searchInput');
    const classRows = document.querySelectorAll('tbody tr');

    searchInput?.addEventListener('input', (e) => {
        const searchValue = e.target.value.toLowerCase().trim();
        
        classRows.forEach(row => {
            // Get all text content from the row
            const rowText = row.textContent.toLowerCase();
            // Show/hide based on search match
            row.style.display = rowText.includes(searchValue) ? '' : 'none';
        });
        const className = document.querySelector(".class-name");
        const formTeacher = document.querySelector(".form-teacher");

        if (className && formTeacher) {
            if (className.textContent.toLowerCase().includes(searchValue) || formTeacher.textContent.toLowerCase().includes(searchValue)) {
                className.parentElement.style.display = '';
            } else {
                className.parentElement.style.display = 'none';
            }
        }
    })

    document.getElementById('sectionFilter')?.addEventListener('change', function(e) {
        const selectedSectionId = e.target.value;
        
        const rows = document.querySelectorAll('tbody tr');
        if (selectedSectionId === 'all') {
            rows.forEach(row => {
                row.style.display = '';
            });
            console.log('all')
            return
        }
        rows.forEach(row => {
            const sectionId = row.getAttribute('data-section-id');
            row.style.display = sectionId === selectedSectionId ? '' : 'none';
        });
    });

    function generateEditClassName() {
        const sectionSelect = document.getElementById('editSectionId');
        const levelInput = document.getElementById('editLevel');
        const groupInput = document.getElementById('editGroup');
        const classNameInput = document.getElementById('editClassName');
        const previewEl = document.getElementById('editClassNamePreview');

        if (!sectionSelect || !classNameInput || !previewEl) return;

        const selectedOption = sectionSelect.options[sectionSelect.selectedIndex];
        const abbr = selectedOption ? (selectedOption.getAttribute('data-abbr') || '').trim() : '';
        const level = (levelInput?.value || '').trim();
        const groupRaw = (groupInput?.value || '').trim();
        const group = groupRaw ? groupRaw.toUpperCase() : '';

        let parts = [];
        if (abbr) parts.push(abbr);
        if (level) parts.push(level);
        if (group) parts.push(group);

        const generated = parts.length ? parts.join(' ') : '';
        classNameInput.value = generated;
        previewEl.textContent = generated || '—';
    }
});
