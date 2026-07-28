document.addEventListener("DOMContentLoaded", function () {
  // Modal functions (openModal, closeModal, showAlert, showConfirmModal)
  // are provided by modal.js loaded synchronously from base.html

  // ──────────────────────────────────────────────
  // EVENT DELEGATION — registers click handlers
  // at the container level so they always work
  // even if initialization code below throws.
  // ──────────────────────────────────────────────

  // Use document-level delegation so we don't depend on a fragile
  // grid class selector. Performance impact is negligible since we
  // match on specific selectors and return fast for non-matches.
  document.addEventListener("click", function (e) {
    // Only process clicks within the subjects area (look for a subject-card ancestor)
    var card = e.target.closest(".subject-card, [data-view-id], .assign-teacher-btn, .assign-subject-teacher-btn, [data-edit-id], [data-delete-id]");
    if (!card) return;

    // --- View Details ---
    var viewBtn = e.target.closest("[data-view-id]");
    if (viewBtn) {
      e.preventDefault();
      e.stopPropagation();
      handleViewDetails(viewBtn);
      return;
    }

    // --- Subject Head (assign teacher) ---
    var assignBtn = e.target.closest(".assign-teacher-btn");
    if (assignBtn) {
      e.preventDefault();
      e.stopPropagation();
      handleAssignTeacher(assignBtn);
      return;
    }

    // --- Assign Subject Teacher ---
    var assignSubjectTeacherBtn = e.target.closest(".assign-subject-teacher-btn");
    if (assignSubjectTeacherBtn) {
      e.preventDefault();
      e.stopPropagation();
      handleAssignSubjectTeacher(assignSubjectTeacherBtn);
      return;
    }

    // --- Edit Subject ---
    var editBtn = e.target.closest("[data-edit-id]");
    if (editBtn) {
      e.preventDefault();
      e.stopPropagation();
      handleEditSubject(editBtn);
      return;
    }

    // --- Delete Subject ---
    var deleteBtn = e.target.closest("[data-delete-id]");
    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      handleDeleteSubject(deleteBtn);
      return;
    }
  });

  // Event listeners for modal triggers (data-modal-target)
  document.querySelectorAll("[data-modal-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const modalId = button.getAttribute("data-modal-target");
      openModal(modalId);
    });
  });

  // Close modals when clicking outside
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === this) {
        closeModal(this.id);
      }
    });
  });

  // Close modals on escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal").forEach((modal) => {
        closeModal(modal.id);
      });
    }
  });

  // Store class data in window for easy access
  // This will be populated from the template via a script tag
  const classDataBySection = window.classDataBySection || {};

  // Function to update class levels based on selected section
  function updateClassLevels(
    sectionId,
    containerId = "classLevelsContainer",
    selectedValues = []
  ) {
    const classLevelsContainer = document.getElementById(containerId);
    if (!classLevelsContainer) return;

    classLevelsContainer.innerHTML = "";

    // Helper to create checkbox
    const createCheckbox = (classItem) => {
      const label = document.createElement("label");
      label.className = "flex items-center gap-2";
      const isChecked = selectedValues.includes(classItem.name)
        ? "checked"
        : "";
      label.innerHTML = `
                <input type="checkbox" name="grade_levels" value="${classItem.name}" ${isChecked}
                    class="h-4 w-4 text-primary border-gray-300 dark:border-gray-600 rounded focus:ring-primary accent-primary">
                <span class="text-sm text-gray-700 dark:text-gray-300">${classItem.name}</span>
            `;
      return label;
    };

    // Handle "All Sections" option
    if (sectionId === "all") {
      // Display all class levels from all sections
      let allClasses = [];
      for (const sectionKey in classDataBySection) {
        allClasses = allClasses.concat(classDataBySection[sectionKey]);
      }

      if (allClasses.length === 0) {
        classLevelsContainer.innerHTML =
          '<p class="text-sm text-gray-500 dark:text-gray-400">No class levels available</p>';
        return;
      }

      // Remove duplicates if any
      const uniqueClasses = Array.from(
        new Map(allClasses.map((item) => [item.id, item])).values()
      );

      uniqueClasses.forEach((classItem) => {
        classLevelsContainer.appendChild(createCheckbox(classItem));
      });
      return;
    }

    if (!sectionId || !classDataBySection[sectionId]) {
      classLevelsContainer.innerHTML =
        '<p class="text-sm text-gray-500 dark:text-gray-400">Select a section first to see available class levels</p>';
      return;
    }

    const classes = classDataBySection[sectionId];
    if (classes.length === 0) {
      classLevelsContainer.innerHTML =
        '<p class="text-sm text-gray-500 dark:text-gray-400">No class levels available for this section</p>';
      return;
    }

    classes.forEach((classItem) => {
      classLevelsContainer.appendChild(createCheckbox(classItem));
    });
  }

  // Expanded color palette for explicit color selection
  const colorPalette = [
    {
      name: "Blue",
      from: "from-blue-500",
      to: "to-blue-600",
      badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    },
    {
      name: "Purple",
      from: "from-purple-500",
      to: "to-purple-600",
      badge:
        "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    },
    {
      name: "Green",
      from: "from-green-500",
      to: "to-green-600",
      badge:
        "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    },
    {
      name: "Rose",
      from: "from-rose-500",
      to: "to-rose-600",
      badge: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
    },
    {
      name: "Orange",
      from: "from-orange-500",
      to: "to-orange-600",
      badge:
        "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
    },
    {
      name: "Emerald",
      from: "from-emerald-500",
      to: "to-emerald-600",
      badge:
        "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
    },
    {
      name: "Cyan",
      from: "from-cyan-500",
      to: "to-cyan-600",
      badge: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300",
    },
    {
      name: "Indigo",
      from: "from-indigo-500",
      to: "to-indigo-600",
      badge:
        "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
    },
    {
      name: "Pink",
      from: "from-pink-500",
      to: "to-pink-600",
      badge: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300",
    },
    {
      name: "Teal",
      from: "from-teal-500",
      to: "to-teal-600",
      badge: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
    },
    {
      name: "Amber",
      from: "from-amber-500",
      to: "to-amber-600",
      badge:
        "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    },
    {
      name: "Red",
      from: "from-red-500",
      to: "to-red-600",
      badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    },
  ];

  // Color mapping for categories (default suggestions)
  const categoryColors = {
    "Core Subject": colorPalette[0], // Blue
    Science: colorPalette[1], // Purple
    Technology: colorPalette[2], // Green
    Arts: colorPalette[3], // Rose
    Elective: colorPalette[4], // Orange
  };

  // Store current selected color at higher scope
  let selectedColor = colorPalette[0]; // Default to Blue

  // Render color palette for create form
  function renderColorPalette(containerId, selectedColorIndex = 0) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";
    colorPalette.forEach((color, index) => {
      const colorButton = document.createElement("button");
      colorButton.type = "button";
      colorButton.className = `relative h-10 w-10 rounded-lg bg-gradient-to-br ${color.from} ${color.to} hover:scale-110 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50`;
      colorButton.title = color.name;
      colorButton.dataset.colorIndex = index;

      // Add checkmark for selected color
      if (index === selectedColorIndex) {
        colorButton.innerHTML =
          '<span class="material-symbols-outlined text-white text-sm">check</span>';
        colorButton.classList.add("ring-2", "ring-primary");
      }

      colorButton.addEventListener("click", function () {
        selectedColor = colorPalette[index];
        renderColorPalette(containerId, index);

        // Update hidden input
        const hiddenInput = document.getElementById(
          containerId === "colorPalette" ? "selectedColor" : "editSelectedColor"
        );
        if (hiddenInput) {
          hiddenInput.value = JSON.stringify(selectedColor);
        }

        // Update preview if in create modal
        if (containerId === "colorPalette" && previewIconContainer) {
          previewIconContainer.className = `h-12 w-12 rounded-xl bg-gradient-to-br ${selectedColor.from} ${selectedColor.to} flex items-center justify-center`;
        }
      });

      container.appendChild(colorButton);
    });
  }

  // Live preview functionality
  const form = document.getElementById("createSubjectForm");
  const previewIconContainer = document.getElementById("previewIconContainer");
  if (form) {
    // Handle section selection in create form
    const subjectSectionSelect = form.querySelector('[name="subject_section"]');
    if (subjectSectionSelect) {
      subjectSectionSelect.addEventListener("change", function () {
        updateClassLevels(this.value);
      });
    }

    // Get preview elements
    const previewIcon = document.getElementById("previewIcon");
    const previewTitle = document.getElementById("previewTitle");
    const previewDescription = document.getElementById("previewDescription");
    const previewCategory = document.getElementById("previewCategory");
    const previewGradeLevels = document.getElementById("previewGradeLevels");

    // Update preview when inputs change
    const subjectNameInput = form.querySelector('[name="subject_name"]');
    const descriptionInput = form.querySelector('[name="description"]');
    const categorySelect = form.querySelector('[name="category"]');
    const iconSelect = form.querySelector('[name="icon_name"]');
    const gradeLevelCheckboxes = form.querySelectorAll('[name="grade_levels"]');

    // Update subject name
    if (subjectNameInput) {
      subjectNameInput.addEventListener("input", function () {
        previewTitle.textContent = this.value || "Subject Name";
      });
    }

    // Update description
    if (descriptionInput) {
      descriptionInput.addEventListener("input", function () {
        previewDescription.textContent =
          this.value || "Subject description will appear here...";
      });
    }

    // Initialize color palette
    renderColorPalette("colorPalette", 0);
    document.getElementById("selectedColor").value =
      JSON.stringify(selectedColor);

    // Update category and suggest color (but don't force it)
    if (categorySelect) {
      categorySelect.addEventListener("change", function () {
        const category = this.value;
        const suggestedColor =
          categoryColors[category] || categoryColors["Core Subject"];

        // Only suggest, don't override if user already selected a color
        // Update category badge
        previewCategory.textContent = category;
        previewCategory.className = `px-2 py-1 text-xs ${selectedColor.badge} rounded-full`;
      });
    }

    // Update icon
    if (iconSelect) {
      iconSelect.addEventListener("change", function () {
        previewIcon.textContent = this.value || "calculate";
      });
    }

    // Update grade levels
    gradeLevelCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", function () {
        const checkedLevels = Array.from(
          form.querySelectorAll('[name="grade_levels"]:checked')
        ).map((cb) => cb.value);

        if (checkedLevels.length > 0) {
          // Format grade levels display
          const firstGrade = checkedLevels[0];
          const lastGrade = checkedLevels[checkedLevels.length - 1];

          if (checkedLevels.length === 1) {
            previewGradeLevels.textContent = firstGrade;
          } else {
            previewGradeLevels.textContent = `${firstGrade} - ${lastGrade}`;
          }
        } else {
          previewGradeLevels.textContent = "Grade Levels";
        }
      });
    });
  }

  // Handle create subject form submission
  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const submitButton = form.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.innerHTML;
      try {
        // Disable submit button and show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = "Creating...";

        // Get form data
        const formData = {
          subject_name: form.querySelector('[name="subject_name"]').value,
          subject_code: form.querySelector('[name="subject_code"]').value,
          category: form.querySelector('[name="category"]').value,
          description: form.querySelector('[name="description"]').value,
          icon_name: form.querySelector('[name="icon_name"]').value,
          grade_levels: Array.from(
            form.querySelectorAll('[name="grade_levels"]:checked')
          ).map((cb) => cb.value),
          subject_head: form.querySelector('[name="subject_head"]').value,
          category_colors: document.getElementById("selectedColor").value,
        };

        // Send data to server
        const response = await fetch("/admin/subjects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (response.ok) {
          // Show success message with custom alert
          window.showAlert({
            type: "success",
            title: "Success!",
            message: "Subject created successfully!",
            onConfirm: () => {
              closeModal("createSubjectModal");
              window.location.reload();
            },
          });
        } else {
          throw new Error(result.message || "Failed to create subject");
        }
      } catch (error) {
        console.error("Error:", error);
        window.showAlert({
          type: "error",
          title: "Error",
          message: `Failed to create subject: ${error.message}`,
        });
      } finally {
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
      }
    });
  }

  // ──────────────────────────────────────────────
  // HANDLER FUNCTIONS (called by event delegation)
  // ──────────────────────────────────────────────

  // Handle view subject details
  function handleViewDetails(button) {
    try {
      const subjectId = button.getAttribute("data-view-id");

      // Get subject data from the card
      const card = button.closest(".subject-card");
      if (!card) {
        console.error("[subject.js] Card element not found");
        openModal("viewSubjectModal");
        return;
      }

      // Extract subject information from the card
      const iconContainer = card.querySelector(".h-12.w-12.rounded-xl");
      const iconSpan = card.querySelector(".material-symbols-outlined");
      const subjectName = card.querySelector("h3")?.textContent?.trim() || "";
      const description =
        card
          .querySelector("p.text-gray-600, p.dark\\:text-gray-400")
          ?.textContent?.trim() || "";
      const categorySpan = card.querySelector(".px-2.py-1");
      const category = categorySpan
        ? categorySpan.textContent.trim()
        : "Core Subject";
      const icon = iconSpan ? iconSpan.textContent.trim() : "calculate";

      // Get subject code from data attribute if available
      const subjectCode = button.getAttribute("data-subject-code") || "N/A";

      // Get stats from the card
      const statsElements = card.querySelectorAll(
        ".flex.justify-between .font-semibold"
      );
      const classes = statsElements[0]?.textContent?.trim() || "0";
      const students = statsElements[1]?.textContent?.trim() || "0";
      const teachers = statsElements[2]?.textContent?.trim() || "0";

      // Get color classes from icon container
      const iconContainerClasses = iconContainer?.className || "";

      // Populate view modal
      const viewIconContainer = document.getElementById("viewIconContainer");
      const viewIcon = document.getElementById("viewIcon");
      const viewSubjectName = document.getElementById("viewSubjectName");
      const viewDescription = document.getElementById("viewDescription");
      const viewCategory = document.getElementById("viewCategory");
      const viewSubjectCode = document.getElementById("viewSubjectCode");
      const viewClasses = document.getElementById("viewClasses");
      const viewStudents = document.getElementById("viewStudents");
      const viewTeachers = document.getElementById("viewTeachers");
      const viewEditBtn = document.getElementById("viewEditBtn");

      if (viewIconContainer && iconContainerClasses) {
        // Extract gradient colors
        const fromMatch = iconContainerClasses.match(/from-[\w-]+/);
        const toMatch = iconContainerClasses.match(/to-[\w-]+/);
        const from = fromMatch ? fromMatch[0] : "from-blue-500";
        const to = toMatch ? toMatch[0] : "to-blue-600";
        viewIconContainer.className = `h-16 w-16 rounded-2xl bg-gradient-to-br ${from} ${to} flex items-center justify-center flex-shrink-0`;
      }

      if (viewIcon) viewIcon.textContent = icon;
      if (viewSubjectName) viewSubjectName.textContent = subjectName;
      if (viewDescription) viewDescription.textContent = description;
      if (viewSubjectCode) viewSubjectCode.textContent = subjectCode;
      if (viewCategory) {
        viewCategory.textContent = category;
        // Update category badge color based on category
        const catColors = {
          "Core Subject":
            "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
          Science:
            "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
          Technology:
            "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
          Arts: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
          Elective:
            "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
        };
        const colorClass =
          catColors[category] || catColors["Core Subject"];
        viewCategory.className = `px-3 py-1 text-sm ${colorClass} rounded-full font-semibold`;
      }
      if (viewClasses) viewClasses.textContent = classes;
      if (viewStudents) viewStudents.textContent = students;
      if (viewTeachers) viewTeachers.textContent = teachers;

      // Set up edit button to open edit modal
      if (viewEditBtn) {
        viewEditBtn.onclick = function () {
          closeModal("viewSubjectModal");
          // Find and click the edit button for this subject
          const editBtn = document.querySelector(
            `[data-edit-id="${subjectId}"]`
          );
          if (editBtn) {
            editBtn.click();
          }
        };
      }

      // For now, set placeholder grade levels
      const viewGradeLevels = document.getElementById("viewGradeLevels");
      if (viewGradeLevels) {
        viewGradeLevels.innerHTML = `
                    <span class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full font-semibold">Grade 9</span>
                    <span class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full font-semibold">Grade 10</span>
                    <span class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full font-semibold">Grade 11</span>
                    <span class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full font-semibold">Grade 12</span>
                `;
      }
    } catch (err) {
      console.error("[subject.js] View Details handler error:", err);
    }

    // Always open the modal, even if data extraction failed
    openModal("viewSubjectModal");
  }

  // Handle Assign Teacher (Subject Head)
  function handleAssignTeacher(button) {
    try {
      const subjectId = button.getAttribute("data-assign-id");
      const subjectName = button.getAttribute("data-subject-name");
      const subjectCode = button.getAttribute("data-subject-code");

      // Set form values
      const assignSubjectId = document.getElementById("assignSubjectId");
      const assignSubjectName = document.getElementById("assignSubjectName");
      const assignSubjectCode = document.getElementById("assignSubjectCode");
      const assignTeacherSelect = document.getElementById("assignTeacherSelect");

      if (assignSubjectId) assignSubjectId.value = subjectId;
      if (assignSubjectName) assignSubjectName.textContent = subjectName;
      if (assignSubjectCode) assignSubjectCode.textContent = subjectCode || "No code";
      if (assignTeacherSelect) assignTeacherSelect.value = "";
    } catch (err) {
      console.error("[subject.js] Subject Head handler error:", err);
    }

    // Always open the modal, even if form population failed
    openModal("assignTeacherModal");
  }

  // Handle Assign Subject Teacher (teacher teaches subject in a class)
  // Stores classes data, opens modal with placeholder. Matrix renders on teacher selection.
  var _subjectMatrixData = null; // { subjectId, classes, currentTeacherId }

  function handleAssignSubjectTeacher(button) {
    var subjectId = button.getAttribute("data-assign-teacher-id");
    var subjectName = button.getAttribute("data-subject-name");
    var subjectCode = button.getAttribute("data-subject-code");
    var classesJson = button.getAttribute("data-classes-json");

    // Set hidden subject id
    var hiddenInput = document.getElementById("assignSubjectTeacherSubjectId");
    if (hiddenInput) hiddenInput.value = subjectId;

    // Set subject info display
    var nameEl = document.getElementById("assignSubjectTeacherName");
    var codeEl = document.getElementById("assignSubjectTeacherCode");
    if (nameEl) nameEl.textContent = subjectName;
    if (codeEl) codeEl.textContent = subjectCode || "No code";

    // Parse classes
    var classes = [];
    try { classes = JSON.parse(classesJson || "[]"); } catch (e) { /* ignore */ }

    // Store for matrix rendering
    _subjectMatrixData = { subjectId: subjectId, classes: classes, currentTeacherId: null };

    // Reset UI state
    var teacherSelect = document.getElementById("assignSubjectTeacherSelect");
    if (teacherSelect) teacherSelect.value = "";

    var placeholder = document.getElementById("subjectMatrixPlaceholder");
    var loading = document.getElementById("subjectMatrixLoading");
    var container = document.getElementById("subjectMatrixContainer");
    var submitBtn = document.getElementById("subjectMatrixSubmitBtn");
    if (placeholder) placeholder.classList.remove("hidden");
    if (loading) loading.classList.add("hidden");
    if (container) container.classList.add("hidden");
    if (submitBtn) submitBtn.disabled = true;

    openModal("assignSubjectTeacherModal");
  }

  // Teacher selector change → load matrix data
  var _subjectTeacherSelect = document.getElementById("assignSubjectTeacherSelect");
  if (_subjectTeacherSelect) {
    _subjectTeacherSelect.addEventListener("change", function () {
      var teacherId = this.value;
      if (!teacherId || !_subjectMatrixData) return;
      _subjectMatrixData.currentTeacherId = teacherId;

      var placeholder = document.getElementById("subjectMatrixPlaceholder");
      var loading = document.getElementById("subjectMatrixLoading");
      var container = document.getElementById("subjectMatrixContainer");
      var submitBtn = document.getElementById("subjectMatrixSubmitBtn");

      if (placeholder) placeholder.classList.add("hidden");
      if (container) container.classList.add("hidden");
      if (loading) loading.classList.remove("hidden");
      if (submitBtn) submitBtn.disabled = true;

      fetch("/admin/subject_class_teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_id: _subjectMatrixData.subjectId })
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (loading) loading.classList.add("hidden");
          if (data.success) {
            renderSubjectMatrix(data.assignments || []);
            if (container) container.classList.remove("hidden");
          } else {
            window.showAlert({ title: "Error", message: data.message || "Failed to load assignments", type: "error", confirmText: "OK" });
            if (placeholder) placeholder.classList.remove("hidden");
          }
        })
        .catch(function () {
          if (loading) loading.classList.add("hidden");
          window.showAlert({ title: "Network Error", message: "Failed to load class assignments", type: "error", confirmText: "Close" });
          if (placeholder) placeholder.classList.remove("hidden");
        });
    });
  }

  // Build the single-row matrix: this subject × its classes
  function renderSubjectMatrix(assignments) {
    if (!_subjectMatrixData) return;
    var classes = _subjectMatrixData.classes;
    var currentTeacherId = _subjectMatrixData.currentTeacherId;

    // Build a map: class_room_id → [{ teacher_id, teacher_name }]
    var classTeacherMap = {};
    assignments.forEach(function (a) {
      if (!classTeacherMap[a.class_room_id]) classTeacherMap[a.class_room_id] = [];
      if (!classTeacherMap[a.class_room_id].some(function (e) { return e.teacher_id === a.teacher_id; })) {
        classTeacherMap[a.class_room_id].push({ teacher_id: a.teacher_id, teacher_name: a.teacher_name });
      }
    });

    var thead = document.getElementById("subjectMatrixHead");
    var tbody = document.getElementById("subjectMatrixBody");
    if (!thead || !tbody) return;

    // Build thead
    thead.innerHTML = "";
    var headerRow = document.createElement("tr");

    var thSubject = document.createElement("th");
    thSubject.className = "px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider";
    thSubject.textContent = "Subject";
    headerRow.appendChild(thSubject);

    classes.forEach(function (cls) {
      var th = document.createElement("th");
      th.className = "px-3 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider";
      th.textContent = cls.class_room_name;
      headerRow.appendChild(th);
    });

    // Row select-all header
    var thRowAll = document.createElement("th");
    thRowAll.className = "px-3 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider";
    thRowAll.textContent = "All";
    headerRow.appendChild(thRowAll);

    thead.appendChild(headerRow);

    // Build tbody — one row for this subject
    tbody.innerHTML = "";
    var tr = document.createElement("tr");
    tr.className = "hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors";

    var subjectName = document.getElementById("assignSubjectTeacherName");
    var tdName = document.createElement("td");
    tdName.className = "px-4 py-3 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap";
    tdName.textContent = subjectName ? subjectName.textContent : "";
    tr.appendChild(tdName);

    var rowEnabledCount = 0;
    var rowNonAmberCount = 0;

    classes.forEach(function (cls) {
      var td = document.createElement("td");
      td.className = "px-3 py-3 text-center";

      var teachers = classTeacherMap[cls.class_room_id] || [];
      var isCurrentTeacher = teachers.some(function (t) { return String(t.teacher_id) === String(currentTeacherId); });
      var otherTeachers = teachers.filter(function (t) { return String(t.teacher_id) !== String(currentTeacherId); });
      var hasConflict = otherTeachers.length > 0;

      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.dataset.classId = cls.class_room_id;
      cb.dataset.className = cls.class_room_name;
      cb.checked = isCurrentTeacher;
      if (isCurrentTeacher) rowEnabledCount++;

      if (hasConflict) {
        var conflictNames = otherTeachers.map(function (t) { return t.teacher_name; }).join(", ");
        cb.className = "subject-matrix-cb subject-matrix-cb-amber h-4 w-4 rounded border-amber-400 dark:border-amber-500 text-amber-500 focus:ring-amber-400 cursor-pointer";
        cb.title = "Already assigned to " + conflictNames;
        cb.dataset.conflictNames = conflictNames;

        var wrapper = document.createElement("div");
        wrapper.className = "inline-flex items-center justify-center";
        wrapper.appendChild(cb);
        var dot = document.createElement("span");
        dot.className = "block w-1.5 h-1.5 rounded-full bg-amber-400 dark:bg-amber-500 ml-0.5 shrink-0";
        dot.title = "Assigned to " + conflictNames;
        wrapper.appendChild(dot);
        td.appendChild(wrapper);
      } else {
        cb.className = "subject-matrix-cb h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-green-500 focus:ring-green-400 cursor-pointer";
        rowNonAmberCount++;
        td.appendChild(cb);
      }

      cb.addEventListener("change", function () {
        if (this.checked && this.classList.contains("subject-matrix-cb-amber") && this.dataset.conflictNames) {
          var className = cls.class_room_name;
          var names = this.dataset.conflictNames;
          var checkboxRef = this;

          window.showConfirmModal({
            title: "Reassign Subject?",
            message: "<strong>" + (subjectName ? subjectName.textContent : "") + "</strong> in <strong>" + className + "</strong> is currently assigned to <strong>" + names + "</strong>.<br><br>Assigning it to this teacher will remove it from " + names + ". Do you want to proceed?",
            confirmText: "Yes, Reassign",
            cancelText: "No, Keep Current",
            onConfirm: function () {
              updateSubjectMatrixCounter();
            },
            onCancel: function () {
              checkboxRef.checked = false;
              updateSubjectMatrixCounter();
            }
          });
        } else {
          updateSubjectMatrixCounter();
        }
      });

      tr.appendChild(td);
    });

    // Row select-all
    var tdRowAll = document.createElement("td");
    tdRowAll.className = "px-3 py-3 text-center";
    var rowCb = document.createElement("input");
    rowCb.type = "checkbox";
    rowCb.className = "subject-row-select-all h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-green-500 focus:ring-green-400 cursor-pointer";
    rowCb.title = "Select all classes for this subject";

    rowCb.checked = rowNonAmberCount > 0 && rowEnabledCount === rowNonAmberCount;
    rowCb.indeterminate = rowEnabledCount > 0 && rowEnabledCount < rowNonAmberCount;

    rowCb.addEventListener("change", function () {
      var checked = this.checked;
      document.querySelectorAll("input.subject-matrix-cb:not(.subject-matrix-cb-amber)").forEach(function (cb) {
        cb.checked = checked;
      });
      updateSubjectMatrixCounter();
    });

    tdRowAll.appendChild(rowCb);
    tr.appendChild(tdRowAll);
    tbody.appendChild(tr);

    updateSubjectMatrixCounter();
  }

  function updateSubjectMatrixCounter() {
    var checked = document.querySelectorAll("input.subject-matrix-cb:checked").length;
    var counter = document.getElementById("subjectMatrixCounter");
    var submitBtn = document.getElementById("subjectMatrixSubmitBtn");
    if (counter) counter.textContent = checked + " class" + (checked !== 1 ? "es" : "") + " selected";
    if (submitBtn) submitBtn.disabled = checked === 0;
  }

  // Select All / Clear All
  var _subjectSelectAllBtn = document.getElementById("subjectMatrixSelectAll");
  var _subjectClearAllBtn = document.getElementById("subjectMatrixClearAll");
  if (_subjectSelectAllBtn) {
    _subjectSelectAllBtn.addEventListener("click", function () {
      document.querySelectorAll("input.subject-matrix-cb:not(.subject-matrix-cb-amber)").forEach(function (cb) { cb.checked = true; });
      var rowCb = document.querySelector("input.subject-row-select-all");
      if (rowCb) rowCb.checked = true;
      updateSubjectMatrixCounter();
    });
  }
  if (_subjectClearAllBtn) {
    _subjectClearAllBtn.addEventListener("click", function () {
      document.querySelectorAll("input.subject-matrix-cb").forEach(function (cb) { cb.checked = false; });
      var rowCb = document.querySelector("input.subject-row-select-all");
      if (rowCb) { rowCb.checked = false; rowCb.indeterminate = false; }
      updateSubjectMatrixCounter();
    });
  }

  // Save Assignments button
  var _subjectMatrixSubmitBtn = document.getElementById("subjectMatrixSubmitBtn");
  if (_subjectMatrixSubmitBtn) {
    _subjectMatrixSubmitBtn.addEventListener("click", function () {
      if (!_subjectMatrixData) return;
      var teacherId = document.getElementById("assignSubjectTeacherSelect").value;
      if (!teacherId) {
        window.showAlert({ title: "Validation Error", message: "Please select a teacher", type: "error", confirmText: "OK" });
        return;
      }

      var checked = document.querySelectorAll("input.subject-matrix-cb:checked");
      if (checked.length === 0) {
        window.showAlert({ title: "Validation Error", message: "Please select at least one class", type: "error", confirmText: "OK" });
        return;
      }

      var classRoomIds = Array.from(checked).map(function (cb) { return cb.dataset.classId; });

      var submitBtn = _subjectMatrixSubmitBtn;
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving...";

      fetch("/admin/assign_subject_teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjects_ids: [_subjectMatrixData.subjectId],
          teacher_id: teacherId,
          class_room_ids: classRoomIds
        })
      })
        .then(function (res) { return res.json(); })
        .then(function (result) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Save Assignments";
          if (result.success) {
            window.showAlert({
              title: "Assignment Successful",
              message: result.message || "Assignments saved successfully.",
              type: "success",
              confirmText: "OK",
              onConfirm: function () {
                closeModal("assignSubjectTeacherModal");
                location.reload();
              }
            });
          } else {
            window.showAlert({ title: "Assignment", message: result.message || "No new assignments were made.", type: "info", confirmText: "OK" });
          }
        })
        .catch(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = "Save Assignments";
          window.showAlert({ title: "Network Error", message: "An error occurred while saving assignments", type: "error", confirmText: "Close" });
        });
    });
  }

  // Handle Edit Subject
  function handleEditSubject(button) {
    const subjectId = button.getAttribute("data-edit-id");

    // Get subject data from data attributes
    const subjectName = button.getAttribute("data-subject-name") || "";
    const description = button.getAttribute("data-description") || "";
    const category = button.getAttribute("data-category") || "Core Subject";
    const icon = button.getAttribute("data-icon") || "calculate";
    const subjectCode = button.getAttribute("data-subject-code") || "";

    // Populate edit form
    const editSubjectId = document.getElementById("editSubjectId");
    const editSubjectName = document.getElementById("editSubjectName");
    const editSubjectCode = document.getElementById("editSubjectCode");
    const editDescription = document.getElementById("editDescription");
    const editCategory = document.getElementById("editCategory");
    const editIconSelect = document.getElementById("editIconSelect");

    if (editSubjectId) editSubjectId.value = subjectId;
    if (editSubjectName) editSubjectName.value = subjectName;
    if (editSubjectCode) editSubjectCode.value = subjectCode;
    if (editDescription) editDescription.value = description;
    if (editCategory) editCategory.value = category;
    if (editIconSelect) editIconSelect.value = icon;

    // Handle Subject Head
    const subjectHeadId = button.getAttribute("data-subject-head-id");
    const editSubjectHead = document.getElementById("editSubjectHead");
    if (editSubjectHead) editSubjectHead.value = subjectHeadId || "";

    // Handle Class Levels
    const classNamesJson = button.getAttribute("data-class-names");
    let classNames = [];
    try {
      classNames = JSON.parse(classNamesJson || "[]");
    } catch (e) {
      console.error("Error parsing class names:", e);
    }

    // Initialize Subject Section and Class Levels
    const editSubjectSection = document.getElementById("editSubjectSection");
    if (editSubjectSection) {
      editSubjectSection.value = "all";
      updateClassLevels("all", "editClassLevelsContainer", classNames);

      editSubjectSection.onchange = function () {
        const currentChecked = Array.from(
          document.querySelectorAll("#editClassLevelsContainer input:checked")
        ).map((cb) => cb.value);
        updateClassLevels(this.value, "editClassLevelsContainer", currentChecked);
      };
    }

    // Find current color from data attribute
    const colorJson = button.getAttribute("data-color");
    if (colorJson) {
      try {
        let colorData = typeof colorJson === "string" ? JSON.parse(colorJson) : colorJson;
        if (typeof colorData === "string") {
          try { colorData = JSON.parse(colorData); } catch (e) {}
        }
        if (colorData && colorData.from && colorData.to) {
          const matchingColorIndex = colorPalette.findIndex(
            (c) => c.from === colorData.from && c.to === colorData.to
          );
          if (matchingColorIndex !== -1) {
            renderColorPalette("editColorPalette", matchingColorIndex);
            const el = document.getElementById("editSelectedColor");
            if (el) el.value = JSON.stringify(colorPalette[matchingColorIndex]);
          } else {
            renderColorPalette("editColorPalette", 0);
            const el = document.getElementById("editSelectedColor");
            if (el) el.value = JSON.stringify(colorPalette[0]);
          }
        } else {
          renderColorPalette("editColorPalette", 0);
          const el = document.getElementById("editSelectedColor");
          if (el) el.value = JSON.stringify(colorPalette[0]);
        }
      } catch (e) {
        console.error("Error parsing color data:", e);
        renderColorPalette("editColorPalette", 0);
        const el = document.getElementById("editSelectedColor");
        if (el) el.value = JSON.stringify(colorPalette[0]);
      }
    } else {
      renderColorPalette("editColorPalette", 0);
      const el = document.getElementById("editSelectedColor");
      if (el) el.value = JSON.stringify(colorPalette[0]);
    }

    // Open edit modal
    openModal("editSubjectModal");
  }

  // Handle Delete Subject
  function handleDeleteSubject(button) {
    const subjectId = button.getAttribute("data-delete-id");
    const subjectName = button.getAttribute("data-subject-name");

    window.showConfirmModal({
      title: "Delete Subject",
      message: `Are you sure you want to delete "${subjectName}"? This action cannot be undone and will remove all associated data.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      confirmClass:
        "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
      onConfirm: async () => {
        try {
          const response = await fetch(`/admin/delete/subjects/${subjectId}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "X-Requested-With": "XMLHttpRequest",
            },
          });
          const result = await response.json();
          if (response.ok) {
            window.showAlert({
              type: "success",
              title: "Success!",
              message: "Subject deleted successfully!",
              onConfirm: () => window.location.reload(),
            });
          } else {
            throw new Error(result.message || "Failed to delete subject");
          }
        } catch (error) {
          console.error("Error:", error);
          window.showAlert({
            type: "error",
            title: "Error",
            message: `Failed to delete subject: ${error.message}`,
          });
        }
      },
    });
  }

  // Handle edit form submission
  const editForm = document.getElementById("editSubjectForm");
  if (editForm) {
    editForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const submitButton = editForm.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.innerHTML;
      const subjectId = document.getElementById("editSubjectId").value;

      try {
        // Disable submit button and show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = "Updating...";

        // Get form data
        const formData = {
          subject_name: editForm.querySelector('[name="subject_name"]').value,
          subject_code: editForm.querySelector('[name="subject_code"]').value,
          category: editForm.querySelector('[name="category"]').value,
          description: editForm.querySelector('[name="description"]').value,
          icon_name: editForm.querySelector('[name="icon_name"]').value,
          category_colors: document.getElementById("editSelectedColor").value,
          subject_head: editForm.querySelector('[name="subject_head"]').value,
          grade_levels: Array.from(
            editForm.querySelectorAll('[name="grade_levels"]:checked')
          ).map((cb) => cb.value),
          subject_id: subjectId,
        };

        // Send data to server
        const response = await fetch(`/admin/update/subjects/${subjectId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (response.ok) {
          window.showAlert({
            type: "success",
            title: "Success!",
            message: "Subject updated successfully!",
            onConfirm: () => {
              closeModal("editSubjectModal");
              window.location.reload();
            },
          });
        } else {
          throw new Error(result.message || "Failed to update subject");
        }
      } catch (error) {
        console.error("Error:", error);
        window.showAlert({
          type: "error",
          title: "Error",
          message: `Failed to update subject: ${error.message}`,
        });
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
      }
    });
  }

  // Handle assign subject head form submission
  const assignTeacherForm = document.getElementById("assignTeacherForm");
  if (assignTeacherForm) {
    assignTeacherForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      try {
        const subjectId = document.getElementById("assignSubjectId").value;
        const teacherId = document.getElementById("assignTeacherSelect").value;

        if (!teacherId) {
          window.showAlert({
            type: "error",
            title: "Error",
            message: "Please select a teacher",
          });
          return;
        }

        const data = {
          subject_id: subjectId,
          teacher_id: teacherId,
        };

        const response = await fetch("/admin/assign_subject_head", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (result.success) {
          window.showAlert({
            type: "success",
            title: "Success!",
            message: result.message,
            onConfirm: () => {
              closeModal("assignTeacherModal");
              location.reload();
            },
          });
        } else {
          window.showAlert({
            type: "error",
            title: "Error",
            message: result.message,
          });
        }
      } catch (error) {
        console.error("Error:", error);
        window.showAlert({
          type: "error",
          title: "Error",
          message: "An error occurred while assigning the subject head.",
        });
      }
    });
  }

  // Search and filter subjects
  function applyFilters() {
    const searchText = searchSubjects?.value.toLowerCase() || "";
    const selectedClass = classSelect?.value || "all";
    const selectedSection = subjectSectionSelect?.value || "all";
    const selectedCategory =
      subjectCategorySelect?.value.toLowerCase() || "all";

    const subjectCards = document.querySelectorAll(".subject-card");
    subjectCards.forEach((card) => {
      const name = card.getAttribute("data-name") || "";
      const description = card.getAttribute("data-description") || "";
      const category = card.getAttribute("data-category") || "";
      const classesJson = card.getAttribute("data-classes") || "[]";
      let classes = [];
      try {
        classes = JSON.parse(classesJson);
      } catch (e) {
        console.error("Error parsing classes for card:", e);
      }

      // 1. Search filter
      const matchesSearch =
        !searchText ||
        name.includes(searchText) ||
        description.includes(searchText);

      // 2. Category filter
      const matchesCategory =
        selectedCategory === "all" || category === selectedCategory;

      // 3. Class filter
      const matchesClass =
        selectedClass === "all" || classes.includes(selectedClass);

      // 4. Section filter
      let matchesSection = true;
      if (selectedSection !== "all") {
        // Check if any of the subject's classes belong to the selected section
        // We use window.classDataBySection which is populated in the template
        const sectionClasses =
          (window.classDataBySection || {})[selectedSection] || [];
        const sectionClassIds = sectionClasses.map((c) => c.id);
        matchesSection = classes.some((classId) =>
          sectionClassIds.includes(classId)
        );
      }

      if (matchesSearch && matchesCategory && matchesClass && matchesSection) {
        card.classList.remove("hidden");
      } else {
        card.classList.add("hidden");
      }
    });
  }

  const searchSubjects = document.getElementById("searchSubjects");
  const classSelect = document.getElementById("subjectClassSelect");
  const subjectSectionSelect = document.getElementById("subjectSectionSelect");
  const subjectCategorySelect = document.getElementById(
    "subjectCategorySelect"
  );

  if (searchSubjects) searchSubjects.addEventListener("input", applyFilters);
  if (classSelect) classSelect.addEventListener("change", applyFilters);
  if (subjectSectionSelect)
    subjectSectionSelect.addEventListener("change", applyFilters);
  if (subjectCategorySelect)
    subjectCategorySelect.addEventListener("change", applyFilters);

  // Initial filter application
  applyFilters();
});
