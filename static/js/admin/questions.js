document.addEventListener('DOMContentLoaded', function() {
    const filterSubject = document.getElementById('filterSubject');
    const filterClass = document.getElementById('filterClass');
    const filterTerm = document.getElementById('filterTerm');
    const loadQuestionsBtn = document.getElementById('loadQuestionsBtn');
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    const questionsContainer = document.getElementById('questionsContainer');
    const emptyState = document.getElementById('emptyState');
    const questionsList = document.getElementById('questionsList');
    const questionCount = document.getElementById('questionCount');
    const searchQuestions = document.getElementById('searchQuestions');
    
    let currentQuestions = [];
    let currentFilters = {};
    
    // Load questions
    loadQuestionsBtn.addEventListener('click', async function() {
        const subjectId = filterSubject.value;
        const classId = filterClass.value;
        const termId = filterTerm.value;
        
        if (!subjectId || !classId || !termId) {
            showAlert({
                title: 'Missing Filters',
                message: 'Please select Subject, Class, and Term',
                type: 'warning',
                confirmText: 'OK'
            });
            return;
        }
        
        currentFilters = { subjectId, classId, termId };
        
        try {
            const response = await fetch(`/admin/questions/list?subject_id=${subjectId}&class_id=${classId}&term_id=${termId}`);
            const data = await response.json();
            
            if (data.success) {
                currentQuestions = data.questions;
                displayQuestions(currentQuestions);
                
                if (currentQuestions.length > 0) {
                    emptyState.classList.add('hidden');
                    questionsContainer.classList.remove('hidden');
                    deleteAllBtn.classList.remove('hidden');
                } else {
                    showAlert({
                        title: 'No Questions Found',
                        message: 'No questions found for the selected filters',
                        type: 'info',
                        confirmText: 'OK'
                    });
                }
            } else {
                showAlert({
                    title: 'Error',
                    message: data.message || 'Failed to load questions',
                    type: 'error',
                    confirmText: 'OK'
                });
            }
        } catch (error) {
            console.error('Error loading questions:', error);
            showAlert({
                title: 'Error',
                message: 'An error occurred while loading questions',
                type: 'error',
                confirmText: 'OK'
            });
        }
    });
    
    // Display questions
    function displayQuestions(questions) {
        questionCount.textContent = questions.length;
        questionsList.innerHTML = '';
        
        questions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'p-6 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors question-item';
            questionDiv.dataset.questionText = question.question_text.toLowerCase();
            
            questionDiv.innerHTML = `
                <div class="flex items-start gap-4">
                    <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span class="font-bold text-primary">${index + 1}</span>
                    </div>
                    <div class="flex-1">
                        <p class="text-gray-900 dark:text-white font-medium mb-2">${question.question_text}</p>
                        <div class="space-y-1">
                            ${question.options.map((opt, idx) => `
                                <div class="flex items-center gap-2 text-sm">
                                    <span class="px-2 py-1 rounded ${opt.is_correct ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'} font-medium">
                                        ${String.fromCharCode(65 + idx)}
                                    </span>
                                    <span class="text-gray-700 dark:text-gray-300">${opt.text}</span>
                                    ${opt.is_correct ? '<span class="material-symbols-outlined text-green-500 text-sm">check_circle</span>' : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button class="edit-question-btn p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" data-question-id="${question.id}" title="Edit">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button class="delete-question-btn p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" data-question-id="${question.id}" title="Delete">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </div>
            `;
            
            questionsList.appendChild(questionDiv);
        });
        
        // Add event listeners
        document.querySelectorAll('.edit-question-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const questionId = this.dataset.questionId;
                editQuestion(questionId);
            });
        });
        
        document.querySelectorAll('.delete-question-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const questionId = this.dataset.questionId;
                deleteQuestion(questionId);
            });
        });
    }
    
    // Search questions
    if (searchQuestions) {
        searchQuestions.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            document.querySelectorAll('.question-item').forEach(item => {
                const questionText = item.dataset.questionText;
                if (questionText.includes(searchTerm)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
    
    // Edit question
    function editQuestion(questionId) {
        const question = currentQuestions.find(q => q.id === questionId);
        if (!question) return;
        
        document.getElementById('editQuestionId').value = questionId;
        document.getElementById('editQuestionText').value = question.question_text;
        
        const optionsContainer = document.getElementById('editOptionsContainer');
        optionsContainer.innerHTML = '';
        
        question.options.forEach((option, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'flex items-center gap-3';
            optionDiv.innerHTML = `
                <span class="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-medium text-gray-700 dark:text-gray-300">${String.fromCharCode(65 + index)}</span>
                <input type="text" class="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white" value="${option.text}" data-option-id="${option.id}">
                <label class="flex items-center gap-2">
                    <input type="radio" name="correctOption" value="${option.id}" ${option.is_correct ? 'checked' : ''} class="w-4 h-4">
                    <span class="text-sm text-gray-600 dark:text-gray-400">Correct</span>
                </label>
            `;
            optionsContainer.appendChild(optionDiv);
        });
        
        document.getElementById('editQuestionModal').classList.remove('hidden');
    }
    
    // Save question
    document.getElementById('saveQuestionBtn').addEventListener('click', async function() {
        const questionId = document.getElementById('editQuestionId').value;
        const questionText = document.getElementById('editQuestionText').value;
        
        const options = [];
        document.querySelectorAll('#editOptionsContainer > div').forEach(div => {
            const input = div.querySelector('input[type="text"]');
            const radio = div.querySelector('input[type="radio"]');
            options.push({
                id: input.dataset.optionId,
                text: input.value,
                is_correct: radio.checked
            });
        });
        
        try {
            const response = await fetch(`/admin/questions/${questionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question_text: questionText, options })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showAlert({
                    title: 'Success',
                    message: 'Question updated successfully',
                    type: 'success',
                    confirmText: 'OK',
                    onConfirm: function() {
                        document.getElementById('editQuestionModal').classList.add('hidden');
                        loadQuestionsBtn.click();
                    }
                });
            } else {
                showAlert({
                    title: 'Error',
                    message: data.message || 'Failed to update question',
                    type: 'error',
                    confirmText: 'OK'
                });
            }
        } catch (error) {
            console.error('Error updating question:', error);
            showAlert({
                title: 'Error',
                message: 'An error occurred while updating the question',
                type: 'error',
                confirmText: 'OK'
            });
        }
    });
    
    // Cancel edit
    document.getElementById('cancelEditBtn').addEventListener('click', function() {
        document.getElementById('editQuestionModal').classList.add('hidden');
    });
    
    // Delete question
    function deleteQuestion(questionId) {
        showConfirmModal({
            title: 'Delete Question',
            message: 'Are you sure you want to delete this question? This action cannot be undone.',
            confirmText: 'Yes, Delete',
            cancelText: 'Cancel',
            confirmClass: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
            onConfirm: async function() {
                try {
                    const response = await fetch(`/admin/questions/${questionId}`, {
                        method: 'DELETE'
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        showAlert({
                            title: 'Success',
                            message: 'Question deleted successfully',
                            type: 'success',
                            confirmText: 'OK',
                            onConfirm: function() {
                                loadQuestionsBtn.click();
                            }
                        });
                    } else {
                        showAlert({
                            title: 'Error',
                            message: data.message || 'Failed to delete question',
                            type: 'error',
                            confirmText: 'OK'
                        });
                    }
                } catch (error) {
                    console.error('Error deleting question:', error);
                    showAlert({
                        title: 'Error',
                        message: 'An error occurred while deleting the question',
                        type: 'error',
                        confirmText: 'OK'
                    });
                }
            }
        });
    }
    
    // Delete all questions
    deleteAllBtn.addEventListener('click', function() {
        showConfirmModal({
            title: 'Delete All Questions',
            message: `Are you sure you want to delete ALL ${currentQuestions.length} questions for this subject, class, and term? This action cannot be undone.`,
            confirmText: 'Yes, Delete All',
            cancelText: 'Cancel',
            confirmClass: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
            onConfirm: async function() {
                try {
                    const response = await fetch('/admin/questions/delete-all', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(currentFilters)
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        showAlert({
                            title: 'Success',
                            message: `${data.deleted_count} questions deleted successfully`,
                            type: 'success',
                            confirmText: 'OK',
                            onConfirm: function() {
                                questionsContainer.classList.add('hidden');
                                emptyState.classList.remove('hidden');
                                deleteAllBtn.classList.add('hidden');
                            }
                        });
                    } else {
                        showAlert({
                            title: 'Error',
                            message: data.message || 'Failed to delete questions',
                            type: 'error',
                            confirmText: 'OK'
                        });
                    }
                } catch (error) {
                    console.error('Error deleting questions:', error);
                    showAlert({
                        title: 'Error',
                        message: 'An error occurred while deleting questions',
                        type: 'error',
                        confirmText: 'OK'
                    });
                }
            }
        });
    });
});
