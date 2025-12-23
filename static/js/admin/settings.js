// Settings Page JavaScript - Term Management and Form Handling

document.addEventListener("DOMContentLoaded", function () {
  // Term Management Elements
  const addTermBtn = document.getElementById("add-term-btn");
  const termFormContainer = document.getElementById("term-form-container");
  const termForm = document.getElementById("term-form");
  const closeFormBtn = document.getElementById("close-form-btn");
  const cancelFormBtn = document.getElementById("cancel-form-btn");
  const termsList = document.getElementById("terms-list");
  const formTitle = document.getElementById("form-title");
  const submitBtnText = document.getElementById("submit-btn-text");
  const schoolLogoInput = document.getElementById("school-logo");
  const logoPreview = document.getElementById("logo-preview");

  // Term data storage
  let terms = [];

  // Initialize
  loadTerms();
  setupEventListeners();

  // Setup Event Listeners
  function setupEventListeners() {
    // Term form events
    if (addTermBtn) {
      addTermBtn.addEventListener("click", showAddTermForm);
    }

    if (closeFormBtn) {
      closeFormBtn.addEventListener("click", hideTermForm);
    }

    if (cancelFormBtn) {
      cancelFormBtn.addEventListener("click", hideTermForm);
    }

    if (termForm) {
      termForm.addEventListener("submit", handleTermSubmit);
    }

    // Logo preview
    if (schoolLogoInput) {
      schoolLogoInput.addEventListener("change", handleLogoPreview);
    }

    // Term number auto-fills term name
    const termNumberSelect = document.getElementById("term-number");
    if (termNumberSelect) {
      termNumberSelect.addEventListener("change", function () {
        const termNameInput = document.getElementById("term-name");
        const termNames = {
          1: "First Term",
          2: "Second Term",
          3: "Third Term",
        };
        if (termNameInput && this.value) {
          termNameInput.value = termNames[this.value] || "";
        }
      });
    }

    // Details toggle animation
    const detailsElements = document.querySelectorAll("details");
    detailsElements.forEach((details) => {
      details.addEventListener("toggle", function () {
        const icon = this.querySelector(
          "summary span.material-symbols-outlined:last-child",
        );
        if (icon) {
          if (this.open) {
            icon.style.transform = "rotate(180deg)";
          } else {
            icon.style.transform = "rotate(0deg)";
          }
        }
      });
    });

    // Attach permission listeners so toggles update backend when changed
    // (function defined below via attachPermissionListeners)
    attachPermissionListeners();
    
    // Attach question upload permission listeners
    attachQuestionUploadPermissionListeners();
  }

  // Show Add Term Form
  function showAddTermForm() {
    formTitle.textContent = "Add New Term";
    submitBtnText.textContent = "Save Term";
    termForm.reset();
    document.getElementById("term-id").value = "";
    document.getElementById("is-active").checked = true;
    document.getElementById("is-current").checked = false;
    termFormContainer.classList.remove("hidden");
    termFormContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Hide Term Form
  function hideTermForm() {
    termFormContainer.classList.add("hidden");
    termForm.reset();
  }

  // Show Edit Term Form
  function showEditTermForm(term) {
    formTitle.textContent = "Edit Term";
    submitBtnText.textContent = "Update Term";

    document.getElementById("term-id").value = term.term_id;
    document.getElementById("academic-session").value = term.academic_session;
    document.getElementById("term-number").value = term.term_number;
    document.getElementById("term-name").value = term.term_name;
    document.getElementById("start-date").value = term.start_date;
    document.getElementById("end-date").value = term.end_date;
    document.getElementById("is-active").checked = term.is_active;
    document.getElementById("is-current").checked = term.is_current;

    termFormContainer.classList.remove("hidden");
    termFormContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Handle Term Form Submit
  async function handleTermSubmit(e) {
    e.preventDefault();

    const termId = document.getElementById("term-id").value;
    const formData = {
      term_name: document.getElementById("term-name").value,
      term_number: parseInt(document.getElementById("term-number").value),
      academic_session: document.getElementById("academic-session").value,
      start_date: document.getElementById("start-date").value,
      end_date: document.getElementById("end-date").value,
      is_active: document.getElementById("is-active").checked,
      is_current: document.getElementById("is-current").checked,
    };

    // Validate dates
    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      showNotification("End date must be after start date", "error");
      return;
    }

    try {
      let response;
      if (termId) {
        // Update existing term
        response = await fetch(`/admin/settings/terms/${termId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
      } else {
        // Create new term
        response = await fetch("/admin/settings/terms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
      }

      const result = await response.json();

      if (result.success) {
        showNotification(result.message, "success");
        hideTermForm();
        await loadTerms();
      } else {
        showNotification(result.message || "Operation failed", "error");
      }
    } catch (error) {
      console.error("Error saving term:", error);
      showNotification("Failed to save term. Please try again.", "error");
    }
  }
// fetch(`/admin/settings/terms/${termId}`
  // Delete Term
  async function deleteTerm(termId) {
    window.showConfirmModal({
      title: "Delete Term",
      message: `Are you sure you want to delete this term? This action cannot be undone and will remove all associated data.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      confirmClass: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
      onConfirm: async () => {
        try {
          const response = await fetch(`/admin/settings/terms/${termId}`, {
            method: "DELETE",
          });
          const result = await response.json();
          if (result.success) {
            showNotification(result.message, "success");
            await loadTerms();
          } else {
            showNotification(result.message || "Failed to delete term", "error");
          }
        } catch (error) {
          console.error("Error deleting term:", error);
          showNotification("Failed to delete term. Please try again.", "error");
        }
      },
    });
  }

  // Load Terms from Backend
  async function loadTerms() {
    try {
      const response = await fetch("/admin/settings/terms");
      const result = await response.json();
      console.log(result.terms);

      if (result.success) {
        terms = result.terms || [];
        renderTermsList();
      } else {
        showNotification("Failed to load terms", "error");
      }
    } catch (error) {
      console.error("Error loading terms:", error);
      showNotification(
        "Failed to load terms. Please refresh the page.",
        "error",
      );
    }
  }

  // Render Terms List
  function renderTermsList() {
    const emptyState = document.getElementById("empty-state");

    if (terms.length === 0) {
      termsList.innerHTML = "";
      if (emptyState) {
        emptyState.classList.remove("hidden");
        termsList.appendChild(emptyState);
      }
      updateStats();
      return;
    }

    if (emptyState) {
      emptyState.classList.add("hidden");
    }

    // Sort terms by session and term number
    const sortedTerms = [...terms].sort((a, b) => {
      if (a.academic_session !== b.academic_session) {
        return b.academic_session.localeCompare(a.academic_session);
      }
      return a.term_number - b.term_number;
    });

    termsList.innerHTML = sortedTerms
      .map((term) => createTermCard(term))
      .join("");

    // Attach event listeners to action buttons
    termsList.querySelectorAll(".edit-term-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const termId = this.dataset.termId;
        const term = terms.find((t) => t.term_id === termId);
        if (term) showEditTermForm(term);
      });
    });

    termsList.querySelectorAll(".delete-term-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const termId = this.dataset.termId;
        deleteTerm(termId);
      });
    });

    updateStats();
  }

  // Create Term Card HTML
  function createTermCard(term) {
    const termNames = {
      1: "First Term",
      2: "Second Term",
      3: "Third Term",
    };

    const startDate = new Date(term.start_date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const endDate = new Date(term.end_date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return `
            <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all">
                <div class="flex-1">
                    <div class="flex items-center gap-3 flex-wrap">
                        <div class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                            <span class="material-symbols-outlined text-primary text-lg">event</span>
                            <span>${term.term_name || termNames[term.term_number]}</span>
                        </div>
                        ${term.is_current ? '<span class="px-2 py-1 text-xs font-medium bg-primary/20 text-primary dark:bg-primary/30 dark:text-white rounded-full">Current</span>' : ""}
                        ${term.is_active ? '<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">Active</span>' : '<span class="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300 rounded-full">Inactive</span>'}
                    </div>
                    <div class="mt-2 flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
                        <span class="flex items-center gap-1">
                            <span class="material-symbols-outlined text-sm">school</span>
                            Session: ${term.academic_session}
                        </span>
                        <span class="flex items-center gap-1">
                            <span class="material-symbols-outlined text-sm">calendar_month</span>
                            ${startDate} - ${endDate}
                        </span>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button
                        class="edit-term-btn p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                        title="Edit Term"
                        data-term-id="${term.term_id}">
                        <span class="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button
                        class="delete-term-btn p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        title="Delete Term"
                        data-term-id="${term.term_id}">
                        <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                </div>
            </div>
        `;
  }

  // Update Statistics
  function updateStats() {
    const totalTerms = terms.length;
    const currentTerm = terms.find((t) => t.is_current);
    const activeSessions = [...new Set(terms.map((t) => t.academic_session))];

    const statsContainer = document.querySelector(
      ".grid.grid-cols-1.sm\\:grid-cols-3",
    );
    if (statsContainer) {
      const stats = statsContainer.querySelectorAll("div");
      if (stats[0]) {
        const totalElement = stats[0].querySelector(".text-2xl");
        if (totalElement) totalElement.textContent = totalTerms;
      }
      if (stats[1]) {
        const currentElement = stats[1].querySelector(".text-2xl");
        if (currentElement)
          currentElement.textContent = currentTerm ? "1" : "0";
      }
      if (stats[2]) {
        const activeSession = currentTerm
          ? currentTerm.academic_session
          : activeSessions[0] || "N/A";
        const sessionElement = stats[2].querySelector(".text-2xl");
        if (sessionElement) sessionElement.textContent = activeSession;
      }
    }
  }

  // Handle Logo Preview
  function handleLogoPreview(e) {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        showNotification("Image size must be less than 2MB", "error");
        e.target.value = "";
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        showNotification("Please select a valid image file", "error");
        e.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = function (event) {
        logoPreview.innerHTML = `<img src="${event.target.result}" alt="School Logo" class="w-full h-full object-cover rounded-lg">`;
      };
      reader.readAsDataURL(file);
    }
  }

  // Show Notification
  function showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${
      type === "success"
        ? "bg-green-500 text-white"
        : type === "error"
          ? "bg-red-500 text-white"
          : "bg-blue-500 text-white"
    }`;
    notification.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-sm">${
                  type === "success"
                    ? "check_circle"
                    : type === "error"
                      ? "error"
                      : "info"
                }</span>
                <span>${message}</span>
            </div>
        `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = "translateX(0)";
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = "translateX(400px)";
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  // Load School Data from Backend
  async function loadSchoolData() {
    try {
      const response = await fetch("/admin/settings/school");
      const data = await response.json();

      if (data.success && data.school) {
        const school = data.school;

        // Populate form fields
        if (document.getElementById("school-name"))
          document.getElementById("school-name").value =
            school.school_name || "";
        if (document.getElementById("school-code"))
          document.getElementById("school-code").value =
            school.school_code || "";
        if (document.getElementById("school-motto"))
          document.getElementById("school-motto").value = school.motto || "";
        if (document.getElementById("school-address"))
          document.getElementById("school-address").value =
            school.address || "";
        if (document.getElementById("school-phone"))
          document.getElementById("school-phone").value = school.phone || "";
        if (document.getElementById("school-contact"))
          document.getElementById("school-contact").value = school.email || "";
        if (document.getElementById("school-website"))
          document.getElementById("school-website").value =
            school.website || "";
        if (document.getElementById("principal-name"))
          document.getElementById("principal-name").value =
            school.principal_name || "";
        if (document.getElementById("established-date"))
          document.getElementById("established-date").value =
            school.established_date || "";

        // Display logo if exists
        if (school.logo && logoPreview) {
          logoPreview.innerHTML = `<img src="/static/${school.logo}" alt="School Logo" class="w-full h-full object-cover rounded-lg">`;
        }
      } else if (!data.success && data.data == {}) {
        console.error("School not found");
      }
    } catch (error) {
      console.error("Error loading school data:", error.message);
    }
  }

  // Load existing school data on page load
  loadSchoolData();

  // Load permissions and populate toggles
  let permissionsCache = [];
  async function loadPermissions() {
    try {
      const resp = await fetch("/admin/settings/permissions");
      const data = await resp.json();
      if (data.success && Array.isArray(data.permissions)) {
        permissionsCache = data.permissions;
        // Map known permission names to controls
        permissionsCache.forEach((p) => {
          switch (p.permission_name) {
            case "users_can_register": {
              const el = document.getElementById("user-register");
              if (el) el.checked = !!p.is_active;
              break;
            }
            case "teachers_create_exams": {
              const el = document.getElementById("teacher-create-exam");
              if (el) el.checked = !!p.is_active;
              break;
            }
            case "students_view_results": {
              const el = document.getElementById("student-results");
              if (el) el.checked = !!p.is_active;
              break;
            }
            case "students_can_write_exam": {
              const el = document.getElementById("student-write-exam");
              // Always set to false (off by default)
              if (el) el.checked = false;
              break;
            }
            case "admins_can_upload_questions": {
              const el = document.getElementById("admin-upload-questions");
              if (el) el.checked = !!p.is_active;
              break;
            }
            case "teachers_can_upload_questions": {
              const el = document.getElementById("teacher-upload-questions");
              if (el) el.checked = !!p.is_active;
              break;
            }
            default:
              break;
          }
        });
        
        // Load current test type and deadline
        loadTestSettings();
      }
    } catch (err) {
      console.error("Error loading permissions:", err);
    }
  }

  // Load test settings (current test type and deadline)
  async function loadTestSettings() {
    try {
      // For now, we'll just set default values
      // In a real implementation, these would be loaded from the backend
      const currentTestTypeSelect = document.getElementById("current-test-type");
      const deadlineInput = document.getElementById("question-upload-deadline");
      
      if (currentTestTypeSelect) {
        // Set default to first_ca
        currentTestTypeSelect.value = "first_ca";
      }
      
      if (deadlineInput) {
        // Set default to 2 weeks from now
        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
        deadlineInput.value = twoWeeksFromNow.toISOString().slice(0, 16);
      }
    } catch (err) {
      console.error("Error loading test settings:", err);
    }
  }

  // Attach listeners to permission toggles so changes are sent to backend
  function attachPermissionListeners() {
    const mapping = [
      { id: "user-register", name: "users_can_register" },
      { id: "teacher-create-exam", name: "teachers_create_exams" },
      { id: "student-results", name: "students_view_results" },
      { id: "student-write-exam", name: "students_can_write_exam" },
      { id: "student-view-dashboard", name: "students_can_view_dashboard" },
      { id: "teacher-view-dashboard", name: "teachers_can_view_dashboard" },
      { id: "staff-view-dashboard", name: "staff_can_view_dashboard" },
    ];

    mapping.forEach((m) => {
      const el = document.getElementById(m.id);
      if (!el) return;
      el.addEventListener("change", async function () {
        // Optimistically update UI already done by checkbox; now persist change
        try {
          await updatePermission(m.name, this.checked);
          
          // Special handling for "Students can write exams" toggle
          if (m.id === "student-write-exam") {
            handleStudentWriteExamToggle(this.checked);
          }
        } catch (e) {
          console.error("Failed to update permission:", e);
          showNotification("Failed to update permission", "error");
          // Revert checkbox on error
          this.checked = !this.checked;
        }
      });
    });

    // Ensure permissions are loaded to populate initial states
    loadPermissions();
  }

  // Attach listeners for question upload permissions
  function attachQuestionUploadPermissionListeners() {
    const questionUploadMapping = [
      { id: "admin-upload-questions", name: "admins_can_upload_questions" },
      { id: "teacher-upload-questions", name: "teachers_can_upload_questions" },
    ];

    questionUploadMapping.forEach((m) => {
      const el = document.getElementById(m.id);
      if (!el) return;
      el.addEventListener("change", async function () {
        try {
          await updatePermission(m.name, this.checked);
        } catch (e) {
          console.error("Failed to update permission:", e);
          showNotification("Failed to update permission", "error");
          // Revert checkbox on error
          this.checked = !this.checked;
        }
      });
    });

    // Add event listener for current test type dropdown
    const currentTestTypeSelect = document.getElementById("current-test-type");
    if (currentTestTypeSelect) {
      currentTestTypeSelect.addEventListener("change", async function () {
        try {
          // In a real implementation, this would save to the backend
          showNotification("Current test type updated", "success");
        } catch (e) {
          console.error("Failed to update test type:", e);
          showNotification("Failed to update test type", "error");
        }
      });
    }

    // Add event listener for deadline input
    const deadlineInput = document.getElementById("question-upload-deadline");
    if (deadlineInput) {
      deadlineInput.addEventListener("change", async function () {
        try {
          // In a real implementation, this would save to the backend
          showNotification("Question upload deadline updated", "success");
        } catch (e) {
          console.error("Failed to update deadline:", e);
          showNotification("Failed to update deadline", "error");
        }
      });
    }
  }

  // Handle the "Students can write exams" toggle
  async function handleStudentWriteExamToggle(isEnabled) {
    const upcomingExamsContainer = document.getElementById("upcoming-exams-container");
    
    if (isEnabled) {
      // When enabled, show the upcoming exams list
      upcomingExamsContainer.classList.remove("hidden");
      await loadUpcomingExams();
    } else {
      // When disabled, hide the upcoming exams list
      upcomingExamsContainer.classList.add("hidden");
    }
  }

  // Load and display upcoming exams
  async function loadUpcomingExams() {
    const examsList = document.getElementById("upcoming-exams-list");
    const saveExceptionsBtn = document.getElementById("save-exceptions-btn");
    
    try {
      // Show loading state
      examsList.innerHTML = `
        <div class="text-center py-4 text-blue-700 dark:text-blue-300">
          <span class="material-symbols-outlined text-2xl mb-1">hourglass_empty</span>
          <p>Loading upcoming exams...</p>
        </div>
      `;
      
      // Fetch upcoming exams (exams that haven't taken place yet)
      const response = await fetch("/admin/settings/upcoming-exams");
      const result = await response.json();
      
      if (result.success && result.exams && result.exams.length > 0) {
        // Display the upcoming exams with checkboxes
        examsList.innerHTML = result.exams.map(exam => `
          <div class="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm">
            <div class="flex items-center gap-3">
              <input 
                type="checkbox" 
                id="exam-${exam.id}" 
                class="form-checkbox text-blue-600 rounded focus:ring-blue-500"
                data-exam-id="${exam.id}"
              >
              <div>
                <p class="font-medium text-gray-900 dark:text-white">${exam.name}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">${exam.class_room_name} • ${exam.subject_name} • ${exam.date}</p>
              </div>
            </div>
            <span class="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
              ${exam.exam_type}
            </span>
          </div>
        `).join('');
        
        // Add event listener to save button
        if (saveExceptionsBtn) {
          saveExceptionsBtn.addEventListener("click", saveExceptionSettings);
        }
      } else {
        // No upcoming exams found
        examsList.innerHTML = `
          <div class="text-center py-4 text-green-700 dark:text-green-300">
            <span class="material-symbols-outlined text-2xl mb-1">check_circle</span>
            <p>No upcoming exams found</p>
          </div>
        `;
      }
    } catch (error) {
      console.error("Error loading upcoming exams:", error);
      examsList.innerHTML = `
        <div class="text-center py-4 text-red-700 dark:text-red-300">
          <span class="material-symbols-outlined text-2xl mb-1">error</span>
          <p>Failed to load upcoming exams</p>
        </div>
      `;
    }
  }
  
  // Save exception settings
  async function saveExceptionSettings() {
    try {
      // Get all selected exams
      const selectedExams = [];
      const checkboxes = document.querySelectorAll('#upcoming-exams-list input[type="checkbox"]:checked');
      
      checkboxes.forEach(checkbox => {
        selectedExams.push(checkbox.dataset.examId);
      });
      
      // Send to backend
      const response = await fetch("/admin/settings/save-exceptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          excluded_exams: selectedExams
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        showNotification("Exception settings saved successfully", "success");
      } else {
        throw new Error(result.message || "Failed to save exception settings");
      }
    } catch (error) {
      console.error("Error saving exception settings:", error);
      showNotification("Failed to save exception settings: " + error.message, "error");
    }
  }

  // Update permission by finding its id in permissionsCache, then POSTing update
  async function updatePermission(permission_name, is_active) {
    try {
      // find permission id
      let perm =
        permissionsCache.find((p) => p.permission_name === permission_name) ||
        null;

      if (!perm) {
        // reload cache and try again
        await loadPermissions();
        perm =
          permissionsCache.find((p) => p.permission_name === permission_name) ||
          null;
      }

      const payload = {
        permission_name: permission_name,
        is_active: !!is_active,
      };

      if (perm && perm.permission_id) {
        payload.permission_id = perm.permission_id;
        payload.permission_description = perm.permission_description || "";
        payload.created_for = perm.created_for || "system";
      } else {
        // If no existing permission (shouldn't happen because defaults are created),
        // server will attempt to create one (manage_permissions checks duplicates)
        payload.permission_description = "";
        payload.created_for = "system";
      }

      const response = await fetch("/admin/settings/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        showNotification(result.message || "Permission updated", "success");
        // update local cache entry if present
        if (result.permission) {
          // replace or add
          const idx = permissionsCache.findIndex(
            (p) => p.permission_id === result.permission.permission_id,
          );
          if (idx >= 0) {
            permissionsCache[idx] = result.permission;
          } else {
            permissionsCache.push(result.permission);
          }
        } else if (perm) {
          // update cached active flag
          perm.is_active = !!is_active;
        } else {
          // refresh entire cache
          await loadPermissions();
        }
      } else {
        throw new Error(result.message || "Unknown error");
      }
    } catch (err) {
      console.error("updatePermission error:", err);
      throw err;
    }
  }

  // Save School Settings
  function saveSchoolSettings() {
    const formData = new FormData();

    // Collect all form data
    const schoolName = document.getElementById("school-name")?.value;
    const schoolCode = document.getElementById("school-code")?.value;
    const motto = document.getElementById("school-motto")?.value;
    const address = document.getElementById("school-address")?.value;
    const phone = document.getElementById("school-phone")?.value;
    const email = document.getElementById("school-contact")?.value;
    const website = document.getElementById("school-website")?.value;
    const principalName = document.getElementById("principal-name")?.value;
    const establishedDate = document.getElementById("established-date")?.value;
    const logoFile = document.getElementById("school-logo")?.files[0];

    // Validate required fields
    if (!schoolName || !address || !phone || !email) {
      showNotification(
        "Please fill all required fields (School Name, Address, Phone, Email)",
        "error",
      );
      return;
    }

    // Append form data
    formData.append("school_name", schoolName);
    formData.append("school_code", schoolCode || "");
    formData.append("motto", motto || "");
    formData.append("address", address);
    formData.append("phone", phone);
    formData.append("email", email);
    formData.append("website", website || "");
    formData.append("principal_name", principalName || "");
    formData.append("established_date", establishedDate || "");

    // Append logo file if selected
    if (logoFile) {
      formData.append("logo", logoFile);
    }

    // Send to backend
    fetch("/admin/settings/school", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          showNotification(data.message, "success");
          // Reload school data to update display
          loadSchoolData();
        } else {
          showNotification(
            data.message || "Error saving school information",
            "error",
          );
        }
      })
      .catch((error) => {
        console.error("Error saving school data:", error);
        showNotification(
          "An error occurred while saving school information",
          "error",
        );
      });
  }

  // Attach save button handler
  const saveButtons = document.querySelectorAll("button");
  saveButtons.forEach((btn) => {
    if (btn.textContent.includes("Save School Information")) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        saveSchoolSettings();
      });
    }
  });

  // ===========================
  // SIMPLE SECTION MANAGEMENT
  // ===========================

  const sectionsContainer = document.getElementById("sections-container");
  const addSectionRowBtn = document.getElementById("add-section-row-btn");
  const saveSectionsBtn = document.getElementById("save-sections-btn");
  const existingSectionsList = document.getElementById(
    "existing-sections-list",
  );

  // Load existing sections on page load
  if (existingSectionsList) {
    loadExistingSections();
  }

  // Add another section input row
  if (addSectionRowBtn) {
    addSectionRowBtn.addEventListener("click", function () {
      const newRow = document.createElement("div");
      newRow.className = "section-input-row flex items-end gap-3";
      newRow.innerHTML = `
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Section Name</label>
          <input
            class="section-name w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
            type="text"
            placeholder="e.g., Nursery, Primary, Secondary"
            required
          />
        </div>
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Abbreviation</label>
          <input
            class="section-abbr w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
            type="text"
            placeholder="e.g., NUR, PRI, SEC"
            required
          />
        </div>
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Level</label>
          <input
            class="section-level w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
            type="number"
            placeholder="e.g., 1, 2, 3..."
            min="1"
            max="12"
            required
          />
        </div>
        <button
          type="button"
          class="remove-section-btn px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200"
          title="Remove"
        >
          <span class="material-symbols-outlined text-sm">close</span>
        </button>
      `;

      sectionsContainer.appendChild(newRow);

      // Add event listener to remove button
      newRow
        .querySelector(".remove-section-btn")
        .addEventListener("click", function () {
          newRow.remove();
        });
    });
  }

  // Save sections
  if (saveSectionsBtn) {
    saveSectionsBtn.addEventListener("click", async function () {
      const rows = sectionsContainer.querySelectorAll(".section-input-row");
      const sectionsToSave = [];

      // Collect data from all rows
      rows.forEach((row) => {
        const nameInput = row.querySelector(".section-name");
        const abbrInput = row.querySelector(".section-abbr");
        const levelSelect = row.querySelector(".section-level");

        if (nameInput.value.trim() && abbrInput.value.trim() && levelSelect.value !== '') {
          sectionsToSave.push({
            name: nameInput.value.trim(),
            abbreviation: abbrInput.value.trim().toUpperCase(),
            level: parseInt(levelSelect.value)
          });
        }
      });

      if (sectionsToSave.length === 0) {
        showNotification("Please enter at least one section", "error");
        return;
      }

      // Save each section
      let successCount = 0;
      let errorCount = 0;

      for (const section of sectionsToSave) {
        try {
          const response = await fetch("/admin/settings/sections", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(section),
          });

          const result = await response.json();

          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            console.error("Error saving section:", result.message);
          }
        } catch (error) {
          errorCount++;
          console.error("Error saving section:", error);
        }
      }

      // Show results
      if (successCount > 0) {
        showNotification(
          `Successfully saved ${successCount} section(s)`,
          "success",
        );

        // Clear the form
        sectionsContainer.innerHTML = `
          <div class="section-input-row flex items-end gap-3">
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Section Name</label>
              <input
                class="section-name w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                type="text"
                placeholder="e.g., Nursery, Primary, Secondary"
                required
              />
            </div>
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Abbreviation</label>
              <input
                class="section-abbr w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                type="text"
                placeholder="e.g., NUR, PRI, SEC"
                required
              />
            </div>
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Level</label>
              <input
                class="section-level w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
                type="number"
                placeholder="e.g., 1, 2, 3..."
                min="1"
                max="12"
                required
              />
            </div>
            <button
              type="button"
              class="remove-section-btn hidden px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200"
              title="Remove"
            >
              <span class="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        `;

        // Reload existing sections
        loadExistingSections();
      }

      if (errorCount > 0) {
        showNotification(
          `Failed to save ${errorCount} section(s). Check console for details.`,
          "error",
        );
      }
    });
  }

  // Load and display existing sections
  async function loadExistingSections() {
    if (!existingSectionsList) return;

    try {
      const response = await fetch("/admin/settings/sections");
      const result = await response.json();
      console.log(result);
      if (result.success) {
        const sections = result.sections;
        console.log(sections);
        if (sections.length === 0) {
          existingSectionsList.innerHTML = `
            <p class="text-sm text-gray-500 dark:text-gray-400 italic">No sections added yet</p>
          `;
          return;
        }

        existingSectionsList.innerHTML = sections
          .map(
            (section) => `
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600" data-section-id="${section.section_id}">
            <div>
              <span class="font-medium text-gray-900 dark:text-white">${section.name}</span>
              <span class="ml-2 text-sm text-gray-500 dark:text-gray-400">(${section.abbreviation})</span>
              <span class="ml-2 text-sm text-gray-600 dark:text-gray-300">| Level: ${section.level || 'N/A'}</span>
            </div>
            <div class="flex gap-2">
              <button
                class="edit-section-btn px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                data-section-id="${section.section_id}"
                data-section-name="${section.name}"
                data-section-abbreviation="${section.abbreviation}"
                data-section-level="${section.level || ''}"
                title="Edit section"
              >
                Edit
              </button>
              <button
                class="delete-section-btn px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-all"
                data-section-id="${section.section_id}"
                title="Delete section"
              >
                Delete
              </button>
            </div>
          </div>
        `,
          )
          .join("");

        // Add edit functionality
        existingSectionsList
          .querySelectorAll(".edit-section-btn")
          .forEach((btn) => {
            btn.addEventListener("click", function () {
              const sectionId = this.dataset.sectionId;
              const sectionName = this.dataset.sectionName;
              const sectionAbbreviation = this.dataset.sectionAbbreviation;
              const sectionLevel = this.dataset.sectionLevel;
              
              openEditSectionModal(sectionId, sectionName, sectionAbbreviation, sectionLevel);
            });
          });

        // Add delete functionality
        existingSectionsList
          .querySelectorAll(".delete-section-btn")
          .forEach((btn) => {
            btn.addEventListener("click", async function () {
              const sectionId = this.dataset.sectionId;

              if (!confirm("Are you sure you want to delete this section?")) {
                return;
              }

              try {
                const response = await fetch(
                  `/admin/settings/sections/${sectionId}`,
                  {
                    method: "DELETE",
                  },
                );

                const result = await response.json();

                if (result.success) {
                  showNotification(result.message, "success");
                  loadExistingSections();
                } else {
                  showNotification(
                    result.message || "Failed to delete",
                    "error",
                  );
                }
              } catch (error) {
                console.error("Error deleting section:", error);
                showNotification("Failed to delete section", "error");
              }
            });
          });
      }
    } catch (error) {
      console.error("Error loading sections:", error);
    }
  }

  // Open edit section modal
  function openEditSectionModal(sectionId, sectionName, sectionAbbreviation, sectionLevel) {
    // Create and show modal
    const modal = document.createElement("div");
    modal.className = "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4";
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">Edit Section</h3>
          <button id="close-modal" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Section Name</label>
            <input
              type="text" 
              id="edit-section-name" 
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
              value="${sectionName}"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Abbreviation</label>
            <input
              type="text" 
              id="edit-section-abbreviation" 
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
              value="${sectionAbbreviation}"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Level</label>
            <input
              type="number" 
              id="edit-section-level" 
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition"
              value="${sectionLevel}"
              min="1"
              max="12"
              required
            />
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button id="cancel-edit" class="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-3 px-6 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            Cancel
          </button>
          <button id="save-edited-section" class="flex-1 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
            Update Section
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector("#close-modal").addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    modal.querySelector("#cancel-edit").addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    modal.querySelector("#save-edited-section").addEventListener("click", async () => {
      const name = document.getElementById("edit-section-name").value.trim();
      const abbreviation = document.getElementById("edit-section-abbreviation").value.trim();
      const level = document.getElementById("edit-section-level").value;

      if (!name || !abbreviation || level === '') {
        showNotification("Please fill in all fields", "error");
        return;
      }

      try {
        const response = await fetch(`/admin/settings/sections/${sectionId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: name,
            abbreviation: abbreviation,
            level: parseInt(level)
          }),
        });

        const result = await response.json();

        if (result.success) {
          showNotification(result.message, "success");
          document.body.removeChild(modal);
          loadExistingSections(); // Reload the sections list
        } else {
          showNotification(result.message || "Failed to update section", "error");
        }
      } catch (error) {
        console.error("Error updating section:", error);
        showNotification("Failed to update section", "error");
      }
    });

    // Close on backdrop click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  // ===========================
  // Assessment Types Management
  // ===========================
  const addAssessmentBtn = document.getElementById("add-assessment-btn");
  const assessmentsList = document.getElementById("assessments-list");

  // Load assessment types on page load
  loadAssessmentTypes();

  // Add assessment button click
  if (addAssessmentBtn) {
    addAssessmentBtn.addEventListener("click", addAssessmentType);
  }

  async function loadAssessmentTypes() {
    try {
      const response = await fetch("/admin/settings/assessments");
      const data = await response.json();

      if (data.success && data.assessments) {
        renderAssessmentTypes(data.assessments);
      }
    } catch (error) {
      console.error("Error loading assessment types:", error);
      showNotification("Failed to load assessment types", "error");
    }
  }

  function renderAssessmentTypes(assessments) {
    if (!assessmentsList) return;

    if (assessments.length === 0) {
      assessmentsList.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <span class="material-symbols-outlined text-4xl mb-2">assignment</span>
          <p>No assessment types configured yet</p>
        </div>
      `;
      return;
    }

    assessmentsList.innerHTML = assessments
      .map(
        (assessment) => `
      <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
        <div class="flex-1">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-primary">assignment</span>
            <div>
              <h4 class="font-semibold text-gray-900 dark:text-white">${assessment.name}</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Code: ${assessment.code} | Max Score: ${assessment.max_score} | Order: ${assessment.order}
                ${assessment.is_cbt_enabled ? ' | <span class="text-blue-600 dark:text-blue-400">CBT Enabled</span>' : ''}
              </p>
              ${assessment.description ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${assessment.description}</p>` : ''}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            onclick="toggleAssessmentStatus('${assessment.assessment_type_id}', ${!assessment.is_active})"
            class="px-3 py-1 rounded-lg text-sm font-medium ${
              assessment.is_active
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }"
          >
            ${assessment.is_active ? "Active" : "Inactive"}
          </button>
          <button
            onclick="editAssessment('${assessment.assessment_type_id}')"
            class="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
            title="Edit"
          >
            <span class="material-symbols-outlined text-lg">edit</span>
          </button>
          <button
            onclick="deleteAssessment('${assessment.assessment_type_id}')"
            class="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
            title="Delete"
          >
            <span class="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      </div>
    `
      )
      .join("");
  }

  async function addAssessmentType() {
    const name = document.getElementById("assessment-name").value.trim();
    const code = document.getElementById("assessment-code").value.trim();
    const maxScore = document.getElementById("assessment-max-score").value;
    const order = document.getElementById("assessment-order").value;
    const isCbtEnabled = document.getElementById("assessment-cbt-enabled").checked;
    const description = document.getElementById("assessment-description").value.trim();

    if (!name || !code || !maxScore) {
      showNotification("Please fill in all required fields", "error");
      return;
    }

    try {
      const response = await fetch("/admin/settings/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code,
          max_score: parseFloat(maxScore),
          order: parseInt(order),
          is_cbt_enabled: isCbtEnabled,
          description,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showNotification("Assessment type added successfully", "success");
        // Clear form
        document.getElementById("assessment-name").value = "";
        document.getElementById("assessment-code").value = "";
        document.getElementById("assessment-max-score").value = "";
        document.getElementById("assessment-order").value = "1";
        document.getElementById("assessment-cbt-enabled").checked = false;
        document.getElementById("assessment-description").value = "";
        // Reload list
        loadAssessmentTypes();
      } else {
        showNotification(data.message || "Failed to add assessment type", "error");
      }
    } catch (error) {
      console.error("Error adding assessment type:", error);
      showNotification("Failed to add assessment type", "error");
    }
  }

  // Make functions global for onclick handlers
  window.toggleAssessmentStatus = async function (assessmentId, newStatus) {
    try {
      const response = await fetch(`/admin/settings/assessments/${assessmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        showNotification(
          `Assessment ${newStatus ? "activated" : "deactivated"} successfully`,
          "success"
        );
        loadAssessmentTypes();
      } else {
        showNotification(data.message || "Failed to update assessment", "error");
      }
    } catch (error) {
      console.error("Error updating assessment:", error);
      showNotification("Failed to update assessment", "error");
    }
  };

  window.deleteAssessment = async function (assessmentId) {
    // Show confirmation modal
    showModal({
      title: "Delete Assessment Type",
      message: "Are you sure you want to delete this assessment type? This action cannot be undone.",
      icon: "warning",
      iconColor: "text-red-500",
      confirmText: "Delete",
      confirmClass: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
      onConfirm: async () => {
        try {
          const response = await fetch(`/admin/settings/assessments/${assessmentId}`, {
            method: "DELETE",
          });

          const data = await response.json();

          if (data.success) {
            showNotification("Assessment type deleted successfully", "success");
            loadAssessmentTypes();
          } else {
            showNotification(data.message || "Failed to delete assessment", "error");
          }
        } catch (error) {
          console.error("Error deleting assessment:", error);
          showNotification("Failed to delete assessment", "error");
        }
      },
    });
  };

  window.editAssessment = async function (assessmentId) {
    try {
      // Fetch assessment details
      const response = await fetch("/admin/settings/assessments");
      const data = await response.json();

      if (data.success) {
        const assessment = data.assessments.find((a) => a.assessment_type_id === assessmentId);
        if (!assessment) {
          showNotification("Assessment not found", "error");
          return;
        }

        // Populate edit form
        document.getElementById("assessment-name").value = assessment.name;
        document.getElementById("assessment-code").value = assessment.code;
        document.getElementById("assessment-code").disabled = true; // Don't allow code changes
        document.getElementById("assessment-max-score").value = assessment.max_score;
        document.getElementById("assessment-order").value = assessment.order;
        document.getElementById("assessment-cbt-enabled").checked = assessment.is_cbt_enabled;
        document.getElementById("assessment-description").value = assessment.description || "";

        // Change button to update mode
        const addBtn = document.getElementById("add-assessment-btn");
        addBtn.innerHTML = '<span class="material-symbols-outlined text-lg">save</span> Update Assessment Type';
        addBtn.onclick = async () => {
          await updateAssessment(assessmentId);
        };

        // Show cancel button
        const cancelBtn = document.getElementById("cancel-edit-btn");
        cancelBtn.classList.remove("hidden");
        cancelBtn.onclick = cancelEdit;

        // Scroll to form
        document.getElementById("assessment-name").scrollIntoView({ behavior: "smooth", block: "center" });
        document.getElementById("assessment-name").focus();
      }
    } catch (error) {
      console.error("Error loading assessment for edit:", error);
      showNotification("Failed to load assessment details", "error");
    }
  };

  function cancelEdit() {
    // Clear form
    document.getElementById("assessment-name").value = "";
    document.getElementById("assessment-code").value = "";
    document.getElementById("assessment-code").disabled = false;
    document.getElementById("assessment-max-score").value = "";
    document.getElementById("assessment-order").value = "1";
    document.getElementById("assessment-cbt-enabled").checked = false;
    document.getElementById("assessment-description").value = "";

    // Reset button
    const addBtn = document.getElementById("add-assessment-btn");
    addBtn.innerHTML = '<span class="material-symbols-outlined text-lg">add</span> Add Assessment Type';
    addBtn.onclick = addAssessmentType;

    // Hide cancel button
    document.getElementById("cancel-edit-btn").classList.add("hidden");
  }

  async function updateAssessment(assessmentId) {
    const name = document.getElementById("assessment-name").value.trim();
    const code = document.getElementById("assessment-code").value.trim();
    const maxScore = document.getElementById("assessment-max-score").value;
    const order = document.getElementById("assessment-order").value;
    const isCbtEnabled = document.getElementById("assessment-cbt-enabled").checked;
    const description = document.getElementById("assessment-description").value.trim();

    if (!name || !maxScore) {
      showNotification("Please fill in all required fields", "error");
      return;
    }

    try {
      const response = await fetch(`/admin/settings/assessments/${assessmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          max_score: parseFloat(maxScore),
          order: parseInt(order),
          is_cbt_enabled: isCbtEnabled,
          description,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showNotification("Assessment type updated successfully", "success");
        // Reset form
        cancelEdit();
        // Reload list
        loadAssessmentTypes();
      } else {
        showNotification(data.message || "Failed to update assessment type", "error");
      }
    } catch (error) {
      console.error("Error updating assessment type:", error);
      showNotification("Failed to update assessment type", "error");
    }
  }

  // Helper function to show modal (using existing modal system)
  function showModal(options) {
    const modal = document.createElement("div");
    modal.className = "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4";
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <div class="flex items-center mb-4">
          <span class="material-symbols-outlined ${options.iconColor || "text-primary"} text-3xl mr-3">${options.icon || "info"}</span>
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">${options.title}</h3>
        </div>
        <p class="text-gray-600 dark:text-gray-400 mb-6">${options.message}</p>
        <div class="flex gap-3">
          <button id="modal-cancel" class="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-3 px-6 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            Cancel
          </button>
          <button id="modal-confirm" class="flex-1 ${options.confirmClass || "bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"} text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
            ${options.confirmText || "Confirm"}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle cancel
    modal.querySelector("#modal-cancel").addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    // Handle confirm
    modal.querySelector("#modal-confirm").addEventListener("click", () => {
      document.body.removeChild(modal);
      if (options.onConfirm) {
        options.onConfirm();
      }
    });

    // Close on backdrop click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }
});