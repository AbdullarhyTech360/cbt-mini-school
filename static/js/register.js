document.addEventListener("DOMContentLoaded", function () {
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let currentStep = 1;
  const TOTAL_STEPS = 3;

  // Elements
  const els = {
    firstName: document.getElementById("first_name"),
    lastName: document.getElementById("last_name"),
    email: document.getElementById("email"),
    gender: document.getElementById("gender"),
    role: document.getElementById("role"),
    dob: document.getElementById("dob"),
    classRoom: document.getElementById("class_room"),
    registerNumber: document.getElementById("register_number"),
    password: document.getElementById("password"),
    confirmPassword: document.getElementById("confirm_password"),
    imageInput: document.getElementById("image"),
    imagePreview: document.getElementById("image-preview"),
    fileUploadZone: document.getElementById("file-upload-zone"),
    strengthBar: document.getElementById("strength-bar"),
    strengthLabel: document.getElementById("strength-label"),
    matchIcon: document.getElementById("match-icon"),
    matchText: document.getElementById("match-text"),
    registerSubmit: document.getElementById("register-submit"),
    registerBtnText: document.getElementById("register-btn-text"),
    registerBtnSpinner: document.getElementById("register-btn-spinner"),
    alertUsername: document.getElementById("alert_username"),
    alertName: document.getElementById("alert_name"),
    alertContent: document.getElementById("alert_content"),
  };

  const status = {
    firstName: document.getElementById("first_name_status"),
    lastName: document.getElementById("last_name_status"),
    email: document.getElementById("email_status"),
    gender: document.getElementById("gender_status"),
    role: document.getElementById("role_status"),
    dob: document.getElementById("dob_status"),
    classRoom: document.getElementById("class_room_status"),
    registerNumber: document.getElementById("register_number_status"),
    password: document.getElementById("password_status"),
    confirmPassword: document.getElementById("confirm_password_status"),
  };

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Password visibility toggles
  document.querySelectorAll('#password + button, #confirm_password + button').forEach(btn => {
    btn.addEventListener("click", function () {
      const input = this.previousElementSibling;
      const type = input.getAttribute("type") === "password" ? "text" : "password";
      input.setAttribute("type", type);
      this.querySelector("span").textContent = type === "password" ? "visibility" : "visibility_off";
    });
  });

  // File upload preview
  els.imageInput.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      els.imagePreview.src = e.target.result;
      els.imagePreview.classList.remove("hidden");
      els.fileUploadZone.querySelector("p").textContent = file.name;
    };
    reader.readAsDataURL(file);
  });

  els.fileUploadZone.addEventListener("dragover", function (e) {
    e.preventDefault();
    this.classList.add("drag-over");
  });
  els.fileUploadZone.addEventListener("dragleave", function () {
    this.classList.remove("drag-over");
  });
  els.fileUploadZone.addEventListener("drop", function (e) {
    e.preventDefault();
    this.classList.remove("drag-over");
    if (e.dataTransfer.files.length) {
      els.imageInput.files = e.dataTransfer.files;
      els.imageInput.dispatchEvent(new Event("change"));
    }
  });

  // Set status helper
  function setStatus(el, message, isError) {
    if (isError) {
      el.innerHTML = `<span class="material-symbols-outlined text-sm text-red-500">error</span><span class="text-red-500">${message}</span>`;
    } else if (message) {
      el.innerHTML = `<span class="material-symbols-outlined text-sm text-green-500 animate-checkmark">check_circle</span><span class="text-green-500">${message}</span>`;
    } else {
      el.innerHTML = "";
    }
  }

  function markError(field) { field.classList.add("error-class"); }
  function clearError(field) { field.classList.remove("error-class"); }

  // Password strength
  function evaluateStrength(pw) {
    let score = 0;
    if (pw.length >= 4) score += 15;
    if (pw.length >= 8) score += 15;
    if (pw.length >= 12) score += 10;
    if (/[a-z]/.test(pw)) score += 10;
    if (/[A-Z]/.test(pw)) score += 15;
    if (/\d/.test(pw)) score += 15;
    if (/[^a-zA-Z0-9]/.test(pw)) score += 20;
    return Math.min(score, 100);
  }

  function updateStrength(pw) {
    if (!pw) {
      els.strengthBar.style.width = "0%";
      els.strengthLabel.textContent = "";
      return;
    }
    const score = evaluateStrength(pw);
    els.strengthBar.style.width = score + "%";
    if (score < 30) {
      els.strengthBar.style.background = "#ef4444";
      els.strengthLabel.textContent = "Weak";
      els.strengthLabel.style.color = "#ef4444";
    } else if (score < 60) {
      els.strengthBar.style.background = "#f59e0b";
      els.strengthLabel.textContent = "Fair";
      els.strengthLabel.style.color = "#f59e0b";
    } else if (score < 80) {
      els.strengthBar.style.background = "#10b981";
      els.strengthLabel.textContent = "Good";
      els.strengthLabel.style.color = "#10b981";
    } else {
      els.strengthBar.style.background = "#059669";
      els.strengthLabel.textContent = "Strong";
      els.strengthLabel.style.color = "#059669";
    }
  }

  function updateMatch() {
    const pw = els.password.value;
    const cp = els.confirmPassword.value;
    if (!cp) {
      els.matchIcon.textContent = "pending";
      els.matchIcon.className = "material-symbols-outlined text-lg text-gray-300";
      els.matchText.textContent = "Confirm your password";
      els.matchText.className = "text-xs text-gray-400";
      return;
    }
    if (pw === cp) {
      els.matchIcon.textContent = "check_circle";
      els.matchIcon.className = "material-symbols-outlined text-lg text-green-500 animate-checkmark";
      els.matchText.textContent = "Passwords match";
      els.matchText.className = "text-xs text-green-500";
    } else {
      els.matchIcon.textContent = "cancel";
      els.matchIcon.className = "material-symbols-outlined text-lg text-red-400";
      els.matchText.textContent = "Passwords do not match";
      els.matchText.className = "text-xs text-red-400";
    }
  }

  els.password.addEventListener("input", function () {
    updateStrength(this.value);
    inputFieldChecker(this, status.password, 4, "Password");
    updateMatch();
  });
  els.confirmPassword.addEventListener("input", function () {
    confirmPasswordChecker();
    updateMatch();
  });

  // Input validators
  const inputFieldChecker = (field, statusEl, minLen, name) => {
    if (!field.value.trim()) {
      setStatus(statusEl, `${name} is required`, true);
      markError(field);
      return false;
    }
    if (field.value.trim().length < minLen) {
      setStatus(statusEl, `${name} must be at least ${minLen} characters`, true);
      markError(field);
      return false;
    }
    clearError(field);
    setStatus(statusEl, "");
    return true;
  };

  const selectFieldChecker = (field, statusEl, name) => {
    if (!field.value) {
      setStatus(statusEl, `${name} is required`, true);
      markError(field);
      return false;
    }
    clearError(field);
    setStatus(statusEl, "");
    return true;
  };

  const confirmPasswordChecker = () => {
    if (!els.confirmPassword.value.trim()) {
      setStatus(status.confirmPassword, "Confirm Password is required", true);
      markError(els.confirmPassword);
      return false;
    }
    if (els.confirmPassword.value !== els.password.value) {
      setStatus(status.confirmPassword, "Passwords do not match", true);
      markError(els.confirmPassword);
      return false;
    }
    clearError(els.confirmPassword);
    setStatus(status.confirmPassword, "");
    return true;
  };

  const checkDOB = () => {
    if (!els.dob.value) {
      setStatus(status.dob, "Date of birth is required", true);
      markError(els.dob);
      return false;
    }
    const dateValue = new Date(els.dob.value);
    const today = new Date();
    const hundredYearsAgo = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
    if (isNaN(dateValue.getTime()) || dateValue > today || dateValue < hundredYearsAgo) {
      setStatus(status.dob, "Please enter a valid date of birth", true);
      markError(els.dob);
      return false;
    }
    clearError(els.dob);
    setStatus(status.dob, "");
    return true;
  };

  // Existing user check
  const existUser = (message, role, extra = {}) => {
    return fetch("/check_user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ message, role }, extra)),
    }).then((r) => r.json());
  };

  const checkRegisterNumber = () => {
    if (els.registerNumber.value.length < 1) {
      setStatus(status.registerNumber, "Register number is required", true);
      markError(els.registerNumber);
      return;
    }
    existUser(els.registerNumber.value, "student", { class_room: els.classRoom.value })
      .then((data) => {
        if (data.exists) {
          setStatus(status.registerNumber, "User already exists", true);
          markError(els.registerNumber);
        } else if (data.error) {
          setStatus(status.registerNumber, "This field is required", true);
          markError(els.registerNumber);
        } else {
          clearError(els.registerNumber);
          setStatus(status.registerNumber, "");
        }
      })
      .catch(() => setStatus(status.registerNumber, "Error checking", true));
  };

  els.registerNumber.addEventListener("input", debounce(checkRegisterNumber, 400));

  const checkEmailField = () => {
    if (!els.email.value.trim()) {
      setStatus(status.email, "Email is required", true);
      markError(els.email);
      return;
    }
    if (!emailRe.test(els.email.value)) {
      setStatus(status.email, "Must be name@domain.com", true);
      markError(els.email);
      return;
    }
    existUser(els.email.value, "staff")
      .then((data) => {
        if (data.exists) {
          setStatus(status.email, "User already exists", true);
          markError(els.email);
        } else {
          clearError(els.email);
          setStatus(status.email, "");
        }
      })
      .catch(() => setStatus(status.email, "Error checking", true));
  };

  els.email.addEventListener("input", debounce(checkEmailField, 400));

  // Role switching with animation
  els.role.addEventListener("change", function () {
    const studentFields = document.getElementById("role-student-fields");
    const staffFields = document.getElementById("role-staff-fields");
    if (this.value === "staff" || this.value === "admin") {
      studentFields.classList.add("hidden");
      staffFields.classList.remove("hidden");
      staffFields.classList.add("animate-slide-down");
    } else {
      staffFields.classList.add("hidden");
      studentFields.classList.remove("hidden");
      studentFields.classList.add("animate-slide-down");
    }
    selectFieldChecker(this, status.role, "Role");
  });

  // Step navigation
  function showStep(step) {
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const el = document.getElementById(`step-${i}-fields`);
      const dot = document.getElementById(`step-${i}-dot`);
      if (el) el.classList.toggle("hidden", i !== step);
      if (dot) {
        if (i < step) {
          dot.className = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 bg-green-500 text-white shadow-md shadow-green-500/30";
          dot.textContent = "✓";
        } else if (i === step) {
          dot.className = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 bg-primary text-white shadow-md shadow-primary/30";
          dot.textContent = i;
        } else {
          dot.className = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400";
          dot.textContent = i;
        }
      }
      const prog = document.getElementById(`step-progress-${i}`);
      if (prog) prog.style.width = step > i ? "100%" : "0%";
    }
    currentStep = step;
  }

  // Step 1 validation
  document.getElementById("step-1-next").addEventListener("click", function () {
    const roleOk = selectFieldChecker(els.role, status.role, "Role");
    if (els.role.value === "staff" || els.role.value === "admin") {
      if (roleOk) showStep(2);
    } else {
      const classOk = selectFieldChecker(els.classRoom, status.classRoom, "Class");
      const regOk = els.registerNumber.value.length >= 1;
      if (!regOk) {
        setStatus(status.registerNumber, "Register number is required", true);
        markError(els.registerNumber);
      }
      if (roleOk && classOk && regOk) showStep(2);
    }
  });

  // Step 2 validation
  document.getElementById("step-2-back").addEventListener("click", () => showStep(1));
  document.getElementById("step-2-next").addEventListener("click", function () {
    const fnOk = inputFieldChecker(els.firstName, status.firstName, 3, "First Name");
    const lnOk = inputFieldChecker(els.lastName, status.lastName, 3, "Last Name");
    const genOk = selectFieldChecker(els.gender, status.gender, "Gender");
    const dobOk = checkDOB();
    if (fnOk && lnOk && genOk && dobOk) showStep(3);
  });

  // Step 3 back
  document.getElementById("step-3-back").addEventListener("click", () => showStep(2));

  // Live validations on step 1 & 2 fields
  els.firstName.addEventListener("input", () => inputFieldChecker(els.firstName, status.firstName, 3, "First Name"));
  els.lastName.addEventListener("input", () => inputFieldChecker(els.lastName, status.lastName, 3, "Last Name"));
  els.gender.addEventListener("change", () => selectFieldChecker(els.gender, status.gender, "Gender"));
  els.classRoom.addEventListener("change", () => selectFieldChecker(els.classRoom, status.classRoom, "Class"));
  els.dob.addEventListener("input", checkDOB);

  // Form submission
  const registerForm = document.getElementById("register_form");

  registerForm.addEventListener("submit", function (e) {
    e.preventDefault();

    // Final validation
    clearError(els.firstName); clearError(els.lastName); clearError(els.password);
    clearError(els.confirmPassword); clearError(els.gender); clearError(els.role);
    clearError(els.classRoom); clearError(els.registerNumber); clearError(els.email);
    clearError(els.dob);

    const fnOk = inputFieldChecker(els.firstName, status.firstName, 3, "First Name");
    const lnOk = inputFieldChecker(els.lastName, status.lastName, 3, "Last Name");
    const pwOk = inputFieldChecker(els.password, status.password, 4, "Password");
    const cpOk = confirmPasswordChecker();
    const genOk = selectFieldChecker(els.gender, status.gender, "Gender");
    const roleOk = selectFieldChecker(els.role, status.role, "Role");
    const dobOk = checkDOB();

    let extraOk = true;
    if (els.role.value === "student") {
      const classOk = selectFieldChecker(els.classRoom, status.classRoom, "Class");
      const regOk = els.registerNumber.value.length >= 1;
      if (!regOk) {
        setStatus(status.registerNumber, "Register number is required", true);
        markError(els.registerNumber);
      }
      extraOk = classOk && regOk;
    } else if (els.role.value === "staff" || els.role.value === "admin") {
      if (!els.email.value.trim()) {
        setStatus(status.email, "Email is required", true);
        markError(els.email);
        extraOk = false;
      } else if (!emailRe.test(els.email.value)) {
        setStatus(status.email, "Must be name@domain.com", true);
        markError(els.email);
        extraOk = false;
      }
    }

    if (!fnOk || !lnOk || !pwOk || !cpOk || !genOk || !roleOk || !dobOk || !extraOk) {
      // Re-enable button in case it was visually disabled
      els.registerSubmit.disabled = false;
      els.registerBtnText.classList.remove("hidden");
      els.registerBtnSpinner.classList.add("hidden");
      return;
    }

    // Show loading
    els.registerSubmit.disabled = true;
    els.registerBtnText.classList.add("hidden");
    els.registerBtnSpinner.classList.remove("hidden");

    const formData = new FormData();
    formData.append("first_name", els.firstName.value);
    formData.append("last_name", els.lastName.value);
    formData.append("dob", els.dob.value);
    formData.append("password", els.password.value);
    formData.append("confirm_password", els.confirmPassword.value);
    formData.append("role", els.role.value);
    formData.append("gender", els.gender.value);

    if (els.imageInput.files.length > 0) {
      formData.append("image", els.imageInput.files[0]);
    }

    if (els.role.value === "staff" || els.role.value === "admin") {
      formData.append("email", els.email.value);
    } else {
      formData.append("class_room", els.classRoom.value);
      formData.append("register_number", els.registerNumber.value);
    }

    fetch("/register", {
      method: "POST",
      body: formData,
    })
      .then((r) => r.json().then(data => ({ ok: r.ok, status: r.status, data })))
      .then(({ ok, status, data }) => {
        els.registerSubmit.disabled = false;
        els.registerBtnText.classList.remove("hidden");
        els.registerBtnSpinner.classList.add("hidden");

        if (ok && data.success) {
          els.alertName.textContent = els.firstName.value + " " + els.lastName.value;
          els.alertUsername.textContent = data.username;
          els.alertContent.innerHTML = `Your account has been created successfully, your username is <span class="font-semibold">${data.username}</span>. Please login to <a href="${LOGIN_URL}" class="text-primary font-semibold underline">access your account.</a>`;
          openModal("alert");
        } else {
          // Show server error
          const msg = data.error || data.message || "Registration failed. Please try again.";
          const generalStatus = document.getElementById("role_status");
          setStatus(generalStatus, msg, true);
        }
      })
      .catch(() => {
        els.registerSubmit.disabled = false;
        els.registerBtnText.classList.remove("hidden");
        els.registerBtnSpinner.classList.add("hidden");
        const generalStatus = document.getElementById("role_status");
        setStatus(generalStatus, "Network error. Please try again.", true);
      });
  });

  document.getElementById("close_alert").addEventListener("click", function () {
    closeModal("alert");
    window.location.reload();
  });

  // Init step display
  showStep(1);
});