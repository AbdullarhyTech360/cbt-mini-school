document.addEventListener('DOMContentLoaded', function() {
    // Check if modal functions are available
    if (typeof window.showAlert === 'undefined') {
        console.warn('Modal functions not loaded! Make sure modal.js is included before upload_questions.js');
    }
    
    const questionTypeSelect = document.getElementById('questionType');
    const optionsContainer = document.getElementById('optionsContainer');
    const shortAnswerContainer = document.getElementById('shortAnswerContainer');
    const optionsList = document.getElementById('optionsList');
    const addOptionBtn = document.getElementById('addOptionBtn');
    const questionForm = document.getElementById('questionForm');
    const resetFormBtn = document.getElementById('resetFormBtn');
    const previewQuestionBtn = document.getElementById('previewQuestionBtn');
    const classSubjectSelect = document.getElementById('classSubject');
    const subjectIdInput = document.getElementById('subject_id');
    const classRoomIdInput = document.getElementById('class_room_id');
    
    // New elements for preview modal
    const questionPreviewModal = document.getElementById('questionPreviewModal');
    const closePreviewModal = document.getElementById('closePreviewModal');
    const prevQuestionBtn = document.getElementById('prevQuestionBtn');
    const nextQuestionBtn = document.getElementById('nextQuestionBtn');
    const questionCounter = document.getElementById('questionCounter');
    const totalQuestions = document.getElementById('totalQuestions');
    const questionDisplay = document.getElementById('questionDisplay');
    
    // New elements for term and exam type
    const termSelect = document.getElementById('term');
    const examTypeSelect = document.getElementById('examType');
    
    // Preview dropdown elements
    const previewOptions = document.getElementById('previewOptions');
    const previewCurrentBtn = document.getElementById('previewCurrentBtn');
    const previewAllBtn = document.getElementById('previewAllBtn');
    
    // Hidden inputs for current selection
    const currentSubjectId = document.getElementById('currentSubjectId');
    const currentClassRoomId = document.getElementById('currentClassRoomId');
    const currentTermId = document.getElementById('currentTermId');
    const currentExamTypeId = document.getElementById('currentExamTypeId');
    
    // Add Save Question button to preview modal
    let saveQuestionBtn = null;
    
    // Update hidden inputs when classSubject changes
    if (classSubjectSelect) {
        classSubjectSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption && selectedOption.value) {
                const [subjectId, classId] = selectedOption.value.split(',');
                if (subjectIdInput) subjectIdInput.value = subjectId;
                if (classRoomIdInput) classRoomIdInput.value = classId;
            } else {
                if (subjectIdInput) subjectIdInput.value = '';
                if (classRoomIdInput) classRoomIdInput.value = '';
            }
        });
    }
    
    // Toggle options visibility based on question type
    if (questionTypeSelect) {
        questionTypeSelect.addEventListener('change', function() {
            const type = this.value;
            
            if (type === 'mcq' || type === 'true_false') {
                optionsContainer.classList.remove('hidden');
                shortAnswerContainer.classList.add('hidden');
                optionsList.innerHTML = '';
                
                // Add initial options
                if (type === 'mcq') {
                    addOption();
                    addOption();
                } else if (type === 'true_false') {
                    addTrueFalseOptions();
                }
            } else if (type === 'short_answer') {
                optionsContainer.classList.add('hidden');
                shortAnswerContainer.classList.remove('hidden');
                optionsList.innerHTML = '';
            } else {
                optionsContainer.classList.add('hidden');
                shortAnswerContainer.classList.add('hidden');
                optionsList.innerHTML = '';
            }
        });
    }
    
    // Toggle preview options dropdown
    if (previewQuestionBtn) {
        previewQuestionBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            previewOptions.classList.toggle('hidden');
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (previewOptions && !previewOptions.contains(e.target) && !previewQuestionBtn.contains(e.target)) {
            if (previewOptions && !previewOptions.classList.contains('hidden')) {
                previewOptions.classList.add('hidden');
            }
        }
    });
    
    // Preview current question
    if (previewCurrentBtn) {
        previewCurrentBtn.addEventListener('click', function() {
            previewQuestion();
            if (previewOptions) {
                previewOptions.classList.add('hidden');
            }
        });
    }
    
    // Preview all questions
    if (previewAllBtn) {
        previewAllBtn.addEventListener('click', function() {
            updatePreviewWithAllQuestions();
            if (previewOptions) {
                previewOptions.classList.add('hidden');
            }
        });
    }
    
    // Add option button
    if (addOptionBtn) {
        addOptionBtn.addEventListener('click', addOption);
    }
    
    // Add true/false options
    function addTrueFalseOptions() {
        optionsList.innerHTML = '';
        
        // Add True option
        const trueOption = createOptionInput('True', false);
        optionsList.appendChild(trueOption);
        
        // Add False option
        const falseOption = createOptionInput('False', false);
        optionsList.appendChild(falseOption);
        
        // Disable add button for true/false
        if (addOptionBtn) {
            addOptionBtn.disabled = true;
            addOptionBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
    
    // Add new option
    function addOption() {
        const optionElement = createOptionInput('', false);
        optionsList.appendChild(optionElement);
        
        // Enable add button
        if (addOptionBtn) {
            addOptionBtn.disabled = false;
            addOptionBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    // Create option input element
    function createOptionInput(text = '', isCorrect = false) {
        const optionId = Date.now() + Math.random();
        const optionDiv = document.createElement('div');
        optionDiv.className = 'flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg';
        optionDiv.innerHTML = `
            <div class="flex items-center">
                <input type="radio" name="correctOption" value="${optionId}" 
                    class="h-4 w-4 text-primary border-gray-300 dark:border-gray-600 focus:ring-primary"
                    ${isCorrect ? 'checked' : ''}>
            </div>
            <input type="text" 
                class="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="Enter option text..." value="${text}">
            <button type="button" class="remove-option text-red-500 hover:text-red-700 dark:hover:text-red-400">
                <span class="material-symbols-outlined">delete</span>
            </button>
        `;
        
        // Add event listener to remove button
        const removeBtn = optionDiv.querySelector('.remove-option');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                optionDiv.remove();
            });
        }
        
        return optionDiv;
    }
    
    // Preview Question functionality
    function previewQuestion() {
        // Get form values
        const questionText = document.getElementById('questionText')?.value || '';
        const questionType = questionTypeSelect?.value || '';
        const correctAnswer = document.getElementById('correctAnswer')?.value || '';
        
        // Create a temporary preview of the current question
        const previewData = {
            question_text: questionText,
            question_type: questionType,
            correct_answer: correctAnswer,
            options: []
        };
        
        // Collect options for MCQ and True/False
        if (questionType === 'mcq' || questionType === 'true_false') {
            const optionElements = optionsList.querySelectorAll('input[type="text"]');
            const correctOptionValue = document.querySelector('input[name="correctOption"]:checked')?.value;
            
            optionElements.forEach((input, index) => {
                const optionId = optionsList.children[index].querySelector('input[name="correctOption"]').value;
                previewData.options.push({
                    text: input.value,
                    is_correct: optionId === correctOptionValue
                });
            });
        }
        
        // Display preview
        displayQuestionPreview([previewData], 0);
        
        // Show preview modal
        if (questionPreviewModal) {
            questionPreviewModal.classList.remove('hidden');
        }
    }
    
    // Display questions preview
    function displayQuestionPreview(questions, currentIndex) {
        if (!questionDisplay || !questions || questions.length === 0) return;
        
        // Update total questions display
        if (totalQuestions) {
            totalQuestions.textContent = `Total: ${questions.length} questions`;
        }
        
        // Update question counter
        if (questionCounter) {
            questionCounter.textContent = `${currentIndex + 1} of ${questions.length}`;
        }
        
        // Enable/disable navigation buttons
        if (prevQuestionBtn) {
            prevQuestionBtn.disabled = currentIndex === 0;
        }
        if (nextQuestionBtn) {
            nextQuestionBtn.disabled = currentIndex === questions.length - 1;
        }
        
        // Get current question
        const question = questions[currentIndex];
        
        // Create HTML for question display
        let questionHTML = `
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <span class="text-white font-semibold">${currentIndex + 1}</span>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">${question.question_text}</h3>
        `;
        
        // Display options based on question type
        if (question.question_type === 'mcq' || question.question_type === 'true_false') {
            questionHTML += `
                        <div class="space-y-3">
            `;
            
            question.options.forEach((option, index) => {
                const isCorrect = option.is_correct;
                questionHTML += `
                            <div class="flex items-center gap-3 p-3 rounded-lg ${isCorrect ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800' : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600'}">
                                <div class="flex items-center justify-center w-6 h-6 rounded-full ${isCorrect ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}">
                                    ${isCorrect ? '<span class="material-symbols-outlined text-white text-sm">check</span>' : ''}
                                </div>
                                <span class="text-gray-800 dark:text-gray-200">${option.text}</span>
                                ${isCorrect ? '<span class="ml-auto text-xs font-semibold text-green-700 dark:text-green-300">Correct Answer</span>' : ''}
                            </div>
                `;
            });
            
            questionHTML += `
                        </div>
            `;
        } else if (question.question_type === 'short_answer') {
            questionHTML += `
                        <div class="mt-4 p-4 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                            <p class="text-sm font-semibold text-green-800 dark:text-green-200 mb-1">Correct Answer:</p>
                            <p class="text-gray-800 dark:text-gray-200">${question.correct_answer}</p>
                        </div>
            `;
        }
        
        questionHTML += `
                    </div>
                </div>
            </div>
        `;
        
        // Set the HTML
        questionDisplay.innerHTML = questionHTML;
        
        // Add event listeners for navigation
        if (prevQuestionBtn) {
            prevQuestionBtn.onclick = function() {
                if (currentIndex > 0) {
                    displayQuestionPreview(questions, currentIndex - 1);
                }
            };
        }
        
        if (nextQuestionBtn) {
            nextQuestionBtn.onclick = function() {
                if (currentIndex < questions.length - 1) {
                    displayQuestionPreview(questions, currentIndex + 1);
                }
            };
        }
        
        // Add Save Question button to the modal if it doesn't exist
        if (!saveQuestionBtn) {
            const modalHeader = questionPreviewModal.querySelector('.sticky');
            if (modalHeader) {
                saveQuestionBtn = document.createElement('button');
                saveQuestionBtn.id = 'saveQuestionFromPreview';
                saveQuestionBtn.className = 'px-4 py-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200';
                saveQuestionBtn.innerHTML = '<span class="material-symbols-outlined">save</span> Save Question';
                saveQuestionBtn.addEventListener('click', saveQuestionFromPreview);
                
                // Insert before the close button
                modalHeader.insertBefore(saveQuestionBtn, modalHeader.lastChild);
            }
        }
    }
    
    // Save question from preview modal
    function saveQuestionFromPreview() {
        // Trigger the form submission
        if (questionForm) {
            questionForm.dispatchEvent(new Event('submit'));
        }
    }
    
    // Form submission
    if (questionForm) {
        questionForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                const formData = {
                    subject_id: subjectIdInput.value,
                    class_room_id: classRoomIdInput.value,
                    term_id: termSelect?.value,
                    exam_type_id: examTypeSelect?.value,
                    question_type: questionTypeSelect.value,
                    question_text: document.getElementById('questionText').value,
                    options: [],
                    correct_answer: document.getElementById('correctAnswer').value
                };
                
                // Collect options for MCQ and True/False
                if (formData.question_type === 'mcq' || formData.question_type === 'true_false') {
                    const optionElements = optionsList.querySelectorAll('input[type="text"]');
                    const correctOptionValue = document.querySelector('input[name="correctOption"]:checked')?.value;
                    
                    optionElements.forEach((input, index) => {
                        const optionId = optionsList.children[index].querySelector('input[name="correctOption"]').value;
                        formData.options.push({
                            text: input.value,
                            is_correct: optionId === correctOptionValue
                        });
                    });
                }
                
                // Validate required fields
                if (!formData.subject_id || !formData.class_room_id || !formData.term_id || !formData.exam_type_id || !formData.question_type || !formData.question_text) {
                    if (window.showAlert) {
                        window.showAlert({
                            type: 'error',
                            title: 'Validation Error',
                            message: 'Please fill in all required fields.'
                        });
                    } else {
                        alert('Please fill in all required fields.');
                    }
                    return;
                }
                
                // Validate options for MCQ and True/False
                if ((formData.question_type === 'mcq' || formData.question_type === 'true_false') && 
                    (!formData.options.length || !formData.options.some(opt => opt.text.trim() !== ''))) {
                    if (window.showAlert) {
                        window.showAlert({
                            type: 'error',
                            title: 'Validation Error',
                            message: 'Please enter at least one option.'
                        });
                    } else {
                        alert('Please enter at least one option.');
                    }
                    return;
                }
                
                // Validate correct answer for short answer
                if (formData.question_type === 'short_answer' && !formData.correct_answer.trim()) {
                    if (window.showAlert) {
                        window.showAlert({
                            type: 'error',
                            title: 'Validation Error',
                            message: 'Please enter the correct answer.'
                        });
                    } else {
                        alert('Please enter the correct answer.');
                    }
                    return;
                }
                
                // Submit to server
                const response = await fetch('/staff/upload_questions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    if (window.showAlert) {
                        window.showAlert({
                            type: 'success',
                            title: 'Success!',
                            message: 'Question saved successfully!'
                            // Don't reset the form - keep it as is
                        });
                    } else {
                        alert('Question saved successfully!');
                        // Don't reset the form - keep it as is
                    }
                    
                    // Close the preview modal if it's open
                    if (questionPreviewModal) {
                        questionPreviewModal.classList.add('hidden');
                    }
                } else {
                    // Handle unauthorized access specifically
                    if (result.message === "Unauthorized access") {
                        if (window.showAlert) {
                            window.showAlert({
                                type: 'error',
                                title: 'Access Denied',
                                message: 'You do not have permission to upload questions.'
                            });
                        } else {
                            alert('You do not have permission to upload questions.');
                        }
                    } else if (result.message === "You are not assigned to this subject") {
                        if (window.showAlert) {
                            window.showAlert({
                                type: 'error',
                                title: 'Subject Assignment',
                                message: 'You are not assigned to this subject.'
                            });
                        } else {
                            alert('You are not assigned to this subject.');
                        }
                    } else {
                        if (window.showAlert) {
                            window.showAlert({
                                type: 'error',
                                title: 'Error',
                                message: 'Error: ' + result.message
                            });
                        } else {
                            alert('Error: ' + result.message);
                        }
                    }
                }
            } catch (error) {
                console.error('Error:', error);
                if (window.showAlert) {
                    window.showAlert({
                        type: 'error',
                        title: 'Error',
                        message: 'An error occurred while saving the question.'
                    });
                } else {
                    alert('An error occurred while saving the question.');
                }
            }
        });
    }
    
    // Update preview with all questions matching the current criteria
    async function updatePreviewWithAllQuestions() {
        // Get current selection values
        const subjectId = subjectIdInput?.value;
        const classRoomId = classRoomIdInput?.value;
        const termId = termSelect?.value;
        const examTypeId = examTypeSelect?.value;
        
        // Store current selection in hidden inputs
        if (currentSubjectId) currentSubjectId.value = subjectId;
        if (currentClassRoomId) currentClassRoomId.value = classRoomId;
        if (currentTermId) currentTermId.value = termId;
        if (currentExamTypeId) currentExamTypeId.value = examTypeId;
        
        // If all required fields are selected, fetch questions
        if (subjectId && classRoomId && termId && examTypeId) {
            try {
                const response = await fetch(`/staff/questions_preview?subject_id=${subjectId}&class_room_id=${classRoomId}&term_id=${termId}&exam_type_id=${examTypeId}`);
                const result = await response.json();
                
                if (result.success && result.questions && result.questions.length > 0) {
                    displayQuestionPreview(result.questions, 0);
                    if (questionPreviewModal) {
                        questionPreviewModal.classList.remove('hidden');
                    }
                } else {
                    if (window.showAlert) {
                        window.showAlert({
                            type: 'info',
                            title: 'No Questions',
                            message: 'No questions found matching the selected criteria.'
                        });
                    } else {
                        alert('No questions found matching the selected criteria.');
                    }
                }
            } catch (error) {
                console.error('Error fetching questions:', error);
                if (window.showAlert) {
                    window.showAlert({
                        type: 'error',
                        title: 'Error',
                        message: 'Failed to load questions preview.'
                    });
                } else {
                    alert('Failed to load questions preview.');
                }
            }
        }
    }
    
    // Reset form
    if (resetFormBtn) {
        resetFormBtn.addEventListener('click', resetForm);
    }
    
    function resetForm() {
        if (questionForm) {
            questionForm.reset();
        }
        if (subjectIdInput) subjectIdInput.value = '';
        if (classRoomIdInput) classRoomIdInput.value = '';
        if (optionsList) {
            optionsList.innerHTML = '';
        }
        if (optionsContainer) {
            optionsContainer.classList.add('hidden');
        }
        if (shortAnswerContainer) {
            shortAnswerContainer.classList.add('hidden');
        }
        if (addOptionBtn) {
            addOptionBtn.disabled = false;
            addOptionBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        if (questionPreviewModal) {
            questionPreviewModal.classList.add('hidden');
        }
    }

    // Close preview modal functionality
    if (closePreviewModal) {
        closePreviewModal.addEventListener('click', function() {
            if (questionPreviewModal) {
                questionPreviewModal.classList.add('hidden');
            }
        });
    }
    
    // Close modal when clicking outside
    if (questionPreviewModal) {
        questionPreviewModal.addEventListener('click', function(e) {
            if (e.target === this) {
                questionPreviewModal.classList.add('hidden');
            }
        });
    }
    
    // Close modal on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && questionPreviewModal && !questionPreviewModal.classList.contains('hidden')) {
            questionPreviewModal.classList.add('hidden');
        }
    });
});