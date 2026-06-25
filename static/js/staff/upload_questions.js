document.addEventListener('DOMContentLoaded', function() {
    // Check if modal functions are available
    if (typeof window.showAlert === 'undefined') {
        console.warn('Modal functions not loaded! Make sure modal.js is included before upload_questions.js');
    }
    
    const questionTypeSelect = document.getElementById('questionType');
    const optionsContainer = document.getElementById('optionsContainer');
    const shortAnswerContainer = document.getElementById('shortAnswerContainer');
    const optionsList = document.getElementById('optionsList');
    const addOptionBtn = document.getElementById('addOptionBtn');
    const questionForm = document.getElementById('questionForm');
    const resetFormBtn = document.getElementById('resetFormBtn');
    const previewQuestionBtn = document.getElementById('previewQuestionBtn');
    const classSubjectSelect = document.getElementById('classSubject');
    const subjectIdInput = document.getElementById('subject_id');
    const classRoomIdInput = document.getElementById('class_room_id');
    
    // New elements for preview modal
    const questionPreviewModal = document.getElementById('questionPreviewModal');
    const closePreviewModal = document.getElementById('closePreviewModal');
    const prevQuestionBtn = document.getElementById('prevQuestionBtn');
    const nextQuestionBtn = document.getElementById('nextQuestionBtn');
    const questionCounter = document.getElementById('questionCounter');
    const totalQuestions = document.getElementById('totalQuestions');
    const questionDisplay = document.getElementById('questionDisplay');
    
    // New elements for term and exam type
    const termSelect = document.getElementById('term');
    const examTypeSelect = document.getElementById('examType');
    
    // Preview dropdown elements
    const previewOptions = document.getElementById('previewOptions');
    const previewCurrentBtn = document.getElementById('previewCurrentBtn');
    const previewAllBtn = document.getElementById('previewAllBtn');
    
    // Hidden inputs for current selection
    const currentSubjectId = document.getElementById('currentSubjectId');
    const currentClassRoomId = document.getElementById('currentClassRoomId');
    const currentTermId = document.getElementById('currentTermId');
    const currentExamTypeId = document.getElementById('currentExamTypeId');
    
    // Add Save Question button to preview modal
    let saveQuestionBtn = null;
    
    // Update hidden inputs when classSubject changes
    if (classSubjectSelect) {
        classSubjectSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption && selectedOption.value) {
                const [subjectId, classId] = selectedOption.value.split(',');
                if (subjectIdInput) subjectIdInput.value = subjectId;
                if (classRoomIdInput) classRoomIdInput.value = classId;
            } else {
                if (subjectIdInput) subjectIdInput.value = '';
                if (classRoomIdInput) classRoomIdInput.value = '';
            }
        });
    }

    // Extraction tab elements
    const singleUploadTab = document.getElementById('singleUploadTab');
    const bulkUploadTab = document.getElementById('bulkUploadTab');
    const singleUploadSection = document.getElementById('singleUploadSection');
    const bulkUploadSection = document.getElementById('bulkUploadSection');
    const extractUploadTab = document.getElementById('extractUploadTab');
    const extractSection = document.getElementById('extractSection');
    const extractForm = document.getElementById('extractForm');
    const extractSubmitBtn = document.getElementById('extractSubmitBtn');
    const extractClassSubject = document.getElementById('extractClassSubject');
    const extractSubjectId = document.getElementById('extract_subject_id');
    const extractClassRoomId = document.getElementById('extract_class_room_id');
    const extractTerm = document.getElementById('extractTerm');
    const extractExamType = document.getElementById('extractExamType');
    const extractFile = document.getElementById('extractFile');
    const customPromptInput = document.getElementById('customPrompt');
    const extractModelInfo = document.getElementById('extractModelInfo');
    const searchExtractedQuestions = document.getElementById('searchExtractedQuestions');
    const questionCardsContainer = document.getElementById('questionCardsContainer');
    const questionCountText = document.getElementById('questionCount');
    const noExtractedQuestions = document.getElementById('noExtractedQuestions');
    const filePreviewSection = document.getElementById('filePreviewSection');
    const uploadResultsSection = document.getElementById('uploadResultsSection');
    const resultsSummary = document.getElementById('resultsSummary');
    const extractLoadingState = document.getElementById('extractLoadingState');
    const extractLoadingMessage = document.getElementById('extractLoadingMessage');
    const extractProgressBar = document.getElementById('extractProgressBar');
    const extractProgressValue = document.getElementById('extractProgressValue');
    const extractActivityBadge = document.getElementById('extractActivityBadge');
    const extractNetworkBadge = document.getElementById('extractNetworkBadge');
    const extractElapsedTime = document.getElementById('extractElapsedTime');
    const extractCurrentStageLabel = document.getElementById('extractCurrentStageLabel');
    const extractActiveModelName = document.getElementById('extractActiveModelName');
    const extractActiveModelIdentifier = document.getElementById('extractActiveModelIdentifier');
    const extractModelProvider = document.getElementById('extractModelProvider');
    const extractModelActivity = document.getElementById('extractModelActivity');
    const extractEventLog = document.getElementById('extractEventLog');
    const extractCancelBtn = document.getElementById('extractCancelBtn');
    const extractRetryBtn = document.getElementById('extractRetryBtn');
    const extractStagesList = document.getElementById('extractStagesList');

    let extractedQuestions = [];
    let currentEditingQuestionId = null;
    let currentSearchTerm = '';
    let extractController = null;
    let extractionIsActive = false;
    let extractionCompleted = false;
    let extractionStartedAt = null;
    let lastStreamEventAt = null;
    let extractMonitorInterval = null;
    let currentStageId = null;
    let currentProgressValue = 0;
    let activeModel = null;
    const extractStageOrder = [
        'initializing-model-pipeline',
        'processing-input-text',
        'extracting-core-question-entities',
        'generating-structured-question-output'
    ];
    
    // Toggle options visibility based on question type
    if (questionTypeSelect) {
        questionTypeSelect.addEventListener('change', function() {
            const type = this.value;
            
            if (type === 'mcq' || type === 'true_false') {
                optionsContainer.classList.remove('hidden');
                shortAnswerContainer.classList.add('hidden');
                optionsList.innerHTML = '';
                
                // Add initial options
                if (type === 'mcq') {
                    addOption();
                    addOption();
                } else if (type === 'true_false') {
                    addTrueFalseOptions();
                }
            } else if (type === 'short_answer') {
                optionsContainer.classList.add('hidden');
                shortAnswerContainer.classList.remove('hidden');
                optionsList.innerHTML = '';
            } else {
                optionsContainer.classList.add('hidden');
                shortAnswerContainer.classList.add('hidden');
                optionsList.innerHTML = '';
            }
        });
    }

    // Extract tab switching
    if (extractUploadTab) {
        extractUploadTab.addEventListener('click', function() {
            // Update tab styles
            extractUploadTab.classList.remove('inactive-tab');
            extractUploadTab.classList.add('active-tab');
            bulkUploadTab.classList.remove('active-tab');
            bulkUploadTab.classList.add('inactive-tab');
            singleUploadTab.classList.remove('active-tab');
            singleUploadTab.classList.add('inactive-tab');

            // Show extract section, hide others
            extractSection.classList.remove('hidden');
            bulkUploadSection.classList.add('hidden');
            singleUploadSection.classList.add('hidden');
        });
    }

    // Wire extractClassSubject change
    if (extractClassSubject) {
        extractClassSubject.addEventListener('change', function() {
            const sel = this.options[this.selectedIndex];
            if (sel && sel.value) {
                const [sid, cid] = sel.value.split(',');
                if (extractSubjectId) extractSubjectId.value = sid;
                if (extractClassRoomId) extractClassRoomId.value = cid;
            } else {
                if (extractSubjectId) extractSubjectId.value = '';
                if (extractClassRoomId) extractClassRoomId.value = '';
            }
        });
    }

    // Handle extract form submission
    if (extractForm) {
        extractForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Basic validation
            if (!extractSubjectId.value || !extractClassRoomId.value || !extractTerm.value || !extractExamType.value) {
                if (window.showAlert) window.showAlert({type: 'error', title: 'Validation', message: 'Please select Subject, Class, Term and Exam Type.'});
                else alert('Please select Subject, Class, Term and Exam Type.');
                return;
            }

            if (!extractFile.files || extractFile.files.length === 0) {
                if (window.showAlert) window.showAlert({type: 'error', title: 'Validation', message: 'Please select a file to extract.'});
                else alert('Please select a file to extract.');
                return;
            }

            const fd = new FormData();
            // Append all selected files
            for (let i = 0; i < extractFile.files.length; i++) {
                fd.append('file', extractFile.files[i]);
            }
            fd.append('subject_id', extractSubjectId.value);
            fd.append('class_room_id', extractClassRoomId.value);
            fd.append('term_id', extractTerm.value);
            fd.append('exam_type_id', extractExamType.value);
            fd.append('custom_prompt', customPromptInput?.value || '');

            resetExtractedResults();
            beginExtractionLoading();
            setExtractButtonState(true, 'Streaming updates...');
            appendExtractEvent('Extraction request submitted. Awaiting live backend updates.', 'info');
            setNetworkBadge('Connecting stream...', 'neutral');
            setActivityBadge('Starting', 'active');
            extractController = new AbortController();

            try {
                const resp = await fetch('/staff/extract_questions', {
                    method: 'POST',
                    body: fd,
                    headers: {
                        'Accept': 'application/x-ndjson'
                    },
                    signal: extractController.signal
                });

                if (!resp.ok) {
                    const errorPayload = await safeParseJson(resp);
                    const errorMessage = errorPayload?.message || 'Extraction failed before the stream started.';
                    failExtractionLoading(errorMessage);
                    if (window.showAlert) window.showAlert({type: 'error', title: 'Error', message: errorMessage});
                    else alert('Error: ' + errorMessage);
                    return;
                }

                await consumeExtractionStream(resp);
            } catch (err) {
                if (err.name === 'AbortError') {
                    cancelExtractionLoading('Extraction canceled. You can retry when ready.');
                    return;
                }
                console.error('Extraction error', err);
                const message = 'The extraction stream was interrupted before completion.';
                failExtractionLoading(message);
                if (window.showAlert) window.showAlert({type:'error', title:'Error', message});
                else alert(message);
            }
            finally {
                extractController = null;
                if (!extractionIsActive) {
                    setExtractButtonState(false, 'Extract');
                }
            }
        });
    }

    if (extractCancelBtn) {
        extractCancelBtn.addEventListener('click', function() {
            if (extractController) {
                extractController.abort();
            } else if (extractionIsActive) {
                cancelExtractionLoading('Extraction stopped.');
            }
        });
    }

    if (extractRetryBtn) {
        extractRetryBtn.addEventListener('click', function() {
            if (extractionIsActive) return;
            if (extractForm) {
                extractForm.requestSubmit();
            }
        });
    }
    
    // Toggle preview options dropdown
    if (previewQuestionBtn) {
        previewQuestionBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            previewOptions.classList.toggle('hidden');
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (previewOptions && !previewOptions.contains(e.target) && !previewQuestionBtn.contains(e.target)) {
            if (previewOptions && !previewOptions.classList.contains('hidden')) {
                previewOptions.classList.add('hidden');
            }
        }
    });

    if (searchExtractedQuestions) {
        searchExtractedQuestions.addEventListener('input', function() {
            currentSearchTerm = this.value.toLowerCase();
            renderExtractedQuestions(extractedQuestions);
        });
    }

    function setExtractButtonState(isLoading, label) {
        if (!extractSubmitBtn) return;
        extractSubmitBtn.disabled = isLoading;
        extractSubmitBtn.textContent = label;
    }

    function beginExtractionLoading() {
        extractionIsActive = true;
        extractionCompleted = false;
        extractionStartedAt = Date.now();
        lastStreamEventAt = extractionStartedAt;
        currentStageId = null;
        currentProgressValue = 0;
        activeModel = null;
        if (extractLoadingState) extractLoadingState.classList.remove('hidden');
        if (extractRetryBtn) extractRetryBtn.classList.add('hidden');
        if (extractCancelBtn) extractCancelBtn.classList.remove('hidden');
        if (extractLoadingMessage) extractLoadingMessage.textContent = 'Connecting to the extraction stream.';
        if (extractCurrentStageLabel) extractCurrentStageLabel.textContent = 'Queued';
        if (extractEventLog) {
            extractEventLog.innerHTML = '';
        }
        setExtractProgress(0);
        setActivityBadge('Active', 'active');
        setNetworkBadge('Stream connected', 'neutral');
        updateActiveModelDisplay(null, 'Preparing extraction session.');
        resetStageIndicators();
        startExtractMonitor();
    }

    function finishExtractionLoading() {
        extractionIsActive = false;
        stopExtractMonitor();
        if (extractCancelBtn) extractCancelBtn.classList.add('hidden');
        if (extractRetryBtn && !extractionCompleted) extractRetryBtn.classList.remove('hidden');
        setExtractButtonState(false, 'Extract');
    }

    function completeExtractionLoading(message) {
        extractionCompleted = true;
        if (extractLoadingMessage) extractLoadingMessage.textContent = message;
        setActivityBadge('Completed', 'success');
        setNetworkBadge('Stream complete', 'success');
        finishExtractionLoading();
    }

    function failExtractionLoading(message) {
        if (extractLoadingMessage) extractLoadingMessage.textContent = message;
        setActivityBadge('Failed', 'error');
        setNetworkBadge('Stream interrupted', 'error');
        appendExtractEvent(message, 'error');
        finishExtractionLoading();
    }

    function cancelExtractionLoading(message) {
        if (extractLoadingMessage) extractLoadingMessage.textContent = message;
        setActivityBadge('Canceled', 'neutral');
        setNetworkBadge('Stream closed', 'neutral');
        appendExtractEvent(message, 'neutral');
        finishExtractionLoading();
    }

    function startExtractMonitor() {
        stopExtractMonitor();
        extractMonitorInterval = window.setInterval(function() {
            if (extractElapsedTime && extractionStartedAt) {
                const seconds = Math.floor((Date.now() - extractionStartedAt) / 1000);
                extractElapsedTime.textContent = `Elapsed: ${seconds}s`;
            }

            if (!extractionIsActive || !lastStreamEventAt) return;

            const silenceSeconds = Math.floor((Date.now() - lastStreamEventAt) / 1000);
            if (silenceSeconds >= 12) {
                setNetworkBadge('No recent update, check connection', 'error');
                setActivityBadge('Possibly stalled', 'warning');
                if (extractLoadingMessage) {
                    extractLoadingMessage.textContent = 'No update has arrived recently. The network may be unstable or the model may be overloaded.';
                }
            } else if (silenceSeconds >= 6) {
                setNetworkBadge('Waiting for next stream update', 'warning');
                setActivityBadge('Waiting', 'warning');
            }
        }, 1000);
    }

    function stopExtractMonitor() {
        if (extractMonitorInterval) {
            window.clearInterval(extractMonitorInterval);
            extractMonitorInterval = null;
        }
    }

    function setExtractProgress(value) {
        const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
        currentProgressValue = safeValue;
        if (extractProgressBar) {
            extractProgressBar.style.width = `${safeValue}%`;
        }
        if (extractProgressValue) {
            extractProgressValue.textContent = `${Math.round(safeValue)}%`;
        }
    }

    function setActivityBadge(label, tone) {
        if (!extractActivityBadge) return;
        const tones = {
            active: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
            success: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
            warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
            error: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
            neutral: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
        };
        extractActivityBadge.className = `extract-status-chip inline-flex items-center rounded-full px-3 py-1 ${tones[tone] || tones.neutral}`;
        extractActivityBadge.textContent = label;
    }

    function setNetworkBadge(label, tone) {
        if (!extractNetworkBadge) return;
        const tones = {
            success: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
            warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
            error: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
            neutral: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
        };
        extractNetworkBadge.className = `extract-status-chip inline-flex items-center rounded-full px-3 py-1 ${tones[tone] || tones.neutral}`;
        extractNetworkBadge.textContent = label;
    }

    function updateActiveModelDisplay(model, activityMessage) {
        activeModel = model || activeModel;
        const resolvedModel = activeModel || {
            name: 'Not assigned yet',
            identifier: 'Pending',
            provider: 'Waiting'
        };
        if (extractActiveModelName) extractActiveModelName.textContent = resolvedModel.name || 'Not assigned yet';
        if (extractActiveModelIdentifier) extractActiveModelIdentifier.textContent = resolvedModel.identifier || resolvedModel.name || 'Pending';
        if (extractModelProvider) extractModelProvider.textContent = resolvedModel.provider || 'Waiting';
        if (extractModelActivity) extractModelActivity.textContent = activityMessage || 'Preparing extraction session.';
    }

    function resetStageIndicators() {
        if (!extractStagesList) return;
        extractStagesList.querySelectorAll('[data-stage-id]').forEach(function(stageEl) {
            stageEl.dataset.stageState = 'pending';
            stageEl.className = 'extract-stage-item rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900/30';
            const badge = stageEl.querySelector('[data-stage-badge]');
            const message = stageEl.querySelector('[data-stage-message]');
            if (badge) {
                badge.className = 'text-xs rounded-full px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
                badge.textContent = 'Pending';
            }
            if (message) {
                message.textContent = 'Pending';
            }
        });
    }

    function markStageState(stageId, state, message) {
        if (!extractStagesList || !stageId) return;
        const stateStyles = {
            pending: {
                card: 'extract-stage-item rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900/30',
                badge: 'text-xs rounded-full px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
                text: 'Pending'
            },
            active: {
                card: 'extract-stage-item rounded-xl border border-blue-200 dark:border-blue-800 p-4 bg-blue-50 dark:bg-blue-900/15',
                badge: 'text-xs rounded-full px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
                text: 'Active'
            },
            waiting: {
                card: 'extract-stage-item rounded-xl border border-amber-200 dark:border-amber-800 p-4 bg-amber-50 dark:bg-amber-900/15',
                badge: 'text-xs rounded-full px-2.5 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
                text: 'Waiting'
            },
            completed: {
                card: 'extract-stage-item rounded-xl border border-green-200 dark:border-green-800 p-4 bg-green-50 dark:bg-green-900/15',
                badge: 'text-xs rounded-full px-2.5 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
                text: 'Done'
            },
            error: {
                card: 'extract-stage-item rounded-xl border border-red-200 dark:border-red-800 p-4 bg-red-50 dark:bg-red-900/15',
                badge: 'text-xs rounded-full px-2.5 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
                text: 'Error'
            }
        };
        const stageEl = extractStagesList.querySelector(`[data-stage-id="${stageId}"]`);
        if (!stageEl) return;
        const config = stateStyles[state] || stateStyles.pending;
        stageEl.dataset.stageState = state;
        stageEl.className = config.card;
        const badge = stageEl.querySelector('[data-stage-badge]');
        const messageEl = stageEl.querySelector('[data-stage-message]');
        if (badge) {
            badge.className = config.badge;
            badge.textContent = config.text;
        }
        if (messageEl && message) {
            messageEl.textContent = message;
        }
    }

    function syncStageProgress(stageId, status, message) {
        if (!stageId) return;
        const currentIndex = extractStageOrder.indexOf(stageId);
        extractStageOrder.forEach(function(id, index) {
            if (index < currentIndex) {
                const existingEl = extractStagesList?.querySelector(`[data-stage-id="${id}"]`);
                if (existingEl && existingEl.dataset.stageState !== 'completed') {
                    markStageState(id, 'completed');
                }
            }
        });
        markStageState(stageId, status === 'waiting' ? 'waiting' : (status === 'error' ? 'error' : 'active'), message);
        currentStageId = stageId;
        if (extractCurrentStageLabel) {
            const labelEl = extractStagesList?.querySelector(`[data-stage-id="${stageId}"] p`);
            extractCurrentStageLabel.textContent = labelEl ? labelEl.textContent : stageId;
        }
    }

    function completeAllStages(message) {
        extractStageOrder.forEach(function(stageId) {
            markStageState(stageId, 'completed', stageId === 'generating-structured-question-output' ? message : undefined);
        });
        if (extractCurrentStageLabel) {
            extractCurrentStageLabel.textContent = 'Completed';
        }
    }

    function appendExtractEvent(message, tone) {
        if (!extractEventLog) return;
        const colorMap = {
            info: 'text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900/40',
            success: 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20',
            warning: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20',
            error: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20',
            neutral: 'text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900/40'
        };
        const entry = document.createElement('div');
        entry.className = `rounded-xl px-3 py-2 text-sm ${colorMap[tone] || colorMap.info}`;
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        entry.textContent = `${now} - ${message}`;
        if (!extractEventLog.children.length || extractEventLog.textContent.trim() === 'No updates yet.') {
            extractEventLog.innerHTML = '';
        }
        extractEventLog.prepend(entry);
    }

    async function consumeExtractionStream(resp) {
        if (!resp.body) {
            throw new Error('Streaming response is not available in this browser.');
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let sawCompleteEvent = false;

        setNetworkBadge('Stream connected', 'neutral');
        appendExtractEvent('Live extraction stream connected.', 'success');

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            lastStreamEventAt = Date.now();
            setNetworkBadge('Receiving live updates', 'neutral');
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const rawLine of lines) {
                const line = rawLine.trim();
                if (!line) continue;
                const eventPayload = JSON.parse(line);
                if (eventPayload.event === 'complete') {
                    sawCompleteEvent = true;
                }
                handleExtractionStreamEvent(eventPayload);
            }
        }

        if (buffer.trim()) {
            const trailingEvent = JSON.parse(buffer.trim());
            if (trailingEvent.event === 'complete') {
                sawCompleteEvent = true;
            }
            handleExtractionStreamEvent(trailingEvent);
        }

        if (!sawCompleteEvent && extractionIsActive) {
            throw new Error('The extraction stream ended before completion.');
        }
    }

    function handleExtractionStreamEvent(payload) {
        lastStreamEventAt = Date.now();
        const eventType = payload.event || 'milestone';
        const message = payload.message || 'Extraction update received.';
        const progress = payload.progress;
        const status = payload.status || 'running';
        const stageId = payload.stage_id;

        if (typeof progress === 'number') {
            setExtractProgress(progress);
        }

        if (payload.model) {
            updateActiveModelDisplay(payload.model, message);
        } else if (payload.model_name) {
            updateActiveModelDisplay({
                name: payload.model_name,
                identifier: payload.model_name,
                provider: 'Google Gemini'
            }, message);
        } else {
            updateActiveModelDisplay(activeModel, message);
        }

        if (extractLoadingMessage) {
            extractLoadingMessage.textContent = message;
        }

        if (stageId) {
            syncStageProgress(stageId, status, message);
        }

        if (eventType === 'heartbeat') {
            setActivityBadge('Waiting', 'warning');
            setNetworkBadge('Stream connected', 'neutral');
            appendExtractEvent(message, 'warning');
            return;
        }

        if (eventType === 'model') {
            setActivityBadge('Model update', 'active');
            appendExtractEvent(message, 'info');
            return;
        }

        if (eventType === 'error') {
            if (stageId) {
                markStageState(stageId, 'error', message);
            } else if (currentStageId) {
                markStageState(currentStageId, 'error', message);
            }
            failExtractionLoading(message);
            if (window.showAlert) window.showAlert({ type: 'error', title: 'Extraction Failed', message });
            else alert(message);
            return;
        }

        if (eventType === 'complete') {
            const questions = payload.questions || [];
            extractedQuestions = questions.map((q, idx) => ({
                ...q,
                _extractId: q._extractId || `extracted-${Date.now()}-${idx}`
            }));
            if (extractModelInfo) {
                extractModelInfo.textContent = payload.model_name ? `Last model used: ${payload.model_name}` : 'Live extraction completed';
            }
            renderExtractedQuestions(extractedQuestions);
            if (filePreviewSection) filePreviewSection.classList.remove('hidden');
            if (uploadResultsSection) uploadResultsSection.classList.remove('hidden');
            if (resultsSummary) {
                const modelSuffix = payload.model_name ? ` using ${payload.model_name}` : '';
                resultsSummary.innerHTML = `<div class="font-medium">${extractedQuestions.length} questions extracted${modelSuffix}. Review below and click Approve to save.</div>`;
            }
            ensureApproveButton();
            completeAllStages(message);
            appendExtractEvent(message, 'success');
            completeExtractionLoading(message);
            return;
        }

        setActivityBadge(status === 'waiting' ? 'Waiting' : 'Active', status === 'waiting' ? 'warning' : 'active');
        appendExtractEvent(message, status === 'waiting' ? 'warning' : 'info');
    }

    async function safeParseJson(resp) {
        try {
            return await resp.json();
        } catch (error) {
            return null;
        }
    }

    function resetExtractedResults() {
        extractedQuestions = [];
        renderExtractedQuestions(extractedQuestions);
        if (filePreviewSection) filePreviewSection.classList.add('hidden');
        if (uploadResultsSection) uploadResultsSection.classList.add('hidden');
        if (resultsSummary) resultsSummary.innerHTML = '';
        if (extractModelInfo) extractModelInfo.textContent = 'Extracted questions will appear here after processing.';
    }

    function ensureApproveButton() {
        if (!uploadResultsSection) return;
        let approveBtn = document.getElementById('approveExtractedQuestions');
        if (!approveBtn) {
            approveBtn = document.createElement('button');
            approveBtn.id = 'approveExtractedQuestions';
            approveBtn.className = 'mt-4 px-6 py-3 bg-green-600 text-white rounded-xl';
            approveBtn.textContent = 'Approve & Create Questions';
            approveBtn.addEventListener('click', async function() {
                try {
                    const payload = {
                        subject_id: extractSubjectId.value,
                        class_room_id: extractClassRoomId.value,
                        term_id: extractTerm.value,
                        exam_type_id: extractExamType.value,
                        questions: extractedQuestions
                    };
                    const r = await fetch('/staff/create_questions_from_json', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(payload)
                    });
                    const rr = await r.json();
                    if (rr.success) {
                        if (window.showAlert) window.showAlert({type:'success', title:'Saved', message: rr.message});
                        else alert(rr.message);
                    } else {
                        if (window.showAlert) window.showAlert({type:'error', title:'Error', message: rr.message});
                        else alert('Error: ' + rr.message);
                    }
                } catch (err) {
                    console.error(err);
                    if (window.showAlert) window.showAlert({type:'error', title:'Error', message: 'Failed to create questions'});
                    else alert('Failed to create questions');
                }
            });
            uploadResultsSection.appendChild(approveBtn);
        }
        approveBtn.classList.remove('hidden');
    }

    function renderExtractedQuestions(questions) {
        const container = questionCardsContainer;
        const noResults = noExtractedQuestions;
        if (!container || !noResults) return;

        const filtered = questions.filter(q => {
            if (!currentSearchTerm) return true;
            return (q.question_text || '').toLowerCase().includes(currentSearchTerm) ||
                (q.options || []).some(opt => (opt.text || '').toLowerCase().includes(currentSearchTerm));
        });

        container.innerHTML = '';
        questionCountText.textContent = `${filtered.length} question${filtered.length === 1 ? '' : 's'}`;

        if (!filtered.length) {
            noResults.classList.remove('hidden');
            container.classList.add('hidden');
            return;
        }

        noResults.classList.add('hidden');
        container.classList.remove('hidden');

        filtered.forEach(question => {
            const card = document.createElement('div');
            card.className = 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm';
            card.dataset.questionText = (question.question_text || '').toLowerCase();

            const optionsHtml = (question.options || []).map((opt, idx) => {
                return `
                    <div class="flex items-center gap-3 p-3 rounded-xl ${opt.is_correct ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700'}">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center ${opt.is_correct ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}">
                            ${String.fromCharCode(65 + idx)}
                        </div>
                        <div class="flex-1 text-sm text-gray-700 dark:text-gray-200">${opt.text}</div>
                        ${opt.is_correct ? '<span class="text-green-700 dark:text-green-300 text-sm font-semibold">Correct</span>' : ''}
                    </div>
                `;
            }).join('');

            card.innerHTML = `
                <div class="flex items-start gap-4 mb-4">
                    <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary text-lg font-semibold">Q</div>
                    <div class="flex-1">
                        <p class="text-gray-900 dark:text-white font-semibold mb-3">${question.question_text || 'Untitled question'}</p>
                        <div class="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span class="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">Type: ${question.question_type || 'mcq'}</span>
                            ${question.context ? `<span class="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">Has context</span>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button type="button" class="edit-extracted-question p-2 rounded-lg text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" data-id="${question._extractId}" title="Edit">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button type="button" class="delete-extracted-question p-2 rounded-lg text-gray-500 hover:text-red-600 dark:hover:text-red-400" data-id="${question._extractId}" title="Delete">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </div>
                <div class="space-y-3">
                    ${optionsHtml || (question.question_type === 'short_answer' ? `<div class="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 text-gray-700 dark:text-green-200"><span class="font-semibold">Answer:</span> ${question.correct_answer || 'Not provided'}</div>` : '<div class="text-sm text-gray-500 dark:text-gray-400">No answer options found.</div>')}
                </div>
            `;

            container.appendChild(card);
        });

        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([container]).catch(() => {});
        }

        container.querySelectorAll('.delete-extracted-question').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                extractedQuestions = extractedQuestions.filter(q => q._extractId !== id);
                renderExtractedQuestions(extractedQuestions);
            });
        });

        container.querySelectorAll('.edit-extracted-question').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                const question = extractedQuestions.find(q => q._extractId === id);
                if (!question) return;
                currentEditingQuestionId = id;
                displayQuestionPreview([question], 0);
                if (questionPreviewModal) questionPreviewModal.classList.remove('hidden');
            });
        });
    }
    
    // Preview all questions
    if (previewAllBtn) {
        previewAllBtn.addEventListener('click', function() {
            updatePreviewWithAllQuestions();
            if (previewOptions) {
                previewOptions.classList.add('hidden');
            }
        });
    }
    
    // Add option button
    if (addOptionBtn) {
        addOptionBtn.addEventListener('click', addOption);
    }
    
    // Add true/false options
    function addTrueFalseOptions() {
        optionsList.innerHTML = '';
        
        // Add True option
        const trueOption = createOptionInput('True', false);
        optionsList.appendChild(trueOption);
        
        // Add False option
        const falseOption = createOptionInput('False', false);
        optionsList.appendChild(falseOption);
        
        // Disable add button for true/false
        if (addOptionBtn) {
            addOptionBtn.disabled = true;
            addOptionBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
    
    // Add new option
    function addOption() {
        const optionElement = createOptionInput('', false);
        optionsList.appendChild(optionElement);
        
        // Enable add button
        if (addOptionBtn) {
            addOptionBtn.disabled = false;
            addOptionBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    // Create option input element
    function createOptionInput(text = '', isCorrect = false) {
        const optionId = Date.now() + Math.random();
        const optionDiv = document.createElement('div');
        optionDiv.className = 'flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg';
        optionDiv.innerHTML = `
            <div class="flex items-center">
                <input type="radio" name="correctOption" value="${optionId}" 
                    class="h-4 w-4 text-primary border-gray-300 dark:border-gray-600 focus:ring-primary"
                    ${isCorrect ? 'checked' : ''}>
            </div>
            <input type="text" 
                class="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="Enter option text..." value="${text}">
            <button type="button" class="remove-option text-red-500 hover:text-red-700 dark:hover:text-red-400">
                <span class="material-symbols-outlined">delete</span>
            </button>
        `;
        
        // Add event listener to remove button
        const removeBtn = optionDiv.querySelector('.remove-option');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                optionDiv.remove();
            });
        }
        
        return optionDiv;
    }
    
    // Preview Question functionality
    function previewQuestion() {
        // Get form values
        const questionText = document.getElementById('questionText')?.value || '';
        const questionType = questionTypeSelect?.value || '';
        const correctAnswer = document.getElementById('correctAnswer')?.value || '';
        
        // Create a temporary preview of the current question
        const previewData = {
            question_text: questionText,
            question_type: questionType,
            correct_answer: correctAnswer,
            options: []
        };
        
        // Collect options for MCQ and True/False
        if (questionType === 'mcq' || questionType === 'true_false') {
            const optionElements = optionsList.querySelectorAll('input[type="text"]');
            const correctOptionValue = document.querySelector('input[name="correctOption"]:checked')?.value;
            
            optionElements.forEach((input, index) => {
                const optionId = optionsList.children[index].querySelector('input[name="correctOption"]').value;
                previewData.options.push({
                    text: input.value,
                    is_correct: optionId === correctOptionValue
                });
            });
        }
        
        // Display preview
        displayQuestionPreview([previewData], 0);
        
        // Show preview modal
        if (questionPreviewModal) {
            questionPreviewModal.classList.remove('hidden');
        }
    }
    
    // Display questions preview
    function displayQuestionPreview(questions, currentIndex) {
        if (!questionDisplay || !questions || questions.length === 0) return;
        
        // Check if we're in edit mode
        const isEditMode = currentEditingQuestionId !== null;
        
        // Update modal title
        const modalTitle = questionPreviewModal.querySelector('h2');
        if (modalTitle) {
            modalTitle.textContent = isEditMode ? 'Edit Question' : 'Questions Preview';
        }
        
        // Update total questions display
        if (totalQuestions) {
            totalQuestions.textContent = `Total: ${questions.length} questions`;
        }
        
        // Update question counter
        if (questionCounter) {
            questionCounter.textContent = `${currentIndex + 1} of ${questions.length}`;
        }
        
        // Enable/disable navigation buttons (hide in edit mode)
        if (prevQuestionBtn) {
            prevQuestionBtn.disabled = currentIndex === 0 || isEditMode;
            prevQuestionBtn.style.display = isEditMode ? 'none' : '';
        }
        if (nextQuestionBtn) {
            nextQuestionBtn.disabled = currentIndex === questions.length - 1 || isEditMode;
            nextQuestionBtn.style.display = isEditMode ? 'none' : '';
        }
        
        // Get current question
        const question = questions[currentIndex];
        
        // Create HTML for question display/edit
        let questionHTML = `
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <span class="text-white font-semibold">${currentIndex + 1}</span>
                    </div>
                    <div class="flex-1">
        `;
        
        if (isEditMode) {
            // Edit mode: render editable form fields
            questionHTML += `
                        <div class="mb-4">
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Question Text</label>
                            <textarea id="editQuestionText" rows="3" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition">${question.question_text || ''}</textarea>
                        </div>
                        <div class="mb-4">
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Question Type</label>
                            <select id="editQuestionType" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition">
                                <option value="mcq" ${question.question_type === 'mcq' || (!question.question_type && question.options && question.options.length > 0) ? 'selected' : ''}>Multiple Choice</option>
                                <option value="true_false" ${question.question_type === 'true_false' ? 'selected' : ''}>True/False</option>
                                <option value="short_answer" ${question.question_type === 'short_answer' ? 'selected' : ''}>Short Answer</option>
                            </select>
                        </div>
            `;
            
            const isMcq = question.question_type === 'mcq' || question.question_type === 'true_false' || (!question.question_type && question.options && question.options.length > 0);
            if (isMcq) {
                questionHTML += `
                        <div class="mb-4">
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Options</label>
                            <div id="editOptionsContainer" class="space-y-3">
                `;
                
                const options = question.options || [];
                for (let i = 0; i < Math.max(options.length, 2); i++) {
                    const opt = options[i] || { text: '', is_correct: i === 0 };
                    questionHTML += `
                                <div class="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                                    <input type="radio" name="editCorrectOption" value="${i}" ${opt.is_correct ? 'checked' : ''} class="w-5 h-5 text-primary focus:ring-primary">
                                    <input type="text" class="edit-option-text flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition" value="${opt.text || ''}" placeholder="Option ${String.fromCharCode(65 + i)}">
                                    <button type="button" class="remove-option-btn p-2 rounded-lg text-gray-500 hover:text-red-600 dark:hover:text-red-400" data-index="${i}" ${options.length <= 2 ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>
                                        <span class="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                    `;
                }
                
                questionHTML += `
                            </div>
                            <button type="button" id="addEditOptionBtn" class="mt-3 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                <span class="material-symbols-outlined text-sm">add</span> Add Option
                            </button>
                        </div>
                `;
            } else if (question.question_type === 'short_answer') {
                questionHTML += `
                        <div class="mb-4">
                            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Correct Answer</label>
                            <input type="text" id="editCorrectAnswer" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition" value="${question.correct_answer || ''}" placeholder="Enter the correct answer">
                        </div>
                `;
            }
        } else {
            // Preview mode: render static HTML
            questionHTML += `
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">${question.question_text}</h3>
            `;
            
            // Display options based on question type or inferred MCQ when options exist
            const isMcq = question.question_type === 'mcq' || question.question_type === 'true_false' || (!question.question_type && question.options && question.options.length > 0);
            if (isMcq) {
                questionHTML += `
                            <div class="space-y-3">
                `;
                
                question.options.forEach((option, index) => {
                    const isCorrect = option.is_correct;
                    questionHTML += `
                                <div class="flex items-center gap-3 p-3 rounded-lg ${isCorrect ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800' : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600'}">
                                    <div class="flex items-center justify-center w-6 h-6 rounded-full ${isCorrect ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}">
                                        ${isCorrect ? '<span class="material-symbols-outlined text-white text-sm">check</span>' : ''}
                                    </div>
                                    <span class="text-gray-800 dark:text-gray-200">${option.text}</span>
                                    ${isCorrect ? '<span class="ml-auto text-xs font-semibold text-green-700 dark:text-green-300">Correct Answer</span>' : ''}
                                </div>
                    `;
                });
                
                questionHTML += `
                            </div>
                `;
            } else if (question.question_type === 'short_answer') {
                questionHTML += `
                            <div class="mt-4 p-4 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                                <p class="text-sm font-semibold text-green-800 dark:text-green-200 mb-1">Correct Answer:</p>
                                <p class="text-gray-800 dark:text-gray-200">${question.correct_answer}</p>
                            </div>
                `;
            }
        }
        
        questionHTML += `
                    </div>
                </div>
            </div>
        `;
        
        // Set the HTML
        questionDisplay.innerHTML = questionHTML;
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([questionDisplay]).catch(() => {});
        }
        
        // Add event listeners for edit mode
        if (isEditMode) {
            // Add option button
            const addEditOptionBtn = document.getElementById('addEditOptionBtn');
            if (addEditOptionBtn) {
                addEditOptionBtn.addEventListener('click', function() {
                    const container = document.getElementById('editOptionsContainer');
                    const optionCount = container.querySelectorAll('.edit-option-text').length;
                    if (optionCount < 6) {
                        const newOptionHtml = `
                            <div class="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                                <input type="radio" name="editCorrectOption" value="${optionCount}" class="w-5 h-5 text-primary focus:ring-primary">
                                <input type="text" class="edit-option-text flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition" placeholder="Option ${String.fromCharCode(65 + optionCount)}">
                                <button type="button" class="remove-option-btn p-2 rounded-lg text-gray-500 hover:text-red-600 dark:hover:text-red-400" data-index="${optionCount}">
                                    <span class="material-symbols-outlined">delete</span>
                                </button>
                            </div>
                        `;
                        container.insertAdjacentHTML('beforeend', newOptionHtml);
                        updateRemoveOptionButtons();
                    }
                });
            }
            
            // Remove option buttons
            document.querySelectorAll('.remove-option-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const container = document.getElementById('editOptionsContainer');
                    if (container.querySelectorAll('.edit-option-text').length > 2) {
                        this.closest('.flex').remove();
                        updateRemoveOptionButtons();
                        updateRadioValues();
                    }
                });
            });
            
            // Question type change handler
            const editQuestionType = document.getElementById('editQuestionType');
            if (editQuestionType) {
                editQuestionType.addEventListener('change', function() {
                    displayQuestionPreview(questions, currentIndex);
                });
            }
        }
        
        // Add event listeners for navigation
        if (prevQuestionBtn) {
            prevQuestionBtn.onclick = function() {
                if (currentIndex > 0) {
                    displayQuestionPreview(questions, currentIndex - 1);
                }
            };
        }
        
        if (nextQuestionBtn) {
            nextQuestionBtn.onclick = function() {
                if (currentIndex < questions.length - 1) {
                    displayQuestionPreview(questions, currentIndex + 1);
                }
            };
        }
        
        // Add Save Question button to the modal if it doesn't exist
        if (!saveQuestionBtn) {
            const modalHeader = questionPreviewModal.querySelector('.sticky');
            if (modalHeader) {
                saveQuestionBtn = document.createElement('button');
                saveQuestionBtn.id = 'saveQuestionFromPreview';
                saveQuestionBtn.className = 'px-4 py-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200';
                saveQuestionBtn.innerHTML = '<span class="material-symbols-outlined">save</span> Save Question';
                saveQuestionBtn.addEventListener('click', saveQuestionFromPreview);
                
                // Insert before the close button
                modalHeader.insertBefore(saveQuestionBtn, modalHeader.lastChild);
            }
        }
        
        // Add Cancel button for edit mode
        let cancelEditBtn = document.getElementById('cancelEditBtn');
        if (isEditMode && !cancelEditBtn) {
            const modalHeader = questionPreviewModal.querySelector('.sticky');
            if (modalHeader) {
                cancelEditBtn = document.createElement('button');
                cancelEditBtn.id = 'cancelEditBtn';
                cancelEditBtn.className = 'px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors mr-2';
                cancelEditBtn.textContent = 'Cancel';
                cancelEditBtn.addEventListener('click', function() {
                    currentEditingQuestionId = null;
                    questionPreviewModal.classList.add('hidden');
                });
                
                // Insert before save button
                modalHeader.insertBefore(cancelEditBtn, saveQuestionBtn);
            }
        } else if (!isEditMode && cancelEditBtn) {
            cancelEditBtn.remove();
        }
        
        // Update save button text based on mode
        if (saveQuestionBtn) {
            saveQuestionBtn.innerHTML = isEditMode ? '<span class="material-symbols-outlined">save</span> Save Changes' : '<span class="material-symbols-outlined">save</span> Save Question';
        }
    }
    
    // Helper function to update remove option buttons
    function updateRemoveOptionButtons() {
        const container = document.getElementById('editOptionsContainer');
        if (container) {
            const options = container.querySelectorAll('.edit-option-text');
            container.querySelectorAll('.remove-option-btn').forEach((btn, index) => {
                btn.disabled = options.length <= 2;
                btn.style.opacity = options.length <= 2 ? '0.5' : '';
                btn.style.cursor = options.length <= 2 ? 'not-allowed' : '';
            });
        }
    }
    
    // Helper function to update radio button values after removing options
    function updateRadioValues() {
        const container = document.getElementById('editOptionsContainer');
        if (container) {
            container.querySelectorAll('input[type="radio"]').forEach((radio, index) => {
                radio.value = index;
            });
            container.querySelectorAll('.remove-option-btn').forEach((btn, index) => {
                btn.dataset.index = index;
            });
        }
    }
    
    // Save question from preview modal
    function saveQuestionFromPreview() {
        // Check if we're in edit mode
        if (currentEditingQuestionId !== null) {
            saveEditedQuestion();
        } else {
            // Trigger the form submission for preview mode
            if (questionForm) {
                questionForm.dispatchEvent(new Event('submit'));
            }
        }
    }
    
    // Save edited question
    function saveEditedQuestion() {
        if (!currentEditingQuestionId) return;
        
        // Find the question in the extractedQuestions array
        const questionIndex = extractedQuestions.findIndex(q => q._extractId === currentEditingQuestionId);
        if (questionIndex === -1) return;
        
        // Get the edited values
        const questionText = document.getElementById('editQuestionText')?.value || '';
        const questionType = document.getElementById('editQuestionType')?.value || 'mcq';
        
        // Validate required fields
        if (!questionText.trim()) {
            if (window.showAlert) {
                window.showAlert({type: 'error', title: 'Validation Error', message: 'Question text is required'});
            } else {
                alert('Question text is required');
            }
            return;
        }
        
        // Update the question
        extractedQuestions[questionIndex].question_text = questionText;
        extractedQuestions[questionIndex].question_type = questionType;
        
        // Handle options based on question type
        if (questionType === 'mcq' || questionType === 'true_false') {
            const optionInputs = document.querySelectorAll('.edit-option-text');
            const correctOptionValue = document.querySelector('input[name="editCorrectOption"]:checked')?.value;
            
            const options = [];
            optionInputs.forEach((input, index) => {
                options.push({
                    text: input.value,
                    is_correct: index.toString() === correctOptionValue
                });
            });
            
            extractedQuestions[questionIndex].options = options;
            delete extractedQuestions[questionIndex].correct_answer;
        } else if (questionType === 'short_answer') {
            const correctAnswer = document.getElementById('editCorrectAnswer')?.value || '';
            extractedQuestions[questionIndex].correct_answer = correctAnswer;
            delete extractedQuestions[questionIndex].options;
        }
        
        // Clear edit mode
        currentEditingQuestionId = null;
        
        // Close the modal
        if (questionPreviewModal) {
            questionPreviewModal.classList.add('hidden');
        }
        
        // Re-render the question cards
        renderExtractedQuestions(extractedQuestions);
        
        // Show success message
        if (window.showAlert) {
            window.showAlert({type: 'success', title: 'Success', message: 'Question updated successfully'});
        } else {
            alert('Question updated successfully');
        }
    }
    
    // Form submission
    if (questionForm) {
        questionForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                const formData = {
                    subject_id: subjectIdInput.value,
                    class_room_id: classRoomIdInput.value,
                    term_id: termSelect?.value,
                    exam_type_id: examTypeSelect?.value,
                    question_type: questionTypeSelect.value,
                    question_text: document.getElementById('questionText').value,
                    options: [],
                    correct_answer: document.getElementById('correctAnswer').value
                };
                
                // Collect options for MCQ and True/False
                if (formData.question_type === 'mcq' || formData.question_type === 'true_false') {
                    const optionElements = optionsList.querySelectorAll('input[type="text"]');
                    const correctOptionValue = document.querySelector('input[name="correctOption"]:checked')?.value;
                    
                    optionElements.forEach((input, index) => {
                        const optionId = optionsList.children[index].querySelector('input[name="correctOption"]').value;
                        formData.options.push({
                            text: input.value,
                            is_correct: optionId === correctOptionValue
                        });
                    });
                }
                
                // Validate required fields
                if (!formData.subject_id || !formData.class_room_id || !formData.term_id || !formData.exam_type_id || !formData.question_type || !formData.question_text) {
                    if (window.showAlert) {
                        window.showAlert({
                            type: 'error',
                            title: 'Validation Error',
                            message: 'Please fill in all required fields.'
                        });
                    } else {
                        alert('Please fill in all required fields.');
                    }
                    return;
                }
                
                // Validate options for MCQ and True/False
                if ((formData.question_type === 'mcq' || formData.question_type === 'true_false') && 
                    (!formData.options.length || !formData.options.some(opt => opt.text.trim() !== ''))) {
                    if (window.showAlert) {
                        window.showAlert({
                            type: 'error',
                            title: 'Validation Error',
                            message: 'Please enter at least one option.'
                        });
                    } else {
                        alert('Please enter at least one option.');
                    }
                    return;
                }
                
                // Validate correct answer for short answer
                if (formData.question_type === 'short_answer' && !formData.correct_answer.trim()) {
                    if (window.showAlert) {
                        window.showAlert({
                            type: 'error',
                            title: 'Validation Error',
                            message: 'Please enter the correct answer.'
                        });
                    } else {
                        alert('Please enter the correct answer.');
                    }
                    return;
                }
                
                // Submit to server
                const response = await fetch('/staff/upload_questions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    if (window.showAlert) {
                        window.showAlert({
                            type: 'success',
                            title: 'Success!',
                            message: 'Question saved successfully!'
                            // Don't reset the form - keep it as is
                        });
                    } else {
                        alert('Question saved successfully!');
                        // Don't reset the form - keep it as is
                    }
                    
                    // Close the preview modal if it's open
                    if (questionPreviewModal) {
                        questionPreviewModal.classList.add('hidden');
                    }
                } else {
                    // Handle unauthorized access specifically
                    if (result.message === "Unauthorized access") {
                        if (window.showAlert) {
                            window.showAlert({
                                type: 'error',
                                title: 'Access Denied',
                                message: 'You do not have permission to upload questions.'
                            });
                        } else {
                            alert('You do not have permission to upload questions.');
                        }
                    } else if (result.message === "You are not assigned to this subject") {
                        if (window.showAlert) {
                            window.showAlert({
                                type: 'error',
                                title: 'Subject Assignment',
                                message: 'You are not assigned to this subject.'
                            });
                        } else {
                            alert('You are not assigned to this subject.');
                        }
                    } else {
                        if (window.showAlert) {
                            window.showAlert({
                                type: 'error',
                                title: 'Error',
                                message: 'Error: ' + result.message
                            });
                        } else {
                            alert('Error: ' + result.message);
                        }
                    }
                }
            } catch (error) {
                console.error('Error:', error);
                if (window.showAlert) {
                    window.showAlert({
                        type: 'error',
                        title: 'Error',
                        message: 'An error occurred while saving the question.'
                    });
                } else {
                    alert('An error occurred while saving the question.');
                }
            }
        });
    }
    
    // Update preview with all questions matching the current criteria
    async function updatePreviewWithAllQuestions() {
        // Get current selection values
        const subjectId = subjectIdInput?.value;
        const classRoomId = classRoomIdInput?.value;
        const termId = termSelect?.value;
        const examTypeId = examTypeSelect?.value;
        
        // Store current selection in hidden inputs
        if (currentSubjectId) currentSubjectId.value = subjectId;
        if (currentClassRoomId) currentClassRoomId.value = classRoomId;
        if (currentTermId) currentTermId.value = termId;
        if (currentExamTypeId) currentExamTypeId.value = examTypeId;
        
        // If all required fields are selected, fetch questions
        if (subjectId && classRoomId && termId && examTypeId) {
            try {
                const response = await fetch(`/staff/questions_preview?subject_id=${subjectId}&class_room_id=${classRoomId}&term_id=${termId}&exam_type_id=${examTypeId}`);
                const result = await response.json();
                
                if (result.success && result.questions && result.questions.length > 0) {
                    displayQuestionPreview(result.questions, 0);
                    if (questionPreviewModal) {
                        questionPreviewModal.classList.remove('hidden');
                    }
                } else {
                    if (window.showAlert) {
                        window.showAlert({
                            type: 'info',
                            title: 'No Questions',
                            message: 'No questions found matching the selected criteria.'
                        });
                    } else {
                        alert('No questions found matching the selected criteria.');
                    }
                }
            } catch (error) {
                console.error('Error fetching questions:', error);
                if (window.showAlert) {
                    window.showAlert({
                        type: 'error',
                        title: 'Error',
                        message: 'Failed to load questions preview.'
                    });
                } else {
                    alert('Failed to load questions preview.');
                }
            }
        }
    }
    
    // Reset form
    if (resetFormBtn) {
        resetFormBtn.addEventListener('click', resetForm);
    }
    
    function resetForm() {
        if (questionForm) {
            questionForm.reset();
        }
        if (subjectIdInput) subjectIdInput.value = '';
        if (classRoomIdInput) classRoomIdInput.value = '';
        if (optionsList) {
            optionsList.innerHTML = '';
        }
        if (optionsContainer) {
            optionsContainer.classList.add('hidden');
        }
        if (shortAnswerContainer) {
            shortAnswerContainer.classList.add('hidden');
        }
        if (addOptionBtn) {
            addOptionBtn.disabled = false;
            addOptionBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        if (questionPreviewModal) {
            questionPreviewModal.classList.add('hidden');
        }
    }

    // Close preview modal functionality
    if (closePreviewModal) {
        closePreviewModal.addEventListener('click', function() {
            if (questionPreviewModal) {
                questionPreviewModal.classList.add('hidden');
            }
        });
    }
    
    // Close modal when clicking outside
    if (questionPreviewModal) {
        questionPreviewModal.addEventListener('click', function(e) {
            if (e.target === this) {
                questionPreviewModal.classList.add('hidden');
            }
        });
    }
    
    // Close modal on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && questionPreviewModal && !questionPreviewModal.classList.contains('hidden')) {
            questionPreviewModal.classList.add('hidden');
        }
    });



    // AI Chat Interface Functionality

    const aiChatFileUploadBtn = document.getElementById('aiChatFileUploadBtn');

    const aiChatFileInput = document.getElementById('aiChatFileInput');

    const chatFileChips = document.getElementById('chatFileChips');

    const chatFilePreview = document.getElementById('chatFilePreview');

    const aiChatInput = document.getElementById('aiChatInput');

    const aiChatSendBtn = document.getElementById('aiChatSendBtn');

    const chatMessages = document.getElementById('chatMessages');

    const chatEmptyState = document.getElementById('chatEmptyState');

    const wsQuestionList = document.getElementById('wsQuestionList');

    const wsEmptyState = document.getElementById('wsEmptyState');

    const wsQuestionCount = document.getElementById('wsQuestionCount');

    const wsSaveBtn = document.getElementById('wsSaveBtn');

    const wsExportBtn = document.getElementById('wsExportBtn');

    const wsExportModal = document.getElementById('wsExportModal');

    const closeExportModal = document.getElementById('closeExportModal');

    const exportPdfBtn = document.getElementById('exportPdfBtn');

    const exportDocxBtn = document.getElementById('exportDocxBtn');

    const aiChatClearBtn = document.getElementById('aiChatClearBtn');

    let uploadedFiles = [];

    let workspaceQuestions = [];

    let conversationHistory = [];



    // File upload handler

    if (aiChatFileUploadBtn && aiChatFileInput) {

        aiChatFileUploadBtn.addEventListener('click', function() {

            aiChatFileInput.click();

        });



        aiChatFileInput.addEventListener('change', function(e) {

            const files = Array.from(e.target.files);

            files.forEach(file => {

                uploadedFiles.push(file);

                addFileToList(file);

            });

        });

    }



    function addFileToList(file) {

        if (!chatFileChips) return;



        const fileItem = document.createElement('div');

        fileItem.className = 'flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm border border-blue-200 dark:border-blue-800';

        fileItem.innerHTML = `

            <span class="material-symbols-outlined text-base text-blue-600 dark:text-blue-400">description</span>

            <span class="text-blue-700 dark:text-blue-300 truncate max-w-32">${file.name}</span>

            <button type="button" class="remove-file text-blue-500 hover:text-red-600 dark:hover:text-red-400" data-name="${file.name}">

                <span class="material-symbols-outlined text-base">close</span>

            </button>

        `;



        fileItem.querySelector('.remove-file').addEventListener('click', function() {

            uploadedFiles = uploadedFiles.filter(f => f.name !== file.name);

            fileItem.remove();

            if (uploadedFiles.length === 0 && chatFilePreview) {

                chatFilePreview.classList.add('hidden');

            }

        });



        chatFileChips.appendChild(fileItem);

        if (chatFilePreview) {

            chatFilePreview.classList.remove('hidden');

        }

    }



    // Send message handler

    if (aiChatSendBtn && aiChatInput && chatMessages) {

        aiChatSendBtn.addEventListener('click', sendAiChatMessage);

        aiChatInput.addEventListener('keypress', function(e) {

            if (e.key === 'Enter' && !e.shiftKey) {

                e.preventDefault();

                sendAiChatMessage();

            }

        });

    }



    async function sendAiChatMessage() {

        const instruction = aiChatInput.value.trim();

        if (!instruction && uploadedFiles.length === 0) return;



        // Hide empty state

        if (chatEmptyState) {

            chatEmptyState.classList.add('hidden');

        }



        // Add user message to chat

        addChatMessage('user', instruction, uploadedFiles);



        // Add to conversation history

        conversationHistory.push({ type: 'user', content: instruction });



        // Clear input

        aiChatInput.value = '';

        aiChatInput.style.height = 'auto';



        // Clear uploaded files

        uploadedFiles = [];

        if (chatFileChips) chatFileChips.innerHTML = '';

        if (chatFilePreview) chatFilePreview.classList.add('hidden');



        // Add loading message

        const loadingId = addChatMessage('system', 'Processing your request...');



        try {

            // Prepare form data

            const formData = new FormData();

            uploadedFiles.forEach(file => {

                formData.append('files', file);

            });

            formData.append('instruction', instruction);

            formData.append('conversation_history', JSON.stringify(conversation_history));



            // Send to backend

            const response = await fetch('/staff/ai_chat_generate', {

                method: 'POST',

                body: formData

            });



            const result = await response.json();



            // Remove loading message

            removeChatMessage(loadingId);



            if (result.success) {

                // Add AI response to chat

                addChatMessage('ai', result.message || 'Questions generated successfully!');



                // Add to conversation history

                conversationHistory.push({ type: 'ai', content: result.message });



                // Render questions in workspace

                if (result.questions && result.questions.length > 0) {

                    renderWorkspaceQuestions(result.questions);

                }

            } else {

                addChatMessage('system', 'Error: ' + (result.error || 'Failed to generate questions'));

            }



        } catch (error) {

            removeChatMessage(loadingId);

            addChatMessage('system', 'Error: ' + error.message);

        }

    }



    function addChatMessage(type, content, data = null) {

        if (!chatMessages) return null;



        const messageId = 'msg-' + Date.now();

        const messageDiv = document.createElement('div');

        messageDiv.id = messageId;

        messageDiv.className = 'mb-4';



        if (type === 'user') {

            messageDiv.innerHTML = `

                <div class="flex justify-end">

                    <div class="max-w-[80%] bg-primary text-white rounded-2xl rounded-tr-sm px-4 py-3">

                        <p>${content}</p>

                        ${data && data.length > 0 ? `<div class="mt-2 text-xs opacity-75">${data.length} file(s) attached</div>` : ''}

                    </div>

                </div>

            `;

        } else if (type === 'ai') {

            messageDiv.innerHTML = `

                <div class="flex justify-start">

                    <div class="flex items-start gap-3 max-w-[80%]">

                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white flex-shrink-0">

                            <span class="material-symbols-outlined text-sm">smart_toy</span>

                        </div>

                        <div class="bg-white dark:bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 border border-gray-200 dark:border-gray-600">

                            <p class="text-gray-900 dark:text-white">${content}</p>

                            ${data && data.length > 0 ? `<div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600"><p class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">${data.length} question(s) generated:</p></div>` : ''}

                        </div>

                    </div>

                </div>

            `;

        } else if (type === 'system') {

            messageDiv.innerHTML = `

                <div class="flex justify-center">

                    <div class="bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400">

                        ${content}

                    </div>

                </div>

            `;

        }



        chatMessages.appendChild(messageDiv);

        chatMessages.scrollTop = chatMessages.scrollHeight;



        return messageId;

    }



    function removeChatMessage(messageId) {

        const messageElement = document.getElementById(messageId);

        if (messageElement) {

            messageElement.remove();

        }

    }



    // Workspace Functions

    function renderWorkspaceQuestions(questions) {

        if (!wsQuestionList) return;



        // Add questions to workspace

        workspaceQuestions = [...workspaceQuestions, ...questions];

        updateWorkspaceUI();

    }



    function updateWorkspaceUI() {

        if (!wsQuestionList || !wsEmptyState || !wsQuestionCount) return;



        // Update question count

        wsQuestionCount.textContent = workspaceQuestions.length > 0 ? `${workspaceQuestions.length} question(s)` : 'No questions yet';



        // Show/hide empty state

        if (workspaceQuestions.length > 0) {

            wsEmptyState.classList.add('hidden');

        } else {

            wsEmptyState.classList.remove('hidden');

        }



        // Clear and render questions

        wsQuestionList.innerHTML = '';



        workspaceQuestions.forEach((question, index) => {

            const card = createQuestionCard(question, index);

            wsQuestionList.appendChild(card);

        });



        // Render MathJax

        if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {

            MathJax.typesetPromise([wsQuestionList]).catch((err) => console.log('MathJax error:', err));

        }

    }



    function createQuestionCard(question, index) {

        const card = document.createElement('div');

        card.className = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm';

        card.dataset.index = index;



        const isMCQ = question.question_type === 'mcq';



        card.innerHTML = `

            <div class="flex items-start gap-3 mb-3">

                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center justify-center">${index + 1}</span>

                <div class="flex-1">

                    <div class="flex items-center gap-2 mb-2">

                        <select class="question-type text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-blue-400">

                            <option value="mcq" ${isMCQ ? 'selected' : ''}>MCQ</option>

                            <option value="short_answer" ${!isMCQ ? 'selected' : ''}>Short Answer</option>

                        </select>

                        <button class="delete-question text-gray-400 hover:text-red-500 transition-colors" title="Delete question">

                            <span class="material-symbols-outlined text-base">delete</span>

                        </button>

                    </div>

                    <textarea class="question-text w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-400 resize-none" rows="2" placeholder="Question text">${question.question_text || ''}</textarea>

                </div>

            </div>

            ${isMCQ ? `

                <div class="options-container ml-9 space-y-2">

                    ${(question.options || []).map((opt, optIndex) => `

                        <div class="option-item flex items-center gap-2">

                            <input type="radio" name="correct-${index}" class="correct-option flex-shrink-0" ${opt.is_correct ? 'checked' : ''}>

                            <input type="text" class="option-text flex-1 text-xs px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-400" value="${opt.text || ''}" placeholder="Option text">

                            <button class="remove-option text-gray-400 hover:text-red-500 transition-colors" title="Remove option">

                                <span class="material-symbols-outlined text-sm">close</span>

                            </button>

                        </div>

                    `).join('')}

                    <button class="add-option text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1 mt-2">

                        <span class="material-symbols-outlined text-sm">add</span> Add Option

                    </button>

                </div>

            ` : `

                <div class="ml-9">

                    <input type="text" class="correct-answer w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-400" value="${question.correct_answer || ''}" placeholder="Correct answer">

                </div>

            `}

        `;



        // Add event listeners

        const deleteBtn = card.querySelector('.delete-question');

        if (deleteBtn) {

            deleteBtn.addEventListener('click', () => {

                workspaceQuestions.splice(index, 1);

                updateWorkspaceUI();

            });

        }



        const questionText = card.querySelector('.question-text');

        if (questionText) {

            questionText.addEventListener('input', (e) => {

                workspaceQuestions[index].question_text = e.target.value;

            });

        }



        const typeSelect = card.querySelector('.question-type');

        if (typeSelect) {

            typeSelect.addEventListener('change', (e) => {

                workspaceQuestions[index].question_type = e.target.value;

                if (e.target.value === 'mcq' && !workspaceQuestions[index].options) {

                    workspaceQuestions[index].options = [{ text: '', is_correct: false }, { text: '', is_correct: false }];

                }

                updateWorkspaceUI();

            });

        }



        // Option handlers

        const addOptionBtn = card.querySelector('.add-option');

        if (addOptionBtn) {

            addOptionBtn.addEventListener('click', () => {

                if (!workspaceQuestions[index].options) {

                    workspaceQuestions[index].options = [];

                }

                workspaceQuestions[index].options.push({ text: '', is_correct: false });

                updateWorkspaceUI();

            });

        }



        card.querySelectorAll('.remove-option').forEach((btn, optIndex) => {

            btn.addEventListener('click', () => {

                workspaceQuestions[index].options.splice(optIndex, 1);

                updateWorkspaceUI();

            });

        });



        card.querySelectorAll('.option-text').forEach((input, optIndex) => {

            input.addEventListener('input', (e) => {

                workspaceQuestions[index].options[optIndex].text = e.target.value;

            });

        });



        card.querySelectorAll('.correct-option').forEach((radio, optIndex) => {

            radio.addEventListener('change', (e) => {

                workspaceQuestions[index].options.forEach((opt, i) => {

                    opt.is_correct = (i === optIndex);

                });

            });

        });



        const correctAnswer = card.querySelector('.correct-answer');

        if (correctAnswer) {

            correctAnswer.addEventListener('input', (e) => {

                workspaceQuestions[index].correct_answer = e.target.value;

            });

        }



        return card;

    }



    // Save functionality (staff version - no teacher selection)

    if (wsSaveBtn) {

        wsSaveBtn.addEventListener('click', async () => {

            const classSubject = document.getElementById('wsClassSubject')?.value;

            const termId = document.getElementById('wsTerm')?.value;

            const examTypeId = document.getElementById('wsExamType')?.value;



            if (!classSubject || !termId || !examTypeId) {

                alert('Please select class & subject, term, and exam type before saving.');

                return;

            }



            if (workspaceQuestions.length === 0) {

                alert('No questions to save.');

                return;

            }



            const [classRoomId, subjectId] = classSubject.split('-');



            const payload = {

                subject_id: subjectId,

                class_room_id: classRoomId,

                term_id: termId,

                exam_type_id: examTypeId,

                questions: workspaceQuestions

            };



            try {

                wsSaveBtn.disabled = true;

                wsSaveBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">refresh</span> Saving...';



                const response = await fetch('/staff/create_questions_from_json', {

                    method: 'POST',

                    headers: { 'Content-Type': 'application/json' },

                    body: JSON.stringify(payload)

                });



                const result = await response.json();



                if (result.success) {

                    alert('Questions saved successfully!');

                    workspaceQuestions = [];

                    updateWorkspaceUI();

                } else {

                    alert('Error: ' + (result.message || 'Failed to save questions'));

                }

            } catch (error) {

                alert('Error: ' + error.message);

            } finally {

                wsSaveBtn.disabled = false;

                wsSaveBtn.innerHTML = '<span class="material-symbols-outlined text-base">save</span><span class="hidden sm:inline">Save All</span>';

            }

        });

    }



    // Export functionality

    if (wsExportBtn && wsExportModal) {

        wsExportBtn.addEventListener('click', () => {

            wsExportModal.classList.remove('hidden');

        });



        if (closeExportModal) {

            closeExportModal.addEventListener('click', () => {

                wsExportModal.classList.add('hidden');

            });

        }



        if (exportPdfBtn) {

            exportPdfBtn.addEventListener('click', () => {

                alert('PDF export will be implemented server-side.');

                wsExportModal.classList.add('hidden');

            });

        }



        if (exportDocxBtn) {

            exportDocxBtn.addEventListener('click', () => {

                alert('DOCX export will be implemented server-side.');

                wsExportModal.classList.add('hidden');

            });

        }

    }



    // Clear conversation

    if (aiChatClearBtn) {

        aiChatClearBtn.addEventListener('click', () => {

            conversationHistory = [];

            workspaceQuestions = [];

            if (chatMessages) {

                chatMessages.innerHTML = '';

                chatMessages.appendChild(chatEmptyState);

                chatEmptyState.classList.remove('hidden');

            }

            updateWorkspaceUI();

        });

    }



    // Quick prompt handlers

    document.querySelectorAll('.ai-quick-prompt').forEach(btn => {

        btn.addEventListener('click', () => {

            const prompt = btn.dataset.prompt;

            if (aiChatInput) {

                aiChatInput.value = prompt;

                sendAiChatMessage();

            }

        });

    });



    // Auto-grow textarea

    if (aiChatInput) {

        aiChatInput.addEventListener('input', function() {

            this.style.height = 'auto';

            this.style.height = Math.min(this.scrollHeight, 120) + 'px';

        });

    }

});
