// ────────────────────── STATE ──────────────────────
let sections = [];
let selectedSectionId = null;
let idCounter = 0;
let activeTab = "layout";

// Undo/Redo
let historyStack = [];
let historyIndex = -1;
const MAX_HISTORY = 30;
let editingSnapshotTaken = false;

// Dirty tracking & auto-save
let isDirty = false;
let autoSaveInterval = null;
const AUTO_SAVE_DELAY_MS = 30000;
let _autoSaveToastPending = false;

// ─────────── Variable picker: available substitutions ───────────
const BASE_VARS = {
  Student: [
    { key: "student_name", label: "Student Name" },
    { key: "student_name_upper", label: "Student Name (UPPERCASE)" },
    { key: "class_name", label: "Class Name" },
    { key: "admission_number", label: "Admission Number" },
    { key: "gender", label: "Gender" },
  ],
  School: [
    { key: "school_name", label: "School Name" },
    { key: "school_name_upper", label: "School Name (UPPERCASE)" },
    { key: "school_address", label: "School Address" },
    { key: "school_phone", label: "School Phone" },
    { key: "school_motto", label: "School Motto" },
    { key: "school_logo", label: "School Logo URL" },
  ],
  Term: [
    { key: "term_name", label: "Term Name" },
    { key: "academic_session", label: "Academic Session" },
  ],
  Results: [
    { key: "position", label: "Position (raw number)" },
    { key: "position_formatted", label: "Position (formatted, e.g. 3rd)" },
    { key: "total_students", label: "Total Students" },
    { key: "overall_total", label: "Overall Total Score" },
    { key: "overall_max", label: "Overall Max Score" },
    { key: "overall_percentage", label: "Overall Percentage" },
    { key: "overall_grade", label: "Overall Grade" },
    { key: "overall_remark", label: "Overall Remark" },
  ],
};

function buildAvailableVars() {
  const vars = {};
  Object.keys(BASE_VARS).forEach(cat => {
    vars[cat] = BASE_VARS[cat].slice();
  });
  const traitDefs = window.STUDIO_DATA?.schoolData?.trait_definitions;
  if (traitDefs && traitDefs.length > 0) {
    vars["Traits"] = [];
    traitDefs.forEach(t => {
      const key = `trait_${t.name.toLowerCase().replace(/\s+/g, "_")}`;
      vars["Traits"].push({ key, label: `${t.name}` });
      vars["Traits"].push({ key: `${key}_max`, label: `${t.name} (max)` });
    });
  }
  const custom = getCustomVars();
  const customKeys = Object.keys(custom);
  if (customKeys.length > 0) {
    vars["Custom"] = customKeys.map(k => ({ key: k, label: custom[k] }));
  }
  return vars;
}

let AVAILABLE_VARS = buildAvailableVars();

// ─────────── Custom Variables ───────────

function getCustomVars() {
  const configId = window.STUDIO_DATA?.currentConfigId;
  const configs = window.STUDIO_DATA?.configs || [];
  const cfg = configs.find(c => c.config_id === configId);
  if (!cfg) return {};
  const lc = typeof cfg.layout_config === 'string' ? JSON.parse(cfg.layout_config) : (cfg.layout_config || {});
  return lc.custom_variables || {};
}

function renderCustomVars() {
  const vars = getCustomVars();
  const keys = Object.keys(vars);
  const container = document.getElementById('custom-vars-list');
  if (!container) return;
  if (!keys.length) {
    container.innerHTML = '<p class="text-[10px] text-gray-400 italic">No custom variables defined.</p>';
    return;
  }
  container.innerHTML = keys.map(k => `
    <div class="flex items-center gap-1 group">
      <code class="flex-1 text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded truncate" title="${vars[k]}">{${k}}</code>
      <span class="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[60px]">${vars[k]}</span>
      <button onclick="removeCustomVar('${k}')" class="text-red-400 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-all">&times;</button>
    </div>
  `).join('');
}

function addCustomVar() {
  const nameInput = document.getElementById('custom-var-name');
  const valInput = document.getElementById('custom-var-value');
  const name = nameInput.value.trim().toLowerCase().replace(/\s+/g, '_');
  const val = valInput.value.trim();
  if (!name) { toast('Variable name required', 'error'); return; }
  if (!val) { toast('Variable value required', 'error'); return; }

  const configId = window.STUDIO_DATA?.currentConfigId;
  const configs = window.STUDIO_DATA?.configs || [];
  const cfgIdx = configs.findIndex(c => c.config_id === configId);
  if (cfgIdx === -1) { toast('No active config', 'error'); return; }

  const cfg = configs[cfgIdx];
  const lc = typeof cfg.layout_config === 'string' ? JSON.parse(cfg.layout_config) : (cfg.layout_config || {});
  if (!lc.custom_variables) lc.custom_variables = {};
  lc.custom_variables[name] = val;
  cfg.layout_config = lc;
  nameInput.value = '';
  valInput.value = '';
  renderCustomVars();
  AVAILABLE_VARS = buildAvailableVars();
  markDirty();
  scheduleAutoSave();
}

function removeCustomVar(name) {
  const configId = window.STUDIO_DATA?.currentConfigId;
  const configs = window.STUDIO_DATA?.configs || [];
  const cfgIdx = configs.findIndex(c => c.config_id === configId);
  if (cfgIdx === -1) return;
  const cfg = configs[cfgIdx];
  const lc = typeof cfg.layout_config === 'string' ? JSON.parse(cfg.layout_config) : (cfg.layout_config || {});
  if (lc.custom_variables) delete lc.custom_variables[name];
  cfg.layout_config = lc;
  renderCustomVars();
  AVAILABLE_VARS = buildAvailableVars();
  markDirty();
  scheduleAutoSave();
}

function markDirty() {
  if (!isDirty) isDirty = true;
}

function clearDirty() {
  isDirty = false;
}

function showAutoSaveIndicator() {
  if (_autoSaveToastPending) return;
  _autoSaveToastPending = true;
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = "Auto-saved ✓";
  t.style.opacity = "1";
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => {
    t.style.opacity = "0";
    _autoSaveToastPending = false;
  }, 1000);
}

function startAutoSave() {
  stopAutoSave();
  autoSaveInterval = setInterval(() => {
    try {
      if (isDirty) {
        saveToServer(true);
        showAutoSaveIndicator();
      }
    } catch (e) {
      console.warn("Auto-save error:", e);
    }
  }, AUTO_SAVE_DELAY_MS);
}

function stopAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
}

window.addEventListener("beforeunload", (e) => {
  if (isDirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});

// CSRF-aware fetch helper
function csrfFetch(url, options = {}) {
  const token = window.STUDIO_DATA?.csrfToken;
  if (token) {
    options.headers = { ...(options.headers || {}), "X-CSRFToken": token };
  }
  return fetch(url, options);
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─────────── Section Model ───────────

function getSectionDefs() {
  return [
    { type: "school-header", label: "Header", icon: "school", defaultProps: {
      bgColor: "#0f1d45", color: "#ffffff", schoolName: "SCHOOL NAME",
      schoolSub: "Address Line", reportTitle: "ACADEMIC PROGRESS REPORT"
    }},
    { type: "student-info", label: "Student Info", icon: "person", defaultProps: {
      fields: [
        { label: "Student Name", value: "{student_name}" },
        { label: "Class", value: "{class_name}" },
        { label: "Term", value: "{term_name}" },
        { label: "Session", value: "{academic_session}" },
      ]
    }},
    { type: "grades", label: "Grades Table", icon: "table_chart", defaultProps: {
      title: "Subject Performance", headerBg: "#1a2744", headerColor: "#ffffff",
      alternatingRows: true,
      rows: [
        { subject: "Mathematics", score: "92", grade: "A", remark: "Excellent" },
        { subject: "English", score: "85", grade: "B", remark: "Very Good" },
      ]
    }},
    { type: "traits", label: "Traits", icon: "psychology", defaultProps: {
      title: "Affective Traits",
    }},
    { type: "attendance", label: "Attendance", icon: "fact_check", defaultProps: {
      present: "78", absent: "4", late: "2"
    }},
    { type: "comments", label: "Comments", icon: "chat", defaultProps: {
      title: "Teacher's Comment", text: "Comment text here..."
    }},
    { type: "signature", label: "Signatures", icon: "draw", defaultProps: {
      sigs: ["Class Teacher's Signature", "Principal's Signature", "Parent / Guardian"]
    }},
    { type: "text", label: "Text Block", icon: "text_fields", defaultProps: { text: "Text content here" }},
    { type: "divider", label: "Divider", icon: "horizontal_rule", defaultProps: { lineColor: "#e5e7eb" }},
    { type: "image", label: "Image", icon: "image", defaultProps: { imgSrc: null }},
    { type: "custom", label: "Custom HTML", icon: "code", defaultProps: { content: "" }},
  ];
}

function getSectionLabel(type) {
  const def = getSectionDefs().find(d => d.type === type);
  return def ? def.label : type;
}

function createSection(type) {
  const def = getSectionDefs().find(d => d.type === type);
  const id = "sec_" + (++idCounter);
  return {
    id,
    type,
    name: def ? def.label : type,
    visible: true,
    bgColor: "",
    textColor: "",
    fontSize: "",
    padding: "",
    border: "",
    borderRadius: "",
    ...(def ? def.defaultProps : {}),
  };
}

// ─────────── Undo/Redo ───────────

function getStateSnapshot() {
  return JSON.parse(JSON.stringify(sections));
}

function saveSnapshot() {
  if (historyIndex < historyStack.length - 1) {
    historyStack = historyStack.slice(0, historyIndex + 1);
  }
  historyStack.push(getStateSnapshot());
  historyIndex++;
  if (historyStack.length > MAX_HISTORY) {
    historyStack.shift();
    historyIndex--;
  }
  markDirty();
}

function undo() {
  if (historyIndex <= 0) return;
  historyIndex--;
  sections = JSON.parse(JSON.stringify(historyStack[historyIndex]));
  selectedSectionId = sections.length > 0 ? sections[0].id : null;
  renderSectionList();
  renderPreview();
  if (selectedSectionId) populateSectionProperties(getSection(selectedSectionId));
  else showEmptyProps();
  editingSnapshotTaken = false;
  toast("Undo");
}

function redo() {
  if (historyIndex >= historyStack.length - 1) return;
  historyIndex++;
  sections = JSON.parse(JSON.stringify(historyStack[historyIndex]));
  selectedSectionId = sections.length > 0 ? sections[0].id : null;
  renderSectionList();
  renderPreview();
  if (selectedSectionId) populateSectionProperties(getSection(selectedSectionId));
  else showEmptyProps();
  editingSnapshotTaken = false;
  toast("Redo");
}

document.addEventListener("focusin", (e) => {
  if (e.target.closest('input, textarea, select, [contenteditable="true"]')) {
    if (!editingSnapshotTaken) {
      saveSnapshot();
      editingSnapshotTaken = true;
    }
  }
});

document.addEventListener("blur", (e) => {
  if (e.target.closest('input, textarea, select, [contenteditable="true"]')) {
    editingSnapshotTaken = false;
  }
}, true);

// ─────────── Section CRUD ───────────

function getSection(id) {
  return sections.find(s => s.id === id);
}

function addSection(type) {
  saveSnapshot();
  const sec = createSection(type);
  sections.push(sec);
  selectSection(sec.id);
  toast(`${getSectionLabel(type)} added`);
}

function selectSection(id) {
  selectedSectionId = id;
  renderSectionList();
  const sec = getSection(id);
  if (sec) populateSectionProperties(sec);
  markDirty();
}

function deleteSection(id) {
  saveSnapshot();
  sections = sections.filter(s => s.id !== id);
  if (selectedSectionId === id) {
    selectedSectionId = sections.length > 0 ? sections[0].id : null;
  }
  renderSectionList();
  renderPreview();
  if (selectedSectionId) populateSectionProperties(getSection(selectedSectionId));
  else showEmptyProps();
  toast("Section deleted");
}

function moveSection(id, direction) {
  const idx = sections.findIndex(s => s.id === id);
  if (idx === -1) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= sections.length) return;
  saveSnapshot();
  [sections[idx], sections[newIdx]] = [sections[newIdx], sections[idx]];
  renderSectionList();
  renderPreview();
  markDirty();
}

function toggleSectionVisibility(id) {
  const sec = getSection(id);
  if (!sec) return;
  sec.visible = !sec.visible;
  renderSectionList();
  renderPreview();
  if (selectedSectionId === id) populateSectionProperties(sec);
  markDirty();
}

// ─────────── Rendering: Section List ───────────

function renderSectionList() {
  const list = document.getElementById("sectionList");
  if (!list) return;
  if (sections.length === 0) {
    list.innerHTML = '<p class="text-xs text-gray-400 italic p-2">No sections yet. Add one from the Components panel.</p>';
    return;
  }
  list.innerHTML = sections.map((s, i) => {
    const def = getSectionDefs().find(d => d.type === s.type);
    const icon = def ? def.icon : "widgets";
    const isSelected = s.id === selectedSectionId;
    return `
      <div class="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-primary/10 ring-1 ring-primary/30 text-primary' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'}"
           onclick="selectSection('${s.id}')">
        <span class="material-symbols-outlined text-lg ${isSelected ? 'text-primary' : 'text-gray-400'}">${icon}</span>
        <span class="flex-1 text-sm font-medium truncate">${esc(s.name)}</span>
        <button onclick="event.stopPropagation();toggleSectionVisibility('${s.id}')"
                class="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                title="${s.visible ? 'Visible' : 'Hidden'}">
          <span class="material-symbols-outlined text-sm ${s.visible ? 'text-gray-500' : 'text-gray-300'}">${s.visible ? 'visibility' : 'visibility_off'}</span>
        </button>
        ${i > 0 ? `<button onclick="event.stopPropagation();moveSection('${s.id}', -1)" class="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition" title="Move up"><span class="material-symbols-outlined text-sm text-gray-400">arrow_upward</span></button>` : ''}
        ${i < sections.length - 1 ? `<button onclick="event.stopPropagation();moveSection('${s.id}', 1)" class="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition" title="Move down"><span class="material-symbols-outlined text-sm text-gray-400">arrow_downward</span></button>` : ''}
        <button onclick="event.stopPropagation();deleteSection('${s.id}')" class="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition" title="Delete">
          <span class="material-symbols-outlined text-sm text-red-400">close</span>
        </button>
      </div>
    `;
  }).join('');
}

// ─────────── Rendering: Preview Iframe ───────────

function renderPreview() {
  const frame = document.getElementById("previewFrame");
  if (!frame) return;
  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(generatePreviewHtml());
  doc.close();
}

function generatePreviewHtml() {
  const visibleSections = sections.filter(s => s.visible);
  const pageSize = document.getElementById("pageSize")?.value || "A4";
  const orientation = document.getElementById("pageOrientation")?.value || "portrait";
  const margin = document.getElementById("pageMargin")?.value || "8mm";

  const width = pageSize === "Letter" ? "216mm" : "210mm";
  const height = orientation === "landscape" ? "210mm" : "297mm";

  return `<!DOCTYPE html>
<html>
<head>
<style>
  @page { size: ${orientation === "landscape" ? "297mm 210mm" : "210mm 297mm"}; margin: ${margin}; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #1a1a1a; width: ${width}; min-height: ${height}; padding: ${margin}; }
  .section { margin-bottom: 8px; padding: 6px 10px; border-radius: 4px; position: relative; }
  .section.highlight { outline: 2px dashed #6366f1; outline-offset: 2px; }
  .school-header { text-align: center; padding: 20px; background: #0f1d45; color: #fff; }
  .school-header h1 { font-size: 18pt; margin-bottom: 4px; }
  .school-header .sub { font-size: 9pt; opacity: 0.85; }
  .school-header .title { font-size: 11pt; font-weight: 600; margin-top: 8px; }
  .student-info { display: flex; flex-wrap: wrap; gap: 4px 16px; padding: 8px 10px; }
  .student-info .field { width: calc(50% - 8px); display: flex; font-size: 9pt; }
  .student-info .field .label { font-weight: 700; min-width: 90px; color: #555; }
  .grades-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  .grades-table th { background: #1a2744; color: #fff; padding: 6px 8px; text-align: left; }
  .grades-table td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
  .grades-table tr:nth-child(even) td { background: #f9fafb; }
  .grades-table .alt-row td { background: #f3f4f6; }
  .attendance-grid { display: flex; gap: 12px; justify-content: center; padding: 8px; }
  .attendance-card { text-align: center; padding: 8px 20px; background: #f9fafb; border-radius: 6px; }
  .attendance-card .num { font-size: 22pt; font-weight: 700; }
  .attendance-card .lbl { font-size: 7pt; color: #666; }
  .comments { padding: 8px 10px; }
  .comments h3 { font-size: 10pt; margin-bottom: 6px; }
  .comments p { font-size: 9pt; line-height: 1.6; }
  .signatures { display: flex; justify-content: space-around; padding: 8px 10px; margin-top: 16px; }
  .signature-field { text-align: center; min-width: 120px; }
  .signature-line { border-top: 1px solid #333; width: 140px; margin: 0 auto 4px; }
  .signature-label { font-size: 8pt; color: #555; }
  .divider { padding: 4px 0; }
  .divider hr { border: none; border-top: 1px solid #e5e7eb; }
  .text-block { font-size: 9pt; line-height: 1.5; padding: 4px 0; }
  .traits-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  .traits-table th { background: #1a2744; color: #fff; padding: 6px 8px; text-align: left; }
  .traits-table td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
</style>
</head>
<body>
${visibleSections.map(s => renderSectionHtml(s)).join('\n')}
</body>
</html>`;
}

function renderSectionHtml(s) {
  const cls = s.id === selectedSectionId ? 'section highlight' : 'section';
  const style = [
    s.bgColor ? `background: ${s.bgColor}` : '',
    s.textColor ? `color: ${s.textColor}` : '',
    s.fontSize ? `font-size: ${s.fontSize}` : '',
    s.padding ? `padding: ${s.padding}` : '',
    s.border ? `border: ${s.border}` : '',
    s.borderRadius ? `border-radius: ${s.borderRadius}` : '',
  ].filter(Boolean).join('; ');

  switch (s.type) {
    case "school-header":
      return `<div class="${cls}" style="${style}"><div class="school-header" style="${s.bgColor ? 'background:'+s.bgColor : ''};${s.textColor ? 'color:'+s.textColor : ''};${s.borderRadius ? 'border-radius:'+s.borderRadius : ''}"><h1>${esc(s.schoolName)}</h1><div class="sub">${esc(s.schoolSub)}</div><div class="title">${esc(s.reportTitle)}</div></div></div>`;

    case "student-info":
      return `<div class="${cls}" style="${style}"><div class="student-info">${(s.fields || []).map(f => `<div class="field"><span class="label">${esc(f.label)}:</span><span>${esc(f.value)}</span></div>`).join('')}</div></div>`;

    case "grades":
      return `<div class="${cls}" style="${style}"><table class="grades-table"><thead><tr style="background:${s.headerBg || '#1a2744'};color:${s.headerColor || '#fff'}"><th>Subject</th><th style="text-align:center">Score</th><th style="text-align:center">Grade</th><th>Remark</th></tr></thead><tbody>${(s.rows || []).map(r => `<tr><td>${esc(r.subject)}</td><td style="text-align:center">${esc(r.score)}</td><td style="text-align:center">${esc(r.grade)}</td><td>${esc(r.remark)}</td></tr>`).join('')}</tbody></table></div>`;

    case "traits":
      return `<div class="${cls}" style="${style}"><h3 style="font-size:10pt;margin-bottom:4px">${esc(s.title || 'Affective Traits')}</h3><table class="traits-table"><thead><tr><th>Trait</th><th style="text-align:center">Score</th></tr></thead><tbody><tr><td colspan="2" style="text-align:center;color:#999;font-size:8pt">Trait data will be populated from student records</td></tr></tbody></table></div>`;

    case "attendance":
      return `<div class="${cls}" style="${style}"><h3 style="font-size:10pt;text-align:center;margin-bottom:4px">Attendance Summary</h3><div class="attendance-grid"><div class="attendance-card"><div class="num">${esc(s.present)}</div><div class="lbl">Days Present</div></div><div class="attendance-card"><div class="num">${esc(s.absent)}</div><div class="lbl">Days Absent</div></div><div class="attendance-card"><div class="num">${esc(s.late)}</div><div class="lbl">Days Late</div></div></div></div>`;

    case "comments":
      return `<div class="${cls}" style="${style}"><div class="comments"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div></div>`;

    case "signature":
      return `<div class="${cls}" style="${style}"><div class="signatures">${(s.sigs || []).map(sig => `<div class="signature-field"><div class="signature-line"></div><div class="signature-label">${esc(sig)}</div></div>`).join('')}</div></div>`;

    case "divider":
      return `<div class="${cls}" style="${style}"><div class="divider"><hr style="border-top-color:${s.lineColor || '#e5e7eb'}"></div></div>`;

    case "text":
      return `<div class="${cls}" style="${style}"><div class="text-block">${esc(s.text)}</div></div>`;

    case "custom":
      return `<div class="${cls}" style="${style}">${s.content || ''}</div>`;

    default:
      return `<div class="${cls}" style="${style}">${s.type}</div>`;
  }
}

// ─────────── Properties Panel ───────────

function populateSectionProperties(s) {
  if (!s) return;
  const setName = document.getElementById("propName");
  const setVisible = document.getElementById("propVisible");
  const setBgColor = document.getElementById("propBgColor");
  const setBg = document.getElementById("propBg");
  const setTextColor = document.getElementById("propTextColor");
  const setColor = document.getElementById("propColor");
  const setFontSize = document.getElementById("propFontSize");
  const setPadding = document.getElementById("propPadding");
  const setBorder = document.getElementById("propBorder");
  const setBorderRadius = document.getElementById("propBorderRadius");
  const content = document.getElementById("propertiesContent");
  const empty = document.getElementById("propertiesEmpty");

  if (empty) empty.style.display = "none";
  if (content) content.style.display = "block";
  if (content) content.classList.add("show");

  if (setName) setName.value = s.name || "";
  if (setVisible) setVisible.checked = s.visible !== false;
  if (setBgColor) setBgColor.value = s.bgColor || "#ffffff";
  if (setBg) setBg.value = s.bgColor || "";
  if (setTextColor) setTextColor.value = s.textColor || "#000000";
  if (setColor) setColor.value = s.textColor || "";
  if (setFontSize) setFontSize.value = s.fontSize || "";
  if (setPadding) setPadding.value = s.padding || "";
  if (setBorder) setBorder.value = s.border || "";
  if (setBorderRadius) setBorderRadius.value = s.borderRadius || "";

  // Show/hide component-specific panels
  const compPanel = document.getElementById("propComponents");
  const colPanel = document.getElementById("propColumns");
  const gradesPanel = document.getElementById("propGradesOptions");
  const customPanel = document.getElementById("propCustomContent");

  if (compPanel) {
    if (s.type === "grades" || s.type === "student-info" || s.type === "school-header") {
      compPanel.style.display = "block";
      renderComponentFields(s);
    } else {
      compPanel.style.display = "none";
    }
  }
  if (colPanel) colPanel.style.display = "none";
  if (gradesPanel) {
    gradesPanel.style.display = s.type === "grades" ? "block" : "none";
    if (s.type === "grades") {
      const hcInput = document.getElementById("propHeaderColor");
      const hcText = document.getElementById("propHeaderColorText");
      const altRows = document.getElementById("propAlternatingRows");
      if (hcInput) hcInput.value = s.headerBg || "#1a2744";
      if (hcText) hcText.value = s.headerBg || "#1a2744";
      if (altRows) altRows.checked = s.alternatingRows !== false;
    }
  }
  if (customPanel) {
    customPanel.style.display = s.type === "custom" ? "block" : "none";
    const contentEl = document.getElementById("propContent");
    if (contentEl) contentEl.value = s.content || "";
  }
}

function showEmptyProps() {
  const content = document.getElementById("propertiesContent");
  const empty = document.getElementById("propertiesEmpty");
  if (empty) empty.style.display = "block";
  if (content) {
    content.style.display = "none";
    content.classList.remove("show");
  }
}

function renderComponentFields(s) {
  const list = document.getElementById("propComponentsList");
  if (!list) return;
  if (s.type === "grades") {
    list.innerHTML = `<div class="text-xs text-gray-500">Manage grade rows in the preview panel.</div>`;
  } else if (s.type === "student-info") {
    list.innerHTML = (s.fields || []).map((f, i) => `
      <div class="flex gap-1 mb-1">
        <input type="text" class="flex-1 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-[10px] focus:ring-1 focus:ring-primary outline-none"
               value="${esc(f.label)}" placeholder="Label"
               onchange="updateStudentField('${s.id}',${i},'label',this.value)">
        <input type="text" class="flex-1 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-[10px] focus:ring-1 focus:ring-primary outline-none"
               value="${esc(f.value)}" placeholder="Value"
               onchange="updateStudentField('${s.id}',${i},'value',this.value)">
      </div>
    `).join('');
  } else if (s.type === "school-header") {
    list.innerHTML = `
      <div class="mb-1">
        <label class="text-[10px] text-gray-500">School Name</label>
        <input type="text" class="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-xs focus:ring-1 focus:ring-primary outline-none"
               value="${esc(s.schoolName)}" onchange="updateSectionField('${s.id}','schoolName',this.value)">
      </div>
      <div class="mb-1">
        <label class="text-[10px] text-gray-500">Subtitle</label>
        <input type="text" class="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-xs focus:ring-1 focus:ring-primary outline-none"
               value="${esc(s.schoolSub)}" onchange="updateSectionField('${s.id}','schoolSub',this.value)">
      </div>
      <div class="mb-1">
        <label class="text-[10px] text-gray-500">Report Title</label>
        <input type="text" class="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-xs focus:ring-1 focus:ring-primary outline-none"
               value="${esc(s.reportTitle)}" onchange="updateSectionField('${s.id}','reportTitle',this.value)">
      </div>
    `;
  }
}

function updateSectionField(id, key, value) {
  const s = getSection(id);
  if (!s) return;
  s[key] = value;
  renderPreview();
  markDirty();
  scheduleAutoSave();
}

function updateStudentField(id, idx, key, value) {
  const s = getSection(id);
  if (!s || !s.fields || !s.fields[idx]) return;
  s.fields[idx][key] = value;
  renderPreview();
  markDirty();
  scheduleAutoSave();
}

// Property change handlers
function onPropNameChange(v) {
  const s = getSection(selectedSectionId);
  if (!s) return;
  s.name = v;
  renderSectionList();
  markDirty();
  scheduleAutoSave();
}
function onPropVisibleChange(v) {
  const s = getSection(selectedSectionId);
  if (!s) return;
  s.visible = v;
  renderSectionList();
  renderPreview();
  markDirty();
  scheduleAutoSave();
}
function onPropBgColorChange(v) {
  const s = getSection(selectedSectionId);
  if (!s) return;
  s.bgColor = v;
  const bg = document.getElementById("propBg");
  if (bg) bg.value = v;
  renderPreview();
  markDirty();
  scheduleAutoSave();
}
function onPropBgChange(v) {
  const s = getSection(selectedSectionId);
  if (!s) return;
  s.bgColor = v;
  const bgc = document.getElementById("propBgColor");
  if (bgc) bgc.value = v;
  renderPreview();
  markDirty();
  scheduleAutoSave();
}
function onPropTextColorChange(v) {
  const s = getSection(selectedSectionId);
  if (!s) return;
  s.textColor = v;
  const col = document.getElementById("propColor");
  if (col) col.value = v;
  renderPreview();
  markDirty();
  scheduleAutoSave();
}
function onPropColorChange(v) {
  const s = getSection(selectedSectionId);
  if (!s) return;
  s.textColor = v;
  const tc = document.getElementById("propTextColor");
  if (tc) tc.value = v;
  renderPreview();
  markDirty();
  scheduleAutoSave();
}
function onPropFontSizeChange(v) {
  const s = getSection(selectedSectionId);
  if (!s) return;
  s.fontSize = v;
  renderPreview();
  markDirty();
  scheduleAutoSave();
}
function onPropPaddingChange(v) {
  const s = getSection(selectedSectionId);
  if (!s) return;
  s.padding = v;
  renderPreview();
  markDirty();
  scheduleAutoSave();
}
function onPropBorderChange(v) {
  const s = getSection(selectedSectionId);
  if (!s) return;
  s.border = v;
  renderPreview();
  markDirty();
  scheduleAutoSave();
}
function onPropBorderRadiusChange(v) {
  const s = getSection(selectedSectionId);
  if (!s) return;
  s.borderRadius = v;
  renderPreview();
  markDirty();
  scheduleAutoSave();
}

// Grades options
function onHeaderColorChange(v) {
  const s = getSection(selectedSectionId);
  if (!s || s.type !== "grades") return;
  s.headerBg = v;
  const ht = document.getElementById("propHeaderColorText");
  if (ht) ht.value = v;
  renderPreview();
  markDirty();
  scheduleAutoSave();
}
function onHeaderColorTextChange(v) {
  const s = getSection(selectedSectionId);
  if (!s || s.type !== "grades") return;
  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
    s.headerBg = v;
    const hc = document.getElementById("propHeaderColor");
    if (hc) hc.value = v;
    renderPreview();
    markDirty();
    scheduleAutoSave();
  }
}
function onAlternatingRowsChange(v) {
  const s = getSection(selectedSectionId);
  if (!s || s.type !== "grades") return;
  s.alternatingRows = v;
  renderPreview();
  markDirty();
  scheduleAutoSave();
}

// Custom content
function onPropContentChange(v) {
  const s = getSection(selectedSectionId);
  if (!s || s.type !== "custom") return;
  s.content = v;
  renderPreview();
  markDirty();
  scheduleAutoSave();
}

// ─────────── Server Save/Load ───────────

function saveToServer(silent) {
  const configId = window.STUDIO_DATA?.currentConfigId;
  try {
    const data = {
      config_id: configId,
      sections: sections,
      idCounter: idCounter,
      custom_variables: getCustomVars(),
    };
    return csrfFetch("/reports/api/layouts/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then(res => {
        if (!res.ok) return res.json().then(err => { throw new Error(err.error || "Save failed"); });
        return res.json();
      })
      .then(result => {
        if (result.success) {
          clearDirty();
          if (!silent) toast("Design saved ✓");
          if (typeof refreshConfigList === "function") refreshConfigList();
        } else {
          if (!silent) toast("Save failed", "error");
        }
      })
      .catch(err => {
        console.warn("Save error:", err);
        if (!silent) toast("Save failed", "error");
      });
  } catch (e) {
    console.error("Save error:", e);
    if (!silent) toast("Save failed", "error");
  }
}

function loadFromServer(configId) {
  fetch(`/reports/api/layouts/load/${configId}`)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(result => {
      if (result.success && result.layout_config) {
        const layoutConfig = result.layout_config;
        sections = layoutConfig.sections || [];
        idCounter = layoutConfig.idCounter || sections.length;

        // Restore custom variables
        if (layoutConfig.custom_variables) {
          const configs = window.STUDIO_DATA?.configs || [];
          const cfg = configs.find(c => c.config_id === configId);
          if (cfg) {
            const lc = typeof cfg.layout_config === 'string' ? JSON.parse(cfg.layout_config) : (cfg.layout_config || {});
            lc.custom_variables = layoutConfig.custom_variables;
            cfg.layout_config = lc;
          }
        }

        historyStack = [getStateSnapshot()];
        historyIndex = 0;
        selectedSectionId = sections.length > 0 ? sections[0].id : null;
        renderSectionList();
        renderPreview();
        if (selectedSectionId) populateSectionProperties(getSection(selectedSectionId));
        else showEmptyProps();
        renderCustomVars();
      } else {
        loadDefaults();
      }
    })
    .catch(() => loadDefaults());
}

function loadDefaults() {
  sections = [];
  ["school-header", "student-info", "grades", "traits", "attendance", "comments", "signature"].forEach(type => {
    sections.push(createSection(type));
  });
  historyStack = [getStateSnapshot()];
  historyIndex = 0;
  selectedSectionId = sections.length > 0 ? sections[0].id : null;
  renderSectionList();
  renderPreview();
  if (selectedSectionId) populateSectionProperties(getSection(selectedSectionId));
  else showEmptyProps();
}

function initFromServerData() {
  const configId = window.STUDIO_DATA?.currentConfigId;
  if (configId) {
    loadFromServer(configId);
  } else {
    loadDefaults();
  }
  startAutoSave();
}

// ─────────── Toast ───────────

function toast(msg, type = "success") {
  const t = document.getElementById("toast");
  if (!t) { console.warn("toast(): #toast element not found"); return; }
  _autoSaveToastPending = false;
  t.textContent = msg;
  t.style.opacity = "1";
  t.style.background = type === "error" ? "#ef4444" : "#1173d4";
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => { t.style.opacity = "0"; }, 2200);
}

function scheduleAutoSave() {
  if (!isDirty) return;
  if (autoSaveInterval) return;
  startAutoSave();
}

// ─────────── ReportLayoutEditor Bridge ───────────

window.ReportLayoutEditor = {
  undo,
  redo,

  addElement(type) {
    addSection(type);
  },

  deleteSelectedSection() {
    if (selectedSectionId) deleteSection(selectedSectionId);
  },

  publishChanges() {
    saveToServer(false);
  },

  zoomIn() {
    const wrapper = document.getElementById("canvasWrapper");
    if (!wrapper) return;
    const cur = parseFloat(wrapper.style.transform?.replace('scale(', '') || '1');
    const next = Math.min(cur + 0.1, 2);
    wrapper.style.transform = `scale(${next})`;
    document.getElementById("zoomLevel").textContent = Math.round(next * 100) + "%";
  },

  zoomOut() {
    const wrapper = document.getElementById("canvasWrapper");
    if (!wrapper) return;
    const cur = parseFloat(wrapper.style.transform?.replace('scale(', '') || '1');
    const next = Math.max(cur - 0.1, 0.5);
    wrapper.style.transform = `scale(${next})`;
    document.getElementById("zoomLevel").textContent = Math.round(next * 100) + "%";
  },
};

// ─────────── Keyboard Shortcuts ───────────

document.addEventListener("keydown", (e) => {
  if (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

  if (e.key === "Escape") {
    selectedSectionId = null;
    renderSectionList();
    showEmptyProps();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "z") {
    e.preventDefault();
    undo();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "y") {
    e.preventDefault();
    redo();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
    e.preventDefault();
    saveToServer(false);
  }
});

// ─────────── Property Panel Event Wiring ───────────

function wirePropertyHandlers() {
  const wire = (id, handler) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => {
        if (el.type === "checkbox") handler(el.checked);
        else handler(el.value);
      });
      el.addEventListener("input", () => {
        if (el.type !== "checkbox") handler(el.value);
      });
    }
  };
  wire("propName", onPropNameChange);
  wire("propVisible", onPropVisibleChange);
  wire("propBgColor", onPropBgColorChange);
  wire("propBg", onPropBgChange);
  wire("propTextColor", onPropTextColorChange);
  wire("propColor", onPropColorChange);
  wire("propFontSize", onPropFontSizeChange);
  wire("propPadding", onPropPaddingChange);
  wire("propBorder", onPropBorderChange);
  wire("propBorderRadius", onPropBorderRadiusChange);
  wire("propHeaderColor", onHeaderColorChange);
  wire("propHeaderColorText", onHeaderColorTextChange);
  wire("propAlternatingRows", onAlternatingRowsChange);
  wire("propContent", onPropContentChange);

  const pageSettings = ["pageSize", "pageOrientation", "pageMargin"];
  pageSettings.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", renderPreview);
  });
}

// ─────────── Init ───────────

wirePropertyHandlers();
initFromServerData();
