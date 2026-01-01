let currentStudents = [];
let currentFilters = {};
let currentReportData = null;

document.addEventListener("DOMContentLoaded", () => {
  loadTerms();
  loadClasses();
  loadConfigs();

  // Add keyboard event listener for closing preview with ESC key
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCanvasPreviewModal();
    }
  });

  // Initialize tab switching functionality
  initializeTabSwitching();

  // Initialize broad sheet controls
  initializeBroadSheetControls();
});

// Initialize tab switching functionality
function initializeTabSwitching() {
  // Tab switching
  document.querySelectorAll('.report-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      // Remove active class from all tabs
      document.querySelectorAll('.report-tab').forEach(t => {
        t.classList.remove('bg-white', 'dark:bg-gray-700', 'text-primary', 'shadow-sm');
        t.classList.add('text-gray-600', 'dark:text-gray-300', 'hover:text-gray-800', 'dark:hover:text-gray-200', 'hover:bg-gray-200', 'dark:hover:bg-gray-700/50');
      });

      // Add active class to clicked tab
      this.classList.remove('text-gray-600', 'dark:text-gray-300', 'hover:text-gray-800', 'dark:hover:text-gray-200', 'hover:bg-gray-200', 'dark:hover:bg-gray-700/50');
      this.classList.add('bg-white', 'dark:bg-gray-700', 'text-primary', 'shadow-sm');

      // Show/hide sections
      if (this.id === 'individual-reports-tab') {
        document.getElementById('individual-reports-section').classList.remove('hidden');
        document.getElementById('broad-sheet-section').classList.add('hidden');
      } else if (this.id === 'broad-sheet-tab') {
        document.getElementById('individual-reports-section').classList.add('hidden');
        document.getElementById('broad-sheet-section').classList.remove('hidden');

        // Load terms for broad sheet if not already loaded
        if (document.querySelectorAll('#broadSheetTermFilter option').length <= 1) {
          loadBroadSheetTerms();
        }
        if (document.querySelectorAll('#broadSheetClassFilter option').length <= 1) {
          loadBroadSheetClasses();
        }
      }
    });
  });
}

// Initialize broad sheet controls
function initializeBroadSheetControls() {
  // Toggle exam controls visibility
  const toggleBtn = document.getElementById('toggleExamControls');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      const controls = document.getElementById('examToggleControls');
      if (controls.classList.contains('hidden')) {
        controls.classList.remove('hidden');
        this.innerHTML = `
          <span class="material-symbols-outlined text-sm">visibility_off</span>
          <span class="text-sm font-bold">Hide Exam Controls</span>
        `;
      } else {
        controls.classList.add('hidden');
        this.innerHTML = `
          <span class="material-symbols-outlined text-sm">visibility</span>
          <span class="text-sm font-bold">Show/Hide Exams</span>
        `;
      }
    });
  }
}

// Load terms for broad sheet
async function loadBroadSheetTerms() {
  const select = document.getElementById('broadSheetTermFilter');
  if (!select) return;

  select.innerHTML = '<option value="">Loading...</option>';
  select.disabled = true;

  try {
    const response = await fetch('/reports/api/terms');
    const data = await response.json();

    if (data.success && data.terms.length > 0) {
      select.innerHTML = '<option value="">Select Term</option>';
      data.terms.forEach((term) => {
        const option = document.createElement('option');
        option.value = term.term_id;
        option.textContent = `${term.term_name} - ${term.academic_session}`;
        if (term.is_current) {
          option.textContent += ' (Current)';
          option.selected = true;
        }
        select.appendChild(option);
      });
    } else {
      select.innerHTML = '<option value="">No terms found</option>';
    }
  } catch (error) {
    console.error('Error loading terms for broad sheet:', error);
    select.innerHTML = '<option value="">Error loading terms</option>';
    showNotification('Error loading terms for broad sheet. Please refresh the page.', 'error');
  } finally {
    select.disabled = false;
  }
}

// Load classes for broad sheet
async function loadBroadSheetClasses() {
  const select = document.getElementById('broadSheetClassFilter');
  if (!select) return;

  select.innerHTML = '<option value="">Loading...</option>';
  select.disabled = true;

  try {
    const response = await fetch('/reports/api/classes');
    const data = await response.json();

    if (data.success && data.classes.length > 0) {
      select.innerHTML = '<option value="">Select Class</option>';
      data.classes.forEach((cls) => {
        const option = document.createElement('option');
        option.value = cls.class_room_id;
        option.textContent = cls.class_name;
        select.appendChild(option);
      });
    } else {
      select.innerHTML = '<option value="">No classes found</option>';
    }
  } catch (error) {
    console.error('Error loading classes for broad sheet:', error);
    select.innerHTML = '<option value="">Error loading classes</option>';
    showNotification('Error loading classes for broad sheet. Please refresh the page.', 'error');
  } finally {
    select.disabled = false;
  }
}

// Load broad sheet data
async function loadBroadSheetData() {
  const termId = document.getElementById('broadSheetTermFilter').value;
  const classId = document.getElementById('broadSheetClassFilter').value;
  const examType = document.getElementById('broadSheetExamTypeFilter').value;
  const scoreDisplay = document.getElementById('broadSheetScoreDisplay').value;

  if (!termId || !classId) {
    showNotification('Please select both term and class', 'error');
    return;
  }

  // Show loading state
  const container = document.getElementById('broadSheetContainer');
  container.innerHTML = `
    <div class="flex justify-center items-center py-12">
      <div class="preview-loading-spinner"></div>
      <p class="ml-4 text-gray-500 dark:text-gray-400">Loading broad sheet data...</p>
    </div>
  `;

  try {
    // Fetch broad sheet data from backend
    const response = await fetch('/reports/api/broad-sheet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        term_id: termId,
        class_room_id: classId,
        exam_type: examType
      })
    });

    const data = await response.json();

    if (data.success) {
      renderBroadSheet(data.data, data.metadata);
    } else {
      throw new Error(data.error || 'Failed to load broad sheet data');
    }
  } catch (error) {
    console.error('Error loading broad sheet:', error);
    container.innerHTML = `
      <div class="text-center py-8">
        <p class="text-red-500 dark:text-red-400">Error loading broad sheet: ${error.message}</p>
        <button onclick="loadBroadSheetData()" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Retry</button>
      </div>
    `;
  }
}

// Render broad sheet table
function renderBroadSheet(broadSheetData, metadata) {
  const container = document.getElementById('broadSheetContainer');

  if (!broadSheetData || broadSheetData.length === 0) {
    container.innerHTML = '<p class="text-center py-8 text-gray-500 dark:text-gray-400">No data available for the selected criteria</p>';
    return;
  }

  // Extract all unique subjects from the data
  const allSubjects = new Set();
  broadSheetData.forEach(student => {
    Object.keys(student.subjects).forEach(subject => {
      allSubjects.add(subject);
    });
  });
  const subjects = Array.from(allSubjects).sort();

  // Generate the table HTML
  let tableHTML = `
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">S/N</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Admission No.</th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Student Name</th>
  `;

  // Add subject headers
  subjects.forEach(subject => {
    tableHTML += `<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">${subject}</th>`;
  });

  // Close the header row
  tableHTML += `
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
  `;

  // Add student rows
  broadSheetData.forEach((student, index) => {
    tableHTML += `<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30">`;
    tableHTML += `<td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${index + 1}</td>`;
    tableHTML += `<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${student.admission_number || ''}</td>`;
    tableHTML += `<td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${student.student_name}</td>`;

    // Add subject scores
    subjects.forEach(subject => {
      if (student.subjects[subject]) {
        const subjectData = student.subjects[subject];
        // Display total score and percentage
        const scoreText = `${subjectData.total_score}/${subjectData.max_possible} (${subjectData.percentage}%)`;
        tableHTML += `<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${scoreText}</td>`;
      } else {
        tableHTML += `<td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">-</td>`;
      }
    });

    tableHTML += '</tr>';
  });

  tableHTML += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = tableHTML;
}

// Export broad sheet
async function exportBroadSheet(format) {
  const termId = document.getElementById('broadSheetTermFilter').value;
  const classId = document.getElementById('broadSheetClassFilter').value;
  const examType = document.getElementById('broadSheetExamTypeFilter').value;
  const scoreDisplay = document.getElementById('broadSheetScoreDisplay').value;

  if (!termId || !classId) {
    showNotification('Please select both term and class', 'error');
    return;
  }

  try {
    // Show processing notification
    showNotification(`Exporting broad sheet as ${format.toUpperCase()}...`, 'info');

    // Fetch export data from backend
    const response = await fetch(`/reports/api/broad-sheet/export/${format}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        term_id: termId,
        class_room_id: classId,
        exam_type: examType,
        show_exams: true,
        show_totals: true
      })
    });

    if (response.ok) {
      // Create a temporary link to download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Generate filename based on class and term
      const termSelect = document.getElementById('broadSheetTermFilter');
      const classSelect = document.getElementById('broadSheetClassFilter');
      const termText = termSelect.options[termSelect.selectedIndex].text;
      const classText = classSelect.options[classSelect.selectedIndex].text;
      a.download = `BroadSheet_${classText.replace(/\s+/g, '_')}_${termText.replace(/\s+/g, '_').replace('(', '').replace(')', '')}.${format}`;

      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showNotification('Broad sheet exported successfully!', 'success');
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Export failed');
    }
  } catch (error) {
    console.error('Export error:', error);
    showNotification(`Export failed: ${error.message}`, 'error');
  }
}
async function loadTerms() {
  const select = document.getElementById("termFilter");
  select.innerHTML = '<option value="">Loading...</option>';
  select.disabled = true;

  try {
    const response = await fetch("/reports/api/terms");
    const data = await response.json();

    if (data.success && data.terms.length > 0) {
      select.innerHTML = '<option value="">Select Term</option>';
      data.terms.forEach((term) => {
        const option = document.createElement("option");
        option.value = term.term_id;
        option.textContent = `${term.term_name} - ${term.academic_session}`;
        if (term.is_current) {
          option.textContent += " (Current)";
          option.selected = true;
        }
        select.appendChild(option);
      });
    } else {
      select.innerHTML = '<option value="">No terms found</option>';
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
  const select = document.getElementById("classFilter");
  select.innerHTML = '<option value="">Loading...</option>';
  select.disabled = true;

  try {
    const response = await fetch("/reports/api/classes");
    const data = await response.json();

    if (data.success && data.classes.length > 0) {
      select.innerHTML = '<option value="">Select Class</option>';
      data.classes.forEach((cls) => {
        const option = document.createElement("option");
        option.value = cls.class_room_id;
        option.textContent = cls.class_name;
        select.appendChild(option);
      });
    } else {
      select.innerHTML = '<option value="">No classes found</option>';
    }
  } catch (error) {
    console.error("Error loading classes:", error);
    select.innerHTML = '<option value="">Error loading classes</option>';
    showNotification(
      "Error loading classes. Please refresh the page.",
      "error"
    );
  } finally {
    select.disabled = false;
  }
}

async function loadConfigs() {
  const select = document.getElementById("configFilter");
  select.innerHTML = '<option value="">Loading...</option>';
  select.disabled = true;

  try {
    const response = await fetch("/reports/api/configs");
    const data = await response.json();

    if (data.success) {
      select.innerHTML = '<option value="">Default</option>';
      data.configs.forEach((config) => {
        const option = document.createElement("option");
        option.value = config.config_id;
        option.textContent = config.config_name;
        if (config.is_default) {
          option.textContent += " (Default)";
        }
        select.appendChild(option);
      });
    } else {
      select.innerHTML = '<option value="">Default</option>';
    }
  } catch (error) {
    console.error("Error loading configs:", error);
    select.innerHTML = '<option value="">Default</option>';
  } finally {
    select.disabled = false;
  }
}

function showNotification(message, type = "info") {
  // Simple notification function
  const colors = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-yellow-500",
  };

  const notification = document.createElement("div");
  notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Global loading indicator functions
function showGlobalLoading(message = "Processing...") {
  // Create loading overlay if it doesn't exist
  let overlay = document.getElementById("global-loading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "global-loading-overlay";
    overlay.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
    overlay.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-xl p-6 flex flex-col items-center shadow-2xl">
                <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p class="text-gray-700 dark:text-gray-300 font-medium">${message}</p>
            </div>
        `;
    document.body.appendChild(overlay);
  } else {
    // Update message if overlay already exists
    const messageElement = overlay.querySelector("p");
    if (messageElement) {
      messageElement.textContent = message;
    }
    overlay.classList.remove("hidden");
  }

  // Prevent body scrolling
  document.body.classList.add("overflow-hidden");
}

function hideGlobalLoading() {
  const overlay = document.getElementById("global-loading-overlay");
  if (overlay) {
    overlay.classList.add("hidden");
  }

  // Restore body scrolling
  document.body.classList.remove("overflow-hidden");
}

async function loadStudents() {
  const termId = document.getElementById("termFilter").value;
  const classId = document.getElementById("classFilter").value;
  const configId = document.getElementById("configFilter").value;

  if (!termId || !classId) {
    showAlert({
      title: "Validation Error",
      message: "Please select both term and class",
      type: "warning",
    });
    return;
  }

  // Show global loading indicator
  showGlobalLoading("Loading students...");

  currentFilters = {
    term_id: termId,
    class_room_id: classId,
    config_id: configId || null,
  };

  try {
    const [studentsResponse] = await Promise.all([
      fetch(`/reports/api/students?class_id=${classId}`),
    ]);

    const studentsData = await studentsResponse.json();

    if (studentsData.success) {
      currentStudents = studentsData.students;
      renderStudentsTable(currentStudents);
    } else {
      showAlert({
        title: "Error",
        message: "Error loading students: " + studentsData.error,
        type: "error",
      });
    }
  } catch (error) {
    console.error("Error loading data:", error);
    showAlert({
      title: "Error",
      message: "Error loading data. Please try again.",
      type: "error",
    });
  } finally {
    // Hide global loading indicator
    hideGlobalLoading();
  }
}

function renderStudentsTable(students) {
  const container = document.getElementById("studentsList");

  if (students.length === 0) {
    container.innerHTML =
      '<p class="text-gray-500 dark:text-gray-400 text-center py-8">No students found in this class</p>';
    return;
  }

  container.innerHTML = `
        <div class="mb-4">
            <input type="text" id="studentSearch" placeholder="Search students by name or admission number..." 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                onkeyup="filterStudents()">
        </div>
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Student</th>
                        <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody id="studentsTableBody" class="divide-y divide-gray-200 dark:divide-gray-700">
                    ${students
      .map(
        (student) => `
                        <tr class="student-row hover:bg-gray-50 dark:hover:bg-gray-700" 
                            data-name="${student.first_name} ${student.last_name
          }" 
                            data-admission="${student.admission_number || ""}">
                            <td class="px-4 py-3">
                                <div class="flex items-center">
                                    ${student.profile_picture
            ? `<img src="${student.profile_picture}" alt="${student.first_name}" class="w-8 h-8 rounded-full mr-3">`
            : `<div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white mr-3">${student.first_name[0]}</div>`
          }
                                    <span class="text-sm font-medium text-gray-900 dark:text-white">${student.first_name
          } ${student.last_name}</span>
                                </div>
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">${student.admission_number || "N/A"
          }</td>
                            <td class="px-4 py-3">
                                <div class="flex items-center justify-center gap-2">
                                    <button onclick="previewReport('${student.id
          }')" 
                                        class="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200" 
                                        title="Preview Report">
                                        <span class="material-symbols-outlined text-sm">visibility</span>
                                        <span class="text-xs font-medium">Preview</span>
                                    </button>
                                    <button onclick="downloadReport('${student.id
          }')" 
                                        class="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200" 
                                        title="Download PDF">
                                        <span class="material-symbols-outlined text-sm">download</span>
                                        <span class="text-xs font-medium">Download</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `
      )
      .join("")}
                </tbody>
            </table>
        </div>
        <div class="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Showing <span id="visibleCount">${students.length}</span> of ${students.length
    } students
        </div>
    `;
}

function filterStudents() {
  const searchTerm = document
    .getElementById("studentSearch")
    .value.toLowerCase();
  const rows = document.querySelectorAll(".student-row");
  let visibleCount = 0;

  rows.forEach((row) => {
    const name = row.getAttribute("data-name").toLowerCase();
    const admission = row.getAttribute("data-admission").toLowerCase();

    if (name.includes(searchTerm) || admission.includes(searchTerm)) {
      row.style.display = "";
      visibleCount++;
    } else {
      row.style.display = "none";
    }
  });

  document.getElementById("visibleCount").textContent = visibleCount;
}

// Canvas-Based PDF Preview System
async function previewReport(studentId) {
  const termId = document.getElementById("termFilter").value;
  const classId = document.getElementById("classFilter").value;
  const configId = document.getElementById("configFilter").value;

  if (!termId || !classId) {
    showAlert({
      title: "Error",
      message: "Please select both term and class",
      type: "error",
    });
    return;
  }

  showGlobalLoading("Loading preview...");

  try {
    const params = new URLSearchParams({
      term_id: termId,
      class_room_id: classId,
      config_id: configId || "",
    });

    const response = await fetch(
      `/reports/api/student-report/${studentId}?${params.toString()}`
    );
    const data = await response.json();

    if (data && data.success && data.report) {
      await showCanvasBasedPreview(data.report);
    } else {
      throw new Error(data.message || "Failed to load report data");
    }
  } catch (error) {
    console.error("Error loading preview:", error);
    showAlert({
      title: "Error",
      message: "Failed to load preview: " + error.message,
      type: "error",
    });
  } finally {
    hideGlobalLoading();
  }
}

async function showCanvasBasedPreview(reportData) {
  try {
    console.log("Creating canvas-based PDF preview");
    console.log(reportData)

    // Ensure html2canvas is loaded
    if (typeof html2canvas === "undefined") {
      await loadHtml2Canvas();
    }

    // Create or get the preview modal
    let modal = document.getElementById("canvasPdfPreviewModal");
    if (!modal) {
      modal = createCanvasPreviewModal();
    }

    // Generate HTML content
    const html = generateReportHTML(reportData);

    // Create temporary element for rendering
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.top = "0";
    tempDiv.style.width = "210mm"; // A4 width
    tempDiv.style.backgroundColor = "white";
    tempDiv.innerHTML = html;
    document.body.appendChild(tempDiv);

    // Show loading state
    const previewContainer = document.getElementById("canvasPreviewContent");
    previewContainer.innerHTML = `
            <div class="preview-loading">
                <div class="preview-loading-spinner"></div>
                <p style="margin-top: 16px; color: #6b7280;">Generating preview...</p>
            </div>
        `;

    // Show modal
    modal.classList.remove("hidden");

    // Wait for images and resources to load
    await waitForResources(tempDiv);

    // Render to canvas with PDF-like quality
    const canvas = await html2canvas(tempDiv, {
      scale: 2, // High quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: tempDiv.scrollWidth,
      windowHeight: tempDiv.scrollHeight,
    });

    // Calculate pages (A4 height in pixels at scale 2)
    const a4HeightPx = 297 * 3.7795275591 * 2; // mm to px at 96 DPI * scale
    const totalPages = Math.ceil(canvas.height / a4HeightPx);

    // Clear preview container
    previewContainer.innerHTML = "";

    // Split canvas into pages
    for (let page = 0; page < totalPages; page++) {
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = Math.min(
        a4HeightPx,
        canvas.height - page * a4HeightPx
      );
      pageCanvas.style.width = "210mm";
      pageCanvas.style.height = "auto";
      pageCanvas.style.display = "block";
      pageCanvas.style.margin = "20px auto";
      pageCanvas.style.boxShadow = "0 0 50px rgba(0, 0, 0, 0.3)";
      pageCanvas.style.backgroundColor = "white";

      const ctx = pageCanvas.getContext("2d");
      ctx.drawImage(
        canvas,
        0,
        page * a4HeightPx,
        canvas.width,
        pageCanvas.height,
        0,
        0,
        pageCanvas.width,
        pageCanvas.height
      );

      previewContainer.appendChild(pageCanvas);

      // Add page number
      const pageNum = document.createElement("div");
      pageNum.textContent = `Page ${page + 1} of ${totalPages}`;
      pageNum.style.textAlign = "center";
      pageNum.style.color = "#9ca3af";
      pageNum.style.fontSize = "12px";
      pageNum.style.margin = "10px 0 30px 0";
      previewContainer.appendChild(pageNum);
    }

    // Store data for download
    window.currentPreviewData = reportData;

    // Clean up
    document.body.removeChild(tempDiv);

    // Update page count in modal
    const pageCounter = document.getElementById("previewPageCount");
    if (pageCounter) {
      pageCounter.textContent = `${totalPages} page${totalPages > 1 ? "s" : ""
        }`;
    }
  } catch (error) {
    console.error("Error creating canvas preview:", error);
    showAlert({
      title: "Error",
      message: "Failed to create preview: " + error.message,
      type: "error",
    });
  }
}

// Load html2canvas library
async function loadHtml2Canvas() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Wait for all resources to load
function waitForResources(element) {
  return new Promise((resolve) => {
    const images = element.getElementsByTagName("img");
    let loadedCount = 0;
    const totalImages = images.length;

    if (totalImages === 0) {
      resolve();
      return;
    }

    const checkComplete = () => {
      loadedCount++;
      if (loadedCount === totalImages) {
        resolve();
      }
    };

    Array.from(images).forEach((img) => {
      if (img.complete) {
        checkComplete();
      } else {
        img.addEventListener("load", checkComplete);
        img.addEventListener("error", checkComplete);
      }
    });

    // Timeout after 5 seconds
    setTimeout(resolve, 5000);
  });
}

// Create canvas preview modal
function createCanvasPreviewModal() {
  const modal = document.createElement("div");
  modal.id = "canvasPdfPreviewModal";
  modal.className = "fixed inset-0 bg-black bg-opacity-75 z-50 hidden";
  modal.innerHTML = `
        <div class="flex flex-col h-full">
            <!-- Header -->
            <div class="preview-toolbar bg-gray-800 text-white p-4 flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <h3 class="text-lg font-bold">PDF Preview</h3>
                    <span id="previewPageCount" class="text-sm text-gray-300 bg-gray-700 px-3 py-1 rounded"></span>
                    <span class="quality-indicator high text-xs">High Quality</span>
                </div>
                <div class="flex items-center gap-2">
                    <!-- Refresh Preview -->
                    <button onclick="refreshCanvasPreview()" 
                        class="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                        title="Refresh Preview">
                        <span class="material-symbols-outlined text-sm">refresh</span>
                    </button>
                    
                    <!-- Download Button -->
                    <button onclick="downloadFromPreview()" 
                        class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                        title="Download PDF">
                        <span class="material-symbols-outlined text-sm">download</span>
                        <span>Download PDF</span>
                    </button>
                    
                    <!-- Close Button -->
                    <button onclick="closeCanvasPreviewModal()" 
                        class="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                        title="Close">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>
            
            <!-- Preview Container -->
            <div class="flex-1 overflow-auto bg-gray-900 p-4">
                <div id="canvasPreviewContent"></div>
            </div>
        </div>
    `;

  document.body.appendChild(modal);
  return modal;
}

// Close canvas preview modal
function closeCanvasPreviewModal() {
  const modal = document.getElementById("canvasPdfPreviewModal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

// Refresh preview
async function refreshCanvasPreview() {
  if (window.currentPreviewData) {
    await showCanvasBasedPreview(window.currentPreviewData);
  }
}

// Download from preview
async function downloadFromPreview() {
  if (window.currentPreviewData) {
    try {
      await generateClientSidePDF(window.currentPreviewData);
    } catch (error) {
      console.error("Error downloading PDF from preview:", error);
      showAlert({
        title: "Error",
        message: "Failed to download PDF: " + error.message,
        type: "error",
      });
    }
  }
}
// renderReportPreview function removed - using full page preview instead

function formatAssessmentName(code) {
  // If code is already a full name (from assessment_types), return as is
  if (typeof code !== "string") {
    return code;
  }

  // Special handling for common assessment types
  const specialCases = {
    cbt: "Computer Based Test",
    ca: "Continuous Assessment",
    exam: "Terminal Examination",
    mid_term: "Mid-Term Exam",
    final: "Final Exam",
    quiz: "Quiz",
    assignment: "Assignment",
    project: "Project",
  };

  if (specialCases[code.toLowerCase()]) {
    return specialCases[code.toLowerCase()];
  }

  return code
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatPosition(position) {
  if (!position) return "N/A";
  const suffix =
    position % 10 === 1 && position !== 11
      ? "st"
      : position % 10 === 2 && position !== 12
        ? "nd"
        : position % 10 === 3 && position !== 13
          ? "rd"
          : "th";
  return position + suffix;
}

function calculateResumptionDate(endDateStr, configResumptionDate = null) {
  // If a specific resumption date is configured, use it
  if (configResumptionDate) {
    try {
      const date = new Date(configResumptionDate);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error formatting configured resumption date:", error);
    }
  }

  // Fallback to calculated date if no specific date is configured
  if (!endDateStr) return "N/A";

  try {
    // Parse the end date
    const endDate = new Date(endDateStr);

    // Add 14 days (2 weeks) to get resumption date
    const resumptionDate = new Date(endDate);
    resumptionDate.setDate(resumptionDate.getDate() + 14);

    // Format as YYYY-MM-DD
    const day = String(resumptionDate.getDate()).padStart(2, "0");
    const month = String(resumptionDate.getMonth() + 1).padStart(2, "0");
    const year = resumptionDate.getFullYear();

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error("Error calculating resumption date:", error);
    return "N/A";
  }
}

// getGrade function removed in favor of consolidated getSimpleGrade below

// Modal functions removed - using full page preview instead

async function downloadReport(studentId) {
  // Show loading spinner
  const originalButtons = document.querySelectorAll(
    `button[onclick*="downloadReport('${studentId}')"]`
  );
  const originalButtonHtml = [];

  // Store original HTML and show loading state
  originalButtons.forEach((button) => {
    originalButtonHtml.push(button.innerHTML);
    button.innerHTML = `
            <div class="flex items-center gap-1">
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span class="text-xs font-medium">Processing...</span>
            </div>
        `;
    button.disabled = true;
    button.classList.add("opacity-75", "cursor-not-allowed");
  });

  try {
    // Use client-side PDF generation with new API endpoint
    if (currentReportData && currentReportData.student.id === studentId) {
      // Generate PDF directly in the browser
      await generateClientSidePDF(currentReportData);
    } else {
      // Fetch report data from new API endpoint and then generate PDF
      // Build query parameters
      const params = new URLSearchParams({
        term_id: currentFilters.term_id,
        class_room_id: currentFilters.class_room_id, // Use class_room_id to match backend expectation
        config_id: currentFilters.config_id || "",
      });

      const response = await fetch(
        `/reports/api/student-report/${studentId}?${params.toString()}`
      );

      const data = await response.json();

      // Check if the response has the expected structure
      if (data && data.success && data.report) {
        await generateClientSidePDF(data.report);
      } else if (data && !data.success) {
        throw new Error(
          "Failed to fetch report data: " + (data.message || "Server error")
        );
      } else {
        throw new Error("Invalid response format from server");
      }
    }
  } catch (error) {
    console.error("Error downloading report:", error);
    showAlert({
      title: "Error",
      message: "Error generating PDF: " + error.message,
      type: "error",
    });
  } finally {
    // Restore original button states
    originalButtons.forEach((button, index) => {
      if (index < originalButtonHtml.length) {
        button.innerHTML = originalButtonHtml[index];
        button.disabled = false;
        button.classList.remove("opacity-75", "cursor-not-allowed");
      }
    });
  }
}

async function downloadCurrentReport() {
  if (currentReportData) {
    // Show loading spinner on download button in preview modal
    const downloadButton = document.querySelector(
      'button[onclick="downloadCurrentReport()"]'
    );
    const originalHtml = downloadButton.innerHTML;

    downloadButton.innerHTML = `
            <div class="flex items-center gap-2">
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span class="text-sm font-bold">Downloading...</span>
            </div>
        `;
    downloadButton.disabled = true;
    downloadButton.classList.add("opacity-75", "cursor-not-allowed");

    try {
      // Use client-side PDF generation
      await generateClientSidePDF(currentReportData);
    } catch (error) {
      console.error("Error downloading report:", error);
      showAlert({
        title: "Error",
        message: "Error generating PDF: " + error.message,
        type: "error",
      });
    } finally {
      // Restore original button state
      downloadButton.innerHTML = originalHtml;
      downloadButton.disabled = false;
      downloadButton.classList.remove("opacity-75", "cursor-not-allowed");
    }
  }
}

async function previewAllReports() {
  if (currentStudents.length === 0) {
    showAlert({
      title: "Warning",
      message: "No students loaded",
      type: "warning",
    });
    return;
  }

  showConfirmModal({
    title: "Preview All Reports",
    message: `This will open preview for ${currentStudents.length} students. Continue?`,
    confirmText: "Continue",
    onConfirm: async () => {
      // Show global loading indicator
      showGlobalLoading("Opening previews...");

      try {
        for (const student of currentStudents) {
          const params = new URLSearchParams({
            ...currentFilters,
            student_id: student.id,
          });
          window.open(
            `/reports/preview/${student.id}?${params.toString()}`,
            "_blank"
          );
          await new Promise((resolve) => setTimeout(resolve, 500)); // Delay between opens
        }
      } catch (error) {
        console.error("Error opening previews:", error);
        showAlert({
          title: "Error",
          message: "Error opening previews. Please try again.",
          type: "error",
        });
      } finally {
        // Hide global loading indicator
        hideGlobalLoading();
      }
    },
  });
}

async function downloadAllReports() {
  if (currentStudents.length === 0) {
    showAlert({
      title: "Warning",
      message: "No students loaded",
      type: "warning",
    });
    return;
  }

  // Ensure we have required parameters
  const termId = currentFilters.term_id;
  const classId = currentFilters.class_room_id; // This was the issue - it's class_room_id in filters but class_id in backend

  if (!termId || !classId) {
    showAlert({
      title: "Error",
      message:
        "Missing required parameters for PDF generation. Please ensure term and class are selected.",
      type: "error",
    });
    return;
  }

  showConfirmModal({
    title: "Download All Reports",
    message: `This will download individual PDF reports for all ${currentStudents.length} students. Continue?`,
    confirmText: "Download",
    onConfirm: async () => {
      // Show loading state for download all button
      const downloadAllButton = document.querySelector(
        'button[onclick="downloadAllReports()"]'
      );
      const originalHtml = downloadAllButton.innerHTML;

      downloadAllButton.innerHTML = `
                <div class="flex items-center gap-2">
                    <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span class="text-sm font-bold">Processing...</span>
                </div>
            `;
      downloadAllButton.disabled = true;
      downloadAllButton.classList.add("opacity-75", "cursor-not-allowed");

      try {
        // Track successful downloads
        let successCount = 0;
        let errorCount = 0;

        // Generate PDF for each student
        for (let i = 0; i < currentStudents.length; i++) {
          const student = currentStudents[i];

          try {
            // Update button text to show progress
            downloadAllButton.innerHTML = `
                            <div class="flex items-center gap-2">
                                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span class="text-sm font-bold">Processing ${i + 1
              }/${currentStudents.length}...</span>
                            </div>
                        `;

            // Fetch report data for this student
            const reportResponse = await fetch(
              `/reports/api/student-report/${student.id
              }?term_id=${termId}&class_room_id=${classId}&config_id=${currentFilters.config_id || ""
              }`
            );

            if (!reportResponse.ok) {
              throw new Error(
                `Failed to fetch report data for ${student.name}`
              );
            }

            const reportData = await reportResponse.json();
            console.log(reportData);
            // Check if the response has the expected structure
            if (reportData && reportData.success && reportData.report) {
              // Generate PDF for this student using client-side generation
              await generateClientSidePDF(reportData.report);
            } else if (reportData && !reportData.success) {
              throw new Error(
                `Failed to fetch report data for ${student.name}: ${reportData.message || "Server error"
                }`
              );
            } else {
              throw new Error(`Invalid response format for ${student.name}`);
            }

            successCount++;
          } catch (studentError) {
            console.error(
              `Error generating PDF for student ${student.name}:`,
              studentError
            );
            errorCount++;
          }
        }

        // Show completion message
        if (errorCount === 0) {
          showAlert({
            title: "Success",
            message: `Successfully downloaded ${successCount} PDF reports.`,
            type: "success",
          });
        } else {
          showAlert({
            title: "Partial Success",
            message: `Downloaded ${successCount} PDF reports. ${errorCount} reports failed to download.`,
            type: "warning",
          });
        }
      } catch (error) {
        console.error("Error downloading reports:", error);
        showAlert({
          title: "Error",
          message: "Error generating reports: " + error.message,
          type: "error",
        });
      } finally {
        // Restore original button state
        downloadAllButton.innerHTML = originalHtml;
        downloadAllButton.disabled = false;
        downloadAllButton.classList.remove("opacity-75", "cursor-not-allowed");
      }
    },
  });
}
async function pollForCompletion(jobId) {
  const maxAttempts = 60; // 5 minutes with 5-second intervals
  let attempts = 0;

  showGlobalLoading("Generating PDF...");

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`/reports/api/status/${jobId}`);
      const data = await response.json();

      if (data.state === "SUCCESS") {
        hideGlobalLoading();
        await downloadGeneratedFile(jobId);
        return;
      } else if (data.state === "FAILURE") {
        hideGlobalLoading();
        showAlert({
          title: "Error",
          message: "PDF generation failed: " + (data.error || "Unknown error"),
          type: "error",
        });
        return;
      }

      // Still processing, update progress if available
      if (data.progress) {
        showGlobalLoading(`Generating PDF... ${data.progress}%`);
      }

      // Wait 5 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    } catch (error) {
      console.error("Error polling for completion:", error);
      hideGlobalLoading();
      showAlert({
        title: "Error",
        message: "Error checking PDF generation status",
        type: "error",
      });
      return;
    }
  }

  // Timeout
  hideGlobalLoading();
  showAlert({
    title: "Timeout",
    message: "PDF generation is taking longer than expected. Please try again.",
    type: "warning",
  });
}

async function downloadGeneratedFile(jobId) {
  try {
    const response = await fetch(`/reports/api/download/${jobId}`);

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${jobId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else {
      const data = await response.json();
      showAlert({
        title: "Error",
        message: "Error downloading file: " + (data.error || "Unknown error"),
        type: "error",
      });
    }
  } catch (error) {
    console.error("Error downloading file:", error);
    showAlert({
      title: "Error",
      message: "Error downloading generated file",
      type: "error",
    });
  }
}

function generateGradingLegend(gradeScale = null) {
  // If a grade scale is provided, use it
  if (gradeScale && gradeScale.grade_ranges) {
    return gradeScale.grade_ranges
      .map((range) => {
        const colorMap = {
          A: "bg-green-500",
          B: "bg-blue-600",
          C: "bg-yellow-500",
          D: "bg-red-400",
          F: "bg-gray-500",
        };

        const colorClass = colorMap[range.grade] || "bg-gray-500";
        const remark = range.remark || "";

        return `<div class="legend-item"><div class="legend-dot ${colorClass}"></div>${range.grade} (${range.min_score}-${range.max_score}%) ${remark}</div>`;
      })
      .join("");
  }

  // If no grade scale is available, show an error message
  console.error(
    "No grade scale available. Please ensure the default grade scale is properly configured."
  );
  return `<div class="text-red-500">No grading scale configured. Please contact administrator.</div>`;
}

// Helper function to generate HTML for the report
/**
 * Generate HTML for single-page report card matching the provided design
 * This ensures the report always fits on one A4 page
 */
function generateReportHTML(reportData) {
  // Robust extraction handling null/undefined
  // Ensure we have valid objects even if API returns incomplete data
  const student = reportData.student || {};
  const schoolObj = reportData.school || {};
  const term = reportData.term || {};
  const assessment_types = reportData.assessment_types || [];
  const scores = reportData.scores || {};
  const position = reportData.position;
  const total_students = reportData.total_students;
  const overall_total = reportData.overall_total || 0;
  const overall_max = reportData.overall_max || 0;

  // Extract configuration settings with defaults
  const config = reportData.config || {};
  const displaySettings = config.display_settings || {
    show_logo: true,
    show_student_image: true,
    show_position: true,
    show_class_teacher_comment: true,
    show_principal_comment: true,
  };

  const gradeScale = reportData.grade_scale || null;

  const scoreCount = Object.keys(scores || {}).length || 1;
  const overallPercentage = displaySettings.treat_total_as_percentage
    ? (overall_total || 0) / scoreCount
    : ((overall_total || 0) / (overall_max || 1)) * 100;
  const overallGrade = getSimpleGrade(overallPercentage, gradeScale);
  console.log("[Report HTML] Overall Total:", overall_total);
  console.log("[Report HTML] Overall Max:", overall_max);

  const assessments = (assessment_types || [])
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((at) => at.code);

  let subjectRows = Object.values(scores || {})
    .map((sub, idx) => {
      // Use actual max_total
      // sub.max_total = 100.0;

      const isPercentageMode = displaySettings.treat_total_as_percentage;
      const perc = isPercentageMode
        ? sub.total || 0
        : (sub.total / (sub.max_total || 1)) * 100;

      const grade = getSimpleGrade(perc, gradeScale);
      const remark = getRemark(grade, gradeScale);

      return `
            <tr class="subject-row">
                <td class="col-sn">${idx + 1}</td>
                <td class="col-subject">${sub.subject_name}</td>
                ${assessments
          .map((code) => {
            const score = sub.assessments[code]?.score;
            const val =
              score !== undefined && score !== null
                ? Math.round(score)
                : "-";
            return `<td class="col-score text-center">${val}</td>`;
          })
          .join("")}
                <td class="col-total text-center fw-bold">${Math.round(
            sub.total
          )}</td>
                <td class="col-grade text-center"><span class="badge badge-${grade}">${grade}</span></td>
                <td class="col-remark text-center">${remark}</td>
            </tr>`;
    })
    .join("");

  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Student Report</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            
            @page {
                size: A4 portrait;
                margin: 0;
            }

            * {
                box-sizing: border-box;
                -webkit-# print-color-adjust: exact !important;
                # print-color-adjust: exact !important;
            }

            body {
                margin: 0;
                padding: 0;
                font-family: 'Inter', sans-serif;
                background: white;
                color: #1f2937;
                width: 210mm;
                height: 290mm; /* Further reduced to prevent overflow */
                overflow: hidden;
                font-size: 10pt;
                line-height: 1.25; /* Even tighter line height */
                page-break-after: avoid;
                page-break-inside: avoid;
            }
            
            #report-card {
                position: relative;
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
            }

            .main-container {
                display: flex;
                flex-direction: column;
                justify-content: flex-start; /* Ensure start from top */
                height: 96%; /* Further reduced to prevent overflow */
                margin: 0;
                padding: 0;
            }

            /* PRIMARY COLORS */
            :root {
                --primary-blue: #3730a3;
                --header-bg: #4338ca;
                --table-header-bg: #4338ca;
                --stripe-bg: #f8fafc;
            }

            /* HEADER */
            .header-banner {
                background: linear-gradient(135deg, #4338ca 0%, #312e81 100%);
                color: white;
                padding: 2mm 4mm; /* Reduced padding */
                border-radius: 5px;
                display: flex;
                margin: 0 0 1.5mm 0 !important; /* Reduced margin */
                width: 100% !important;
                align-items: center;
                justify-content: center;
                gap: 3mm; /* Reduced gap */
            }

            .logo-placeholder {
                width: 20mm;
                height: 20mm;
                background: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .center-container {
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .logo-img { width: 100%; height: 100%; object-fit: contain; }

            .school-text {
                text-align: center;
                padding: 0 4mm;
            }
            .school-name {
                font-size: 17pt;
                font-weight: 800;
                text-transform: uppercase;
                margin: 0;
                line-height: 1.1;
                letter-spacing: 0.5px;
                text-shadow: 0 1px 2px rgba(0,0,0,0.1);
            }
            .report-label {
                color: white;
                background: var(--primary-blue);
                font-weight: 700;
                font-size: 12pt;
                margin: 1mm auto 2mm auto !important;
                text-transform: uppercase;
                width: fit-content;
                padding: 2mm;
                border-radius: 4px;
                display: block;
                text-align: center;
            }
     
            .school-motto { 
                font-size: 9pt; 
                margin: 1mm 0 0 0; 
                opacity: 0.95;
                font-style: italic; 
            }
            .school-address { font-size: 9pt; margin: 1mm 0 0 0; opacity: 0.95; }
            
            .school-sections { 
                margin: 1mm 0; 
                display: flex; 
                flex-wrap: wrap; 
                justify-content: center; 
                gap: 1mm; 
            }
            .section-badge {
                background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
                color: white;
                font-size: 8pt;
                padding: 0.5mm 1mm;
                border-radius: 3px;
                display: inline-block;
                margin: 0 0.5mm;
            }

            .student-photo-frame {
                width: 15mm;
                height: 15mm;
                background: white;
                text-align: center;
                border-radius: 4px;
                padding: 2px;
                overflow: hidden;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .student-info-container {
                height: fit-content;
                padding: 2mm;
            }
            .student-img { width: 100%; height: 100%; object-fit: cover; }

            /* INFO STRIPS */
            .section-header {
                background-color: #6366f1;
                color: white;
                font-weight: 700;
                text-align: center;
                text-transform: uppercase;
                font-size: 11pt;
                padding: 2mm;
                border-radius: 4px;
                margin-bottom: 1mm;
                letter-spacing: 0.5px;
            }
                        
            /* Info table styles - applied to both .info-table and .student-info-table */
            .info-table, .student-info-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                font-size: 9pt; /* Reduced font size */
                border: 1px solid #e2e8f0;
                border-radius: 4px;
            }
            .info-table td, .student-info-table td {
                padding: 0.8mm 1.2mm; /* Reduced padding */
                border-bottom: 1px solid #e2e8f0;
                border-right: 1px solid #f1f5f9;
            }
            .info-table tr:last-child td, .student-info-table tr:last-child td { border-bottom: 1px solid #e2e8f0; }
            .info-table td:last-child, .student-info-table td:last-child { border-right: none; }
                        
            .info-label {
                font-weight: 600;
                color: #475569;
                padding: 0 1mm;
                white-space: nowrap;
            }
            .info-val { 
                font-weight: 700; 
                color: #1e293b; 
                text-align: left;
            }
            
            /* TERM BAR */
            .term-grid {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                background-color: white;
                border: 1px solid #e2e8f0;
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 1mm; /* Reduced margin */
                text-align: center;
                height: fit-content;
            }
            .term-col { padding: 0; border-right: 1px solid #e2e8f0; }
            .term-col:last-child { border-right: none; }
            
            .term-head {
                background-color: #4338ca;
                color: white;
                font-size: 9pt;
                font-weight: 700;
                text-transform: uppercase;
                padding: 1.5mm;
            }
            .term-data {
                background-color: white;
                font-weight: 600;
                font-size: 9.5pt;
                padding: 1.5mm;
            }

            /* PERFORMANCE TABLE - MODERNIZED */
            .perf-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                font-size: 9pt; /* Reduced font size */
                margin-bottom: 1.5mm; /* Reduced margin */
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                overflow: hidden;
            }
            .perf-table th {
                background: linear-gradient(180deg, #4f46e5 0%, #4338ca 100%);
                color: white;
                font-weight: 700;
                text-transform: uppercase;
                padding: 1.5mm 1.2mm; /* Reduced padding */
                font-size: 8.5pt; /* Reduced font size */
                border-bottom: 1px solid #312e81;
                border-right: 1px solid rgba(255,255,255,0.1);
                letter-spacing: 0.5px;
            }
            .perf-table th:last-child { border-right: none; }
            
            .perf-table td {
                padding: 1mm 1.2mm; /* Reduced padding */
                border-bottom: 1px solid #e2e8f0;
                border-right: 1px solid #f1f5f9;
                color: #334155;
            }
            .perf-table td:last-child { border-right: none; }
            .perf-table tr:last-child td { border-bottom: none; }
            
            .subject-row:nth-child(even) { background-color: #f8fafc; }
            
            .text-center { text-align: center; }
            .fw-bold { font-weight: 700; }
            .col-sn { width: 25px; text-align: center; background-color: #f8fafc; font-weight: 600; color: #64748b; }
            .col-subject { text-align: left; padding-left: 2mm !important; font-weight: 600; color: #1e293b; }
            .col-total { background-color: #eff6ff; font-weight: 700; color: #1e40af; }
            
            /* BADGES - Pill Shape */
            .badge {
                display: inline-block;
                padding: 2px 8px;
                min-width: 20px;
                border-radius: 4px;
                color: white;
                text-align: center;
                font-weight: 700;
                font-size: 9pt;
                box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            }
            .badge-A { background: #059669; }
            .badge-B { background: #2563eb; }
            .badge-C { background: #d97706; }
            .badge-D { background: #dc2626; }
            .badge-F { background: #374151; }

            /* COMMENTS & FOOTER WRAPPER */
            .footer-section {
                margin-top: 0; 
                padding-top: 0.5mm; /* Reduced padding */
            }

            .comments-container {
                display: flex;
                gap: 3mm; /* Reduced gap */
                margin-bottom: 2mm; /* Reduced margin */
            }
            .comment-block {
                flex: 1;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                background-color: white;
                padding: 1mm; /* Reduced padding */
                height: 30mm; /* Reduced height */
                position: relative;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }
            .comment-header {
                font-size: 9pt;
                font-weight: 700;
                color: #4338ca;
                border-bottom: 1px solid #f1f5f9;
                padding-bottom: 1mm;
                margin-bottom: 1mm;
                text-transform: uppercase;
            }
            .comment-text { font-size: 9.5pt; color: #334155; font-style: italic; line-height: 1.3; }
            .signature-box {
                position: absolute;
                bottom: 2mm;
                width: 90%;
                border-top: 1px dotted #94a3b8;
                padding-top: 1mm;
                font-size: 8.5pt;
                color: #64748b;
            }

            .grading-scale {
                display: flex;
                justify-content: center;
                gap: 1.5mm; /* Reduced gap */
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 1.5mm; /* Reduced padding */
                font-size: 8.5pt;
                color: #475569;
                margin-bottom: 1.5mm; /* Reduced margin */
            }
            .scale-badge {
                padding: 0 4px;
                border-radius: 2px;
                color: white;
                font-weight: 700;
                margin-right: 2px;
            }
            
            .scale-grade {
                font-size: 9.5pt;
                padding: 2px 4px;
                border-radius: 2px;
            }

            .official-warning {
                background: #fffbeb;
                border: 1px solid #fcd34d;
                color: #b45309;
                text-align: center;
                font-size: 9.5pt; /* Slightly smaller */
                padding: 1mm; /* Reduced padding */
                border-radius: 2px;
                margin-top: 1.5mm; /* Reduced margin */
            }

            /* DARKER WATERMARK */
            .watermark {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-30deg);
                font-size: 35pt !important; /* Further reduced to prevent overflow */
                font-weight: 900;
                color: rgba(30, 64, 175, 0.15); /* Stronger blue opacity */
                z-index: 1; /* Reduced z-index */
                pointer-events: none;
                white-space: nowrap;
                letter-spacing: 4px; /* Reduced spacing */
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            /* CIRCULAR GRADIENT DECORATIONS */
            .decoration-circle {
                position: absolute;
                border-radius: 50%;
                z-index: 0;
                pointer-events: none;
                opacity: 0.3; /* Further increased visibility */
            }
            
            .decoration-circle-1 {
                width: 30mm;
                height: 30mm;
                background: radial-gradient(circle, rgba(79, 70, 229, 0.6) 0%, rgba(67, 56, 202, 0.4) 50%, rgba(49, 46, 129, 0.2) 100%);
                top: 15mm;
                right: 20mm;
            }
            
            .decoration-circle-2 {
                width: 20mm;
                height: 20mm;
                background: radial-gradient(circle, rgba(139, 92, 246, 0.6) 0%, rgba(124, 58, 237, 0.4) 50%, rgba(99, 102, 241, 0.2) 100%);
                bottom: 25mm;
                left: 15mm;
            }
            
            .decoration-circle-3 {
                width: 25mm;
                height: 25mm;
                background: radial-gradient(circle, rgba(59, 130, 246, 0.6) 0%, rgba(37, 99, 235, 0.4) 50%, rgba(29, 78, 216, 0.2) 100%);
                top: 80mm;
                left: 55mm;
            }
            
            .decoration-circle-4 {
                width: 18mm;
                height: 18mm;
                background: radial-gradient(circle, rgba(16, 185, 129, 0.6) 0%, rgba(5, 150, 105, 0.4) 50%, rgba(15, 118, 110, 0.2) 100%);
                bottom: 40mm;
                right: 25mm;
            }
            
            .decoration-circle-5 {
                width: 25mm;
                height: 25mm;
                background: radial-gradient(circle, rgba(236, 72, 153, 0.6) 0%, rgba(219, 39, 119, 0.4) 50%, rgba(190, 24, 93, 0.2) 100%);
                top: 15mm;
                left: 20mm;
            }
            
            .decoration-circle-6 {
                width: 22mm;
                height: 22mm;
                background: radial-gradient(circle, rgba(245, 158, 11, 0.6) 0%, rgba(217, 119, 6, 0.4) 50%, rgba(180, 83, 9, 0.2) 100%);
                bottom: 30mm;
                right: 40mm;
            }
            
            .decoration-circle-7 {
                width: 24mm;
                height: 24mm;
                background: radial-gradient(circle, rgba(139, 92, 246, 0.6) 0%, rgba(91, 33, 165, 0.4) 50%, rgba(126, 34, 206, 0.2) 100%);
                bottom: 15mm;
                left: 20mm;
            }

        </style>
    </head>
    <body>
      <div id="report-card">
        <div class="watermark">OFFICIAL DOCUMENT</div>
        <!-- Decorative circular gradient elements -->
        <div class="decoration-circle decoration-circle-1"></div>
        <div class="decoration-circle decoration-circle-2"></div>
        <div class="decoration-circle decoration-circle-3"></div>
        <div class="decoration-circle decoration-circle-4"></div>
        <div class="decoration-circle decoration-circle-5"></div>
        <div class="decoration-circle decoration-circle-6"></div>
        <div class="decoration-circle decoration-circle-7"></div>
        <div class="main-container">
            <!-- Header -->
            <div class="header-banner">
                <div class="logo-placeholder">
                    ${displaySettings.show_logo
      ? schoolObj.logo
        ? `<img src="/${schoolObj.logo.replace(/^static\//, '')}" class="logo-img" onerror="console.error('Logo failed to load:', this.src); this.style.display='none';" onload="console.log('Logo loaded successfully:', this.src);">`
        : `<span style="color:#4f46e5; font-weight:bold; font-size:30pt;">🏫</span>`
      : ``
    }
                </div>
                <div class="school-text">
                    <h1 class="school-name">${schoolObj.name || "SCHOOL NAME"}</h1>
                    <div class="school-sections">
                        ${reportData.formatted_sections ? (() => {
      // Wrap each section name in a badge, keeping commas and 'and' as plain text
      const formatted = reportData.formatted_sections || '';
      if (!formatted) return '';

      return formatted.split(/(, | and )/).map(part => {
        if (part.trim() === ',' || part.trim() === 'and' || part.trim() === ', and') {
          return part.trim() === ',' ? ', ' : part.trim() === 'and' ? ' and ' : part;
        } else if (part.trim()) {
          return `<span class="section-badge">${part.trim()}</span>`;
        }
        return '';
      }).join('');
    })() : ''}
                    </div>
                    <div class="school-address">${schoolObj.address || "Address"} ${schoolObj.phone ? "• " + schoolObj.phone : ""}</div>
                    <div class="school-motto">Motto: ${schoolObj.motto || "Motto"}</div>
                </div>
            </div>
            <div class="report-label">STUDENT PERFORMANCE REPORT</div>

            </div>

            <!-- Student Info Section -->
            <div style="display: flex; gap: 4mm; margin-bottom: 1.5mm; align-items: center; justify-content: center; height: 18mm">
                <!-- Student Photo -->
                ${displaySettings.show_student_image
      ? `<div style="display: flex; flex-direction: column; align-items: center; width: 20mm;">
                    <div class="student-photo-frame" style="width: 100%; height: 100%;">
                      ${student.image
        ? `<img src="/${student.image.replace(/^static\//, '')}" class="student-img" onerror="console.error('Student image failed to load:', this.src); this.outerHTML='<div style=\'width:100%;height:100%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;\'><svg viewBox=\'0 0 100 100\' width=\'100%\' height=\'100%\'><circle cx=\'50\' cy=\'40\' r=\'20\' fill=\'#94a3b8\'/><path d=\'M30,70 Q50,90 70,70 Q65,85 50,85 Q35,85 30,70\' fill=\'#94a3b8\'/></svg></div>'" onload="console.log('Student image loaded successfully:', this.src);">`
        : `<img src="/uploads/profile_images/${student.gender && student.gender.toLowerCase() === 'male' ? 'male_default_avatar.png' : 'female_default_avatar.png'}" class="student-img" onerror="console.error('Default student image failed to load:', this.src); this.outerHTML='<div style=\'width:100%;height:100%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;\'><svg viewBox=\'0 0 100 100\' width=\'100%\' height=\'100%\'><circle cx=\'50\' cy=\'40\' r=\'20\' fill=\'#94a3b8\'/><path d=\'M30,70 Q50,90 70,70 Q65,85 50,85 Q35,85 30,70\' fill=\'#94a3b8\'/></svg></div>'" onload="console.log('Default student image loaded successfully:', this.src);">`
      }
                    </div>
                  </div>`
      : ""
    }

                <!-- Student Info Table -->
                <table class="student-info-table" style="flex: 1; font-size: 8pt;">
                <tr>
                    <td class="info-label">Student Name:</td>
                    <td class="info-val">${student.name || ""}</td>
                    <td class="info-label">Gender:</td>
                    <td class="info-val">${student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1).toLowerCase() : ""}</td>
                </tr>
                <tr>
                    <td class="info-label">Class:</td>
                    <td class="info-val">${student.class_name || ""}</td>
                    <td class="info-label">Admission No:</td>
                    <td class="info-val">${student.admission_number || ""}</td>
                </tr>

                <tr>
                    <td class="info-label">Overall Grade:</td>
                    <td class="info-val"><span class="badge badge-${overallGrade}">${overallGrade}</span> <span style="font-weight:400;">(${overallPercentage.toFixed(
      1
    )}%)</span></td>
                    <td class="info-label">${displaySettings.show_position ? "Position:" : "Total Score:"}</td>
                    <td class="info-val">
                      ${displaySettings.show_position
      ? `${formatPosition(position)} <span style="font-size:5.5pt; color:#64748b;">of ${total_students}</span>`
      : `${Math.round(overall_total)} <span style="font-size:5.5pt; color:#64748b;">/ ${overall_max}</span>`
    }
                    </td>
                </tr>
            </table>
            </div>

            <!-- Term Bar -->
            <div class="term-grid">
                <div class="term-col">
                    <div class="term-head">Session</div>
                    <div class="term-data">${term.session || "-"}</div>
                </div>
                <div class="term-col">
                    <div class="term-head">Term</div>
                    <div class="term-data">${term.name || "-"}</div>
                </div>
                <div class="term-col">
                    <div class="term-head">Term Begin</div>
                    <div class="term-data">${term.start_date || "-"}</div>
                </div>
                <div class="term-col">
                    <div class="term-head">Term End</div>
                    <div class="term-data">${term.end_date || "-"}</div>
                </div>
                <div class="term-col">
                    <div class="term-head">Resumption</div>
                    <div class="term-data has-text-danger">${config && config.resumption_date ? calculateResumptionDate(null, config.resumption_date) : (term.end_date ? calculateResumptionDate(term.end_date) : "-")}</div>
                </div>
            </div>

            <!-- Academic Performance -->
            <div class="section-header">Academic Performance</div>
            <div style="flex: 0 1 auto; overflow: hidden;">
                <table class="perf-table">
                    <thead>
                        <tr>
                            <th class="col-sn">SN</th>
                            <th class="col-subject">SUBJECT</th>
                            ${assessments
      .map((code) => {
        const at = assessment_types.find(
          (a) => a.code === code
        );
        return `<th>${at ? formatAssessmentName(at.name || at.code) : formatAssessmentName(code).toUpperCase()}</th>`;
      })
      .join("")}
                            <th>TOTAL</th>
                            <th>GRADE</th>
                            <th>REMARK</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${subjectRows}
                        <tr style="background: linear-gradient(to right, #e0e7ff, #f8fafc); font-weight: bold; border-top: 2px solid #4338ca;">
                            <td colspan="2" style="text-align: right; padding-right: 5mm; color:#1e40af;">AVERAGE / TOTAL</td>
                            ${assessments.map(() => `<td></td>`).join("")}
                            <td class="text-center" style="background:#dbeafe; color:#1e3a8a;">${Math.round(overall_total)}</td>
                            <td class="text-center"><span class="badge badge-${overallGrade}">${overallGrade}</span></td>
                            <td class="text-center" style="font-style:italic; color:#4338ca;">Overall Performance</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Footer Section (Comments & Scale) -->
            <div class="footer-section">
                <!-- Comments -->
                <div class="comments-container">
                    <div class="comment-block">
                        <div class="comment-header">Class Teacher's Comment:</div>
                        <div class="comment-text">${getTeacherComment(overallGrade) || term.teacher_remarks || getDynamicTeacherComment(overallGrade)}</div>
                        <div class="signature-box">Signature & Date</div>
                    </div>
                    <div class="comment-block">
                        <div class="comment-header">Principal's Comment:</div>
                        <div class="comment-text">${getPrincipalComment(overallGrade) || term.principal_remarks || getDynamicPrincipalComment(overallGrade)}</div>
                        <div class="signature-box">Signature & Date</div>
                    </div>
                </div>

                <!-- Grading Scale -->
                <div class="grading-scale">
                    <h4>Grading Scale</h4>
                    ${(gradeScale && gradeScale.grade_ranges
      ? gradeScale.grade_ranges
      : [
        {
          grade: "A",
          min_score: 70,
          max_score: 100,
          remark: "Excellent",
        },
        {
          grade: "B",
          min_score: 60,
          max_score: 69,
          remark: "Very Good",
        },
        {
          grade: "C",
          min_score: 50,
          max_score: 59,
          remark: "Good",
        },
        {
          grade: "D",
          min_score: 45,
          max_score: 49,
          remark: "Fair",
        },
        {
          grade: "E",
          min_score: 40,
          max_score: 44,
          remark: "Pass",
        },
        {
          grade: "F",
          min_score: 0,
          max_score: 39,
          remark: "Fail",
        },
      ])
      .map((range) => {
        const color = getGradeColor(range.grade);
        return `<div><span class="scale-grade" style="background: ${color}">${range.grade}</span> (${range.min_score}-${range.max_score}%) ${range.remark}</div>`;
      })
      .join('')}
                </div>
                <div class="official-warning">
                    This report is issued by ${schoolObj.name || "the school"}. Any alteration renders this invalid.
                </div>
            </div>
        </div>
      </div>
    </body>
    </html>
    `;
}

// Helper function to get grade from percentage
function getSimpleGrade(percentage, gradeScale = null) {
  const score = Number(percentage);
  if (isNaN(score)) return "F";

  if (
    gradeScale &&
    gradeScale.grade_ranges &&
    gradeScale.grade_ranges.length > 0
  ) {
    // Sort ranges by min_score DESC to ensure we pick the highest matching range first
    // This handles cases where ranges might overlap or be unordered
    const sortedRanges = [...gradeScale.grade_ranges].sort(
      (a, b) => Number(b.min_score) - Number(a.min_score)
    );

    for (const range of sortedRanges) {
      const min = Number(range.min_score);
      const max = Number(range.max_score);
      if (score >= min && score <= max) {
        return range.grade;
      }
    }
  }

  // Default fallback (Standard Nigerian Scale)
  if (score >= 70) return "A";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 45) return "D";
  if (score >= 40) return "E";
  return "F";
}

// Helper function to get grade color
function getGradeColor(grade) {
  const colors = {
    A: "#10b981", // Emerald
    B: "#3b82f6", // Blue
    C: "#f59e0b", // Amber
    D: "#f97316", // Orange
    E: "#ef4444", // Red
    F: "#6b7280", // Gray
  };
  return colors[grade.toUpperCase()] || "#6b7280";
}

// Helper function to get remark based on grade
function getRemark(grade, gradeScale = null) {
  if (gradeScale && gradeScale.grade_ranges) {
    const range = gradeScale.grade_ranges.find((r) => r.grade === grade);
    if (range && range.remark) return range.remark;
  }

  const remarks = {
    A: "Excellent",
    B: "Very Good",
    C: "Good",
    D: "Fair",
    E: "Pass",
    F: "Fail",
  };
  return remarks[grade] || "";
}

// Helper function to get dynamic teacher comment based on grade
function getDynamicTeacherComment(grade) {
  const comments = {
    A: "Outstanding performance. Keep up the excellent work!",
    B: "Very good effort. Continue to strive for excellence.",
    C: "Satisfactory performance. There's room for improvement.",
    D: "Fair attempt. More effort is needed to improve.",
    E: "Minimal effort shown. Significant improvement required.",
    F: "Unsatisfactory performance. Immediate attention needed."
  };
  return comments[grade] || "Satisfactory progress shown.";
}

// Helper function to get dynamic principal comment based on grade
function getDynamicPrincipalComment(grade) {
  const comments = {
    A: "Exceptional academic achievement. Well done!",
    B: "Commendable performance. Continue to maintain excellent standards.",
    C: "Acceptable performance. Encouraged to aim higher.",
    D: "Below expectations. Improvement is essential.",
    E: "Poor performance. Remedial action required.",
    F: "Your performance is weak. Serious intervention is needed."
  };
  return comments[grade] || "A good result.";
}

// Helper function to get teacher comment (placeholder for future implementation)
function getTeacherComment(grade) {
  // This can be extended to use custom teacher comments if available
  return null; // Return null to fall back to dynamic comments
}

// Helper function to get principal comment (placeholder for future implementation)
function getPrincipalComment(grade) {
  // This can be extended to use custom principal comments if available
  return null; // Return null to fall back to dynamic comments
}

// Function to preload images before PDF generation
async function preloadImagesForPDF(element) {
  const images = element.getElementsByTagName("img");
  const imagePromises = [];

  console.log(`Found ${images.length} images to preload`);

  for (let img of images) {
    // Set crossorigin attribute for all images
    img.setAttribute("crossorigin", "anonymous");

    // Create a promise for each image
    const imgPromise = new Promise((resolve, reject) => {
      if (img.complete) {
        console.log("Image already loaded:", img.src);
        resolve();
      } else {
        // Set up load and error handlers
        img.onload = () => {
          console.log("Image loaded successfully:", img.src);
          resolve();
        };
        img.onerror = () => {
          console.error("Image failed to load:", img.src);
          // Create a fallback canvas image
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 100;
          canvas.height = img.height || 100;
          const ctx = canvas.getContext('2d');

          // Draw a placeholder with gradient background
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, '#f0f0f0');
          gradient.addColorStop(1, '#e0e0e0');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw a border
          ctx.strokeStyle = '#ccc';
          ctx.lineWidth = 1;
          ctx.strokeRect(0, 0, canvas.width, canvas.height);

          // Draw a generic icon
          ctx.fillStyle = '#999';
          ctx.font = Math.max(12, Math.min(20, canvas.width / 5)) + 'px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('IMG', canvas.width / 2, canvas.height / 2);

          // Convert to data URL and set as source
          img.src = canvas.toDataURL('image/png');
          resolve();
        };

        // If the image hasn't loaded yet, trigger loading
        if (!img.src) {
          resolve(); // Skip if no src
        }
      }
    });

    imagePromises.push(imgPromise);
  }

  // Wait for all images to load
  if (imagePromises.length > 0) {
    console.log("Waiting for all images to load...");
    await Promise.all(imagePromises);
    console.log("All images loaded or handled");
  } else {
    console.log("No images found to preload");
  }
}

async function generateClientSidePDF(reportData, previewMode = false) {
  try {
    console.log("Starting PDF generation with data:", reportData);

    // Dynamically load html2pdf.js - try CDN first, then fall back to local
    console.log(
      "Checking if html2pdf is already loaded:",
      typeof html2pdf !== "undefined"
    );
    if (typeof html2pdf === "undefined") {
      // Try loading from CDN first
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.type = "text/javascript";
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.integrity = "sha512-GsLlZN/3F2ErC5ifS5QtgpiJtWd43JWSuIgh7mbzZ8zBps+dvLusV+eNQATqgA/HdeKFVgA5v3S/cIrLF7QnIg==";
          script.crossOrigin = "anonymous";

          script.onload = () => {
            console.log("html2pdf.js loaded successfully from CDN");
            // Verify the library is properly loaded
            if (typeof html2pdf !== "undefined") {
              console.log("html2pdf library verified from CDN");
              resolve();
            } else {
              console.error("html2pdf library not properly loaded from CDN");
              reject(new Error("Library not properly loaded from CDN"));
            }
          };

          script.onerror = (error) => {
            console.error("html2pdf.js failed to load from CDN:", error);
            console.log("CDN failed, trying local file");
            // If CDN fails, try local file as fallback
            const localScript = document.createElement("script");
            localScript.type = "text/javascript";
            localScript.src = "/static/js/html2pdf/html2pdf.bundle.min.js";

            localScript.onload = () => {
              console.log("Local html2pdf.js loaded successfully");
              // Verify the library is properly loaded
              if (typeof html2pdf !== "undefined") {
                console.log("html2pdf library verified from local");
                resolve();
              } else {
                console.error("html2pdf library not properly loaded from local");
                reject(new Error("Library not properly loaded from local"));
              }
            };

            localScript.onerror = (localError) => {
              console.error("Local html2pdf.js also failed:", localError);
              reject(new Error("Failed to load library from both CDN and local"));
            };
            document.head.appendChild(localScript);
          };
          document.head.appendChild(script);
        });
      } catch (loadError) {
        console.error("Failed to load html2pdf.js:", loadError);
        throw new Error(
          "Failed to load PDF generation library: " + loadError.message
        );
      }
    }

    // Verify html2pdf is available
    if (typeof html2pdf === "undefined") {
      throw new Error("html2pdf library is not available");
    }

    // Additional verification
    console.log("html2pdf object type:", typeof html2pdf);
    console.log("html2pdf function keys:", Object.keys(html2pdf || {}));

    // Test if we can create a basic worker
    try {
      const testWorker = html2pdf();
      console.log("Basic worker creation test passed:", typeof testWorker);
      // Clean up
      if (testWorker && typeof testWorker.cleanup === "function") {
        testWorker.cleanup();
      }
    } catch (testError) {
      console.error("Basic worker creation test failed:", testError);
    }

    console.log("html2pdf library is ready for use");

    // Generate HTML content for the report
    console.log("Generating HTML content");
    let html;
    try {
      html = generateReportHTML(reportData);
      console.log("Generated HTML length:", html.length);

      // Debug: Show the first 500 characters of the HTML
      console.log("HTML preview:", html.substring(0, 500));

      // Check if HTML is valid
      if (!html || html.length === 0) {
        throw new Error("Generated HTML is empty");
      }

      // Check if HTML contains basic structure - relaxed check
      if (!html.includes("<html") || !html.includes("<body")) {
        console.error("HTML structure appears to be invalid");
        throw new Error("Generated HTML structure is invalid");
      }

      // Additional validation: Check for common HTML issues
      if (html.includes("undefined") || html.includes("null")) {
        console.warn(
          "HTML contains undefined/null values, this might cause rendering issues"
        );
      }

      // Make sure the HTML has a proper DOCTYPE
      if (!html.trim().startsWith("<!DOCTYPE html>")) {
        console.warn("HTML might be missing proper DOCTYPE declaration");
      }

      // Check for balanced HTML tags
      const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
      const tags = html.match(tagPattern) || [];
      console.log("HTML tags found:", tags.length);
    } catch (htmlError) {
      console.error("Error generating HTML:", htmlError);
      // Generate a simple fallback HTML
      html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Student Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .error { color: red; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h1>Student Report</h1>
                    <div class="error">Error generating report: ${htmlError.message}</div>
                    <p>Please try again or contact support.</p>
                </body>
                </html>
            `;
      console.log("Using fallback HTML due to error");
    }

    // Create a temporary element to hold the HTML
    const element = document.createElement("div");

    // Set styles to make content visible during PDF generation
    element.style.position = "relative"; // Changed from absolute to relative
    element.style.left = "0"; // Changed from -9999px to 0
    element.style.top = "0";
    element.style.backgroundColor = "white"; // Changed from red to white
    element.style.zIndex = "9999"; // Ensure it's on top
    element.style.width = "816px"; // A4 width in pixels at 96 DPI
    element.style.height = "auto";
    element.style.maxHeight = "none";
    // Preserve default margins to allow PDF margins to work properly
    element.id = "pdf-generation-temp-element";

    // Add to body but make sure it's visible
    document.body.appendChild(element);

    // Set the HTML content after appending to DOM
    element.innerHTML = html;

    // Preload all images before PDF generation to ensure they're available to html2canvas
    await preloadImagesForPDF(element);

    // Debug: Check if HTML was parsed correctly
    console.log("Parsed HTML element after setting innerHTML:", element);
    console.log(
      "Parsed HTML children count after setting innerHTML:",
      element.children.length
    );
    console.log("Element innerHTML length:", element.innerHTML.length);

    // Debug: Verify element was added to DOM
    console.log(
      "Element added to DOM:",
      document.getElementById("pdf-generation-temp-element") === element
    );

    // Check if html2pdf is properly loaded
    console.log("html2pdf object:", html2pdf);
    console.log(
      "html2pdf().set method exists:",
      typeof html2pdf().set === "function"
    );

    // Configure html2pdf options with better error handling
    const opt = {
      margin: [0.15, 0.15, 0.15, 0.15], // Reduced margins to prevent empty pages while maintaining appearance
      filename: `report_${(reportData.student?.name || "student").replace(
        /\s+/g,
        "_"
      )}_${(reportData.term?.name || "term").replace(/\s+/g, "_")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false, // Reduced logging to prevent potential issues
        allowTaint: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        width: 816, // A4 width in pixels at 96 DPI
        height: 1056, // A4 height in pixels at 96 DPI
        windowHeight: document.getElementById("pdf-generation-temp-element")?.scrollHeight || 1056, // A4 height in pixels
        onclone: (clonedDoc) => {
          console.log("Cloning document for html2canvas");

          // Force single page layout
          const clonedElement = clonedDoc.getElementById("pdf-generation-temp-element");
          if (clonedElement) {
            clonedElement.style.height = "auto";
            clonedElement.style.maxHeight = "none";
            clonedElement.style.overflow = "visible";
            clonedElement.style.width = "816px"; // Set specific width to match PDF dimensions
            // Preserve default margins for proper PDF layout
            // Ensure body doesn't create extra space but preserve margins
            const body = clonedDoc.body;
            body.style.height = "auto";
            body.style.maxHeight = "none";
            body.style.overflow = "visible";
            // Keep default body margins to allow PDF margins to work
          }

          // Enhanced image handling for cross-origin images
          const images = clonedDoc.getElementsByTagName("img");
          for (let img of images) {
            // Set crossorigin attribute for all images
            img.setAttribute("crossorigin", "anonymous");

            // Add error handling for images that fail to load
            img.onerror = function () {
              console.log("Image load error, using placeholder", this.src);
              // Create a fallback image with the same dimensions
              const canvas = document.createElement('canvas');
              canvas.width = this.width || 100;
              canvas.height = this.height || 100;
              const ctx = canvas.getContext('2d');

              // Draw a placeholder with gradient background
              const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
              gradient.addColorStop(0, '#f0f0f0');
              gradient.addColorStop(1, '#e0e0e0');
              ctx.fillStyle = gradient;
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // Draw a border
              ctx.strokeStyle = '#ccc';
              ctx.lineWidth = 1;
              ctx.strokeRect(0, 0, canvas.width, canvas.height);

              // Draw a generic icon
              ctx.fillStyle = '#999';
              ctx.font = Math.max(12, Math.min(20, canvas.width / 5)) + 'px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('?', canvas.width / 2, canvas.height / 2);

              // Convert to data URL and set as source
              this.src = canvas.toDataURL('image/png');
            };

            // Preload images to ensure they're ready for canvas
            if (img.src && !img.complete) {
              console.log("Preloading image for PDF generation", img.src);
              // Trigger a new image load to ensure it's cached
              const imgCopy = new Image();
              imgCopy.crossOrigin = "anonymous";
              imgCopy.src = img.src;
            }
          }
        },
      },
      pagebreak: {
        mode: ["css"], // Use CSS for page breaks instead of avoid-all
        before: [],
        after: [],
        avoid: ["tr", "th", "td", "img", "table", "#report-card", ".main-container"]
      },
      jsPDF: {
        unit: "in",
        format: "a4",
        orientation: "portrait",
        compress: true,
        putOnlyUsedFonts: true
      }
    };

    // Validate options
    console.log("PDF options:", opt);
    if (!opt.filename || opt.filename.length === 0) {
      console.warn("PDF filename is empty or invalid");
      opt.filename = "report.pdf";
    }

    // Additional filename validation
    if (opt.filename && opt.filename.includes("../")) {
      console.warn(
        "PDF filename contains potentially unsafe path traversal sequences, sanitizing"
      );
      opt.filename = opt.filename.replace(/\.\./g, "");
    }

    // Ensure filename ends with .pdf
    if (opt.filename && !opt.filename.toLowerCase().endsWith(".pdf")) {
      opt.filename += ".pdf";
    }

    console.log("Final PDF filename:", opt.filename);

    // Measure content height before PDF generation
    const contentHeight = element.scrollHeight;
    const a4HeightPx = 297 * 3.7795275591; // A4 height in pixels at 96 DPI

    if (contentHeight > a4HeightPx) {
      console.warn(`Content height (${contentHeight}px) exceeds A4 page (${a4HeightPx}px)`);
      console.warn("Consider reducing font sizes or adjusting layout");
    }

    console.log("Starting PDF generation");
    // Generate and download the PDF
    console.log("Creating html2pdf instance");
    const worker = html2pdf().set(opt);
    console.log("Worker created:", worker);

    // Validate worker
    if (!worker || typeof worker !== "object") {
      throw new Error("Failed to create html2pdf worker");
    }

    console.log("Calling from() method");
    const workerWithElement = worker.from(element);
    console.log("Element added to worker:", workerWithElement);

    // Validate worker with element
    if (!workerWithElement || typeof workerWithElement !== "object") {
      throw new Error("Failed to add element to html2pdf worker");
    }

    console.log("Calling save() method");
    // Add error handling and timeout to prevent hanging
    try {
      console.log("Starting PDF save operation");
      const savePromise = workerWithElement.save();

      let timeoutId;

      // Add additional logging during save
      savePromise
        .then(() => {
          console.log("PDF save promise resolved");
          if (timeoutId) clearTimeout(timeoutId);
        })
        .catch((error) => {
          console.error("PDF save promise rejected:", error);
          if (timeoutId) clearTimeout(timeoutId);
        });

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          console.error("PDF generation timed out after 30 seconds");
          reject(new Error("PDF generation timed out after 30 seconds"));
        }, 30000);
      });

      console.log("Waiting for PDF generation to complete");
      await Promise.race([savePromise, timeoutPromise]);
      console.log("PDF generation completed successfully");
    } catch (saveError) {
      console.error("Error during PDF save operation:", saveError);
      console.error("Save error stack:", saveError.stack);
      throw new Error(
        "Failed to save PDF: " + (saveError.message || "Unknown error")
      );
    }
    console.log("PDF generation completed");

    // Clean up
    console.log("Cleaning up temporary element");
    try {
      // Use the element reference directly instead of querying by ID
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
        console.log("Temporary element removed from DOM");
      } else {
        console.log(
          "Temporary element was not found in DOM or already removed"
        );
      }
    } catch (cleanupError) {
      console.error("Error during cleanup:", cleanupError);
    }
    console.log("Cleaned up temporary element");
  } catch (error) {
    console.error("Error generating PDF:", error);
    console.error("Error stack:", error.stack);
    // Show user-friendly error message
    alert(
      "Failed to generate PDF. Please check the browser console for details."
    );
    throw new Error(
      "Failed to generate PDF: " + (error.message || "Unknown error")
    );
  }
}

// Test function for preview functionality
window.testPreviewFunctionality = async function () {
  console.log("Testing preview functionality...");

  // Check if required functions are available
  const requiredFunctions = [
    "showCanvasBasedPreview",
    "previewReport",
    "generateReportHTML",
    "showAlert",
  ];

  const missingFunctions = [];

  requiredFunctions.forEach((func) => {
    if (typeof window[func] === "undefined") {
      missingFunctions.push(func);
    }
  });

  if (missingFunctions.length > 0) {
    console.error("Missing functions:", missingFunctions);
    return false;
  }

  console.log("All required functions are available");
  return true;
};
