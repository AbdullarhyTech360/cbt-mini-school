document.addEventListener("DOMContentLoaded", function () {
  // Check if modal functions are available
  if (
    typeof window.showAlert === "undefined" ||
    typeof window.showConfirmModal === "undefined"
  ) {
    console.error(
      "Modal functions not loaded! Make sure modal.js is included before subject.js"
    );
    return;
  }

  // Modal functionality
  window.openModal = function (modalId) {
    const modal = document.getElementById(modalId);
    console.log("Box opened");
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      document.body.style.overflow = "hidden";
    }
  };

  window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      document.body.style.overflow = "";
    }
  };

  // Event listeners
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
    const previewIconContainer = document.getElementById(
      "previewIconContainer"
    );
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
      console.log(previewIconContainer);
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

        console.log("Form data:", formData); // For debugging

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

  // Handle delete subject
  document.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", async function (e) {
      e.preventDefault();
      e.stopPropagation();

      const subjectId = this.getAttribute("data-delete-id");
      const subjectName = this.getAttribute("data-subject-name");
      console.log(subjectId, subjectName);

      // Use custom confirmation modal
      window.showConfirmModal({
        title: "Delete Subject",
        message: `Are you sure you want to delete "${subjectName}"? This action cannot be undone and will remove all associated data.`,
        confirmText: "Delete",
        cancelText: "Cancel",
        confirmClass:
          "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
        onConfirm: async () => {
          try {
            const response = await fetch(
              `/admin/delete/subjects/${subjectId}`,
              {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                  "X-Requested-With": "XMLHttpRequest",
                },
              }
            );

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
    });
  });

  // Handle edit subject
  document.querySelectorAll("[data-edit-id]").forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const subjectId = this.getAttribute("data-edit-id");

      // Get subject data from data attributes
      const subjectName = this.getAttribute("data-subject-name") || "";
      const description = this.getAttribute("data-description") || "";
      const category = this.getAttribute("data-category") || "Core Subject";
      const icon = this.getAttribute("data-icon") || "calculate";

      // Get subject code from data attribute if available, otherwise empty
      const subjectCode = this.getAttribute("data-subject-code") || "";

      console.log("Edit data:", {
        subjectId,
        subjectName,
        subjectCode,
        description,
        category,
        icon,
      });

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
      if (editCategory) editCategory.value = category;
      if (editIconSelect) editIconSelect.value = icon;

      // Handle Subject Head
      const subjectHeadId = this.getAttribute("data-subject-head-id");
      const editSubjectHead = document.getElementById("editSubjectHead");
      if (editSubjectHead) editSubjectHead.value = subjectHeadId || "";

      // Handle Class Levels
      const classNamesJson = this.getAttribute("data-class-names");
      let classNames = [];
      try {
        classNames = JSON.parse(classNamesJson || "[]");
      } catch (e) {
        console.error("Error parsing class names:", e);
      }

      // Initialize Subject Section and Class Levels
      const editSubjectSection = document.getElementById("editSubjectSection");
      if (editSubjectSection) {
        editSubjectSection.value = "all"; // Default to all to show all possibilities
        updateClassLevels("all", "editClassLevelsContainer", classNames);

        // Add change listener if not already added (using a flag or just replacing it)
        // To avoid multiple listeners, we can remove the old one first if we stored it,
        // but since this is inside the click handler, we should be careful.
        // Better approach: Attach the listener once outside, or use onchange property.
        editSubjectSection.onchange = function () {
          // When section changes, we keep the currently checked values if they exist in the new section?
          // Or just clear? For now, let's just re-render.
          // If we want to preserve checks, we need to read them first.
          const currentChecked = Array.from(
            document.querySelectorAll("#editClassLevelsContainer input:checked")
          ).map((cb) => cb.value);
          // Merge with original classNames if we want to persist initial state, but usually user wants to change.
          // Let's just pass the currently checked ones.
          updateClassLevels(
            this.value,
            "editClassLevelsContainer",
            currentChecked
          );
        };
      }

      // Find current color from data attribute
      const colorJson = this.getAttribute("data-color");
      if (colorJson) {
        try {
          // The JSON might be double encoded or just a string, let's try to parse it
          // If it comes from tojson in jinja, it might be a string representation of a dict
          // But wait, tojson outputs a string.
          // Let's handle both object and string cases if possible, but usually it's a string.
          let colorData =
            typeof colorJson === "string" ? JSON.parse(colorJson) : colorJson;

          // If it was a stringified JSON string (double encoded), parse again
          if (typeof colorData === "string") {
            try {
              colorData = JSON.parse(colorData);
            } catch (e) {}
          }

          if (colorData && colorData.from && colorData.to) {
            // Find matching color in palette
            const matchingColorIndex = colorPalette.findIndex(
              (c) => c.from === colorData.from && c.to === colorData.to
            );
            if (matchingColorIndex !== -1) {
              renderColorPalette("editColorPalette", matchingColorIndex);
              document.getElementById("editSelectedColor").value =
                JSON.stringify(colorPalette[matchingColorIndex]);
            } else {
              // If custom color not in palette, maybe just default to first or try to match loosely?
              // For now default to first
              renderColorPalette("editColorPalette", 0);
              document.getElementById("editSelectedColor").value =
                JSON.stringify(colorPalette[0]);
            }
          } else {
            renderColorPalette("editColorPalette", 0);
            document.getElementById("editSelectedColor").value = JSON.stringify(
              colorPalette[0]
            );
          }
        } catch (e) {
          console.error("Error parsing color data:", e);
          renderColorPalette("editColorPalette", 0);
          document.getElementById("editSelectedColor").value = JSON.stringify(
            colorPalette[0]
          );
        }
      } else {
        renderColorPalette("editColorPalette", 0);
        document.getElementById("editSelectedColor").value = JSON.stringify(
          colorPalette[0]
        );
      }

      // Open edit modal
      openModal("editSubjectModal");
    });
  });

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

        console.log("Edit form data:", formData);

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

  // Handle view subject details
  document.querySelectorAll("[data-view-id]").forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const subjectId = this.getAttribute("data-view-id");

      // Get subject data from the card
      const card = this.closest(".bg-white, .dark\\:bg-gray-800");
      if (!card) {
        console.error("Card element not found");
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
        const categoryColors = {
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
          categoryColors[category] || categoryColors["Core Subject"];
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

      // Open view modal
      openModal("viewSubjectModal");
    });
  });

  // Assign Teacher functionality
  document.querySelectorAll(".assign-teacher-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const subjectId = this.getAttribute("data-assign-id");
      const subjectName = this.getAttribute("data-subject-name");
      const subjectCode = this.getAttribute("data-subject-code");

      // Set form values
      document.getElementById("assignSubjectId").value = subjectId;
      document.getElementById("assignSubjectName").textContent = subjectName;
      document.getElementById("assignSubjectCode").textContent =
        subjectCode || "No code";

      // Reset class and teacher selects
      document.getElementById("assignClassSelect").value = "";
      document.getElementById("assignTeacherSelect").value = "";

      // Open modal
      openModal("assignTeacherModal");
    });
  });

  // Handle assign teacher form submission
  const assignTeacherForm = document.getElementById("assignTeacherForm");
  if (assignTeacherForm) {
    assignTeacherForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      console.log("Form opened just before submission");
      try {
        // Get form values
        const subjectId = document.getElementById("assignSubjectId").value;
        const classRoomId = document.getElementById("assignClassSelect").value;
        const teacherId = document.getElementById("assignTeacherSelect").value;

        // Validate required fields
        if (!classRoomId) {
          window.showAlert({
            type: "error",
            title: "Error",
            message: "Please select a class",
          });
          return;
        }

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
          class_room_id: classRoomId,
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
          if (window.showAlert) {
            window.showAlert({
              type: "success",
              title: "Success!",
              message: result.message,
              onConfirm: () => {
                closeModal("assignTeacherModal");
                // Reload the page to reflect changes
                location.reload();
              },
            });
          } else {
            alert(result.message);
            closeModal("assignTeacherModal");
            location.reload();
          }
        } else {
          if (window.showAlert) {
            window.showAlert({
              type: "error",
              title: "Error",
              message: result.message,
            });
          } else {
            alert("Error: " + result.message);
          }
        }
      } catch (error) {
        console.error("Error:", error);
        if (window.showAlert) {
          window.showAlert({
            type: "error",
            title: "Error",
            message: "An error occurred while assigning the teacher.",
          });
        } else {
          alert("An error occurred while assigning the teacher.");
        }
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

    console.log("Applying filters:", {
      searchText,
      selectedClass,
      selectedSection,
      selectedCategory,
    });

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
