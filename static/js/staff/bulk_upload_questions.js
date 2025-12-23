// Get the user ID from the base template
const userIdInput = document.querySelector('input[name="user_id"]');
const userId = userIdInput ? userIdInput.value : null;

// Get subject, class, term, and exam type selection elements
// Try both IDs to support both standalone and tabbed versions
const bulkClassSubjectSelect = document.getElementById('bulkClassSubject');
const subjectIdInput = document.getElementById('subject_id') || document.getElementById('bulk_subject_id');
const classRoomIdInput = document.getElementById('class_room_id') || document.getElementById('bulk_class_room_id');
const termIdInput = document.getElementById('term_id') || document.getElementById('bulkTerm');
const examTypeIdInput = document.getElementById('exam_type_id') || document.getElementById('bulkExamType');

document.addEventListener('DOMContentLoaded', function () {
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
    const downloadDocxTemplateBtn = document.getElementById('downloadDocxTemplate');
    
    // Update hidden inputs when bulkClassSubject changes
    if (bulkClassSubjectSelect) {
        bulkClassSubjectSelect.addEventListener('change', function() {
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
        closePreviewBtn.addEventListener('click', function () {
            filePreviewSection.classList.add('hidden');
        });
    }

    if (closeResultsBtn) {
        closeResultsBtn.addEventListener('click', function () {
            uploadResultsSection.classList.add('hidden');
        });
    }

    if (downloadDocxTemplateBtn) {
        downloadDocxTemplateBtn.addEventListener('click', downloadDocxTemplate);
    }

    // Preview file function
    async function previewFile() {
        const file = bulkFileInput.files[0];
        if (!file) {
            if (window.showAlert) {
                window.showAlert({
                    type: 'error',
                    title: 'No File Selected',
                    message: 'Please select a file first.'
                });
            }
            return;
        }

        // Check if it's a Word document
        if (file.name.endsWith('.docx')) {
            if (window.showAlert) {
                window.showAlert({
                    type: 'info',
                    title: 'Preview Not Available',
                    message: 'Preview is not available for Word documents. Please upload the file directly to see the results.'
                });
            }
            return;
        }

        try {
            const questions = await parseFile(file);
            displayFilePreview(questions);
            filePreviewSection.classList.remove('hidden');
        } catch (error) {
            console.error('Error previewing file:', error);
            if (window.showAlert) {
                window.showAlert({
                    type: 'error',
                    title: 'Preview Error',
                    message: 'Error previewing file: ' + error.message
                });
            }
        }
    }

    // Validate file function
    async function validateFile() {
        const file = bulkFileInput.files[0];
        if (!file) {
            showAlert('Please select a file first.', 'error');
            return;
        }

        // Check if it's a Word document
        if (file.name.endsWith('.docx')) {
            // Basic validation for DOCX files
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                if (window.showAlert) {
                    window.showAlert({
                        type: 'error',
                        title: 'File Too Large',
                        message: 'DOCX file must be less than 5MB. Your file is ' + (file.size / 1024 / 1024).toFixed(2) + 'MB.'
                    });
                }
                return;
            }
            
            if (window.showAlert) {
                window.showAlert({
                    type: 'info',
                    title: 'DOCX Validation',
                    message: 'Basic validation passed. The server will perform detailed validation during upload.<br><br><strong>Format reminder:</strong><br>• Start each question with "Question:"<br>• Specify type with "Type: MCQ/True/False/Short Answer"<br>• List options with "Options:" followed by "- Option text"<br>• Mark correct answer with * prefix (e.g., "- *Paris")<br>• For short answer, use "Answer: [text]"'
                });
            }
            return;
        }

        try {
            const questions = await parseFile(file);
            const validationResults = validateQuestions(questions);

            if (validationResults.isValid) {
                if (window.showAlert) {
                    window.showAlert({
                        type: 'success',
                        title: 'Validation Successful',
                        message: `File is valid and ready for upload!<br><br>Found ${questions.length} question(s).`
                    });
                } else {
                    showAlert('File is valid and ready for upload.', 'success');
                }
            } else {
                if (window.showAlert) {
                    window.showAlert({
                        type: 'error',
                        title: 'Validation Failed',
                        message: 'File contains errors. Please fix them before uploading.'
                    });
                }
                displayValidationErrors(validationResults.errors);
            }
        } catch (error) {
            console.error('Error validating file:', error);
            if (window.showAlert) {
                window.showAlert({
                    type: 'error',
                    title: 'Validation Error',
                    message: 'Error validating file: ' + error.message
                });
            } else {
                showAlert('Error validating file: ' + error.message, 'error');
            }
        }
    }

    // Handle bulk upload
    async function handleBulkUpload(event) {
        event.preventDefault();

        const file = bulkFileInput.files[0];
        if (!file) {
            if (window.showAlert) {
                window.showAlert({
                    type: 'error',
                    title: 'No File Selected',
                    message: 'Please select a file first.'
                });
            }
            return;
        }

        // Validate user ID is available
        if (!userId) {
            if (window.showAlert) {
                window.showAlert({
                    type: 'error',
                    title: 'Session Error',
                    message: 'User ID not found. Please refresh the page and try again.'
                });
            }
            return;
        }

        // Validate subject, class, term, and exam type selection
        if (!subjectIdInput || !subjectIdInput.value) {
            if (window.showAlert) {
                window.showAlert({
                    type: 'error',
                    title: 'Missing Selection',
                    message: 'Please select a class & subject.'
                });
            }
            return;
        }
        
        if (!classRoomIdInput || !classRoomIdInput.value) {
            if (window.showAlert) {
                window.showAlert({
                    type: 'error',
                    title: 'Missing Selection',
                    message: 'Please select a class.'
                });
            }
            return;
        }

        if (!termIdInput || !termIdInput.value) {
            if (window.showAlert) {
                window.showAlert({
                    type: 'error',
                    title: 'Missing Selection',
                    message: 'Please select a term.'
                });
            }
            return;
        }

        if (!examTypeIdInput || !examTypeIdInput.value) {
            if (window.showAlert) {
                window.showAlert({
                    type: 'error',
                    title: 'Missing Selection',
                    message: 'Please select an exam type.'
                });
            }
            return;
        }

        try {
            // Show loading state
            const submitBtn = bulkUploadForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> Uploading...';
            submitBtn.disabled = true;

            // Send file directly to server (supports JSON, CSV, and DOCX)
            const formData = new FormData();
            formData.append('file', file);
            formData.append('subject_id', subjectIdInput.value);
            formData.append('class_room_id', classRoomIdInput.value);
            formData.append('term_id', termIdInput.value);
            formData.append('exam_type_id', examTypeIdInput.value);

            const response = await fetch(`/staff/bulk_upload_questions/${userId}`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            // Restore button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;

            if (result.success) {
                // Show success modal first
                if (window.showAlert) {
                    window.showAlert({
                        type: 'success',
                        title: 'Upload Successful!',
                        message: `Successfully uploaded ${result.created_count} question(s)!${result.error_count > 0 ? '<br><br>Check the results section below for details about errors.' : ''}`
                    });
                }
                
                // Then display detailed results
                displayUploadResults(result);
                uploadResultsSection.classList.remove('hidden');
                
                // Reset form
                bulkUploadForm.reset();
                
                // Clear hidden inputs
                if (subjectIdInput) subjectIdInput.value = '';
                if (classRoomIdInput) classRoomIdInput.value = '';
            } else {
                if (window.showAlert) {
                    window.showAlert({
                        type: 'error',
                        title: 'Upload Failed',
                        message: result.message || 'An error occurred during upload.'
                    });
                }
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            
            if (window.showAlert) {
                window.showAlert({
                    type: 'error',
                    title: 'Upload Error',
                    message: 'Error uploading file: ' + error.message
                });
            }

            // Restore button
            const submitBtn = bulkUploadForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = 'Upload Questions';
                submitBtn.disabled = false;
            }
        }
    }

    // Parse file function
    async function parseFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = function (e) {
                try {
                    const content = e.target.result;
                    let questions;

                    if (file.name.endsWith('.csv')) {
                        console.log('Parsing CSV file...');
                        questions = parseCsv(content);
                        console.log('Parsed CSV questions:', questions);
                    } else if (file.name.endsWith('.json')) {
                        console.log('Parsing JSON file...');
                        const parsed = JSON.parse(content);
                        questions = Array.isArray(parsed) ? parsed : [parsed];
                        
                        // Transform JSON questions to match expected format
                        questions = questions.map((q, idx) => {
                            console.log(`Processing JSON question ${idx + 1}:`, q);
                            
                            const transformed = {
                                question_text: q.question_text,
                                question_type: q.question_type ? q.question_type.toLowerCase() : 'mcq'
                            };
                            
                            // Handle MCQ and True/False questions
                            if ((transformed.question_type === 'mcq' || transformed.question_type === 'true_false') && q.options && Array.isArray(q.options)) {
                                const answerIndex = parseInt(q.answer);
                                console.log(`Answer index: ${answerIndex}, Options:`, q.options);
                                
                                transformed.options = q.options.map((opt, optIdx) => ({
                                    text: opt,
                                    is_correct: optIdx === answerIndex
                                }));
                                
                                console.log(`Transformed options:`, transformed.options);
                            } 
                            // Handle Short Answer questions
                            else if (transformed.question_type === 'short_answer' && q.correct_answer) {
                                transformed.correct_answer = q.correct_answer;
                                console.log(`Short answer: ${transformed.correct_answer}`);
                            }
                            
                            console.log(`Transformed question ${idx + 1}:`, transformed);
                            return transformed;
                        });
                    } else if (file.name.endsWith('.docx')) {
                        // For Word documents, we need to send the file to the server for parsing
                        throw new Error('Word documents must be uploaded directly to the server for parsing');
                    } else {
                        throw new Error('Unsupported file format. Please use CSV, JSON, or DOCX files.');
                    }

                    console.log('Final parsed questions:', questions);
                    resolve(questions);
                } catch (error) {
                    console.error('Error parsing file:', error);
                    reject(error);
                }
            };

            reader.onerror = function () {
                reject(new Error('Error reading file'));
            };

            if (file.name.endsWith('.csv') || file.name.endsWith('.json')) {
                reader.readAsText(file);
            } else if (file.name.endsWith('.docx')) {
                // For Word documents, we'll handle them on the server side
                reject(new Error('Word documents cannot be previewed. Please upload directly.'));
            } else {
                reject(new Error('Unsupported file format'));
            }
        });
    }

    // Parse CSV function
    function parseCsv(csv) {
        const lines = csv.trim().split('\n').filter(line => line.trim() !== '');
        
        if (lines.length === 0) {
            throw new Error('CSV file is empty');
        }
        
        if (lines.length < 2) {
            throw new Error('CSV file must have at least a header row and one data row. Make sure the first line contains: question_text,question_type,options,correct_answer');
        }
        
        const headers = lines[0].split(',').map(header => header.trim().replace(/^"|"$/g, ''));
        console.log('CSV Headers:', headers);
        
        // Validate headers
        const requiredHeaders = ['question_text', 'question_type', 'options', 'correct_answer'];
        const hasAllHeaders = requiredHeaders.every(h => headers.includes(h));
        
        if (!hasAllHeaders) {
            throw new Error(`CSV file must have headers: ${requiredHeaders.join(', ')}. Found: ${headers.join(', ')}`);
        }
        
        const questions = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;

            // Handle CSV parsing with quoted values
            const values = [];
            let currentValue = '';
            let insideQuotes = false;
            
            for (let j = 0; j < lines[i].length; j++) {
                const char = lines[i][j];
                
                if (char === '"') {
                    insideQuotes = !insideQuotes;
                } else if (char === ',' && !insideQuotes) {
                    values.push(currentValue.trim());
                    currentValue = '';
                } else {
                    currentValue += char;
                }
            }
            values.push(currentValue.trim());

            console.log(`CSV Row ${i} values:`, values);

            const question = {};
            headers.forEach((header, index) => {
                if (index < values.length) {
                    question[header] = values[index];
                }
            });

            console.log(`CSV Question ${i} before transformation:`, question);

            // Transform based on question type
            const transformed = {
                question_text: question.question_text,
                question_type: question.question_type ? question.question_type.toLowerCase() : 'mcq'
            };

            // Parse options if they exist (for MCQ and True/False)
            if (question.options && question.options.trim()) {
                try {
                    const optionsArray = JSON.parse(question.options);
                    const answerIndex = parseInt(question.correct_answer || 0);
                    
                    console.log(`Options array:`, optionsArray, `Answer index:`, answerIndex);
                    
                    transformed.options = optionsArray.map((opt, idx) => ({
                        text: opt,
                        is_correct: idx === answerIndex
                    }));
                } catch (e) {
                    console.error('Error parsing options:', e);
                    transformed.options = [];
                }
            } 
            // Handle short answer
            else if (question.correct_answer && question.correct_answer.trim()) {
                transformed.correct_answer = question.correct_answer;
            }

            console.log(`CSV Question ${i} after transformation:`, transformed);
            questions.push(transformed);
        }

        return questions;
    }

    // Validate questions function
    function validateQuestions(questions) {
        console.log('Validating questions:', questions);
        const errors = [];

        if (!Array.isArray(questions)) {
            errors.push('Questions must be an array');
            return { isValid: false, errors };
        }

        if (questions.length === 0) {
            errors.push('No questions found in file');
            return { isValid: false, errors };
        }

        questions.forEach((question, index) => {
            console.log(`Validating question ${index + 1}:`, question);
            
            if (!question.question_text || question.question_text.trim() === '') {
                errors.push(`Question ${index + 1}: Question text is required`);
            }

            if (!question.question_type || question.question_type.trim() === '') {
                errors.push(`Question ${index + 1}: Question type is required`);
            }

            // Validate question type
            const validTypes = ['mcq', 'true_false', 'short_answer'];
            const qType = question.question_type ? question.question_type.toLowerCase() : '';
            if (qType && !validTypes.includes(qType)) {
                errors.push(`Question ${index + 1}: Invalid question type '${question.question_type}'. Must be one of: ${validTypes.join(', ')}`);
            }

            // Validate options for MCQ and True/False
            if (qType === 'mcq' || qType === 'true_false') {
                console.log(`Question ${index + 1} is ${qType}, checking options:`, question.options);
                
                if (!question.options || !Array.isArray(question.options) || question.options.length === 0) {
                    errors.push(`Question ${index + 1}: Options are required for ${question.question_type} questions`);
                } else {
                    // Check that there's at least one correct answer
                    const correctOptions = question.options.filter(opt => {
                        if (typeof opt === 'object' && opt !== null) {
                            return opt.is_correct === true;
                        }
                        return false;
                    });
                    
                    console.log(`Question ${index + 1} correct options:`, correctOptions);
                    
                    if (correctOptions.length === 0) {
                        errors.push(`Question ${index + 1}: At least one correct option is required (none marked as correct)`);
                    }

                    // For true_false, ensure exactly 2 options
                    if (qType === 'true_false' && question.options.length !== 2) {
                        errors.push(`Question ${index + 1}: True/False questions must have exactly 2 options (found ${question.options.length})`);
                    }
                }
            }

            // Validate correct answer for short answer
            if (qType === 'short_answer') {
                console.log(`Question ${index + 1} is short_answer, checking correct_answer:`, question.correct_answer);
                
                if (!question.correct_answer || question.correct_answer.trim() === '') {
                    errors.push(`Question ${index + 1}: Correct answer is required for short answer questions`);
                }
            }
        });

        console.log('Validation result:', { isValid: errors.length === 0, errors });
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
        const errorList = errors.slice(0, 10).map(err => `• ${err}`).join('<br>');
        const moreErrors = errors.length > 10 ? `<br>... and ${errors.length - 10} more errors` : '';
        
        if (window.showAlert) {
            window.showAlert({
                type: 'error',
                title: 'Validation Errors',
                message: `Found ${errors.length} validation error(s):<br><br>${errorList}${moreErrors}`
            });
        } else {
            alert('Validation errors:\n' + errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n... and ${errors.length - 5} more errors` : ''));
        }
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
"What is the capital of France?","mcq","[""London"",""Paris"",""Berlin""]","1"
"Water boils at 100°C.","true_false","[""False"",""True""]","1"
"What is the chemical symbol for water?","short_answer","","H2O"`;
        
        downloadFile(csvContent, 'questions_template.csv', 'text/csv');
        
        if (window.showAlert) {
            window.showAlert({
                type: 'success',
                title: 'CSV Template Downloaded',
                message: 'CSV template has been downloaded.<br><br><strong>Important:</strong><br>• First line MUST be the header: question_text,question_type,options,correct_answer<br>• The "correct_answer" field is the index (0-based) of the correct option<br>• For short answer, leave options empty and put answer in correct_answer field'
            });
        }
    }

    // Download JSON template function
    function downloadJsonTemplate() {
        const jsonContent = `[
  {
    "question_text": "What is the capital of France?",
    "question_type": "mcq",
    "options": ["London", "Paris", "Berlin"],
    "answer": 1
  },
  {
    "question_text": "Water boils at 100°C.",
    "question_type": "true_false",
    "options": ["False", "True"],
    "answer": 1
  },
  {
    "question_text": "What is the chemical symbol for water?",
    "question_type": "short_answer",
    "correct_answer": "H2O"
  }
]`;
        
        downloadFile(jsonContent, 'questions_template.json', 'application/json');
        
        if (window.showAlert) {
            window.showAlert({
                type: 'success',
                title: 'Template Downloaded',
                message: 'JSON template has been downloaded. The "answer" field should be the index (0-based) of the correct option.'
            });
        }
    }

    // Download DOCX template function
    function downloadDocxTemplate() {
        // Create a link to download the DOCX template from server endpoint
        window.location.href = '/staff/download_docx_template';
        
        if (window.showAlert) {
            setTimeout(() => {
                window.showAlert({
                    type: 'info',
                    title: 'Template Downloading',
                    message: 'DOCX template is being downloaded. Mark correct answers with * prefix (e.g., - *Paris).'
                });
            }, 500);
        }
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