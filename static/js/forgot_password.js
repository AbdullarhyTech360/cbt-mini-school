document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("forgotPasswordForm");
  const usernameInput = document.getElementById("usernameOrEmail");
  const newPasswordInput = document.getElementById("newPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const resetBtn = document.getElementById("resetBtn");
  const resetBtnText = document.getElementById("resetBtnText");
  const resetBtnSpinner = document.getElementById("resetBtnSpinner");
  const notificationContainer = document.getElementById("notification-container");
  const usernameValidationIcon = document.getElementById("usernameValidationIcon");
  const usernameStatus = document.getElementById("usernameOrEmailStatus");
  const newPasswordStatus = document.getElementById("newPasswordStatus");
  const confirmPasswordStatus = document.getElementById("confirmPasswordStatus");
  const matchIcon = document.getElementById("match-icon");
  const matchText = document.getElementById("match-text");

  // Password visibility toggles
  document.querySelectorAll("#newPassword + button, #confirmPassword + button").forEach((btn) => {
    btn.addEventListener("click", function () {
      const input = this.previousElementSibling;
      const type = input.getAttribute("type") === "password" ? "text" : "password";
      input.setAttribute("type", type);
      this.querySelector("span").textContent = type === "password" ? "visibility" : "visibility_off";
    });
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

  function showFieldError(input, message) {
    input.classList.add("error-class");
    setStatus(input.id === "usernameOrEmail" ? usernameStatus : input.id === "newPassword" ? newPasswordStatus : confirmPasswordStatus, message, true);
  }

  function clearFieldError(input) {
    input.classList.remove("error-class");
  }

  function showFieldSuccess(element) {
    element.classList.remove("hidden");
  }

  function hideFieldSuccess(element) {
    element.classList.add("hidden");
  }

  // Username validation on blur
  usernameInput.addEventListener("blur", async function () {
    const value = this.value.trim();
    if (!value) return;

    try {
      const response = await fetch("/check_user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value }),
      });
      const data = await response.json();

      if (data.exists) {
        showFieldSuccess(usernameValidationIcon);
        clearFieldError(usernameInput);
        setStatus(usernameStatus, "User verified", false);
      } else {
        showFieldError(usernameInput, "User not found");
        hideFieldSuccess(usernameValidationIcon);
      }
    } catch (error) {
      showFieldError(usernameInput, "Error validating user");
      hideFieldSuccess(usernameValidationIcon);
    }
  });

  usernameInput.addEventListener("input", function () {
    clearFieldError(this);
    hideFieldSuccess(usernameValidationIcon);
    usernameStatus.innerHTML = "";
  });

  // Password match
  function validatePasswords() {
    const newPw = newPasswordInput.value;
    const confirmPw = confirmPasswordInput.value;

    if (!confirmPw) {
      matchIcon.textContent = "pending";
      matchIcon.className = "material-symbols-outlined text-lg text-gray-300";
      matchText.textContent = "Confirm your password";
      matchText.className = "text-xs text-gray-400";
      return true;
    }

    if (newPw === confirmPw) {
      matchIcon.textContent = "check_circle";
      matchIcon.className = "material-symbols-outlined text-lg text-green-500 animate-checkmark";
      matchText.textContent = "Passwords match";
      matchText.className = "text-xs text-green-500";
      clearFieldError(confirmPasswordInput);
      setStatus(confirmPasswordStatus, "", false);
      return true;
    } else {
      matchIcon.textContent = "cancel";
      matchIcon.className = "material-symbols-outlined text-lg text-red-400";
      matchText.textContent = "Passwords do not match";
      matchText.className = "text-xs text-red-400";
      showFieldError(confirmPasswordInput, "Passwords do not match");
      return false;
    }
  }

  confirmPasswordInput.addEventListener("input", validatePasswords);
  newPasswordInput.addEventListener("input", function () {
    if (this.value.length > 0 && this.value.length < 4) {
      showFieldError(this, "Password must be at least 4 characters");
    } else {
      clearFieldError(this);
      setStatus(newPasswordStatus, "", false);
    }
    if (confirmPasswordInput.value) validatePasswords();
  });

  // Form submission
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validate
    if (!username) {
      showFieldError(usernameInput, "Username or email is required");
      usernameInput.focus();
      return;
    }
    if (!newPassword) {
      showFieldError(newPasswordInput, "New password is required");
      newPasswordInput.focus();
      return;
    }
    if (newPassword.length < 4) {
      showFieldError(newPasswordInput, "Password must be at least 4 characters");
      newPasswordInput.focus();
      return;
    }
    if (!confirmPassword) {
      showFieldError(confirmPasswordInput, "Please confirm your password");
      confirmPasswordInput.focus();
      return;
    }
    if (newPassword !== confirmPassword) {
      showFieldError(confirmPasswordInput, "Passwords do not match");
      confirmPasswordInput.focus();
      return;
    }

    // Check user exists
    try {
      const checkResp = await fetch("/check_user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: username }),
      });
      const checkData = await checkResp.json();
      if (!checkData.exists) {
        showNotification("User not found", "error");
        return;
      }
    } catch {
      showNotification("Error validating user", "error");
      return;
    }

    // Submit reset
    resetBtn.disabled = true;
    resetBtnText.classList.add("hidden");
    resetBtnSpinner.classList.remove("hidden");

    try {
      const resp = await fetch("/forgot_password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernameOrEmail: username, newPassword, confirmPassword }),
      });
      const data = await resp.json();

      if (data.success) {
        showNotification("Password reset successfully! Redirecting to login...", "success");
        form.reset();
        hideFieldSuccess(usernameValidationIcon);
        setTimeout(() => { window.location.href = "/login"; }, 2500);
      } else {
        showNotification(data.error || "Failed to reset password", "error");
      }
    } catch {
      showNotification("Error resetting password", "error");
    } finally {
      resetBtn.disabled = false;
      resetBtnText.classList.remove("hidden");
      resetBtnSpinner.classList.add("hidden");
    }
  });

  // Notification
  function showNotification(message, type) {
    while (notificationContainer.firstChild) notificationContainer.removeChild(notificationContainer.firstChild);

    const el = document.createElement("div");
    el.className = `px-4 py-3 rounded-xl shadow-md transform transition-all duration-300 animate-fade-in ${
      type === "success" ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
        : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
    }`;
    el.innerHTML = `<div class="flex items-center gap-2"><span class="material-symbols-outlined">${type === "success" ? "check_circle" : "error"}</span><span>${message}</span></div>`;
    notificationContainer.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 5000);
  }
});