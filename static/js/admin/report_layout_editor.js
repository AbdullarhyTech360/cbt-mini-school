/*
 * Report Layout Editor v2 — Fully interactive WYSIWYG editor for report card layouts.
 * Real-time bidirectional sync, inline editing, validation, auto-save, publish workflow.
 */

const ReportLayoutEditor = (function () {
  // ── State ──────────────────────────────────────────────
  let currentConfigId = null;
  let layoutConfig = null;
  let selectedIndex = null;
  let zoom = 1;
  let undoStack = [];
  let redoStack = [];
  let isUpdatingFromCode = false; // guard to prevent loops during programmatic updates

  const DRAFT_KEY_PREFIX = "report_layout_draft_";
  const DEFAULT_SECTIONS = [
    {
      id: "header",
      type: "header",
      visible: true,
      order: 1,
      style: {
        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
        color: "#ffffff",
        padding: "10px 15px",
        border_radius: "6px 6px 0 0",
      },
      components: [
        "school_logo",
        "school_name",
        "school_address",
        "report_title",
        "term",
      ],
    },
    {
      id: "student_info",
      type: "student_card",
      visible: true,
      order: 2,
      layout: "horizontal",
      style: {
        background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
        border: "1px solid #bae6fd",
        padding: "10px",
      },
      components: [
        "student_image",
        "student_name",
        "admission_number",
        "class",
        "position",
        "grade",
      ],
    },
    {
      id: "grades_table",
      type: "grades",
      visible: true,
      order: 3,
      style: { header_color: "#6366f1", alternating_rows: true },
      columns: [
        "subject",
        "assessments",
        "total",
        "percentage",
        "grade",
        "remark",
      ],
    },
    {
      id: "comments",
      type: "comments",
      visible: true,
      order: 4,
      style: {
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        padding: "10px",
      },
      components: [
        "class_teacher_comment",
        "principal_comment",
        "next_term_date",
      ],
    },
    {
      id: "footer",
      type: "footer",
      visible: true,
      order: 5,
      components: ["signature", "date", "school_stamp"],
    },
  ];

  const SECTION_LABELS = {
    header: "Header",
    student_card: "Student Info",
    grades: "Grades Table",
    comments: "Comments",
    footer: "Footer",
    custom: "Custom",
  };
  const COMPONENT_MAP = {
    header: [
      "school_logo",
      "school_name",
      "school_address",
      "report_title",
      "term",
    ],
    student_card: [
      "student_image",
      "student_name",
      "admission_number",
      "class",
      "position",
      "grade",
    ],
    comments: ["class_teacher_comment", "principal_comment", "next_term_date"],
    footer: ["signature", "date", "school_stamp"],
  };
  const SECTION_ICONS = {
    header: "article",
    student_card: "person",
    grades: "table_chart",
    comments: "comment",
    footer: "footer",
    custom: "code",
    text: "text_fields",
    image: "image",
    divider: "horizontal_rule",
  };

  // ── Validation Rules ────────────────────────────────────
  const VALIDATORS = {
    propPadding: (v) => /^(\d+(\.\d+)?)(px|mm|em|rem|%|)$/.test(v) || v === "",
    propBorderRadius: (v) =>
      /^(\d+(\.\d+)?)(px|mm|em|rem|%|)$/.test(v) || v === "",
    propFontSize: (v) => /^(\d+(\.\d+)?)(px|pt|em|rem|%|)$/.test(v) || v === "",
    propBorder: (v) =>
      v === "" ||
      /^(none|(\d+px\s+\w+\s+#[0-9a-fA-F]{3,8}))$/.test(v) ||
      /^(\d+px\s+(solid|dashed|dotted|none)\s+.+)$/.test(v),
  };

  function validateField(id, value) {
    const validator = VALIDATORS[id];
    const el = document.getElementById(id);
    if (!el) return true;
    if (!validator) return true; // no validator = always valid
    const valid = validator(value);
    el.classList.toggle("ring-2", !valid);
    el.classList.toggle("ring-red-400", !valid);
    el.classList.toggle("border-red-400", !valid);
    return valid;
  }

  // ── Helpers ────────────────────────────────────────────
  function extractHex(val, fallback) {
    if (!val) return fallback;
    const m = val.match(/#[0-9a-fA-F]{6}/);
    return m ? m[0] : fallback;
  }
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  function pushUndo() {
    undoStack.push(deepClone(layoutConfig));
    redoStack = [];
    if (undoStack.length > 50) undoStack.shift();
  }
  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ── Config Loading ─────────────────────────────────────
  async function loadConfigs() {
    try {
      const res = await fetch("/reports/api/configs");
      const data = await res.json();
      if (data.success) {
        const sel = document.getElementById("configSelector");
        sel.innerHTML = '<option value="">Select a Config</option>';
        data.configs.forEach((c) => {
          const opt = document.createElement("option");
          opt.value = c.config_id;
          opt.textContent =
            c.config_name + (c.layout_config ? " (Layout)" : " (Legacy)");
          sel.appendChild(opt);
        });
        if (data.configs.length > 0) {
          sel.value = data.configs[0].config_id;
          loadConfig(data.configs[0].config_id);
        } else {
          initDefaultLayout();
          renderSectionList();
          refreshPreview();
        }
      }
    } catch (e) {
      console.error("Failed to load configs", e);
    }
  }

  async function loadConfig(configId) {
    if (!configId) {
      initDefaultLayout();
      renderSectionList();
      refreshPreview();
      return;
    }
    console.log("[ReportLayoutEditor] Loading config:", configId);
    currentConfigId = configId;
    const draft = localStorage.getItem(DRAFT_KEY_PREFIX + configId);
    if (draft) {
      try {
        layoutConfig = JSON.parse(draft);
      } catch (e) {
        initDefaultLayout();
      }
      document.getElementById("draftBadge").classList.remove("hidden");
    } else {
      try {
        const res = await fetch("/reports/api/configs");
        const data = await res.json();
        const cfg = data.configs
          ? data.configs.find((c) => c.config_id === configId)
          : null;
        if (cfg && cfg.layout_config) {
          layoutConfig = deepClone(cfg.layout_config);
        } else {
          const upRes = await fetch(
            `/reports/api/configs/${configId}/upgrade-layout`,
            { method: "POST" },
          );
          const upData = await upRes.json();
          if (upData.success) {
            layoutConfig = upData.layout_config;
          } else {
            initDefaultLayout();
          }
        }
      } catch (e) {
        console.error(e);
        initDefaultLayout();
      }
      document.getElementById("draftBadge").classList.add("hidden");
    }
    selectedIndex = null;
    syncPageSettingsUI();
    renderSectionList();
    hideProperties();
    refreshPreview();
  }

  function initDefaultLayout() {
    layoutConfig = {
      template: "modern_portrait",
      page_settings: { orientation: "portrait", margin: "8mm", size: "A4" },
      sections: deepClone(DEFAULT_SECTIONS),
      custom_css: "",
    };
  }

  // ── Section List ───────────────────────────────────────
  function renderSectionList() {
    const list = document.getElementById("sectionList");
    list.innerHTML = "";
    if (!layoutConfig) return;
    layoutConfig.sections.forEach((sec, idx) => {
      const div = document.createElement("div");
      const isSelected = selectedIndex === idx;
      div.className = `flex items-center gap-2 p-2.5 rounded-lg cursor-pointer border-2 transition-all duration-150 text-sm ${isSelected ? "bg-primary/10 border-primary dark:border-primary text-primary shadow-sm" : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"}`;
      div.draggable = true;
      div.dataset.idx = idx;
      const icon = SECTION_ICONS[sec.type] || "widgets";
      const label =
        sec.title || SECTION_LABELS[sec.type] || sec.type.replace(/_/g, " ");
      div.innerHTML = `
                <span class="material-symbols-outlined text-base ${sec.visible ? "" : "opacity-30"}">${icon}</span>
                <span class="flex-1 truncate ${sec.visible ? "" : "line-through opacity-50"}">${label}</span>
                <button class="edit-btn p-0.5 rounded hover:bg-primary/20 transition" title="Edit"><span class="material-symbols-outlined text-sm ${isSelected ? "text-primary" : "text-gray-400"}">edit</span></button>
            `;
      div.querySelector(".edit-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        selectSection(idx);
      });
      div.addEventListener("click", () => selectSection(idx));
      div.addEventListener("dragstart", onDragStart);
      div.addEventListener("dragover", onDragOver);
      div.addEventListener("drop", onDrop);
      div.addEventListener("dragend", onDragEnd);
      list.appendChild(div);
    });
  }

  // ── Drag & Drop ────────────────────────────────────────
  let dragSrcIdx = null;
  function onDragStart(e) {
    dragSrcIdx = Number(e.currentTarget.dataset.idx);
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.style.opacity = "0.4";
  }
  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  function onDrop(e) {
    e.stopPropagation();
    const targetIdx = Number(e.currentTarget.dataset.idx);
    if (dragSrcIdx !== null && targetIdx !== dragSrcIdx) {
      pushUndo();
      const moving = layoutConfig.sections.splice(dragSrcIdx, 1)[0];
      layoutConfig.sections.splice(targetIdx, 0, moving);
      layoutConfig.sections.forEach((s, i) => (s.order = i + 1));
      if (selectedIndex === dragSrcIdx) selectedIndex = targetIdx;
      else if (selectedIndex > dragSrcIdx && selectedIndex <= targetIdx)
        selectedIndex--;
      else if (selectedIndex < dragSrcIdx && selectedIndex >= targetIdx)
        selectedIndex++;
      renderSectionList();
      schedulePreviewRefresh();
      autoSave();
    }
    e.currentTarget.style.opacity = "1";
    dragSrcIdx = null;
  }
  function onDragEnd(e) {
    // Reset opacity on ALL dragged items in case the drop didn't hit a valid target
    document.querySelectorAll("#sectionList [draggable]").forEach((el) => {
      el.style.opacity = "1";
    });
    dragSrcIdx = null;
  }

  // ── Properties Panel ───────────────────────────────────
  function hideProperties() {
    document.getElementById("propertiesContent").classList.remove("show");
    document.getElementById("propertiesContent").style.display = "none";
    document.getElementById("propertiesEmpty").style.display = "";
  }

  function showProperties() {
    document.getElementById("propertiesEmpty").style.display = "none";
    const content = document.getElementById("propertiesContent");
    content.style.display = "";
    // Trigger transition
    requestAnimationFrame(() => content.classList.add("show"));
  }

  function selectSection(idx) {
    selectedIndex = idx;
    if (!layoutConfig || idx < 0 || idx >= layoutConfig.sections.length) return;
    const sec = layoutConfig.sections[idx];
    renderSectionList();
    showProperties();
    populateProperties(sec);
  }

  function populateProperties(sec) {
    isUpdatingFromCode = true;
    document.getElementById("propName").value =
      sec.title || SECTION_LABELS[sec.type] || sec.type;
    document.getElementById("propVisible").checked = sec.visible;
    document.getElementById("propBg").value = sec.style?.background || "";
    document.getElementById("propBgColor").value = extractHex(
      sec.style?.background,
      "#ffffff",
    );
    document.getElementById("propColor").value = sec.style?.color || "";
    document.getElementById("propTextColor").value = extractHex(
      sec.style?.color,
      "#000000",
    );
    document.getElementById("propFontSize").value = sec.style?.font_size || "";
    document.getElementById("propPadding").value = sec.style?.padding || "";
    document.getElementById("propBorder").value = sec.style?.border || "";
    document.getElementById("propBorderRadius").value =
      sec.style?.border_radius || "";
    // Clear validation styles
    ["propPadding", "propBorderRadius", "propFontSize", "propBorder"].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.remove("ring-2", "ring-red-400", "border-red-400");
        }
      },
    );

    // Component toggles
    const compBox = document.getElementById("propComponents");
    const compList = document.getElementById("propComponentsList");
    if (sec.components && COMPONENT_MAP[sec.type]) {
      compBox.style.display = "";
      compList.innerHTML = "";
      COMPONENT_MAP[sec.type].forEach((c) => {
        const lbl = document.createElement("label");
        lbl.className =
          "flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "prop-comp rounded";
        cb.value = c;
        cb.checked = sec.components.includes(c);
        cb.addEventListener("change", onPropertyChanged);
        lbl.appendChild(cb);
        lbl.appendChild(document.createTextNode(c.replace(/_/g, " ")));
        compList.appendChild(lbl);
      });
    } else {
      compBox.style.display = "none";
    }

    // Column toggles
    const colBox = document.getElementById("propColumns");
    const colList = document.getElementById("propColumnsList");
    if (sec.type === "grades") {
      colBox.style.display = "";
      colList.innerHTML = "";
      [
        "subject",
        "assessments",
        "total",
        "percentage",
        "grade",
        "remark",
      ].forEach((c) => {
        const lbl = document.createElement("label");
        lbl.className =
          "flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "prop-col rounded";
        cb.value = c;
        cb.checked = sec.columns && sec.columns.includes(c);
        cb.addEventListener("change", onPropertyChanged);
        lbl.appendChild(cb);
        lbl.appendChild(document.createTextNode(c));
        colList.appendChild(lbl);
      });
    } else {
      colBox.style.display = "none";
    }

    // Custom content
    document.getElementById("propCustomContent").style.display =
      sec.type === "custom" ? "" : "none";
    if (sec.type === "custom") {
      document.getElementById("propContent").value = sec.content || "";
    }

    // Grades-specific options
    const gradesOpts = document.getElementById("propGradesOptions");
    if (sec.type === "grades") {
      gradesOpts.style.display = "";
      const headerColor = sec.style?.header_color || "#6366f1";
      document.getElementById("propHeaderColor").value = headerColor;
      document.getElementById("propHeaderColorText").value = headerColor;
      document.getElementById("propAlternatingRows").checked =
        sec.style?.alternating_rows !== false;
    } else {
      gradesOpts.style.display = "none";
    }
    isUpdatingFromCode = false;
  }

  // ── Live Property Update (fires on every keystroke / change) ──
  function onPropertyChanged() {
    if (isUpdatingFromCode || selectedIndex === null || !layoutConfig) return;
    const sec = layoutConfig.sections[selectedIndex];
    if (!sec) return;
    pushUndo();
    // Read all values from form
    sec.title = document.getElementById("propName").value;
    sec.visible = document.getElementById("propVisible").checked;
    sec.style = sec.style || {};
    const bg = document.getElementById("propBg").value;
    const color = document.getElementById("propColor").value;
    const fontSize = document.getElementById("propFontSize").value;
    const padding = document.getElementById("propPadding").value;
    const border = document.getElementById("propBorder").value;
    const borderRadius = document.getElementById("propBorderRadius").value;
    // Validate
    validateField("propPadding", padding);
    validateField("propBorderRadius", borderRadius);
    validateField("propFontSize", fontSize);
    validateField("propBorder", border);
    // Apply
    if (bg) sec.style.background = bg;
    else delete sec.style.background;
    if (color) sec.style.color = color;
    else delete sec.style.color;
    if (fontSize) sec.style.font_size = fontSize;
    else delete sec.style.font_size;
    if (padding) sec.style.padding = padding;
    else delete sec.style.padding;
    if (border) sec.style.border = border;
    else delete sec.style.border;
    if (borderRadius) sec.style.border_radius = borderRadius;
    else delete sec.style.border_radius;

    // Sync color pickers with text field values
    const bgHex = extractHex(bg, null);
    if (bgHex) document.getElementById("propBgColor").value = bgHex;
    const colorHex = extractHex(color, null);
    if (colorHex) document.getElementById("propTextColor").value = colorHex;
    const headerColorHex = extractHex(sec.style?.header_color, null);
    if (headerColorHex)
      document.getElementById("propHeaderColor").value = headerColorHex;

    // Components
    if (sec.components && COMPONENT_MAP[sec.type]) {
      sec.components = [];
      document.querySelectorAll(".prop-comp").forEach((cb) => {
        if (cb.checked) sec.components.push(cb.value);
      });
    }
    // Columns
    if (sec.type === "grades") {
      sec.columns = [];
      document.querySelectorAll(".prop-col").forEach((cb) => {
        if (cb.checked) sec.columns.push(cb.value);
      });
    }
    // Custom content
    if (sec.type === "custom") {
      sec.content = document.getElementById("propContent").value;
    }
    // Grades-specific options
    if (sec.type === "grades") {
      sec.style.header_color =
        document.getElementById("propHeaderColorText").value || "#6366f1";
      sec.style.alternating_rows = document.getElementById(
        "propAlternatingRows",
      ).checked;
    }
    renderSectionList();
    schedulePreviewRefresh();
    autoSave();
  }

  function onColorPickerChange(prop) {
    if (selectedIndex === null) return;
    if (prop === "background") {
      const bgInput = document.getElementById("propBg");
      bgInput.value = document.getElementById("propBgColor").value;
      // Fire input event so onPropertyChanged picks up the change
      bgInput.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (prop === "color") {
      const colorInput = document.getElementById("propColor");
      colorInput.value = document.getElementById("propTextColor").value;
      colorInput.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (prop === "header_color") {
      const hcInput = document.getElementById("propHeaderColorText");
      hcInput.value = document.getElementById("propHeaderColor").value;
      hcInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  // ── Add / Delete ────────────────────────────────────────
  function addElement(type) {
    if (!layoutConfig) return;
    pushUndo();
    const sec = {
      id: type + "_" + Date.now(),
      type,
      visible: true,
      order: layoutConfig.sections.length + 1,
      style: {},
    };
    if (type === "text") {
      sec.type = "custom";
      sec.title = "Text Block";
      sec.content = "<p>Enter your text here</p>";
      sec.style = {
        background: "#ffffff",
        padding: "10px",
        border: "1px solid #e5e7eb",
        border_radius: "6px",
      };
    } else if (type === "image") {
      sec.type = "custom";
      sec.title = "Image";
      sec.content =
        '<img src="" alt="Placeholder" style="width:100%;max-height:80px;object-fit:contain;">';
      sec.style = { padding: "10px" };
    } else if (type === "divider") {
      sec.type = "custom";
      sec.title = "Divider";
      sec.content =
        '<hr style="border:none;border-top:1px solid #e5e7eb;margin:4px 0;">';
      sec.style = { padding: "0" };
    } else if (type === "table") {
      sec.type = "custom";
      sec.title = "Data Table";
      sec.content =
        '<table style="width:100%;border-collapse:collapse;font-size:7pt;"><thead><tr><th style="border:1px solid #e5e7eb;padding:4px;">Col 1</th><th style="border:1px solid #e5e7eb;padding:4px;">Col 2</th></tr></thead><tbody><tr><td style="border:1px solid #e5e7eb;padding:4px;">Data</td><td style="border:1px solid #e5e7eb;padding:4px;">Data</td></tr></tbody></table>';
      sec.style = { padding: "8px 0" };
    } else if (type === "custom") {
      sec.type = "custom";
      sec.title = "Custom HTML";
      sec.content = "<div>Custom content</div>";
      sec.style = {
        background: "#ffffff",
        padding: "10px",
        border: "1px solid #e5e7eb",
        border_radius: "6px",
      };
    } else if (type === "grades") {
      sec.type = "grades";
      sec.title = "Grades Table";
      sec.style = {
        header_color: "#6366f1",
        alternating_rows: true,
      };
      sec.columns = [
        "subject",
        "assessments",
        "total",
        "percentage",
        "grade",
        "remark",
      ];
    }
    layoutConfig.sections.push(sec);
    renderSectionList();
    selectSection(layoutConfig.sections.length - 1);
    schedulePreviewRefresh();
    autoSave();
  }

  function deleteSelectedSection() {
    if (selectedIndex === null) return;
    pushUndo();
    layoutConfig.sections.splice(selectedIndex, 1);
    layoutConfig.sections.forEach((s, i) => (s.order = i + 1));
    selectedIndex = null;
    hideProperties();
    renderSectionList();
    schedulePreviewRefresh();
    autoSave();
  }

  // ── Page Settings ──────────────────────────────────────
  function syncPageSettingsUI() {
    if (!layoutConfig) return;
    document.getElementById("pageOrientation").value =
      layoutConfig.page_settings?.orientation || "portrait";
    document.getElementById("pageSize").value =
      layoutConfig.page_settings?.size || "A4";
    document.getElementById("pageMargin").value =
      layoutConfig.page_settings?.margin || "8mm";
    document.getElementById("customCssEditor").value =
      layoutConfig.custom_css || "";
  }

  function onPageSettingChange() {
    if (!layoutConfig) return;
    pushUndo();
    layoutConfig.page_settings = {
      orientation: document.getElementById("pageOrientation").value,
      size: document.getElementById("pageSize").value,
      margin: document.getElementById("pageMargin").value,
    };
    // Resize iframe
    const f = document.getElementById("previewFrame");
    if (layoutConfig.page_settings.orientation === "landscape") {
      f.style.width = "297mm";
      f.style.minHeight = "210mm";
    } else {
      f.style.width = "210mm";
      f.style.minHeight = "297mm";
    }
    schedulePreviewRefresh();
    autoSave();
  }

  function onCssChange() {
    if (!layoutConfig) return;
    pushUndo();
    layoutConfig.custom_css = document.getElementById("customCssEditor").value;
    schedulePreviewRefresh();
    autoSave();
  }

  // ── Real-Time Preview ──────────────────────────────────
  const schedulePreviewRefresh = debounce(refreshPreview, 300);

  async function refreshPreview() {
    if (!layoutConfig) return;
    const iframe = document.getElementById("previewFrame");
    try {
      const res = await fetch("/reports/api/configs/preview-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout_config: layoutConfig }),
      });
      const data = await res.json();
      if (data.success && data.html) {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(data.html);
        doc.close();
      } else if (data.error) {
        console.error("[ReportLayoutEditor] Preview error:", data.error);
      }
    } catch (e) {
      console.error("[ReportLayoutEditor] Preview fetch error:", e);
    }
  }

  // ── Zoom ───────────────────────────────────────────────
  function zoomIn() {
    zoom = Math.min(zoom + 0.1, 2);
    applyZoom();
  }
  function zoomOut() {
    zoom = Math.max(zoom - 0.1, 0.3);
    applyZoom();
  }
  function applyZoom() {
    document.getElementById("canvasWrapper").style.transform = `scale(${zoom})`;
    document.getElementById("zoomLevel").textContent =
      Math.round(zoom * 100) + "%";
  }

  // ── Auto-Save / Publish ────────────────────────────────
  function autoSave() {
    if (!currentConfigId || !layoutConfig) return;
    localStorage.setItem(
      DRAFT_KEY_PREFIX + currentConfigId,
      JSON.stringify(layoutConfig),
    );
    document.getElementById("draftBadge").classList.remove("hidden");
  }

  async function publishChanges() {
    if (!currentConfigId) {
      showNotification("Select a configuration first.", "error");
      return;
    }
    try {
      const res = await fetch(`/reports/api/configs/${currentConfigId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout_config: layoutConfig }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem(DRAFT_KEY_PREFIX + currentConfigId);
        document.getElementById("draftBadge").classList.add("hidden");
        showNotification("Layout published successfully!", "success");
      } else {
        showNotification("Error: " + data.error, "error");
      }
    } catch (e) {
      showNotification("Publish failed: " + e.message, "error");
    }
  }

  // ── Undo / Redo ────────────────────────────────────────
  function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(deepClone(layoutConfig));
    layoutConfig = undoStack.pop();
    selectedIndex = null;
    renderSectionList();
    syncPageSettingsUI();
    hideProperties();
    schedulePreviewRefresh();
    autoSave();
  }
  function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(deepClone(layoutConfig));
    layoutConfig = redoStack.pop();
    selectedIndex = null;
    renderSectionList();
    syncPageSettingsUI();
    hideProperties();
    schedulePreviewRefresh();
    autoSave();
  }

  // ── Notification ────────────────────────────────────────
  function showNotification(message, type) {
    const n = document.createElement("div");
    const bg = {
      success: "bg-green-500",
      error: "bg-red-500",
      info: "bg-blue-500",
    };
    n.className = `fixed top-4 right-4 ${bg[type] || bg.info} text-white px-5 py-3 rounded-xl shadow-lg z-50 text-sm transition-all duration-300 transform translate-x-0`;
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(() => {
      n.style.opacity = "0";
      setTimeout(() => n.remove(), 300);
    }, 3000);
  }

  // ── Bind All Events (single source of truth) ──────────
  function bindPropertyEvents() {
    // Config selector
    document
      .getElementById("configSelector")
      .addEventListener("change", function () {
        loadConfig(this.value);
      });
    // Text inputs: live on every keystroke
    const textFields = [
      "propName",
      "propBg",
      "propColor",
      "propFontSize",
      "propPadding",
      "propBorder",
      "propBorderRadius",
      "propHeaderColorText",
      "propContent",
    ];
    textFields.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", onPropertyChanged);
      el.addEventListener("change", onPropertyChanged);
    });
    // Color pickers: live
    document
      .getElementById("propBgColor")
      .addEventListener("input", () => onColorPickerChange("background"));
    document
      .getElementById("propTextColor")
      .addEventListener("input", () => onColorPickerChange("color"));
    // Checkboxes
    document
      .getElementById("propVisible")
      .addEventListener("change", onPropertyChanged);
    // Page settings
    document
      .getElementById("pageOrientation")
      .addEventListener("change", onPageSettingChange);
    document
      .getElementById("pageSize")
      .addEventListener("change", onPageSettingChange);
    document
      .getElementById("pageMargin")
      .addEventListener("change", onPageSettingChange);
    // Header color and alternating rows for grades section
    document
      .getElementById("propHeaderColor")
      .addEventListener("input", () => onColorPickerChange("header_color"));
    document
      .getElementById("propHeaderColorText")
      ?.addEventListener("input", function () {
        document.getElementById("propHeaderColor").value = this.value;
        this.dispatchEvent(new Event("input", { bubbles: true }));
      });
    document
      .getElementById("propAlternatingRows")
      ?.addEventListener("change", onPropertyChanged);

    // CSS editor
    document
      .getElementById("customCssEditor")
      .addEventListener("input", debounce(onCssChange, 500));
  }

  // ── Init ────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", () => {
    console.log("[ReportLayoutEditor] Initializing...");
    bindPropertyEvents();
    loadConfigs().catch((e) =>
      console.error("[ReportLayoutEditor] Init error:", e),
    );
  });

  // ── Public API ──────────────────────────────────────────
  return {
    loadConfig,
    selectSection,
    onPropertyChanged,
    onColorPickerChange,
    onPageSettingChange,
    onCssChange,
    addElement,
    deleteSelectedSection,
    zoomIn,
    zoomOut,
    undo,
    redo,
    publishChanges,
    refreshPreview,
  };
})();
