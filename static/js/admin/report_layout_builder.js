/*
 * Report Layout Builder - JavaScript module for the Layout Designer UI
 * Provides drag-and-drop reordering, section configuration, custom CSS,
 * and layout preview via AJAX calls to the backend.
 */

const LayoutBuilder = (function () {
  // Internal state
  let sections = [];
  let selectedSectionIndex = null;
  let reportId = null; // not used now, but helpful for future extensions

  // Default sections matching the default layout config
  const defaultSections = [
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
      style: { background: "#f9fafb", border: "1px solid #e5e7eb" },
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

  // Utility: render the sections list
  function renderSections() {
    const container = document.getElementById("layoutSectionsList");
    container.innerHTML = "";
    sections.forEach((sec, idx) => {
      const div = document.createElement("div");
      div.className =
        "flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-move bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700";
      div.draggable = true;
      div.dataset.idx = idx;
      div.innerHTML = `
                <span class="material-symbols-outlined mr-2 text-primary">drag_handle</span>
                <span class="flex-1 capitalize">${sec.type.replace("_", " ")}</span>
                <button type="button" class="text-gray-500 hover:text-red-600" onclick="LayoutBuilder.selectSection(${idx})"><span class="material-symbols-outlined">edit</span></button>
            `;
      // Drag events
      div.addEventListener("dragstart", onDragStart);
      div.addEventListener("dragover", onDragOver);
      div.addEventListener("drop", onDrop);
      container.appendChild(div);
    });
  }

  // Drag handlers
  let dragSrcIdx = null;
  function onDragStart(e) {
    dragSrcIdx = Number(e.currentTarget.dataset.idx);
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.classList.add("opacity-50");
  }
  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  function onDrop(e) {
    e.stopPropagation();
    const targetIdx = Number(e.currentTarget.dataset.idx);
    if (dragSrcIdx !== null && targetIdx !== dragSrcIdx) {
      const moving = sections.splice(dragSrcIdx, 1)[0];
      sections.splice(targetIdx, 0, moving);
      // Reassign order based on array index
      sections.forEach((s, i) => (s.order = i + 1));
      renderSections();
    }
    e.currentTarget.classList.remove("opacity-50");
    dragSrcIdx = null;
  }

  // Extract a #rrggbb hex from a value that might be a gradient or CSS shorthand
  function extractHex(val, fallback) {
    if (!val) return fallback;
    // Try to find a #rrggbb pattern
    const match = val.match(/#[0-9a-fA-F]{6}/);
    return match ? match[0] : fallback;
  }

  // Section selection – opens the config panel
  function selectSection(idx) {
    selectedSectionIndex = idx;
    const sec = sections[idx];
    document.getElementById("layoutConfigSectionName").textContent =
      sec.type.replace("_", " ");
    // Populate basic fields
    document.getElementById("layoutSectionVisible").checked = sec.visible;
    document.getElementById("layoutSectionBg").value = extractHex(
      sec.style?.background,
      "#f9fafb",
    );
    document.getElementById("layoutSectionBgText").value =
      sec.style?.background || "";
    document.getElementById("layoutSectionBorder").value = extractHex(
      sec.style?.border,
      "#e5e7eb",
    );
    document.getElementById("layoutSectionBorderText").value =
      sec.style?.border || "";
    document.getElementById("layoutSectionPadding").value =
      sec.style?.padding || "10px";
    document.getElementById("layoutSectionRadius").value =
      sec.style?.border_radius || "";

    // Header color and alternating rows fields
    const headerColorInput = document.getElementById(
      "layoutSectionHeaderColor",
    );
    const headerColorText = document.getElementById(
      "layoutSectionHeaderColorText",
    );

    const headerColorValue = sec.style?.header_color || "#6366f1";
    headerColorInput.value = headerColorValue;
    headerColorText.value = headerColorValue;
    const alternatingRowsCheckbox = document.getElementById(
      "layoutSectionAlternatingRows",
    );
    alternatingRowsCheckbox.checked = sec.style?.alternating_rows !== false;

    // Show component checkboxes for sections that support them
    const componentBox = document.getElementById("layoutComponentCheckboxes");
    const componentList = document.getElementById("layoutComponentsList");
    if (sec.components) {
      componentBox.classList.remove("hidden");
      componentList.innerHTML = "";
      const available = getComponentsForType(sec.type);
      available.forEach((comp) => {
        const checked = sec.components.includes(comp) ? "checked" : "";
        const label = document.createElement("label");
        label.className =
          "flex items-center p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer";
        label.innerHTML = `
                    <input type="checkbox" class="component-cb" value="${comp}" ${checked}>
                    <span class="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">${comp.replace("_", " ")}</span>
                `;
        componentList.appendChild(label);
      });
    } else {
      componentBox.classList.add("hidden");
    }
    // Show column selector for grades section
    const columnBox = document.getElementById("layoutColumnCheckboxes");
    const columnList = document.getElementById("layoutColumnsList");
    if (sec.type === "grades") {
      columnBox.classList.remove("hidden");
      columnList.innerHTML = "";
      const cols = [
        "subject",
        "assessments",
        "total",
        "percentage",
        "grade",
        "remark",
      ];
      cols.forEach((col) => {
        const checked =
          sec.columns && sec.columns.includes(col) ? "checked" : "";
        const label = document.createElement("label");
        label.className =
          "flex items-center p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer";
        label.innerHTML = `
                    <input type="checkbox" class="column-cb" value="${col}" ${checked}>
                    <span class="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">${col}</span>
                `;
        columnList.appendChild(label);
      });
    } else {
      columnBox.classList.add("hidden");
    }
    // Show header color and alternating rows fields for grades section
    const headerColorField = document.getElementById("layoutHeaderColorField");
    const _headerColorInput = document.getElementById(
      "layoutSectionHeaderColor",
    );
    const _headerColorText = document.getElementById(
      "layoutSectionHeaderColSorText",
    );
    const alternatingRowsField = document.getElementById(
      "layoutAlternatingRowsField",
    );
    const _alternatingRowsCheckbox = document.getElementById(
      "layoutSectionAlternatingRows",
    );
    if (sec.type === "grades") {
      headerColorField.classList.remove("hidden");
      _headerColorInput.value = sec.style?.header_color || "#6366f1";
      _headerColorText.value = sec.style?.header_color || "#6366f1";
      alternatingRowsField.classList.remove("hidden");
      _alternatingRowsCheckbox.checked = sec.style?.alternating_rows !== false;
    } else {
      headerColorField.classList.add("hidden");
      alternatingRowsField.classList.add("hidden");
    }

    // Header color field event listeners
    _headerColorInput.addEventListener("input", function () {
      _headerColorText.value = this.value;
      this.dispatchEvent(new Event("input", { bubbles: true }));
    });
    _headerColorText.addEventListener("input", function () {
      LayoutBuilder.onSectionStyleTextChange("header_color", this.value);
    });

    // Alternating rows field event listener
    _alternatingRowsCheckbox.addEventListener(
      "change",
      LayoutBuilder.onSectionConfigChange,
    );

    document.getElementById("layoutSectionConfig").classList.remove("hidden");
  }

  function closeSectionConfig() {
    document.getElementById("layoutSectionConfig").classList.add("hidden");
    selectedSectionIndex = null;
  }

  function onSectionConfigChange() {
    if (selectedSectionIndex === null) return;
    const sec = sections[selectedSectionIndex];
    sec.visible = document.getElementById("layoutSectionVisible").checked;
    // When color picker changes, sync to text field (unless text field has gradient)
    const bgText = document.getElementById("layoutSectionBgText");
    const borderText = document.getElementById("layoutSectionBorderText");
    // If user used the color picker (simple hex), update the text field
    const bgPicker = document.getElementById("layoutSectionBg");
    const borderPicker = document.getElementById("layoutSectionBorder");
    if (!bgText.value.includes("gradient")) {
      bgText.value = bgPicker.value;
      // Fire input event so onSectionStyleTextChange picks up the change
      bgText.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (
      !borderText.value.includes("solid") ||
      borderText.value === borderPicker.value
    ) {
      borderText.value = borderPicker.value;
      borderText.dispatchEvent(new Event("input", { bubbles: true }));
    }
    // background & border fields are kept in style object as raw values
    sec.style = sec.style || {};
    sec.style.background = bgText.value || sec.style.background;
    sec.style.border = borderText.value || sec.style.border;
    sec.style.padding = document.getElementById("layoutSectionPadding").value;
    sec.style.border_radius = document.getElementById(
      "layoutSectionRadius",
    ).value;
    // Header color and alternating rows (for grades section)
    sec.style.header_color =
      document.getElementById("layoutSectionHeaderColorText").value ||
      "#6366f1";
    sec.style.alternating_rows = document.getElementById(
      "layoutSectionAlternatingRows",
    ).checked;
    // Update component selections if applicable
    if (sec.components) {
      const comps = [];
      document
        .querySelectorAll("#layoutComponentsList .component-cb")
        .forEach((cb) => {
          if (cb.checked) comps.push(cb.value);
        });
      sec.components = comps;
    }
    // Update columns for grades
    if (sec.type === "grades") {
      const cols = [];
      document
        .querySelectorAll("#layoutColumnsList .column-cb")
        .forEach((cb) => {
          if (cb.checked) cols.push(cb.value);
        });
      sec.columns = cols;
    }
  }

  function onSectionStyleTextChange(prop, value) {
    if (selectedSectionIndex === null) return;
    const sec = sections[selectedSectionIndex];
    sec.style = sec.style || {};
    sec.style[prop] = value;

    // Sync color pickers with text field values
    if (prop === "background") {
      const bgHex = value.match(/#[0-9a-fA-F]{6}/);
      if (bgHex) document.getElementById("layoutSectionBg").value = bgHex[0];
    } else if (prop === "border") {
      const borderHex = value.match(/#[0-9a-fA-F]{6}/);
      if (borderHex)
        document.getElementById("layoutSectionBorder").value = borderHex[0];
    } else if (prop === "header_color") {
      const headerHex = value.match(/#[0-9a-fA-F]{6}/);
      if (headerHex) {
        document.getElementById("layoutSectionHeaderColor").value =
          headerHex[0];
        document.getElementById("layoutSectionHeaderColorText").value =
          headerHex[0];
      }
    }
  }

  function addCustomSection() {
    const name = prompt(
      'Enter a name for the custom section (e.g., "Extra Notes")',
    );
    if (!name) return;
    const id = "custom_" + Date.now();
    const newSec = {
      id,
      type: "custom",
      visible: true,
      order: sections.length + 1,
      style: { background: "#ffffff", padding: "10px" },
      title: name,
      content: "",
    };
    sections.push(newSec);
    renderSections();
  }

  function deleteSelectedSection() {
    if (selectedSectionIndex === null) return;
    if (!confirm("Are you sure you want to remove this section?")) return;
    sections.splice(selectedSectionIndex, 1);
    // Reorder
    sections.forEach((s, i) => (s.order = i + 1));
    closeSectionConfig();
    renderSections();
  }

  function resetToDefault() {
    if (
      !confirm(
        "Reset layout to default configuration? All changes will be lost.",
      )
    )
      return;
    sections = JSON.parse(JSON.stringify(defaultSections));
    renderSections();
    closeSectionConfig();
  }

  function getComponentsForType(type) {
    const map = {
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
      comments: [
        "class_teacher_comment",
        "principal_comment",
        "next_term_date",
      ],
      footer: ["signature", "date", "school_stamp"],
    };
    return map[type] || [];
  }

  function previewLayout() {
    // Gather current configuration
    const layoutConfig = {
      template: document.getElementById("layoutTemplate").value,
      page_settings: {
        orientation: document.getElementById("layoutOrientation").value,
        margin: document.getElementById("layoutMargin").value,
        size: document.getElementById("layoutPageSize").value,
      },
      sections: sections,
      custom_css: document.getElementById("layoutCustomCss").value,
    };
    // Show loading
    const modal = document.getElementById("layoutPreviewModal");
    const content = document.getElementById("layoutPreviewContent");
    content.innerHTML =
      '<div class="text-center py-8"><span class="material-symbols-outlined animate-spin text-4xl">progress_activity</span> Generating preview...</div>';
    modal.classList.remove("hidden");
    // Call backend preview endpoint (uses sample data if no student ids provided)
    fetch("/reports/api/configs/preview-layout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout_config: layoutConfig }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          content.innerHTML = data.html;
        } else {
          content.innerHTML = `<div class="text-red-600 p-4">Error: ${data.error}</div>`;
        }
      })
      .catch((err) => {
        content.innerHTML = `<div class="text-red-600 p-4">Error: ${err.message}</div>`;
      });
  }

  function closePreview() {
    document.getElementById("layoutPreviewModal").classList.add("hidden");
  }

  // Init when DOM ready
  document.addEventListener("DOMContentLoaded", function () {
    sections = JSON.parse(JSON.stringify(defaultSections));
    renderSections();
  });

  // Public API
  return {
    onTemplateChange: function (val) {
      const orientationEl = document.getElementById('layoutOrientation');
      const marginEl = document.getElementById('layoutMargin');
      if (val === 'default2') {
        if (orientationEl) orientationEl.value = 'portrait';
        if (marginEl) marginEl.value = '8mm';
      }
    },
    onPageSettingChange: function () {
      /* no live effect needed */
    },
    addCustomSection,
    selectSection,
    closeSectionConfig,
    onSectionConfigChange,
    onSectionStyleTextChange,
    deleteSelectedSection,
    resetToDefault,
    previewLayout,
    closePreview,
  };
})();
