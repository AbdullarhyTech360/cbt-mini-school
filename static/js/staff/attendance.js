// Attendance Management JavaScript

let currentClassId = null;
let currentDate = new Date().toISOString().split('T')[0];
let attendanceData = {};
let studentsData = [];
let attendanceMode = 'daily'; // 'daily' or 'bulk'
let hasUnsavedChanges = false;
let editingPastDate = false;

document.addEventListener('DOMContentLoaded', function() {
    // Read term dates from hidden inputs
    const termStart = document.getElementById('termStartDate').value;
    const termEnd = document.getElementById('termEndDate').value;
    const today = new Date().toISOString().split('T')[0];

    // Daily picker: always default to today
    const datePicker = document.getElementById('attendanceDate');
    if (datePicker) {
        datePicker.min = termStart || '';
        // Cap at the earlier of today or term end — never allow past-term dates
        const dailyMax = (termEnd && termEnd < today) ? termEnd : today;
        datePicker.max = dailyMax;
        currentDate = today;
        datePicker.value = today;
        datePicker.addEventListener('change', function() {
            currentDate = this.value;
            if (currentClassId) {
                loadStudents(currentClassId);
            }
        });
    }

    // Bulk picker: default to today
    const bulkStart = document.getElementById('bulkStartDate');
    const bulkEnd = document.getElementById('bulkEndDate');
    const effectiveMax = (termEnd && termEnd < today) ? termEnd : today;
    if (bulkStart) {
        bulkStart.value = today;
        bulkStart.min = termStart || '';
        bulkStart.max = effectiveMax;
        bulkStart.addEventListener('change', recalcBulkDays);
    }
    if (bulkEnd) {
        bulkEnd.value = today;
        bulkEnd.min = termStart || '';
        bulkEnd.max = effectiveMax;
        bulkEnd.addEventListener('change', recalcBulkDays);
    }

    // Class selector change event
    const classSelector = document.getElementById('classSelector');
    if (classSelector) {
        classSelector.addEventListener('change', function() {
            currentClassId = this.value;
            if (currentClassId) {
                loadStudents(currentClassId);
            } else {
                clearStudentsList();
            }
        });
    }

    // Search functionality
    const searchInput = document.getElementById('searchStudent');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterStudents(this.value);
        });
    }

    // Filter by status
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            filterByStatus(this.value);
        });
    }

    // Mark all present button
    const markAllPresentBtn = document.getElementById('markAllPresent');
    if (markAllPresentBtn) {
        markAllPresentBtn.addEventListener('click', () => markAllAs('present'));
    }

    // Load attendance history
    loadAttendanceHistory();

    // History class filter
    const historyFilter = document.getElementById('historyClassFilter');
    if (historyFilter) {
        historyFilter.addEventListener('change', function() {
            loadAttendanceHistory(this.value);
        });
    }
});

// ── Mode Switching ──────────────────────────────────────────────────────────

function switchAttendanceMode(mode) {
    attendanceMode = mode;
    const dailyBtn = document.getElementById('modeDailyBtn');
    const bulkBtn = document.getElementById('modeBulkBtn');
    const dailyDate = document.getElementById('dailyDateSection');
    const bulkDate = document.getElementById('bulkDateSection');
    const dailyFilter = document.getElementById('statusFilter');
    const markAllBtn = document.getElementById('markAllPresent');

    if (mode === 'daily') {
        dailyBtn.className = 'attendance-mode-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 bg-primary text-white shadow-sm';
        bulkBtn.className = 'attendance-mode-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200';
        dailyDate.classList.remove('hidden');
        bulkDate.classList.add('hidden');
        if (dailyFilter) dailyFilter.parentElement.classList.remove('hidden');
        if (markAllBtn) markAllBtn.classList.remove('hidden');
    } else {
        bulkBtn.className = 'attendance-mode-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 bg-primary text-white shadow-sm';
        dailyBtn.className = 'attendance-mode-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200';
        dailyDate.classList.add('hidden');
        bulkDate.classList.remove('hidden');
        if (dailyFilter) dailyFilter.parentElement.classList.add('hidden');
        if (markAllBtn) markAllBtn.classList.add('hidden');
    }

    if (currentClassId) {
        loadStudents(currentClassId);
    }
}

function recalcBulkDays() {
    const start = document.getElementById('bulkStartDate').value;
    const end = document.getElementById('bulkEndDate').value;
    if (!start || !end) {
        document.getElementById('bulkTotalDays').value = 0;
        return 0;
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    let count = 0;
    const d = new Date(startDate);
    while (d <= endDate) {
        if (d.getDay() > 0 && d.getDay() < 6) count++;
        d.setDate(d.getDate() + 1);
    }
    document.getElementById('bulkTotalDays').value = count;
    updateBulkInputLimits(count);
    return count;
}

function updateBulkInputLimits(totalDays) {
    const inputs = document.querySelectorAll('.bulk-days-input');
    inputs.forEach(inp => {
        inp.max = totalDays;
        let val = parseInt(inp.value) || 0;
        if (val > totalDays) val = totalDays;
        if (val < 0) val = 0;
        inp.value = val;

        const row = inp.closest('.student-row');
        if (row) {
            const absent = totalDays - val;
            const rate = totalDays > 0 ? Math.round((val / totalDays) * 100) : 0;
            const absentBadge = row.querySelector('.bulk-absent-val');
            const rateBadge = row.querySelector('.bulk-rate-val');
            if (absentBadge) absentBadge.textContent = absent;
            if (rateBadge) rateBadge.textContent = rate;
        }
    });
    if (inputs.length > 0) updateBulkStats();
}

function onSchoolDaysChange(input) {
    let val = parseInt(input.value) || 0;
    if (val < 0) val = 0;
    input.value = val;
    updateBulkInputLimits(val);
    markUnsaved();
}

function markUnsaved() {
    hasUnsavedChanges = true;
    document.getElementById('floatingSaveBar').classList.remove('hidden');
}

function markSaved() {
    hasUnsavedChanges = false;
    document.getElementById('floatingSaveBar').classList.add('hidden');
}

// Global save dispatcher
function saveAttendanceAction() {
    if (attendanceMode === 'bulk') {
        saveAttendanceBulk();
    } else {
        saveAttendance();
    }
}

// Load students for selected class
async function loadStudents(classId) {
    try {
        const userId = document.getElementById('userId').value;
        const response = await fetch(`/staff/attendance/get_students/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                class_id: classId,
                attendance_date: currentDate
            })
        });

        const data = await response.json();
        
        if (data.success) {
            studentsData = data.students;
            if (attendanceMode === 'bulk') {
                renderStudentsBulk(data.students);
            } else {
                renderStudents(data.students);
            }
            updateStats(data.students);
            
            // Initialize attendance data
            attendanceData = {};
            data.students.forEach(student => {
                attendanceData[student.id] = {
                    student_id: student.id,
                    status: student.status,
                    remarks: student.remarks || ''
                };
            });
            // Show save bar so teacher can save immediately
            hasUnsavedChanges = true;
            document.getElementById('floatingSaveBar').classList.remove('hidden');
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showError('Failed to load students');
    }
}

// Render students list
function renderStudents(students) {
    const container = document.getElementById('studentsContainer');
    if (!container) return;

    if (students.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center text-gray-500 dark:text-gray-400">
                <span class="material-symbols-outlined text-4xl mb-2">groups_off</span>
                <p>No students found in this class</p>
            </div>
        `;
        return;
    }

    const colors = [
        'from-blue-500 to-purple-600',
        'from-pink-500 to-red-600',
        'from-green-500 to-teal-600',
        'from-orange-500 to-red-600',
        'from-indigo-500 to-purple-600',
        'from-yellow-500 to-orange-600',
        'from-cyan-500 to-blue-600',
        'from-rose-500 to-pink-600'
    ];

    container.innerHTML = students.map((student, index) => {
        const colorClass = colors[index % colors.length];
        const status = student.status || 'present';
        const isPresent = status === 'present';
        const isAbsent = status === 'absent';
        const isLate = status === 'late';
        const isExcused = status === 'excused';

        return `
            <div class="p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors student-row" data-student-id="${student.id}">
                <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div class="flex items-center gap-3 md:gap-4">
                        <div class="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center flex-shrink-0">
                            <span class="material-symbols-outlined text-white text-sm md:text-lg">person</span>
                        </div>
                        <div>
                            <p class="font-semibold text-gray-800 dark:text-white text-sm md:text-base">${student.full_name}</p>
                            <p class="text-xs md:text-sm text-gray-600 dark:text-gray-400">${student.email}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 md:gap-3 w-full lg:w-auto justify-center lg:justify-end flex-wrap">
                        <button onclick="markStudent('${student.id}', 'present')" class="attendance-btn flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 ${isPresent ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'} border rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors font-medium text-sm">
                            <span class="material-symbols-outlined text-base md:text-lg">check_circle</span>
                            <span class="hidden sm:inline">Present</span>
                        </button>
                        <button onclick="markStudent('${student.id}', 'absent')" class="attendance-btn flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 ${isAbsent ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'} border rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium text-sm">
                            <span class="material-symbols-outlined text-base md:text-lg">cancel</span>
                            <span class="hidden sm:inline">Absent</span>
                        </button>
                        <button onclick="markStudent('${student.id}', 'late')" class="attendance-btn flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 ${isLate ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'} border rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors font-medium text-sm">
                            <span class="material-symbols-outlined text-base md:text-lg">schedule</span>
                            <span class="hidden sm:inline">Late</span>
                        </button>
                        <span class="status-badge px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(status)}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Render students in bulk mode (number inputs for days present)
function renderStudentsBulk(students) {
    const container = document.getElementById('studentsContainer');
    if (!container) return;

    if (students.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center text-gray-500 dark:text-gray-400">
                <span class="material-symbols-outlined text-4xl mb-2">groups_off</span>
                <p>No students found in this class</p>
            </div>
        `;
        return;
    }

    const totalDays = recalcBulkDays() || 1;

    const colors = [
        'from-blue-500 to-purple-600',
        'from-pink-500 to-red-600',
        'from-green-500 to-teal-600',
        'from-orange-500 to-red-600',
        'from-indigo-500 to-purple-600',
        'from-yellow-500 to-orange-600',
        'from-cyan-500 to-blue-600',
        'from-rose-500 to-pink-600'
    ];

    container.innerHTML = students.map((student, index) => {
        const colorClass = colors[index % colors.length];
        // Use pre-filled days_present if editing a bulk record, otherwise default to totalDays
        const daysPresent = (student.days_present !== undefined && student.days_present !== null)
            ? student.days_present
            : totalDays;

        return `
            <div class="p-3 sm:p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors student-row" data-student-id="${student.id}">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                    <div class="flex items-center gap-2.5 sm:gap-3 md:gap-4">
                        <div class="h-9 w-9 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center flex-shrink-0">
                            <span class="material-symbols-outlined text-white text-sm md:text-lg">person</span>
                        </div>
                        <div class="min-w-0">
                            <p class="font-semibold text-gray-800 dark:text-white text-sm md:text-base truncate">${student.full_name}</p>
                            <p class="text-xs text-gray-600 dark:text-gray-400 truncate">${student.email}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div class="flex items-center gap-1.5 sm:gap-2">
                            <label class="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Present:</label>
                            <input type="number" min="0" max="${totalDays}" value="${daysPresent}"
                                data-student-id="${student.id}"
                                class="bulk-days-input w-14 sm:w-16 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-xs sm:text-sm font-medium text-center focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                                oninput="onBulkDaysChange(this)">
                        </div>
                        <div class="flex items-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs font-medium">
                            <span class="bulk-absent-badge px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">Absent: <span class="bulk-absent-val">${totalDays - daysPresent}</span></span>
                            <span class="bulk-rate-badge px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"><span class="bulk-rate-val">${totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : 0}</span>%</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function onBulkDaysChange(input) {
    const totalDays = recalcBulkDays() || 1;
    let val = parseInt(input.value) || 0;
    if (val < 0) val = 0;
    if (val > totalDays) val = totalDays;
    input.value = val;

    const absent = totalDays - val;
    const rate = totalDays > 0 ? Math.round((val / totalDays) * 100) : 0;

    const row = input.closest('.student-row');
    const absentBadge = row.querySelector('.bulk-absent-val');
    const rateBadge = row.querySelector('.bulk-rate-val');
    if (absentBadge) absentBadge.textContent = absent;
    if (rateBadge) rateBadge.textContent = rate;

    // Update stats from all inputs
    updateBulkStats();
    markUnsaved();
}

function updateBulkStats() {
    const inputs = document.querySelectorAll('.bulk-days-input');
    const totalDays = parseInt(document.getElementById('bulkTotalDays').value) || 1;
    let totalPresent = 0;
    let totalStudents = inputs.length;

    inputs.forEach(inp => {
        totalPresent += parseInt(inp.value) || 0;
    });

    const avgPresent = totalStudents > 0 ? Math.round(totalPresent / totalStudents) : 0;
    const avgAbsent = totalDays - avgPresent;
    const avgRate = totalDays > 0 ? Math.round((avgPresent / totalDays) * 100) : 0;

    document.getElementById('presentCount').textContent = avgPresent;
    document.getElementById('absentCount').textContent = avgAbsent;
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('attendanceRate').textContent = avgRate + '%';
}
function markStudent(studentId, status) {
    if (!attendanceData[studentId]) {
        attendanceData[studentId] = { student_id: studentId };
    }
    attendanceData[studentId].status = status;
    
    // Update UI
    const studentRow = document.querySelector(`[data-student-id="${studentId}"]`);
    if (studentRow) {
        const buttons = studentRow.querySelectorAll('.attendance-btn');
        buttons.forEach(btn => {
            btn.classList.remove('bg-green-100', 'dark:bg-green-900/30', 'text-green-700', 'dark:text-green-300', 'border-green-300', 'dark:border-green-600');
            btn.classList.remove('bg-red-100', 'dark:bg-red-900/30', 'text-red-700', 'dark:text-red-300', 'border-red-300', 'dark:border-red-600');
            btn.classList.remove('bg-yellow-100', 'dark:bg-yellow-900/30', 'text-yellow-700', 'dark:text-yellow-300', 'border-yellow-300', 'dark:border-yellow-600');
            btn.classList.add('bg-gray-100', 'dark:bg-gray-700', 'text-gray-600', 'dark:text-gray-300', 'border-gray-300', 'dark:border-gray-600');
        });
        
        // Highlight selected button
        const selectedBtn = Array.from(buttons).find(btn => btn.textContent.toLowerCase().includes(status));
        if (selectedBtn) {
            selectedBtn.classList.remove('bg-gray-100', 'dark:bg-gray-700', 'text-gray-600', 'dark:text-gray-300', 'border-gray-300', 'dark:border-gray-600');
            if (status === 'present') {
                selectedBtn.classList.add('bg-green-100', 'dark:bg-green-900/30', 'text-green-700', 'dark:text-green-300', 'border-green-300', 'dark:border-green-600');
            } else if (status === 'absent') {
                selectedBtn.classList.add('bg-red-100', 'dark:bg-red-900/30', 'text-red-700', 'dark:text-red-300', 'border-red-300', 'dark:border-red-600');
            } else if (status === 'late') {
                selectedBtn.classList.add('bg-yellow-100', 'dark:bg-yellow-900/30', 'text-yellow-700', 'dark:text-yellow-300', 'border-yellow-300', 'dark:border-yellow-600');
            }
        }
        
        // Update status badge
        const badge = studentRow.querySelector('.status-badge');
        if (badge) {
            badge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
            badge.className = `status-badge px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(status)}`;
        }
    }
    
    // Update stats
    updateStats(Object.values(attendanceData).map(att => ({ status: att.status })));
    markUnsaved();
}

// Mark all students with a specific status
function markAllAs(status) {
    Object.keys(attendanceData).forEach(studentId => {
        markStudent(studentId, status);
    });
    showSuccess(`All students marked as ${status}`);
}

// Get status badge class
function getStatusBadgeClass(status) {
    switch(status) {
        case 'present':
            return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
        case 'absent':
            return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
        case 'late':
            return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
        case 'excused':
            return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
        default:
            return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
    }
}

// Update statistics
function updateStats(students) {
    const present = students.filter(s => s.status === 'present').length;
    const absent = students.filter(s => s.status === 'absent').length;
    const late = students.filter(s => s.status === 'late').length;
    const total = students.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    document.getElementById('presentCount').textContent = present;
    document.getElementById('absentCount').textContent = absent;
    document.getElementById('totalStudents').textContent = total;
    document.getElementById('attendanceRate').textContent = `${rate}%`;
}

// Save attendance (daily mode)
async function saveAttendance() {
    if (!currentClassId) {
        showError('Please select a class first');
        return;
    }

    try {
        showSaving();
        
        const userId = document.getElementById('userId').value;
        const attendanceRecords = Object.values(attendanceData);

        const response = await fetch(`/staff/attendance/mark/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                class_id: currentClassId,
                attendance_date: currentDate,
                attendance_records: attendanceRecords,
                is_editing: editingPastDate
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showSuccess(data.message);
            markSaved();
            loadAttendanceHistory();
            if (editingPastDate) closeEditSession();
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error saving attendance:', error);
        showError('Failed to save attendance');
    } finally {
        hideSaving();
    }
}

// Save attendance (bulk mode)
async function saveAttendanceBulk() {
    if (!currentClassId) {
        showError('Please select a class first');
        return;
    }

    const startDate = document.getElementById('bulkStartDate').value;
    const endDate = document.getElementById('bulkEndDate').value;
    if (!startDate || !endDate) {
        showError('Please select a date range');
        return;
    }

    const totalDays = recalcBulkDays();
    if (totalDays === 0) {
        showError('No school days in the selected range');
        return;
    }

    const inputs = document.querySelectorAll('.bulk-days-input');
    const records = Array.from(inputs).map(inp => ({
        student_id: inp.dataset.studentId,
        days_present: parseInt(inp.value) || 0
    }));

    try {
        showSaving();
        const userId = document.getElementById('userId').value;

        const response = await fetch(`/staff/attendance/mark-bulk/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                class_id: currentClassId,
                start_date: startDate,
                end_date: endDate,
                records: records
            })
        });

        const data = await response.json();
        if (data.success) {
            showSuccess(data.message);
            markSaved();
            loadAttendanceHistory();
            if (editingPastDate) closeEditSession();
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error saving bulk attendance:', error);
        showError('Failed to save attendance');
    } finally {
        hideSaving();
    }
}

// Filter students by search term
function filterStudents(searchTerm) {
    const rows = document.querySelectorAll('.student-row');
    const term = searchTerm.toLowerCase();
    
    rows.forEach(row => {
        const name = row.querySelector('.font-semibold').textContent.toLowerCase();
        const email = row.querySelector('.text-xs').textContent.toLowerCase();
        
        if (name.includes(term) || email.includes(term)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Filter by status
function filterByStatus(status) {
    const rows = document.querySelectorAll('.student-row');
    
    rows.forEach(row => {
        if (status === 'all') {
            row.style.display = '';
        } else {
            const badge = row.querySelector('.status-badge');
            const studentStatus = badge.textContent.toLowerCase();
            
            if (studentStatus === status.toLowerCase()) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

// Load attendance history
async function loadAttendanceHistory(classId) {
    try {
        const userId = document.getElementById('userId').value;
        let url = `/staff/attendance/history/${userId}`;
        if (classId) url += `?class_id=${classId}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.history.length > 0) {
            renderAttendanceHistory(data.history);
        } else {
            const container = document.getElementById('attendanceHistory');
            if (container) {
                container.innerHTML = `
                    <div class="p-8 text-center text-gray-500 dark:text-gray-400">
                        <span class="material-symbols-outlined text-4xl mb-2">history</span>
                        <p>No attendance history available</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading attendance history:', error);
    }
}

// Render attendance history
function renderAttendanceHistory(history) {
    const container = document.getElementById('attendanceHistory');
    if (!container) return;

    const colors = [
        'from-green-500 to-green-600',
        'from-blue-500 to-blue-600',
        'from-purple-500 to-purple-600',
        'from-orange-500 to-orange-600'
    ];

    container.innerHTML = history.map((record, index) => {
        const colorClass = colors[index % colors.length];
        const isBulk = record.source === 'bulk';
        const sourceBadge = isBulk
            ? '<span class="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase tracking-wide">Bulk</span>'
            : '<span class="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wide">Daily</span>';

        // Date line: bulk shows range, daily shows single date
        let dateLine;
        if (isBulk && record.end_date_formatted) {
            dateLine = `${record.date_formatted} &ndash; ${record.end_date_formatted} &middot; ${record.present_count}/${record.total_marked} present`;
        } else {
            const daysAgo = getDaysAgo(record.date);
            dateLine = `${record.date_formatted} &middot; ${daysAgo} &middot; ${record.present_count}/${record.total_marked} present`;
        }

        // Edit/delete: bulk deletes the whole range, daily deletes single date
        const editOnclick = isBulk
            ? `loadHistoryForEdit('${record.class_id}', '${record.date}', 'bulk', '${record.end_date}')`
            : `loadHistoryForEdit('${record.class_id}', '${record.date}', 'daily', null)`;
        const deleteLabel = isBulk
            ? `'${record.class_id}', '${record.date}', '${record.class_name}', '${record.date_formatted} – ${record.end_date_formatted}'`
            : `'${record.class_id}', '${record.date}', '${record.class_name}', '${record.date_formatted}'`;
        
        return `
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 md:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
                <div class="flex items-center gap-3">
                    <div class="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center flex-shrink-0">
                        <span class="material-symbols-outlined text-white text-sm md:text-lg">${isBulk ? 'date_range' : 'event'}</span>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <p class="font-semibold text-gray-800 dark:text-white text-sm md:text-base">${record.class_name}</p>
                            ${sourceBadge}
                        </div>
                        <p class="text-xs md:text-sm text-gray-600 dark:text-gray-400">${dateLine}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">${record.attendance_rate}%</span>
                    <button onclick="${editOnclick}" class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <span class="material-symbols-outlined text-base">edit</span>
                        Edit
                    </button>
                    <button onclick="deleteAttendanceRecord(${deleteLabel})" class="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <span class="material-symbols-outlined text-base">delete</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Load a past attendance record for editing (daily or bulk mode)
async function loadHistoryForEdit(classId, date, source, endDate) {
    editingPastDate = true;

    // Set class selector
    const classSelector = document.getElementById('classSelector');
    if (classSelector) {
        classSelector.value = classId;
        currentClassId = classId;
    }

    if (source === 'bulk' && endDate) {
        // ─── BULK EDIT: switch to bulk mode, populate date range ───
        switchAttendanceMode('bulk');

        const bulkStartDate = document.getElementById('bulkStartDate');
        const bulkEndDate = document.getElementById('bulkEndDate');
        if (bulkStartDate) bulkStartDate.value = date;
        if (bulkEndDate) bulkEndDate.value = endDate;

        // Recalculate school days from the date range
        recalcBulkDays();

        // Show editing banner
        const banner = document.getElementById('editingBanner');
        const bannerText = document.getElementById('editingBannerText');
        if (banner && bannerText) {
            const fmtStart = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const fmtEnd = new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            bannerText.textContent = `Editing bulk attendance: ${fmtStart} – ${fmtEnd}`;
            banner.classList.remove('hidden');
        }

        // Show close button in floating bar
        const closeBtn = document.getElementById('closeEditBtn');
        if (closeBtn) closeBtn.classList.remove('hidden');

        // Fetch students with aggregated days_present via the new endpoint
        if (currentClassId) {
            try {
                const userId = document.getElementById('userId').value;
                const resp = await fetch(`/staff/attendance/get_bulk_students/${currentClassId}?start_date=${date}&end_date=${endDate}`);
                const data = await resp.json();
                if (data.success) {
                    studentsData = data.students;
                    renderStudentsBulk(data.students);  // uses student.days_present
                    updateBulkStats();
                    // Show save bar
                    hasUnsavedChanges = true;
                    document.getElementById('floatingSaveBar').classList.remove('hidden');
                    // Scroll to form
                    const form = document.getElementById('studentsContainer');
                    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    showError(data.message);
                }
            } catch (err) {
                console.error('Error loading bulk students:', err);
                showError('Failed to load students');
            }
        }
    } else {
        // ─── DAILY EDIT: original behavior ───
        switchAttendanceMode('daily');

        const datePicker = document.getElementById('attendanceDate');
        if (datePicker) {
            datePicker.value = date;
            currentDate = date;
        }

        // Show editing banner
        const banner = document.getElementById('editingBanner');
        const bannerText = document.getElementById('editingBannerText');
        if (banner && bannerText) {
            const formatted = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            bannerText.textContent = `Editing attendance for ${formatted}`;
            banner.classList.remove('hidden');
        }

        const closeBtn = document.getElementById('closeEditBtn');
        if (closeBtn) closeBtn.classList.remove('hidden');

        if (currentClassId) {
            await loadStudents(currentClassId);
            const form = document.getElementById('studentsContainer');
            if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

// Close the edit session and reset to normal state
function closeEditSession() {
    editingPastDate = false;

    // Hide editing banner
    const banner = document.getElementById('editingBanner');
    if (banner) banner.classList.add('hidden');

    // Hide close button
    const closeBtn = document.getElementById('closeEditBtn');
    if (closeBtn) closeBtn.classList.add('hidden');

    // Reset to daily mode
    switchAttendanceMode('daily');

    // Reset daily date picker to today
    const today = new Date().toISOString().split('T00:00:00')[0];
    const datePicker = document.getElementById('attendanceDate');
    if (datePicker) {
        datePicker.value = today;
        currentDate = today;
    }

    // Reset bulk date fields to today
    const bulkStartDate = document.getElementById('bulkStartDate');
    const bulkEndDate = document.getElementById('bulkEndDate');
    const bulkTotalDays = document.getElementById('bulkTotalDays');
    if (bulkStartDate) bulkStartDate.value = today;
    if (bulkEndDate) bulkEndDate.value = today;
    if (bulkTotalDays) bulkTotalDays.value = 0;

    // Clear class selection
    const classSelector = document.getElementById('classSelector');
    if (classSelector) {
        classSelector.value = '';
        currentClassId = null;
    }

    // Clear students list
    clearStudentsList();

    // Hide floating save bar
    document.getElementById('floatingSaveBar').classList.add('hidden');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Delete attendance records for a single class+date
function deleteAttendanceRecord(classId, date, className, dateFormatted) {
    showConfirmModal({
        title: 'Delete Attendance',
        message: `Are you sure you want to delete all attendance records for <strong>${className}</strong> on <strong>${dateFormatted}</strong>? This cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmClass: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200',
        onConfirm: async function() {
            try {
                const userId = document.getElementById('userId').value;
                const response = await fetch(`/staff/attendance/delete/${userId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        class_id: classId,
                        attendance_date: date,
                        scope: 'date'
                    })
                });
                const data = await response.json();
                if (data.success) {
                    showSuccess(data.message);
                    loadAttendanceHistory(document.getElementById('historyClassFilter')?.value || '');
                } else {
                    showError(data.message);
                }
            } catch (error) {
                console.error('Error deleting attendance:', error);
                showError('Failed to delete attendance');
            }
        }
    });
}

// Reset ALL attendance records for the selected class
function resetAllAttendance() {
    const classFilter = document.getElementById('historyClassFilter');
    const classId = classFilter ? classFilter.value : '';
    const className = classId
        ? classFilter.options[classFilter.selectedIndex].text
        : 'ALL classes';

    showConfirmModal({
        title: 'Reset Attendance',
        message: `Are you sure you want to delete <strong>ALL</strong> attendance records for <strong>${className}</strong>? This will permanently remove all saved attendance and cannot be undone.`,
        confirmText: 'Reset All',
        cancelText: 'Cancel',
        confirmClass: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200',
        onConfirm: async function() {
            try {
                const userId = document.getElementById('userId').value;
                const response = await fetch(`/staff/attendance/delete/${userId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        class_id: classId || null,
                        scope: 'all'
                    })
                });
                const data = await response.json();
                if (data.success) {
                    showSuccess(data.message);
                    loadAttendanceHistory('');
                    if (classFilter) classFilter.value = '';
                } else {
                    showError(data.message);
                }
            } catch (error) {
                console.error('Error resetting attendance:', error);
                showError('Failed to reset attendance');
            }
        }
    });
}

// Get days ago text
function getDaysAgo(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
}

// Clear students list
function clearStudentsList() {
    const container = document.getElementById('studentsContainer');
    if (container) {
        container.innerHTML = `
            <div class="p-8 text-center text-gray-500 dark:text-gray-400">
                <span class="material-symbols-outlined text-4xl mb-2">school</span>
                <p>Please select a class to view students</p>
            </div>
        `;
    }
    updateStats([]);
}

// UI Helper functions
function showSaving() {
    const bar = document.getElementById('floatingSaveBar');
    const status = document.getElementById('floatingSaveStatus');
    if (status) status.textContent = 'Saving...';
    bar.classList.remove('hidden');
}

function hideSaving() {
    const status = document.getElementById('floatingSaveStatus');
    if (status) status.textContent = 'Unsaved changes';
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) { alert(message); return; }
    if (!message) return;
    const toast = document.createElement('div');
    const config = {
        success: { bg: '#059669', border: '#047857', icon: 'check_circle' },
        error:   { bg: '#dc2626', border: '#b91c1c', icon: 'error' },
        warning: { bg: '#d97706', border: '#b45309', icon: 'warning' },
        info:    { bg: '#2563eb', border: '#1d4ed8', icon: 'info' }
    };
    const c = config[type] || config.info;
    toast.style.cssText = `pointer-events:auto;display:flex;align-items:center;gap:12px;padding:14px 20px;border-radius:12px;border:2px solid ${c.border};background:${c.bg};color:#fff;box-shadow:0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1);font-size:14px;font-weight:600;transform:translateX(110%);opacity:0;transition:all .3s ease;`;
    toast.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px">${c.icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });
    });
    setTimeout(() => {
        toast.style.transform = 'translateX(110%)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function showSuccess(message) {
    showToast(message, 'success');
}

function showError(message) {
    showToast(message, 'error');
}
