"""
Service to send files to Gemini for question extraction.

The service supports progress callbacks so the caller can stream live updates
to the UI while extraction is running.
"""
import json
import os
import time
import traceback

from pathlib import Path

# Optional dependencies
try:
    import google.genai as genai
    GENAI_AVAILABLE = True
    USE_GOOGLE_GENAI = True
except Exception:
    try:
        import google.generativeai as genai
        GENAI_AVAILABLE = True
        USE_GOOGLE_GENAI = False
    except Exception:
        GENAI_AVAILABLE = False
        USE_GOOGLE_GENAI = False

try:
    from pdf2image import convert_from_path
    import pytesseract
    PIL_AVAILABLE = True
except Exception:
    PIL_AVAILABLE = False

from utils.docx_parser import parse_docx_questions

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

ALLOWED_EXT = {"pdf", "docx", "png", "jpg", "jpeg", "tiff"}

STAGE_LABELS = {
    "initializing-model-pipeline": "Initializing model pipeline",
    "processing-input-text": "Processing input text",
    "extracting-core-question-entities": "Extracting core question entities",
    "generating-structured-question-output": "Generating structured question output",
}


def _build_model_payload(name=None, provider=None, identifier=None):
    model_name = name or "Pending model selection"
    return {
        "name": model_name,
        "identifier": identifier or model_name,
        "provider": provider or "Gemini",
    }


def _emit_progress(progress_callback, **payload):
    if not progress_callback:
        return
    payload.setdefault("event", "milestone")
    payload.setdefault("timestamp", time.time())
    stage_id = payload.get("stage_id")
    if stage_id and not payload.get("stage_label"):
        payload["stage_label"] = STAGE_LABELS.get(stage_id, stage_id)
    progress_callback(payload)


def _run_ocr_on_image(path):
    """Return extracted text from an image file path using pytesseract.
    Returns extracted text or raises RuntimeError if OCR not available.
    """
    if not PIL_AVAILABLE:
        raise RuntimeError("OCR dependencies not installed (pytesseract/pdf2image)")

    from PIL import Image

    text = ""
    try:
        img = Image.open(path)
        text = pytesseract.image_to_string(img)
    except Exception:
        # try pdf conversion
        try:
            pages = convert_from_path(path)
            for p in pages:
                text += pytesseract.image_to_string(p)
        except Exception:
            raise

    return text


def _build_prompt(custom_prompt=None):
    base = (
        "Extract all questions from the provided document. Return ONLY a valid JSON array "
        "with no additional text or markdown. Each element must be an object with these fields:\n"
        "- question_text (string): The question\n"
        "- question_type (string, optional): Preferably 'mcq' or 'short_answer'. "
        "True/False should be represented as an MCQ with two options.\n"
        "- options (array): For MCQ, array of {text, is_correct}. Empty for short_answer.\n"
        "- correct_answer (string): For short_answer only, the correct answer text.\n"
        "- has_math (boolean): True if the question contains LaTeX math notation.\n"
        "- context (string, optional): Any tables, figures, formulas, diagrams, or context needed for the question.\n\n"
        "If a question depends on a table, formula, rule, diagram, or any other supporting information, "
        "include that dependency in the context field. For each question type:\n"
        "- MCQ: at least 3 options, exactly one marked is_correct=true\n"
        "- True/False: represent as MCQ with exactly 2 options, one marked is_correct=true\n"
        "- short_answer: no options, provide the correct_answer\n\n"
        "Return ONLY the JSON array, no markdown code blocks, no extra text."
    )
    if custom_prompt:
        return base + f"\n\nAdditional instruction: {custom_prompt}"
    return base


def _infer_question_type(q):
    qtype = (q.get("question_type") or "").strip().lower()
    if qtype == "true_false":
        return "mcq"
    if qtype in ["mcq", "short_answer"]:
        return qtype
    options = q.get("options") or []
    if options:
        return "mcq"
    if q.get("correct_answer"):
        return "short_answer"
    return "mcq"


def _call_gemini_api(file_path, prompt, progress_callback=None):
    """Call Gemini and report progress as milestones.

    Returns a tuple of (parsed_json, model_name) or raises on error.
    """
    if not GENAI_AVAILABLE:
        raise RuntimeError("Google Gemini SDK is required to call Gemini API")

    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY environment variable is not set")

    _emit_progress(
        progress_callback,
        stage_id="initializing-model-pipeline",
        progress=8,
        message="Initializing Gemini client and selecting an extraction model.",
        status="running",
    )

    # Configure the API / client
    if USE_GOOGLE_GENAI:
        client = genai.Client(api_key=GEMINI_API_KEY)
    else:
        genai.configure(api_key=GEMINI_API_KEY)

    # Determine the model to use (allow overriding via env var). Use a smaller model by default.
    default_model = os.environ.get("GEMINI_MODEL")
    model_candidates = []
    if default_model:
        model_candidates.append(default_model)
    model_candidates.extend([
        "gemini-2.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash",
    ])
    # Preserve order and remove duplicates
    seen = set()
    model_candidates = [m for m in model_candidates if m and m not in seen and not seen.add(m)]
    model_name = model_candidates[0] if model_candidates else None

    _emit_progress(
        progress_callback,
        event="model",
        stage_id="initializing-model-pipeline",
        progress=12,
        status="running",
        message="Model pipeline ready. Preparing the active Gemini model.",
        model=_build_model_payload(model_name, provider="Google Gemini"),
    )

    def _discover_fallback_models(client):
        """List available models from the API and return as strings."""
        models_list = []
        try:
            if hasattr(client, 'models') and hasattr(client.models, 'list'):
                resp = client.models.list()
                models_list = getattr(resp, 'models', resp)
            elif hasattr(client, 'list_models'):
                resp = client.list_models()
                models_list = resp.get('models', resp)
        except Exception:
            models_list = []

        discovered = []
        for m in models_list or []:
            if isinstance(m, str):
                discovered.append(m)
            elif isinstance(m, dict):
                mid = m.get('name') or m.get('id')
                if mid:
                    discovered.append(mid)
            else:
                mid = getattr(m, 'name', None) or getattr(m, 'id', None)
                if mid:
                    discovered.append(mid)
        return discovered

    def _next_model_name(current_name, client):
        for candidate in model_candidates:
            if candidate != current_name:
                return candidate

        discovered = _discover_fallback_models(client)
        # Update the model list with the available ones
        for look in ("gemini-2.5-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash",):
            for candidate in discovered:
                if look in candidate:
                    return candidate
        for candidate in discovered:
            if candidate != current_name:
                return candidate
        return None
 
    file_path_obj = Path(file_path)
    ext = file_path_obj.suffix.lower().lstrip('.')

    if USE_GOOGLE_GENAI:
        last_exc = None
        max_retries = 4
        for attempt in range(max_retries):
            try:
                _emit_progress(
                    progress_callback,
                    stage_id="initializing-model-pipeline",
                    progress=20,
                    status="running",
                    message=f"Uploading source file for {model_name}.",
                    model=_build_model_payload(model_name, provider="Google Gemini"),
                )
                client_file = client.files.upload(file=file_path)
                _emit_progress(
                    progress_callback,
                    stage_id="processing-input-text",
                    progress=40,
                    status="running",
                    message="Source file uploaded. Gemini is processing the document contents.",
                    model=_build_model_payload(model_name, provider="Google Gemini"),
                )
                _emit_progress(
                    progress_callback,
                    stage_id="extracting-core-question-entities",
                    progress=64,
                    status="running",
                    message="Gemini is extracting the core question entities from the processed content.",
                    model=_build_model_payload(model_name, provider="Google Gemini"),
                )
                response = client.models.generate_content(
                    model=model_name,
                    contents=[prompt, client_file],
                )
                _emit_progress(
                    progress_callback,
                    stage_id="extracting-core-question-entities",
                    progress=78,
                    status="running",
                    message="Gemini returned extraction output. Refining the recovered question entities.",
                    model=_build_model_payload(model_name, provider="Google Gemini"),
                )
                last_exc = None
                break
            except Exception as e:
                last_exc = e
                msg = str(e).lower()
                should_retry = False
                retry_reason = "temporary model workload delay"
                if ('not found' in msg or 'models/' in msg or 'not_found' in msg):
                    next_model = _next_model_name(model_name, client)
                    if next_model and next_model != model_name:
                        _emit_progress(
                            progress_callback,
                            event="model",
                            stage_id="initializing-model-pipeline",
                            progress=18,
                            status="running",
                            message=f"Current model unavailable. Switching extraction to {next_model}.",
                            model=_build_model_payload(next_model, provider="Google Gemini"),
                        )
                        model_name = next_model
                        should_retry = True
                        retry_reason = "model unavailable, switching models"
                elif ('unavailable' in msg or 'high demand' in msg or '503' in msg or '429' in msg or 'rate limit' in msg):
                    next_model = _next_model_name(model_name, client)
                    if next_model and next_model != model_name:
                        _emit_progress(
                            progress_callback,
                            event="model",
                            stage_id="processing-input-text",
                            progress=32,
                            status="running",
                            message=f"Active model is under heavy load. Retrying with {next_model}.",
                            model=_build_model_payload(next_model, provider="Google Gemini"),
                        )
                        model_name = next_model
                        should_retry = True
                        retry_reason = "high demand, switching models"
                    else:
                        should_retry = True
                        retry_reason = "high demand, retrying current model"
                if hasattr(genai, 'errors') and getattr(genai, 'errors') is not None:
                    genai_errors = genai.errors
                    if isinstance(e, getattr(genai_errors, 'ServerError', Exception)):
                        should_retry = True
                        retry_reason = "transient Gemini server error"
                if isinstance(e, (ConnectionError, TimeoutError, OSError)):
                    should_retry = True
                    retry_reason = "network interruption"

                if not should_retry:
                    raise

                if attempt < max_retries - 1:
                    _emit_progress(
                        progress_callback,
                        event="heartbeat",
                        stage_id="processing-input-text",
                        progress=30,
                        status="waiting",
                        message=f"Extraction paused due to {retry_reason}. Retrying shortly.",
                        model=_build_model_payload(model_name, provider="Google Gemini"),
                    )
                    time.sleep(2 ** attempt)
                    continue
                else:
                    break
        if last_exc:
            raise last_exc
    else:
        mime_type_map = {
            'pdf': 'application/pdf',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'tiff': 'image/tiff',
            'gif': 'image/gif'
        }
        mime_type = mime_type_map.get(ext, 'application/octet-stream')

        last_exc = None
        max_retries = 4
        for attempt in range(max_retries):
            try:
                _emit_progress(
                    progress_callback,
                    stage_id="initializing-model-pipeline",
                    progress=20,
                    status="running",
                    message=f"Uploading source file for {model_name}.",
                    model=_build_model_payload(model_name, provider="Google Gemini"),
                )
                uploaded_file = genai.upload_file(file_path, mime_type=mime_type)
                _emit_progress(
                    progress_callback,
                    stage_id="processing-input-text",
                    progress=40,
                    status="running",
                    message="Source file uploaded. Gemini is processing the document contents.",
                    model=_build_model_payload(model_name, provider="Google Gemini"),
                )
                _emit_progress(
                    progress_callback,
                    stage_id="extracting-core-question-entities",
                    progress=64,
                    status="running",
                    message="Gemini is extracting the core question entities from the processed content.",
                    model=_build_model_payload(model_name, provider="Google Gemini"),
                )
                model = genai.GenerativeModel(model_name=model_name)
                response = model.generate_content([
                    prompt,
                    uploaded_file
                ])
                _emit_progress(
                    progress_callback,
                    stage_id="extracting-core-question-entities",
                    progress=78,
                    status="running",
                    message="Gemini returned extraction output. Refining the recovered question entities.",
                    model=_build_model_payload(model_name, provider="Google Gemini"),
                )
                last_exc = None
                break
            except Exception as e:
                last_exc = e
                msg = str(e).lower()
                should_retry = False
                retry_reason = "temporary model workload delay"
                if ('not found' in msg or 'models/' in msg or 'not_found' in msg):
                    next_model = _next_model_name(model_name, client)
                    if next_model and next_model != model_name:
                        _emit_progress(
                            progress_callback,
                            event="model",
                            stage_id="initializing-model-pipeline",
                            progress=18,
                            status="running",
                            message=f"Current model unavailable. Switching extraction to {next_model}.",
                            model=_build_model_payload(next_model, provider="Google Gemini"),
                        )
                        model_name = next_model
                        should_retry = True
                        retry_reason = "model unavailable, switching models"
                elif ('unavailable' in msg or 'high demand' in msg or '503' in msg or '429' in msg or 'rate limit' in msg):
                    next_model = _next_model_name(model_name, client)
                    if next_model and next_model != model_name:
                        _emit_progress(
                            progress_callback,
                            event="model",
                            stage_id="processing-input-text",
                            progress=32,
                            status="running",
                            message=f"Active model is under heavy load. Retrying with {next_model}.",
                            model=_build_model_payload(next_model, provider="Google Gemini"),
                        )
                        model_name = next_model
                        should_retry = True
                        retry_reason = "high demand, switching models"
                    else:
                        should_retry = True
                        retry_reason = "high demand, retrying current model"
                if isinstance(e, (ConnectionError, TimeoutError, OSError)):
                    should_retry = True
                    retry_reason = "network interruption"

                if not should_retry:
                    raise

                if attempt < max_retries - 1:
                    _emit_progress(
                        progress_callback,
                        event="heartbeat",
                        stage_id="processing-input-text",
                        progress=30,
                        status="waiting",
                        message=f"Extraction paused due to {retry_reason}. Retrying shortly.",
                        model=_build_model_payload(model_name, provider="Google Gemini"),
                    )
                    time.sleep(2 ** attempt)
                    continue
                else:
                    break
        if last_exc:
            raise last_exc

    response_text = getattr(response, 'text', None)
    if response_text is None:
        response_text = str(response)

    _emit_progress(
        progress_callback,
        stage_id="generating-structured-question-output",
        progress=86,
        status="running",
        message="Generating structured JSON output from the extracted content.",
        model=_build_model_payload(model_name, provider="Google Gemini"),
    )

    try:
        if '```json' in response_text:
            json_str = response_text.split('```json')[1].split('```')[0].strip()
            result = json.loads(json_str)
        elif '```' in response_text:
            json_str = response_text.split('```')[1].split('```')[0].strip()
            result = json.loads(json_str)
        else:
            result = json.loads(response_text)
    except json.JSONDecodeError:
        raise ValueError(f"Gemini response was not valid JSON: {response_text[:200]}")

    _emit_progress(
        progress_callback,
        stage_id="generating-structured-question-output",
        progress=92,
        status="running",
        message="Structured question output generated successfully.",
        model=_build_model_payload(model_name, provider="Google Gemini"),
    )
    return result, model_name


def extract_questions_from_file(file_path, custom_prompt=None, progress_callback=None):
    """Extract questions from a file by sending it to Gemini (or falling back to local parsing).

    Returns a tuple of (questions, error, model_name).
    """
    try:
        path = Path(file_path)
        ext = path.suffix.lower().lstrip('.')
        if ext not in ALLOWED_EXT:
            return None, f"Unsupported file type: {ext}", None

        _emit_progress(
            progress_callback,
            stage_id="initializing-model-pipeline",
            progress=4,
            status="running",
            message=f"Validating {ext.upper()} input and preparing extraction pipeline.",
        )
        prompt = _build_prompt(custom_prompt)
        _emit_progress(
            progress_callback,
            stage_id="initializing-model-pipeline",
            progress=6,
            status="running",
            message="Prompt prepared. Waiting for the active extraction model.",
        )

        if GEMINI_API_KEY and GENAI_AVAILABLE:
            try:
                resp, used_model = _call_gemini_api(str(path), prompt, progress_callback=progress_callback)
                if isinstance(resp, dict) and resp.get("questions"):
                    questions = resp.get("questions")
                elif isinstance(resp, list):
                    questions = resp
                else:
                    return None, "Gemini returned unexpected format (not list or dict with 'questions' key)", None

                _emit_progress(
                    progress_callback,
                    stage_id="generating-structured-question-output",
                    progress=96,
                    status="running",
                    message="Normalizing extracted questions for the staff review workflow.",
                    model=_build_model_payload(used_model, provider="Google Gemini"),
                )
                normalized = _normalize_questions(questions)
                return normalized, None, used_model
            except Exception as e:
                traceback.print_exc()
                return None, f"Gemini extraction failed: {str(e)}", None

        if ext == 'docx':
            _emit_progress(
                progress_callback,
                event="model",
                stage_id="initializing-model-pipeline",
                progress=12,
                status="running",
                message="Gemini is unavailable. Falling back to the local DOCX parser.",
                model=_build_model_payload("Local DOCX Parser", provider="CBT Mini School"),
            )
            with open(file_path, 'rb') as f:
                content = f.read()
            _emit_progress(
                progress_callback,
                stage_id="processing-input-text",
                progress=48,
                status="running",
                message="Parsing document text from the DOCX file locally.",
                model=_build_model_payload("Local DOCX Parser", provider="CBT Mini School"),
            )
            questions = parse_docx_questions(content)
            _emit_progress(
                progress_callback,
                stage_id="generating-structured-question-output",
                progress=96,
                status="running",
                message="DOCX parsing completed. Preparing structured question output.",
                model=_build_model_payload("Local DOCX Parser", provider="CBT Mini School"),
            )
            return questions, None, None

        if ext in ('png', 'jpg', 'jpeg', 'tiff', 'pdf'):
            try:
                _emit_progress(
                    progress_callback,
                    event="model",
                    stage_id="initializing-model-pipeline",
                    progress=12,
                    status="running",
                    message="Gemini is unavailable. Falling back to the local OCR pipeline.",
                    model=_build_model_payload("Local OCR Pipeline", provider="CBT Mini School"),
                )
                _emit_progress(
                    progress_callback,
                    stage_id="processing-input-text",
                    progress=46,
                    status="running",
                    message="Running OCR on the uploaded file to recover the source text.",
                    model=_build_model_payload("Local OCR Pipeline", provider="CBT Mini School"),
                )
                text = _run_ocr_on_image(file_path)
                _emit_progress(
                    progress_callback,
                    stage_id="generating-structured-question-output",
                    progress=96,
                    status="running",
                    message="OCR completed. Preparing extracted content for review.",
                    model=_build_model_payload("Local OCR Pipeline", provider="CBT Mini School"),
                )
                return [{
                    'question_text': text.strip()[:500] if text.strip() else 'Could not extract text from image',
                    'question_type': 'short_answer',
                    'options': [],
                    'correct_answer': '',
                    'has_math': False
                }], None, None
            except Exception as e:
                traceback.print_exc()
                return None, f"OCR/processing error: {str(e)}", None

        return None, "Unable to process file and Gemini API not configured", None
    except Exception as e:
        traceback.print_exc()
        return None, str(e), None


def generate_questions_from_prompt(custom_prompt, progress_callback=None):
    """Generate questions from a text prompt (no file uploaded).

    Returns a tuple of (questions, error, model_name).
    """
    try:
        _emit_progress(
            progress_callback,
            stage_id="initializing-model-pipeline",
            progress=10,
            status="running",
            message="Initializing prompt-based generation pipeline.",
        )
        prompt = _build_prompt(custom_prompt)

        if not GENAI_AVAILABLE:
            return None, "Google Gemini SDK is required to call Gemini API", None

        if not GEMINI_API_KEY:
            return None, "GEMINI_API_KEY environment variable is not set", None

        # Configure client
        if USE_GOOGLE_GENAI:
            client = genai.Client(api_key=GEMINI_API_KEY)
        else:
            genai.configure(api_key=GEMINI_API_KEY)

        # Model selection
        default_model = os.environ.get("GEMINI_MODEL")
        model_candidates = []
        if default_model:
            model_candidates.append(default_model)
        model_candidates.extend([
            "gemini-2.5-flash",
            "gemini-3.1-flash-lite",
            "gemini-3.5-flash",
        ])
        seen = set()
        model_candidates = [m for m in model_candidates if m and m not in seen and not seen.add(m)]
        model_name = model_candidates[0]

        _emit_progress(
            progress_callback,
            event="model",
            stage_id="initializing-model-pipeline",
            progress=30,
            status="running",
            message="Generating questions from instructions.",
            model=_build_model_payload(model_name, provider="Google Gemini"),
        )

        _emit_progress(
            progress_callback,
            stage_id="generating-structured-question-output",
            progress=60,
            status="running",
            message="Waiting for Gemini API generation response.",
            model=_build_model_payload(model_name, provider="Google Gemini"),
        )

        # Generate content
        if USE_GOOGLE_GENAI:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
        else:
            model = genai.GenerativeModel(model_name=model_name)
            response = model.generate_content(prompt)

        response_text = getattr(response, 'text', None)
        if response_text is None:
            response_text = str(response)

        _emit_progress(
            progress_callback,
            stage_id="generating-structured-question-output",
            progress=85,
            status="running",
            message="Parsing Gemini response.",
            model=_build_model_payload(model_name, provider="Google Gemini"),
        )

        try:
            if '```json' in response_text:
                json_str = response_text.split('```json')[1].split('```')[0].strip()
                result = json.loads(json_str)
            elif '```' in response_text:
                json_str = response_text.split('```')[1].split('```')[0].strip()
                result = json.loads(json_str)
            else:
                result = json.loads(response_text)
        except json.JSONDecodeError:
            return None, f"Gemini response was not valid JSON: {response_text[:200]}", model_name

        if isinstance(result, dict) and result.get("questions"):
            questions = result.get("questions")
        elif isinstance(result, list):
            questions = result
        else:
            return None, "Gemini returned unexpected format", model_name

        normalized = _normalize_questions(questions)
        return normalized, None, model_name

    except Exception as e:
        traceback.print_exc()
        return None, str(e), None


def _normalize_questions(questions):
    """Normalize a list of extracted questions to the app's expected format."""
    normalized = []
    for q in questions:
        nq = {
            "question_text": q.get("question_text") or q.get("text") or "",
            "question_type": _infer_question_type(q),
            "options": [],
            "correct_answer": q.get("correct_answer", ""),
            "has_math": q.get("has_math", False),
            "question_image": q.get("question_image"),
            "context": q.get("context")
        }
        opts = q.get("options") or []
        for opt in opts:
            if isinstance(opt, dict):
                normalized_opt = {"text": opt.get("text", ""), "is_correct": bool(opt.get("is_correct", False))}
            else:
                normalized_opt = {"text": str(opt), "is_correct": False}
            nq["options"].append(normalized_opt)
        normalized.append(nq)
    return normalized

