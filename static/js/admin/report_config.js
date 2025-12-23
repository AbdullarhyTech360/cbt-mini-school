let assessmentTypes = [];
let terms = [];
let classes = [];
let gradeScales = []; // Add grade scales array
let currentConfigId = null;
let mergeRuleCount = 0;
let loadedConfigs = []; // Store loaded configurations globally

// Load initial data
document.addEventListener("DOMContentLoaded", () => {
  loadTerms();
  loadClasses();
  loadAssessmentTypes();
  loadGradeScales(); // Load grade scales
  loadConfigs();
});

async function loadTerms() {
  const select = document.getElementById("termId");
  select.innerHTML = '<option value="">Loading...</option>';
  select.disabled = true;

  try {
    const response = await fetch("/reports/api/terms");
    const data = await response.json();

    if (data.success && data.terms.length > 0) {
      terms = data.terms;
      select.innerHTML = '<option value="">Select Term</option>';
      data.terms.forEach((term) => {
        const option = document.createElement("option");
        option.value = term.term_id;
        option.textContent = `${term.term_name} - ${term.academic_session}`;
        if (term.is_current) {
          option.textContent += " (Current)";
        }
        select.appendChild(option);
      });
    } else {
      select.innerHTML = '<option value="">No terms found</option>';
      showNotification("No terms found. Please create terms first.", "warning");
    }
  } catch (error) {
    console.error("Error loading terms:", error);
    select.innerHTML = '<option value="">Error loading terms</option>';
    showNotification("Error loading terms. Please refresh the page.", "error");
  } finally {
    select.disabled = false;
  }
}

async function loadClasses() {
  const select = document.getElementById("classRoomId");
  select.innerHTML = '<option value="">Loading...</option>';
  select.disabled = true;

  try {
    const response = await fetch("/reports/api/classes");
    const data = await response.json();

    if (data.success && data.classes.length > 0) {
      classes = data.classes;
      select.innerHTML = '<option value="">All Classes</option>';
      data.classes.forEach((cls) => {
        const option = document.createElement("option");
        option.value = cls.class_room_id;
        option.textContent = cls.class_name;
        select.appendChild(option);
      });
    } else {
      select.innerHTML = '<option value="">All Classes</option>';
    }
  } catch (error) {
    console.error("Error loading classes:", error);
    select.innerHTML = '<option value="">All Classes</option>';
    showNotification(
      "Error loading classes. Please refresh the page.",
      "error"
    );
  } finally {
    select.disabled = false;
  }
}

async function loadGradeScales() {
  const select = document.getElementById("gradeScaleId");
  select.innerHTML = '<option value="">Loading...</option>';
  select.disabled = true;

  try {
    const response = await fetch("/reports/api/grade-scales");
    const data = await response.json();

    if (data.success && data.scales.length > 0) {
      gradeScales = data.scales;
      select.innerHTML = '<option value="">Default Scale</option>';
      data.scales.forEach((scale) => {
        const option = document.createElement("option");
        option.value = scale.scale_id;
        option.textContent = scale.name;
        select.appendChild(option);
      });
    } else {
      select.innerHTML = '<option value="">Default Scale</option>';
    }
  } catch (error) {
    console.error("Error loading grade scales:", error);
    select.innerHTML = '<option value="">Default Scale</option>';
    showNotification(
      "Error loading grade scales. Please refresh the page.",
      "error"
    );
  } finally {
    select.disabled = false;
  }
}

async function loadAssessmentTypes() {
  const container = document.getElementById("assessmentsList");
  container.innerHTML =
    '<div class="col-span-full text-center text-gray-500 dark:text-gray-400 py-6">Loading assessments...</div>';

  try {
    const response = await fetch("/reports/api/assessment-types");
    const data = await response.json();

    if (data.success && data.assessments.length > 0) {
      assessmentTypes = data.assessments;
      renderAssessmentsList();
    } else {
      container.innerHTML =
        '<div class="col-span-full text-center text-gray-500 dark:text-gray-400 py-6">No assessment types found</div>';
      showNotification(
        "No assessment types found. Please configure assessment types first.",
        "warning"
      );
    }
  } catch (error) {
    console.error("Error loading assessment types:", error);
    container.innerHTML =
      '<div class="col-span-full text-center text-red-500 dark:text-red-400 py-6">Error loading assessments</div>';
    showNotification(
      "Error loading assessment types. Please refresh the page.",
      "error"
    );
  }
}

function renderAssessmentsList() {
  const container = document.getElementById("assessmentsList");
  container.innerHTML = assessmentTypes
    .map(
      (assessment) => `
        <label class="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition">
            <input type="checkbox" class="assessment-checkbox sr-only peer" value="${assessment.code}" checked>
            <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary mr-3"></div>
            <span class="text-sm text-gray-700 dark:text-gray-300">${assessment.name}</span>
        </label>
    `
    )
    .join("");
}

async function loadConfigs() {
  const container = document.getElementById("configsList");
  container.innerHTML = `
        <div class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p class="mt-4 text-gray-600 dark:text-gray-400">Loading configurations...</p>
        </div>
    `;

  try {
    const response = await fetch("/reports/api/configs");
    const data = await response.json();

    if (data.success) {
      loadedConfigs = data.configs; // Store configurations globally
      renderConfigs(data.configs);
      updateStats(data.configs); // Update statistics
    } else {
      container.innerHTML = `
                <div class="text-center py-12">
                    <span class="material-symbols-outlined text-6xl text-red-300 mb-4">error</span>
                    <p class="text-red-600 dark:text-red-400">Error loading configurations</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">${
                      data.error || "Unknown error"
                    }</p>
                </div>
            `;
      showNotification("Error loading configurations", "error");
    }
  } catch (error) {
    console.error("Error loading configs:", error);
    container.innerHTML = `
            <div class="text-center py-12">
                <span class="material-symbols-outlined text-6xl text-red-300 mb-4">wifi_off</span>
                <p class="text-red-600 dark:text-red-400">Failed to load configurations</p>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Please check your connection and try again</p>
            </div>
        `;
    showNotification(
      "Failed to load configurations. Please refresh the page.",
      "error"
    );
  }
}

function updateStats(configs) {
  // Update total configurations
  document.getElementById("totalConfigs").textContent = configs.length;

  // Update active configurations
  const activeConfigs = configs.filter((config) => config.is_active).length;
  document.getElementById("activeConfigs").textContent = activeConfigs;

  // Update total merge rules
  const totalMergeRules = configs.reduce(
    (total, config) => total + config.merge_config.merged_exams.length,
    0
  );
  document.getElementById("totalMergeRules").textContent = totalMergeRules;

  // Update total grade scales
  document.getElementById("totalGradeScales").textContent = gradeScales.length;
}

function renderConfigs(configs) {
  const container = document.getElementById("configsList");

  if (configs.length === 0) {
    container.innerHTML = `
            <div class="text-center py-12">
                <div class="mx-auto w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                    <span class="material-symbols-outlined text-5xl text-gray-400">settings</span>
                </div>
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-1">No configurations found</h3>
                <p class="text-gray-500 dark:text-gray-400 mb-4">Get started by creating a new report configuration.</p>
                <button onclick="openConfigModal()" class="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg shadow transition font-medium">
                    <span class="material-symbols-outlined">add</span>Create Configuration
                </button>
            </div>
        `;
    return;
  }

  container.innerHTML = configs
    .map((config) => {
      const term = terms.find((t) => t.term_id === config.term_id);
      const cls = classes.find((c) => c.class_room_id === config.class_room_id);
      const scale = gradeScales.find(
        (s) => s.scale_id === config.grade_scale_id
      );

      return `
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-4 last:mb-0 hover:shadow-md transition-shadow">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="flex-1">
                        <div class="flex flex-wrap items-center gap-2 mb-2">
                            <h3 class="config-name text-lg font-semibold text-gray-800 dark:text-white">${
                              config.config_name
                            }</h3>
                            ${
                              config.is_default
                                ? '<span class="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs px-2.5 py-1 rounded-full font-medium">Default</span>'
                                : ""
                            }
                            ${
                              !config.is_active
                                ? '<span class="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 text-xs px-2.5 py-1 rounded-full font-medium">Inactive</span>'
                                : ""
                            }
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                            <p><span class="font-medium">Term:</span> ${
                              term
                                ? `${term.term_name} - ${term.academic_session}`
                                : "N/A"
                            }</p>
                            <p><span class="font-medium">Class:</span> ${
                              cls ? cls.class_name : "All Classes"
                            }</p>
                            <p><span class="font-medium">Grade Scale:</span> ${
                              scale ? scale.name : "Default"
                            }</p>
                            <p><span class="font-medium">Assessments:</span> ${
                              config.active_assessments.length
                            } selected</p>
                            <p><span class="font-medium">Merge Rules:</span> ${
                              config.merge_config.merged_exams.length
                            } configured</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="editConfig('${config.config_id}')" 
                            class="p-2.5 text-gray-600 hover:text-primary dark:text-gray-400 dark:hover:text-primary rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            title="Edit Configuration">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button onclick="deleteConfig('${
                          config.config_id
                        }', '${config.config_name.replace(/'/g, "\\'")}')" 
                            class="p-2.5 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            title="Delete Configuration">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    })
    .join("");
}

function openConfigModal() {
  currentConfigId = null;
  document.getElementById("modalTitle").textContent =
    "New Report Configuration";
  document.getElementById("configForm").reset();
  document.getElementById("configId").value = "";

  // Reset checkboxes
  document
    .querySelectorAll(".assessment-checkbox")
    .forEach((cb) => (cb.checked = true));
  document.getElementById("showLogo").checked = true;
  document.getElementById("showStudentImage").checked = true;
  document.getElementById("showPosition").checked = true;
  document.getElementById("treatTotalAsPercentage").checked = false;

  // Clear merge rules
  document.getElementById("mergeRulesList").innerHTML = "";
  mergeRuleCount = 0;

  openModal("configModal");
}

function openEditConfigModal() {
  // Open the modal without resetting the form
  openModal("configModal");
}

function closeConfigModal() {
  closeModal("configModal");
}

async function editConfig(configId) {
  // Find the configuration in the already loaded data
  const config = loadedConfigs.find((c) => c.config_id === configId);

  if (!config) {
    showNotification("Configuration not found", "error");
    return;
  }

  console.log("Editing config:", config); // Debug log

  try {
    currentConfigId = configId;
    document.getElementById("modalTitle").textContent =
      "Edit Report Configuration";
    document.getElementById("configId").value = configId;
    document.getElementById("configName").value = config.config_name;
    document.getElementById("termId").value = config.term_id;
    document.getElementById("classRoomId").value = config.class_room_id || "";
    document.getElementById("gradeScaleId").value = config.grade_scale_id || ""; // Set grade scale
    document.getElementById("resumptionDate").value = config.resumption_date || "";
    document.getElementById("isDefault").checked = config.is_default;

    // Set display settings
    const displaySettings = config.display_settings;
    document.getElementById("showLogo").checked = displaySettings.show_logo;
    document.getElementById("showStudentImage").checked =
      displaySettings.show_student_image;
    document.getElementById("showPosition").checked =
      displaySettings.show_position;
    document.getElementById("treatTotalAsPercentage").checked =
      displaySettings.treat_total_as_percentage || false;

    // Set active assessments
    document.querySelectorAll(".assessment-checkbox").forEach((cb) => {
      cb.checked = config.active_assessments.includes(cb.value);
    });

    // Set merge rules
    document.getElementById("mergeRulesList").innerHTML = "";
    mergeRuleCount = 0;
    console.log("Merge rules:", config.merge_config.merged_exams); // Debug log
    config.merge_config.merged_exams.forEach((rule) => {
      console.log("Adding merge rule:", rule); // Debug log
      addMergeRule(rule);
    });

    openEditConfigModal();
  } catch (error) {
    console.error("Error loading config:", error);
    showNotification("Error loading configuration. Please try again.", "error");
  }
}

function addMergeRule(existingRule = null) {
  console.log("addMergeRule called with:", existingRule);

  const ruleId = mergeRuleCount++;
  const container = document.getElementById("mergeRulesList");

  const ruleDiv = document.createElement("div");
  ruleDiv.className =
    "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5";
  ruleDiv.id = `mergeRule${ruleId}`;

  // Build component checkboxes as an array of objects
  const componentCheckboxes = assessmentTypes.map((assessment) => {
    const isChecked =
      existingRule &&
      existingRule.components &&
      existingRule.components.includes(assessment.code);
    console.log(`Checking ${assessment.code}:`, isChecked);
    return {
      code: assessment.code,
      name: assessment.name,
      checked: isChecked,
    };
  });

  // Create the HTML with placeholders for checkboxes
  ruleDiv.innerHTML = `
        <div class="flex justify-between items-start mb-5">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                    ${ruleId + 1}
                </div>
                <h4 class="font-semibold text-gray-800 dark:text-gray-200">Merge Rule ${
                  ruleId + 1
                }</h4>
            </div>
            <button type="button" onclick="removeMergeRule(${ruleId})" 
                class="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-500 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
        
        <div class="space-y-5">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <span class="material-symbols-outlined mr-1 align-middle text-sm">sell</span>Merge Name *
                    </label>
                    <input type="text" class="merge-name w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition shadow-sm hover:shadow-md placeholder:text-gray-400 dark:placeholder:text-gray-500" 
                        placeholder="e.g., Final Exam" value="${
                          existingRule ? existingRule.name : ""
                        }" required>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1.5">Internal name for this merge</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <span class="material-symbols-outlined mr-1 align-middle text-sm">visibility</span>Display As *
                    </label>
                    <input type="text" class="merge-display w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition shadow-sm hover:shadow-md placeholder:text-gray-400 dark:placeholder:text-gray-500" 
                        placeholder="e.g., exam" value="${
                          existingRule ? existingRule.display_as : ""
                        }" required>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1.5">How it appears on report card</p>
                </div>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <span class="material-symbols-outlined mr-1 align-middle text-sm">extension</span>Select Components to Merge *
                </label>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3" id="componentCheckboxes-${ruleId}">
                    <!-- Checkboxes will be inserted here -->
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-3">
                    <span class="material-symbols-outlined mr-1 align-middle text-sm">info</span>
                    Select at least 2 assessments to combine. Their scores will be added together.
                </p>
            </div>
        </div>
    `;

  container.appendChild(ruleDiv);

  // Now populate the checkboxes properly
  const checkboxesContainer = ruleDiv.querySelector(
    `#componentCheckboxes-${ruleId}`
  );
  componentCheckboxes.forEach((checkbox) => {
    const label = document.createElement("label");
    label.className =
      "flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-white dark:hover:bg-gray-700 cursor-pointer transition";
    label.innerHTML = `
            <input type="checkbox" class="merge-component-cb sr-only peer" value="${
              checkbox.code
            }" ${checkbox.checked ? "checked" : ""}>
            <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary mr-3"></div>
            <span class="text-sm text-gray-700 dark:text-gray-300">${
              checkbox.name
            }</span>
        `;
    checkboxesContainer.appendChild(label);
  });

  // Set the values after the element is in the DOM
  if (existingRule) {
    ruleDiv.querySelector(".merge-name").value = existingRule.name;
    ruleDiv.querySelector(".merge-display").value = existingRule.display_as;
  }
}

function removeMergeRule(ruleId) {
  const ruleDiv = document.getElementById(`mergeRule${ruleId}`);
  if (ruleDiv) {
    ruleDiv.remove();
  }
}

function showNotification(message, type = "info") {
  // Remove any existing notifications
  const existingNotification = document.querySelector(".notification-toast");
  if (existingNotification) {
    existingNotification.remove();
  }

  const colors = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-yellow-500",
  };

  const icons = {
    success: "check_circle",
    error: "error",
    info: "info",
    warning: "warning",
  };

  const notification = document.createElement("div");
  notification.className = `notification-toast fixed top-4 right-4 ${colors[type]} text-white px-6 py-4 rounded-xl shadow-lg z-50 transition-opacity duration-300 max-w-md flex items-start`;
  notification.innerHTML = `
        <span class="material-symbols-outlined mr-2 text-xl">${icons[type]}</span>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
            <span class="material-symbols-outlined">close</span>
        </button>
    `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

document.getElementById("configForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const configId = document.getElementById("configId").value;
  const configName = document.getElementById("configName").value;
  const termId = document.getElementById("termId").value;
  const classRoomId = document.getElementById("classRoomId").value;
  const gradeScaleId = document.getElementById("gradeScaleId").value; // Get grade scale
  const isDefault = document.getElementById("isDefault").checked;

  // Validation
  if (!configName.trim()) {
    showNotification("Please enter a configuration name", "warning");
    return;
  }

  if (!termId) {
    showNotification("Please select a term", "warning");
    return;
  }

  // Get display settings
  const displaySettings = {
    show_logo: document.getElementById("showLogo").checked,
    show_student_image: document.getElementById("showStudentImage").checked,
    show_position: document.getElementById("showPosition").checked,
    treat_total_as_percentage: document.getElementById("treatTotalAsPercentage")
      .checked,
  };

  // Get active assessments
  const activeAssessments = Array.from(
    document.querySelectorAll(".assessment-checkbox:checked")
  ).map((cb) => cb.value);

  if (activeAssessments.length === 0) {
    showNotification("Please select at least one assessment", "warning");
    return;
  }

  // Get merge rules
  const mergedExams = [];
  document.querySelectorAll("#mergeRulesList > div").forEach((ruleDiv) => {
    const name = ruleDiv.querySelector(".merge-name").value.trim();
    const displayAs = ruleDiv.querySelector(".merge-display").value.trim();
    const components = Array.from(
      ruleDiv.querySelectorAll(".merge-component-cb:checked")
    ).map((cb) => cb.value);

    if (name && displayAs && components.length >= 2) {
      mergedExams.push({ name, components, display_as: displayAs });
    }
  });

  const data = {
    config_name: configName,
    term_id: termId,
    class_room_id: classRoomId || null,
    grade_scale_id: gradeScaleId || null, // Include grade scale
    resumption_date: document.getElementById("resumptionDate").value || null,
    is_default: isDefault,
    display_settings: displaySettings,
    active_assessments: activeAssessments,
    merge_config: { merged_exams: mergedExams },
  };

  // Disable submit button
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML =
    '<span class="material-symbols-outlined mr-2 animate-spin">progress_activity</span>Saving...';

  try {
    const url = configId
      ? `/reports/api/configs/${configId}`
      : "/reports/api/configs";
    const method = configId ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.success) {
      showNotification(result.message, "success");
      closeConfigModal();
      loadConfigs(); // Refresh the configurations list
    } else {
      showNotification("Error: " + result.error, "error");
    }
  } catch (error) {
    console.error("Error saving config:", error);
    showNotification("Error saving configuration. Please try again.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
  }
});

async function deleteConfig(configId, configName) {
  showConfirmModal({
    title: "Delete Report Configuration",
    message: `Are you sure you want to delete "${configName}"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
    confirmClass:
      "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium",
    onConfirm: async function () {
      try {
        const response = await fetch(`/reports/api/configs/${configId}`, {
          method: "DELETE",
        });

        const data = await response.json();

        if (data.success) {
          showNotification(data.message, "success");
          loadConfigs(); // Refresh the list
        } else {
          showNotification(data.message, "error");
        }
      } catch (error) {
        console.error("Error deleting config:", error);
        showNotification(
          "An error occurred while deleting the config",
          "error"
        );
      }
    },
  });
}
