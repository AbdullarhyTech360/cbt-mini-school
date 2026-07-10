let currentClassListData = null
let classListSortable = null

// All available class list fields with labels, in default order
const CLASS_LIST_FIELDS = [
  { field: 'first_name', label: 'First Name', defaultChecked: true },
  { field: 'last_name', label: 'Last Name', defaultChecked: true },
  { field: 'username', label: 'Username', defaultChecked: true },
  { field: 'register_number', label: 'Register Number', defaultChecked: true },
  { field: 'admission_number', label: 'Admission No.', defaultChecked: true },
  { field: 'email', label: 'Email', defaultChecked: false },
  { field: 'gender', label: 'Gender', defaultChecked: false },
  { field: 'dob', label: 'Date of Birth', defaultChecked: false },
  { field: 'parent_name', label: 'Parent Name', defaultChecked: false },
  { field: 'parent_phone', label: 'Parent Phone', defaultChecked: false },
  { field: 'parent_email', label: 'Parent Email', defaultChecked: false },
  { field: 'blood_group', label: 'Blood Group', defaultChecked: false },
  { field: 'address', label: 'Address', defaultChecked: false },
]

// Initialize the sortable field list
function initClassListSortable() {
  const container = document.getElementById('class-list-fields-sortable')
  if (!container) return

  // Populate from field definitions
  container.innerHTML = CLASS_LIST_FIELDS.map(f => `
    <div class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors sortable-item" data-field="${f.field}">
      <span class="material-symbols-outlined text-base text-gray-400 dark:text-gray-500 drag-handle" style="cursor:grab;">drag_indicator</span>
      <input type="checkbox" class="class-list-field w-4 h-4 rounded text-blue-600 focus:ring-blue-500" data-field="${f.field}" ${f.defaultChecked ? 'checked' : ''}>
      <span class="text-xs font-medium text-gray-700 dark:text-gray-300">${f.label}</span>
    </div>
  `).join('')

  // Initialize SortableJS
  if (typeof Sortable !== 'undefined') {
    classListSortable = new Sortable(container, {
      handle: '.drag-handle',
      animation: 150,
      ghostClass: 'opacity-30',
      dragClass: 'shadow-lg',
      filter: '.sortable-item-disabled',
    })
  }
}

// Run on DOMContentLoaded if the sortable container exists
document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('class-list-fields-sortable')) {
    initClassListSortable()
  }
})

// Load classes into the class list dropdown
window.loadClassesForClassList = async function () {
  const select = document.getElementById('class-list-class')
  if (!select || select.options.length > 1) return

  select.innerHTML = '<option value="">Loading...</option>'
  select.disabled = true

  try {
    const response = await fetch('/reports/api/classes')
    const data = await response.json()

    if (data.success) {
      select.innerHTML = '<option value="">Select Class</option>'
      data.classes.forEach(cls => {
        const option = document.createElement('option')
        option.value = cls.class_room_id
        option.textContent = cls.class_name
        select.appendChild(option)
      })
    } else {
      select.innerHTML = '<option value="">No classes found</option>'
    }
  } catch (error) {
    console.error('Error loading classes:', error)
    select.innerHTML = '<option value="">Error loading classes</option>'
    showNotification('Failed to load classes', 'error')
  } finally {
    select.disabled = false
  }
}

// Check all field toggles
window.checkAllClassListFields = function () {
  document.querySelectorAll('.class-list-field').forEach(cb => cb.checked = true)
}

// Uncheck all field toggles
window.uncheckAllClassListFields = function () {
  document.querySelectorAll('.class-list-field').forEach(cb => cb.checked = false)
}

// Get selected fields from checkboxes
function getSelectedFields() {
  const fields = []
  document.querySelectorAll('.class-list-field:checked').forEach(cb => {
    fields.push(cb.dataset.field)
  })
  return fields
}

// Get friendly column header for a field key
function getFieldLabel(field) {
  const labels = {
    sn: 'S/N',
    first_name: 'First Name',
    last_name: 'Last Name',
    username: 'Username',
    register_number: 'Register No.',
    email: 'Email',
    gender: 'Gender',
    dob: 'Date of Birth',
    admission_number: 'Admission No.',
    parent_name: 'Parent Name',
    parent_phone: 'Parent Phone',
    parent_email: 'Parent Email',
    blood_group: 'Blood Group',
    address: 'Address',
  }
  return labels[field] || field
}

// Format a field value for display
function formatFieldValue(field, value) {
  if (value === null || value === undefined || value === '') return '-'
  if (field === 'dob' && value) {
    try {
      const d = new Date(value)
      return d.toLocaleDateString('en-GB')
    } catch { return value }
  }
  return value
}

// Generate the class list table HTML
// innerOnly=true returns just <style> + body content (no html/head/body wrappers)
function generateClassListHTML(students, fields, metadata, style, innerOnly) {
  const fieldLabels = fields.map(f => getFieldLabel(f))
  style = style || 'default'

  const schoolName = metadata.school_name || 'School Name'
  const schoolAddress = metadata.school_address || ''
  const schoolMotto = metadata.school_motto || ''
  const logoPath = metadata.school_logo ? '/' + metadata.school_logo.replace(/^\/+/, '') : ''
  const initial = (schoolName.charAt(0) || 'S').toUpperCase()

  function logoHtml(cssClass) {
    if (logoPath) {
      return `<img class="${cssClass}" src="${logoPath}" alt="">`
    }
    return `<div class="${cssClass} logo-placeholder">${initial}</div>`
  }

  let headerHtml
  if (style === 'default2') {
    headerHtml = `
      <div class="header-banner">
        ${logoHtml('header-logo')}
        <div>
          <h1 class="school-name">${schoolName}</h1>
          <p class="school-motto">${schoolMotto || 'Excellence in Education'}</p>
          <p class="school-sub">Class List &mdash; ${metadata.class_name} &bull; ${metadata.total_students} Students</p>
        </div>
      </div>`
  } else {
    headerHtml = `
      <div class="header-banner">
        ${logoHtml('header-logo-center')}
        <h1 class="school-name">${schoolName}</h1>
        <p class="school-address">${schoolAddress}</p>
        <p class="school-motto">${schoolMotto || 'Excellence in Education'}</p>
        <div class="header-title-row">
          <span class="title-badge">Class List &mdash; ${metadata.class_name}</span>
          <span class="title-badge">${metadata.total_students} Students</span>
        </div>
      </div>`
  }

  const css = style === 'default2' ? `
      @page { size: A4 landscape; margin: 0.3in; }
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 0; padding: 24px; color: #1a1a1a;
      }
      .header-banner {
        margin-bottom: 28px;
        padding-bottom: 20px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        align-items: center;
        gap: 20px;
      }
      .header-logo {
        flex-shrink: 0; width: 56px; height: 56px;
        border-radius: 10px; object-fit: cover;
      }
      .logo-placeholder {
        background: #111; color: white;
        display: flex; align-items: center; justify-content: center;
        font-size: 22px; font-weight: 700;
      }
      .school-name { font-size: 22px; font-weight: 700; margin: 0; color: #111; letter-spacing: -0.3px; }
      .school-motto { font-size: 12px; margin: 3px 0 0 0; color: #6b7280; font-style: italic; }
      .school-sub { font-size: 12px; margin: 4px 0 0 0; color: #6b7280; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th {
        background: #f3f4f6; color: #374151; padding: 9px 8px; text-align: left;
        font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;
        white-space: nowrap; border-bottom: 2px solid #d1d5db;
      }
      th.sn-cell { width: 30px; text-align: center; }
      td {
        padding: 8px; border-bottom: 1px solid #e5e7eb; color: #374151;
        font-size: 10.5px; vertical-align: middle;
      }
      td.sn-cell { text-align: center; font-weight: 600; color: #9ca3af; }
      tbody tr:last-child td { border-bottom: none; }
      .footer { margin-top: 24px; font-size: 10px; color: #9ca3af; text-align: center; padding-top: 12px; border-top: 1px solid #f3f4f6; }
` : `
      @page { size: A4 landscape; margin: 0.3in; }
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 0; padding: 24px; color: #1a1a1a;
      }
      .header-banner {
        text-align: center;
        margin-bottom: 28px;
        padding-bottom: 20px;
        border-bottom: 1px solid #e5e7eb;
      }
      .header-logo-center {
        width: 56px; height: 56px;
        border-radius: 10px; object-fit: cover;
        margin: 0 auto 12px auto; display: block;
      }
      .logo-placeholder {
        background: #111; color: white; line-height: 56px;
        font-size: 22px; font-weight: 700;
      }
      .school-name { font-size: 22px; font-weight: 700; margin: 0 0 1px 0; color: #111; letter-spacing: -0.3px; }
      .school-address { font-size: 11px; color: #6b7280; margin: 0 0 4px 0; }
      .school-motto { font-size: 12px; color: #6b7280; margin: 0 0 14px 0; font-style: italic; }
      .header-title-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
      .title-badge {
        background: #f3f4f6; color: #374151; padding: 4px 14px; border-radius: 4px;
        font-size: 10px; font-weight: 600; letter-spacing: 0.3px;
      }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th {
        background: #f9fafb; color: #374151; padding: 9px 8px; text-align: left;
        font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;
        white-space: nowrap; border-bottom: 2px solid #e5e7eb;
      }
      th.sn-cell { width: 30px; text-align: center; }
      td {
        padding: 8px; border-bottom: 1px solid #f3f4f6; color: #374151;
        font-size: 10.5px; vertical-align: middle;
      }
      td.sn-cell { text-align: center; font-weight: 600; color: #d1d5db; }
      tbody tr:last-child td { border-bottom: none; }
      .footer { margin-top: 24px; font-size: 10px; color: #9ca3af; text-align: center; padding-top: 12px; border-top: 1px solid #f3f4f6; }
`

  const bodyContent = `
    ${headerHtml}
    <table>
      <thead>
        <tr>
          ${fields.map((f, i) => `<th class="${f === 'sn' ? 'sn-cell' : ''}">${fieldLabels[i]}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${students.map(student => `
          <tr>
            ${fields.map(f => `<td class="${f === 'sn' ? 'sn-cell' : ''}">${formatFieldValue(f, student[f])}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="footer">Generated by CBT Mini School System</div>`

  if (innerOnly) {
    return `<style>${css}</style>${bodyContent}`
  }

  let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Class List - ${metadata.class_name}</title>
    <style>${css}</style>
</head>
<body>${bodyContent}</body>
</html>`

  return html
}

// Render the class list table in the page
function renderClassListTable(students, fields, metadata) {
  const resultsDiv = document.getElementById('class-list-results')
  resultsDiv.classList.remove('hidden')

  document.getElementById('class-list-class-info').textContent = metadata.class_name
  document.getElementById('class-list-count').textContent = `(${metadata.total_students} students)`

  const fieldLabels = fields.map(f => getFieldLabel(f))

  const thead = document.getElementById('class-list-table-head')
  thead.innerHTML = `<tr>${fields.map((f, i) => `<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider${f === 'sn' ? ' text-center' : ''}">${fieldLabels[i]}</th>`).join('')}</tr>`

  const tbody = document.getElementById('class-list-table-body')
  tbody.innerHTML = students.map(student => `
    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30">
      ${fields.map(f => `<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300${f === 'sn' ? ' text-center font-medium' : ''}">${formatFieldValue(f, student[f])}</td>`).join('')}
    </tr>
  `).join('')

  const style = document.getElementById('class-list-style')?.value || 'default'
  currentClassListData = { students, fields, metadata, style }
}

// Generate class list
window.generateClassList = async function () {
  const classId = document.getElementById('class-list-class').value
  const fields = getSelectedFields()

  if (!classId) {
    showNotification('Please select a class', 'error')
    return
  }

  if (fields.length === 0) {
    showNotification('Please select at least one field to display', 'error')
    return
  }

  // Always include sn
  if (!fields.includes('sn')) {
    fields.unshift('sn')
  }

  const generateBtn = document.querySelector('button[onclick="generateClassList()"]')
  const originalHtml = generateBtn.innerHTML
  generateBtn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">progress_activity</span> Generating...'
  generateBtn.disabled = true

  try {
    const response = await fetch('/reports/api/class-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ class_room_id: classId, fields })
    })

    const data = await response.json()

    if (data.success) {
      renderClassListTable(data.students, fields, data.metadata)
      showNotification(`Class list generated - ${data.metadata.total_students} students found`, 'success')
    } else {
      throw new Error(data.error || 'Failed to load class list')
    }
  } catch (error) {
    console.error('Error generating class list:', error)
    showNotification('Error: ' + error.message, 'error')
  } finally {
    generateBtn.innerHTML = originalHtml
    generateBtn.disabled = false
  }
}

// Print class list - generates and downloads PDF directly
window.printClassList = async function () {
  if (!currentClassListData) {
    showNotification('Please generate a class list first', 'error')
    return
  }

  const { students, fields, metadata, style } = currentClassListData

  const btn = document.querySelector('button[onclick="printClassList()"]')
  const originalHtml = btn.innerHTML
  btn.innerHTML = '<span class="material-symbols-outlined text-lg animate-spin">progress_activity</span> Generating PDF...'
  btn.disabled = true

  try {
    if (typeof html2pdf === 'undefined') {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
        s.onload = resolve
        s.onerror = reject
        document.head.appendChild(s)
      })
    }

    const html = generateClassListHTML(students, fields, metadata, style, true)

    const element = document.createElement('div')
    element.style.position = 'relative'
    element.style.left = '0'
    element.style.top = '0'
    element.style.backgroundColor = 'white'
    element.style.width = '1123px'
    element.style.zIndex = '9999'
    element.id = 'class-list-pdf-temp'
    document.body.appendChild(element)
    element.innerHTML = html

    const name = `Class_List_${metadata.class_name.replace(/\s+/g, '_')}.pdf`

    const opt = {
      margin: [0.15, 0.15, 0.15, 0.15],
      filename: name,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      },
      pagebreak: { mode: ['css'], before: [], after: [], avoid: ['tr', 'th', 'td', 'table'] },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape', compress: true }
    }

    await html2pdf().set(opt).from(element).save()

    document.body.removeChild(element)
    showNotification('PDF downloaded successfully', 'success')
  } catch (error) {
    console.error('Error generating PDF:', error)
    showNotification('Failed to generate PDF: ' + error.message, 'error')
  } finally {
    btn.innerHTML = originalHtml
    btn.disabled = false
  }
}

// Preview / Download PDF using html2canvas
window.previewClassListPDF = async function () {
  if (!currentClassListData) {
    showNotification('Please generate a class list first', 'error')
    return
  }

  const { students, fields, metadata, style } = currentClassListData

  try {
    if (typeof html2canvas === 'undefined') {
      await loadHtml2Canvas()
    }

    let modal = document.getElementById('canvasPdfPreviewModal')
    if (!modal) {
      modal = createCanvasPreviewModal()
    }

    const html = generateClassListHTML(students, fields, metadata, style)

    const tempDiv = document.createElement('div')
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    tempDiv.style.top = '0'
    tempDiv.style.width = '297mm'
    tempDiv.style.backgroundColor = 'white'
    tempDiv.innerHTML = html
    document.body.appendChild(tempDiv)

    const previewContainer = document.getElementById('canvasPreviewContent')
    previewContainer.innerHTML = `
      <div class="preview-loading">
        <div class="preview-loading-spinner"></div>
        <p style="margin-top: 16px; color: #6b7280;">Generating preview...</p>
      </div>`

    modal.classList.remove('hidden')

    await waitForResources(tempDiv)

    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: tempDiv.scrollWidth,
      windowHeight: tempDiv.scrollHeight,
    })

    const a4HeightPx = 210 * 3.7795275591 * 2
    const totalPages = Math.ceil(canvas.height / a4HeightPx)

    previewContainer.innerHTML = ''

    for (let page = 0; page < totalPages; page++) {
      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = Math.min(a4HeightPx, canvas.height - page * a4HeightPx)
      pageCanvas.style.width = '297mm'
      pageCanvas.style.height = 'auto'
      pageCanvas.style.display = 'block'
      pageCanvas.style.margin = '20px auto'
      pageCanvas.style.boxShadow = '0 0 50px rgba(0, 0, 0, 0.3)'
      pageCanvas.style.backgroundColor = 'white'

      const ctx = pageCanvas.getContext('2d')
      ctx.drawImage(canvas, 0, page * a4HeightPx, canvas.width, pageCanvas.height, 0, 0, pageCanvas.width, pageCanvas.height)

      previewContainer.appendChild(pageCanvas)

      const pageNum = document.createElement('div')
      pageNum.textContent = `Page ${page + 1} of ${totalPages}`
      pageNum.style.textAlign = 'center'
      pageNum.style.color = '#9ca3af'
      pageNum.style.fontSize = '12px'
      pageNum.style.margin = '10px 0 30px 0'
      previewContainer.appendChild(pageNum)
    }

    window.currentPreviewData = { students, fields, metadata }

    document.body.removeChild(tempDiv)

    const pageCounter = document.getElementById('previewPageCount')
    if (pageCounter) {
      pageCounter.textContent = `${totalPages} page${totalPages > 1 ? 's' : ''}`
    }
  } catch (error) {
    console.error('Error generating class list PDF preview:', error)
    showNotification('Failed to generate preview: ' + error.message, 'error')
  }
}
