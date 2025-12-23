document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM fully loaded and parsed');
    console.log('LOGIN_URL:', LOGIN_URL);
    // Email regex in the format of "name@domain.com"
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Password visibility toggle for register
    const togglePassword = document.querySelector('#password + button');
    const toggleConfirmPassword = document.querySelector('#confirm_password + button');

    if (togglePassword) {
        togglePassword.addEventListener('click', function () {
            const password = document.getElementById('password');
            const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
            password.setAttribute('type', type);
            this.querySelector('span').textContent = type === 'password' ? 'visibility' : 'visibility_off';
        });
    }

    if (toggleConfirmPassword) {
        toggleConfirmPassword.addEventListener('click', function () {
            const confirmPassword = document.getElementById('confirm_password');
            const type = confirmPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            confirmPassword.setAttribute('type', type);
            this.querySelector('span').textContent = type === 'password' ? 'visibility' : 'visibility_off';
        });
    }

    const registerForm = document.getElementById('register_form');
    const email = document.getElementById('email');
    const emailStatus = document.getElementById('email_status');
    const firstName = document.getElementById('first_name');
    const lastName = document.getElementById('last_name');
    const firstNameStatus = document.getElementById('first_name_status');
    const lastNameStatus = document.getElementById('last_name_status');
    const dob = document.getElementById('dob');
    const classRoom = document.getElementById('class_room');
    const dobStatus = document.getElementById('dob_status');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirm_password');
    const passwordStatus = document.getElementById('password_status');
    const confirmPasswordStatus = document.getElementById('confirm_password_status');
    const gender = document.getElementById('gender');
    const role = document.getElementById('role');
    const registerNumber = document.getElementById('register_number');
    const registerNumberStatus = document.getElementById('register_number_status');
    const genderStatus = document.getElementById('gender_status');
    const classRoomStatus = document.getElementById('class_room_status');
    const roleStatus = document.getElementById('role_status');

    // Modal elements
    const alertUsername = document.getElementById('alert_username');
    const alertName = document.getElementById('alert_name');
    const alertContent = document.getElementById('alert_content');

    const inputFieldChecker = (field, status, length = 3, name = 'Field') => {
        if (field.value.length < length) {
            status.textContent = `${name} must be at least ${length} characters long`;
            status.classList.add('text-red-500');
            status.classList.remove('text-green-500');
            field.classList.add('error-class');
        } else if (field.value.trim() === '') {
            status.textContent = `${name} is required`;
            status.classList.add('text-red-500');
            status.classList.remove('text-green-500');
            field.classList.add('error-class');
        } else {
            field.classList.remove('error-class');
            status.textContent = '✅ Good';
            status.classList.remove('text-red-500');
            status.classList.add('text-green-500');
        }
    }

    const selectFieldChecker = (field, status, name = 'Field') => {
        if (field.value === '') {
            status.textContent = `${name} is required`;
            status.classList.add('text-red-500');
            status.classList.remove('text-green-500');
            field.classList.add('error-class');
        } else {
            field.classList.remove('error-class');
            status.textContent = '✅ Good';
            status.classList.remove('text-red-500');
            status.classList.add('text-green-500');
        }
    }

    const confirmPasswordChecker = () => {
        if (confirmPassword.value !== password.value) {
            confirmPasswordStatus.textContent = 'Passwords do not match';
            confirmPasswordStatus.classList.add('text-red-500');
            confirmPasswordStatus.classList.remove('text-green-500');
            confirmPassword.classList.add('error-class');
        } else if (confirmPassword.value.trim() === '') {
            confirmPasswordStatus.textContent = 'Confirm Password is required';
            confirmPasswordStatus.classList.add('text-red-500');
            confirmPasswordStatus.classList.remove('text-green-500');
            confirmPassword.classList.add('error-class');
        } else {
            confirmPassword.classList.remove('error-class');
            confirmPasswordStatus.textContent = '✅ Good';
            confirmPasswordStatus.classList.remove('text-red-500');
            confirmPasswordStatus.classList.add('text-green-500');
        }
    }

    console.log('Modal elements found:', {
        alertUsername: !!alertUsername,
        alertName: !!alertName,
        alertContent: !!alertContent
    });

    password.addEventListener('input', () => inputFieldChecker(password, passwordStatus, 4, 'Password'));
    confirmPassword.addEventListener('input', () => confirmPasswordChecker());
    firstName.addEventListener('input', () => inputFieldChecker(firstName, firstNameStatus, 3, 'First Name'));
    lastName.addEventListener('input', () => inputFieldChecker(lastName, lastNameStatus, 3, 'Last Name'));
    gender.addEventListener('change', () => selectFieldChecker(gender, genderStatus, 'Gender'));
    role.addEventListener('change', () => selectFieldChecker(role, roleStatus, 'Role'));
    classRoom.addEventListener('change', () => selectFieldChecker(classRoom, classRoomStatus, 'Class'));
    dob.addEventListener('input', function () {
        if (dob.value === '') {
            dobStatus.textContent = 'Date of birth is required';
            dobStatus.classList.add('text-red-500');
            dobStatus.classList.remove('text-green-500');
            dob.classList.add('error-class');
        } else {
            // Check if it's a valid date
            const dateValue = new Date(dob.value);
            const today = new Date();
            const hundredYearsAgo = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());

            if (isNaN(dateValue.getTime()) || dateValue > today || dateValue < hundredYearsAgo) {
                dobStatus.textContent = 'Please enter a valid date of birth';
                dobStatus.classList.add('text-red-500');
                dobStatus.classList.remove('text-green-500');
                dob.classList.add('error-class');
            } else {
                dob.classList.remove('error-class');
                dobStatus.textContent = '✅ Good';
                dobStatus.classList.remove('text-red-500');
                dobStatus.classList.add('text-green-500');
            }
        }
    });

    role.addEventListener('change', function (e) {
        if (role.value === 'staff' || role.value === 'admin') {
            document.getElementById('email_div').classList.remove('hidden');
            document.getElementById('class_div').classList.add('hidden');
            document.getElementById('register_number_div').classList.add('hidden');
            registerNumberStatus.textContent = '';
        } else {
            document.getElementById('email_div').classList.add('hidden');
            document.getElementById('class_div').classList.remove('hidden');
            document.getElementById('register_number_div').classList.remove('hidden');
            emailStatus.textContent = '';
        }
    });

    const existUser = (message, role, extra = {}) => {
        return fetch('/check_user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(Object.assign({
                message: message,
                role: role
            }, extra))
        })
            .then(response => response.json())
    }

    const checkRegisterNumber = () => {
        emailStatus.classList.remove('error-class');
        // include selected class for scoped check
        existUser(registerNumber.value, 'student', { class_room: classRoom.value })
            .then(data => {
                console.log(data);
                if (registerNumber.value.length < 1) {
                    registerNumberStatus.textContent = 'Register number is required';
                    registerNumberStatus.classList.add('text-red-500');
                    registerNumberStatus.classList.remove('text-green-500');
                    registerNumber.classList.add('error-class');
                } else if (data.exists) {
                    registerNumberStatus.textContent = 'User already exists';
                    registerNumberStatus.classList.add('text-red-500');
                    registerNumberStatus.classList.remove('text-green-500');
                    registerNumber.classList.add('error-class');
                } else if (data.error) {
                    registerNumberStatus.textContent = 'This field is required';
                    registerNumberStatus.classList.add('text-red-500');
                    registerNumberStatus.classList.remove('text-green-500');
                    registerNumber.classList.add('error-class');
                } else {
                    registerNumber.classList.remove('error-class');
                    registerNumberStatus.textContent = '✅ Good';
                    registerNumberStatus.classList.remove('text-red-500');
                    registerNumberStatus.classList.add('text-green-500');
                }
            })
            .catch(error => {
                console.error('Error checking user:', error);
            })
    }

    registerNumber.addEventListener('input', function () {
        checkRegisterNumber();
    });

    const checkEmail = () => {
        registerNumberStatus.classList.remove('error-class');
        classRoomStatus.classList.remove('error-class');
        existUser(email.value, 'staff')
            .then(data => {
                console.log(data);

                if (email.value.length < 1) {
                    emailStatus.textContent = 'Email is required';
                    emailStatus.classList.add('text-red-500');
                    emailStatus.classList.remove('text-green-500');
                    email.classList.add('error-class');
                } else if (!emailRe.test(email.value)) {
                    emailStatus.textContent = 'Email must be in the format of "name@domain.com"';
                    emailStatus.classList.add('text-red-500');
                    emailStatus.classList.remove('text-green-500');
                    email.classList.add('error-class');
                } else if (data.exists) {
                    emailStatus.textContent = 'User already exists';
                    emailStatus.classList.add('text-red-500');
                    emailStatus.classList.remove('text-green-500');
                    email.classList.add('error-class');
                } else if (data.error) {
                    emailStatus.textContent = 'This field is required';
                    emailStatus.classList.add('text-red-500');
                    emailStatus.classList.remove('text-green-500');
                    email.classList.add('error-class');
                } else {
                    email.classList.remove('error-class');
                    emailStatus.textContent = '✅ Good';
                    emailStatus.classList.remove('text-red-500');
                    emailStatus.classList.add('text-green-500');
                }
            })
            .catch(error => {
                console.error('Error checking user:', error);
            })
    }

    email.addEventListener('input', function () {
        checkEmail();
    });

    registerForm.addEventListener('submit', function (e) {
        e.preventDefault();

        // Clear all error classes before re-validation
        firstName.classList.remove('error-class');
        lastName.classList.remove('error-class');
        password.classList.remove('error-class');
        confirmPassword.classList.remove('error-class');
        gender.classList.remove('error-class');
        role.classList.remove('error-class');
        classRoom.classList.remove('error-class');
        registerNumber.classList.remove('error-class');
        email.classList.remove('error-class');
        dob.classList.remove('error-class');

        inputFieldChecker(firstName, firstNameStatus, 3, 'First Name');
        inputFieldChecker(lastName, lastNameStatus, 3, 'Last Name');
        inputFieldChecker(password, passwordStatus, 4, 'Password');
        confirmPasswordChecker(confirmPassword, confirmPasswordStatus, 4, 'Confirm Password');
        selectFieldChecker(gender, genderStatus, 'Gender');
        selectFieldChecker(role, roleStatus, 'Role');
        selectFieldChecker(classRoom, classRoomStatus, 'Class');

        // DOB validation (but don't block submission)
        if (dob.value === '') {
            dobStatus.textContent = 'Date of birth is required';
            dobStatus.classList.add('text-red-500');
            dobStatus.classList.remove('text-green-500');
            dob.classList.add('error-class');
        } else {
            const dateValue = new Date(dob.value);
            const today = new Date();
            const hundredYearsAgo = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());

            if (isNaN(dateValue.getTime()) || dateValue > today || dateValue < hundredYearsAgo) {
                dobStatus.textContent = 'Please enter a valid date of birth';
                dobStatus.classList.add('text-red-500');
                dobStatus.classList.remove('text-green-500');
                dob.classList.add('error-class');
            } else {
                dob.classList.remove('error-class');
                dobStatus.textContent = '✅ Good';
                dobStatus.classList.remove('text-red-500');
                dobStatus.classList.add('text-green-500');
            }
        }

        if (role.value === 'student' || role.value === '') {
            checkRegisterNumber();
        } else if (role.value === 'staff' || role.value === 'admin') {
            checkEmail();
        }

        const formData = new FormData();
        formData.append('first_name', firstName.value);
        formData.append('last_name', lastName.value);
        formData.append('dob', dob.value);
        formData.append('password', password.value);
        formData.append('confirm_password', confirmPassword.value);
        formData.append('role', role.value);
        formData.append('gender', gender.value);

        const imageInput = document.getElementById('image');
        if (imageInput && imageInput.files.length > 0) {
            formData.append('image', imageInput.files[0]);
        }

        // Only include email and class_room if required
        if (role.value === 'staff' || role.value === 'admin') {
            formData.append('email', email.value);
        } else if (role.value === 'student') {
            formData.append('class_room', classRoom.value);
            formData.append('register_number', registerNumber.value);
        }

        // Always submit the form, even with validation errors
        fetch('/register', {
            method: 'POST',
            body: formData // No Content-Type header needed for FormData
        }).then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Registration successful, opening modal...');
                    // Update modal content with registration details
                    alertName.textContent = firstName.value + ' ' + lastName.value;
                    alertUsername.textContent = data.username;
                    alertContent.innerHTML = `Your account has been created successfully, your username is <span class="font-semibold">${data.username}</span>. Please login to <a href="${LOGIN_URL}" class="text-primary font-semibold underline">access your account.</a>`;

                    // Show modal
                    openModal('alert');
                } else {
                    console.log('Registration failed:', data.error);
                    // You can show the error in the UI instead of alert
                    // For now, just log it
                }
            }).catch(error => {
                console.log('An error occurred:', error.message);
                // Handle error silently or show in UI
            });
    });

    // Close modal and redirect to login when OK is clicked
    document.getElementById('close_alert').addEventListener('click', function () {
        closeModal('alert');
        window.location.reload();
    });
});