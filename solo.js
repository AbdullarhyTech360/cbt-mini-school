/**
 * STABLE VERSION: Single-Page Report Generator
 * Fixes: Blank PDF, Syntax Errors, and Image Rendering
 */

let currentStudents = [];
let currentFilters = {};
let currentReportData = null;

document.addEventListener('DOMContentLoaded', () => {
    loadTerms();
    loadClasses();
    loadConfigs();
    
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeCanvasPreviewModal();
        }
    });
});

// --- API LOADING FUNCTIONS ---

async function loadTerms() {
    const select = document.getElementById('termFilter');
    if (!select) return;
    select.innerHTML = '<option value="">Loading...</option>';
    select.disabled = true;

    try {
        const response = await fetch('/reports/api/terms');
        const data = await response.json();

        if (data.success && data.terms.length > 0) {
            select.innerHTML = '<option value="">Select Term</option>';
            data.terms.forEach(term => {
                const option = document.createElement('option');
                option.value = term.term_id;
                option.textContent = `${term.term_name} - ${term.academic_session}`;
                if (term.is_current) {
                    option.textContent += ' (Current)';
                    option.selected = true;
                }
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option value="">No terms found</option>';
        }
    } catch (error) {
        console.error('Error loading terms:', error);
        select.innerHTML = '<option value="">Error</option>';
    } finally {
        select.disabled = false;
    }
}

async function loadClasses() {
    const select = document.getElementById('classFilter');
    if (!select) return;
    select.innerHTML = '<option value="">Loading...</option>';
    select.disabled = true;

    try {
        const response = await fetch('/reports/api/classes');
        const data = await response.json();

        if (data.success && data.classes.length > 0) {
            select.innerHTML = '<option value="">Select Class</option>';
            data.classes.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.class_room_id;
                option.textContent = cls.class_name;
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option value="">No classes found</option>';
        }
    } catch (error) {
        console.error('Error loading classes:', error);
    } finally {
        select.disabled = false;
    }
}

async function loadConfigs() {
    const select = document.getElementById('configFilter');
    if (!select) return;
    try {
        const response = await fetch('/reports/api/configs');
        const data = await response.json();
        if (data.success) {
            select.innerHTML = '<option value="">Default</option>';
            data.configs.forEach(config => {
                const option = document.createElement('option');
                option.value = config.config_id;
                option.textContent = config.config_name;
                select.appendChild(option);
            });
        }
    } catch (e) { console.error(e); }
}

// --- UI HELPERS ---

function showNotification(message, type = 'info') {
    const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showGlobalLoading(message = 'Processing...') {
    let overlay = document.getElementById('global-loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-loading-overlay';
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        overlay.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-xl p-6 flex flex-col items-center shadow-2xl">
                <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p class="text-gray-700 dark:text-gray-300 font-medium">${message}</p>
            </div>`;
        document.body.appendChild(overlay);
    } else {
        overlay.querySelector('p').textContent = message;
        overlay.classList.remove('hidden');
    }
}

function hideGlobalLoading() {
    const overlay = document.getElementById('global-loading-overlay');
    if (overlay) overlay.classList.add('hidden');
}

function showAlert(config) {
    alert(config.message);
}

// --- STUDENT MANAGEMENT ---

async function loadStudents() {
    const termId = document.getElementById('termFilter').value;
    const classId = document.getElementById('classFilter').value;
    if (!termId || !classId) {
        alert('Please select both term and class');
        return;
    }

    showGlobalLoading('Loading students...');
    currentFilters = { term_id: termId, class_room_id: classId, config_id: document.getElementById('configFilter').value || null };

    try {
        const response = await fetch(`/reports/api/students?class_id=${classId}`);
        const data = await response.json();
        if (data.success) {
            currentStudents = data.students;
            renderStudentsTable(currentStudents);
        }
    } catch (error) {
        console.error(error);
    } finally {
        hideGlobalLoading();
    }
}

function renderStudentsTable(students) {
    const container = document.getElementById('studentsList');
    if (students.length === 0) {
        container.innerHTML = '<p class="text-center py-8">No students found</p>';
        return;
    }
    container.innerHTML = `
        <div class="mb-4">
            <input type="text" id="studentSearch" placeholder="Search students..." class="w-full px-4 py-2 border rounded-lg" onkeyup="filterStudents()">
        </div>
        <table class="w-full">
            <thead>
                <tr class="bg-gray-50 text-left">
                    <th class="p-3">Student</th>
                    <th class="p-3">Adm No.</th>
                    <th class="p-3 text-center">Actions</th>
                </tr>
            </thead>
            <tbody id="studentsTableBody">
                ${students.map(student => `
                    <tr class="student-row border-t" data-name="${student.first_name} ${student.last_name}" data-admission="${student.admission_number || ''}">
                        <td class="p-3">${student.first_name} ${student.last_name}</td>
                        <td class="p-3">${student.admission_number || 'N/A'}</td>
                        <td class="p-3 flex justify-center gap-2">
                            <button onclick="previewReport('${student.id}')" class="px-3 py-1 bg-blue-500 text-white rounded">Preview</button>
                            <button onclick="downloadReport('${student.id}')" class="px-3 py-1 bg-green-500 text-white rounded">Download</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
}

function filterStudents() {
    const term = document.getElementById('studentSearch').value.toLowerCase();
    document.querySelectorAll('.student-row').forEach(row => {
        const name = row.getAttribute('data-name').toLowerCase();
        row.style.display = name.includes(term) ? '' : 'none';
    });
}

// --- THE FIX: ROBUST PDF GENERATION ---

async function loadHtml2Canvas() {
    if (typeof html2canvas !== 'undefined') return;
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = resolve;
        document.head.appendChild(script);
    });
}

async function loadJsPDF() {
    if (typeof window.jspdf !== 'undefined') return;
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve;
        document.head.appendChild(script);
    });
}

function waitForResources(element) {
    return new Promise((resolve) => {
        const images = element.getElementsByTagName('img');
        if (images.length === 0) return resolve();
        let loaded = 0;
        const check = () => { if (++loaded === images.length) resolve(); };
        Array.from(images).forEach(img => {
            if (img.complete) check();
            else { img.onload = check; img.onerror = check; }
        });
        setTimeout(resolve, 3000); // Max wait
    });
}

/**
 * NEW FIXED DOWNLOAD LOGIC
 * Uses the Canvas capture method (same as preview) to prevent blank pages
 */
async function generateClientSidePDF(reportData) {
    try {
        showGlobalLoading('Generating PDF document...');
        
        // 1. Ensure dependencies are loaded
        await loadHtml2Canvas();
        await loadJsPDF();

        // 2. Render the HTML content off-screen
        const html = generateReportHTML(reportData);
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '210mm'; // Standard A4 width
        container.style.backgroundColor = 'white';
        container.innerHTML = html;
        document.body.appendChild(container);

        // 3. Wait for logo and photos to load
        await waitForResources(container);
        
        // 4. Capture using Canvas (the same method that works in your preview)
        const canvas = await html2canvas(container, {
            scale: 2, // High resolution
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        // 5. Convert Canvas to PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const canvasAspect = canvas.height / canvas.width;
        const pdfHeight = pdfWidth * canvasAspect;
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Report_${reportData.student.name.replace(/\s+/g, '_')}.pdf`);

        // 6. Cleanup
        document.body.removeChild(container);
        hideGlobalLoading();
        
    } catch (error) {
        console.error('PDF Error:', error);
        hideGlobalLoading();
        alert('PDF Generation failed. Please try again.');
    }
}

// --- PREVIEW SYSTEM ---

async function previewReport(studentId) {
    showGlobalLoading('Preparing preview...');
    try {
        const params = new URLSearchParams({ ...currentFilters });
        const response = await fetch(`/reports/api/student-report/${studentId}?${params}`);
        const data = await response.json();
        if (data.success) {
            await showCanvasBasedPreview(data.report);
        }
    } catch (e) { console.error(e); }
    finally { hideGlobalLoading(); }
}

async function showCanvasBasedPreview(reportData) {
    await loadHtml2Canvas();
    let modal = document.getElementById('canvasPdfPreviewModal');
    if (!modal) modal = createCanvasPreviewModal();
    
    const html = generateReportHTML(reportData);
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '210mm';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.innerHTML = html;
    document.body.appendChild(tempDiv);
    
    const previewContainer = document.getElementById('canvasPreviewContent');
    previewContainer.innerHTML = '<p class="text-white text-center p-10">Rendering...</p>';
    modal.classList.remove('hidden');
    
    await waitForResources(tempDiv);
    const canvas = await html2canvas(tempDiv, { scale: 1.5, useCORS: true });
    
    previewContainer.innerHTML = '';
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';
    canvas.style.margin = '0 auto';
    canvas.style.display = 'block';
    canvas.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
    previewContainer.appendChild(canvas);
    
    window.currentPreviewData = reportData;
    document.body.removeChild(tempDiv);
}

function createCanvasPreviewModal() {
    const modal = document.createElement('div');
    modal.id = 'canvasPdfPreviewModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-80 z-50 hidden flex flex-col';
    modal.innerHTML = `
        <div class="p-4 bg-gray-800 text-white flex justify-between items-center">
            <h3 class="font-bold">Report Preview</h3>
            <div class="flex gap-2">
                <button onclick="downloadFromPreview()" class="bg-green-600 px-4 py-1 rounded">Download PDF</button>
                <button onclick="closeCanvasPreviewModal()" class="bg-red-600 px-4 py-1 rounded">Close</button>
            </div>
        </div>
        <div id="canvasPreviewContent" class="flex-1 overflow-auto p-4 bg-gray-900"></div>`;
    document.body.appendChild(modal);
    return modal;
}

function closeCanvasPreviewModal() {
    document.getElementById('canvasPdfPreviewModal').classList.add('hidden');
}

async function downloadFromPreview() {
    if (window.currentPreviewData) {
        await generateClientSidePDF(window.currentPreviewData);
    }
}

async function downloadReport(studentId) {
    showGlobalLoading('Fetching report data...');
    try {
        const params = new URLSearchParams({ ...currentFilters });
        const response = await fetch(`/reports/api/student-report/${studentId}?${params}`);
        const data = await response.json();
        if (data.success) {
            await generateClientSidePDF(data.report);
        }
    } catch (e) { console.error(e); }
    finally { hideGlobalLoading(); }
}

// --- REPORT HTML GENERATOR ---

function generateReportHTML(reportData) {
    const { student, school, term, assessment_types, scores, position, total_students, overall_total, overall_max } = reportData;
    
    const teacherComment = reportData.teacher_comment || student.teacher_remarks || "Satisfactory progress.";
    const principalComment = reportData.principal_comment || student.principal_remarks || "A good result.";
    const overallPercentage = overall_max > 0 ? (overall_total / overall_max * 100) : 0;
    const overallGrade = getSimpleGrade(overallPercentage);

    const assessments = assessment_types
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(at => at.code);

    let rows = Object.values(scores).map((sub, idx) => {
        const perc = sub.max_total > 0 ? (sub.total / sub.max_total * 100) : 0;
        const grade = getSimpleGrade(perc);
        return `
            <tr>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: left; font-weight: bold;">${sub.subject_name}</td>
                ${assessments.map(code => `<td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${Math.round(sub.assessments[code]?.score || 0)}</td>`).join('')}
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">${Math.round(sub.total)}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold; color: ${getGradeColor(grade)};">${grade}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-size: 10px;">${getRemark(grade)}</td>
            </tr>`;
    }).join('');

    return `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.4;">
        <div style="display: flex; align-items: center; border-bottom: 3px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 20px;">
            <img src="${school.logo ? '/static/' + school.logo : '/static/uploads/school_logos/default_logo.png'}" 
                 style="width: 80px; height: 80px; object-fit: contain;" 
                 onerror="this.src='https://via.placeholder.com/80?text=LOGO'">
            <div style="margin-left: 20px; flex-grow: 1;">
                <h1 style="margin: 0; color: #1e3a8a; text-transform: uppercase; font-size: 24px;">${school.name}</h1>
                <p style="margin: 2px 0; font-size: 12px; color: #666;">${school.address || ''}</p>
                <h3 style="margin: 5px 0 0 0; color: #d97706;">TERM REPORT: ${term.name} - ${term.session}</h3>
            </div>
        </div>

        <div style="display: flex; background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
            <img src="${student.profile_picture ? '/static/' + student.profile_picture : '/static/uploads/profile_images/default_photo.png'}" 
                 style="width: 100px; height: 100px; border-radius: 5px; object-fit: cover; border: 2px solid #fff;"
                 onerror="this.src='https://via.placeholder.com/100?text=PHOTO'">
            <div style="margin-left: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; flex-grow: 1;">
                <div><small style="color: #64748b; font-size: 10px;">NAME</small><div style="font-weight: bold;">${student.name}</div></div>
                <div><small style="color: #64748b; font-size: 10px;">ADMISSION NO</small><div style="font-weight: bold;">${student.admission_number || 'N/A'}</div></div>
                <div><small style="color: #64748b; font-size: 10px;">CLASS</small><div style="font-weight: bold;">${student.class_name}</div></div>
                <div><small style="color: #64748b; font-size: 10px;">POSITION</small><div style="font-weight: bold;">${formatPosition(position)} of ${total_students}</div></div>
            </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
            <thead style="background: #1e3a8a; color: white;">
                <tr>
                    <th style="padding: 8px; border: 1px solid #1e3a8a; width: 30px;">#</th>
                    <th style="padding: 8px; border: 1px solid #1e3a8a; text-align: left;">SUBJECT</th>
                    ${assessments.map(a => `<th style="padding: 8px; border: 1px solid #1e3a8a;">${a.toUpperCase()}</th>`).join('')}
                    <th style="padding: 8px; border: 1px solid #1e3a8a;">TOTAL</th>
                    <th style="padding: 8px; border: 1px solid #1e3a8a;">GRADE</th>
                    <th style="padding: 8px; border: 1px solid #1e3a8a;">REMARK</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>

        <div style="display: flex; justify-content: space-between; background: #1e3a8a; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <div style="text-align: center;">TOTAL: ${Math.round(overall_total)}/${overall_max}</div>
            <div style="text-align: center;">AVERAGE: ${overallPercentage.toFixed(1)}%</div>
            <div style="text-align: center;">GRADE: ${overallGrade}</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px;">
                <div style="font-size: 10px; font-weight: bold; color: #1e3a8a; margin-bottom: 5px;">CLASS TEACHER'S REMARK</div>
                <div style="font-style: italic; font-size: 12px;">"${teacherComment}"</div>
            </div>
            <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px;">
                <div style="font-size: 10px; font-weight: bold; color: #1e3a8a; margin-bottom: 5px;">PRINCIPAL'S REMARK</div>
                <div style="font-style: italic; font-size: 12px;">"${principalComment}"</div>
            </div>
        </div>
    </div>`;
}

// --- HELPERS ---

function formatPosition(pos) {
    if (!pos) return 'N/A';
    const s = ["th", "st", "nd", "rd"], v = pos % 100;
    return pos + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getSimpleGrade(p) {
    if (p >= 70) return 'A'; if (p >= 60) return 'B';
    if (p >= 50) return 'C'; if (p >= 40) return 'D';
    return 'F';
}

function getRemark(g) {
    const r = { 'A': 'Excellent', 'B': 'Very Good', 'C': 'Good', 'D': 'Pass', 'F': 'Fail' };
    return r[g] || 'N/A';
}

function getGradeColor(g) {
    const c = { 'A': '#059669', 'B': '#2563eb', 'C': '#d97706', 'D': '#ea580c', 'F': '#dc2626' };
    return c[g] || '#333';
}