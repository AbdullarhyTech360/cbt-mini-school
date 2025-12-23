document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let questions = [];
    let currentQuestionIndex = 0;
    let studentAnswers = {};
    let timeLeft = 5 * 60; // 5 minutes in seconds
    let timerInterval = null;
    
    // DOM elements
    const questionContainer = document.getElementById('question-container');
    const loadingMessage = document.getElementById('loading-message');
    const questionContent = document.getElementById('question-content');
    const questionText = document.getElementById('question-text');
    const answerOptions = document.getElementById('answer-options');
    const currentQuestionSpan = document.getElementById('current-question');
    const totalQuestionsSpan = document.getElementById('total-questions');
    const progressBar = document.getElementById('progress-bar');
    const prevBtn = document.getElementById('prev-question-btn');
    const nextBtn = document.getElementById('next-question-btn');
    const submitBtn = document.getElementById('submit-quiz-btn');
    const questionNavigation = document.getElementById('question-navigation');
    
    // Initialize the test
    initTest();
    
    // Initialize the test
    function initTest() {
        fetchQuestions();
        startTimer();
        
        // Add event listeners
        prevBtn.addEventListener('click', function(e) {
            if (currentQuestionIndex > 0) {
                showPreviousQuestion();
            }
        });
        nextBtn.addEventListener('click', function(e) {
            if (currentQuestionIndex < questions.length - 1) {
                showNextQuestion();
            }
        });
        submitBtn.addEventListener('click', submitQuiz);
    }
    
    // Fetch questions from the API
    async function fetchQuestions() {
        try {
            const response = await fetch('/student/demo_questions/api');
            const data = await response.json();
            
            if (data.success) {
                questions = data.questions;
                totalQuestionsSpan.textContent = questions.length;
                
                // Initialize student answers array
                studentAnswers = {};
                
                // Hide loading message and show question content
                loadingMessage.classList.add('hidden');
                questionContent.classList.remove('hidden');
                
                // Create question navigation buttons
                createQuestionNavigation();
                
                // Display the first question
                if (questions.length > 0) {
                    displayQuestion(currentQuestionIndex);
                } else {
                    questionText.textContent = "No questions available for this practice session.";
                    answerOptions.innerHTML = "";
                }
            } else {
                loadingMessage.innerHTML = `<p class="text-red-500">Error loading questions: ${data.message}</p>`;
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
            loadingMessage.innerHTML = `<p class="text-red-500">Error loading questions. Please try again.</p>`;
        }
    }
    
    // Display a question
    function displayQuestion(index) {
        if (index < 0 || index >= questions.length) return;
        
        const question = questions[index];
        currentQuestionIndex = index;
        
        // Update question text
        questionText.textContent = question.question_text;
        
        // Update current question number
        currentQuestionSpan.textContent = index + 1;
        
        // Update progress bar
        const progress = ((index + 1) / questions.length) * 100;
        progressBar.style.width = `${progress}%`;
        
        // Clear previous options
        answerOptions.innerHTML = '';
        
        // Add options
        if (question.question_type === 'short_answer') {
            // For short answer questions, provide a text input
            const inputElement = document.createElement('div');
            inputElement.className = 'mt-4';
            inputElement.innerHTML = `
                <label class="block text-sm font-medium text-gray-700 mb-2">Your Answer:</label>
                <input type="text" id="short-answer-input" 
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                    placeholder="Enter your answer here"
                    value="${studentAnswers[question.id] || ''}">
            `;
            answerOptions.appendChild(inputElement);
            
            // Add event listener to save answer
            const inputField = inputElement.querySelector('#short-answer-input');
            inputField.addEventListener('input', function() {
                studentAnswers[question.id] = this.value;
            });
        } else {
            // For MCQ and True/False questions
            question.options.forEach((option, optionIndex) => {
                const optionElement = document.createElement('label');
                optionElement.className = 'flex items-center gap-4 rounded-xl border border-solid border-gray-200 p-4 cursor-pointer hover:border-primary transition-colors';
                
                // Check if this option is selected
                const isSelected = studentAnswers[question.id] === option.id;
                
                // Add selected styles if needed
                if (isSelected) {
                    optionElement.classList.add('border-primary', 'bg-blue-50');
                }
                
                optionElement.innerHTML = `
                    <input type="radio" name="quiz-option" value="${option.id}" 
                        class="h-5 w-5 border-2 border-gray-300 bg-transparent text-transparent checked:border-primary checked:bg-[image:--radio-dot-svg] focus:outline-none focus:ring-0 focus:ring-offset-0 checked:focus:border-primary"
                        ${isSelected ? 'checked' : ''}>
                    <p class="flex-grow text-base font-medium text-gray-700">${option.text}</p>
                `;
                
                // Add event listener to save answer
                const radioInput = optionElement.querySelector('input[type="radio"]');
                radioInput.addEventListener('change', function() {
                    studentAnswers[question.id] = this.value;
                    // Update styles for all options
                    updateOptionStyles(question.id);
                });
                
                answerOptions.appendChild(optionElement);
            });
        }
        
        // Update navigation button states (use readonly instead of disabled)
        prevBtn.classList.toggle('opacity-50', index === 0);
        prevBtn.classList.toggle('cursor-not-allowed', index === 0);
        nextBtn.classList.toggle('opacity-50', index === questions.length - 1);
        nextBtn.classList.toggle('cursor-not-allowed', index === questions.length - 1);
        
        // Update question navigation buttons
        updateQuestionNavigation();
    }
    
    // Create question navigation buttons
    function createQuestionNavigation() {
        questionNavigation.innerHTML = '';
        
        questions.forEach((_, index) => {
            const button = document.createElement('button');
            button.className = 'flex items-center justify-center h-9 w-9 rounded-lg bg-gray-200 text-gray-800 font-bold text-xs';
            button.textContent = index + 1;
            button.dataset.index = index;
            button.title = `Navigate to question ${index + 1}`; // Add tooltip
            
            button.addEventListener('click', function() {
                displayQuestion(parseInt(this.dataset.index));
            });
            
            questionNavigation.appendChild(button);
        });
    }
    
    // Update question navigation buttons
    function updateQuestionNavigation() {
        const buttons = questionNavigation.querySelectorAll('button');
        buttons.forEach((button, index) => {
            button.classList.remove('bg-primary', 'text-white', 'border-2', 'border-primary', 'text-primary');
            button.classList.add('bg-gray-200', 'text-gray-800');
            
            if (index === currentQuestionIndex) {
                button.classList.remove('bg-gray-200', 'text-gray-800');
                button.classList.add('border-2', 'border-primary', 'text-primary');
            } else if (studentAnswers[questions[index].id]) {
                // Check if there's an answer for this question
                button.classList.remove('bg-gray-200', 'text-gray-800');
                button.classList.add('bg-primary', 'text-white');
            }
        });
    }
    
    // Update option styles for a specific question
    function updateOptionStyles(questionId) {
        const options = answerOptions.querySelectorAll('label');
        const selectedValue = studentAnswers[questionId];
        
        options.forEach(option => {
            const radioInput = option.querySelector('input[type="radio"]');
            const isSelected = radioInput.value === selectedValue;
            
            // Reset styles
            option.classList.remove('border-primary', 'bg-blue-50');
            
            // Add selected styles if needed
            if (isSelected) {
                option.classList.add('border-primary', 'bg-blue-50');
            }
        });
    }
    
    // Show previous question
    function showPreviousQuestion() {
        if (currentQuestionIndex > 0) {
            displayQuestion(currentQuestionIndex - 1);
        }
    }
    
    // Show next question
    function showNextQuestion() {
        if (currentQuestionIndex < questions.length - 1) {
            displayQuestion(currentQuestionIndex + 1);
        }
    }
    
    // Submit quiz
    function submitQuiz() {
        // Count answered questions
        const answeredCount = Object.keys(studentAnswers).length;
        const unansweredCount = questions.length - answeredCount;
        
        // Show confirmation dialog
        if (unansweredCount > 0) {
            showConfirmModal({
                title: 'Unanswered Questions',
                message: `You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`,
                confirmText: 'Submit Anyway',
                cancelText: 'Continue Practice',
                confirmClass: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
                onConfirm: function() {
                    submitAnswers();
                },
                onCancel: function() {
                    // Do nothing, user can continue
                }
            });
        } else {
            showConfirmModal({
                title: 'Submit Practice',
                message: 'Are you sure you want to submit your practice session?',
                confirmText: 'Submit Practice',
                cancelText: 'Cancel',
                onConfirm: function() {
                    submitAnswers();
                },
                onCancel: function() {
                    // Do nothing
                }
            });
        }
    }
    
    // Submit answers to server
    async function submitAnswers() {
        try {
            const response = await fetch('/student/demo_questions/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ answers: studentAnswers })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Show results in a custom modal
                showAlert({
                    title: 'Practice Session Complete!',
                    message: `Correct Answers: ${result.correct_answers}/${result.total_questions}\nScore: ${result.score_percentage}%`,
                    type: 'success',
                    confirmText: 'OK',
                    onConfirm: function() {
                        // Redirect to demo questions page
                        window.location.href = '/student/demo_questions';
                    }
                });
            } else {
                showAlert({
                    title: 'Error',
                    message: `Error submitting practice session: ${result.message}`,
                    type: 'error',
                    confirmText: 'OK',
                    onConfirm: function() {
                        // Do nothing
                    }
                });
            }
        } catch (error) {
            console.error('Error submitting practice session:', error);
            showAlert({
                title: 'Error',
                message: 'Error submitting practice session. Please try again.',
                type: 'error',
                confirmText: 'OK',
                onConfirm: function() {
                    // Do nothing
                }
            });
        }
    }
    
    // Start the timer
    function startTimer() {
        timerInterval = setInterval(updateTimer, 1000);
    }
    
    // Update the timer display
    function updateTimer() {
        timeLeft--;
        
        // Update the timer display
        const timerElement = document.getElementById('timer');
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Change color when time is running low (last minute)
        if (timeLeft <= 60) {
            timerElement.classList.add('text-red-500');
            timerElement.classList.remove('text-primary');
        }
        
        // Submit quiz when time runs out
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            // Automatically submit the quiz without confirmation
            submitAnswers();
        }
    }
    
    // Format time as MM:SS
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
});