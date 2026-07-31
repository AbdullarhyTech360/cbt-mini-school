document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("form");
  const username = document.getElementById("username");
  const password = document.getElementById("password");
  const loginBtn = document.getElementById("login-btn");
  const btnText = document.getElementById("btn-text");
  const btnSpinner = document.getElementById("btn-spinner");
  let isFormSubmitting = false;

  // Password visibility toggle
  const togglePassword = document.querySelector('#form button[type="button"]');
  if (togglePassword) {
    togglePassword.addEventListener("click", function () {
      const type = password.getAttribute("type") === "password" ? "text" : "password";
      password.setAttribute("type", type);
      this.querySelector("span").textContent = type === "password" ? "visibility" : "visibility_off";
    });
  }

  if (!form || !username || !password) {
    console.error("Login form elements not found");
    return;
  }

  const usernameStatus = document.getElementById("username_status");
  const passwordStatus = document.getElementById("password_status");

  function setStatus(el, message, isError) {
    if (isError) {
      el.innerHTML = `<span class="material-symbols-outlined text-sm text-red-500" aria-hidden="true">error</span><span class="text-red-500">${message}</span>`;
      el.classList.remove("text-green-500");
    } else if (message) {
      el.innerHTML = `<span class="material-symbols-outlined text-sm text-green-500 animate-checkmark" aria-hidden="true">check_circle</span><span class="text-green-500">${message}</span>`;
      el.classList.remove("text-red-500");
    } else {
      el.innerHTML = "";
    }
  }

  const isStudent = () => username.value.toUpperCase().startsWith("ST");
  const isStaff = () => username.value.toUpperCase().startsWith("TE");
  const isAdmin = () => username.value.toUpperCase().startsWith("AD");

  password.addEventListener("input", function () {
    checkPassword();
  });

  const checkUsername = () => {
    if (!username.value.trim()) {
      setStatus(usernameStatus, "Username is required", true);
      username.classList.add("error-class");
      return Promise.resolve(false);
    }
    if (username.value.trim().length < 5) {
      setStatus(usernameStatus, "Username must be at least 5 characters", true);
      username.classList.add("error-class");
      return Promise.resolve(false);
    }

    let userRole = "student";
    if (isAdmin()) userRole = "admin";
    else if (isStaff()) userRole = "staff";

    return fetch("/check_user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: username.value.trim(), role: userRole }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.exists) {
          if (data.role === "student" && !isFormSubmitting) {
            const examSelect = document.getElementById("exam-select");
            const currentVal = examSelect.value;
            const exams = data.upcoming_exams || [];
            examSelect.innerHTML = "";
            if (data.can_view_dashboard !== false) {
              const def = document.createElement("option");
              def.value = "";
              def.text = "Continue to Dashboard";
              examSelect.appendChild(def);
            }
            exams.forEach((exam) => {
              const opt = document.createElement("option");
              opt.value = exam.id;
              opt.dataset.isOnTheGo = exam.is_on_the_go ? "true" : "false";
              if (exam.is_on_the_go) {
                opt.text = `${exam.name} - Quick Test (${exam.subject_name})`;
              } else {
                opt.text = `${exam.name} - ${new Date(exam.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
              }
              examSelect.appendChild(opt);
            });
            if (currentVal && Array.from(examSelect.options).some((o) => o.value === currentVal)) {
              examSelect.value = currentVal;
            }
            const hint = document.getElementById("exam-hint");
            if (hint) {
              hint.textContent = data.can_view_dashboard === false
                ? "Select an upcoming exam to begin"
                : "Select an upcoming exam or continue to dashboard";
            }
            document.getElementById("exam-select-card").classList.remove("hidden");
          } else if (!isFormSubmitting) {
            document.getElementById("exam-select-card").classList.add("hidden");
          }
          username.classList.remove("error-class");
          setStatus(usernameStatus, "");
          return { role: data.role };
        } else {
          setStatus(usernameStatus, "Username not found", true);
          username.classList.add("error-class");
          if (!isFormSubmitting) document.getElementById("exam-select-card").classList.add("hidden");
          return false;
        }
      })
      .catch(() => {
        setStatus(usernameStatus, "Error checking username", true);
        username.classList.add("error-class");
        return false;
      });
  };

  const checkPassword = () => {
    if (!password.value) {
      setStatus(passwordStatus, "Password is required", true);
      password.classList.add("error-class");
      return false;
    }
    if (password.value.length < 4) {
      setStatus(passwordStatus, "Password must be at least 4 characters", true);
      password.classList.add("error-class");
      return false;
    }
    password.classList.remove("error-class");
    setStatus(passwordStatus, "");
    return true;
  };

  username.addEventListener("input", () => {
    if (!isFormSubmitting) checkUsername();
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    isFormSubmitting = true;
    username.classList.remove("error-class");
    password.classList.remove("error-class");
    usernameStatus.innerHTML = "";
    passwordStatus.innerHTML = "";

    loginBtn.disabled = true;
    btnText.classList.add("hidden");
    btnSpinner.classList.remove("hidden");

    const uok = await checkUsername();
    const pok = checkPassword();
    let userRole = null;
    if (uok && uok.role) userRole = uok.role;

    if (!uok || !pok) {
      if (!uok) username.focus();
      else password.focus();
      isFormSubmitting = false;
      loginBtn.disabled = false;
      btnText.classList.remove("hidden");
      btnSpinner.classList.add("hidden");
      return;
    }

    const selectedExamId = document.getElementById("exam-select").value;
    const remember = document.getElementById("remember").checked;

    if (userRole === "student" && selectedExamId) {
      try {
        const resp = await fetch("/check_user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: username.value.trim(), role: userRole, check_exam_completion: selectedExamId }),
        });
        const d = await resp.json();
        if (d.exam_completed === true) {
          showToast(d.message || "You have already completed this exam", "error");
          isFormSubmitting = false;
          loginBtn.disabled = false;
          btnText.classList.remove("hidden");
          btnSpinner.classList.add("hidden");
          return;
        }
      } catch (err) {
        showToast("Error checking exam status", "error");
        isFormSubmitting = false;
        loginBtn.disabled = false;
        btnText.classList.remove("hidden");
        btnSpinner.classList.add("hidden");
        return;
      }
    }

    fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.value.trim(), password: password.value, remember: remember }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          if (data.available_exams && data.role === "student") {
            sessionStorage.setItem("availableExams", JSON.stringify(data.available_exams));
          }
          sessionStorage.setItem("session_active", "1");
          document.cookie = "session_type=" + (remember ? "permanent" : "temporary") + (remember ? "; max-age=" + (24*60*60) : "") + "; path=/";
          if (data.role === "admin") window.location.href = "/admin/dashboard";
          else if (data.role === "staff") window.location.href = "/staff/dashboard";
          else if (data.role === "student" && selectedExamId) {
            const selectedOpt = document.querySelector("#exam-select option[value='" + selectedExamId + "']");
            const isOtg = selectedOpt && selectedOpt.dataset.isOnTheGo === "true";
            window.location.href = isOtg ? `/student/on-the-go-tests/${selectedExamId}/start` : `/student/exam/${selectedExamId}`;
          }
          else if (data.role === "student" && !selectedExamId && data.can_view_dashboard !== false) window.location.href = "/student/dashboard";
          else if (data.role === "student" && !selectedExamId && data.can_view_dashboard === false) {
            showToast("Your dashboard access is currently disabled. Please contact your administrator.", "error");
          }
          else showToast("Login successful", "success");
        } else {
          showToast(data.error || "Invalid credentials", "error");
          loginBtn.disabled = false;
          btnText.classList.remove("hidden");
          btnSpinner.classList.add("hidden");
        }
      })
      .catch(() => {
        showToast("Network error, please try again", "error");
        loginBtn.disabled = false;
        btnText.classList.remove("hidden");
        btnSpinner.classList.add("hidden");
      })
      .finally(() => {
        isFormSubmitting = false;
      });
  });

  function showToast(message, type) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = message;
    t.style.background = type === "error" ? "#ef4444" : type === "success" ? "#10b981" : "#1173d4";
    t.style.opacity = "1";
    clearTimeout(t._t);
    t._t = setTimeout(() => { t.style.opacity = "0"; }, 3000);
  }

  // Intercept register link
  const registerLink = document.querySelector('a[href$="/register"]');
  if (registerLink) {
    registerLink.addEventListener("click", function (e) {
      e.preventDefault();
      fetch(this.href, { method: "GET" })
        .then((r) => {
          const ct = (r.headers.get("content-type") || "").toLowerCase();
          if (ct.includes("application/json")) {
            return r.json().then((j) => { showToast(j.error || "Cannot open registration", "error"); throw j; });
          }
          window.location.href = registerLink.href;
        })
        .catch((err) => { if (err && err.error) showToast(err.error, "error"); });
    });
  }

  // Auto-focus username field on page load
  username.focus();
});