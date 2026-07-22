document.addEventListener('DOMContentLoaded', function () {
    // ============================
    // Teacher table search
    // ============================
    const tableRows = document.querySelectorAll('tbody tr');
    document.getElementById('searchInput')?.addEventListener('input', function (e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        tableRows.forEach(row => {
            const rowText = row.textContent.toLowerCase();
            row.style.display = rowText.includes(searchTerm) ? '' : 'none';
        });
    });

    // ============================
    // Assignment Matrix
    // ============================
    const teacherSelect = document.getElementById('matrixTeacherSelect');
    const placeholder = document.getElementById('matrixPlaceholder');
    const loading = document.getElementById('matrixLoading');
    const container = document.getElementById('matrixContainer');
    const matrixHead = document.getElementById('matrixHead');
    const matrixBody = document.getElementById('matrixBody');
    const submitBtn = document.getElementById('matrixSubmitBtn');
    const counter = document.getElementById('matrixCounter');
    const selectAllBtn = document.getElementById('matrixSelectAll');
    const clearAllBtn = document.getElementById('matrixClearAll');

    let matrixData = null; // { classes, subjects, class_subject_map, existing_assignments, all_assignments }
    let currentTeacherId = null;

    // Helper: build a Set key for a subject-class pair
    function pairKey(subjectId, classId) {
        return `${subjectId}::${classId}`;
    }

    // Update the selection counter
    function updateCounter() {
        if (!matrixData) return;
        const checked = matrixBody.querySelectorAll('input.matrix-cb:checked').length;
        counter.textContent = `${checked} assignment${checked !== 1 ? 's' : ''} selected`;
        submitBtn.disabled = checked === 0;
    }

    // Build and render the matrix table
    function renderMatrix(data) {
        matrixData = data;
        const { classes, subjects, class_subject_map, existing_assignments, all_assignments } = data;

        // Build a Set of current teacher's existing assignments for quick lookup
        const existingSet = new Set(
            existing_assignments.map(a => pairKey(a.subject_id, a.class_room_id))
        );

        // Build a map of ALL assignments: pairKey → [{ teacher_id, teacher_name }, ...]
        const allAssignMap = {};
        (all_assignments || []).forEach(a => {
            const key = pairKey(a.subject_id, a.class_room_id);
            if (!allAssignMap[key]) allAssignMap[key] = [];
            // Avoid duplicates
            if (!allAssignMap[key].some(e => e.teacher_id === a.teacher_id)) {
                allAssignMap[key].push({ teacher_id: a.teacher_id, teacher_name: a.teacher_name });
            }
        });

        // --- Build thead ---
        matrixHead.innerHTML = '';
        const headerRow = document.createElement('tr');

        // Subject column header
        const thSubject = document.createElement('th');
        thSubject.className = 'px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider';
        thSubject.textContent = 'Subject';
        headerRow.appendChild(thSubject);

        // One column per class
        classes.forEach(cls => {
            const th = document.createElement('th');
            th.className = 'px-3 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider';
            th.innerHTML = `
                <div class="flex flex-col items-center gap-1">
                    <span>${cls.class_room_name}</span>
                    <label class="inline-flex items-center gap-1 cursor-pointer text-[10px] font-normal normal-case text-primary hover:text-primary/80 transition-colors" title="Select all in this class">
                        <input type="checkbox" class="col-select-all h-3 w-3 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary" data-class-id="${cls.class_room_id}">
                        all
                    </label>
                </div>
            `;
            headerRow.appendChild(th);
        });

        // Row select-all header
        const thRowAll = document.createElement('th');
        thRowAll.className = 'px-3 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider';
        thRowAll.textContent = 'Row';
        headerRow.appendChild(thRowAll);

        matrixHead.appendChild(headerRow);

        // --- Build tbody ---
        matrixBody.innerHTML = '';

        subjects.forEach(subject => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors';

            // Subject name cell
            const tdName = document.createElement('td');
            tdName.className = 'px-4 py-3 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap';
            tdName.textContent = subject.subject_name;
            tr.appendChild(tdName);

            let rowEnabledCount = 0;
            let rowNonAmberCount = 0;

            // One cell per class
            classes.forEach(cls => {
                const td = document.createElement('td');
                td.className = 'px-3 py-3 text-center';

                const offered = class_subject_map[cls.class_room_id] &&
                                class_subject_map[cls.class_room_id].includes(subject.subject_id);

                if (offered) {
                    const key = pairKey(subject.subject_id, cls.class_room_id);
                    const isChecked = existingSet.has(key);

                    // Find other teachers assigned to this subject-class (not the current teacher)
                    const otherTeachers = (allAssignMap[key] || []).filter(e => e.teacher_id !== currentTeacherId);
                    const hasConflict = otherTeachers.length > 0;

                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.dataset.subjectId = subject.subject_id;
                    cb.dataset.classId = cls.class_room_id;
                    cb.dataset.subjectName = subject.subject_name;
                    cb.dataset.className = cls.class_room_name;
                    cb.checked = isChecked;
                    if (isChecked) rowEnabledCount++;

                    if (hasConflict) {
                        // Assigned to another teacher — amber warning style
                        const conflictNames = otherTeachers.map(t => t.teacher_name).join(', ');
                        cb.className = 'matrix-cb matrix-cb-amber h-4 w-4 rounded border-amber-400 dark:border-amber-500 text-amber-500 focus:ring-amber-400 cursor-pointer';
                        cb.title = `Already assigned to ${conflictNames}`;
                        cb.dataset.conflictNames = conflictNames;
                        // Wrap in a small container to hold the warning dot
                        const wrapper = document.createElement('div');
                        wrapper.className = 'inline-flex items-center justify-center';
                        wrapper.appendChild(cb);
                        const dot = document.createElement('span');
                        dot.className = 'block w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-500 ml-0.5 shrink-0';
                        dot.title = `Assigned to ${conflictNames}`;
                        wrapper.appendChild(dot);
                        td.appendChild(wrapper);
                    } else {
                        cb.className = 'matrix-cb h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary cursor-pointer';
                        rowNonAmberCount++;
                        td.appendChild(cb);
                    }

                    cb.addEventListener('change', function () {
                        if (this.checked && this.classList.contains('matrix-cb-amber') && this.dataset.conflictNames) {
                            // Show confirmation dialog for reassignment
                            const subjectName = this.dataset.subjectName;
                            const className = this.dataset.className;
                            const names = this.dataset.conflictNames;
                            const checkboxRef = this;

                            window.showConfirmModal({
                                title: 'Reassign Subject?',
                                message: `<strong>${subjectName}</strong> in <strong>${className}</strong> is currently assigned to <strong>${names}</strong>.<br><br>Assigning it to this teacher will remove it from ${names}. Do you want to proceed?`,
                                confirmText: 'Yes, Reassign',
                                cancelText: 'No, Keep Current',
                                onConfirm: () => {
                                    // Keep it checked
                                    updateCounter();
                                    updateRowSelectAll(subject.subject_id);
                                },
                                onCancel: () => {
                                    // Uncheck it
                                    checkboxRef.checked = false;
                                    updateCounter();
                                    updateRowSelectAll(subject.subject_id);
                                }
                            });
                        } else {
                            updateCounter();
                            updateRowSelectAll(subject.subject_id);
                        }
                    });
                } else {
                    // Not offered — show a dash
                    const dash = document.createElement('span');
                    dash.className = 'text-gray-300 dark:text-gray-600 text-lg';
                    dash.textContent = '\u2014';
                    td.appendChild(dash);
                }

                tr.appendChild(td);
            });

            // Row select-all checkbox
            const tdRowAll = document.createElement('td');
            tdRowAll.className = 'px-3 py-3 text-center';
            const rowCb = document.createElement('input');
            rowCb.type = 'checkbox';
            rowCb.className = 'row-select-all h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary cursor-pointer';
            rowCb.dataset.subjectId = subject.subject_id;
            rowCb.title = 'Select all classes for this subject';

            // Determine initial state (only non-amber cells)
            rowCb.checked = rowNonAmberCount > 0 && rowEnabledCount === rowNonAmberCount;
            rowCb.indeterminate = rowEnabledCount > 0 && rowEnabledCount < rowNonAmberCount;

            rowCb.addEventListener('change', () => {
                const checked = rowCb.checked;
                // Only affect non-amber cells (amber cells require individual confirmation)
                matrixBody.querySelectorAll(`input.matrix-cb[data-subject-id="${subject.subject_id}"]:not(.matrix-cb-amber)`).forEach(cb => {
                    cb.checked = checked;
                });
                updateCounter();
            });

            tdRowAll.appendChild(rowCb);
            tr.appendChild(tdRowAll);

            matrixBody.appendChild(tr);
        });

        // Column select-all handlers
        matrixHead.querySelectorAll('.col-select-all').forEach(colCb => {
            colCb.addEventListener('change', () => {
                const classId = colCb.dataset.classId;
                const checked = colCb.checked;
                // Only affect non-amber cells (amber cells require individual confirmation)
                matrixBody.querySelectorAll(`input.matrix-cb[data-class-id="${classId}"]:not(.matrix-cb-amber)`).forEach(cb => {
                    cb.checked = checked;
                });
                updateCounter();
                updateAllRowSelectAlls();
            });
        });

        updateCounter();
    }

    // Update a specific row's select-all checkbox state
    function updateRowSelectAll(subjectId) {
        if (!matrixData) return;
        const cbs = matrixBody.querySelectorAll(`input.matrix-cb[data-subject-id="${subjectId}"]:not(.matrix-cb-amber)`);
        if (cbs.length === 0) return;
        const checkedCount = Array.from(cbs).filter(cb => cb.checked).length;
        const rowCb = matrixBody.querySelector(`input.row-select-all[data-subject-id="${subjectId}"]`);
        if (rowCb) {
            rowCb.checked = checkedCount === cbs.length;
            rowCb.indeterminate = checkedCount > 0 && checkedCount < cbs.length;
        }
    }

    // Refresh all row select-all checkboxes
    function updateAllRowSelectAlls() {
        if (!matrixData) return;
        matrixData.subjects.forEach(subject => {
            updateRowSelectAll(subject.subject_id);
        });
    }

    // Teacher selection → load matrix
    if (teacherSelect) {
        teacherSelect.addEventListener('change', function () {
            const teacherId = this.value;
            if (!teacherId) return;
            currentTeacherId = teacherId;

            // Show loading
            placeholder.classList.add('hidden');
            container.classList.add('hidden');
            loading.classList.remove('hidden');
            submitBtn.disabled = true;

            fetch('/admin/teacher_assignments_matrix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teacher_id: teacherId })
            })
                .then(res => res.json())
                .then(data => {
                    loading.classList.add('hidden');
                    if (data.success) {
                        renderMatrix(data);
                        container.classList.remove('hidden');
                    } else {
                        window.showAlert({
                            title: 'Error',
                            message: data.message || 'Failed to load assignment matrix',
                            type: 'error',
                            confirmText: 'OK'
                        });
                        placeholder.classList.remove('hidden');
                    }
                })
                .catch(err => {
                    loading.classList.add('hidden');
                    placeholder.classList.remove('hidden');
                    console.error('Matrix load error:', err);
                    window.showAlert({
                        title: 'Network Error',
                        message: 'Failed to load assignment matrix',
                        type: 'error',
                        confirmText: 'Close'
                    });
                });
        });
    }

    // Select All / Clear All buttons
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            // Only check non-amber (non-conflict) cells
            matrixBody.querySelectorAll('input.matrix-cb:not(.matrix-cb-amber)').forEach(cb => { cb.checked = true; });
            updateAllRowSelectAlls();
            updateCounter();
        });
    }

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            matrixBody.querySelectorAll('input.matrix-cb').forEach(cb => { cb.checked = false; });
            matrixHead.querySelectorAll('.col-select-all').forEach(cb => { cb.checked = false; });
            updateAllRowSelectAlls();
            updateCounter();
        });
    }

    // Submit batch assignment
    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const teacherId = teacherSelect.value;
            if (!teacherId) {
                window.showAlert({
                    title: 'Validation Error',
                    message: 'Please select a teacher',
                    type: 'error',
                    confirmText: 'OK'
                });
                return;
            }

            const checked = matrixBody.querySelectorAll('input.matrix-cb:checked');
            if (checked.length === 0) {
                window.showAlert({
                    title: 'Validation Error',
                    message: 'Please select at least one subject-class assignment',
                    type: 'error',
                    confirmText: 'OK'
                });
                return;
            }

            const assignments = Array.from(checked).map(cb => ({
                subject_id: cb.dataset.subjectId,
                class_room_id: cb.dataset.classId
            }));

            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            fetch('/admin/assign_subjects_batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teacher_id: teacherId, assignments })
            })
                .then(res => res.json())
                .then(result => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Save Assignments';
                    if (result.success || result.assigned_count > 0) {
                        window.showAlert({
                            title: 'Assignment Successful',
                            message: result.message || 'Assignments saved successfully.',
                            type: 'success',
                            confirmText: 'OK',
                            onConfirm: () => {
                                closeModal('assignModal');
                                location.reload();
                            }
                        });
                    } else {
                        window.showAlert({
                            title: 'Assignment',
                            message: result.message || 'No new assignments were made.',
                            type: 'info',
                            confirmText: 'OK'
                        });
                    }
                })
                .catch(err => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Save Assignments';
                    console.error('Batch assign error:', err);
                    window.showAlert({
                        title: 'Network Error',
                        message: 'An error occurred while saving assignments',
                        type: 'error',
                        confirmText: 'Close'
                    });
                });
        });
    }

    // Expose reset function for modal close cleanup
    window._resetAssignMatrix = function () {
        matrixData = null;
        currentTeacherId = null;
        if (matrixHead) matrixHead.innerHTML = '';
        if (matrixBody) matrixBody.innerHTML = '';
    };
});
