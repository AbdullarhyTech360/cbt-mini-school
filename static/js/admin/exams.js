document.addEventListener('DOMContentLoaded', function () {
    // Check if modal functions are available
    if (typeof window.showAlert === 'undefined' || typeof window.showConfirmModal === 'undefined') {
        console.error('Modal functions not loaded! Make sure modal.js is included before exams.js');
        return;
    }

    // Set initial active tab state
    const activeTab = document.getElementById('active-exams-tab');
    const finishedTab = document.getElementById('finished-exams-tab');
    const resetTab = document.getElementById('reset-exams-tab');

    if (activeTab) {
        activeTab.classList.remove('text-gray-600', 'dark:text-gray-300', 'hover:text-gray-800', 'dark:hover:text-gray-200', 'hover:bg-gray-200', 'dark:hover:bg-gray-700/50');
        activeTab.classList.add('bg-white', 'dark:bg-gray-700', 'text-primary', 'shadow-sm');
    }

    if (finishedTab) {
        finishedTab.classList.remove('bg-white', 'dark:bg-gray-700', 'text-primary', 'shadow-sm');
        finishedTab.classList.add('text-gray-600', 'dark:text-gray-300', 'hover:text-gray-800', 'dark:hover:text-gray-200', 'hover:bg-gray-200', 'dark:hover:bg-gray-700/50');
    }

    if (resetTab) {
        resetTab.classList.remove('bg-white', 'dark:bg-gray-700', 'text-primary', 'shadow-sm');
        resetTab.classList.add('text-gray-600', 'dark:text-gray-300', 'hover:text-gray-800', 'dark:hover:text-gray-200', 'hover:bg-gray-200', 'dark:hover:bg-gray-700/50');
    }

    // Handle "Create Exam" button in empty state
    document.querySelectorAll('[data-modal-target="createExamModal"]').forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal-target');
            openModal(modalId);
        });
    });

    // Modal functionality
    window.openModal = function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.body.style.overflow = 'hidden';
        }
    }

    window.closeModal = function (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
        }
    }

    // Event listeners for modal triggers
    document.querySelectorAll('[data-modal-target]').forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal-target');
            openModal(modalId);
        });
    });

    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function (e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });

    // Close modals on escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                closeModal(modal.id);
            });
        }
    });

    // ========================================
    // DYNAMIC CLASS LOADING BASED ON SUBJECT
    // ========================================
    const subjectSelect = document.getElementById('subjectSelect');
    const classSelect = document.getElementById('classSelect');
    const examTypeSelect = document.getElementById('examType');
    const examNamePreview = document.getElementById('examNamePreview');

    // Store selected values and class options
    let selectedSubjectName = '';
    let selectedClassName = '';
    let selectedExamType = '';
    let classOptions = [];

    // Update exam name preview
    function updateExamNamePreview() {
        if (selectedClassName && selectedSubjectName && selectedExamType) {
            const examName = `${selectedClassName}-${selectedSubjectName}-${selectedExamType}`;
            examNamePreview.value = examName;
        } else {
            examNamePreview.value = '';
        }
    }

    // Load classes when subject is selected
    let subjectId = '';
    if (subjectSelect) {
        subjectSelect.addEventListener('change', async function () {
            subjectId = this.value;
            const selectedOption = this.options[this.selectedIndex];
            selectedSubjectName = selectedOption.text;

            // Reset class selection
            classSelect.innerHTML = '<option value="">Loading classes...</option>';
            classSelect.disabled = true;
            selectedClassName = '';
            updateExamNamePreview();

            if (!subjectId) {
                classSelect.innerHTML = '<option value="">Select subject first</option>';
                return;
            }

            try {
                const response = await fetch(`/admin/exams/classes-by-subject/${subjectId}`);
                const result = await response.json();

                if (result.success && result.classes) {
                    classOptions = result.classes;
                    classSelect.innerHTML = '<option value="">Select a class</option>';

                    result.classes.forEach(cls => {
                        const option = document.createElement('option');
                        option.value = cls.class_room_id;
                        option.textContent = cls.class_room_name;
                        option.dataset.className = cls.class_room_name;
                        classSelect.appendChild(option);
                    });

                    classSelect.disabled = false;
                } else {
                    classSelect.innerHTML = '<option value="">No classes offer this subject</option>';
                    if (window.showAlert) {
                        window.showAlert('No classes currently offer this subject', 'info');
                    }
                }
            } catch (error) {
                console.error('Error loading classes:', error);
                classSelect.innerHTML = '<option value="">Error loading classes</option>';
                if (window.showAlert) {
                    window.showAlert('Failed to load classes for this subject', 'error');
                }
            }
        });
    }

    // Store available question count
    let availableQuestionCount = 0;

    // Update name when class is selected and fetch question count
    if (classSelect) {
        classSelect.addEventListener('change', async function () {
            const selectedOption = this.options[this.selectedIndex];
            selectedClassName = selectedOption.dataset.className || selectedOption.text;
            updateExamNamePreview();

            // Fetch question count for the selected subject and class
            if (subjectId && this.value) {
                try {
                    const response = await fetch(`/admin/exams/question-count?subject_id=${subjectId}&class_room_id=${this.value}`);
                    const result = await response.json();

                    if (result.success) {
                        availableQuestionCount = result.question_count;

                        // Update UI to show question count
                        const questionCountElement = document.getElementById('questionCount');
                        if (questionCountElement) {
                            questionCountElement.textContent = result.question_count;
                            questionCountElement.className = result.question_count > 0
                                ? 'text-green-600 dark:text-green-400 font-semibold'
                                : 'text-red-600 dark:text-red-400 font-semibold';
                        }

                        // Update hint text
                        const questionLimitHint = document.getElementById('questionLimitHint');
                        if (questionLimitHint && result.question_count > 0) {
                            questionLimitHint.textContent = `Max ${result.question_count} questions available. Questions will be randomly selected if specified.`;
                        }

                        // Show/hide warning message
                        const questionWarning = document.getElementById('questionWarning');
                        if (questionWarning) {
                            questionWarning.style.display = result.question_count > 0 ? 'none' : 'block';
                        }

                        // Update max attribute on number of questions input
                        const numberOfQuestionsInput = document.getElementById('numberOfQuestions');
                        if (numberOfQuestionsInput && result.question_count > 0) {
                            numberOfQuestionsInput.max = result.question_count;
                        }
                    }
                } catch (error) {
                    console.error('Error fetching question count:', error);
                }
            }
        });
    }

    // Update name when exam type is selected
    if (examTypeSelect) {
        examTypeSelect.addEventListener('change', function () {
            selectedExamType = this.value;
            updateExamNamePreview();
        });
    }

    // Create Exam Form Submission
    const createExamForm = document.getElementById('createExamForm');
    if (createExamForm) {
        createExamForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const formData = new FormData(createExamForm);
            const numberOfQuestions = formData.get('number_of_questions');

            const data = {
                exam_type: formData.get('exam_type'),
                subject_id: formData.get('subject_id'),
                class_room_id: formData.get('class_room_id'),
                school_term_id: formData.get('school_term_id'),
                date: formData.get('date'),
                duration_hours: formData.get('duration_hours') || '0',
                duration_minutes: formData.get('duration_minutes') || '0',
                max_score: formData.get('max_score'),
                invigilator_id: formData.get('invigilator_id') || null,
                description: formData.get('description') || '',
                number_of_questions: numberOfQuestions || null
            };

            // Validate required fields
            let hasErrors = false;

            // Validate number of questions if specified
            if (numberOfQuestions && parseInt(numberOfQuestions) > 0) {
                const numQuestions = parseInt(numberOfQuestions);
                if (numQuestions > availableQuestionCount) {
                    showAlert({
                        type: 'error',
                        title: 'Invalid Number of Questions',
                        message: `Cannot create exam with ${numQuestions} questions. Only ${availableQuestionCount} questions available.`
                    });
                    hasErrors = true;
                }
            }

            if (!data.exam_type) {
                showAlert('Please select an exam type', 'error');
                hasErrors = true;
            }

            if (!data.subject_id) {
                showAlert('Please select a subject', 'error');
                hasErrors = true;
            }

            if (!data.class_room_id) {
                showAlert('Please select a class', 'error');
                hasErrors = true;
            }

            if (!data.school_term_id) {
                showAlert('Please select a school term', 'error');
                hasErrors = true;
            }

            if (!data.date) {
                showAlert('Please select an exam date', 'error');
                hasErrors = true;
            }

            if (!data.max_score) {
                showAlert('Please enter a maximum score', 'error');
                hasErrors = true;
            }

            if (hasErrors) {
                return;
            }

            // Validate date is not too far in the past (just warn, don't block)
            const examDate = new Date(data.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (examDate < today) {
                showAlert('Note: The exam date is in the past. This is allowed but please verify.', 'warning');
            }

            try {
                const response = await fetch('/admin/exams', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    if (window.showAlert) {
                        window.showAlert({
                            title: 'Success',
                            message: `Exam created: ${result.exam_name}`,
                            type: 'success'
                        });
                    } else {
                        alert(result.message);
                    }
                    closeModal('createExamModal');
                    createExamForm.reset();
                    // Reset preview and class select
                    examNamePreview.value = '';
                    classSelect.innerHTML = '<option value="">Select subject first</option>';
                    classSelect.disabled = true;
                    selectedClassName = '';
                    selectedSubjectName = '';
                    selectedExamType = '';
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    if (window.showAlert) {
                        window.showAlert({
                            title: 'Error',
                            message: result.message,
                            type: 'error'
                        });
                    } else {
                        alert(result.message);
                    }
                }
            } catch (error) {
                console.error('Error creating exam:', error);
                if (window.showAlert) {
                    window.showAlert({
                        title: 'Error',
                        message: 'An error occurred while creating the exam',
                        type: 'error'
                    });
                } else {
                    alert('An error occurred while creating the exam');
                }
            }
        });
    }

    // Helper function for showing alerts
    // Delete Exam
    document.querySelectorAll('.delete-exam-btn').forEach(button => {
        button.addEventListener('click', function () {
            const examId = this.getAttribute('data-delete-id');
            const examName = this.getAttribute('data-exam-name');
            const row = this.closest('tr');

            if (window.showConfirmModal) {
                window.showConfirmModal({
                    title: 'Delete Exam',
                    message: `Are you sure you want to delete "${examName}"? This action cannot be undone.`,
                    confirmText: 'Delete',
                    confirmClass: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
                    onConfirm: async () => {
                        try {
                            const response = await fetch(`/admin/exams/${examId}`, {
                                method: 'DELETE',
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });

                            // Check if response is HTML (redirect to login) instead of JSON
                            const contentType = response.headers.get('content-type');
                            if (contentType && contentType.indexOf('text/html') !== -1) {
                                // Redirect to login
                                window.location.href = '/login';
                                return;
                            }

                            const result = await response.json();

                            if (result.success) {
                                if (window.showAlert) {
                                    window.showAlert({
                                        title: 'Success',
                                        message: result.message,
                                        type: 'success'
                                    });
                                }

                                // Remove row from DOM
                                if (row) {
                                    row.style.transition = 'all 0.3s ease';
                                    row.style.opacity = '0';
                                    setTimeout(() => {
                                        row.remove();
                                        // Update total count if possible (optional)
                                    }, 300);
                                }
                            } else {
                                if (window.showAlert) {
                                    window.showAlert({
                                        title: 'Error',
                                        message: result.message,
                                        type: 'error'
                                    });
                                } else {
                                    alert(result.message);
                                }
                            }
                        } catch (error) {
                            console.error('Error deleting exam:', error);
                            // Check if it's a JSON parsing error (likely HTML response)
                            if (error instanceof SyntaxError && error.message.includes('Unexpected token')) {
                                // Redirect to login
                                window.location.href = '/login';
                                return;
                            }

                            if (window.showAlert) {
                                window.showAlert({
                                    title: 'Error',
                                    message: 'An error occurred while deleting the exam',
                                    type: 'error'
                                });
                            } else {
                                alert('An error occurred while deleting the exam');
                            }
                        }
                    }
                });
            } else {
                if (confirm(`Are you sure you want to delete "${examName}"? This action cannot be undone.`)) {
                    // Direct deletion without modal
                    (async () => {
                        try {
                            const response = await fetch(`/admin/exams/${examId}`, {
                                method: 'DELETE',
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });

                            // Check if response is HTML (redirect to login) instead of JSON
                            const contentType = response.headers.get('content-type');
                            if (contentType && contentType.indexOf('text/html') !== -1) {
                                // Redirect to login
                                window.location.href = '/login';
                                return;
                            }

                            const result = await response.json();

                            if (result.success) {
                                alert(result.message);
                                // Remove row from DOM
                                if (row) {
                                    row.remove();
                                }
                            } else {
                                alert(result.message);
                            }
                        } catch (error) {
                            console.error('Error deleting exam:', error);
                            // Check if it's a JSON parsing error (likely HTML response)
                            if (error instanceof SyntaxError && error.message.includes('Unexpected token')) {
                                // Redirect to login
                                window.location.href = '/login';
                                return;
                            }
                            alert('An error occurred while deleting the exam');
                        }
                    })();
                }
            }
        });
    });

    // Search and Filter functionality
    const searchInput = document.getElementById('searchExams');
    const filterExamType = document.getElementById('filterExamType');
    const filterTerm = document.getElementById('filterTerm');
    const filterClass = document.getElementById('filterClass');
    const filterStatus = document.getElementById('filterStatus');
    const filterDate = document.getElementById('filterDate');
    const examRows = document.querySelectorAll('.exam-row');

    // Finished exams search and filter
    const searchFinishedInput = document.getElementById('searchFinishedExams');
    const filterFinishedExamType = document.getElementById('filterFinishedExamType');
    const filterFinishedTerm = document.getElementById('filterFinishedTerm');
    const filterFinishedClass = document.getElementById('filterFinishedClass');
    const filterFinishedDate = document.getElementById('filterFinishedDate');
    const finishedExamRows = document.querySelectorAll('.finished-exam-row');

    function filterExams() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const selectedType = filterExamType ? filterExamType.value : '';
        const selectedTerm = filterTerm ? filterTerm.value : '';
        const selectedClass = filterClass ? filterClass.value : '';
        const selectedStatus = filterStatus ? filterStatus.value : '';
        const selectedDate = filterDate ? filterDate.value : '';

        // Get today's date for date filtering
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());

        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

        examRows.forEach(row => {
            const searchData = row.getAttribute('data-search') || '';
            const examType = row.getAttribute('data-exam-type') || '';
            const termId = row.getAttribute('data-term-id') || '';
            const classId = row.getAttribute('data-class-id') || '';
            const isActive = row.getAttribute('data-is-active') === 'true';
            const examDateStr = row.getAttribute('data-exam-date') || '';

            // Parse exam date
            const examDate = examDateStr ? new Date(examDateStr) : null;
            if (examDate) {
                examDate.setHours(0, 0, 0, 0);
            }

            // Search matches
            const matchesSearch = searchData.includes(searchTerm);
            const matchesType = !selectedType || examType === selectedType;
            const matchesTerm = !selectedTerm || termId === selectedTerm;
            const matchesClass = !selectedClass || classId === selectedClass;
            const matchesStatus = !selectedStatus ||
                (selectedStatus === 'active' && isActive) ||
                (selectedStatus === 'inactive' && !isActive);

            // Date filtering
            let matchesDate = true;
            if (selectedDate && examDate) {
                switch (selectedDate) {
                    case 'today':
                        matchesDate = examDate.getTime() === today.getTime();
                        break;
                    case 'yesterday':
                        matchesDate = examDate.getTime() === yesterday.getTime();
                        break;
                    case 'this-week':
                        matchesDate = examDate >= weekStart && examDate <= today;
                        break;
                    case 'this-month':
                        matchesDate = examDate >= monthStart && examDate <= today;
                        break;
                    case 'last-month':
                        matchesDate = examDate >= lastMonthStart && examDate <= lastMonthEnd;
                        break;
                }
            }

            if (matchesSearch && matchesType && matchesTerm && matchesClass && matchesStatus && matchesDate) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // Filter function for finished exams
    function filterFinishedExams() {
        const searchTerm = searchFinishedInput ? searchFinishedInput.value.toLowerCase() : '';
        const selectedType = filterFinishedExamType ? filterFinishedExamType.value : '';
        const selectedTerm = filterFinishedTerm ? filterFinishedTerm.value : '';
        const selectedClass = filterFinishedClass ? filterFinishedClass.value : '';
        const selectedDate = filterFinishedDate ? filterFinishedDate.value : '';

        // Get today's date for date filtering
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());

        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

        finishedExamRows.forEach(row => {
            const searchData = row.getAttribute('data-search') || '';
            const examType = row.getAttribute('data-exam-type') || '';
            const termId = row.getAttribute('data-term-id') || '';
            const classId = row.getAttribute('data-class-id') || '';
            const examDateStr = row.getAttribute('data-exam-date') || '';

            // Parse exam date
            const examDate = examDateStr ? new Date(examDateStr) : null;
            if (examDate) {
                examDate.setHours(0, 0, 0, 0);
            }

            // Search matches
            const matchesSearch = searchData.includes(searchTerm);
            const matchesType = !selectedType || examType === selectedType;
            const matchesTerm = !selectedTerm || termId === selectedTerm;
            const matchesClass = !selectedClass || classId === selectedClass;

            // Date filtering
            let matchesDate = true;
            if (selectedDate && examDate) {
                switch (selectedDate) {
                    case 'today':
                        matchesDate = examDate.getTime() === today.getTime();
                        break;
                    case 'yesterday':
                        matchesDate = examDate.getTime() === yesterday.getTime();
                        break;
                    case 'this-week':
                        matchesDate = examDate >= weekStart && examDate <= today;
                        break;
                    case 'this-month':
                        matchesDate = examDate >= monthStart && examDate <= today;
                        break;
                    case 'last-month':
                        matchesDate = examDate >= lastMonthStart && examDate <= lastMonthEnd;
                        break;
                }
            }

            if (matchesSearch && matchesType && matchesTerm && matchesClass && matchesDate) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterExams);
    }

    if (filterExamType) {
        filterExamType.addEventListener('change', filterExams);
    }

    if (filterTerm) {
        filterTerm.addEventListener('change', filterExams);
    }

    if (filterClass) {
        filterClass.addEventListener('change', filterExams);
    }

    if (filterStatus) {
        filterStatus.addEventListener('change', filterExams);
    }

    if (filterDate) {
        filterDate.addEventListener('change', filterExams);
    }

    // Finished exams filter event listeners
    if (searchFinishedInput) {
        searchFinishedInput.addEventListener('input', filterFinishedExams);
    }

    if (filterFinishedExamType) {
        filterFinishedExamType.addEventListener('change', filterFinishedExams);
    }

    if (filterFinishedTerm) {
        filterFinishedTerm.addEventListener('change', filterFinishedExams);
    }

    if (filterFinishedClass) {
        filterFinishedClass.addEventListener('change', filterFinishedExams);
    }

    if (filterFinishedDate) {
        filterFinishedDate.addEventListener('change', filterFinishedExams);
    }

    // Edit Exam functionality
    document.querySelectorAll('.edit-exam-btn').forEach(button => {
        button.addEventListener('click', async function (e) {
            e.preventDefault();
            const examId = this.getAttribute('data-edit-id');
            console.log(examId);
            try {
                // Fetch exam details
                const response = await fetch(`/admin/exams/${examId}`);

                // Check if response is HTML (redirect to login) instead of JSON
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.indexOf('text/html') !== -1) {
                    // Redirect to login
                    // window.location.href = '/login';
                    return;
                }

                const result = await response.json();

                if (result.success) {
                    const exam = result.exam;
                    console.log(exam);
                    // Populate form fields
                    document.getElementById('editExamId').value = exam.id;
                    document.getElementById('editExamType').value = exam.exam_type;
                    document.getElementById('editExamDate').value = exam.date;
                    document.getElementById('editDurationHours').value = exam.duration_hours;
                    document.getElementById('editDurationMinutes').value = exam.duration_minutes;
                    document.getElementById('editMaxScore').value = exam.max_score;
                    document.getElementById('editNumberOfQuestions').value = exam.number_of_questions || '';
                    document.getElementById('editSchoolTerm').value = exam.school_term_id;
                    document.getElementById('editInvigilator').value = exam.invigilator_id || '';
                    document.getElementById('editDescription').value = exam.description || '';

                    // Set subject and class (these need special handling)
                    const subjectSelect = document.getElementById('editSubjectSelect');
                    const classSelect = document.getElementById('editClassSelect');

                    // Enable subject select and populate
                    subjectSelect.disabled = false;
                    subjectSelect.innerHTML = '<option value="">Loading subjects...</option>';

                    // Load all subjects
                    const subjectsResponse = await fetch('/admin/get_subjects');
                    const subjectsResult = await subjectsResponse.json();

                    if (subjectsResult.success) {
                        subjectSelect.innerHTML = '<option value="">Select a subject</option>';
                        subjectsResult.subjects.forEach(subject => {
                            const option = document.createElement('option');
                            option.value = subject.subject_id;
                            option.textContent = subject.subject_name;
                            option.selected = subject.subject_id === exam.subject_id;
                            subjectSelect.appendChild(option);
                        });

                        // Trigger subject change to load classes
                        const event = new Event('change');
                        subjectSelect.dispatchEvent(event);

                        // After a short delay, set the class and fetch question count
                        setTimeout(async () => {
                            classSelect.value = exam.class_room_id;

                            // Update exam name preview
                            updateEditExamNamePreview();

                            // Fetch question count for the selected subject and class
                            if (exam.subject_id && exam.class_room_id) {
                                try {
                                    const response = await fetch(`/admin/exams/question-count?subject_id=${exam.subject_id}&class_room_id=${exam.class_room_id}`);
                                    const result = await response.json();

                                    if (result.success) {
                                        editAvailableQuestionCount = result.question_count;

                                        // Update UI to show question count
                                        const questionCountElement = document.getElementById('editQuestionCount');
                                        if (questionCountElement) {
                                            questionCountElement.textContent = result.question_count;
                                            questionCountElement.className = result.question_count > 0
                                                ? 'text-green-600 dark:text-green-400 font-semibold'
                                                : 'text-red-600 dark:text-red-400 font-semibold';
                                        }

                                        // Update hint text
                                        const questionLimitHint = document.getElementById('editQuestionLimitHint');
                                        if (questionLimitHint && result.question_count > 0) {
                                            questionLimitHint.textContent = `Max ${result.question_count} questions available. Questions will be randomly selected if specified.`;
                                        }

                                        // Show/hide warning message
                                        const questionWarning = document.getElementById('editQuestionWarning');
                                        if (questionWarning) {
                                            questionWarning.style.display = result.question_count > 0 ? 'none' : 'block';
                                        }

                                        // Update max attribute on number of questions input
                                        const numberOfQuestionsInput = document.getElementById('editNumberOfQuestions');
                                        if (numberOfQuestionsInput && result.question_count > 0) {
                                            numberOfQuestionsInput.max = result.question_count;
                                        }
                                    }
                                } catch (error) {
                                    console.error('Error fetching question count:', error);
                                }
                            }
                        }, 500);
                    } else {
                        subjectSelect.innerHTML = '<option value="">Error loading subjects</option>';
                    }

                    // Open modal
                    openModal('editExamModal');
                } else {
                    if (window.showAlert) {
                        window.showAlert({
                            title: 'Error',
                            message: result.message,
                            type: 'error'
                        });
                    } else {
                        alert(result.message);
                    }
                }
            } catch (error) {
                // Check if it's a JSON parsing error (likely HTML response)
                if (error instanceof SyntaxError && error.message.includes('Unexpected token')) {
                    window.showAlert({
                        title: 'Error',
                        message: 'Error loading exam details',
                        type: 'error'
                    });
                    return;
                }

                if (window.showAlert) {
                    window.showAlert({
                        title: 'Error',
                        message: 'Failed to load exam details',
                        type: 'error'
                    });
                } else {
                    alert('Failed to load exam details');
                }
            }
        });
    });

    // ========================================
    // DYNAMIC CLASS LOADING FOR EDIT FORM
    // ========================================
    const editSubjectSelect = document.getElementById('editSubjectSelect');
    const editClassSelect = document.getElementById('editClassSelect');
    const editExamTypeSelect = document.getElementById('editExamType');
    const editExamNamePreview = document.getElementById('editExamNamePreview');

    // Store selected values and class options for edit form
    let editSelectedSubjectName = '';
    let editSelectedClassName = '';
    let editSelectedExamType = '';

    // Update exam name preview for edit form
    function updateEditExamNamePreview() {
        if (editSelectedClassName && editSelectedSubjectName && editSelectedExamType) {
            const examName = `${editSelectedClassName}-${editSelectedSubjectName}-${editSelectedExamType}`;
            editExamNamePreview.value = examName;
        } else {
            editExamNamePreview.value = '';
        }
    }

    // Store available question count for edit form
    let editAvailableQuestionCount = 0;

    // Load classes when subject is selected in edit form
    let editSubjectId = '';
    if (editSubjectSelect) {
        editSubjectSelect.addEventListener('change', async function () {
            editSubjectId = this.value;
            const selectedOption = this.options[this.selectedIndex];
            editSelectedSubjectName = selectedOption.text;

            // Reset class selection
            editClassSelect.innerHTML = '<option value="">Loading classes...</option>';
            editClassSelect.disabled = true;
            editSelectedClassName = '';
            updateEditExamNamePreview();

            if (!editSubjectId) {
                editClassSelect.innerHTML = '<option value="">Select subject first</option>';
                return;
            }

            try {
                const response = await fetch(`/admin/exams/classes-by-subject/${editSubjectId}`);
                const result = await response.json();

                if (result.success && result.classes) {
                    editClassSelect.innerHTML = '<option value="">Select a class</option>';

                    result.classes.forEach(cls => {
                        const option = document.createElement('option');
                        option.value = cls.class_room_id;
                        option.textContent = cls.class_room_name;
                        option.dataset.className = cls.class_room_name;
                        editClassSelect.appendChild(option);
                    });

                    editClassSelect.disabled = false;
                } else {
                    editClassSelect.innerHTML = '<option value="">No classes offer this subject</option>';
                    if (window.showAlert) {
                        window.showAlert({
                            title: 'Info',
                            message: 'No classes currently offer this subject',
                            type: 'info'
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading classes:', error);
                editClassSelect.innerHTML = '<option value="">Error loading classes</option>';
                if (window.showAlert) {
                    window.showAlert({
                        title: 'Error',
                        message: 'Failed to load classes for this subject',
                        type: 'error'
                    });
                }
            }
        });
    }

    // Update name when class is selected in edit form and fetch question count
    if (editClassSelect) {
        editClassSelect.addEventListener('change', async function () {
            const selectedOption = this.options[this.selectedIndex];
            editSelectedClassName = selectedOption.dataset.className || selectedOption.text;
            updateEditExamNamePreview();

            // Fetch question count for the selected subject and class
            if (editSubjectId && this.value) {
                try {
                    const response = await fetch(`/admin/exams/question-count?subject_id=${editSubjectId}&class_room_id=${this.value}`);
                    const result = await response.json();

                    if (result.success) {
                        editAvailableQuestionCount = result.question_count;

                        // Update UI to show question count
                        const questionCountElement = document.getElementById('editQuestionCount');
                        if (questionCountElement) {
                            questionCountElement.textContent = result.question_count;
                            questionCountElement.className = result.question_count > 0
                                ? 'text-green-600 dark:text-green-400 font-semibold'
                                : 'text-red-600 dark:text-red-400 font-semibold';
                        }

                        // Update hint text
                        const questionLimitHint = document.getElementById('editQuestionLimitHint');
                        if (questionLimitHint && result.question_count > 0) {
                            questionLimitHint.textContent = `Max ${result.question_count} questions available. Questions will be randomly selected if specified.`;
                        }

                        // Show/hide warning message
                        const questionWarning = document.getElementById('editQuestionWarning');
                        if (questionWarning) {
                            questionWarning.style.display = result.question_count > 0 ? 'none' : 'block';
                        }

                        // Update max attribute on number of questions input
                        const numberOfQuestionsInput = document.getElementById('editNumberOfQuestions');
                        if (numberOfQuestionsInput && result.question_count > 0) {
                            numberOfQuestionsInput.max = result.question_count;
                        }
                    }
                } catch (error) {
                    console.error('Error fetching question count:', error);
                }
            }
        });
    }

    // Update name when exam type is selected in edit form
    if (editExamTypeSelect) {
        editExamTypeSelect.addEventListener('change', function () {
            editSelectedExamType = this.value;
            updateEditExamNamePreview();
        });
    }

    // Edit Exam Form Submission
    const editExamForm = document.getElementById('editExamForm');
    if (editExamForm) {
        editExamForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const examId = document.getElementById('editExamId').value;

            const formData = new FormData(editExamForm);
            const numberOfQuestions = formData.get('number_of_questions');

            const data = {
                exam_type: formData.get('exam_type'),
                subject_id: formData.get('subject_id'),
                class_room_id: formData.get('class_room_id'),
                school_term_id: formData.get('school_term_id'),
                date: formData.get('date'),
                duration_hours: formData.get('duration_hours') || '0',
                duration_minutes: formData.get('duration_minutes') || '0',
                max_score: formData.get('max_score'),
                invigilator_id: formData.get('invigilator_id') || null,
                description: formData.get('description') || '',
                number_of_questions: numberOfQuestions || null
            };

            // Validate number of questions if specified
            if (numberOfQuestions && parseInt(numberOfQuestions) > 0) {
                const numQuestions = parseInt(numberOfQuestions);
                if (numQuestions > editAvailableQuestionCount) {
                    if (window.showAlert) {
                        window.showAlert({
                            type: 'error',
                            title: 'Invalid Number of Questions',
                            message: `Cannot set ${numQuestions} questions. Only ${editAvailableQuestionCount} questions available.`
                        });
                    } else {
                        alert(`Cannot set ${numQuestions} questions. Only ${editAvailableQuestionCount} questions available.`);
                    }
                    return;
                }
            }

            // Validate class selection
            if (!data.class_room_id) {
                if (window.showAlert) {
                    window.showAlert({
                        title: 'Error',
                        message: 'Please select a class',
                        type: 'error'
                    });
                } else {
                    alert('Please select a class');
                }
                return;
            }

            try {
                const response = await fetch(`/admin/exams/${examId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    if (window.showAlert) {
                        window.showAlert({
                            title: 'Success',
                            message: 'Exam updated successfully',
                            type: 'success'
                        });
                    } else {
                        alert(result.message);
                    }
                    closeModal('editExamModal');

                    // Update DOM
                    // We need to find the row and update its content
                    // Since we don't have a direct reference to the row here, we can search by data attributes or reload if complex
                    // Ideally, we should update the row content. For now, let's try to reload only if we can't easily update.
                    // But the user requested NO reload. So we must update the DOM.

                    // Find the row
                    // We can add an ID to rows or search by edit button data-edit-id
                    const editBtn = document.querySelector(`button[data-edit-id="${examId}"]`);
                    if (editBtn) {
                        const row = editBtn.closest('tr');
                        if (row) {
                            // Update row content based on `data` (which contains the new values)
                            // Note: We might need the text values for dropdowns (Subject Name, Class Name, etc.)
                            // `data` only has IDs. This is tricky without fetching the updated exam or having the names.
                            // However, we have `editSelectedSubjectName`, `editSelectedClassName`, etc. from the form state!

                            // Update Exam Name
                            const nameCell = row.querySelector('td:nth-child(1) p.font-semibold');
                            if (nameCell) {
                                // We don't have the generated name in `data` directly if it's auto-generated, 
                                // but we can construct it or use what's in the preview input
                                const namePreview = document.getElementById('editExamNamePreview');
                                if (namePreview) nameCell.textContent = namePreview.value;
                            }

                            // Update Date
                            const dateCell = row.querySelector('td:nth-child(1) p.text-xs');
                            const dateCol = row.querySelector('td:nth-child(6) p');
                            if (data.date) {
                                const dateObj = new Date(data.date);
                                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                if (dateCell) dateCell.textContent = dateStr;
                                if (dateCol) dateCol.textContent = dateStr;
                                row.setAttribute('data-exam-date', data.date);
                            }

                            // Update Type
                            const typeSpan = row.querySelector('td:nth-child(2) span');
                            if (typeSpan && data.exam_type) {
                                typeSpan.textContent = data.exam_type;
                                row.setAttribute('data-exam-type', data.exam_type);
                                // Update classes for color
                                typeSpan.className = `px-3 py-1 text-xs font-semibold rounded-full ${data.exam_type.includes('CA') ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'}`;
                            }

                            // Update Class
                            const classCell = row.querySelector('td:nth-child(3) p.font-medium');
                            if (classCell && editSelectedClassName) {
                                classCell.textContent = editSelectedClassName;
                            }

                            // Update Subject
                            const subjectCell = row.querySelector('td:nth-child(4) p.font-medium');
                            if (subjectCell && editSelectedSubjectName) {
                                subjectCell.textContent = editSelectedSubjectName;
                            }

                            // Update Term (we need the term name, which we might not have easily if it changed)
                            // If term ID changed, we might need to look up the name from the select options
                            const termSelect = document.getElementById('editSchoolTerm');
                            const termCell = row.querySelector('td:nth-child(5) p.font-medium');
                            if (termSelect && termCell) {
                                const selectedTermOption = termSelect.options[termSelect.selectedIndex];
                                if (selectedTermOption) {
                                    // Format is usually "Term Name - Session"
                                    const termText = selectedTermOption.text.split(' - ')[0];
                                    termCell.textContent = termText;
                                    const sessionText = selectedTermOption.text.split(' - ')[1];
                                    const sessionCell = row.querySelector('td:nth-child(5) p.text-xs');
                                    if (sessionCell && sessionText) sessionCell.textContent = sessionText;
                                }
                            }

                            // Update Duration
                            const durationCell = row.querySelector('td:nth-child(7) p');
                            if (durationCell) {
                                let durationText = '';
                                if (parseInt(data.duration_hours) > 0) durationText += `${data.duration_hours}h `;
                                if (parseInt(data.duration_minutes) > 0) durationText += `${data.duration_minutes}m`;
                                durationCell.textContent = durationText.trim();
                            }

                            // Update Max Score
                            const scoreCell = row.querySelector('td:nth-child(8) p');
                            if (scoreCell && data.max_score) {
                                scoreCell.textContent = data.max_score;
                            }

                            // Update Invigilator
                            const invigilatorSelect = document.getElementById('editInvigilator');
                            const invigilatorCell = row.querySelector('td:nth-child(9) p');
                            if (invigilatorSelect && invigilatorCell) {
                                const selectedInvOption = invigilatorSelect.options[invigilatorSelect.selectedIndex];
                                if (selectedInvOption && selectedInvOption.value) {
                                    invigilatorCell.textContent = selectedInvOption.text;
                                } else {
                                    invigilatorCell.innerHTML = '<span class="text-gray-400">Not assigned</span>';
                                }
                            }
                        }
                    }

                } else {
                    if (window.showAlert) {
                        window.showAlert({
                            title: 'Error',
                            message: result.message,
                            type: 'error'
                        });
                    } else {
                        alert(result.message);
                    }
                }
            } catch (error) {
                console.error('Error updating exam:', error);
                if (window.showAlert) {
                    window.showAlert({
                        title: 'Error',
                        message: 'An error occurred while updating the exam',
                        type: 'error'
                    });
                } else {
                    alert('An error occurred while updating the exam');
                }
            }
        });
    }

    // Toggle exam active status
    document.querySelectorAll('.toggle-active-switch').forEach(toggle => {
        toggle.addEventListener('change', async function () {
            const examId = this.dataset.examId;
            const isActive = this.checked;
            const statusText = this.nextElementSibling.nextElementSibling;
            const row = this.closest('tr');

            try {
                const response = await fetch(`/admin/exam/${examId}/toggle-active`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Toggle response:', data);

                if (data.success) {
                    // Update the status text
                    statusText.textContent = isActive ? 'Active' : 'Inactive';

                    // Update data attribute for filtering
                    if (row) {
                        row.setAttribute('data-is-active', isActive ? 'true' : 'false');
                    }

                    // Show success message
                    if (window.showAlert) {
                        window.showAlert({
                            title: 'Success',
                            message: data.message || `Exam marked as ${isActive ? 'active' : 'inactive'}`,
                            type: 'success'
                        });
                    }
                } else {
                    // Revert the toggle if failed
                    this.checked = !isActive;
                    showAlert({
                        title: 'Error',
                        message: String(data.message || 'Failed to update exam status'),
                        type: 'error',
                        confirmText: 'OK'
                    });
                }
            } catch (error) {
                console.error('Error toggling exam status:', error);
                // Revert the toggle
                this.checked = !isActive;
                showAlert({
                    title: 'Error',
                    message: String(error.message || 'An error occurred while updating exam status'),
                    type: 'error',
                    confirmText: 'OK'
                });
            }
        });
    });

    // Finish exam
    document.querySelectorAll('.finish-exam-btn').forEach(button => {
        button.addEventListener('click', function () {
            const examId = this.dataset.finishId;
            const examName = this.dataset.examName;
            const row = this.closest('tr');

            showConfirmModal({
                title: 'Finish Exam',
                message: `Are you sure you want to mark "${examName}" as finished? This will deactivate the exam and students will no longer be able to access it. This action cannot be undone.`,
                confirmText: 'Yes, Finish Exam',
                cancelText: 'Cancel',
                confirmClass: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
                onConfirm: async function () {
                    try {
                        const response = await fetch(`/admin/exam/${examId}/finish`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });

                        const data = await response.json();
                        console.log('Finish exam response:', data);

                        if (data.success) {
                            // Extract message properly
                            let messageText = 'Exam finished successfully';
                            if (data.message) {
                                if (typeof data.message === 'string') {
                                    messageText = data.message;
                                } else if (typeof data.message === 'object') {
                                    messageText = JSON.stringify(data.message);
                                } else {
                                    messageText = String(data.message);
                                }
                            }

                            showAlert({
                                title: 'Success',
                                message: messageText,
                                type: 'success',
                                confirmText: 'OK'
                            });

                            // Remove row from Active Exams table
                            if (row) {
                                row.style.transition = 'all 0.3s ease';
                                row.style.opacity = '0';
                                setTimeout(() => {
                                    row.remove();
                                    // Note: We are not moving it to the Finished Exams table dynamically 
                                    // because the table structure is different and it's complex to reconstruct.
                                    // The user will see it there on next reload.
                                }, 300);
                            }
                        } else {
                            showAlert({
                                title: 'Error',
                                message: String(data.message || 'Failed to finish exam'),
                                type: 'error',
                                confirmText: 'OK'
                            });
                        }
                    } catch (error) {
                        console.error('Error finishing exam:', error);
                        showAlert({
                            title: 'Error',
                            message: 'An error occurred while finishing the exam',
                            type: 'error',
                            confirmText: 'OK'
                        });
                    }
                }
            });
        });
    });

    // Tab switching
    document.querySelectorAll('.exam-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            // Remove active class from all tabs
            document.querySelectorAll('.exam-tab').forEach(t => {
                t.classList.remove('bg-white', 'dark:bg-gray-700', 'text-primary', 'shadow-sm');
                t.classList.add('text-gray-600', 'dark:text-gray-300', 'hover:text-gray-800', 'dark:hover:text-gray-200', 'hover:bg-gray-200', 'dark:hover:bg-gray-700/50');
            });

            // Add active class to clicked tab
            this.classList.remove('text-gray-600', 'dark:text-gray-300', 'hover:text-gray-800', 'dark:hover:text-gray-200', 'hover:bg-gray-200', 'dark:hover:bg-gray-700/50');
            this.classList.add('bg-white', 'dark:bg-gray-700', 'text-primary', 'shadow-sm');

            // Show/hide sections
            if (this.id === 'active-exams-tab') {
                document.getElementById('active-exams-section').classList.remove('hidden');
                document.getElementById('finished-exams-section').classList.add('hidden');
                document.getElementById('reset-exams-section').classList.add('hidden');
            } else if (this.id === 'finished-exams-tab') {
                document.getElementById('active-exams-section').classList.add('hidden');
                document.getElementById('finished-exams-section').classList.remove('hidden');
                document.getElementById('reset-exams-section').classList.add('hidden');
            } else if (this.id === 'reset-exams-tab') {
                document.getElementById('active-exams-section').classList.add('hidden');
                document.getElementById('finished-exams-section').classList.add('hidden');
                document.getElementById('reset-exams-section').classList.remove('hidden');
            }
        });
    });

    // Unfinish exam
    document.querySelectorAll('.unfinish-exam-btn').forEach(button => {
        button.addEventListener('click', function () {
            const examId = this.dataset.unfinishId;
            const examName = this.dataset.examName;
            const row = this.closest('tr');

            showConfirmModal({
                title: 'Unfinish Exam',
                message: `Are you sure you want to unfinish "${examName}"? This will make the exam active again and visible to students.`,
                confirmText: 'Yes, Unfinish',
                cancelText: 'Cancel',
                confirmClass: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
                onConfirm: async function () {
                    try {
                        const response = await fetch(`/admin/exam/${examId}/unfinish`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });

                        const data = await response.json();

                        if (data.success) {
                            console.log(typeof data.message);
                            showAlert({
                                title: 'Success',
                                message: String(data.message || 'Exam unfinished successfully'),
                                type: 'success',
                                confirmText: 'OK'
                            });

                            // Remove row from Finished Exams table
                            if (row) {
                                row.style.transition = 'all 0.3s ease';
                                row.style.opacity = '0';
                                setTimeout(() => {
                                    row.remove();
                                }, 300);
                            }
                        } else {
                            showAlert({
                                title: 'Error',
                                message: String(data.message || 'Failed to unfinish exam'),
                                type: 'error',
                                confirmText: 'OK'
                            });
                        }
                    } catch (error) {
                        console.error('Error unfinishing exam:', error);
                        showAlert({
                            title: 'Error',
                            message: 'An error occurred while unfinishing the exam',
                            type: 'error',
                            confirmText: 'OK'
                        });
                    }
                }
            });
        });
    });

    // Delete finished exam
    document.querySelectorAll('.delete-finished-exam-btn').forEach(button => {
        button.addEventListener('click', function () {
            const examId = this.dataset.deleteId;
            const examName = this.dataset.examName;
            const row = this.closest('tr');

            showConfirmModal({
                title: 'Delete Finished Exam',
                message: `Are you sure you want to permanently delete "${examName}"? This action cannot be undone and all associated data will be lost.`,
                confirmText: 'Yes, Delete',
                cancelText: 'Cancel',
                confirmClass: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
                onConfirm: async function () {
                    try {
                        const response = await fetch(`/admin/exams/${examId}`, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });

                        const data = await response.json();

                        if (data.success) {
                            showAlert({
                                title: 'Success',
                                message: 'Exam deleted successfully',
                                type: 'success',
                                confirmText: 'OK'
                            });

                            // Remove row from Finished Exams table
                            if (row) {
                                row.style.transition = 'all 0.3s ease';
                                row.style.opacity = '0';
                                setTimeout(() => {
                                    row.remove();
                                }, 300);
                            }
                        } else {
                            showAlert({
                                title: 'Error',
                                message: data.message || 'Failed to delete exam',
                                type: 'error',
                                confirmText: 'OK'
                            });
                        }
                    } catch (error) {
                        console.error('Error deleting exam:', error);
                        showAlert({
                            title: 'Error',
                            message: 'An error occurred while deleting the exam',
                            type: 'error',
                            confirmText: 'OK'
                        });
                    }
                }
            });
        });
    });

    // ========================================
    // RESET EXAM FUNCTIONALITY
    // ========================================

    const resetStudentSearch = document.getElementById('reset-student-search');
    const resetStudentId = document.getElementById('reset-student-id');
    const studentAutocomplete = document.getElementById('student-autocomplete');
    const selectedStudentInfo = document.getElementById('selected-student-info');
    const resetExamSelect = document.getElementById('reset-exam-select');
    const resetExamBtn = document.getElementById('reset-exam-btn');
    const resetExamDetails = document.getElementById('reset-exam-details');
    const resetExamForm = document.getElementById('reset-exam-form');
    const resetFormClear = document.getElementById('reset-form-clear');
    const examLoadStatus = document.getElementById('exam-load-status');

    let selectedStudentData = null;
    let selectedExamData = null;
    let allStudents = window.studentsData || [];

    // Student search autocomplete
    if (resetStudentSearch) {
        resetStudentSearch.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase().trim();

            if (searchTerm.length < 2) {
                studentAutocomplete.classList.add('hidden');
                studentAutocomplete.innerHTML = '';
                return;
            }

            // Filter students
            const filtered = allStudents.filter(student =>
                student.username.toLowerCase().includes(searchTerm) ||
                student.firstName.toLowerCase().includes(searchTerm) ||
                student.lastName.toLowerCase().includes(searchTerm) ||
                student.fullName.toLowerCase().includes(searchTerm)
            ).slice(0, 10); // Limit to 10 results

            if (filtered.length === 0) {
                studentAutocomplete.innerHTML = '<div class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No students found</div>';
                studentAutocomplete.classList.remove('hidden');
                return;
            }

            // Build autocomplete list
            let html = '';
            filtered.forEach(student => {
                html += `
                    <div class="student-option px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                         data-student-id="${student.id}"
                         data-username="${student.username}"
                         data-name="${student.fullName}">
                        <div class="font-medium text-gray-900 dark:text-white">${student.username}</div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">${student.fullName}</div>
                    </div>
                `;
            });

            studentAutocomplete.innerHTML = html;
            studentAutocomplete.classList.remove('hidden');

            // Add click handlers to options
            document.querySelectorAll('.student-option').forEach(option => {
                option.addEventListener('click', function () {
                    selectStudent(
                        this.dataset.studentId,
                        this.dataset.username,
                        this.dataset.name
                    );
                });
            });
        });
        
        // Close autocomplete when clicking outside
        document.addEventListener('click', function (e) {
            if (!resetStudentSearch.contains(e.target) && !studentAutocomplete.contains(e.target)) {
                studentAutocomplete.classList.add('hidden');
            }
        });
    }

    // Function to select a student and load their exams
    async function selectStudent(studentId, username, fullName) {
        // Update UI
        resetStudentSearch.value = `${username} - ${fullName}`;
        resetStudentId.value = studentId;
        studentAutocomplete.classList.add('hidden');
        selectedStudentInfo.textContent = `Selected: ${fullName}`;
        selectedStudentInfo.className = 'mt-1 text-xs text-green-600 dark:text-green-400';

        // Store student data
        selectedStudentData = {
            id: studentId,
            username: username,
            name: fullName
        };

        // Reset exam selection
        resetExamSelect.innerHTML = '<option value="">Loading exams...</option>';
        resetExamSelect.disabled = true;
        resetExamBtn.disabled = true;
        resetExamDetails.classList.add('hidden');
        selectedExamData = null;

        examLoadStatus.textContent = 'Loading completed exams...';
        examLoadStatus.className = 'mt-1 text-xs text-blue-600 dark:text-blue-400';

        try {
            const response = await fetch(`/admin/student/${studentId}/completed-exams`);
            const result = await response.json();

            console.log('API Response:', result); // Debug log
            console.log('Exams data:', result.exams); // Debug log

            if (result.success && result.exams && result.exams.length > 0) {
                resetExamSelect.innerHTML = '<option value="">Select an exam...</option>';

                result.exams.forEach(exam => {
                    const option = document.createElement('option');
                    option.value = exam.exam_id;

                    // Ensure score is a number
                    const score = parseFloat(exam.score) || 0;
                    const maxScore = parseFloat(exam.max_score) || 0;

                    option.textContent = `${exam.exam_name} - ${exam.subject} (Score: ${score}/${maxScore})`;
                    option.dataset.examName = exam.exam_name;
                    option.dataset.subject = exam.subject;
                    option.dataset.score = score;
                    option.dataset.maxScore = maxScore;
                    option.dataset.status = exam.status;
                    option.dataset.completedAt = exam.completed_at;
                    resetExamSelect.appendChild(option);
                });

                resetExamSelect.disabled = false;
                examLoadStatus.textContent = `${result.exams.length} completed exam(s) found`;
                examLoadStatus.className = 'mt-1 text-xs text-green-600 dark:text-green-400';
            } else {
                resetExamSelect.innerHTML = '<option value="">No completed exams found</option>';
                examLoadStatus.textContent = 'This student has not completed any exams yet';
                examLoadStatus.className = 'mt-1 text-xs text-yellow-600 dark:text-yellow-400';
            }
        } catch (error) {
            console.error('Error loading completed exams:', error);
            resetExamSelect.innerHTML = '<option value="">Error loading exams</option>';
            examLoadStatus.textContent = 'Failed to load exams. Please try again.';
            examLoadStatus.className = 'mt-1 text-xs text-red-600 dark:text-red-400';

            if (window.showAlert) {
                window.showAlert({
                    title: 'Error',
                    message: 'Failed to load completed exams for this student',
                    type: 'error'
                });
            }
        }
    }

    // Show exam details when exam is selected
    if (resetExamSelect) {
        resetExamSelect.addEventListener('change', function () {
            const examId = this.value;
            const selectedOption = this.options[this.selectedIndex];

            if (!examId || !selectedStudentData) {
                resetExamDetails.classList.add('hidden');
                resetExamBtn.disabled = true;
                selectedExamData = null;
                return;
            }

            // Store exam data - parse numbers from dataset strings
            const score = parseFloat(selectedOption.dataset.score) || 0;
            const maxScore = parseFloat(selectedOption.dataset.maxScore) || 0;

            console.log('Selected exam dataset:', {
                score: selectedOption.dataset.score,
                maxScore: selectedOption.dataset.maxScore,
                parsedScore: score,
                parsedMaxScore: maxScore
            }); // Debug log

            selectedExamData = {
                id: examId,
                name: selectedOption.dataset.examName,
                subject: selectedOption.dataset.subject,
                score: score,
                maxScore: maxScore,
                status: selectedOption.dataset.status,
                completedAt: selectedOption.dataset.completedAt
            };

            // Update details display
            document.getElementById('detail-student').textContent = selectedStudentData.name;
            document.getElementById('detail-exam').textContent = selectedExamData.name;
            document.getElementById('detail-score').textContent = `${score}/${maxScore}`;
            document.getElementById('detail-status').textContent = selectedExamData.status;

            // Show details and enable button
            resetExamDetails.classList.remove('hidden');
            resetExamBtn.disabled = false;
        });
    }

    // Handle form submission
    if (resetExamForm) {
        resetExamForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const studentId = resetStudentId.value;

            if (!studentId || !selectedStudentData || !selectedExamData) {
                if (window.showAlert) {
                    window.showAlert({
                        title: 'Error',
                        message: 'Please search and select both a student and an exam',
                        type: 'error'
                    });
                }
                return;
            }

            // Show confirmation modal
            if (window.showConfirmModal) {
                window.showConfirmModal({
                    title: 'Confirm Exam Reset',
                    message: `Are you sure you want to reset the exam "${selectedExamData.name}" for ${selectedStudentData.name}? This will permanently delete their score of ${selectedExamData.score}/${selectedExamData.maxScore} and allow them to retake the exam. This action cannot be undone.`,
                    confirmText: 'Yes, Reset Exam',
                    cancelText: 'Cancel',
                    confirmClass: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
                    onConfirm: async function () {
                        // Disable button during request
                        resetExamBtn.disabled = true;
                        resetExamBtn.innerHTML = '<span class="flex items-center gap-2"><svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Resetting...</span>';

                        try {
                            const response = await fetch(`/admin/exam/${selectedExamData.id}/${selectedStudentData.id}/reset`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });

                            const result = await response.json();

                            if (result.success) {
                                if (window.showAlert) {
                                    window.showAlert({
                                        title: 'Success',
                                        message: `Exam reset successfully! ${selectedStudentData.name} can now retake "${selectedExamData.name}".`,
                                        type: 'success',
                                        onConfirm: function () {
                                            // Clear form
                                            resetExamForm.reset();
                                            resetStudentSearch.value = '';
                                            resetStudentId.value = '';
                                            studentAutocomplete.classList.add('hidden');
                                            resetExamDetails.classList.add('hidden');
                                            resetExamSelect.innerHTML = '<option value="">Search student first...</option>';
                                            resetExamSelect.disabled = true;
                                            resetExamBtn.disabled = true;
                                            selectedStudentData = null;
                                            selectedExamData = null;
                                            selectedStudentInfo.textContent = 'Start typing to search students';
                                            selectedStudentInfo.className = 'mt-1 text-xs text-gray-500 dark:text-gray-400';
                                            examLoadStatus.textContent = 'Only completed exams will be shown';
                                            examLoadStatus.className = 'mt-1 text-xs text-gray-500 dark:text-gray-400';
                                        }
                                    });
                                } else {
                                    alert('Exam reset successfully!');
                                    window.location.reload();
                                }
                            } else {
                                if (window.showAlert) {
                                    window.showAlert({
                                        title: 'Error',
                                        message: result.message || 'Failed to reset exam',
                                        type: 'error'
                                    });
                                } else {
                                    alert(result.message || 'Failed to reset exam');
                                }
                            }
                        } catch (error) {
                            console.error('Error resetting exam:', error);
                            if (window.showAlert) {
                                window.showAlert({
                                    title: 'Error',
                                    message: 'An error occurred while resetting the exam. Please try again.',
                                    type: 'error'
                                });
                            } else {
                                alert('An error occurred while resetting the exam');
                            }
                        } finally {
                            // Re-enable button
                            resetExamBtn.disabled = false;
                            resetExamBtn.innerHTML = '<span class="flex items-center gap-2"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>Reset Exam</span>';
                        }
                    }
                });
            } else {
                // Fallback if modal not available
                if (confirm(`Are you sure you want to reset the exam "${selectedExamData.name}" for ${selectedStudentData.name}?`)) {
                    // Same logic as above but without modal
                    try {
                        const response = await fetch(`/admin/exam/${selectedExamData.id}/${selectedStudentData.id}/reset`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });

                        const result = await response.json();

                        if (result.success) {
                            alert('Exam reset successfully!');
                            window.location.reload();
                        } else {
                            alert(result.message || 'Failed to reset exam');
                        }
                    } catch (error) {
                        console.error('Error resetting exam:', error);
                        alert('An error occurred while resetting the exam');
                    }
                }
            }
        });
    }

    // Clear form button
    if (resetFormClear) {
        resetFormClear.addEventListener('click', function () {
            resetExamForm.reset();
            resetStudentSearch.value = '';
            resetStudentId.value = '';
            studentAutocomplete.classList.add('hidden');
            resetExamDetails.classList.add('hidden');
            resetExamSelect.innerHTML = '<option value="">Search student first...</option>';
            resetExamSelect.disabled = true;
            resetExamBtn.disabled = true;
            selectedStudentData = null;
            selectedExamData = null;
            selectedStudentInfo.textContent = 'Start typing to search students';
            selectedStudentInfo.className = 'mt-1 text-xs text-gray-500 dark:text-gray-400';
            examLoadStatus.textContent = 'Only completed exams will be shown';
            examLoadStatus.className = 'mt-1 text-xs text-gray-500 dark:text-gray-400';
        });
    }
});
