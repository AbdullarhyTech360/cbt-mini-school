/**
 * On-The-Go Tests Admin — CRUD, tab switching, results modal.
 * Expects modal.js loaded first (showAlert, showConfirmModal).
 */
document.addEventListener('DOMContentLoaded', function () {
  // ─── Guards ──────────────────────────────────────────────────────────
  if (typeof window.showAlert === 'undefined' || typeof window.showConfirmModal === 'undefined') {
    console.error('on_the_go_tests.js: modal.js must be loaded first');
    return;
  }

  // ─── State ───────────────────────────────────────────────────────────
  let currentTab = 'active';
  let allTests = [];
  let editingTestId = null;
  let createMaxScoreManuallySet = false;
  let editMaxScoreManuallySet = false;

  // ─── DOM refs ────────────────────────────────────────────────────────
  const createCard = document.getElementById('createCard');
  const toggleCreateBtn = document.getElementById('toggleCreateCard');
  const collapseCreateBtn = document.getElementById('collapseCreateCard');
  const cancelCreateBtn = document.getElementById('cancelCreate');
  const createForm = document.getElementById('createOtgForm');
  const createBtn = document.getElementById('createOtgBtn');

  const activeTabBtn = document.getElementById('activeTab');
  const historyTabBtn = document.getElementById('historyTab');
  const activeSection = document.getElementById('activeSection');
  const historySection = document.getElementById('historySection');
  const activeList = document.getElementById('activeList');
  const historyList = document.getElementById('historyList');
  const activeEmpty = document.getElementById('activeEmpty');
  const historyEmpty = document.getElementById('historyEmpty');

  const statsActive = document.getElementById('activeCount');
  const statsToday = document.getElementById('takenToday');
  const statsTotal = document.getElementById('totalCreated');

  const resultsModalTitle = document.getElementById('resultsModalTitle');
  const resultsModalContent = document.getElementById('resultsModalContent');

  // Form fields
  const otgSubject = document.getElementById('otgSubject');
  const otgClass = document.getElementById('otgClass');
  const otgQuestionCount = document.getElementById('otgQuestionCount');
  const otgMaxQuestionsHint = document.getElementById('otgMaxQuestions');
  const otgQuestionWarning = document.getElementById('otgQuestionWarning');
  const advancedToggle = document.getElementById('toggleAdvanced');
  const advancedOptions = document.getElementById('advancedOptions');
  const advancedIcon = document.getElementById('advancedIcon');

  // Edit card refs
  const editCard = document.getElementById('editCard');
  const collapseEditBtn = document.getElementById('collapseEditCard');
  const cancelEditBtn = document.getElementById('cancelEdit');
  const editForm = document.getElementById('editOtgForm');
  const saveEditBtn = document.getElementById('saveEditBtn');
  const editTitle = document.getElementById('editTitle');
  const editSubject = document.getElementById('editSubject');
  const editClass = document.getElementById('editClass');
  const editDurationHours = document.getElementById('editDurationHours');
  const editDurationMinutes = document.getElementById('editDurationMinutes');
  const editQuestionCount = document.getElementById('editQuestionCount');
  const editMaxScore = document.getElementById('editMaxScore');
  const editMaxQuestionsHint = document.getElementById('editMaxQuestions');
  const editQuestionWarning = document.getElementById('editQuestionWarning');
  const toggleEditAdvanced = document.getElementById('toggleEditAdvanced');
  const editAdvancedOptions = document.getElementById('editAdvancedOptions');
  const editAdvancedIcon = document.getElementById('editAdvancedIcon');
  const editSaveAfterCompletion = document.getElementById('editSaveAfterCompletion');
  const editShowFeedback = document.getElementById('editShowFeedback');
  const editCalculatorEnabled = document.getElementById('editCalculatorEnabled');
  const editAccessCode = document.getElementById('editAccessCode');
  const editDescription = document.getElementById('editDescription');

  // ─── Modal helpers (reuse from exams if not present) ─────────────────
  if (typeof window.openModal === 'undefined') {
    window.openModal = function (id) {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('hidden'); el.classList.add('flex'); document.body.style.overflow = 'hidden'; }
    };
    window.closeModal = function (id) {
      const el = document.getElementById(id);
      if (el) { el.classList.add('hidden'); el.classList.remove('flex'); document.body.style.overflow = ''; }
    };
  }

  // ─── Utilities ──────────────────────────────────────────────────────
  function formatDuration(seconds) {
    if (!seconds) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return (h > 0 ? h + 'h ' : '') + (m > 0 ? m + 'm' : '') || '—';
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = (new Date() - new Date(dateStr)) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  }

  // ─── API calls ───────────────────────────────────────────────────────
  async function fetchTests(status) {
    const url = '/api/admin/on-the-go-tests?status=' + (status || 'all');
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) return data.tests;
    throw new Error(data.message || 'Failed to load tests');
  }

  async function fetchSubjects() {
    const res = await fetch('/api/admin/on-the-go-tests/subjects');
    const data = await res.json();
    if (data.success) return data.subjects;
    throw new Error(data.message || 'Failed to load subjects');
  }

  async function fetchClasses(subjectId) {
    const res = await fetch('/api/admin/on-the-go-tests/classes-by-subject/' + subjectId);
    const data = await res.json();
    if (data.success) return data.classes;
    return [];
  }

  async function fetchQuestionCount(subjectId, classRoomId) {
    let url = '/api/admin/on-the-go-tests/question-count?subject_id=' + subjectId;
    if (classRoomId) url += '&class_room_id=' + classRoomId;
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) return data.question_count;
    return 0;
  }

  async function createTest(payload) {
    const res = await fetch('/api/admin/on-the-go-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  async function updateTest(testId, payload) {
    const res = await fetch('/api/admin/on-the-go-tests/' + testId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  async function deleteTest(testId, mode) {
    const res = await fetch('/api/admin/on-the-go-tests/' + testId, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delete_questions: mode })
    });
    return res.json();
  }

  async function fetchDeletePreview(testId) {
    const res = await fetch('/api/admin/on-the-go-tests/' + testId + '/delete-preview');
    return res.json();
  }

  async function toggleActive(testId) {
    const res = await fetch('/api/admin/on-the-go-tests/' + testId + '/toggle-active', { method: 'POST' });
    return res.json();
  }

  async function finishTest(testId) {
    const res = await fetch('/api/admin/on-the-go-tests/' + testId + '/finish', { method: 'POST' });
    return res.json();
  }

  async function fetchResults(testId) {
    const res = await fetch('/api/admin/on-the-go-tests/' + testId + '/results');
    return res.json();
  }

  // ─── Render helpers ──────────────────────────────────────────────────
  function renderTestCard(test) {
    const totalQ = test.number_of_questions || 'All';
    const createdAgo = timeAgo(test.created_at);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'flex items-center gap-2';

    // Status badge + toggle
    if (!test.is_finished) {
      const toggleLabel = document.createElement('label');
      toggleLabel.className = 'relative inline-flex items-center cursor-pointer mr-2';
      toggleLabel.innerHTML = `
        <input type="checkbox" class="sr-only peer toggle-otg-active" data-test-id="${test.id}" ${test.is_active ? 'checked' : ''}>
        <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-green-500"></div>
      `;
      btnGroup.appendChild(toggleLabel);

      // Finish button
      const finishBtn = document.createElement('button');
      finishBtn.className = 'px-3 py-1.5 text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50 rounded-lg transition-colors finish-otg-btn inline-flex items-center gap-1';
      finishBtn.title = 'Mark as finished';
      finishBtn.dataset.testId = test.id;
      finishBtn.dataset.testTitle = test.title;
      finishBtn.innerHTML = '<span class="material-symbols-outlined text-sm">flag</span> Finish';
      btnGroup.appendChild(finishBtn);
    } else {
      const badge = document.createElement('span');
      badge.className = 'px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
      badge.textContent = 'Finished';
      btnGroup.appendChild(badge);
    }

    // View Results button
    const resultsBtn = document.createElement('button');
    resultsBtn.className = 'px-3 py-1.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg transition-colors view-otg-results-btn inline-flex items-center gap-1';
    resultsBtn.title = 'View results';
    resultsBtn.dataset.testId = test.id;
    resultsBtn.dataset.testTitle = test.title;
    resultsBtn.innerHTML = '<span class="material-symbols-outlined text-sm">analytics</span> Results';
    btnGroup.appendChild(resultsBtn);

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'p-2 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors edit-otg-btn';
    editBtn.title = 'Edit test';
    editBtn.dataset.testId = test.id;
    editBtn.innerHTML = '<span class="material-symbols-outlined text-lg">edit</span>';
    btnGroup.appendChild(editBtn);

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors delete-otg-btn';
    delBtn.title = 'Delete test';
    delBtn.dataset.testId = test.id;
    delBtn.dataset.testTitle = test.title;
    delBtn.innerHTML = '<span class="material-symbols-outlined text-lg">delete</span>';
    btnGroup.appendChild(delBtn);

    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow duration-200';
    card.innerHTML = `
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center flex-shrink-0">
            <span class="material-symbols-outlined text-white text-lg">bolt</span>
          </div>
          <div>
            <h3 class="font-bold text-gray-900 dark:text-white">${escHtml(test.title)}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              ${test.subject_name || 'N/A'}${test.class_room_name ? ' · ' + test.class_room_name : ' · All Classes'}
            </p>
          </div>
        </div>
        <div class="flex flex-col items-end gap-1">
          ${test.is_finished
            ? '<span class="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">Finished</span>'
            : test.is_active
              ? '<span class="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">Active</span>'
              : '<span class="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">Paused</span>'
          }
          <span class="text-xs text-gray-500 dark:text-gray-400">${createdAgo}</span>
        </div>
      </div>
      <div class="grid grid-cols-4 gap-4 text-sm mb-4">
        <div>
          <p class="text-gray-500 dark:text-gray-400 text-xs">Duration</p>
          <p class="font-semibold text-gray-900 dark:text-white">${formatDuration(test.duration)}</p>
        </div>
        <div>
          <p class="text-gray-500 dark:text-gray-400 text-xs">Questions</p>
          <p class="font-semibold text-gray-900 dark:text-white">${totalQ}</p>
        </div>
        <div>
          <p class="text-gray-500 dark:text-gray-400 text-xs">Max Score</p>
          <p class="font-semibold text-gray-900 dark:text-white">${test.max_score ?? '—'}</p>
        </div>
        <div>
          <p class="text-gray-500 dark:text-gray-400 text-xs">Submissions</p>
          <p class="font-semibold text-gray-900 dark:text-white">${test.total_submissions || 0}</p>
        </div>
      </div>
      <div class="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          ${test.access_code_required ? '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">lock</span> Code required</span>' : ''}
          ${test.calculator_enabled ? '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">calculate</span> Calculator</span>' : ''}
          ${test.show_feedback ? '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">feedback</span> Feedback</span>' : ''}
        </div>
      </div>
    `;

    // Append button group after the card
    const cardActions = card.querySelector('.flex.items-center.justify-between');
    if (cardActions) {
      const actionsWrapper = document.createElement('div');
      actionsWrapper.className = 'flex items-center gap-2';
      while (btnGroup.firstChild) actionsWrapper.appendChild(btnGroup.firstChild);
      cardActions.appendChild(actionsWrapper);
    }

    return card;
  }

  function escHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Load & render ───────────────────────────────────────────────────
  async function loadTests() {
    try {
      const tests = await fetchTests('all');
      allTests = tests;

      const active = tests.filter(t => !t.is_finished);
      const history = tests.filter(t => t.is_finished);

      // Stats
      statsActive.textContent = active.length;
      statsTotal.textContent = tests.length;
      const takenToday = tests.reduce((sum, t) => {
        return sum + (t.taken_today || 0);
      }, 0);
      statsToday.textContent = takenToday;

      // Render active — wrap each card in try/catch so one bad render
      // doesn't silently kill every subsequent card (fix: "third card shows no test")
      if (active.length === 0) {
        activeList.innerHTML = '';
        activeEmpty.classList.remove('hidden');
      } else {
        activeEmpty.classList.add('hidden');
        activeList.innerHTML = '';
        active.forEach(t => {
          try {
            const card = renderTestCard(t);
            if (card) activeList.appendChild(card);
          } catch (cardErr) {
            console.error('Error rendering active test card [' + (t.id || 'unknown') + ']:', cardErr);
          }
        });
      }

      // Render history — same isolation
      if (history.length === 0) {
        historyList.innerHTML = '';
        historyEmpty.classList.remove('hidden');
      } else {
        historyEmpty.classList.add('hidden');
        historyList.innerHTML = '';
        history.forEach(t => {
          try {
            const card = renderTestCard(t);
            if (card) historyList.appendChild(card);
          } catch (cardErr) {
            console.error('Error rendering history test card [' + (t.id || 'unknown') + ']:', cardErr);
          }
        });
      }

      // Re-bind event listeners
      bindCardEvents();
    } catch (err) {
      console.error('Error loading tests:', err);
      showAlert({ title: 'Error', message: err.message || 'Failed to load tests', type: 'error' });
    }
  }

  // ─── Event binding for dynamic cards ─────────────────────────────────
  function bindCardEvents() {
    // Toggle active
    document.querySelectorAll('.toggle-otg-active').forEach(toggle => {
      toggle.addEventListener('change', async function () {
        const testId = this.dataset.testId;
        const wasChecked = this.checked;
        try {
          const result = await toggleActive(testId);
          if (!result.success) throw new Error(result.message);
          showAlert({ title: 'Success', message: result.message, type: 'success' });
        } catch (err) {
          this.checked = !wasChecked;
          showAlert({ title: 'Error', message: err.message || 'Failed to toggle', type: 'error' });
        }
      });
    });

    // Finish
    document.querySelectorAll('.finish-otg-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const testId = this.dataset.testId;
        const title = this.dataset.testTitle;
        showConfirmModal({
          title: 'Finish Quick Test',
          message: `Are you sure you want to finish "${title}"? This deactivates it permanently.`,
          confirmText: 'Yes, Finish',
          confirmClass: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
          onConfirm: async () => {
            try {
              const result = await finishTest(testId);
              if (!result.success) throw new Error(result.message);
              showAlert({ title: 'Success', message: 'Test finished', type: 'success' });
              loadTests();
            } catch (err) {
              showAlert({ title: 'Error', message: err.message, type: 'error' });
            }
          }
        });
      });
    });

    // Delete
    document.querySelectorAll('.delete-otg-btn').forEach(btn => {
      btn.addEventListener('click', async function () {
        const testId = this.dataset.testId;
        const title = this.dataset.testTitle;
        let preview = null;
        try {
          const res = await fetchDeletePreview(testId);
          if (res.success) preview = res;
        } catch (err) {
          preview = null;
        }

        const previewHtml = preview
          ? `
            <div class="mt-4 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg text-sm">
              <p class="text-gray-600 dark:text-gray-300">${preview.matched} question(s) match this test.</p>
              <p class="text-gray-500 dark:text-gray-400 mt-1">
                ${preview.exclusive} exclusive · ${preview.shared} shared with other assessments
              </p>
              ${preview.other_assessments.length ? `
                <p class="text-amber-600 dark:text-amber-400 mt-1">Also used by: ${preview.other_assessments.map(a => a.name).join(', ')}</p>
              ` : ''}
            </div>
          `
          : '';

        const unsharedHelp = preview
          ? (preview.exclusive ? `Delete the ${preview.exclusive} question(s) only this test uses.` : 'No exclusive questions to delete.')
          : 'Only delete questions no other assessment uses.';
        const allHelp = preview
          ? `Delete all ${preview.matched} question(s), even those ${preview.shared ? 'still used by other assessments' : 'belonging to this subject'}.`
          : 'Delete every matching question, even shared ones.';

        showConfirmModal({
          title: 'Delete Quick Test',
          message: `Delete "${title}" and all associated results? This cannot be undone.`,
          extraContent: `
            ${previewHtml}
            <div class="mt-4 space-y-2">
              <label class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
                <input type="radio" name="deleteOtgMode" value="none" checked class="rounded-full">
                <span>
                  <span class="block text-sm font-medium text-gray-700 dark:text-gray-300">Delete test only</span>
                  <span class="block text-xs text-gray-500 dark:text-gray-400">Keep all questions in the bank.</span>
                </span>
              </label>
              <label class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
                <input type="radio" name="deleteOtgMode" value="unshared" class="rounded-full">
                <span>
                  <span class="block text-sm font-medium text-gray-700 dark:text-gray-300">Delete test + exclusive questions</span>
                  <span class="block text-xs text-gray-500 dark:text-gray-400">${unsharedHelp}</span>
                </span>
              </label>
              <label class="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg cursor-pointer">
                <input type="radio" name="deleteOtgMode" value="all" class="rounded-full">
                <span>
                  <span class="block text-sm font-medium text-red-700 dark:text-red-300">Delete test + ALL questions</span>
                  <span class="block text-xs text-red-500 dark:text-red-400">${allHelp}</span>
                </span>
              </label>
            </div>
          `,
          confirmText: 'Delete',
          confirmClass: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
          onConfirm: async () => {
            const mode = document.querySelector('input[name="deleteOtgMode"]:checked')?.value || 'none';

            if (mode === 'all') {
              showConfirmModal({
                title: 'Delete ALL Questions?',
                message: `This will permanently delete every question matching "${title}", including ones still used by other assessments. This cannot be undone.`,
                confirmText: 'Yes, Delete All',
                confirmClass: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800',
                onConfirm: async () => {
                  try {
                    const result = await deleteTest(testId, mode);
                    if (!result.success) throw new Error(result.message);
                    showAlert({ title: 'Success', message: result.message, type: 'success' });
                    loadTests();
                  } catch (err) {
                    showAlert({ title: 'Error', message: err.message, type: 'error' });
                  }
                }
              });
              return;
            }

            try {
              const result = await deleteTest(testId, mode);
              if (!result.success) throw new Error(result.message);
              showAlert({ title: 'Success', message: result.message, type: 'success' });
              loadTests();
            } catch (err) {
              showAlert({ title: 'Error', message: err.message, type: 'error' });
            }
          }
        });
      });
    });

    // Edit
    document.querySelectorAll('.edit-otg-btn').forEach(btn => {
      btn.addEventListener('click', async function () {
        const testId = this.dataset.testId;
        const test = allTests.find(t => String(t.id) === testId);
        if (test) showEditCard(test);
      });
    });

    // Results
    document.querySelectorAll('.view-otg-results-btn').forEach(btn => {
      btn.addEventListener('click', async function () {
        const testId = this.dataset.testId;
        const title = this.dataset.testTitle;
        try {
          const result = await fetchResults(testId);
          if (!result.success) throw new Error(result.message);
          showResultsModal(title, result);
        } catch (err) {
          showAlert({ title: 'Error', message: err.message, type: 'error' });
        }
      });
    });
  }

  // ─── Results modal ───────────────────────────────────────────────────
  function showResultsModal(title, data) {
    resultsModalTitle.textContent = title + ' — Results';

    let html = '';

    // Summary
    html += `
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl shadow">
          <p class="text-white/80 text-xs font-medium">Total Takers</p>
          <p class="text-2xl font-bold text-white">${data.total_takers}</p>
        </div>
        <div class="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl shadow">
          <p class="text-white/80 text-xs font-medium">Average Score</p>
          <p class="text-2xl font-bold text-white">${data.average_score}%</p>
        </div>
        <div class="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl shadow">
          <p class="text-white/80 text-xs font-medium">Results Saved</p>
          <p class="text-2xl font-bold text-white">${data.save_after_completion ? 'Yes' : 'No'}</p>
        </div>
      </div>
    `;

    // Results table
    if (data.results && data.results.length > 0) {
      html += `
        <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th class="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Student</th>
                <th class="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-300">Score</th>
                <th class="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-300">Time</th>
                <th class="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">Completed</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              ${data.results.map(r => `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">${escHtml(r.student_name)}</td>
                  <td class="px-4 py-3 text-center">
                    <span class="font-semibold ${r.score >= 70 ? 'text-green-600 dark:text-green-400' : r.score >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}">
                      ${r.score ? r.score.toFixed(1) + '%' : '—'}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                    ${r.time_taken ? Math.floor(r.time_taken / 60) + 'm ' + (r.time_taken % 60) + 's' : '—'}
                  </td>
                  <td class="px-4 py-3 text-right text-gray-500 dark:text-gray-400 text-xs">
                    ${formatDate(r.completed_at)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      html += `<div class="text-center py-8 text-gray-500 dark:text-gray-400">No submissions yet.</div>`;
    }

    resultsModalContent.innerHTML = html;
    openModal('resultsModal');
  }

  // ─── Tab switching ───────────────────────────────────────────────────
  function switchTab(tab) {
    currentTab = tab;
    // Reset button styles
    [activeTabBtn, historyTabBtn].forEach(btn => {
      btn.classList.remove('bg-white', 'dark:bg-gray-700', 'text-gray-900', 'dark:text-white', 'shadow-sm');
      btn.classList.add('text-gray-500', 'dark:text-gray-400', 'hover:text-gray-700', 'dark:hover:text-gray-300');
    });
    // Activate
    const active = tab === 'active' ? activeTabBtn : historyTabBtn;
    active.classList.remove('text-gray-500', 'dark:text-gray-400', 'hover:text-gray-700', 'dark:hover:text-gray-300');
    active.classList.add('bg-white', 'dark:bg-gray-700', 'text-gray-900', 'dark:text-white', 'shadow-sm');

    // Show/hide sections
    activeSection.classList.toggle('hidden', tab !== 'active');
    historySection.classList.toggle('hidden', tab !== 'history');
  }

  activeTabBtn.addEventListener('click', () => switchTab('active'));
  historyTabBtn.addEventListener('click', () => switchTab('history'));

  // ─── Creation card toggle ────────────────────────────────────────────
  function showCreateCard() {
    createCard.classList.remove('hidden');
    toggleCreateBtn.innerHTML = '<span class="material-symbols-outlined text-lg">close</span> Cancel';
    // Load subjects into dropdown
    loadSubjectDropdown();
  }

  function hideCreateCard() {
    createCard.classList.add('hidden');
    toggleCreateBtn.innerHTML = '<span class="material-symbols-outlined text-lg">add</span> Create Quick Test';
    createForm.reset();
    otgClass.innerHTML = '<option value="">All Classes</option>';
    otgMaxQuestionsHint.textContent = '';
    otgQuestionWarning.classList.add('hidden');
  }

  toggleCreateBtn.addEventListener('click', () => {
    if (createCard.classList.contains('hidden')) showCreateCard();
    else hideCreateCard();
  });
  collapseCreateBtn.addEventListener('click', hideCreateCard);
  cancelCreateBtn.addEventListener('click', hideCreateCard);

  // ─── Subject dropdown population ─────────────────────────────────────
  let subjectsCache = [];

  async function loadSubjectDropdown() {
    try {
      const subjects = await fetchSubjects();
      subjectsCache = subjects;
      otgSubject.innerHTML = '<option value="">Select Subject</option>';
      subjects.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.subject_id;
        opt.textContent = s.subject_name + ' (' + s.question_count + ' questions)';
        opt.dataset.questionCount = s.question_count;
        otgSubject.appendChild(opt);
      });
    } catch (err) {
      console.error('Failed to load subjects:', err);
    }
  }

  // ─── Subject → Class → Question count ────────────────────────────────
  otgSubject.addEventListener('change', async function () {
    const subjectId = this.value;
    const selectedOption = this.options[this.selectedIndex];
    const qCount = parseInt(selectedOption.dataset.questionCount) || 0;

    // Reset class dropdown
    otgClass.innerHTML = '<option value="">All Classes</option>';
    otgClass.disabled = true;

    if (subjectId) {
      // Load classes
      try {
        const classes = await fetchClasses(subjectId);
        if (classes.length > 0) {
          otgClass.disabled = false;
          classes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.class_room_id;
            opt.textContent = c.class_room_name + ' (' + c.question_count + ' questions)';
            opt.dataset.questionCount = c.question_count;
            otgClass.appendChild(opt);
          });
        }
      } catch (err) {
        console.error('Failed to load classes:', err);
      }
    }

    updateQuestionHint(subjectId, null);
  });

  otgClass.addEventListener('change', function () {
    const subjectId = otgSubject.value;
    const classId = this.value || null;
    updateQuestionHint(subjectId, classId);
  });

  async function updateQuestionHint(subjectId, classRoomId) {
    if (!subjectId) {
      otgMaxQuestionsHint.textContent = '';
      otgQuestionWarning.classList.add('hidden');
      return;
    }
    try {
      const count = await fetchQuestionCount(subjectId, classRoomId);
      otgMaxQuestionsHint.textContent = count > 0 ? '(max ' + count + ')' : '(0 available)';
      otgQuestionCount.max = count;
      if (count === 0) {
        otgQuestionWarning.classList.remove('hidden');
      } else {
        otgQuestionWarning.classList.add('hidden');
      }
    } catch (err) {
      console.error(err);
    }
  }

  // ─── Auto-compute max_score for create ─────────────────────────────
  otgQuestionCount.addEventListener('input', function () {
    if (!createMaxScoreManuallySet) {
      document.getElementById('otgMaxScore').value = this.value || '';
    }
  });
  document.getElementById('otgMaxScore').addEventListener('input', function () {
    createMaxScoreManuallySet = this.value !== '';
  });

  // ─── Advanced options toggle ─────────────────────────────────────────
  advancedToggle.addEventListener('click', () => {
    const hidden = advancedOptions.classList.toggle('hidden');
    advancedIcon.textContent = hidden ? 'expand_more' : 'expand_less';
  });

  // ─── Create form submission ──────────────────────────────────────────
  createForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const formData = new FormData(createForm);

    const payload = {
      title: formData.get('title'),
      subject_id: formData.get('subject_id'),
      class_room_id: formData.get('class_room_id') || null,
      duration_hours: formData.get('duration_hours') || '0',
      duration_minutes: formData.get('duration_minutes') || '30',
      max_score: formData.get('max_score'),
      number_of_questions: formData.get('number_of_questions') || null,
      calculator_enabled: formData.get('calculator_enabled') === 'true',
      show_feedback: formData.get('show_feedback') !== 'false',
      save_after_completion: formData.get('save_after_completion') !== 'false',
      access_code: formData.get('access_code') || null,
      description: formData.get('description') || '',
      is_active: true,
    };

    // Auto-compute max_score if not set
    if (!payload.max_score || parseFloat(payload.max_score) <= 0) {
      if (payload.number_of_questions) {
        payload.max_score = parseInt(payload.number_of_questions);
      } else if (otgQuestionCount.max) {
        payload.max_score = parseInt(otgQuestionCount.max);
      }
    }

    // Basic validation
    if (!payload.title || !payload.subject_id) {
      showAlert({ title: 'Validation Error', message: 'Title and Subject are required.', type: 'error' });
      return;
    }

    // Validate question count
    if (payload.number_of_questions && otgQuestionCount.max && parseInt(payload.number_of_questions) > parseInt(otgQuestionCount.max)) {
      showAlert({ title: 'Validation Error', message: 'Number of questions exceeds available questions (' + otgQuestionCount.max + ').', type: 'error' });
      return;
    }

    createBtn.disabled = true;
    createBtn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">refresh</span> Creating...';

    try {
      const result = await createTest(payload);
      if (!result.success) throw new Error(result.message);
      showAlert({ title: 'Success', message: 'Quick test created!', type: 'success' });
      hideCreateCard();
      loadTests();
    } catch (err) {
      showAlert({ title: 'Error', message: err.message || 'Failed to create test', type: 'error' });
    } finally {
      createBtn.disabled = false;
      createBtn.innerHTML = '<span class="material-symbols-outlined text-lg">bolt</span> Create & Publish';
    }
  });

  // ─── Edit card: subject change ──────────────────────────────────────
  editSubject.addEventListener('change', async function () {
    const subjectId = this.value;
    editClass.innerHTML = '<option value="">All Classes</option>';
    editClass.disabled = true;

    if (subjectId) {
      try {
        const classes = await fetchClasses(subjectId);
        if (classes.length > 0) {
          editClass.disabled = false;
          classes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.class_room_id;
            opt.textContent = c.class_room_name + ' (' + c.question_count + ' questions)';
            opt.dataset.questionCount = c.question_count;
            editClass.appendChild(opt);
          });
        }
      } catch (err) {
        console.error('Failed to load classes:', err);
      }
    }
    updateEditQuestionHint(subjectId, null);
  });

  editClass.addEventListener('change', function () {
    updateEditQuestionHint(editSubject.value, this.value || null);
  });

  async function updateEditQuestionHint(subjectId, classRoomId) {
    if (!subjectId) {
      editMaxQuestionsHint.textContent = '';
      editQuestionWarning.classList.add('hidden');
      return;
    }
    try {
      const count = await fetchQuestionCount(subjectId, classRoomId);
      editMaxQuestionsHint.textContent = count > 0 ? '(max ' + count + ')' : '(0 available)';
      editQuestionCount.max = count;
      if (count === 0) {
        editQuestionWarning.classList.remove('hidden');
      } else {
        editQuestionWarning.classList.add('hidden');
      }
    } catch (err) {
      console.error(err);
    }
  }

  // ─── Auto-compute max_score for edit ───────────────────────────────
  editQuestionCount.addEventListener('input', function () {
    if (!editMaxScoreManuallySet) {
      editMaxScore.value = this.value || '';
    }
  });
  editMaxScore.addEventListener('input', function () {
    editMaxScoreManuallySet = this.value !== '';
  });

  // ─── Edit card visibility ──────────────────────────────────────────
  function populateEditSubjectDropdown(selectedId) {
    editSubject.innerHTML = '<option value="">Select Subject</option>';
    subjectsCache.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.subject_id;
      opt.textContent = s.subject_name + ' (' + s.question_count + ' questions)';
      opt.dataset.questionCount = s.question_count;
      if (s.subject_id === selectedId) opt.selected = true;
      editSubject.appendChild(opt);
    });
  }

  async function showEditCard(test) {
    editingTestId = test.id;

    // Ensure subject cache is loaded
    if (subjectsCache.length === 0) {
      await loadSubjectDropdown();
    }
    populateEditSubjectDropdown(test.subject_id);

    // Load classes and select correct one
    if (test.subject_id) {
      try {
        const classes = await fetchClasses(test.subject_id);
        editClass.innerHTML = '<option value="">All Classes</option>';
        if (classes.length > 0) {
          editClass.disabled = false;
          classes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.class_room_id;
            opt.textContent = c.class_room_name + ' (' + c.question_count + ' questions)';
            opt.dataset.questionCount = c.question_count;
            if (c.class_room_id === test.class_room_id) opt.selected = true;
            editClass.appendChild(opt);
          });
        }
        updateEditQuestionHint(test.subject_id, test.class_room_id);
      } catch (err) {
        console.error('Failed to load classes:', err);
      }
    }

    // Populate fields
    editTitle.value = test.title || '';
    const totalSeconds = test.duration || 0;
    editDurationHours.value = Math.floor(totalSeconds / 3600) || '';
    editDurationMinutes.value = Math.floor((totalSeconds % 3600) / 60) || '';
    editQuestionCount.value = test.number_of_questions || '';
    editMaxScore.value = test.max_score || '';
    editSaveAfterCompletion.checked = test.save_after_completion !== false;
    editShowFeedback.checked = test.show_feedback !== false;
    editCalculatorEnabled.checked = !!test.calculator_enabled;
    editAccessCode.value = test.access_code || '';
    editDescription.value = test.description || '';

    // Reset manual override flag
    editMaxScoreManuallySet = false;

    // Show card
    editCard.classList.remove('hidden');
    editCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function hideEditCard() {
    editCard.classList.add('hidden');
    editForm.reset();
    editClass.innerHTML = '<option value="">All Classes</option>';
    editClass.disabled = true;
    editMaxQuestionsHint.textContent = '';
    editQuestionWarning.classList.add('hidden');
    editingTestId = null;
  }

  collapseEditBtn.addEventListener('click', hideEditCard);
  cancelEditBtn.addEventListener('click', hideEditCard);

  // ─── Edit advanced toggle ──────────────────────────────────────────
  toggleEditAdvanced.addEventListener('click', () => {
    const hidden = editAdvancedOptions.classList.toggle('hidden');
    editAdvancedIcon.textContent = hidden ? 'expand_more' : 'expand_less';
  });

  // ─── Edit form submission ──────────────────────────────────────────
  editForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!editingTestId) return;

    const formData = new FormData(editForm);

    const payload = {
      title: formData.get('title'),
      subject_id: formData.get('subject_id'),
      class_room_id: formData.get('class_room_id') || null,
      duration_hours: formData.get('duration_hours') || '0',
      duration_minutes: formData.get('duration_minutes') || '30',
      max_score: formData.get('max_score'),
      number_of_questions: formData.get('number_of_questions') || null,
      calculator_enabled: formData.get('calculator_enabled') === 'true',
      show_feedback: formData.get('show_feedback') !== 'false',
      save_after_completion: formData.get('save_after_completion') !== 'false',
      access_code: formData.get('access_code') || null,
      description: formData.get('description') || '',
    };

    // Auto-compute max_score if not set
    if (!payload.max_score || parseFloat(payload.max_score) <= 0) {
      if (payload.number_of_questions) {
        payload.max_score = parseInt(payload.number_of_questions);
      } else if (editQuestionCount.max) {
        payload.max_score = parseInt(editQuestionCount.max);
      }
    }

    // Basic validation
    if (!payload.title || !payload.subject_id) {
      showAlert({ title: 'Validation Error', message: 'Title and Subject are required.', type: 'error' });
      return;
    }

    // Validate question count
    if (payload.number_of_questions && editQuestionCount.max && parseInt(payload.number_of_questions) > parseInt(editQuestionCount.max)) {
      showAlert({ title: 'Validation Error', message: 'Number of questions exceeds available questions (' + editQuestionCount.max + ').', type: 'error' });
      return;
    }

    saveEditBtn.disabled = true;
    saveEditBtn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">refresh</span> Saving...';

    try {
      const result = await updateTest(editingTestId, payload);
      if (!result.success) throw new Error(result.message);
      showAlert({ title: 'Success', message: 'Quick test updated!', type: 'success' });
      hideEditCard();
      loadTests();
    } catch (err) {
      showAlert({ title: 'Error', message: err.message || 'Failed to update test', type: 'error' });
    } finally {
      saveEditBtn.disabled = false;
      saveEditBtn.innerHTML = '<span class="material-symbols-outlined text-lg">save</span> Save Changes';
    }
  });

  // ─── Init ────────────────────────────────────────────────────────────
  loadTests();
});
