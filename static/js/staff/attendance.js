// Attendance Management JavaScript

let currentClassId = null;
let currentDate = new Date().toISOString().split('T')[0];
let attendanceData = {};
let studentsData = [];

document.addEventListener('DOMContentLoaded', function() {
    // Initialize date picker with today's date
    const datePicker = document.getElementById('attendanceDate');
    if (datePicker) {
        datePicker.value = currentDate;
        datePicker.addEventListener('change', function() {
            currentDate = this.value;
            if (currentClassId) {
                loadStudents(currentClassId);
            }
        });
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

    // Save attendance button
    const saveBtn = document.getElementById('saveAttendanceBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAttendance);
    }

    // Submit attendance button
    const submitBtn = document.getElementById('submitAttendanceBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitAttendance);
    }

    // Reset button
    const resetBtn = document.getElementById('resetAttendanceBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetAttendance);
    }

    // Mark all present button
    const markAllPresentBtn = document.getElementById('markAllPresent');
    if (markAllPresentBtn) {
        markAllPresentBtn.addEventListener('click', () => markAllAs('present'));
    }

    // Mark all absent button
    const markAllAbsentBtn = document.getElementById('markAllAbsent');
    if (markAllAbsentBtn) {
        markAllAbsentBtn.addEventListener('click', () => markAllAs('absent'));
    }

    // Load attendance history
    loadAttendanceHistory();
});

// Load students for selected class
async function loadStudents(classId) {
    try {
        showLoading();
        
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
            renderStudents(data.students);
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
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showError('Failed to load students');
    } finally {
        hideLoading();
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

// Mark individual student
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

// Save attendance
async function saveAttendance() {
    if (!currentClassId) {
        showError('Please select a class first');
        return;
    }

    try {
        showLoading();
        
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
                attendance_records: attendanceRecords
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showSuccess(data.message);
            loadAttendanceHistory();
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error saving attendance:', error);
        showError('Failed to save attendance');
    } finally {
        hideLoading();
    }
}

// Submit attendance (same as save for now)
async function submitAttendance() {
    await saveAttendance();
}

// Reset attendance
function resetAttendance() {
    if (confirm('Are you sure you want to reset all attendance marks?')) {
        studentsData.forEach(student => {
            markStudent(student.id, 'present');
        });
        showSuccess('Attendance reset to all present');
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
async function loadAttendanceHistory() {
    try {
        const userId = document.getElementById('userId').value;
        const response = await fetch(`/staff/attendance/history/${userId}`);
        const data = await response.json();
        
        if (data.success && data.history.length > 0) {
            renderAttendanceHistory(data.history);
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
        const daysAgo = getDaysAgo(record.date);
        
        return `
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 md:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
                <div class="flex items-center gap-3">
                    <div class="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center flex-shrink-0">
                        <span class="material-symbols-outlined text-white text-sm md:text-lg">event</span>
                    </div>
                    <div>
                        <p class="font-semibold text-gray-800 dark:text-white text-sm md:text-base">${record.class_name}</p>
                        <p class="text-xs md:text-sm text-gray-600 dark:text-gray-400">${daysAgo} • ${record.present_count}/${record.total_marked} students present</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">${record.attendance_rate}%</span>
                    <span class="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Rate</span>
                </div>
            </div>
        `;
    }).join('');
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
function showLoading() {
    const btn = document.getElementById('saveAttendanceBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Loading...';
    }
}

function hideLoading() {
    const btn = document.getElementById('saveAttendanceBtn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined">save</span> Save Attendance';
    }
}

function showSuccess(message) {
    // You can implement a toast notification here
    alert(message);
}

function showError(message) {
    // You can implement a toast notification here
    alert('Error: ' + message);
}
