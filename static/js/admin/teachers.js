// console.log("Document is loaded")
document.addEventListener('DOMContentLoaded', function () {
    // const searchInput = document.getElementById('searchInput');
    const tableRows = document.querySelectorAll('tbody tr');
    document.getElementById('searchInput')?.addEventListener('input', function (e) {
        const searchTerm = e.target.value.toLowerCase().trim();

        tableRows.forEach(row => {
            const rowText = row.textContent.toLowerCase();
            row.style.display = rowText.includes(searchTerm) ? '' : 'none';

        });
        const teacherName = document.querySelector('.teacher-name');
        const teacherEmail = document.querySelector('.teacher-email');
        const teacherSubject = document.querySelector('.teacher-subject');

        if (teacherName && teacherEmail && teacherSubject) {
            if (teacherName.textContent.toLowerCase().includes(searchTerm) || teacherEmail.textContent.toLowerCase().includes(searchTerm) || teacherSubject.textContent.toLowerCase().includes(searchTerm)) {
                teacherName.parentElement.style.display = '';
                teacherEmail.parentElement.style.display = '';
                teacherSubject.parentElement.style.display = '';
            } else {
                teacherName.parentElement.style.display = 'none';
                teacherEmail.parentElement.style.display = 'none';
                teacherSubject.parentElement.style.display = 'none';
            }
        }

    });

    // Assign class to teachers
    const form = document.getElementById('assignSubjectForm');
    if (form) {
        // Handle load subjects when class is selected
        form.querySelector('select[name="class"]').addEventListener('change', function () {
            const classId = this.value;
            if (classId) {
                fetch(`/admin/subjects/${classId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                })
                    .then(response => response.json())
                    .then(result => {
                        if (result.success) {
                            const subjects = result
                            console.log("Subjects:", subjects)
                            // Select the subject container and display the subjects
                            const subjectsContainer = document.getElementById('subjectsContainer');
                            subjectsContainer.style.display = '';

                            // Clear existing subjects first
                            subjectsContainer.innerHTML = '';

                            // Check if subjects data exists and is an array
                            const subjectsArray = result.subjects || [];

                            if (Array.isArray(subjectsArray) && subjectsArray.length > 0) {
                                subjectsArray.forEach(subject => {
                                    const subjectOption = document.createElement('label');
                                    subjectOption.className = 'flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors';
                                    subjectOption.innerHTML = `
                                    <input name="subjects[]" value="${subject.subject_id}" type="checkbox" class="assigned-subject h-4 w-4 text-primary border-gray-300 dark:border-gray-600 rounded focus:ring-primary">
                                    <span class="text-sm text-gray-700 dark:text-gray-300">${subject.subject_name}</span>
                                `;
                                    subjectsContainer.appendChild(subjectOption);
                                });
                            } else {
                                // Handle case where no subjects are available
                                subjectsContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">No subjects available for this class.</p>';
                            }
                        } else {
                            console.error('Error:', result.message);
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                    });
            }
        });
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            // Get form data
            const formData = new FormData(form);

            // Get all checkboxes for subjects

            const subjectCheckboxes = form.querySelectorAll('input[name="subjects[]"]:checked');
            const subjects_ids = Array.from(subjectCheckboxes).map(checkbox => checkbox.value);
            console.log(subjects_ids)

            // Create data object
            const data = {
                teacher_id: formData.get('teacher'),
                class_room_id: formData.get('class'),
                subjects_ids: subjects_ids
            };
            console.log(data)
            // Validate required fields

            if (!data.teacher_id || data.teacher_id === '') {
                window.showAlert({
                    title: 'Validation Error',
                    message: 'Please select a teacher',
                    type: 'error',
                    confirmText: 'OK'
                });
                return;
            }

            // Validate subject
            if (!data.subjects_ids || data.subjects_ids.length === 0) {
                window.showAlert({
                    title: 'Validation Error',
                    message: 'Please select at least one subject',
                    type: 'error',
                    confirmText: 'OK'
                });
                return;
            }

            if (!data.class_room_id || data.class_room_id === '') {
                window.showAlert({
                    title: 'Validation Error',
                    message: 'Please select a class',
                    type: 'error',
                    confirmText: 'OK'
                });
                return;
            }

            // Send data to backend
            fetch('/admin/assign_subject_teacher', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        // Show success alert using component
                        window.showAlert({
                            title: 'Assignment Successful',
                            message: result.message || 'Class and subjects assigned successfully.',
                            type: 'success',
                            confirmText: 'OK',
                            onConfirm: () => {
                                closeModal('assignModal');
                                // Optionally reload the page to reflect changes
                                location.reload();
                            }
                        });
                    } else {
                        // Show error alert using component
                        window.showAlert({
                            title: 'Assignment Failed',
                            message: result.message || 'Error assigning class',
                            type: 'error',
                            confirmText: 'Close'
                        });
                        // Close the assign modal
                        closeModal('assignModal');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    window.showAlert({
                        title: 'Network Error',
                        message: 'An error occurred while assigning the class',
                        type: 'error',
                        confirmText: 'Close'
                    });
                });
        });
    } else {
        console.error('Form with id "assignClassForm" not found!');
    }
});