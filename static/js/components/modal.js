// Store last focused element for focus return
var lastFocusedElement = null;

// Open modal function
function openModal(modalId) {
    var modal = document.getElementById(modalId);
    if (!modal) {
        console.error("[openModal] Modal with id '" + modalId + "' NOT found in DOM");
        return;
    }

    lastFocusedElement = document.activeElement;

    // Apply ALL necessary styles via inline cssText — no class toggling.
    modal.style.cssText =
        "display: flex !important; " +
        "position: fixed !important; " +
        "top: 0 !important; " +
        "left: 0 !important; " +
        "width: 100vw !important; " +
        "height: 100vh !important; " +
        "z-index: 9999 !important; " +
        "opacity: 1 !important; " +
        "visibility: visible !important; " +
        "pointer-events: auto !important; " +
        "align-items: center !important; " +
        "justify-content: center !important; " +
        "padding: 1rem !important; " +
        "background: rgba(0,0,0,0.5) !important;";

    document.body.style.overflow = "hidden";

    // Focus management for accessibility
    var focusableElements = modal.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])");
    if (focusableElements.length > 0) {
        focusableElements[0].focus();
    }
}

// Close modal function
function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) {
        modal.removeAttribute("style");
        document.body.style.overflow = "";
    } else {
        console.error("[closeModal] Modal with id '" + modalId + "' NOT found");
    }

    // Return focus to the element that triggered the modal
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
}

// Event delegation for close buttons
document.addEventListener('click', function (e) {
    // Close when clicking close button
    if (e.target.closest('.close-modal')) {
        const modalId = e.target.closest('.close-modal').dataset.modal;
        closeModal(modalId);
    }

    // Close when clicking outside modal content (on the backdrop)
    // if (e.target.classList.contains('modal-overlay')) {
    //     closeModal(e.target.id);
    // }
});

// Close on escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            closeModal(modal.id);
        });
    }
});

// Make functions globally available
window.openModal = openModal;
window.closeModal = closeModal;

// Custom Alert Modal Component
window.showAlert = function (options) {
    // Handle if options is passed as a single argument or if message is an object
    let title = 'Alert';
    let message = '';
    let type = 'info';
    let confirmText = 'OK';
    let onConfirm = () => { };

    if (typeof options === 'object' && options !== null) {
        title = options.title || 'Alert';

        // Ensure message is always a string
        if (typeof options.message === 'object') {
            console.error('showAlert received object as message:', options.message);
            message = JSON.stringify(options.message);
        } else {
            message = String(options.message || '');
        }

        type = options.type || 'info';
        confirmText = options.confirmText || 'OK';
        onConfirm = options.onConfirm || (() => { });
    }

    // Icon and color mapping based on type
    const typeConfig = {
        success: {
            icon: 'check_circle',
            iconClass: 'text-green-500',
            bgClass: 'bg-green-100 dark:bg-green-900/30'
        },
        error: {
            icon: 'error',
            iconClass: 'text-red-500',
            bgClass: 'bg-red-100 dark:bg-red-900/30'
        },
        warning: {
            icon: 'warning',
            iconClass: 'text-orange-500',
            bgClass: 'bg-orange-100 dark:bg-orange-900/30'
        },
        info: {
            icon: 'info',
            iconClass: 'text-blue-500',
            bgClass: 'bg-blue-100 dark:bg-blue-900/30'
        }
    };

    const config = typeConfig[type] || typeConfig.info;

    // Remove existing alert modal if any
    const existingModal = document.getElementById('alertModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal HTML
    const modalHTML = `
        <div id="alertModal" class="modal items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md transform transition-all">
                <div class="p-6">
                    <div class="flex items-start gap-4 mb-4">
                        <div class="${config.bgClass} rounded-full p-3 flex-shrink-0">
                            <span class="material-symbols-outlined ${config.iconClass} text-2xl">${config.icon}</span>
                        </div>
                        <div class="flex-1">
                            <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">${title}</h2>
                            <p class="text-gray-600 dark:text-gray-400">${message}</p>
                        </div>
                    </div>
                </div>
                <div class="px-6 pb-6">
                    <button id="alertConfirmBtn" class="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
                        ${confirmText}
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add modal to document
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('alertModal');
    const confirmBtn = document.getElementById('alertConfirmBtn');

    // Apply inline styles
    modal.style.cssText =
        "display: flex !important; " +
        "position: fixed !important; " +
        "top: 0 !important; " +
        "left: 0 !important; " +
        "width: 100vw !important; " +
        "height: 100vh !important; " +
        "z-index: 9999 !important; " +
        "align-items: center !important; " +
        "justify-content: center !important; " +
        "padding: 1rem !important; " +
        "background: rgba(0,0,0,0.5) !important;";

    // Handle confirm
    confirmBtn.addEventListener('click', function () {
        modal.remove();
        onConfirm();
    });

    // Close on escape
    const escapeHandler = function (e) {
        if (e.key === 'Escape') {
            modal.remove();
            onConfirm();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);

    // Auto-focus on confirm button
    setTimeout(() => confirmBtn.focus(), 100);
};

// Confirmation Modal Component
window.showConfirmModal = function (options) {
    const {
        title = 'Confirm Action',
        message = 'Are you sure you want to proceed?',
        extraContent = '',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        confirmClass = 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
        onConfirm = () => { },
        onCancel = () => { }
    } = options;

    // Remove existing confirmation modal if any
    const existingModal = document.getElementById('confirmationModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal HTML
    const modalHTML = `
        <div id="confirmationModal" class="modal items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
                <div class="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white">${title}</h2>
                </div>
                <div class="p-6">
                    <p class="text-gray-600 dark:text-gray-400">${message}</p>
                    ${extraContent}
                </div>
                <div class="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                    <button id="confirmBtn" class="flex-1 ${confirmClass} text-white font-semibold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
                        ${confirmText}
                    </button>
                    <button id="cancelBtn" class="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-3 px-6 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        ${cancelText}
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add modal to document
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('confirmationModal');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    // Apply inline styles
    modal.style.cssText =
        "display: flex !important; " +
        "position: fixed !important; " +
        "top: 0 !important; " +
        "left: 0 !important; " +
        "width: 100vw !important; " +
        "height: 100vh !important; " +
        "z-index: 9999 !important; " +
        "align-items: center !important; " +
        "justify-content: center !important; " +
        "padding: 1rem !important; " +
        "background: rgba(0,0,0,0.5) !important;";

    // Handle confirm
    confirmBtn.addEventListener('click', async function () {
        await onConfirm();
        modal.remove();
    });

    // Handle cancel
    cancelBtn.addEventListener('click', function () {
        modal.remove();
        onCancel();
    });

    // Close on escape
    const escapeHandler = function (e) {
        if (e.key === 'Escape') {
            modal.remove();
            onCancel();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);

    // Close on backdrop click
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            modal.remove();
            onCancel();
        }
    });
};