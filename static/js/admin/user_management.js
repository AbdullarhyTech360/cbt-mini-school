// User Management - Search, Filter, Sort, Add, Edit, and Toggle functionality

document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");
    const roleFilter = document.getElementById("roleFilter");
    const statusFilter = document.getElementById("statusFilter");
    const sortBy = document.getElementById("sortBy");
    const usersTableBody = document.getElementById("usersTableBody");
    const filteredCount = document.getElementById("filteredCount");
    const noResults = document.getElementById("noResults");
    
    let allRows = Array.from(document.querySelectorAll(".user-row"));
    const totalUsers = allRows.length;

    // Function to filter and sort users
    function filterAndSortUsers() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const selectedRole = roleFilter.value.toLowerCase();
        const selectedStatus = statusFilter.value.toLowerCase();
        const sortOption = sortBy.value;

        // Filter rows
        let visibleRows = allRows.filter(row => {
            const username = row.dataset.username.toLowerCase();
            const fullname = row.dataset.fullname.toLowerCase();
            const email = row.dataset.email.toLowerCase();
            const role = row.dataset.role.toLowerCase();
            const status = row.dataset.status.toLowerCase();

            // Search filter
            const matchesSearch = !searchTerm || 
                username.includes(searchTerm) || 
                fullname.includes(searchTerm) || 
                email.includes(searchTerm);

            // Role filter
            const matchesRole = !selectedRole || role === selectedRole;

            // Status filter
            const matchesStatus = !selectedStatus || status === selectedStatus;

            return matchesSearch && matchesRole && matchesStatus;
        });

        // Sort rows
        visibleRows.sort((a, b) => {
            switch (sortOption) {
                case "name":
                    return a.dataset.fullname.localeCompare(b.dataset.fullname);
                case "created":
                    return parseFloat(b.dataset.created) - parseFloat(a.dataset.created);
                case "username":
                    return a.dataset.username.localeCompare(b.dataset.username);
                default:
                    return 0;
            }
        });

        // Hide all rows first
        allRows.forEach(row => row.style.display = "none");

        // Show filtered and sorted rows
        if (visibleRows.length > 0) {
            visibleRows.forEach(row => {
                row.style.display = "";
                usersTableBody.appendChild(row); // Re-append to maintain sort order
            });
            noResults.classList.add("hidden");
        } else {
            noResults.classList.remove("hidden");
        }

        // Update count
        filteredCount.textContent = visibleRows.length;
    }

    // Event listeners for search and filters
    searchInput.addEventListener("input", filterAndSortUsers);
    roleFilter.addEventListener("change", filterAndSortUsers);
    statusFilter.addEventListener("change", filterAndSortUsers);
    sortBy.addEventListener("change", filterAndSortUsers);

    // Delete user functionality
    const deleteButtons = document.querySelectorAll("button[title='Delete User']");

    deleteButtons.forEach(button => {
        button.addEventListener("click", function () {
            const userId = button.getAttribute("data-user-id");
            const userName = button.getAttribute("data-user-name");
            
            window.showConfirmModal({
                title: "Delete User",
                message: `Are you sure you want to delete ${userName}? This action cannot be undone.`,
                confirmText: "Delete",
                cancelText: "Cancel",
                confirmClass: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
                onConfirm: function () {
                    fetch(`/admin/delete/user/${userId}`, {
                        method: "DELETE",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    })
                        .then((response) => response.json())
                        .then((data) => {
                            if (data.success) {
                                if (typeof window.showAlert !== "undefined") {
                                    window.showAlert({
                                        type: "success",
                                        title: "Success!",
                                        message: data.message,
                                        onConfirm: () => {
                                            window.location.reload();
                                        },
                                    });
                                } else {
                                    alert(data.message);
                                    window.location.reload();
                                }
                            } else {
                                if (typeof window.showAlert !== "undefined") {
                                    window.showAlert({
                                        type: "error",
                                        title: "Error!",
                                        message: data.message,
                                    });
                                } else {
                                    alert(data.message);
                                }
                            }
                        })
                        .catch((error) => {
                            console.error("Error:", error);
                            if (typeof window.showAlert !== "undefined") {
                                window.showAlert({
                                    type: "error",
                                    title: "Error!",
                                    message: "An error occurred while deleting the user.",
                                });
                            } else {
                                alert("An error occurred while deleting the user.");
                            }
                        });
                },
            });
        });
    });

    // Initial filter on page load
    filterAndSortUsers();
});

// Modal functions
function openAddUserModal() {
    document.getElementById("addUserModal").classList.remove("hidden");
    document.getElementById("addUserForm").reset();
}

function closeAddUserModal() {
    document.getElementById("addUserModal").classList.add("hidden");
}

function openEditUserModal(userId) {
    // Find the edit button for this user
    const button = document.querySelector(`button[data-user-id="${userId}"]`);
    
    if (!button) {
        console.error('Edit button not found for user ID:', userId);
        return;
    }
    
    // Populate form fields with exact data from dataset (no transformation)
    document.getElementById("editUserId").value = userId;
    document.getElementById("editUsername").value = button.dataset.username || '';
    document.getElementById("editFirstName").value = button.dataset.firstName || '';
    document.getElementById("editLastName").value = button.dataset.lastName || '';
    document.getElementById("editEmail").value = button.dataset.email || '';
    document.getElementById("editGender").value = button.dataset.gender || 'Male';
    document.getElementById("editDob").value = button.dataset.dob || '';
    document.getElementById("editClassRoom").value = button.dataset.classRoomId || '';
    document.getElementById("editRegisterNumber").value = button.dataset.registerNumber || '';
    
    // Show/hide fields based on role
    const role = button.dataset.role || '';
    const classField = document.getElementById("editClassField");
    const registerField = document.getElementById("editRegisterField");
    const emailField = document.getElementById("editEmail");
    const emailRequired = document.getElementById("editEmailRequired");
    const classRequired = document.getElementById("editClassRequired");
    const registerRequired = document.getElementById("editRegisterRequired");
    const classSelect = document.getElementById("editClassRoom");
    const registerInput = document.getElementById("editRegisterNumber");
    
    if (role === "student") {
        // Student: Show class and register number, hide email requirement
        classField.classList.remove("hidden");
        registerField.classList.remove("hidden");
        classRequired.classList.remove("hidden");
        registerRequired.classList.remove("hidden");
        classSelect.required = true;
        registerInput.required = true;
        emailField.required = false;
        emailRequired.classList.add("hidden");
    } else if (role === "staff" || role === "admin") {
        // Staff/Admin: Show class, hide register number, require email
        classField.classList.remove("hidden");
        registerField.classList.add("hidden");
        classRequired.classList.remove("hidden");
        registerRequired.classList.add("hidden");
        classSelect.required = true;
        registerInput.required = false;
        emailField.required = true;
        emailRequired.classList.remove("hidden");
    } else {
        // Unknown role: hide all
        classField.classList.add("hidden");
        registerField.classList.add("hidden");
        classRequired.classList.add("hidden");
        registerRequired.classList.add("hidden");
        classSelect.required = false;
        registerInput.required = false;
    }
    
    document.getElementById("editUserModal").classList.remove("hidden");
}

function closeEditUserModal() {
    document.getElementById("editUserModal").classList.add("hidden");
}

// Handle role change in Add User form
function handleRoleChange(formType) {
    const roleSelect = document.getElementById(formType === "add" ? "addUserRole" : "editUserRole");
    const role = roleSelect.value;
    
    const classField = document.getElementById(formType + "ClassField");
    const registerField = document.getElementById(formType + "RegisterField");
    const emailField = document.getElementById(formType + "EmailField");
    
    if (formType === "add") {
        const emailInput = document.getElementById("addEmailInput");
        const emailRequired = document.getElementById("addEmailRequired");
        const classSelect = document.getElementById("addClassRoomSelect");
        const registerInput = document.getElementById("addRegisterNumberInput");
        
        if (role === "student") {
            // Student: Show class and register number, hide email requirement
            classField.classList.remove("hidden");
            registerField.classList.remove("hidden");
            classSelect.required = true;
            registerInput.required = true;
            emailInput.required = false;
            emailRequired.classList.add("hidden");
        } else if (role === "staff" || role === "admin") {
            // Staff/Admin: Show class, hide register number, require email
            classField.classList.remove("hidden");
            registerField.classList.add("hidden");
            classSelect.required = true;
            registerInput.required = false;
            emailInput.required = true;
            emailRequired.classList.remove("hidden");
        } else {
            // No role selected: Hide all
            classField.classList.add("hidden");
            registerField.classList.add("hidden");
            classSelect.required = false;
            registerInput.required = false;
            emailInput.required = false;
            emailRequired.classList.add("hidden");
        }
    }
}

// Add User Form Submit
document.getElementById("addUserForm").addEventListener("submit", function (e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());
    
    // Validate required fields based on role
    if (!data.first_name || !data.last_name || !data.role || !data.dob) {
        if (typeof window.showAlert !== "undefined") {
            window.showAlert({
                type: "error",
                title: "Validation Error!",
                message: "Please fill in all required fields.",
            });
        } else {
            alert("Please fill in all required fields.");
        }
        return;
    }
    
    // Validate password
    if (!data.password || data.password.length < 4) {
        if (typeof window.showAlert !== "undefined") {
            window.showAlert({
                type: "error",
                title: "Validation Error!",
                message: "Password must be at least 4 characters long.",
            });
        } else {
            alert("Password must be at least 4 characters long.");
        }
        return;
    }
    
    // Validate password confirmation
    if (data.password !== data.confirm_password) {
        if (typeof window.showAlert !== "undefined") {
            window.showAlert({
                type: "error",
                title: "Validation Error!",
                message: "Passwords do not match.",
            });
        } else {
            alert("Passwords do not match.");
        }
        return;
    }
    
    // Role-specific validation
    if (data.role === "student") {
        if (!data.class_room_id || !data.register_number) {
            if (typeof window.showAlert !== "undefined") {
                window.showAlert({
                    type: "error",
                    title: "Validation Error!",
                    message: "Class and Register Number are required for students.",
                });
            } else {
                alert("Class and Register Number are required for students.");
            }
            return;
        }
    } else if (data.role === "staff" || data.role === "admin") {
        if (!data.email) {
            if (typeof window.showAlert !== "undefined") {
                window.showAlert({
                    type: "error",
                    title: "Validation Error!",
                    message: "Email is required for staff and admin users.",
                });
            } else {
                alert("Email is required for staff and admin users.");
            }
            return;
        }
        if (!data.class_room_id) {
            if (typeof window.showAlert !== "undefined") {
                window.showAlert({
                    type: "error",
                    title: "Validation Error!",
                    message: "Class is required for staff and admin users.",
                });
            } else {
                alert("Class is required for staff and admin users.");
            }
            return;
        }
    }
    
    // Remove confirm_password before sending to server
    delete data.confirm_password;
    
    fetch("/admin/add/user", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                if (typeof window.showAlert !== "undefined") {
                    window.showAlert({
                        type: "success",
                        title: "Success!",
                        message: `${data.message}. Username: ${data.username}`,
                        onConfirm: () => {
                            window.location.reload();
                        },
                    });
                } else {
                    alert(`${data.message}. Username: ${data.username}`);
                    window.location.reload();
                }
            } else {
                if (typeof window.showAlert !== "undefined") {
                    window.showAlert({
                        type: "error",
                        title: "Error!",
                        message: data.message,
                    });
                } else {
                    alert(data.message);
                }
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            if (typeof window.showAlert !== "undefined") {
                window.showAlert({
                    type: "error",
                    title: "Error!",
                    message: "An error occurred while adding the user.",
                });
            } else {
                alert("An error occurred while adding the user.");
            }
        });
});

// Edit User Form Submit
document.getElementById("editUserForm").addEventListener("submit", function (e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());
    const userId = data.user_id;
    delete data.user_id;
    
    // Validate required fields
    if (!data.first_name || !data.last_name || !data.dob) {
        if (typeof window.showAlert !== "undefined") {
            window.showAlert({
                type: "error",
                title: "Validation Error!",
                message: "Please fill in all required fields.",
            });
        } else {
            alert("Please fill in all required fields.");
        }
        return;
    }
    
    // Get the role from the button to validate role-specific fields
    const button = document.querySelector(`button[data-user-id="${userId}"]`);
    const role = button ? button.dataset.role : null;
    
    // Role-specific validation
    if (role === "student") {
        if (!data.class_room_id || !data.register_number) {
            if (typeof window.showAlert !== "undefined") {
                window.showAlert({
                    type: "error",
                    title: "Validation Error!",
                    message: "Class and Register Number are required for students.",
                });
            } else {
                alert("Class and Register Number are required for students.");
            }
            return;
        }
    } else if (role === "staff" || role === "admin") {
        if (!data.email) {
            if (typeof window.showAlert !== "undefined") {
                window.showAlert({
                    type: "error",
                    title: "Validation Error!",
                    message: "Email is required for staff and admin users.",
                });
            } else {
                alert("Email is required for staff and admin users.");
            }
            return;
        }
        if (!data.class_room_id) {
            if (typeof window.showAlert !== "undefined") {
                window.showAlert({
                    type: "error",
                    title: "Validation Error!",
                    message: "Class is required for staff and admin users.",
                });
            } else {
                alert("Class is required for staff and admin users.");
            }
            return;
        }
    }
    
    fetch(`/admin/update/user/${userId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                if (typeof window.showAlert !== "undefined") {
                    window.showAlert({
                        type: "success",
                        title: "Success!",
                        message: data.message,
                        onConfirm: () => {
                            window.location.reload();
                        },
                    });
                } else {
                    alert(data.message);
                    window.location.reload();
                }
            } else {
                if (typeof window.showAlert !== "undefined") {
                    window.showAlert({
                        type: "error",
                        title: "Error!",
                        message: data.message,
                    });
                } else {
                    alert(data.message);
                }
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            if (typeof window.showAlert !== "undefined") {
                window.showAlert({
                    type: "error",
                    title: "Error!",
                    message: "An error occurred while updating the user.",
                });
            } else {
                alert("An error occurred while updating the user.");
            }
        });
});

// Toggle User Status
function toggleUserStatus(userId, currentStatus) {
    const action = currentStatus ? "deactivate" : "activate";
    
    window.showConfirmModal({
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
        message: `Are you sure you want to ${action} this user?`,
        confirmText: action.charAt(0).toUpperCase() + action.slice(1),
        cancelText: "Cancel",
        confirmClass: currentStatus 
            ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
        onConfirm: function () {
            fetch(`/admin/toggle/user/${userId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        if (typeof window.showAlert !== "undefined") {
                            window.showAlert({
                                type: "success",
                                title: "Success!",
                                message: data.message,
                                onConfirm: () => {
                                    window.location.reload();
                                },
                            });
                        } else {
                            alert(data.message);
                            window.location.reload();
                        }
                    } else {
                        if (typeof window.showAlert !== "undefined") {
                            window.showAlert({
                                type: "error",
                                title: "Error!",
                                message: data.message,
                            });
                        } else {
                            alert(data.message);
                        }
                    }
                })
                .catch((error) => {
                    console.error("Error:", error);
                    if (typeof window.showAlert !== "undefined") {
                        window.showAlert({
                            type: "error",
                            title: "Error!",
                            message: "An error occurred while toggling user status.",
                        });
                    } else {
                        alert("An error occurred while toggling user status.");
                    }
                });
        },
    });
}

// Close modals on outside click
document.getElementById("addUserModal").addEventListener("click", function (e) {
    if (e.target === this) {
        closeAddUserModal();
    }
});

document.getElementById("editUserModal").addEventListener("click", function (e) {
    if (e.target === this) {
        closeEditUserModal();
    }
});
