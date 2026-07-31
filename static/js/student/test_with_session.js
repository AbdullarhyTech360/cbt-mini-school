document.addEventListener("DOMContentLoaded", function () {

  // Global variables
  let questions = [];
  let currentQuestionIndex = 0;
  let studentAnswers = {};
  let flaggedQuestions = new Set();
  let timeLeft = 0;
  let timerInterval = null;
  let autoSaveInterval = null;
  let hasRestoredSession = false;

  function onBeforeUnload(e) {
    saveProgress();
    e.preventDefault();
    e.returnValue = "";
  }

  // DOM elements
  const loadingMessage = document.getElementById("loading-message");
  const questionContent = document.getElementById("question-content");
  const questionText = document.getElementById("question-text");
  const answerOptions = document.getElementById("answer-options");
  const currentQuestionSpan = document.getElementById("current-question");
  const totalQuestionsSpan = document.getElementById("total-questions");
  const progressBar = document.getElementById("progress-bar");
  const prevBtn = document.getElementById("prev-question-btn");
  const nextBtn = document.getElementById("next-question-btn");
  const submitBtn = document.getElementById("submit-quiz-btn");
  const questionNavigation = document.getElementById("question-navigation");
  const mobileQuestionNavigation = document.getElementById(
    "mobile-question-navigation"
  );
  const answeredCountSpan = document.getElementById("answered-count");
  const flaggedCountSpan = document.getElementById("flagged-count");
  const questionNumberSpan = document.getElementById("question-number");
  const flagQuestionBtn = document.getElementById("flag-question-btn");
  const flagLabel = document.getElementById("flag-label");

  // Mobile navigation
  const mobileNavToggle = document.getElementById("mobile-nav-toggle");
  const mobileNavModal = document.getElementById("mobile-nav-modal");
  const closeMobileNav = document.getElementById("close-mobile-nav");

  // Get exam ID from the URL path
  const pathParts = window.location.pathname.split("/");
  const examId = pathParts[pathParts.length - 2];
  const isOnTheGo = examData && examData.isOnTheGo;
  const apiBasePath = isOnTheGo ? '/api/student/on-the-go-tests' : '/student/exam';
  const redirectBasePath = isOnTheGo ? '/student/on-the-go-tests' : '/student/exam';

  // Initialize the test
  initTest();

  // Mobile navigation handlers
  if (mobileNavToggle) {
    mobileNavToggle.addEventListener("click", () => {
      mobileNavModal.classList.remove("hidden");
    });
  }

  if (closeMobileNav) {
    closeMobileNav.addEventListener("click", () => {
      mobileNavModal.classList.add("hidden");
    });
  }

  if (mobileNavModal) {
    mobileNavModal.addEventListener("click", (e) => {
      if (e.target === mobileNavModal) {
        mobileNavModal.classList.add("hidden");
      }
    });
  }

  // Keyboard shortcuts
  document.addEventListener("keydown", function (e) {
    // Ignore if user is typing in an input field
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
      return;
    }

    const key = e.key.toLowerCase();

    // N for next question
    if (key === "n" && currentQuestionIndex < questions.length - 1) {
      e.preventDefault();
      showNextQuestion();
    }

    // P for previous question
    if (key === "p" && currentQuestionIndex > 0) {
      e.preventDefault();
      showPreviousQuestion();
    }

    // A, B, C, D for selecting options
    if (["a", "b", "c", "d"].includes(key)) {
      e.preventDefault();
      const optionIndex = key.charCodeAt(0) - 97; // Convert a=0, b=1, c=2, d=3
      selectOptionByIndex(optionIndex);
    }

    // F for flagging question
    if (key === "f") {
      e.preventDefault();
      toggleFlag();
    }
  });

  // Initialize the test
  async function initTest() {
    if (!examId) {
      loadingMessage.innerHTML = `<p class="text-red-500">Error: Exam ID not found in URL.</p>`;
      return;
    }

    // Set time from exam duration
    if (typeof examDurationSeconds !== "undefined" && examDurationSeconds > 0) {
      timeLeft = examDurationSeconds;
    } else {
      timeLeft = 25 * 60;
    }

    // Try to restore previous session first
    await checkForExistingSession();

    // If no session was restored, fetch questions normally
    if (!hasRestoredSession) {
      await fetchQuestions();
    }

    startTimer();
    startAutoSave();

    // Add event listeners
    prevBtn.addEventListener("click", function (e) {
      if (currentQuestionIndex > 0) {
        showPreviousQuestion();
      }
    });

    nextBtn.addEventListener("click", function (e) {
      if (currentQuestionIndex < questions.length - 1) {
        showNextQuestion();
      }
    });

    submitBtn.addEventListener("click", submitQuiz);

    // Flag question button
    if (flagQuestionBtn) {
      flagQuestionBtn.addEventListener("click", toggleFlag);
    }

    // Save progress and warn before page unload
    window.addEventListener("beforeunload", onBeforeUnload);
  }

  // Select option by index (for keyboard shortcuts)
  function selectOptionByIndex(index) {
    const question = questions[currentQuestionIndex];
    if (!question || !question.options || index >= question.options.length) {
      return;
    }

    const option = question.options[index];
    studentAnswers[question.id] = option.id;

    // Update UI
    displayQuestion(currentQuestionIndex);
    saveProgress();
  }

  // Toggle flag on current question
  function toggleFlag() {
    const question = questions[currentQuestionIndex];
    if (!question) return;

    if (flaggedQuestions.has(question.id)) {
      flaggedQuestions.delete(question.id);
    } else {
      flaggedQuestions.add(question.id);
    }

    updateFlagButton();
    updateQuestionNavigation();
    updateFlaggedCount();
    saveProgress();
  }

  // Update the flag button appearance
  function updateFlagButton() {
    if (!flagQuestionBtn) return;
    const question = questions[currentQuestionIndex];
    if (!question) return;

    const isFlagged = flaggedQuestions.has(question.id);
    flagQuestionBtn.classList.toggle("border-amber-400", isFlagged);
    flagQuestionBtn.classList.toggle("text-amber-500", isFlagged);
    flagQuestionBtn.classList.toggle("bg-amber-50", isFlagged);
    flagQuestionBtn.classList.toggle("dark:bg-amber-900/30", isFlagged);
    flagQuestionBtn.classList.toggle("dark:border-amber-500", isFlagged);
    flagQuestionBtn.classList.toggle("dark:text-amber-400", isFlagged);
    flagQuestionBtn.classList.toggle("border-gray-200", !isFlagged);
    flagQuestionBtn.classList.toggle("text-gray-400", !isFlagged);
    flagQuestionBtn.classList.toggle("dark:border-slate-600", !isFlagged);
    flagQuestionBtn.classList.toggle("dark:text-gray-400", !isFlagged);
    flagQuestionBtn.setAttribute("aria-pressed", String(isFlagged));

    if (flagLabel) {
      flagLabel.textContent = isFlagged ? "Flagged" : "Flag";
    }
  }

  // Update flagged count display
  function updateFlaggedCount() {
    if (flaggedCountSpan) {
      flaggedCountSpan.textContent = flaggedQuestions.size;
    }
  }

  // Check for existing session
  async function checkForExistingSession() {
    try {
      const response = await fetch(`${apiBasePath}/${examId}/session/restore`);
      const data = await response.json();

      if (data.success && data.has_session) {
        const shouldResume = await showResumeModal(data.session);

        if (shouldResume) {
          await restoreSession(data.session);
          hasRestoredSession = true;
        } else {
          // User chose "Start Fresh" - invalidate the stale session
          // so saveProgress creates a new one with a fresh started_at
          try {
            await fetch(`${apiBasePath}/${examId}/session/reset`, {
              method: "POST",
            });
          } catch (_) {}
        }
      }
    } catch (error) {
      console.error("Error checking for existing session:", error);
    }
  }

  // Show resume modal
  function showResumeModal(sessionData) {
    return new Promise((resolve) => {
      const answeredCount = Object.keys(sessionData.answers).length;
      const timeRemaining = Math.floor(sessionData.time_remaining / 60);

      showConfirmModal({
        title: "Resume Previous Session?",
        message: `We found a previous session for this exam. You had answered ${answeredCount} questions with ${timeRemaining} minutes remaining. Would you like to continue where you left off?`,
        confirmText: "Resume Session",
        cancelText: "Start Fresh",
        confirmClass:
          "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
        onConfirm: function () {
          resolve(true);
        },
        onCancel: function () {
          resolve(false);
        },
      });
    });
  }

  // Restore session
  async function restoreSession(sessionData) {
    try {
      await fetchQuestions();

      if (sessionData.question_order && sessionData.question_order.length > 0) {
        const orderedQuestions = [];
        for (const questionId of sessionData.question_order) {
          const question = questions.find((q) => q.id === questionId);
          if (question) {
            orderedQuestions.push(question);
          }
        }
        if (orderedQuestions.length === questions.length) {
          questions = orderedQuestions;
        }
      }

      studentAnswers = sessionData.answers || {};
      flaggedQuestions = new Set(sessionData.flagged_questions || []);
      timeLeft = sessionData.time_remaining;
      currentQuestionIndex = sessionData.current_question_index || 0;

      displayQuestion(currentQuestionIndex);
      updateFlaggedCount();
      showToast("Session restored successfully!", "success");
    } catch (error) {
      console.error("Error restoring session:", error);
      showToast("Error restoring session. Starting fresh.", "error");
    }
  }

  // Fetch questions from the API
  async function fetchQuestions() {
    try {
      const response = await fetch(`${apiBasePath}/${examId}/questions`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        questions = data.questions;
        totalQuestionsSpan.textContent = questions.length;

        // Update sidebar total questions
        const sidebarTotal = document.getElementById("sidebar-total-questions");
        if (sidebarTotal) {
          sidebarTotal.textContent = questions.length;
        }

        if (!hasRestoredSession) {
          studentAnswers = {};
        }

        loadingMessage.classList.add("hidden");
        questionContent.classList.remove("hidden");

        createQuestionNavigation();

        if (questions.length > 0) {
          displayQuestion(currentQuestionIndex);
        } else {
          questionText.textContent = "No questions available for this exam.";
          answerOptions.innerHTML = "";
        }
      } else {
        loadingMessage.innerHTML = `<p class="text-red-500">Error loading questions: ${data.message}</p>`;
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      loadingMessage.innerHTML = `<p class="text-red-500">Error loading questions. Please try again.</p>`;
    }
  }

  // Display a question
  function displayQuestion(index) {
    if (index < 0 || index >= questions.length) return;

    const question = questions[index];
    currentQuestionIndex = index;

    // Update question text (sanitize to prevent XSS)
    questionText.innerHTML = typeof DOMPurify !== "undefined"
      ? DOMPurify.sanitize(question.question_text, { ADD_TAGS: ["mjx-container"], ADD_ATTR: ["class", "type", "style"] })
      : question.question_text;

    // Update question number
    if (questionNumberSpan) {
      questionNumberSpan.textContent = index + 1;
    }

    // Add question image if present
    if (question.question_image) {
      const imageContainer = document.createElement("div");
      imageContainer.className = "mt-4 mb-4";
      const img = document.createElement("img");
      var src = question.question_image;
      if (src.indexOf("javascript:") === -1 && src.indexOf("data:") !== 0) {
        img.setAttribute("src", src);
      }
      img.className = "max-w-full h-auto rounded-xl shadow-lg";
      img.setAttribute("alt", "Question image");
      imageContainer.appendChild(img);
      questionText.appendChild(imageContainer);
    }

    // Update current question number
    currentQuestionSpan.textContent = index + 1;

    // Update progress bar
    const progress = ((index + 1) / questions.length) * 100;
    progressBar.style.width = `${progress}%`;

    // Update answered count
    if (answeredCountSpan) {
      answeredCountSpan.textContent = Object.keys(studentAnswers).length;
    }

    // Update flag button state
    updateFlagButton();

    // Clear previous options
    answerOptions.innerHTML = "";

    // Add options with keyboard hints
    const optionLabels = ["A", "B", "C", "D"];
    question.options.forEach((option, idx) => {

      const optionElement = document.createElement("label");
      const isSelected = studentAnswers[question.id] === option.id;

      optionElement.className = `option-label flex items-start gap-3 rounded-lg border-2 p-4 ${
        isSelected ? "selected" : "border-gray-200 dark:border-slate-600"
      }`;

      // Create the option structure using DOM methods for better handling
      const optionContainer = document.createElement("div");
      optionContainer.className = "flex items-center gap-3 flex-1";

      // Letter badge
      const badge = document.createElement("div");
      badge.className = "flex-shrink-0";
      badge.innerHTML = `<div class="w-10 h-10 rounded-lg font-bold flex items-center justify-center ${
        isSelected
          ? "bg-white/90 text-blue-600 shadow-sm"
          : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
      }">${optionLabels[idx]}</div>`;

      // Radio input
      const radioInput = document.createElement("input");
      radioInput.type = "radio";
      radioInput.name = "quiz-option";
      radioInput.value = option.id;
      radioInput.className = "hidden";
      if (isSelected) radioInput.checked = true;

      // Text container
      const textContainer = document.createElement("div");
      textContainer.className = "flex-1";

      const textPara = document.createElement("p");
      textPara.className = `text-base option-text ${
        isSelected
          ? "text-white font-semibold"
          : "text-gray-900 dark:text-gray-100 font-medium"
      }`;
      textPara.innerHTML = typeof DOMPurify !== "undefined"
        ? DOMPurify.sanitize(option.text || "", { ADD_TAGS: ["mjx-container"], ADD_ATTR: ["class", "type", "style"] })
        : option.text || "";

      textContainer.appendChild(textPara);

      // Add image if present
      if (option.option_image) {
        const img = document.createElement("img");
        img.src = option.option_image;
        img.alt = "Option image";
        img.className = "mt-2 max-w-md h-auto rounded-lg shadow";
        textContainer.appendChild(img);
      }

      // Keyboard shortcut badge
      const kbd = document.createElement("kbd");
      kbd.className = `px-2 py-1 rounded text-xs font-bold border ${
        isSelected
          ? "bg-white/20 text-white border-white/40"
          : "bg-gray-100 text-gray-700 border-gray-300 dark:bg-slate-700 dark:text-gray-200 dark:border-slate-600"
      }`;
      kbd.textContent = optionLabels[idx];

      // Assemble the option
      optionContainer.appendChild(badge);
      optionContainer.appendChild(radioInput);
      optionContainer.appendChild(textContainer);
      optionContainer.appendChild(kbd);

      optionElement.appendChild(optionContainer);

      optionElement.addEventListener("click", function () {
        studentAnswers[question.id] = option.id;
        displayQuestion(index);
        saveProgress();
      });

      answerOptions.appendChild(optionElement);
    });

    // Update navigation button states
    prevBtn.disabled = index === 0;
    prevBtn.classList.toggle("opacity-50", index === 0);
    prevBtn.classList.toggle("cursor-not-allowed", index === 0);

    nextBtn.disabled = index === questions.length - 1;
    nextBtn.classList.toggle("opacity-50", index === questions.length - 1);
    nextBtn.classList.toggle(
      "cursor-not-allowed",
      index === questions.length - 1
    );

    updateQuestionNavigation();

    // Render all MathJax content after DOM is updated
    renderMath();
  }

  // Helper function to render MathJax
  function renderMath() {
    if (typeof MathJax !== "undefined") {
      if (MathJax.typesetPromise) {
        MathJax.typesetPromise([questionContent]).catch(function () {});
      } else if (MathJax.typeset) {
        try {
          MathJax.typeset([questionContent]);
        } catch (e) {}
      }
    } else {
      setTimeout(renderMath, 100);
    }
  }

  // Create question navigation buttons
  function createQuestionNavigation() {
    const navContainers = [questionNavigation, mobileQuestionNavigation].filter(
      (el) => el
    );

    navContainers.forEach((container) => {
      container.innerHTML = "";

      questions.forEach((question, index) => {
        const button = document.createElement("button");
        button.className =
          "question-nav-btn w-10 h-10 rounded font-bold text-sm";
        button.textContent = index + 1;
        button.dataset.index = index;
        button.title = `Jump to question ${index + 1}`;
        button.setAttribute("aria-label", `Question ${index + 1}`);

        button.addEventListener("click", function () {
          displayQuestion(parseInt(this.dataset.index));
          if (mobileNavModal) {
            mobileNavModal.classList.add("hidden");
          }
        });

        container.appendChild(button);
      });
    });
  }

  // Update question navigation buttons
  function updateQuestionNavigation() {
    const navContainers = [questionNavigation, mobileQuestionNavigation].filter(
      (el) => el
    );

    navContainers.forEach((container) => {
      const buttons = container.querySelectorAll("button");
      buttons.forEach((button, index) => {
        const question = questions[index];
        button.className =
          "question-nav-btn w-10 h-10 rounded font-bold text-sm";

        if (index === currentQuestionIndex) {
          button.classList.add("current");
        } else if (flaggedQuestions.has(question.id)) {
          button.classList.add("flagged");
        } else if (studentAnswers[question.id]) {
          button.classList.add("answered");
        } else {
          button.classList.add("unanswered");
        }
      });
    });
  }

  // Show previous question
  function showPreviousQuestion() {
    if (currentQuestionIndex > 0) {
      displayQuestion(currentQuestionIndex - 1);
    }
  }

  // Show next question
  function showNextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
      displayQuestion(currentQuestionIndex + 1);
    }
  }

  // Save progress to server
  async function saveProgress() {
    try {
      const questionOrder = questions.map((q) => q.id);

      const response = await fetch(`${apiBasePath}/${examId}/session/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_question_index: currentQuestionIndex,
          time_remaining: timeLeft,
          answers: studentAnswers,
          question_order: questionOrder,
          flagged_questions: Array.from(flaggedQuestions),
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSaveIndicator();
      }
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  }

  // Show save indicator
  function showSaveIndicator() {
    let indicator = document.getElementById("save-indicator");
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.id = "save-indicator";
      indicator.className =
        "fixed bottom-6 left-6 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm opacity-0 transition-opacity duration-300 z-50";
      indicator.innerHTML =
        '<span class="material-symbols-outlined text-sm inline-block mr-1">check_circle</span> Saved';
      document.body.appendChild(indicator);
    }

    indicator.classList.remove("opacity-0");
    indicator.classList.add("opacity-100");

    setTimeout(() => {
      indicator.classList.remove("opacity-100");
      indicator.classList.add("opacity-0");
    }, 2000);
  }

  // Start auto-save
  function startAutoSave() {
    autoSaveInterval = setInterval(() => {
      saveProgress();
    }, 30000);
  }

  // Submit quiz
  function submitQuiz() {
    const answeredCount = Object.keys(studentAnswers).length;
    const unansweredCount = questions.length - answeredCount;

    if (unansweredCount > 0) {
      showConfirmModal({
        title: "Unanswered Questions",
        message: `You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`,
        confirmText: "Submit Anyway",
        cancelText: "Continue Quiz",
        confirmClass:
          "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
        onConfirm: function () {
          sendQuizAnswers();
        },
        onCancel: function () {
          // Do nothing
        },
      });
    } else {
      showConfirmModal({
        title: "Submit Exam",
        message:
          "Are you sure you want to submit your exam? You cannot change your answers after submission.",
        confirmText: "Submit Exam",
        cancelText: "Cancel",
        onConfirm: function () {
          sendQuizAnswers();
        },
        onCancel: function () {
          // Do nothing
        },
      });
    }
  }

  // Show detailed feedback for On-The-Go tests
  function showOtgFeedback(result) {
    clearInterval(timerInterval);
    clearInterval(autoSaveInterval);
    const container = document.querySelector(".test-container") || document.body;

    let questionsHtml = "";
    if (result.question_results && result.question_results.length > 0) {
      const qMap = {};
      questions.forEach(function (q) { qMap[q.id] = q; });

      result.question_results.forEach(function (qr, i) {
        const q = qMap[qr.question_id];
        const userAnswerText = qr.user_answer
          ? (q ? (q.options.find(function (o) { return o.id === qr.user_answer; }) || {}).text || qr.user_answer : "No answer")
          : "No answer";
        const correctAnswerText = qr.correct_answer_id
          ? (q ? (q.options.find(function (o) { return o.id === qr.correct_answer_id; }) || {}).text || qr.correct_answer_id : "N/A")
          : "N/A";
        questionsHtml += `
          <div class="border rounded-lg p-4 ${qr.is_correct ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}">
            <div class="flex items-start gap-3">
              <span class="material-symbols-outlined mt-0.5 ${qr.is_correct ? 'text-green-600' : 'text-red-600'}">${qr.is_correct ? 'check_circle' : 'cancel'}</span>
              <div class="flex-1">
                <p class="font-medium text-gray-900 mb-2">${i + 1}. ${q ? q.question_text : "Question"}</p>
                <p class="text-sm"><span class="text-gray-500">Your answer:</span> <span class="${qr.is_correct ? 'text-green-700' : 'text-red-700'}">${userAnswerText}</span></p>
                ${!qr.is_correct ? '<p class="text-sm"><span class="text-gray-500">Correct answer:</span> <span class="text-green-700">' + correctAnswerText + '</span></p>' : ''}
              </div>
            </div>
          </div>`;
      });
    }

    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto bg-black/50";
    overlay.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden">
        <div class="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5 text-white">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold">Test Complete!</h2>
            <span class="text-3xl font-bold">${result.score_percentage}%</span>
          </div>
          <div class="mt-2 flex flex-wrap gap-4 text-sm text-blue-100">
            <span>Score: ${result.raw_score} / ${result.max_score}</span>
            <span>Grade: ${result.letter_grade}</span>
            <span>Correct: ${result.correct_answers} / ${result.total_questions}</span>
          </div>
        </div>
        <div class="p-6">
          ${questionsHtml ? '<h3 class="text-lg font-semibold text-gray-900 mb-4">Review Your Answers</h3>' : ''}
          <div class="space-y-3">${questionsHtml || '<p class="text-gray-500">No detailed feedback available for this test.</p>'}</div>
          <div class="mt-6 flex justify-end">
            <button onclick="this.closest('.fixed').remove(); window.location.href='${result.redirect_url || '/student/dashboard'}'" class="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-800 transition-all">Go to Dashboard</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  // Send quiz answers to server
  async function sendQuizAnswers() {
    try {
      clearInterval(autoSaveInterval);
      window.removeEventListener("beforeunload", onBeforeUnload);

      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<span class="flex items-center gap-2"><span class="material-symbols-outlined animate-spin">hourglass_empty</span> Submitting...</span>';

      const response = await fetch(`${apiBasePath}/${examId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers: studentAnswers }),
      });

      const result = await response.json();

      clearInterval(timerInterval);

      if (result.success) {
        if (!isOnTheGo) {
          await fetch(`/student/exam/${examId}/session/complete`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          });
        }

        // Check if results should be shown
        if (result.show_results && !isOnTheGo) {
          // Redirect to feedback page for detailed results
          window.location.href = `/student/exam/${examId}/feedback`;
        } else if (result.show_results && isOnTheGo) {
          showOtgFeedback(result);
        } else {
          showAlert({
            title: "Exam Submitted Successfully!",
            message:
              result.message ||
              "Your exam has been submitted successfully. Results will be available after teacher review.",
            type: "success",
            confirmText: "OK",
            onConfirm: function () {
              window.location.href =
                result.redirect_url || "/student/dashboard";
            },
          });
        }
      } else {
        showAlert({
          title: "Submission Error",
          message:
            result.message || "An error occurred while submitting your exam.",
          type: "error",
          confirmText: "OK",
          onConfirm: function () {
            submitBtn.disabled = false;
            submitBtn.innerHTML =
              '<span class="flex items-center gap-2"><span class="material-symbols-outlined">send</span> Submit Exam</span>';
            startAutoSave();
          },
        });
      }
    } catch (error) {
      console.error("Error submitting exam:", error);
      showAlert({
        title: "Submission Error",
        message:
          "An error occurred while submitting your exam. Please try again.",
        type: "error",
        confirmText: "OK",
        onConfirm: function () {
          submitBtn.disabled = false;
          submitBtn.innerHTML =
            '<span class="flex items-center gap-2"><span class="material-symbols-outlined">send</span> Submit Exam</span>';
          startAutoSave();
        },
      });
    }
  }

  // Start the timer
  function startTimer() {
    timerInterval = setInterval(updateTimer, 1000);
  }

  // Update the timer display
  function updateTimer() {
    timeLeft--;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;

    // Update desktop timer
    const timerElement = document.getElementById("timer");
    if (timerElement) {
      timerElement.textContent = timeString;

      const timerBox = timerElement.closest('.exam-timer');
      timerElement.classList.remove('timer-warning', 'timer-danger');
      if (timerBox) timerBox.classList.remove('timer-danger-wrap');

      if (timeLeft <= 5 * 60) {
        timerElement.classList.add('timer-danger');
        if (timerBox) timerBox.classList.add('timer-danger-wrap');
      } else if (timeLeft <= 10 * 60) {
        timerElement.classList.add('timer-warning');
      }
    }

    // Update mobile timer
    const timerMobile = document.getElementById("timer-mobile");
    if (timerMobile) {
      timerMobile.textContent = timeString;

      if (timeLeft <= 5 * 60) {
        timerMobile.classList.add("text-red-500", "dark:text-red-400", "timer-danger");
        timerMobile.classList.remove("text-blue-600", "dark:text-blue-400", "timer-warning");
      } else if (timeLeft <= 10 * 60) {
        timerMobile.classList.add("timer-warning");
        timerMobile.classList.remove("text-blue-600", "dark:text-blue-400", "timer-danger");
      }
    }

    // Submit quiz when time runs out
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      clearInterval(autoSaveInterval);
      sendQuizAnswers();
    }
  }

  // Show toast notification
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `fixed top-6 right-6 px-6 py-3 rounded-lg shadow-lg text-white text-sm z-50 ${
      type === "success"
        ? "bg-green-500"
        : type === "error"
        ? "bg-red-500"
        : "bg-blue-500"
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
});
// JavaScript for test_with_session.html
