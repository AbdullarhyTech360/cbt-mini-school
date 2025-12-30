document.addEventListener('DOMContentLoaded', function () {

    // Function to format assessment names for display
    function formatAssessmentName(code) {
        if (!code) return code;
        
        // Special handling for common assessment types
        const specialCases = {
            'cbt': 'Computer Based Test',
            'ca': 'Continuous Assessment',
            'exam': 'Terminal Examination',
            'mid_term': 'Mid-Term Exam',
            'final': 'Final Exam',
            'quiz': 'Quiz',
            'assignment': 'Assignment',
            'project': 'Project',
            'first_ca': 'First CA',
            'second_ca': 'Second CA',
            'third_ca': 'Third CA',
            'fourth_ca': 'Fourth CA',
        };
        
        const lowerCode = code.toLowerCase();
        if (lowerCode in specialCases) {
            return specialCases[lowerCode];
        }
        
        // Convert snake_case to Title Case
        return code.split('_')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
    }
    
    // Helper function to get formatted assessment name
    function getFormattedAssessmentName(code) {
        return formatAssessmentName(code);
    }
    
    // Helper function to get formatted name from data
    function getFormattedNameFromData(subjectData, assessmentType) {
        if (subjectData && subjectData.scores) {
            for (let score of subjectData.scores) {
                if (score.assessment_type === assessmentType && score.formatted_type) {
                    return score.formatted_type;
                }
            }
        }
        // Fallback to our own formatting
        return formatAssessmentName(assessmentType);
    }

    // Load classes for the broad sheet dropdown
    window.loadClassesForBroadSheet = async function() {
        try {
            const response = await fetch('/reports/api/classes');
            const data = await response.json();
            
            if (data.success) {
                const classSelect = document.getElementById('broad-sheet-class');
                classSelect.innerHTML = '<option value="">Select Class</option>';
                
                data.classes.forEach(cls => {
                    const option = document.createElement('option');
                    option.value = cls.class_room_id;
                    option.textContent = cls.class_name;
                    classSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading classes:', error);
            showAlert('Error', 'Failed to load classes', 'error');
        }
    }

    // Load terms for the broad sheet dropdown
    window.loadTermsForBroadSheet = async function() {
        try {
            const response = await fetch('/reports/api/terms');
            const data = await response.json();
            
            if (data.success) {
                const termSelect = document.getElementById('broad-sheet-term');
                termSelect.innerHTML = '<option value="">Select Term</option>';
                
                data.terms.forEach(term => {
                    const option = document.createElement('option');
                    option.value = term.term_id;
                    option.textContent = `${term.term_name} - ${term.academic_session}`;
                    termSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading terms:', error);
            showAlert('Error', 'Failed to load terms', 'error');
        }
    }



    // Export broad sheet as PDF
    document.getElementById('export-broad-sheet-pdf')?.addEventListener('click', async function() {
        await loadAndExportBroadSheet('pdf');
    });

    // Export broad sheet as Excel
    document.getElementById('export-broad-sheet-excel')?.addEventListener('click', async function() {
        await loadAndExportBroadSheet('excel');
    });
    
    // Preview broad sheet
    document.getElementById('preview-broad-sheet')?.addEventListener('click', async function() {
        await loadAndPreviewBroadSheet();
    });
    
    // Function to load data and show preview
    async function loadAndPreviewBroadSheet() {
        const classId = document.getElementById('broad-sheet-class').value;
        const termId = document.getElementById('broad-sheet-term').value;
        
        if (!classId || !termId) {
            showAlert({
                title: 'Error',
                message: 'Please select both class and term',
                type: 'error',
            });
            return;
        }
        
        // Get selected exam types from checkboxes
        const allExamsChecked = document.getElementById('exam-type-all')?.checked || false;
        const caChecked = document.getElementById('exam-type-ca')?.checked || false;
        const examChecked = document.getElementById('exam-type-exam')?.checked || false;
        
        // Build exam types array
        let examTypes = [];
        if (allExamsChecked) {
            examTypes = ['ca', 'exam'];
        } else {
            if (caChecked) examTypes.push('ca');
            if (examChecked) examTypes.push('exam');
        }
        
        if (examTypes.length === 0) {
            showAlert({
                title: 'Error',
                message: 'Please select at least one exam type',
                type: 'error',
            });
            return;
        }
        
        try {
            showLoadingState('preview-broad-sheet', 'Loading...');
            
            const response = await fetch('/reports/api/broad-sheet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    class_room_id: classId,
                    term_id: termId,
                    exam_type: examTypes.join(',')
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log(result.data);
            if (result.success) {
                window.currentBroadSheetData = {
                    data: result.data,
                    metadata: result.metadata
                };
                await showCanvasBasedPreviewBroadSheet(window.currentBroadSheetData);
            } else {
                showAlert({
                    title: 'Error',
                    message: result.message || 'Failed to load broad sheet data',
                    type: 'error',
                });
            }
        } catch (error) {
            console.error('Error loading broadsheet data:', error);
            showAlert({
                title: 'Error',
                message: 'Failed to load broad sheet data: ' + error.message,
                type: 'error',
            });
        } finally {
            hideLoadingState('preview-broad-sheet', 'Preview');
        }
    }

    // Function to export broad sheet in specified format
    async function exportBroadSheet(format) {
        const classId = document.getElementById('broad-sheet-class').value;
        const termId = document.getElementById('broad-sheet-term').value;
        
        // Get selected exam types from checkboxes
        const allExamsChecked = document.getElementById('exam-type-all')?.checked || false;
        
        // Only consider other checkboxes if they are enabled
        const caCheckbox = document.getElementById('exam-type-ca');
        const examCheckbox = document.getElementById('exam-type-exam');
        
        const caChecked = caCheckbox && !caCheckbox.disabled && caCheckbox.checked;
        const examChecked = examCheckbox && !examCheckbox.disabled && examCheckbox.checked;
        
        // Determine exam_type based on selections
        let examType = 'all';
        if (allExamsChecked) {
            examType = 'all';
        } else {
            // Build exam type string based on checked boxes
            const selectedTypes = [];
            if (caChecked) selectedTypes.push('ca');
            if (examChecked) selectedTypes.push('exam');
            
            if (selectedTypes.length === 0) {
                examType = 'all'; // Default to all if none selected
            } else if (selectedTypes.length === 1) {
                examType = selectedTypes[0];
            } else {
                examType = selectedTypes.join(','); // Send multiple types separated by comma
            }
        }
        
        const showExamsCheckbox = document.getElementById('show-exams');
        const showTotalsCheckbox = document.getElementById('show-totals');
        const showExams = showExamsCheckbox ? showExamsCheckbox.checked : true; // Default to true if element doesn't exist
        const showTotals = showTotalsCheckbox ? showTotalsCheckbox.checked : true; // Default to true if element doesn't exist

        if (!classId || !termId) {
            showAlert('Validation Error', 'Please select both class and term', 'warning');
            return;
        }

        try {
            showLoading(true);
            
            const response = await fetch(`/reports/api/broad-sheet/export/${format}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    class_room_id: classId,
                    term_id: termId,
                    exam_type: examType,
                    show_exams: showExams,
                    show_totals: showTotals
                })
            });

            if (response.ok) {
                // Create a temporary link to download the file
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || `broad_sheet.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                const errorData = await response.json();
                showAlert('Error', errorData.error || 'Failed to export broad sheet', 'error');
            }
        } catch (error) {
            console.error('Error exporting broad sheet:', error);
            showAlert('Error', 'Failed to export broad sheet', 'error');
        } finally {
            showLoading(false);
        }
    }
    
    // Function to load data and export broad sheet
    async function loadAndExportBroadSheet(format) {
        const classId = document.getElementById('broad-sheet-class').value;
        const termId = document.getElementById('broad-sheet-term').value;
        
        if (!classId || !termId) {
            showAlert({
                title: 'Error',
                message: 'Please select both class and term',
                type: 'error',
            });
            return;
        }
        
        // Get selected exam types from checkboxes
        const allExamsChecked = document.getElementById('exam-type-all')?.checked || false;
        const caChecked = document.getElementById('exam-type-ca')?.checked || false;
        const examChecked = document.getElementById('exam-type-exam')?.checked || false;
        
        // Build exam types array - for broadsheet, we want ALL assessment types by default
        let examTypes = [];
        if (allExamsChecked) {
            examTypes = ['ca', 'exam'];  // Request CA and Exam assessment types
        } else {
            if (caChecked) examTypes.push('ca');
            if (examChecked) examTypes.push('exam');
        }
        
        // If no specific types selected, default to 'all' to get all assessment types
        if (examTypes.length === 0) {
            examTypes = ['all'];
        }
        
        try {
            // Show loading state based on format
            const buttonId = format === 'pdf' ? 'export-broad-sheet-pdf' : 'export-broad-sheet-excel';
            const buttonText = format === 'pdf' ? 'PDF' : 'Excel';
            showLoadingState(buttonId, 'Exporting...');
            
            const response = await fetch('/reports/api/broad-sheet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    class_room_id: classId,
                    term_id: termId,
                    exam_type: examTypes.join(',')
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                window.currentBroadSheetData = {
                    data: result.data,
                    metadata: result.metadata
                };
                
                // Now call the actual export function
                await exportBroadSheetFromData(format, window.currentBroadSheetData);
            } else {
                showAlert({
                    title: 'Error',
                    message: result.message || 'Failed to load broad sheet data',
                    type: 'error',
                });
            }
        } catch (error) {
            console.error('Error loading broadsheet data for export:', error);
            showAlert({
                title: 'Error',
                message: 'Failed to load broad sheet data: ' + error.message,
                type: 'error',
            });
        } finally {
            const buttonId = format === 'pdf' ? 'export-broad-sheet-pdf' : 'export-broad-sheet-excel';
            const buttonText = format === 'pdf' ? 'PDF' : 'Excel';
            hideLoadingState(buttonId, buttonText);
        }
    }
    
    // Function to export broad sheet with data already loaded
    async function exportBroadSheetFromData(format, broadSheetData) {
        const classId = document.getElementById('broad-sheet-class').value;
        const termId = document.getElementById('broad-sheet-term').value;
        
        // Get selected exam types from checkboxes
        const allExamsChecked = document.getElementById('exam-type-all')?.checked || false;
        const caChecked = document.getElementById('exam-type-ca')?.checked || false;
        const examChecked = document.getElementById('exam-type-exam')?.checked || false;
        
        // Build exam types array
        let examTypes = [];
        if (allExamsChecked) {
            examTypes = ['ca', 'exam'];
        } else {
            if (caChecked) examTypes.push('ca');
            if (examChecked) examTypes.push('exam');
        }
        
        const examType = examTypes.join(',');
        const showExamsCheckbox = document.getElementById('show-exams');
        const showTotalsCheckbox = document.getElementById('show-totals');
        const showExams = showExamsCheckbox ? showExamsCheckbox.checked : true; // Default to true if element doesn't exist
        const showTotals = showTotalsCheckbox ? showTotalsCheckbox.checked : true; // Default to true if element doesn't exist
        
        if (!classId || !termId) {
            showAlert({
                title: 'Error',
                message: 'Please select both class and term',
                type: 'error',
            });
            return;
        }
        
        try {
            // Show loading state
            const buttonId = format === 'pdf' ? 'export-broad-sheet-pdf' : 'export-broad-sheet-excel';
            const buttonText = format === 'pdf' ? 'PDF' : 'Excel';
            showLoadingState(buttonId, 'Exporting...');
            
            const response = await fetch(`/reports/api/broad-sheet/export/${format}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    class_room_id: classId,
                    term_id: termId,
                    exam_type: examType,
                    show_exams: showExams,
                    show_totals: showTotals
                })
            });

            if (response.ok) {
                // Create a temporary link to download the file
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || `broad_sheet.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                const errorData = await response.json();
                showAlert({
                    title: 'Error',
                    message: errorData.error || 'Failed to export broad sheet',
                    type: 'error',
                });
            }
        } catch (error) {
            console.error('Error exporting broad sheet:', error);
            showAlert({
                title: 'Error',
                message: 'Failed to export broad sheet',
                type: 'error',
            });
        } finally {
            const buttonId = format === 'pdf' ? 'export-broad-sheet-pdf' : 'export-broad-sheet-excel';
            const buttonText = format === 'pdf' ? 'PDF' : 'Excel';
            hideLoadingState(buttonId, buttonText);
        }
    }

    // Helper function to show loading state on a button
    function showLoadingState(buttonId, loadingText) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = true;
            button.innerHTML = ` 
                <span class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                <span>${loadingText}</span>
            `;
        }
    }
    
    // Helper function to hide loading state on a button
    function hideLoadingState(buttonId, originalText) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = false;
            button.innerHTML = ` 
                <span class="material-symbols-outlined text-lg">${buttonId.includes('preview') ? 'preview' : buttonId.includes('pdf') ? 'download' : 'download'}</span>
                <span class="text-xs font-bold">${originalText}</span>
            `;
        }
    }
    
    // Function to display the broad sheet in the table
    function displayBroadSheet(data, metadata, showExams, showTotals) {
        const table = document.getElementById('broad-sheet-table');
        const header = document.getElementById('broad-sheet-header');
        const body = document.getElementById('broad-sheet-body');
        const classInfo = document.getElementById('class-info');
        const termInfo = document.getElementById('term-info');

        if (classInfo) classInfo.textContent = metadata.class_name;
        if (termInfo) termInfo.textContent = metadata.term_name;

        // Get all unique subjects
        const subjects = new Set();
        data.forEach(student => {
            Object.keys(student.subjects).forEach(subject => {
                subjects.add(subject);
            });
        });
        const subjectList = Array.from(subjects).sort();

        // Create consistent mapping of all assessment types for each subject
        const subjectAssessmentMap = {};
        
        // First, collect all unique assessment types for each subject across all students
        subjectList.forEach(subject => {
            const assessmentTypes = new Set();
            data.forEach(student => {
                if (student.subjects[subject] && student.subjects[subject].scores) {
                    student.subjects[subject].scores.forEach(score => {
                        assessmentTypes.add(score.assessment_type);
                    });
                }
            });
            
            // Create an array with both the assessment type and its formatted name for sorting
            const assessmentDetails = Array.from(assessmentTypes).map(assessmentType => {
                // Try to find the formatted name from the data
                let formattedName = assessmentType;
                for (const student of data) {
                    if (student.subjects[subject] && student.subjects[subject].scores) {
                        const score = student.subjects[subject].scores.find(s => s.assessment_type === assessmentType);
                        if (score && score.formatted_type) {
                            formattedName = score.formatted_type;
                            break;
                        }
                    }
                }
                return { code: assessmentType, formatted: formattedName };
            });
            
            // Sort using assessment type orders from metadata, with CBT first, then by order, with 'total' last
            assessmentDetails.sort((a, b) => {
                const aCode = a.code.toLowerCase();
                const bCode = b.code.toLowerCase();
                
                // Total should always be last
                if (aCode === 'total') return 1;
                if (bCode === 'total') return -1;
                
                // Check if any scores for this assessment type are from CBT
                let isAFromCbt = false;
                let isBFromCbt = false;
                
                // Check if any student has CBT scores for assessment type A
                for (const student of data) {
                    if (student.subjects[subject] && student.subjects[subject].scores) {
                        for (const score of student.subjects[subject].scores) {
                            if (score.assessment_type === a.code && score.is_cbt) {
                                isAFromCbt = true;
                                break;
                            }
                        }
                        if (isAFromCbt) break;
                    }
                }
                
                // Check if any student has CBT scores for assessment type B
                for (const student of data) {
                    if (student.subjects[subject] && student.subjects[subject].scores) {
                        for (const score of student.subjects[subject].scores) {
                            if (score.assessment_type === b.code && score.is_cbt) {
                                isBFromCbt = true;
                                break;
                            }
                        }
                        if (isBFromCbt) break;
                    }
                }
                
                // CBT assessments should come first
                if (isAFromCbt && !isBFromCbt) return -1;
                if (isBFromCbt && !isAFromCbt) return 1;
                
                // Get order values from metadata, default to 999 if not found
                const orderA = metadata.assessment_type_orders && metadata.assessment_type_orders[a.code] !== undefined ? 
                    metadata.assessment_type_orders[a.code] : 999;
                const orderB = metadata.assessment_type_orders && metadata.assessment_type_orders[b.code] !== undefined ? 
                    metadata.assessment_type_orders[b.code] : 999;
                
                // Sort by order value
                return orderA - orderB;
            });
            
            // Extract just the codes for the map
            subjectAssessmentMap[subject] = assessmentDetails.map(detail => detail.code);
        });

        // Create multi-level header rows
        let headerHTML = '<tr>';
        headerHTML += '<th class="py-3 px-4 font-semibold" rowspan="2">S/N</th>';
        headerHTML += '<th class="py-3 px-4 font-semibold" rowspan="2">Student Name</th>';

        // Add subject headers with correct colspan
        subjectList.forEach(subject => {
            const assessmentTypes = subjectAssessmentMap[subject];
            const totalColumns = assessmentTypes.length + 1; // +1 for Total column
            headerHTML += `<th class="py-3 px-4 font-semibold text-center" colspan="${totalColumns}">${subject}</th>`;
        });

        headerHTML += '</tr>';
        headerHTML += '<tr>';

        // Add empty headers for S/N and Student Name columns in the second row
        // to maintain proper table structure alignment
        headerHTML += '<th></th><th></th>';
        
        // Add assessment type headers for subject columns
        subjectList.forEach(subject => {
            const assessmentTypes = subjectAssessmentMap[subject];
            
            // Add individual assessment headers with formatted names from data
            assessmentTypes.forEach(assessmentType => {
                // Try to get formatted name from the first subject's data, otherwise format it
                const firstSubjectWithAssessment = Object.values(data).find(s => 
                    s.subjects && 
                    Object.values(s.subjects).some(sub => 
                        sub.scores && 
                        sub.scores.some(score => score.assessment_type === assessmentType)
                    )
                );
                
                let formattedName = assessmentType; // Default to raw name
                if (firstSubjectWithAssessment) {
                    const subjectWithAssessment = Object.values(firstSubjectWithAssessment.subjects).find(sub => 
                        sub.scores && sub.scores.some(score => score.assessment_type === assessmentType)
                    );
                    if (subjectWithAssessment) {
                        const scoreData = subjectWithAssessment.scores.find(score => score.assessment_type === assessmentType);
                        if (scoreData && scoreData.formatted_type) {
                            formattedName = scoreData.formatted_type;
                        }
                    }
                }
                
                // Fallback to our own formatting if no formatted name found in data
                if (formattedName === assessmentType) {
                    formattedName = getFormattedAssessmentName(assessmentType);
                }
                
                headerHTML += `<th class="py-2 px-2 text-xs font-medium">${formattedName}</th>`;
            });
            
            // Add total header for this subject
            headerHTML += `<th class="py-2 px-2 text-xs font-medium">Total</th>`;
        });
        
        headerHTML += '</tr>';
        
        // Add empty headers for S/N and Student Name columns in the second row
        // to maintain proper alignment - this is not needed as rowspan handles it correctly
        header.innerHTML = headerHTML;

        // Create body rows
        let bodyHTML = '';
        data.forEach((student, index) => {
            bodyHTML += '<tr class="text-gray-700 dark:text-gray-300">';
            bodyHTML += `<td class="py-3 px-4">${index + 1}</td>`;
            bodyHTML += `<td class="py-3 px-4">${student.student_name}</td>`;

            subjectList.forEach(subject => {
                const assessmentTypes = subjectAssessmentMap[subject];
                
                if (student.subjects[subject]) {
                    const subjectData = student.subjects[subject];
                    
                    // Create a lookup for the student's scores by assessment type
                    const scoreLookup = {};
                    if (subjectData.scores && subjectData.scores.length > 0) {
                        subjectData.scores.forEach(score => {
                            scoreLookup[score.assessment_type] = score;
                        });
                    }
                    
                    // Add individual assessment scores in the correct order
                    assessmentTypes.forEach(assessmentType => {
                        if (scoreLookup[assessmentType]) {
                            const score = scoreLookup[assessmentType];
                            let scoreText = `${score.score}`;  // Show only the raw score value
                            // Add CBT indicator if applicable
                            if (score.is_cbt) {
                                scoreText += ' (CBT)';
                            }
                            bodyHTML += `<td class="py-2 px-2 text-center">${scoreText}</td>`;
                        } else {
                            // If this student doesn't have this assessment type, show empty
                            bodyHTML += '<td class="py-2 px-2 text-center">-</td>';
                        }
                    });
                    
                    // Add total score for this subject
                    const totalText = `${subjectData.total_score}`;  // Show only the raw total score
                    bodyHTML += `<td class="py-2 px-2 text-center font-bold">${totalText}</td>`;
                } else {
                    // If student doesn't have this subject, add empty cells for all assessments + total
                    assessmentTypes.forEach(() => {
                        bodyHTML += '<td class="py-2 px-2 text-center">-</td>';
                    });
                    bodyHTML += '<td class="py-2 px-2 text-center font-bold">-</td>'; // Total cell
                }
            });

            bodyHTML += '</tr>';
        });

        body.innerHTML = bodyHTML;

        // Show the results section
        document.getElementById('broad-sheet-results').classList.remove('hidden');
        
        // Store data for preview functionality - enrich metadata with school info
        window.currentBroadSheetData = {
            data: data,
            metadata: {
                ...metadata,
                school_name: metadata.school_name || 'N/A',
                school_address: metadata.school_address || 'N/A',
                form_master: metadata.form_master || 'N/A',
                academic_session: metadata.academic_session || 'N/A'
            },
            showExams: showExams,
            showTotals: showTotals
        };
    }

    // Canvas-based preview functionality for broadsheet
    async function showCanvasBasedPreviewBroadSheet(broadSheetData) {
        try {
            console.log("Creating canvas-based broadsheet preview");
            
            // Ensure required functions are available
            if (typeof html2canvas === "undefined") {
                await loadHtml2Canvas();
            }
            
            if (typeof createCanvasPreviewModal !== 'function') {
                console.error('createCanvasPreviewModal function is not available');
                alert('Preview functionality is not available. Please refresh the page.');
                return;
            }
            
            if (typeof waitForResources !== 'function') {
                console.error('waitForResources function is not available');
                alert('Preview functionality is not available. Please refresh the page.');
                return;
            }
            
            // Create or get the preview modal
            let modal = document.getElementById("canvasPdfPreviewModal");
            if (!modal) {
                modal = createCanvasPreviewModal();
            }
            
            // Generate HTML content for broadsheet preview
            const html = generateBroadSheetHTML(broadSheetData);
            
            // Create temporary element for rendering
            const tempDiv = document.createElement("div");
            tempDiv.style.position = "absolute";
            tempDiv.style.left = "-9999px";
            tempDiv.style.top = "0";
            tempDiv.style.width = "210mm"; // A4 width
            tempDiv.style.backgroundColor = "white";
            
            // Inject CSS to fix oklch color function issue
            const styleFix = document.createElement('style');
            styleFix.textContent = `/* Fix for html2canvas oklch color function support */
:root {
  --color-red-50: #fef2f2; --color-red-100: #fee2e2; --color-red-200: #fecaca; --color-red-300: #fca5a5; --color-red-400: #f87171; --color-red-500: #ef4444; --color-red-600: #dc2626; --color-red-700: #b91c1c; --color-red-800: #991b1b; --color-red-900: #7f1d1d;
  --color-orange-50: #fff7ed; --color-orange-100: #ffedd5; --color-orange-200: #fed7aa; --color-orange-300: #fdba74; --color-orange-400: #fb923c; --color-orange-500: #f97316; --color-orange-600: #ea580c; --color-orange-700: #c2410c; --color-orange-800: #9a3412; --color-orange-900: #7c2d12;
  --color-amber-50: #fffbeb; --color-amber-100: #fef3c7; --color-amber-200: #fde68a; --color-amber-300: #fcd34d; --color-amber-400: #fbbf24; --color-amber-500: #f59e0b; --color-amber-600: #d97706; --color-amber-700: #b45309; --color-amber-800: #92400e; --color-amber-900: #78350f;
  --color-yellow-50: #fefce8; --color-yellow-100: #fef9c3; --color-yellow-200: #fef08a; --color-yellow-300: #fde047; --color-yellow-400: #fbcf33; --color-yellow-500: #eab308; --color-yellow-600: #ca8a04; --color-yellow-700: #a16207; --color-yellow-800: #854d0e; --color-yellow-900: #713f12;
  --color-lime-50: #f7fee7; --color-lime-100: #ecfccb; --color-lime-200: #d9f99d; --color-lime-300: #bef264; --color-lime-400: #a3e635; --color-lime-500: #84cc16; --color-lime-600: #65a30d; --color-lime-700: #4d7c0f; --color-lime-800: #3f6212; --color-lime-900: #365314;
  --color-green-50: #f0fdf4; --color-green-100: #dcfce7; --color-green-200: #bbf7d0; --color-green-300: #86efac; --color-green-400: #4ade80; --color-green-500: #22c55e; --color-green-600: #16a34a; --color-green-700: #15803d; --color-green-800: #166534; --color-green-900: #14532d;
  --color-emerald-50: #ecfdf5; --color-emerald-100: #d1fae5; --color-emerald-200: #a7f3d0; --color-emerald-300: #6ee7b7; --color-emerald-400: #34d399; --color-emerald-500: #10b981; --color-emerald-600: #059669; --color-emerald-700: #047857; --color-emerald-800: #065f46; --color-emerald-900: #064e3b;
  --color-teal-50: #f0fdfa; --color-teal-100: #ccfbf1; --color-teal-200: #99f6e4; --color-teal-300: #5eead4; --color-teal-400: #2dd4bf; --color-teal-500: #14b8a6; --color-teal-600: #0d9488; --color-teal-700: #0f766e; --color-teal-800: #115e59; --color-teal-900: #134e4a;
  --color-cyan-50: #ecfeff; --color-cyan-100: #cffafe; --color-cyan-200: #a5f3fc; --color-cyan-300: #67e8f9; --color-cyan-400: #22d3ee; --color-cyan-500: #06b6d4; --color-cyan-600: #0891b2; --color-cyan-700: #0e7490; --color-cyan-800: #155e75; --color-cyan-900: #164e63;
  --color-sky-50: #f0f9ff; --color-sky-100: #e0f2fe; --color-sky-200: #bae6fd; --color-sky-300: #7dd3fc; --color-sky-400: #38bdf8; --color-sky-500: #0ea5e9; --color-sky-600: #0284c7; --color-sky-700: #0369a1; --color-sky-800: #075985; --color-sky-900: #0c4a6e;
  --color-blue-50: #eff6ff; --color-blue-100: #dbeafe; --color-blue-200: #bfdbfe; --color-blue-300: #93c5fd; --color-blue-400: #60a5fa; --color-blue-500: #3b82f6; --color-blue-600: #2563eb; --color-blue-700: #1d4ed8; --color-blue-800: #1e40af; --color-blue-900: #1e3a8a;
  --color-indigo-50: #eef2ff; --color-indigo-100: #e0e7ff; --color-indigo-200: #c7d2fe; --color-indigo-300: #a5b4fc; --color-indigo-400: #818cf8; --color-indigo-500: #6366f1; --color-indigo-600: #4f46e5; --color-indigo-700: #4338ca; --color-indigo-800: #3730a3; --color-indigo-900: #312e81;
  --color-violet-50: #f5f3ff; --color-violet-100: #ede9fe; --color-violet-200: #ddd6fe; --color-violet-300: #c4b5fd; --color-violet-400: #a78bfa; --color-violet-500: #8b5cf6; --color-violet-600: #7c3aed; --color-violet-700: #6d28d9; --color-violet-800: #5b21b6; --color-violet-900: #4c1d95;
  --color-purple-50: #faf5ff; --color-purple-100: #f3e8ff; --color-purple-200: #e9d5ff; --color-purple-300: #d8b4fe; --color-purple-400: #c084fc; --color-purple-500: #a855f7; --color-purple-600: #9333ea; --color-purple-700: #7e22ce; --color-purple-800: #6b21a8; --color-purple-900: #581c87;
  --color-fuchsia-50: #fdf4ff; --color-fuchsia-100: #fae8ff; --color-fuchsia-200: #f5d0fe; --color-fuchsia-300: #f0abfc; --color-fuchsia-400: #e879f9; --color-fuchsia-500: #d946ef; --color-fuchsia-600: #c026d3; --color-fuchsia-700: #a21caf; --color-fuchsia-800: #86198f; --color-fuchsia-900: #701a75;
  --color-pink-50: #fdf2f8; --color-pink-100: #fce7f3; --color-pink-200: #fbcfe8; --color-pink-300: #f9a8d4; --color-pink-400: #f472b6; --color-pink-500: #ec4899; --color-pink-600: #db2777; --color-pink-700: #be185d; --color-pink-800: #9d174d; --color-pink-900: #831843;
  --color-rose-50: #fff1f2; --color-rose-100: #ffe4e6; --color-rose-200: #fecdd3; --color-rose-300: #fda4af; --color-rose-400: #fb7185; --color-rose-500: #f43f5e; --color-rose-600: #e11d48; --color-rose-700: #be123c; --color-rose-800: #9f1239; --color-rose-900: #881337;
}`;
            
            tempDiv.innerHTML = html;
            tempDiv.appendChild(styleFix);
            document.body.appendChild(tempDiv);
            
            // Show loading state
            const previewContainer = document.getElementById("canvasPreviewContent");
            if (previewContainer) {
                previewContainer.innerHTML = `
                    <div class="preview-loading">
                        <div class="preview-loading-spinner"></div>
                        <p style="margin-top: 16px; color: #6b7280;">Generating preview...</p>
                    </div>
                `;
                
                // Show modal
                modal.classList.remove("hidden");
                
                // Wait for images and resources to load
                await waitForResources(tempDiv);
                
                // Render to canvas with PDF-like quality
                const canvas = await html2canvas(tempDiv, {
                    scale: 2, // High quality
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: "#ffffff",
                    logging: false,
                    windowWidth: tempDiv.scrollWidth,
                    windowHeight: tempDiv.scrollHeight,
                });
                
                // Calculate pages (A4 height in pixels at scale 2)
                const a4HeightPx = 297 * 3.7795275591 * 2; // mm to px at 96 DPI * scale
                const totalPages = Math.ceil(canvas.height / a4HeightPx);
                
                // Clear preview container
                previewContainer.innerHTML = "";
                
                // Split canvas into pages
                for (let page = 0; page < totalPages; page++) {
                    const pageCanvas = document.createElement("canvas");
                    pageCanvas.width = canvas.width;
                    pageCanvas.height = Math.min(
                        a4HeightPx,
                        canvas.height - page * a4HeightPx
                    );
                    pageCanvas.style.width = "210mm";
                    pageCanvas.style.height = "auto";
                    pageCanvas.style.display = "block";
                    pageCanvas.style.margin = "20px auto";
                    pageCanvas.style.boxShadow = "0 0 50px rgba(0, 0, 0, 0.3)";
                    pageCanvas.style.backgroundColor = "white";
                    
                    const ctx = pageCanvas.getContext("2d");
                    ctx.drawImage(
                        canvas,
                        0,
                        page * a4HeightPx,
                        canvas.width,
                        pageCanvas.height,
                        0,
                        0,
                        pageCanvas.width,
                        pageCanvas.height
                    );
                    
                    previewContainer.appendChild(pageCanvas);
                    
                    // Add page number
                    const pageNum = document.createElement("div");
                    pageNum.textContent = `Page ${page + 1} of ${totalPages}`;
                    pageNum.style.textAlign = "center";
                    pageNum.style.color = "#9ca3af";
                    pageNum.style.fontSize = "12px";
                    pageNum.style.margin = "10px 0 30px 0";
                    previewContainer.appendChild(pageNum);
                }
                
                // Store data for download
                window.currentPreviewData = broadSheetData;
                
                // Clean up
                document.body.removeChild(tempDiv);
                
                // Update page count in modal
                const pageCounter = document.getElementById("previewPageCount");
                if (pageCounter) {
                    pageCounter.textContent = `${totalPages} page${
                        totalPages > 1 ? "s" : ""
                    }`;
                }
            } else {
                console.error('Preview container element not found');
                alert('Preview container is not available. Please refresh the page.');
            }
        } catch (error) {
            console.error("Error creating canvas preview:", error);
            showAlert({
                title: "Error",
                message: "Failed to create preview: " + error.message,
                type: "error",
            });
        }
    }
    
    // Generate HTML for broadsheet preview
    function generateBroadSheetHTML(broadSheetData) {
        const { data, metadata } = broadSheetData;
        
        // Get all unique subjects
        const subjects = new Set();
        data.forEach(student => {
            Object.keys(student.subjects).forEach(subject => {
                subjects.add(subject);
            });
        });
        const subjectList = Array.from(subjects).sort();
        
        // Create the HTML structure with comprehensive header
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Broad Sheet - ${metadata.class_name}</title>
            <style>
                @page {
                    size: A4 landscape;
                    margin: 0.4in;
                }
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    background-color: white;
                }

                .header {
                    text-align: center;
                    margin-bottom: 20px;
                    page-break-after: avoid;
                }
                .header h1 {
                    margin: 0;
                    font-size: 24px;
                    font-weight: bold;
                    color: #333;
                    text-transform: uppercase;
                }
                .header p {
                    margin: 5px 0;
                    font-size: 16px;
                    color: #666;
                }
                .school-info {
                    display: flex;
                    justify-content: space-between;
                    margin: 10px 0;
                    font-size: 14px;
                    border-top: 1px solid #333;
                    border-bottom: 1px solid #333;
                    padding: 8px 0;
                }
                .school-info div {
                    flex: 1;
                    text-align: center;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                    font-size: 9px;
                    page-break-inside: auto;
                }
                thead {
                    display: table-header-group;
                }
                tfoot {
                    display: table-footer-group;
                }
                th, td {
                    border: 1px solid #333;
                    padding: 4px;
                    text-align: center;
                    page-break-inside: avoid;
                    vertical-align: middle;
                }
                th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                }
                .subject-header {
                    background-color: #e6e6e6;
                    font-size: 8px;
                }
                .assessment-header {
                    background-color: #d9d9d9;
                    font-size: 8px;
                }
                .student-name {
                    text-align: left;
                    min-width: 120px;
                }
                .footer {
                    margin-top: 30px;
                    text-align: center;
                    font-size: 14px;
                    color: #666;
                    page-break-before: avoid;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>BROAD SHEET</h1>
                <p><strong>School:</strong> ${metadata.school_name || 'N/A'}</p>
                <p><strong>Address:</strong> ${metadata.school_address || 'N/A'}</p>
                <div class="school-info">
                    <div><strong>Class:</strong> ${metadata.class_name}</div>
                    <div><strong>Form Master:</strong> ${metadata.form_master || 'N/A'}</div>
                    <div><strong>Term:</strong> ${metadata.term_name}</div>
                    <div><strong>Session:</strong> ${metadata.academic_session || 'N/A'}</div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>S/N</th>
                        <th class="student-name">Student Name</th>`;
        
        // Create consistent mapping of all assessment types for each subject
        const subjectAssessmentMap = {};
        
        // First, collect all unique assessment types for each subject across all students
        subjectList.forEach(subject => {
            const assessmentTypes = new Set();
            data.forEach(student => {
                if (student.subjects[subject] && student.subjects[subject].scores) {
                    student.subjects[subject].scores.forEach(score => {
                        assessmentTypes.add(score.assessment_type);
                    });
                }
            });
            
            // Create an array with both the assessment type and its formatted name for sorting
            const assessmentDetails = Array.from(assessmentTypes).map(assessmentType => {
                // Try to find the formatted name from the data
                let formattedName = assessmentType;
                for (const student of data) {
                    if (student.subjects[subject] && student.subjects[subject].scores) {
                        const score = student.subjects[subject].scores.find(s => s.assessment_type === assessmentType);
                        if (score && score.formatted_type) {
                            formattedName = score.formatted_type;
                            break;
                        }
                    }
                }
                return { code: assessmentType, formatted: formattedName };
            });
            
            // Sort using assessment type orders from metadata, with CBT first, then by order, with 'total' last
            assessmentDetails.sort((a, b) => {
                const aCode = a.code.toLowerCase();
                const bCode = b.code.toLowerCase();
                
                // Total should always be last
                if (aCode === 'total') return 1;
                if (bCode === 'total') return -1;
                
                // Check if any scores for this assessment type are from CBT
                let isAFromCbt = false;
                let isBFromCbt = false;
                
                // Check if any student has CBT scores for assessment type A
                for (const student of data) {
                    if (student.subjects[subject] && student.subjects[subject].scores) {
                        for (const score of student.subjects[subject].scores) {
                            if (score.assessment_type === a.code && score.is_cbt) {
                                isAFromCbt = true;
                                break;
                            }
                        }
                        if (isAFromCbt) break;
                    }
                }
                
                // Check if any student has CBT scores for assessment type B
                for (const student of data) {
                    if (student.subjects[subject] && student.subjects[subject].scores) {
                        for (const score of student.subjects[subject].scores) {
                            if (score.assessment_type === b.code && score.is_cbt) {
                                isBFromCbt = true;
                                break;
                            }
                        }
                        if (isBFromCbt) break;
                    }
                }
                
                // CBT assessments should come first
                if (isAFromCbt && !isBFromCbt) return -1;
                if (isBFromCbt && !isAFromCbt) return 1;
                
                // Get order values from metadata, default to 999 if not found
                const orderA = metadata.assessment_type_orders && metadata.assessment_type_orders[a.code] !== undefined ? 
                    metadata.assessment_type_orders[a.code] : 999;
                const orderB = metadata.assessment_type_orders && metadata.assessment_type_orders[b.code] !== undefined ? 
                    metadata.assessment_type_orders[b.code] : 999;
                
                // Sort by order value
                return orderA - orderB;
            });
            
            // Extract just the codes for the map
            subjectAssessmentMap[subject] = assessmentDetails.map(detail => detail.code);
        });
        
        // Add subject headers with correct colspan
        subjectList.forEach(subject => {
            const assessmentTypes = subjectAssessmentMap[subject];
            const totalColumns = assessmentTypes.length + 1; // +1 for Total column
            html += `                    <th class="subject-header" colspan="${totalColumns}">${subject}</th>\n`;
        });
        
        html += `                </tr>\n                <tr>`;
        
        // Add empty headers for S/N and Student Name columns in the second row
        // to maintain proper table structure alignment
        html += `                    <th class="assessment-header"></th>\n`;
        html += `                    <th class="assessment-header"></th>\n`;
        
        // Add assessment type headers for each subject
        subjectList.forEach(subject => {
            const assessmentTypes = subjectAssessmentMap[subject];
            console.log('DEBUGGING ASSESSMENT: ', assessmentTypes)
            // Add individual assessment headers with formatted names from data
            assessmentTypes.forEach(assessmentType => {
                // Try to get formatted name from the first subject's data, otherwise format it
                const firstSubjectWithAssessment = Object.values(data).find(s => 
                    s.subjects && 
                    Object.values(s.subjects).some(sub => 
                        sub.scores && 
                        sub.scores.some(score => score.assessment_type === assessmentType)
                    )
                );
                
                let formattedName = assessmentType; // Default to raw name
                if (firstSubjectWithAssessment) {
                    const subjectWithAssessment = Object.values(firstSubjectWithAssessment.subjects).find(sub => 
                        sub.scores && sub.scores.some(score => score.assessment_type === assessmentType)
                    );
                    if (subjectWithAssessment) {
                        const scoreData = subjectWithAssessment.scores.find(score => score.assessment_type === assessmentType);
                        if (scoreData && scoreData.formatted_type) {
                            formattedName = scoreData.formatted_type;
                        }
                    }
                }
                
                // Fallback to our own formatting if no formatted name found in data
                if (formattedName === assessmentType) {
                    formattedName = getFormattedAssessmentName(assessmentType);
                }
                
                html += `                    <th class="assessment-header">${formattedName}</th>\n`;
            });
            
            // Add total header for this subject
            html += `                    <th class="assessment-header">Total</th>\n`;
        });
        
        html += `                </tr>
                </thead>
                <tbody>`;
        
        // Add student rows
        data.forEach((student, index) => {
            html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td class="student-name">${student.student_name}</td>`;
        
            subjectList.forEach(subject => {
                const assessmentTypes = subjectAssessmentMap[subject];
                
                if (student.subjects[subject]) {
                    const subjectData = student.subjects[subject];
                    
                    // Create a lookup for the student's scores by assessment type
                    const scoreLookup = {};
                    if (subjectData.scores && subjectData.scores.length > 0) {
                        subjectData.scores.forEach(score => {
                            scoreLookup[score.assessment_type] = score;
                        });
                    }
                    
                    // Add individual assessment scores in the correct order
                    assessmentTypes.forEach(assessmentType => {
                        if (scoreLookup[assessmentType]) {
                            const score = scoreLookup[assessmentType];
                            let scoreText = `${score.score}`;  // Show only the raw score value
                            // Add CBT indicator if applicable
                            if (score.is_cbt) {
                                scoreText += ' <span class="text-orange-600">(CBT)</span>';
                            }
                            html += `<td>${scoreText}</td>`;
                        } else {
                            // If this student doesn't have this assessment type, show empty
                            html += '<td>-</td>';
                        }
                    });
                    
                    // Add total score for this subject
                    const totalText = `${subjectData.total_score}`;  // Show only the raw total score
                    html += `<td>${totalText}</td>`;
                } else {
                    // If student doesn't have this subject, add empty cells for all assessments + total
                    assessmentTypes.forEach(() => {
                        html += '<td>-</td>';
                    });
                    html += '<td>-</td>'; // Total cell
                }
            });
        
            html += `
                    </tr>`;
        });
        
        html += `
                </tbody>
            </table>
            
            <div class="footer">
                <p>Generated by CBT Mini School System</p>
            </div>
        </body>
        </html>`;
        
        return html;
    }
    
    // Show/hide loading indicator for export buttons only
    function showLoading(show) {
        const exportPdfButton = document.getElementById('export-broad-sheet-pdf');
        const exportExcelButton = document.getElementById('export-broad-sheet-excel');
        
        if (show) {
            if (exportPdfButton) {
                exportPdfButton.disabled = true;
                exportPdfButton.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Exporting PDF...';
            }
            if (exportExcelButton) {
                exportExcelButton.disabled = true;
                exportExcelButton.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Exporting Excel...';
            }
        } else {
            if (exportPdfButton) {
                exportPdfButton.disabled = false;
                exportPdfButton.innerHTML = '<span class="material-symbols-outlined">download</span> PDF';
            }
            if (exportExcelButton) {
                exportExcelButton.disabled = false;
                exportExcelButton.innerHTML = '<span class="material-symbols-outlined">download</span> Excel';
            }
        }
    }

    // Store original button text
    document.querySelectorAll('#export-broad-sheet-pdf, #export-broad-sheet-excel').forEach(button => {
        button.setAttribute('data-original-text', button.innerHTML);
    });
    
    // Add event listeners for exam type checkboxes to handle "All Exams" behavior
    document.getElementById('exam-type-all')?.addEventListener('change', function() {
        const allChecked = this.checked;
        
        if (allChecked) {
            // If "All Exams" is checked, uncheck and disable other boxes
            document.getElementById('exam-type-ca').checked = false;
            document.getElementById('exam-type-exam').checked = false;
            document.getElementById('exam-type-ca').disabled = true;
            document.getElementById('exam-type-exam').disabled = true;
        }
    });
    
    // Add event listeners for individual exam type checkboxes
    document.getElementById('exam-type-ca')?.addEventListener('change', function() {
        if (this.checked) {
            // If any individual exam type is checked, uncheck and enable "All Exams"
            document.getElementById('exam-type-all').checked = false;
            document.getElementById('exam-type-all').disabled = false;
        }
    });
    
    document.getElementById('exam-type-exam')?.addEventListener('change', function() {
        if (this.checked) {
            // If any individual exam type is checked, uncheck and enable "All Exams"
            document.getElementById('exam-type-all').checked = false;
            document.getElementById('exam-type-all').disabled = false;
        }
    });
    
    // Show alert function (assuming modal.js is available)
    window.showAlert = window.showAlert || function(title, message, type = 'info') {
        alert(`${title}: ${message}`);
    };
    
    // Make sure all required functions are available globally
    window.showCanvasBasedPreviewBroadSheet = showCanvasBasedPreviewBroadSheet;
    window.generateBroadSheetHTML = generateBroadSheetHTML;
    
    // Add ESC key listener for broadsheet preview modal
    document.addEventListener('keydown', function(event) {
        if (event.key === "Escape") {
            const modal = document.getElementById("canvasPdfPreviewModal");
            if (modal && !modal.classList.contains('hidden')) {
                if (typeof closeCanvasPreviewModal === 'function') {
                    closeCanvasPreviewModal();
                }
            }
        }
    });
});