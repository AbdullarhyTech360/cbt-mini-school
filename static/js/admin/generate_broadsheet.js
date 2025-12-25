document.addEventListener('DOMContentLoaded', function () {
    // Tab switching functionality
    const generateReportTab = document.getElementById('generate-report-tab');
    const broadSheetTab = document.getElementById('broad-sheet-tab');
    const generateReportSection = document.getElementById('generate-report-section');
    const broadSheetSection = document.getElementById('broad-sheet-section');

    // Set initial active tab state
    if (generateReportTab) {
        generateReportTab.classList.remove('text-gray-600', 'dark:text-gray-300', 'hover:text-gray-800', 'dark:hover:text-gray-200', 'hover:bg-gray-200', 'dark:hover:bg-gray-700/50');
        generateReportTab.classList.add('bg-white', 'dark:bg-gray-700', 'text-primary', 'shadow-sm');
    }

    if (broadSheetTab) {
        broadSheetTab.classList.remove('bg-white', 'dark:bg-gray-700', 'text-primary', 'shadow-sm');
        broadSheetTab.classList.add('text-gray-600', 'dark:text-gray-300', 'hover:text-gray-800', 'dark:hover:text-gray-200', 'hover:bg-gray-200', 'dark:hover:bg-gray-700/50');
    }

    // Handle tab switching
    document.querySelectorAll('.report-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            // Remove active class from all tabs
            document.querySelectorAll('.report-tab').forEach(t => {
                t.classList.remove('bg-white', 'dark:bg-gray-700', 'text-primary', 'shadow-sm');
                t.classList.add('text-gray-600', 'dark:text-gray-300', 'hover:text-gray-800', 'dark:hover:text-gray-200', 'hover:bg-gray-200', 'dark:hover:bg-gray-700/50');
            });

            // Add active class to clicked tab
            this.classList.remove('text-gray-600', 'dark:text-gray-300', 'hover:text-gray-800', 'dark:hover:text-gray-200', 'hover:bg-gray-200', 'dark:hover:bg-gray-700/50');
            this.classList.add('bg-white', 'dark:bg-gray-700', 'text-primary', 'shadow-sm');

            // Show/hide sections
            if (this.id === 'generate-report-tab') {
                generateReportSection.classList.remove('hidden');
                broadSheetSection.classList.add('hidden');
            } else if (this.id === 'broad-sheet-tab') {
                generateReportSection.classList.add('hidden');
                broadSheetSection.classList.remove('hidden');
                
                // Load classes and terms when broad sheet tab is clicked
                loadClassesForBroadSheet();
                loadTermsForBroadSheet();
            }
        });
    });

    // Load classes for the broad sheet dropdown
    async function loadClassesForBroadSheet() {
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
    async function loadTermsForBroadSheet() {
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

    // Load broad sheet data when button is clicked
    document.getElementById('load-broad-sheet')?.addEventListener('click', async function() {
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
        
        const showExams = document.getElementById('show-exams').checked;
        const showTotals = document.getElementById('show-totals').checked;

        if (!classId || !termId) {
            showAlert('Validation Error', 'Please select both class and term', 'warning');
            return;
        }

        try {
            showLoading(true);
            
            const response = await fetch('/reports/api/broad-sheet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    class_room_id: classId,
                    term_id: termId,
                    exam_type: examType
                })
            });

            const data = await response.json();

            if (data.success) {
                displayBroadSheet(data.data, data.metadata, showExams, showTotals);
            } else {
                showAlert('Error', data.error || 'Failed to load broad sheet data', 'error');
            }
        } catch (error) {
            console.error('Error loading broad sheet:', error);
            showAlert('Error', 'Failed to load broad sheet data', 'error');
        } finally {
            showLoading(false);
        }
    });

    // Export broad sheet as PDF
    document.getElementById('export-broad-sheet-pdf')?.addEventListener('click', async function() {
        await exportBroadSheet('pdf');
    });

    // Export broad sheet as Excel
    document.getElementById('export-broad-sheet-excel')?.addEventListener('click', async function() {
        await exportBroadSheet('excel');
    });

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
        
        const showExams = document.getElementById('show-exams').checked;
        const showTotals = document.getElementById('show-totals').checked;

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

        // Create header row
        let headerHTML = '<tr>';
        headerHTML += '<th class="py-3 px-4 font-semibold">S/N</th>';
        headerHTML += '<th class="py-3 px-4 font-semibold">Admission No.</th>';
        headerHTML += '<th class="py-3 px-4 font-semibold">Student Name</th>';

        subjectList.forEach(subject => {
            headerHTML += `<th class="py-3 px-4 font-semibold">${subject}</th>`;
        });

        headerHTML += '</tr>';
        header.innerHTML = headerHTML;

        // Create body rows
        let bodyHTML = '';
        data.forEach((student, index) => {
            bodyHTML += '<tr class="text-gray-700 dark:text-gray-300">';
            bodyHTML += `<td class="py-3 px-4">${index + 1}</td>`;
            bodyHTML += `<td class="py-3 px-4">${student.admission_number || ''}</td>`;
            bodyHTML += `<td class="py-3 px-4">${student.student_name}</td>`;

            subjectList.forEach(subject => {
                if (student.subjects[subject]) {
                    const subjectData = student.subjects[subject];
                    let scoreText = '';

                    if (showExams && subjectData.scores && subjectData.scores.length > 0) {
                        // Show individual exam scores
                        scoreText = subjectData.scores.map(score => 
                            `${score.assessment_type}: ${score.score}/${score.max_score} (${score.percentage}%)`
                        ).join('<br>');
                    }

                    if (showTotals) {
                        // Add total score if showing totals
                        const totalText = `Total: ${subjectData.total_score}/${subjectData.max_possible} (${subjectData.percentage}%)`;
                        scoreText = scoreText ? `${scoreText}<br>${totalText}` : totalText;
                    }

                    bodyHTML += `<td class="py-3 px-4 text-center">${scoreText}</td>`;
                } else {
                    bodyHTML += '<td class="py-3 px-4 text-center">-</td>';
                }
            });

            bodyHTML += '</tr>';
        });

        body.innerHTML = bodyHTML;

        // Show the results section
        document.getElementById('broad-sheet-results').classList.remove('hidden');
    }

    // Show/hide loading indicator
    function showLoading(show) {
        const loadButton = document.getElementById('load-broad-sheet');
        const exportPdfButton = document.getElementById('export-broad-sheet-pdf');
        const exportExcelButton = document.getElementById('export-broad-sheet-excel');
        
        if (show) {
            if (loadButton) {
                loadButton.disabled = true;
                loadButton.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Loading...';
            }
            if (exportPdfButton) {
                exportPdfButton.disabled = true;
                exportPdfButton.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Exporting PDF...';
            }
            if (exportExcelButton) {
                exportExcelButton.disabled = true;
                exportExcelButton.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Exporting Excel...';
            }
        } else {
            if (loadButton) {
                loadButton.disabled = false;
                loadButton.innerHTML = '<span class="material-symbols-outlined">summarize</span> Load Broad Sheet';
            }
            if (exportPdfButton) {
                exportPdfButton.disabled = false;
                exportPdfButton.innerHTML = '<span class="material-symbols-outlined">download</span> Export as PDF';
            }
            if (exportExcelButton) {
                exportExcelButton.disabled = false;
                exportExcelButton.innerHTML = '<span class="material-symbols-outlined">download</span> Export as Excel';
            }
        }
    }

    // Store original button text
    document.querySelectorAll('#load-broad-sheet, #export-broad-sheet-pdf, #export-broad-sheet-excel').forEach(button => {
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
});