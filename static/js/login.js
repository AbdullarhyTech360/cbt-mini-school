document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("form");
  let username = document.getElementById("username");
  const password = document.getElementById("password");
  let isFormSubmitting = false;

  // Password visibility toggle for login
  const togglePassword = document.querySelector('#form button');
  if (togglePassword) {
    togglePassword.addEventListener('click', function () {
      const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
      password.setAttribute('type', type);
      this.querySelector('span').textContent = type === 'password' ? 'visibility' : 'visibility_off';
    });
  }

  if (!form || !username || !password) {
    console.error("Login form elements not found");
    return;
  }

  // small helper to show inline status and error styles
  const usernameStatus = document.getElementById('username_status');
  const passwordStatus = document.getElementById('password_status');

  const setError = (field, statusEl, message) => {
    field.classList.add('error-class');
    statusEl.textContent = message;
    statusEl.classList.remove('text-green-500');
    statusEl.classList.add('text-red-500');
  }

  const setSuccess = (field, statusEl, message = '✅ Good') => {
    field.classList.remove('error-class');
    statusEl.textContent = message;
    statusEl.classList.remove('text-red-500');
    statusEl.classList.add('text-green-500');
  }

  const isStudent = () => username.value.toUpperCase().includes('ST')
  const isStaff = () => username.value.toUpperCase().includes('TE')
  const isAdmin = () => username.value.toUpperCase().includes('AD')

  const checkUsername = () => {
    console.log("Checking username");
    if (!username.value.trim()) {
      setError(username, usernameStatus, 'Username is required');
      return Promise.resolve(false);
    }
    if (username.value.trim().length < 5) {
      setError(username, usernameStatus, 'Username must be at least 5 characters');
      return Promise.resolve(false);
    }
    
    // Determine user role based on username prefix
    let userRole = 'student';
    if (isAdmin()) {
      userRole = 'admin';
    } else if (isStaff()) {
      userRole = 'staff';
    }
    
    // Send POST request to check user and get upcoming exams
    return fetch('/check_user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: username.value.trim(),
        role: userRole
      })
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.exists) {
          // Always refresh the upcoming exams when a new user enters their username
          // But only if we're not in form submission
          if (data.role === 'student' && !isFormSubmitting) {
            // Store the currently selected exam ID before repopulating
            const examSelect = document.getElementById('exam-select');
            const currentSelectedValue = examSelect.value;
            
            // Display all the upcoming exams options
            const exams = data.upcoming_exams || [];
            console.log(exams);
            examSelect.innerHTML = '';

            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.text = 'Continue to Dashboard';
            examSelect.appendChild(defaultOption);
            
            if (exams.length > 0) {
              for (const exam of exams) {
                const option = document.createElement('option');
                option.value = exam.id;
                // Parse the date string properly (YYYY-MM-DD format)
                const examDate = new Date(exam.date + 'T00:00:00');
                const formattedDate = examDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                option.text = `${exam.name} - ${formattedDate}`;
                examSelect.appendChild(option);
              }
            }
            
            // Restore the previously selected value if it still exists
            if (currentSelectedValue) {
              const optionExists = Array.from(examSelect.options).some(option => option.value === currentSelectedValue);
              if (optionExists) {
                examSelect.value = currentSelectedValue;
              }
            }
            
            document.getElementById('exam-select-card').classList.remove('hidden');
          } else if (!isFormSubmitting) {
            document.getElementById('exam-select-card').classList.add('hidden');
          }

          setSuccess(username, usernameStatus);
          return { role: data.role };
        } else {
          setError(username, usernameStatus, 'Username not found');
          if (!isFormSubmitting) {
            document.getElementById('exam-select-card').classList.add('hidden');
          }
          return false;
        }
      })
      .catch((err) => {
        console.error('Error:', err);
        setError(username, usernameStatus, 'An error occurred while checking username');
        return false;
      });
  }

  const checkPassword = () => {
    if (!password.value) {
      setError(password, passwordStatus, 'Password is required');
      return false;
    }
    if (password.value.length < 4) {
      setError(password, passwordStatus, 'Password must be at least 4 characters');
      return false;
    }
    setSuccess(password, passwordStatus);
    return true;
  }

  username.addEventListener('input', () => {
    if (!isFormSubmitting) checkUsername();
  });
  password.addEventListener('input', checkPassword);

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    
    // Set flag to prevent exam dropdown repopulation during form submission
    isFormSubmitting = true;
    
    // Clear styles
    username.classList.remove('error-class');
    password.classList.remove('error-class');
    usernameStatus.textContent = '';
    passwordStatus.textContent = '';

    const uok = await checkUsername();
    const pok = checkPassword();
    
    // Store user role from checkUsername
    let userRole = null;
    if (uok && uok.role) {
      userRole = uok.role;
    }

    if (!uok || !pok) {
      // focus first invalid field
      if (!uok) username.focus();
      else password.focus();
      // Reset flag when validation fails
      isFormSubmitting = false;
      return;
    }

    // Store the selected exam ID before making the login request
    const selectedExamId = document.getElementById('exam-select').value;

    // Check if student has selected an exam and if they've already taken it
    if (userRole === 'student' && selectedExamId) {
      // Add exam completion check to the user check request
      const userData = {
        message: username.value.trim(),
        role: userRole,
        check_exam_completion: selectedExamId  // Add exam ID to check completion
      };

      console.log(userData);
      
      try {
        const userCheckResponse = await fetch('/check_user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData)
        });
        const userCheckData = await userCheckResponse.json();
        
        // Check if the response includes exam completion status
        if (userCheckData.exam_completed === true) {
          // Show error message and prevent form submission
          showNotification(userCheckData.message || 'You have already completed this exam', 'error');
          // Reset flag when exam completion check fails
          isFormSubmitting = false;
          return;
        }
      } catch (err) {
        console.error('Error checking exam completion:', err);
        showNotification('Error checking exam status', 'error');
        // Reset flag when exam completion check fails
        isFormSubmitting = false;
        return;
      }
    }

    // proceed with fetch
    fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username.value.trim(),
        password: password.value,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Store available exams in sessionStorage for access on dashboard
          if (data.available_exams && data.role === "student") {
            sessionStorage.setItem('availableExams', JSON.stringify(data.available_exams));
          }
          
          // redirect based on role and exam selection
          if (data.role === "admin") {
            window.location.href = "/admin/dashboard";
          } else if (data.role === "staff") {
            window.location.href = "/staff/dashboard";
          } else if (data.role === "student" && selectedExamId) {
            // Redirect to exam details page if an exam is selected
            window.location.href = `/student/exam/${selectedExamId}`;
          } else if (data.role === "student" && !selectedExamId) {
            // Redirect to dashboard if no exam is selected
            window.location.href = "/student/dashboard";
          } else {
            showNotification('Login successful', 'success');
          }
        } else {
          showNotification('Login failed: ' + (data.error || 'Invalid credentials'), 'error');
        }
      })
      .catch((err) => {
        console.error('Login error', err);
        showNotification('Login failed: network or server error', 'error');
      })
      .finally(() => {
        // Reset flag after login request is complete (success or failure)
        isFormSubmitting = false;
      });
  });

  // Small notification utility (same style as admin settings)
  function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ${type === "success"
        ? "bg-green-500 text-white"
        : type === "error"
          ? "bg-red-500 text-white"
          : "bg-blue-500 text-white"
      }`;
    notification.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-sm">${type === "success"
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
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Intercept register link click. When the register route returns JSON (permission denied),
  // show a notification. If it returns HTML, allow navigation.
  const registerLink = document.querySelector('a[href$="/register"]');
  if (registerLink) {
    registerLink.addEventListener("click", function (e) {
      e.preventDefault();
      // Try to fetch the register route and inspect response content-type.
      fetch(registerLink.href, { method: "GET" })
        .then((response) => {
          const ct = (response.headers.get("content-type") || "").toLowerCase();
          if (ct.includes("application/json")) {
            return response.json().then((json) => {
              // Show error message from JSON (expected when permission denied)
              if (json.error) {
                showNotification(json.error, "error");
              } else if (json.message) {
                showNotification(json.message, "error");
              } else {
                showNotification("Unable to open registration page", "error");
              }
              // Throw to stop further then-chaining
              throw json;
            });
          } else {
            // Likely HTML: proceed to the registration page
            window.location.href = registerLink.href;
          }
        })
        .catch((err) => {
          // If we reach here because of network or unexpected issues, show a notice
          if (err && (err.error || err.message)) {
            showNotification(err.error || err.message, "error");
          } else {
            // If fetch was aborted or already handled, do nothing further
            console.warn("Register check error or handled:", err);
          }
        });
    });
  }
});