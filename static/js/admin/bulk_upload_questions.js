// Get subject and class selection elements
const subjectSelect = document.getElementById('subject');
const classRoomSelect = document.getElementById('classRoom');

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const bulkUploadForm = document.getElementById('bulkUploadForm');
    const bulkFileInput = document.getElementById('bulkFile');
    const previewFileBtn = document.getElementById('previewFileBtn');
    const validateFileBtn = document.getElementById('validateFileBtn');
    const downloadCsvTemplateBtn = document.getElementById('downloadCsvTemplate');
    const downloadJsonTemplateBtn = document.getElementById('downloadJsonTemplate');
    const filePreviewSection = document.getElementById('filePreviewSection');
    const previewTableBody = document.getElementById('previewTableBody');
    const closePreviewBtn = document.getElementById('closePreviewBtn');
    const uploadResultsSection = document.getElementById('uploadResultsSection');
    const resultsSummary = document.getElementById('resultsSummary');
    const resultsDetails = document.getElementById('resultsDetails');
    const resultsList = document.getElementById('resultsList');
    const closeResultsBtn = document.getElementById('closeResultsBtn');
    
    // Event listeners
    if (bulkUploadForm) {
        bulkUploadForm.addEventListener('submit', handleBulkUpload);
    }
    
    if (previewFileBtn) {
        previewFileBtn.addEventListener('click', previewFile);
    }
    
    if (validateFileBtn) {
        validateFileBtn.addEventListener('click', validateFile);
    }
    
    if (downloadCsvTemplateBtn) {
        downloadCsvTemplateBtn.addEventListener('click', downloadCsvTemplate);
    }
    
    if (downloadJsonTemplateBtn) {
        downloadJsonTemplateBtn.addEventListener('click', downloadJsonTemplate);
    }
    
    if (closePreviewBtn) {
        closePreviewBtn.addEventListener('click', function() {
            filePreviewSection.classList.add('hidden');
        });
    }
    
    if (closeResultsBtn) {
        closeResultsBtn.addEventListener('click', function() {
            uploadResultsSection.classList.add('hidden');
        });
    }
    
    // Preview file function
    async function previewFile() {
        const file = bulkFileInput.files[0];
        if (!file) {
            showAlert('Please select a file first.', 'error');
            return;
        }
        
        try {
            const questions = await parseFile(file);
            displayFilePreview(questions);
            filePreviewSection.classList.remove('hidden');
        } catch (error) {
            console.error('Error previewing file:', error);
            showAlert('Error previewing file: ' + error.message, 'error');
        }
    }
    
    // Validate file function
    async function validateFile() {
        const file = bulkFileInput.files[0];
        if (!file) {
            showAlert('Please select a file first.', 'error');
            return;
        }
        
        try {
            const questions = await parseFile(file);
            const validationResults = validateQuestions(questions);
            
            if (validationResults.isValid) {
                showAlert('File is valid and ready for upload.', 'success');
            } else {
                showAlert('File contains errors. Please fix them before uploading.', 'error');
                displayValidationErrors(validationResults.errors);
            }
        } catch (error) {
            console.error('Error validating file:', error);
            showAlert('Error validating file: ' + error.message, 'error');
        }
    }
    
    // Handle bulk upload
    async function handleBulkUpload(event) {
        event.preventDefault();
        
        const file = bulkFileInput.files[0];
        if (!file) {
            showAlert('Please select a file first.', 'error');
            return;
        }
        
        // Validate subject and class selection
        if (!subjectSelect || !subjectSelect.value) {
            showAlert('Please select a subject.', 'error');
            return;
        }
        
        if (!classRoomSelect || !classRoomSelect.value) {
            showAlert('Please select a class.', 'error');
            return;
        }
        
        // Validate term selection
        const termSelect = document.getElementById('term');
        if (!termSelect || !termSelect.value) {
            showAlert('Please select a term.', 'error');
            return;
        }
        
        try {
            // Show loading state
            const submitBtn = bulkUploadForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> Uploading...';
            submitBtn.disabled = true;
            
            // Check if this is a Word document
            if (file.name.endsWith('.docx')) {
                // For Word documents, send the file directly to the server
                const formData = new FormData();
                formData.append('file', file);
                formData.append('subject_id', subjectSelect.value);
                formData.append('class_room_id', classRoomSelect.value);
                formData.append('term_id', termSelect.value);
                
                const response = await fetch('/admin/bulk_upload_questions', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                // Restore button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                
                if (result.success) {
                    displayUploadResults(result);
                    uploadResultsSection.classList.remove('hidden');
                    bulkUploadForm.reset();
                } else {
                    showAlert('Upload failed: ' + result.message, 'error');
                }
                return;
            }
            
            const questions = await parseFile(file);
            // Check if we got a Word document indicator
            if (questions.isWordDocument) {
                // This shouldn't happen as we handle .docx files separately above
                throw new Error('Unexpected file format');
            }
            
            const validationResults = validateQuestions(questions);
            
            if (!validationResults.isValid) {
                showAlert('File contains errors. Please fix them before uploading.', 'error');
                displayValidationErrors(validationResults.errors);
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                return;
            }
            
            // Send to server
            const response = await fetch('/admin/bulk_upload_questions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    questions: questions,
                    subject_id: subjectSelect.value,
                    class_room_id: classRoomSelect.value,
                    term_id: termSelect.value
                })
            });
            
            const result = await response.json();
            
            // Restore button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            
            if (result.success) {
                displayUploadResults(result);
                uploadResultsSection.classList.remove('hidden');
                bulkUploadForm.reset();
            } else {
                showAlert('Upload failed: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            showAlert('Error uploading file: ' + error.message, 'error');
            
            // Restore button
            const submitBtn = bulkUploadForm.querySelector('button[type="submit"]');
            submitBtn.innerHTML = 'Upload Questions';
            submitBtn.disabled = false;
        }
    }
    
    // Parse file function
    async function parseFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    let questions;
                    
                    if (file.name.endsWith('.csv')) {
                        questions = parseCsv(content);
                    } else if (file.name.endsWith('.json')) {
                        questions = JSON.parse(content);
                    } else if (file.name.endsWith('.docx')) {
                        // For Word documents, we need to send the file to the server for parsing
                        // This is because client-side Word parsing is complex and requires additional libraries
                        throw new Error('Word documents must be uploaded directly to the server for parsing');
                    } else {
                        throw new Error('Unsupported file format');
                    }
                    
                    resolve(questions);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = function() {
                reject(new Error('Error reading file'));
            };
            
            if (file.name.endsWith('.csv')) {
                reader.readAsText(file);
            } else if (file.name.endsWith('.json')) {
                reader.readAsText(file);
            } else if (file.name.endsWith('.docx')) {
                // For Word documents, we'll handle them on the server side
                // Return a special indicator that this is a Word document
                resolve({ isWordDocument: true, file: file });
            } else {
                reject(new Error('Unsupported file format'));
            }
        });
    }
    
    // Parse CSV function
    function parseCsv(csv) {
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
        const questions = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            const values = lines[i].split(',').map(value => value.trim().replace(/"/g, ''));
            const question = {};
            
            headers.forEach((header, index) => {
                if (index < values.length) {
                    question[header] = values[index];
                }
            });
            
            // Parse options if they exist
            if (question.options) {
                try {
                    question.options = JSON.parse(question.options);
                } catch (e) {
                    question.options = [];
                }
            }
            
            questions.push(question);
        }
        
        return questions;
    }
    
    // Validate questions function
    function validateQuestions(questions) {
        const errors = [];
        
        if (!Array.isArray(questions)) {
            errors.push('Questions must be an array');
            return { isValid: false, errors };
        }
        
        questions.forEach((question, index) => {
            if (!question.question_text || question.question_text.trim() === '') {
                errors.push(`Question ${index + 1}: Question text is required`);
            }
            
            if (!question.question_type || question.question_type.trim() === '') {
                errors.push(`Question ${index + 1}: Question type is required`);
            }
            
            // Validate question type
            const validTypes = ['mcq', 'true_false', 'short_answer'];
            if (question.question_type && !validTypes.includes(question.question_type)) {
                errors.push(`Question ${index + 1}: Invalid question type. Must be one of: ${validTypes.join(', ')}`);
            }
            
            // Validate options for MCQ and True/False
            if (question.question_type === 'mcq' || question.question_type === 'true_false') {
                if (!question.options || !Array.isArray(question.options) || question.options.length === 0) {
                    errors.push(`Question ${index + 1}: Options are required for ${question.question_type} questions`);
                } else {
                    // Check that there's at least one correct answer
                    const correctOptions = question.options.filter(opt => opt.is_correct === 'true' || opt.is_correct === true);
                    if (correctOptions.length === 0) {
                        errors.push(`Question ${index + 1}: At least one correct option is required`);
                    }
                    
                    // For true_false, ensure exactly 2 options
                    if (question.question_type === 'true_false' && question.options.length !== 2) {
                        errors.push(`Question ${index + 1}: True/False questions must have exactly 2 options`);
                    }
                }
            }
            
            // Validate correct answer for short answer
            if (question.question_type === 'short_answer') {
                if (!question.correct_answer || question.correct_answer.trim() === '') {
                    errors.push(`Question ${index + 1}: Correct answer is required for short answer questions`);
                }
            }
        });
        
        return { isValid: errors.length === 0, errors };
    }
    
    // Display file preview function
    function displayFilePreview(questions) {
        previewTableBody.innerHTML = '';
        
        questions.forEach(question => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white max-w-xs truncate">${question.question_text || ''}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${question.question_type || ''}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${question.subject_id || ''}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${question.class_room_id || ''}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Ready</span>
                </td>
            `;
            
            previewTableBody.appendChild(row);
        });
    }
    
    // Display validation errors function
    function displayValidationErrors(errors) {
        // For now, just show an alert with the first few errors
        const errorText = errors.slice(0, 5).join('\n');
        const moreErrors = errors.length > 5 ? `\n... and ${errors.length - 5} more errors` : '';
        alert('Validation errors:\n' + errorText + moreErrors);
    }
    
    // Display upload results function
    function displayUploadResults(result) {
        // Display summary
        resultsSummary.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Upload Complete</h3>
                    <p class="text-gray-600 dark:text-gray-400">${result.message}</p>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="text-center">
                        <p class="text-2xl font-bold text-green-600 dark:text-green-400">${result.created_count || 0}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Created</p>
                    </div>
                    <div class="text-center">
                        <p class="text-2xl font-bold text-red-600 dark:text-red-400">${result.error_count || 0}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Errors</p>
                    </div>
                </div>
            </div>
        `;
        
        // Display detailed results if there are errors
        if (result.errors && result.errors.length > 0) {
            resultsDetails.classList.remove('hidden');
            resultsList.innerHTML = '';
            
            result.errors.forEach(error => {
                const errorElement = document.createElement('div');
                errorElement.className = 'p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800';
                errorElement.innerHTML = `
                    <div class="flex items-start">
                        <span class="material-symbols-outlined text-red-500 dark:text-red-400 mr-2">error</span>
                        <p class="text-sm text-red-700 dark:text-red-300">${error}</p>
                    </div>
                `;
                resultsList.appendChild(errorElement);
            });
        } else {
            resultsDetails.classList.add('hidden');
        }
    }
    
    // Download CSV template function
    function downloadCsvTemplate() {
        const csvContent = `question_text,question_type,options,correct_answer
"What is the capital of France?","mcq","[""Paris"", ""London"",""Berlin""]", "1"
"Water boils at 100°C.","true_false","[""True"",""False""]", "1"
"What is the chemical symbol for water?","short_answer","H2O"`;
        
        downloadFile(csvContent, 'questions_template.csv', 'text/csv');
    }
    
    // Download JSON template function
    function downloadJsonTemplate() {
        const jsonContent = `[
  {
    "question_text": "What is the capital of France?",
    "question_type": "mcq",
    "options": [
        "Paris",
        "London",
        "Berlin"
    ],
    "answer": 1
  },
  {
    "question_text": "Water boils at 100°C.",
    "question_type": "true_false",
    "options": [
        "True",
        "False"
    ],
    "answer": 1
  },
  {
    "question_text": "What is the chemical symbol for water?",
    "question_type": "short_answer",
    "correct_answer": "H2O"
  }
]`;
        
        downloadFile(jsonContent, 'questions_template.json', 'application/json');
    }
    
    // Download DOCX template function
    function downloadDocxTemplate() {
        // Create a link to download the DOCX template from server endpoint
        window.location.href = '/admin/download_docx_template';
    }
    
    // Download file function
    function downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Show alert function
    function showAlert(message, type = 'info') {
        // Check if window.showAlert is available (from modal.js)
        if (window.showAlert) {
            window.showAlert({
                type: type,
                title: type.charAt(0).toUpperCase() + type.slice(1),
                message: message
            });
        } else {
            // Fallback to browser alert
            alert(message);
        }
    }
});

// Get the user ID from the base template
const userIdInput = document.querySelector('input[name="user_id"]');
const userId = userIdInput ? userIdInput.value : null;

// Add event listener for DOCX template download
document.addEventListener('DOMContentLoaded', function() {
    const downloadDocxTemplateBtn = document.getElementById('downloadDocxTemplate');
    if (downloadDocxTemplateBtn) {
        downloadDocxTemplateBtn.addEventListener('click', downloadDocxTemplate);
    }
});