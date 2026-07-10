let currentRecordingData = null

async function loadRecordingMeta() {
  const termId = document.getElementById('recording-term').value
  const classId = document.getElementById('recording-class').value
  if (!termId || !classId) return
  try {
    const r = await fetch('/reports/api/result-recording-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ class_room_id: classId, term_id: termId })
    })
    const d = await r.json()
    if (d.success) {
      populateRecordingAssessments(d.assessment_types)
      populateRecordingSubjects(d.subjects)
    }
  } catch (e) {
    console.error('Error loading recording meta:', e)
  }
}

window.loadRecordingTerms = async function () {
  const select = document.getElementById('recording-term')
  if (!select || select.options.length > 1) return
  select.innerHTML = '<option value="">Loading...</option>'
  select.disabled = true
  try {
    const r = await fetch('/reports/api/terms?_=' + Date.now())
    const d = await r.json()
    if (d.success && d.terms && d.terms.length > 0) {
      select.innerHTML = '<option value="">Select Term</option>'
      d.terms.forEach(t => {
        const o = document.createElement('option')
        o.value = t.term_id
        o.textContent = `${t.term_name} - ${t.academic_session}`
        if (t.is_current) { o.textContent += ' (Current)'; o.selected = true }
        select.appendChild(o)
      })
    } else {
      select.innerHTML = d.success
        ? '<option value="">No terms found</option>'
        : `<option value="">API error: ${d.error || 'unknown'}</option>`
    }
  } catch (e) {
    console.error('Error loading terms:', e)
    select.innerHTML = '<option value="">Error loading terms</option>'
    showNotification('Failed to load terms', 'error')
  } finally {
    select.disabled = false
  }
}

window.loadRecordingClasses = async function () {
  const select = document.getElementById('recording-class')
  if (!select || select.options.length > 1) return
  select.innerHTML = '<option value="">Loading...</option>'
  select.disabled = true
  try {
    const r = await fetch('/reports/api/classes')
    const d = await r.json()
    if (d.success) {
      select.innerHTML = '<option value="">Select Class</option>'
      d.classes.forEach(c => {
        const o = document.createElement('option')
        o.value = c.class_room_id
        o.textContent = c.class_name
        select.appendChild(o)
      })
    } else {
      select.innerHTML = '<option value="">No classes found</option>'
    }
  } catch (e) {
    console.error('Error loading classes:', e)
    select.innerHTML = '<option value="">Error loading classes</option>'
    showNotification('Failed to load classes', 'error')
  } finally {
    select.disabled = false
  }
}

window.checkAllRecordingAssessments = function () {
  document.querySelectorAll('.recording-assessment-field').forEach(cb => cb.checked = true)
}
window.uncheckAllRecordingAssessments = function () {
  document.querySelectorAll('.recording-assessment-field').forEach(cb => cb.checked = false)
}

window.checkAllRecordingSubjects = function () {
  document.querySelectorAll('.recording-subject-field').forEach(cb => cb.checked = true)
}
window.uncheckAllRecordingSubjects = function () {
  document.querySelectorAll('.recording-subject-field').forEach(cb => cb.checked = false)
}

document.addEventListener('DOMContentLoaded', function () {
  const termEl = document.getElementById('recording-term')
  const classEl = document.getElementById('recording-class')
  if (termEl) termEl.addEventListener('change', loadRecordingMeta)
  if (classEl) classEl.addEventListener('change', loadRecordingMeta)
})

function getSelectedRecordingAssessments() {
  const codes = []
  document.querySelectorAll('.recording-assessment-field:checked').forEach(cb => codes.push(cb.dataset.code))
  return codes
}

function getSelectedRecordingSubjects() {
  const ids = []
  document.querySelectorAll('.recording-subject-field:checked').forEach(cb => ids.push(cb.dataset.subjectId))
  return ids
}

function getSelectedRecordingInfoFields() {
  const fields = []
  document.querySelectorAll('.recording-info-field:checked').forEach(cb => fields.push(cb.dataset.field))
  if (!fields.includes('sn')) fields.unshift('sn')
  return fields
}

function populateRecordingAssessments(types) {
  const container = document.getElementById('recording-assessment-types')
  if (!container) return
  if (!types || types.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-400 italic">No assessment types found</p>'
    return
  }
  container.innerHTML = types.map(at => `
    <label class="flex items-center gap-2.5 cursor-pointer group">
      <input type="checkbox" class="recording-assessment-field w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500" data-code="${at.code}" checked>
      <span class="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-emerald-500 transition-colors">${at.name} (${at.max_score})</span>
    </label>
  `).join('')
}

function populateRecordingSubjects(subjects) {
  const container = document.getElementById('recording-subjects')
  if (!container) return
  if (!subjects || subjects.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-400 italic">No subjects found for this class</p>'
    return
  }
  container.innerHTML = subjects.map(s => `
    <label class="flex items-center gap-2 cursor-pointer group">
      <input type="checkbox" class="recording-subject-field w-4 h-4 rounded text-amber-600 focus:ring-amber-500" data-subject-id="${s.subject_id}" checked>
      <span class="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-amber-500 transition-colors">${s.subject_name}</span>
    </label>
  `).join('')
}

function formatAssessmentShort(code) {
  const m = {
    'first_ca': '1st CA', 'second_ca': '2nd CA', 'third_ca': '3rd CA', 'fourth_ca': '4th CA',
    'exam': 'Exam', 'mid_term': 'Mid', 'final': 'Final', 'quiz': 'Quiz',
    'assignment': 'Assign', 'project': 'Project', 'cbt': 'CBT', 'ca': 'CA',
  }
  return m[code] || code.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// ---- Print-optimised HTML generator ----
// Default style: returns "<style>...</style>" + raw body (no wrapper div)
// Compact/Minimal: returns "<style>...</style><div class="sheet">...</div>"
function buildRecordingSheetHTML(students, subjects, assessmentTypes, metadata, infoFields, style, teacherName) {
  style = style || 'default'
  teacherName = teacherName || ''
  const schoolName = metadata.school_name || 'School Name'
  const schoolAddress = metadata.school_address || ''
  const schoolMotto = metadata.school_motto || ''
  const rawLogo = metadata.school_logo || ''
  const isExternal = rawLogo.startsWith('http://') || rawLogo.startsWith('https://')
  const logoPath = isExternal ? '' : (rawLogo ? '/' + rawLogo.replace(/^\/+/, '') : '')
  const initial = (schoolName.charAt(0) || 'S').toUpperCase()

  function logoHtml(cssClass) {
    if (!logoPath) return `<div class="${cssClass} logo-placeholder">${initial}</div>`
    return `<img class="${cssClass}" src="${logoPath}" alt="">`
  }

  function infoFieldLabel(f) {
    const labels = { sn: 'S/N', student_name: 'Student Name', username: 'Username', admission_number: 'Adm No.' }
    return labels[f] || f
  }

  function infoFieldValue(student, f) {
    if (f === 'sn') return student.sn
    return student[f] || '-'
  }

  infoFields = infoFields || ['sn', 'student_name', 'admission_number']
  const isSingleSubject = subjects.length === 1

  // ---- Header (varies by style) ----
  let headerHtml = ''
  if (style === 'compact') {
    headerHtml = `
      <div class="header-banner">
        <div class="header-row">
          ${logoHtml('header-logo')}
          <div class="header-text">
            <h1 class="school-name">${schoolName}</h1>
            <p class="school-motto">${schoolMotto || 'Excellence in Education'}</p>
            <p class="school-sub">Result Recording Sheet &mdash; ${metadata.class_name} &bull; ${metadata.term_name} &bull; ${metadata.total_students} Students</p>
          </div>
        </div>
      </div>`
  } else if (style === 'minimal') {
    headerHtml = `
      <div class="header-banner">
        <h1 class="school-name">${schoolName}</h1>
        <p class="school-sub">Result Recording Sheet &mdash; ${metadata.class_name} &bull; ${metadata.term_name} &bull; ${metadata.total_students} Students</p>
      </div>`
  } else {
    headerHtml = `
      <div class="header-banner">
        ${logoHtml('header-logo-center')}
        <h1 class="school-name">${schoolName}</h1>
        ${schoolAddress ? `<p class="school-address">${schoolAddress}</p>` : ''}
        <p class="school-motto">${schoolMotto || 'Excellence in Education'}</p>
        <div class="header-title-row">
          <span class="title-badge">Result Recording Sheet</span>
          <span class="title-badge">${metadata.class_name}</span>
          <span class="title-badge">${metadata.term_name}</span>
          <span class="title-badge">${metadata.total_students} Students</span>
        </div>
      </div>`
  }

  // ---- Info bar as a div (default uses this outside table) ----
  const infoBarHtml = isSingleSubject
    ? `<div class="info-bar"><span class="info-bar-left"><strong>Subject:</strong> ${subjects[0].subject_name}</span><span class="info-bar-center"><strong>Class:</strong> ${metadata.class_name}</span><span class="info-bar-right"><strong>Subject Teacher:</strong> ${teacherName || '________________'}</span></div>`
    : ''

  // ---- Table header rows ----
  let theadRows = '<tr>'
  infoFields.forEach(f => {
    let w = ''
    if (f === 'sn') w = ' style="width:24px"'
    else if (f === 'student_name') w = ' style="width:120px"'
    theadRows += `<th class="${f === 'sn' ? 'sn-cell' : 'info-cell'}"${w}>${infoFieldLabel(f)}</th>`
  })
  if (isSingleSubject) {
    assessmentTypes.forEach(at => {
      theadRows += `<th>${formatAssessmentShort(at.code)}</th>`
    })
  } else {
    subjects.forEach(s => {
      theadRows += `<th class="subject-group" colspan="${assessmentTypes.length}">${s.subject_name}</th>`
    })
  }
  theadRows += '</tr>'

  if (!isSingleSubject) {
    theadRows += '<tr>'
    infoFields.forEach(() => { theadRows += '<th></th>' })
    subjects.forEach(() => {
      assessmentTypes.forEach(at => {
        theadRows += `<th>${formatAssessmentShort(at.code)}</th>`
      })
    })
    theadRows += '</tr>'
  }

  // For compact/minimal: prepend info bar row inside thead
  let fullThead = theadRows
  if (style !== 'default' && isSingleSubject) {
    const totalCols = infoFields.length + assessmentTypes.length
    fullThead = `<tr class="info-bar-row"><td colspan="${totalCols}" class="info-bar-cell"><span class="info-bar-left"><strong>Subject:</strong> ${subjects[0].subject_name}</span><span class="info-bar-center"><strong>Class:</strong> ${metadata.class_name}</span><span class="info-bar-right"><strong>Subject Teacher:</strong> ${teacherName || '________________'}</span></td></tr>` + theadRows
  }

  // ---- Table body rows ----
  const tbodyRows = students.map(student => {
    let row = '<tr>'
    infoFields.forEach(f => {
      let w = ''
      if (f === 'sn') w = ' style="width:24px"'
      else if (f === 'student_name') w = ' style="width:120px"'
      row += `<td class="${f === 'sn' ? 'sn-cell' : 'info-cell'}"${w}>${infoFieldValue(student, f)}</td>`
    })
    if (isSingleSubject) {
      assessmentTypes.forEach(() => {
        row += '<td class="score-blank"></td>'
      })
    } else {
      subjects.forEach(() => {
        assessmentTypes.forEach(() => {
          row += '<td class="score-blank"></td>'
        })
      })
    }
    row += '</tr>'
    return row
  }).join('')

  const tableHtml = `
    <table>
      <thead>${fullThead}</thead>
      <tbody>${tbodyRows}</tbody>
    </table>
    <div class="footer">Generated by CBT Mini School System</div>`

  // ---- Default style: no .sheet wrapper, matches Class List pattern ----
  if (style === 'default') {
    const css = `
      @page { size: A4 portrait; margin: 0; }
      body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; color: #1a1a1a; }
      .header-banner { text-align: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; }
      .header-logo-center { width: 48px; height: 48px; border-radius: 10px; object-fit: cover; margin: 0 auto 8px auto; display: block; }
      .logo-placeholder { background: #111; color: white; line-height: 48px; font-size: 20px; font-weight: 700; }
      .school-name { font-size: 18px; font-weight: 700; margin: 0 0 1px 0; color: #111; letter-spacing: -0.3px; }
      .school-address { font-size: 9px; color: #6b7280; margin: 0 0 4px 0; }
      .school-motto { font-size: 10px; color: #6b7280; margin: 0 0 8px 0; font-style: italic; }
      .header-title-row { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; }
      .title-badge { background: #f3f4f6; color: #374151; padding: 3px 10px; border-radius: 4px; font-size: 9px; font-weight: 600; letter-spacing: 0.3px; }
      thead { display: table-header-group; }
      table { width: 100%; border-collapse: collapse; font-size: 9px; table-layout: fixed; }
      th { background: #f9fafb; color: #374151; padding: 6px 4px; text-align: center; font-weight: 600; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; border: 1px solid #000; }
      th.sn-cell { width: 24px; text-align: center; }
      th.info-cell { text-align: left; }
      th.subject-group { font-size: 8px; letter-spacing: 0.3px; color: #6b7280; }
      td { padding: 5px 4px; border: 1px solid #000; color: #374151; font-size: 9px; vertical-align: middle; text-align: center; overflow: hidden; text-overflow: ellipsis; }
      td.sn-cell { width: 24px; text-align: center; font-weight: 600; color: #d1d5db; }
      td.info-cell { text-align: left; }
      td.score-blank { min-width: 22px; height: 18px; }
      tbody tr:nth-child(even) { background: #fafafa; }
      .footer { margin-top: 12px; font-size: 8px; color: #9ca3af; text-align: center; padding-top: 6px; border-top: 1px solid #f3f4f6; }
    `
    return `<style>${css}</style>${headerHtml}${tableHtml}`
  }

  // ---- Compact style ----
  if (style === 'compact') {
    const css = `
      @page { size: A4 portrait; margin: 0; }
      body { margin: 0; padding: 0; }
      .sheet { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 10px; color: #1a1a1a; }
      .header-banner { margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
      .header-row { display: flex; align-items: center; gap: 12px; }
      .header-logo { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
      .logo-placeholder { background: #111; color: white; line-height: 36px; font-size: 16px; font-weight: 700; text-align: center; border-radius: 8px; }
      .header-text { flex: 1; }
      .school-name { font-size: 16px; font-weight: 700; margin: 0; color: #111; letter-spacing: -0.3px; }
      .school-motto { font-size: 9px; color: #6b7280; margin: 2px 0 0 0; font-style: italic; }
      .school-sub { font-size: 8px; color: #9ca3af; margin: 2px 0 0 0; }
      thead { display: table-header-group; }
      table { width: 100%; border-collapse: collapse; font-size: 9px; table-layout: fixed; }
      th { background: #f3f4f6; color: #6b7280; padding: 6px 4px; text-align: center; font-weight: 600; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; border: 1px solid #000; }
      th.sn-cell { width: 24px; text-align: center; }
      th.info-cell { text-align: left; }
      th.subject-group { font-size: 8px; letter-spacing: 0.3px; color: #6b7280; background: #e5e7eb; }
      td { padding: 5px 4px; border: 1px solid #000; color: #374151; font-size: 9px; vertical-align: middle; text-align: center; overflow: hidden; text-overflow: ellipsis; }
      td.sn-cell { width: 24px; text-align: center; font-weight: 600; color: #d1d5db; }
      td.info-cell { text-align: left; }
      td.score-blank { min-width: 22px; height: 18px; }
      tbody tr:nth-child(even) { background: #fafafa; }
      .info-bar-row td { border: none !important; padding: 0; }
      .info-bar-cell { padding: 6px 0 8px 0 !important; font-size: 10px; font-weight: 600; color: #111; letter-spacing: 0.3px; }
      .info-bar-left { float: left; }
      .info-bar-center { display: inline-block; text-align: center; }
      .info-bar-right { float: right; }
      .info-bar-cell::after { content: ''; display: table; clear: both; }
      .footer { margin-top: 10px; font-size: 8px; color: #9ca3af; text-align: center; padding-top: 6px; border-top: 1px solid #f3f4f6; clear: both; }
    `
    return `<style>${css}</style><div class="sheet">${headerHtml}${tableHtml}</div>`
  }

  // ---- Minimal style ----
  const css = `
    @page { size: A4 portrait; margin: 0; }
    body { margin: 0; padding: 0; }
    .sheet { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 10px; color: #1a1a1a; }
    .header-banner { margin-bottom: 8px; padding-bottom: 8px; border-bottom: 2px solid #111; }
    .school-name { font-size: 16px; font-weight: 800; margin: 0; color: #111; letter-spacing: -0.5px; text-transform: uppercase; }
    .school-sub { font-size: 8px; color: #6b7280; margin: 2px 0 0 0; }
    thead { display: table-header-group; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; table-layout: fixed; }
    th { color: #374151; background: transparent; padding: 6px 4px; text-align: center; font-weight: 600; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; border: 1px solid #000; }
    th.sn-cell { width: 24px; text-align: center; }
    th.info-cell { text-align: left; }
    th.subject-group { font-size: 8px; letter-spacing: 0.3px; color: #374151; }
    td { padding: 5px 4px; border: 1px solid #000; color: #374151; font-size: 9px; vertical-align: middle; text-align: center; overflow: hidden; text-overflow: ellipsis; }
    td.sn-cell { width: 24px; text-align: center; font-weight: 600; color: #d1d5db; }
    td.info-cell { text-align: left; }
    td.score-blank { min-width: 22px; height: 18px; }
    .info-bar-row td { border: none !important; padding: 0; }
    .info-bar-cell { padding: 6px 0 8px 0 !important; font-size: 10px; font-weight: 600; color: #111; letter-spacing: 0.3px; }
    .info-bar-left { float: left; }
    .info-bar-center { display: inline-block; text-align: center; }
    .info-bar-right { float: right; }
    .info-bar-cell::after { content: ''; display: table; clear: both; }
    .footer { margin-top: 10px; font-size: 8px; color: #9ca3af; text-align: center; padding-top: 6px; border-top: 1px solid #f3f4f6; clear: both; }
  `
  return `<style>${css}</style><div class="sheet">${headerHtml}${tableHtml}</div>`
}

// ---- On-screen results table ----
function renderRecordingTable(data) {
  const { students, subjects, assessment_types: assessmentTypes, metadata } = data
  const infoFields = getSelectedRecordingInfoFields()
  const selAssessments = getSelectedRecordingAssessments()
  const selSubjects = getSelectedRecordingSubjects()

  const filteredSubjects = subjects.filter(s => selSubjects.includes(s.subject_id))
  const filteredAssessments = assessmentTypes.filter(at => selAssessments.includes(at.code))

  const resultsDiv = document.getElementById('recording-results')
  resultsDiv.classList.remove('hidden')

  currentRecordingData.style = document.getElementById('recording-sheet-style')?.value || 'default'

  document.getElementById('recording-class-info').textContent = metadata.class_name
  document.getElementById('recording-term-info').textContent = metadata.term_name
  document.getElementById('recording-count').textContent = `(${metadata.total_students} students)`

  function infoFieldLabel(f) {
    const labels = { sn: 'S/N', student_name: 'Student Name', username: 'Username', admission_number: 'Adm No.' }
    return labels[f] || f
  }
  function infoFieldValue(student, f) {
    if (f === 'sn') return student.sn
    return student[f] || '-'
  }

  const isSingleSubject = filteredSubjects.length === 1
  const teacherName = (document.getElementById('recording-teacher-name')?.value || '').trim()

  let html = ''

  // Info line: Subject | Class | Subject Teacher
  if (isSingleSubject) {
    const subjectLabel = filteredSubjects[0].subject_name
    const teacherDisplay = teacherName || '________________'
    html += `<div class="mb-4 px-1 flex items-center text-xs text-gray-600 dark:text-gray-400" style="border-bottom:1px solid #e5e7eb;padding-bottom:10px;">
      <span class="flex-1 text-left"><strong class="text-gray-800 dark:text-gray-300">Subject:</strong> ${subjectLabel}</span>
      <span class="text-center px-4"><strong class="text-gray-800 dark:text-gray-300">Class:</strong> ${metadata.class_name}</span>
      <span class="flex-1 text-right"><strong class="text-gray-800 dark:text-gray-300">Subject Teacher:</strong> ${teacherDisplay}</span>
    </div>`
  }

  // Side-specific borders (avoids html2canvas double-border bug)
  html += `<style>
    #recording-table-body table{border-collapse:separate;border-spacing:0}
    #recording-table-body th,#recording-table-body td{border:none;border-bottom:1px solid #d1d5db;border-right:1px solid #d1d5db;padding:6px}
    #recording-table-body th:first-child,#recording-table-body td:first-child{border-left:1px solid #d1d5db}
    #recording-table-body thead tr:first-child th{border-top:1px solid #d1d5db}
  </style>`
  html += '<table class="min-w-full"><thead>'

  // Row 1: info fields + (subject groups OR assessment headers)
  html += '<tr>'
  infoFields.forEach(f => {
    html += `<th class="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-700/50 ${f === 'sn' ? 'text-center' : ''}">${infoFieldLabel(f)}</th>`
  })
  if (isSingleSubject) {
    filteredAssessments.forEach(at => {
      html += `<th class="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-700/50">${formatAssessmentShort(at.code)}</th>`
    })
  } else {
    filteredSubjects.forEach(s => {
      html += `<th colspan="${filteredAssessments.length}" class="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-700/50">${s.subject_name}</th>`
    })
  }
  html += '</tr>'

  // Row 2: assessment sub-headers (multi-subject only)
  if (!isSingleSubject) {
    html += '<tr>'
    infoFields.forEach(() => { html += '<th class="bg-gray-50 dark:bg-gray-700/50"></th>' })
    filteredSubjects.forEach(() => {
      filteredAssessments.forEach(at => {
        html += `<th class="px-2 py-1.5 text-center text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50">${formatAssessmentShort(at.code)}</th>`
      })
    })
    html += '</tr>'
  }

  html += '</thead><tbody>'

  students.forEach(student => {
    html += '<tr>'
    infoFields.forEach(f => {
      html += `<td class="px-3 py-2.5 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 ${f === 'sn' ? 'text-center font-medium' : ''}">${infoFieldValue(student, f)}</td>`
    })
    if (isSingleSubject) {
      filteredAssessments.forEach(() => {
        html += '<td class="px-3 py-2.5 text-center text-sm text-gray-300 dark:text-gray-600">&nbsp;</td>'
      })
    } else {
      filteredSubjects.forEach(() => {
        filteredAssessments.forEach(() => {
          html += '<td class="px-3 py-2.5 text-center text-sm text-gray-300 dark:text-gray-600">&nbsp;</td>'
        })
      })
    }
    html += '</tr>'
  })

  html += '</tbody></table>'
  document.getElementById('recording-table-body').innerHTML = html

  resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ---- Generate on-screen ----
window.generateRecordingSheet = async function () {
  const classId = document.getElementById('recording-class').value
  const termId = document.getElementById('recording-term').value
  if (!classId || !termId) { showNotification('Please select both term and class', 'error'); return }

  const selAssessments = getSelectedRecordingAssessments()
  const selSubjects = getSelectedRecordingSubjects()
  if (selAssessments.length === 0) { showNotification('Please select at least one assessment type', 'error'); return }
  if (selSubjects.length === 0) { showNotification('Please select at least one subject', 'error'); return }

  const btn = document.querySelector('button[onclick="generateRecordingSheet()"]')
  const orig = btn.innerHTML
  btn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">progress_activity</span> Generating...'
  btn.disabled = true

  try {
    const r = await fetch('/reports/api/result-recording-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ class_room_id: classId, term_id: termId })
    })
    const d = await r.json()

    if (d.success) {
      currentRecordingData = d
      const assessContainer = document.getElementById('recording-assessment-types')
      if (!assessContainer || assessContainer.querySelector('.recording-assessment-field') === null) {
        populateRecordingAssessments(d.assessment_types)
      }
      const subjContainer = document.getElementById('recording-subjects')
      if (!subjContainer || subjContainer.querySelector('.recording-subject-field') === null) {
        populateRecordingSubjects(d.subjects)
      }
      renderRecordingTable(d)
      showNotification(`Recording sheet generated - ${d.metadata.total_students} students`, 'success')
    } else {
      throw new Error(d.error || 'Failed to load data')
    }
  } catch (e) {
    console.error('Error generating recording sheet:', e)
    showNotification('Error: ' + e.message, 'error')
  } finally {
    btn.innerHTML = orig
    btn.disabled = false
  }
}

// ---- PDF download ----
window.printRecordingSheet = async function () {
  if (!currentRecordingData) { showNotification('Please generate a recording sheet first', 'error'); return }

  const { students, subjects, assessment_types: assessmentTypes, metadata, style } = currentRecordingData
  const infoFields = getSelectedRecordingInfoFields()
  const selAssessments = getSelectedRecordingAssessments()
  const selSubjects = getSelectedRecordingSubjects()
  const filteredSubjects = subjects.filter(s => selSubjects.includes(s.subject_id))
  const filteredAssessments = assessmentTypes.filter(at => selAssessments.includes(at.code))
  const teacherName = (document.getElementById('recording-teacher-name')?.value || '').trim()

  const btn = document.querySelector('button[onclick="printRecordingSheet()"]')
  const orig = btn.innerHTML
  btn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">progress_activity</span> Generating PDF...'
  btn.disabled = true

  try {
    if (typeof html2pdf === 'undefined') {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
        s.onload = resolve; s.onerror = reject
        document.head.appendChild(s)
      })
    }

    const html = buildRecordingSheetHTML(students, filteredSubjects, filteredAssessments, metadata, infoFields, style, teacherName)

    const element = document.createElement('div')
    element.style.position = 'relative'
    element.style.left = '0'
    element.style.top = '0'
    element.style.backgroundColor = 'white'
    element.style.width = '210mm'
    element.style.zIndex = '9999'
    element.style.overflow = 'hidden'
    document.body.appendChild(element)
    element.innerHTML = html

    const name = `Recording_Sheet_${metadata.class_name.replace(/\s+/g, '_')}.pdf`

    await html2pdf().set({
      margin: [0, 0, 0, 0],
      filename: name,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false },
      pagebreak: { mode: ['legacy', 'css'] },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait', compress: true }
    }).from(element).save()

    document.body.removeChild(element)
    showNotification('PDF downloaded successfully', 'success')
  } catch (e) {
    console.error('Error generating PDF:', e)
    showNotification('Failed to generate PDF: ' + e.message, 'error')
  } finally {
    btn.innerHTML = orig
    btn.disabled = false
  }
}

// ---- Canvas preview (approach A: html2canvas + manual pagination) ----
window.previewRecordingSheet = async function () {
  if (!currentRecordingData) { showNotification('Please generate a recording sheet first', 'error'); return }

  const { students, subjects, assessment_types: assessmentTypes, metadata, style } = currentRecordingData
  const infoFields = getSelectedRecordingInfoFields()
  const selAssessments = getSelectedRecordingAssessments()
  const selSubjects = getSelectedRecordingSubjects()
  const filteredSubjects = subjects.filter(s => selSubjects.includes(s.subject_id))
  const filteredAssessments = assessmentTypes.filter(at => selAssessments.includes(at.code))
  const teacherName = (document.getElementById('recording-teacher-name')?.value || '').trim()

  try {
    if (typeof html2canvas === 'undefined') await loadHtml2Canvas()

    let modal = document.getElementById('canvasPdfPreviewModal')
    if (!modal) modal = createCanvasPreviewModal()

    const html = buildRecordingSheetHTML(students, filteredSubjects, filteredAssessments, metadata, infoFields, style, teacherName)

    const previewContainer = document.getElementById('canvasPreviewContent')
    previewContainer.innerHTML = `
      <div class="preview-loading">
        <div class="preview-loading-spinner"></div>
        <p style="margin-top:16px;color:#6b7280;">Generating preview...</p>
      </div>`
    modal.classList.remove('hidden')

    // Render offscreen, then capture with html2canvas
    const tempDiv = document.createElement('div')
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    tempDiv.style.top = '0'
    tempDiv.style.width = '210mm'
    tempDiv.style.backgroundColor = 'white'
    tempDiv.style.overflow = 'hidden'
    tempDiv.innerHTML = html
    document.body.appendChild(tempDiv)

    await waitForResources(tempDiv)

    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 0,
      windowWidth: tempDiv.scrollWidth,
      windowHeight: tempDiv.scrollHeight,
    })

    document.body.removeChild(tempDiv)

    // Paginate into A4 portrait pages
    const a4HeightPx = 297 * 3.7795275591 * 2  // A4 height in px at 2x scale
    const totalPages = Math.ceil(canvas.height / a4HeightPx)

    previewContainer.innerHTML = ''

    for (let page = 0; page < totalPages; page++) {
      const sliceH = Math.min(a4HeightPx, canvas.height - page * a4HeightPx)
      if (sliceH <= 0) break

      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = sliceH
      pageCanvas.style.width = '210mm'
      pageCanvas.style.height = 'auto'
      pageCanvas.style.display = 'block'
      pageCanvas.style.margin = '20px auto'
      pageCanvas.style.boxShadow = '0 0 50px rgba(0,0,0,0.3)'
      pageCanvas.style.backgroundColor = 'white'

      const ctx = pageCanvas.getContext('2d')
      ctx.drawImage(canvas, 0, page * a4HeightPx, canvas.width, sliceH, 0, 0, canvas.width, sliceH)

      previewContainer.appendChild(pageCanvas)

      const pageNum = document.createElement('div')
      pageNum.textContent = `Page ${page + 1} of ${totalPages}`
      pageNum.style.textAlign = 'center'
      pageNum.style.color = '#9ca3af'
      pageNum.style.fontSize = '12px'
      pageNum.style.margin = '10px 0 30px 0'
      previewContainer.appendChild(pageNum)
    }

    window.currentPreviewData = currentRecordingData

    const pageCounter = document.getElementById('previewPageCount')
    if (pageCounter) pageCounter.textContent = `${totalPages} page${totalPages > 1 ? 's' : ''}`
  } catch (e) {
    console.error('Error generating preview:', e)
    showNotification('Failed to generate preview: ' + e.message, 'error')
  }
}
