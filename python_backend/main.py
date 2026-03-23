import asyncio
import json
import logging
import os
import queue
import time
from collections import defaultdict, deque
from functools import partial
from pathlib import Path

import numpy as np
import ollama
import requests
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio
from starlette.concurrency import run_in_threadpool
from starlette.types import ASGIApp, Message, Receive, Scope, Send


def _load_cors_origins():
    raw_origins = os.getenv("CORS_ALLOW_ORIGINS")
    if not raw_origins:
        # Safe local defaults for development.
        return ["http://localhost:3000", "http://127.0.0.1:3000"]

    origins = [origin.strip().rstrip("/") for origin in raw_origins.split(",") if origin.strip()]
    if "*" in origins:
        raise ValueError("CORS_ALLOW_ORIGINS cannot include '*' when allow_credentials=True.")
    return origins


ALLOWED_CORS_ORIGINS = _load_cors_origins()

app = FastAPI()


class VoiceAssistant:
    def __init__(self):
        self.whisper_model = WhisperModel("tiny", device="auto")
        self.sample_rate = 16000
        self.channels = 1
        self.dtype = np.float32
        self.block_size = 2048
        self.silence_threshold = 0.001
        self.silence_duration = 2
        self.last_sound = time.time()
        self.audio_buffer = []
        self.audio_queue = queue.Queue()
        self.is_recording = False
        self.debug = True


assistant = VoiceAssistant()

# Configurable service endpoints
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
SPRING_API_BASE = os.getenv("SPRING_API_BASE", "http://localhost:8080/api/v1")
AUTH_CHECK_TIMEOUT_SECONDS = float(os.getenv("AUTH_CHECK_TIMEOUT_SECONDS", "5"))
GRADING_PERSIST_TIMEOUT_SECONDS = float(os.getenv("GRADING_PERSIST_TIMEOUT_SECONDS", "5"))
MAX_AUDIO_UPLOAD_SIZE_BYTES = int(os.getenv("MAX_AUDIO_UPLOAD_SIZE_BYTES", str(10 * 1024 * 1024)))
MAX_AUDIO_DURATION_SECONDS = float(os.getenv("MAX_AUDIO_DURATION_SECONDS", "300"))
AUDIO_UPLOAD_CHUNK_SIZE_BYTES = 1024 * 1024
MAX_REQUEST_BODY_SIZE_BYTES = int(
    os.getenv("MAX_REQUEST_BODY_SIZE_BYTES", str(MAX_AUDIO_UPLOAD_SIZE_BYTES + (1024 * 1024)))
)
MAX_JSON_BODY_SIZE_BYTES = int(os.getenv("MAX_JSON_BODY_SIZE_BYTES", str(256 * 1024)))
MAX_ROLE_LENGTH = int(os.getenv("MAX_ROLE_LENGTH", "120"))
MAX_TOPIC_LENGTH = int(os.getenv("MAX_TOPIC_LENGTH", "160"))
MAX_SHORT_TEXT_LENGTH = int(os.getenv("MAX_SHORT_TEXT_LENGTH", "500"))
MAX_ADDITIONAL_CONTEXT_LENGTH = int(os.getenv("MAX_ADDITIONAL_CONTEXT_LENGTH", "1000"))
MAX_TRANSCRIPT_LENGTH = int(os.getenv("MAX_TRANSCRIPT_LENGTH", "12000"))
MAX_PREVIOUS_QA_ITEMS = int(os.getenv("MAX_PREVIOUS_QA_ITEMS", "5"))
RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
RATE_LIMIT_TRANSCRIPTION_PER_WINDOW = int(os.getenv("RATE_LIMIT_TRANSCRIPTION_PER_WINDOW", "10"))
RATE_LIMIT_DRILL_GENERATION_PER_WINDOW = int(
    os.getenv("RATE_LIMIT_DRILL_GENERATION_PER_WINDOW", "12")
)
RATE_LIMIT_DRILL_EVALUATION_PER_WINDOW = int(
    os.getenv("RATE_LIMIT_DRILL_EVALUATION_PER_WINDOW", "20")
)
RATE_LIMIT_QUESTION_GENERATION_PER_WINDOW = int(
    os.getenv("RATE_LIMIT_QUESTION_GENERATION_PER_WINDOW", "10")
)
RATE_LIMIT_ACK_PER_WINDOW = int(os.getenv("RATE_LIMIT_ACK_PER_WINDOW", "30"))
RATE_LIMIT_GRADING_PER_WINDOW = int(os.getenv("RATE_LIMIT_GRADING_PER_WINDOW", "12"))
AI_CONCURRENCY_LIMIT = int(os.getenv("AI_CONCURRENCY_LIMIT", "4"))
AI_CONCURRENCY_ACQUIRE_TIMEOUT_SECONDS = float(
    os.getenv("AI_CONCURRENCY_ACQUIRE_TIMEOUT_SECONDS", "2")
)
CSRF_COOKIE_NAME = "XSRF-TOKEN"
CSRF_HEADER_NAME = "X-XSRF-TOKEN"
ALLOWED_AUDIO_CONTENT_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/x-m4a",
    "audio/ogg",
    "audio/flac",
}
ALLOWED_AUDIO_EXTENSIONS = {".webm", ".wav", ".mp3", ".m4a", ".mp4", ".ogg", ".flac"}
logger = logging.getLogger(__name__)

ollama_client = ollama.Client(host=OLLAMA_HOST)
ai_request_semaphore = asyncio.Semaphore(AI_CONCURRENCY_LIMIT)


class RequestBodyTooLargeError(Exception):
    def __init__(self, limit_bytes):
        super().__init__(f"Request body exceeds the {limit_bytes} byte limit.")
        self.limit_bytes = limit_bytes


class MaxBodySizeMiddleware:
    def __init__(self, app: ASGIApp, default_limit_bytes: int, json_limit_bytes: int):
        self.app = app
        self.default_limit_bytes = default_limit_bytes
        self.json_limit_bytes = json_limit_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = {
            raw_name.decode("latin-1").lower(): raw_value.decode("latin-1")
            for raw_name, raw_value in scope.get("headers", [])
        }
        content_type = headers.get("content-type", "").split(";", 1)[0].strip().lower()
        limit_bytes = (
            self.json_limit_bytes if content_type == "application/json" else self.default_limit_bytes
        )

        if limit_bytes <= 0:
            await self.app(scope, receive, send)
            return

        content_length = headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > limit_bytes:
                    await self._send_json_error(
                        send,
                        status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        f"Request body exceeds the {limit_bytes} byte limit.",
                    )
                    return
            except ValueError:
                await self._send_json_error(
                    send,
                    status.HTTP_400_BAD_REQUEST,
                    "Invalid Content-Length header.",
                )
                return

        bytes_seen = 0

        async def limited_receive() -> Message:
            nonlocal bytes_seen
            message = await receive()
            if message["type"] == "http.request":
                bytes_seen += len(message.get("body", b""))
                if bytes_seen > limit_bytes:
                    raise RequestBodyTooLargeError(limit_bytes)
            return message

        try:
            await self.app(scope, limited_receive, send)
        except RequestBodyTooLargeError as exc:
            await self._send_json_error(
                send,
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                f"Request body exceeds the {exc.limit_bytes} byte limit.",
            )

    async def _send_json_error(self, send: Send, status_code: int, detail: str):
        payload = json.dumps({"detail": detail}).encode("utf-8")
        await send(
            {
                "type": "http.response.start",
                "status": status_code,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(payload)).encode("ascii")),
                ],
            }
        )
        await send({"type": "http.response.body", "body": payload})


class SlidingWindowRateLimiter:
    def __init__(self):
        self._events = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def hit(self, bucket: str, subject: str, limit: int, window_seconds: int):
        if limit <= 0:
            return None

        now = time.monotonic()
        window_start = now - window_seconds
        key = (bucket, subject)

        async with self._lock:
            bucket_events = self._events[key]
            while bucket_events and bucket_events[0] <= window_start:
                bucket_events.popleft()

            if len(bucket_events) >= limit:
                return max(1, int(window_seconds - (now - bucket_events[0])) + 1)

            bucket_events.append(now)
            return None


rate_limiter = SlidingWindowRateLimiter()

# Allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    MaxBodySizeMiddleware,
    default_limit_bytes=MAX_REQUEST_BODY_SIZE_BYTES,
    json_limit_bytes=MAX_JSON_BODY_SIZE_BYTES,
)


def _coerce_score(value):
    try:
        score = float(value)
    except (TypeError, ValueError):
        return 0
    if score < 0:
        return 0
    if score > 100:
        return 100
    return int(round(score))


async def _parse_json_request(request: Request):
    try:
        payload = await request.json()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON body.",
        )

    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="JSON body must be an object.",
        )

    return payload


def _normalize_text_field(value, field_name, *, default="", max_length=MAX_SHORT_TEXT_LENGTH):
    if value is None:
        return default
    if not isinstance(value, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be a string.",
        )

    normalized = value.strip()
    if len(normalized) > max_length:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"{field_name} exceeds the {max_length} character limit.",
        )
    return normalized


def _normalize_string_list_field(
    value,
    field_name,
    *,
    max_items,
    max_item_length,
):
    if value is None:
        return []
    if not isinstance(value, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be a list of strings.",
        )
    if len(value) > max_items:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"{field_name} exceeds the {max_items} item limit.",
        )

    normalized = []
    for item in value:
        if not isinstance(item, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{field_name} must contain only strings.",
            )
        stripped = item.strip()
        if len(stripped) > max_item_length:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"{field_name} items exceed the {max_item_length} character limit.",
            )
        normalized.append(stripped)
    return normalized


def _normalize_optional_positive_int(value, field_name):
    if value in (None, ""):
        return None
    try:
        normalized = int(value)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be a positive integer.",
        )

    if normalized <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be a positive integer.",
        )
    return normalized


def _get_request_subject(request: Request, authenticated_user):
    if isinstance(authenticated_user, dict):
        for key in ("email", "id", "username"):
            value = authenticated_user.get(key)
            if value:
                return f"user:{value}"

    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        client_ip = forwarded_for.split(",", 1)[0].strip()
        if client_ip:
            return f"ip:{client_ip}"

    if request.client and request.client.host:
        return f"ip:{request.client.host}"

    return "ip:unknown"


async def _enforce_rate_limit(request: Request, authenticated_user, bucket: str, limit: int):
    subject = _get_request_subject(request, authenticated_user)
    retry_after = await rate_limiter.hit(bucket, subject, limit, RATE_LIMIT_WINDOW_SECONDS)
    if retry_after is not None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please retry later.",
            headers={"Retry-After": str(retry_after)},
        )
    return authenticated_user


def _rate_limited_auth_dependency(bucket: str, limit: int):
    async def dependency(
        request: Request,
        authenticated_user: dict = Depends(require_authenticated_user),
    ):
        return await _enforce_rate_limit(request, authenticated_user, bucket, limit)

    return dependency


async def _run_ai_call(callable_obj):
    acquired = False
    try:
        await asyncio.wait_for(
            ai_request_semaphore.acquire(),
            timeout=AI_CONCURRENCY_ACQUIRE_TIMEOUT_SECONDS,
        )
        acquired = True
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The AI service is busy. Please retry shortly.",
        )

    try:
        return await run_in_threadpool(callable_obj)
    finally:
        if acquired:
            ai_request_semaphore.release()


def _transcribe_audio_file(tmp_path):
    decoded_audio = decode_audio(tmp_path, sampling_rate=assistant.sample_rate)
    duration_seconds = len(decoded_audio) / assistant.sample_rate
    if duration_seconds > MAX_AUDIO_DURATION_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Audio duration exceeds the {MAX_AUDIO_DURATION_SECONDS:.0f} second limit.",
        )

    segments, _ = assistant.whisper_model.transcribe(tmp_path)
    return "".join(seg.text for seg in segments).strip()


def _build_internal_auth_headers(request: Request):
    headers = {"Content-Type": "application/json"}
    cookies = {}

    auth_header = request.headers.get("authorization")
    if auth_header:
        headers["Authorization"] = auth_header

    csrf_header = request.headers.get(CSRF_HEADER_NAME)
    if csrf_header:
        headers[CSRF_HEADER_NAME] = csrf_header

    token_cookie = request.cookies.get("token")
    if token_cookie:
        cookies["token"] = token_cookie

    csrf_cookie = request.cookies.get(CSRF_COOKIE_NAME)
    if csrf_cookie:
        cookies[CSRF_COOKIE_NAME] = csrf_cookie
        headers.setdefault(CSRF_HEADER_NAME, csrf_cookie)

    return headers, cookies


def _parse_model_json_content(content):
    """
    Parse model output that should contain JSON, with tolerance for markdown wrappers
    or extra surrounding text.
    """
    if isinstance(content, (dict, list)):
        return content
    if not isinstance(content, str):
        raise ValueError("Model response content is not JSON-parseable text.")

    text = content.strip()
    attempts = []

    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    attempts.append(text)

    obj_start = text.find("{")
    obj_end = text.rfind("}")
    if obj_start != -1 and obj_end > obj_start:
        attempts.append(text[obj_start : obj_end + 1])

    arr_start = text.find("[")
    arr_end = text.rfind("]")
    if arr_start != -1 and arr_end > arr_start:
        attempts.append(text[arr_start : arr_end + 1])

    for candidate in attempts:
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, list) and parsed and isinstance(parsed[0], dict):
                return parsed[0]
            return parsed
        except (TypeError, ValueError, json.JSONDecodeError):
            continue

    raise ValueError("Unable to parse model response as JSON.")


def _normalize_grading_result(raw_result, questions, answers):
    """
    Enforce a strict grading payload shape aligned to the provided interview input.
    This prevents model-added/example answers from being persisted as extra Q/A rows.
    """
    raw_scores = raw_result.get("scores", []) if isinstance(raw_result, dict) else []
    if not isinstance(raw_scores, list):
        raw_scores = []

    used_indices = set()
    normalized_scores = []

    for i, (question, answer) in enumerate(zip(questions, answers)):
        selected = None

        # Highest confidence match: same question and same answer.
        for idx, entry in enumerate(raw_scores):
            if idx in used_indices or not isinstance(entry, dict):
                continue
            if entry.get("question") == question and entry.get("answer") == answer:
                selected = entry
                used_indices.add(idx)
                break

        # Fallback: match by question text only.
        if selected is None:
            for idx, entry in enumerate(raw_scores):
                if idx in used_indices or not isinstance(entry, dict):
                    continue
                if entry.get("question") == question:
                    selected = entry
                    used_indices.add(idx)
                    break

        # Final fallback: positional entry.
        if selected is None and i < len(raw_scores) and isinstance(raw_scores[i], dict):
            selected = raw_scores[i]

        normalized_entry = {
            "question": question,
            "answer": answer,
            "score": _coerce_score(selected.get("score") if selected else 0),
        }

        if selected and isinstance(selected.get("feedback"), str):
            normalized_entry["feedback"] = selected["feedback"]

        normalized_scores.append(normalized_entry)

    feedback = ""
    if isinstance(raw_result, dict) and isinstance(raw_result.get("feedback"), str):
        feedback = raw_result.get("feedback", "")

    average_score = 0.0
    if normalized_scores:
        average_score = round(
            sum(item["score"] for item in normalized_scores) / len(normalized_scores), 1
        )

    return {
        "scores": normalized_scores,
        "average_score": average_score,
        "feedback": feedback,
    }


COMMUNICATION_CATEGORY_LABELS = {
    "clarity": "Clarity",
    "correctness": "Correctness",
    "depth": "Depth",
    "audience_fit": "Audience fit",
}


def _display_label(value):
    if not isinstance(value, str):
        return ""
    return value.replace("-", " ").strip()


def _display_practice_mode(practice_mode):
    labels = {
        "explain-concept": "Explain a concept",
        "explain-decision": "Explain a decision",
        "explain-tradeoff": "Explain a tradeoff",
    }
    return labels.get(practice_mode, "Practice session")


def _normalize_string_list(value, limit=4):
    if not isinstance(value, list):
        return []
    normalized = []
    for item in value:
        if isinstance(item, str):
            stripped = item.strip()
            if stripped:
                normalized.append(stripped)
        if len(normalized) >= limit:
            break
    return normalized


def _normalize_generated_prompt(raw_prompt, field, practice_mode, audience, topic):
    prompt = raw_prompt if isinstance(raw_prompt, dict) else {}
    resolved_topic = (
        prompt.get("topic").strip()
        if isinstance(prompt.get("topic"), str) and prompt.get("topic").strip()
        else topic.strip()
        if isinstance(topic, str) and topic.strip()
        else f"{field.lower()} communication scenario"
    )
    audience_label = (
        prompt.get("audience").strip()
        if isinstance(prompt.get("audience"), str) and prompt.get("audience").strip()
        else _display_label(audience).title()
    )

    default_cover = [
        "Lead with the core point",
        "Explain the mechanism or decision clearly",
        "Name the most important tradeoff or implication",
    ]
    what_to_cover = _normalize_string_list(prompt.get("what_to_cover"), limit=4) or default_cover
    focus_areas = _normalize_string_list(prompt.get("focus_areas"), limit=4) or [
        "Clarity",
        "Correctness",
        "Depth",
        "Audience fit",
    ]

    return {
        "title": prompt.get("title").strip()
        if isinstance(prompt.get("title"), str) and prompt.get("title").strip()
        else f"{field} • {_display_practice_mode(practice_mode)}",
        "scenario": prompt.get("scenario").strip()
        if isinstance(prompt.get("scenario"), str) and prompt.get("scenario").strip()
        else f"You are explaining {resolved_topic} to a {audience_label.lower()}.",
        "prompt": prompt.get("prompt").strip()
        if isinstance(prompt.get("prompt"), str) and prompt.get("prompt").strip()
        else f"Explain {resolved_topic} to a {audience_label.lower()} in a way that is clear, technically accurate, and useful.",
        "audience": audience_label,
        "practice_mode": practice_mode,
        "field": field,
        "topic": resolved_topic,
        "what_to_cover": what_to_cover,
        "time_guidance": prompt.get("time_guidance").strip()
        if isinstance(prompt.get("time_guidance"), str) and prompt.get("time_guidance").strip()
        else "Aim for 60 to 90 seconds.",
        "focus_areas": focus_areas,
    }


def _normalize_communication_grading_result(raw_result):
    if not isinstance(raw_result, dict):
        raw_result = {}

    raw_categories = raw_result.get("categories", [])
    if not isinstance(raw_categories, list):
        raw_categories = []

    categories = []
    for key, label in COMMUNICATION_CATEGORY_LABELS.items():
        selected = next(
            (
                entry
                for entry in raw_categories
                if isinstance(entry, dict) and entry.get("key") == key
            ),
            {},
        )
        categories.append(
            {
                "key": key,
                "label": label,
                "score": _coerce_score(selected.get("score")),
                "feedback": selected.get("feedback").strip()
                if isinstance(selected.get("feedback"), str) and selected.get("feedback").strip()
                else f"No specific {label.lower()} feedback was returned.",
            }
        )

    overall_score = raw_result.get("overall_score")
    if not isinstance(overall_score, (int, float)):
        overall_score = round(sum(category["score"] for category in categories) / len(categories), 1)
    overall_score = _coerce_score(overall_score)

    strengths = _normalize_string_list(raw_result.get("strengths"), limit=4)
    missing_points = _normalize_string_list(raw_result.get("missing_points"), limit=4)
    improved_outline = _normalize_string_list(raw_result.get("improved_outline"), limit=5)
    retry_advice = raw_result.get("retry_advice")
    feedback = raw_result.get("feedback")

    return {
        "overall_score": overall_score,
        "average_score": overall_score,
        "categories": categories,
        "strengths": strengths,
        "missing_points": missing_points,
        "improved_outline": improved_outline,
        "retry_advice": retry_advice.strip()
        if isinstance(retry_advice, str) and retry_advice.strip()
        else "Retry the answer once more, but make the structure more explicit and surface the key tradeoff sooner.",
        "feedback": feedback.strip()
        if isinstance(feedback, str) and feedback.strip()
        else "The answer was scored on clarity, correctness, depth, and audience fit.",
    }


async def _persist_grading_result(session_id, result, request: Request):
    if not session_id:
        return

    headers, cookies = _build_internal_auth_headers(request)
    try:
        grading_update_response = await run_in_threadpool(
            partial(
                requests.put,
                f"{SPRING_API_BASE}/interviews/{session_id}/grading",
                json={"gradingResult": result},
                headers=headers,
                cookies=cookies,
                timeout=GRADING_PERSIST_TIMEOUT_SECONDS,
            )
        )
        if grading_update_response.status_code != 200:
            logger.warning(
                "Failed to save grading result for session %s: %s",
                session_id,
                grading_update_response.text,
            )
    except Exception:
        logger.exception("Failed to save grading result for session %s.", session_id)


def require_authenticated_user(request: Request):
    auth_header = request.headers.get("authorization")
    token_cookie = request.cookies.get("token")

    if not auth_header and not token_cookie:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    headers = {}
    cookies = {}
    if auth_header:
        headers["Authorization"] = auth_header
    if token_cookie:
        cookies["token"] = token_cookie

    try:
        auth_response = requests.get(
            f"{SPRING_API_BASE}/user/me",
            headers=headers,
            cookies=cookies,
            timeout=AUTH_CHECK_TIMEOUT_SECONDS,
        )
    except requests.RequestException:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable.",
        )

    if auth_response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized.",
        )

    try:
        authenticated_user = auth_response.json()
    except ValueError:
        authenticated_user = {"authenticated": True}

    request.state.authenticated_user = authenticated_user
    return authenticated_user


require_transcription_user = _rate_limited_auth_dependency(
    "transcription",
    RATE_LIMIT_TRANSCRIPTION_PER_WINDOW,
)
require_generate_drill_user = _rate_limited_auth_dependency(
    "generate_drill",
    RATE_LIMIT_DRILL_GENERATION_PER_WINDOW,
)
require_evaluate_drill_user = _rate_limited_auth_dependency(
    "evaluate_drill",
    RATE_LIMIT_DRILL_EVALUATION_PER_WINDOW,
)
require_generate_questions_user = _rate_limited_auth_dependency(
    "generate_questions",
    RATE_LIMIT_QUESTION_GENERATION_PER_WINDOW,
)
require_interview_ack_user = _rate_limited_auth_dependency(
    "interview_ack",
    RATE_LIMIT_ACK_PER_WINDOW,
)
require_grade_interview_user = _rate_limited_auth_dependency(
    "grade_interview",
    RATE_LIMIT_GRADING_PER_WINDOW,
)

@app.post("/transcription")
async def transcription(
    audio: UploadFile = File(...),
    _: dict = Depends(require_transcription_user),
):
    import tempfile

    tmp_path = None
    try:
        content_type = (audio.content_type or "").split(";")[0].strip().lower()
        if content_type not in ALLOWED_AUDIO_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Unsupported audio type.",
            )

        file_extension = Path(audio.filename or "").suffix.lower()
        if file_extension and file_extension not in ALLOWED_AUDIO_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Unsupported audio file extension.",
            )

        total_size = 0
        with tempfile.NamedTemporaryFile(suffix=file_extension or ".webm", delete=False) as tmp:
            tmp_path = tmp.name
            while True:
                chunk = await audio.read(AUDIO_UPLOAD_CHUNK_SIZE_BYTES)
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > MAX_AUDIO_UPLOAD_SIZE_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Audio file exceeds the {MAX_AUDIO_UPLOAD_SIZE_BYTES} byte limit.",
                    )
                tmp.write(chunk)

        if total_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded audio file is empty.",
            )

        try:
            transcription = await _run_ai_call(partial(_transcribe_audio_file, tmp_path))
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to decode uploaded audio. Ensure the file is valid.",
            )

        return {"user_input": transcription}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unexpected error while processing transcription request.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to process transcription request.",
        )
    finally:
        await audio.close()
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.post("/generate_drill")
async def generate_drill(
    request: Request,
    _: dict = Depends(require_generate_drill_user),
):
    data = await _parse_json_request(request)
    field = _normalize_text_field(
        data.get("field"),
        "field",
        default="Software Engineer",
        max_length=MAX_ROLE_LENGTH,
    )
    practice_mode = _normalize_text_field(
        data.get("practice_mode"),
        "practice_mode",
        default="explain-concept",
        max_length=MAX_SHORT_TEXT_LENGTH,
    )
    audience = _normalize_text_field(
        data.get("audience"),
        "audience",
        default="peer-engineer",
        max_length=MAX_SHORT_TEXT_LENGTH,
    )
    topic = _normalize_text_field(
        data.get("topic"),
        "topic",
        default="",
        max_length=MAX_TOPIC_LENGTH,
    )
    additional_context = _normalize_text_field(
        data.get("additional_context"),
        "additional_context",
        default="",
        max_length=MAX_ADDITIONAL_CONTEXT_LENGTH,
    )
    difficulty = _normalize_text_field(
        data.get("difficulty"),
        "difficulty",
        default="mid",
        max_length=MAX_SHORT_TEXT_LENGTH,
    )

    generation_prompt = f"""
You are designing a high-quality technical communication drill for developers.

Return a JSON object with exactly these keys:
- title
- scenario
- prompt
- audience
- topic
- what_to_cover (array of 3-4 short strings)
- time_guidance
- focus_areas (array of 4 strings)

Drill inputs:
- field: {field}
- practice_mode: {practice_mode}
- audience: {audience}
- topic preference: {topic or "let the coach choose"}
- extra context: {additional_context or "none"}
- experience level: {difficulty}

Rules:
- The drill must sound like a real engineering communication moment, not a classroom quiz.
- Keep the prompt answerable in 60 to 90 seconds.
- Match the audience difficulty. A non-technical stakeholder needs a different framing than a senior engineer.
- If no topic is provided, choose a realistic topic from the field.
- "focus_areas" must be these exact values in this order: ["Clarity", "Correctness", "Depth", "Audience fit"].
- Do not return markdown. Return valid JSON only.
"""

    response = await _run_ai_call(
        lambda: ollama_client.chat(
            model='mistral',
            format='json',
            messages=[
                {
                    "role": "system",
                    "content": "You create concise, realistic technical communication drills for developers. Always return valid JSON.",
                },
                {"role": "user", "content": generation_prompt},
            ],
        )
    )

    try:
        result = _parse_model_json_content(response['message']['content'])
    except Exception:
        logger.exception("Failed to parse generated drill response.")
        result = {}

    return _normalize_generated_prompt(result, field, practice_mode, audience, topic)


@app.post("/evaluate_drill")
async def evaluate_drill(
    request: Request,
    _: dict = Depends(require_evaluate_drill_user),
):
    data = await _parse_json_request(request)
    field = _normalize_text_field(
        data.get("field"),
        "field",
        default="Software Engineer",
        max_length=MAX_ROLE_LENGTH,
    )
    practice_mode = _normalize_text_field(
        data.get("practice_mode"),
        "practice_mode",
        default="explain-concept",
        max_length=MAX_SHORT_TEXT_LENGTH,
    )
    audience = _normalize_text_field(
        data.get("audience"),
        "audience",
        default="peer-engineer",
        max_length=MAX_SHORT_TEXT_LENGTH,
    )
    topic = _normalize_text_field(
        data.get("topic"),
        "topic",
        default="",
        max_length=MAX_TOPIC_LENGTH,
    )
    additional_context = _normalize_text_field(
        data.get("additional_context"),
        "additional_context",
        default="",
        max_length=MAX_ADDITIONAL_CONTEXT_LENGTH,
    )
    generated_prompt = _normalize_generated_prompt(
        data.get("generated_prompt", {}),
        field,
        practice_mode,
        audience,
        topic,
    )
    transcript = _normalize_text_field(
        data.get("transcript"),
        "transcript",
        default="",
        max_length=MAX_TRANSCRIPT_LENGTH,
    )
    session_id = _normalize_optional_positive_int(data.get("session_id"), "session_id")

    if not isinstance(transcript, str) or not transcript.strip():
        return {"error": "A transcript is required to evaluate the drill."}

    evaluation_prompt = f"""
You are an expert technical communication coach for developers.

You are evaluating a spoken answer. Score it on:
- clarity
- correctness
- depth
- audience_fit

Drill context:
- field: {field}
- practice mode: {_display_practice_mode(practice_mode)}
- audience: {_display_label(audience)}
- topic: {generated_prompt.get("topic")}
- scenario: {generated_prompt.get("scenario")}
- prompt: {generated_prompt.get("prompt")}
- what the answer should cover: {generated_prompt.get("what_to_cover")}
- extra context: {additional_context or "none"}

Transcript:
{transcript}

Return valid JSON with exactly these keys:
- overall_score (number 0-100)
- categories (array of 4 objects with keys: key, score, feedback)
- strengths (array of 2-4 strings)
- missing_points (array of 2-4 strings)
- improved_outline (array of 3-5 strings)
- retry_advice (string)
- feedback (string)

Rules:
- categories must contain exactly these keys in this order: clarity, correctness, depth, audience_fit
- be strict but fair
- reward explanations that lead with the point, stay technically accurate, and match the audience
- penalize vague explanations, missing tradeoffs, technical inaccuracies, and audience mismatch
- do not include markdown
"""

    response = None
    for attempt in range(2):
        response = await _run_ai_call(
            lambda: ollama_client.chat(
                model='mistral',
                format='json',
                messages=[
                    {
                        "role": "system",
                        "content": "You are a strict, fair technical communication coach. Always return valid JSON.",
                    },
                    {"role": "user", "content": evaluation_prompt},
                ],
            )
        )

        try:
            result = _parse_model_json_content(response['message']['content'])
            result = _normalize_communication_grading_result(result)
            await _persist_grading_result(session_id, result, request)
            return result
        except Exception:
            logger.exception(
                "Failed to parse technical drill evaluation on attempt %s. Content preview: %s",
                attempt + 1,
                str(response.get('message', {}).get('content', ''))[:500],
            )

    fallback = _normalize_communication_grading_result({})
    await _persist_grading_result(session_id, fallback, request)
    return fallback

@app.post("/generate_questions")
async def generate_questions(
    request: Request,
    _: dict = Depends(require_generate_questions_user),
):
    data = await _parse_json_request(request)
    role = _normalize_text_field(
        data.get("role"),
        "role",
        default="",
        max_length=MAX_ROLE_LENGTH,
    )
    focus_areas = _normalize_string_list_field(
        data.get("languages"),
        "languages",
        max_items=10,
        max_item_length=MAX_SHORT_TEXT_LENGTH,
    )
    difficulty = _normalize_text_field(
        data.get("difficulty"),
        "difficulty",
        default="",
        max_length=MAX_SHORT_TEXT_LENGTH,
    )
    topic = _normalize_text_field(
        data.get("topic"),
        "topic",
        default="",
        max_length=MAX_TOPIC_LENGTH,
    )
    additional_context = _normalize_text_field(
        data.get("additional_context"),
        "additional_context",
        default="",
        max_length=MAX_ADDITIONAL_CONTEXT_LENGTH,
    )
    prompt = (
        f"You are an expert behavioral interviewer. Generate 5 unique behavioral interview questions "
        f"for a {role} position. Focus on these competency areas: {', '.join(focus_areas)}. "
        f"The questions should be appropriate for a {difficulty} level candidate. "
        f"Topic preference: {topic or 'let the interviewer choose based on the role and focus areas'}. "
        f"Extra context: {additional_context or 'none'}. "
        f"Ask about past experiences, judgment, collaboration, ownership, and learning. "
        f"Do not ask trivia-style or coding questions. "
        f"If a topic preference is provided, make it meaningfully influence the questions without making every question identical. "
        f"Use the extra context to ground the scenarios when it helps. "
        f"Return only the questions as a numbered list."
    )
    response = await _run_ai_call(
        lambda: ollama_client.chat(
            model='mistral',
            messages=[
                {"role": "system", "content": "You are an expert behavioral interviewer that generates interview questions."},
                {"role": "user", "content": prompt}
            ],
        )
    )
    questions = response['message']['content']
    return {"questions": questions}

@app.post("/interview_ack")
async def interview_ack(
    request: Request,
    _: dict = Depends(require_interview_ack_user),
):
    data = await _parse_json_request(request)
    current_question = _normalize_text_field(
        data.get("current_question"),
        "current_question",
        default="",
        max_length=MAX_SHORT_TEXT_LENGTH,
    )
    user_answer = _normalize_text_field(
        data.get("user_answer"),
        "user_answer",
        default="",
        max_length=MAX_TRANSCRIPT_LENGTH,
    )
    previous_qa = data.get("previous_qa", [])
    if not isinstance(previous_qa, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="previous_qa must be a list.",
        )
    if len(previous_qa) > MAX_PREVIOUS_QA_ITEMS:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"previous_qa exceeds the {MAX_PREVIOUS_QA_ITEMS} item limit.",
        )

    normalized_previous_qa = []
    for index, qa in enumerate(previous_qa):
        if not isinstance(qa, dict):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="previous_qa must contain question and answer objects.",
            )
        normalized_previous_qa.append(
            {
                "question": _normalize_text_field(
                    qa.get("question"),
                    f"previous_qa[{index}].question",
                    default="",
                    max_length=MAX_SHORT_TEXT_LENGTH,
                ),
                "answer": _normalize_text_field(
                    qa.get("answer"),
                    f"previous_qa[{index}].answer",
                    default="",
                    max_length=MAX_TRANSCRIPT_LENGTH,
                ),
            }
        )

    previous_qa = normalized_previous_qa
    next_question = _normalize_text_field(
        data.get("next_question"),
        "next_question",
        default="",
        max_length=MAX_SHORT_TEXT_LENGTH,
    )
    is_last_question = bool(data.get("is_last_question", False))
    
    # Build context from previous Q&A
    context = ""
    if previous_qa:
        context = "Previous Q&A:\n" + "\n".join([f"Q: {qa['question']}\nA: {qa['answer']}" for qa in previous_qa])
    
    if is_last_question:
        # Generate final acknowledgement and goodbye
        prompt = f"""You are an expert behavioral interviewer. The candidate just answered the final question.

        Current question: {current_question}
        Candidate's answer: {user_answer}
        {context}

        Generate a brief, warm, professional acknowledgement of their answer (1-2 sentences) and a friendly goodbye message (1 sentence). Return as JSON:
                {{"acknowledgement": "your acknowledgement here", "goodbye": "your goodbye message here"}}"""
    else:
        # Generate acknowledgement and provide next question
        prompt = f"""You are an expert behavioral interviewer that is very thorough. The candidate just answered a question.

        Current question: {current_question}
        Candidate's answer: {user_answer}
        {context}
        Next question: {next_question}

        Generate a brief, professional acknowledgement of their answer (1-2 sentences) that references specific details from their response when possible. Return as JSON:
                {{"acknowledgement": "your acknowledgement here", "next_question": "{next_question}"}}"""
            
    response = await _run_ai_call(
        lambda: ollama_client.chat(
            model='mistral',
            format='json',
            messages=[
                {"role": "system", "content": "You are a helpful AI that generates interview responses. Always return valid JSON."},
                {"role": "user", "content": prompt}
            ],
        )
    )
    
    try:
        result = _parse_model_json_content(response['message']['content'])
        return result
    except Exception:
        # Fallback if JSON parsing fails
        if is_last_question:
            return {
                "acknowledgement": "Thank you for your answer.",
                "goodbye": "Thank you for participating in this interview. Good luck with your job search!"
            }
        else:
            return {
                "acknowledgement": "Thank you for your answer.",
                "next_question": next_question
            }

@app.post("/grade_interview")
async def grade_interview(
    request: Request,
    _: dict = Depends(require_grade_interview_user),
):
    data = await _parse_json_request(request)
    questions = _normalize_string_list_field(
        data.get("questions"),
        "questions",
        max_items=5,
        max_item_length=MAX_SHORT_TEXT_LENGTH,
    )
    answers = _normalize_string_list_field(
        data.get("answers"),
        "answers",
        max_items=5,
        max_item_length=MAX_TRANSCRIPT_LENGTH,
    )
    interview_id = _normalize_optional_positive_int(data.get("interview_id"), "interview_id")
    
    if not questions or not answers or len(questions) != 5 or len(answers) != 5:
        return {"error": "Must provide exactly 5 questions and 5 answers."}

    grading_prompt = f"""
You are an expert behavioral interviewer and grader. You will be given 5 interview questions and 5 candidate answers. For each answer, grade it from 0-100 based on these criteria:
- Relevance: Is the answer on-topic and appropriate for the question?
- Specificity: Does the answer include concrete details, actions, and outcomes?
- Structure: Is the answer clear, well-explained, and easy to follow?
- Reflection: Does the answer show ownership, self-awareness, or learning where appropriate?

Short, vague, off-topic, or nonsense answers should be penalized. Reward clear STAR-style answers that show impact and learning. Every answer must receive a grade, even if it is completely off-topic or nonsense. Be consistent and robust.
Important constraints:
- Evaluate only the 5 provided candidate answers.
- Do not add example/corrected answers.
- Do not add extra score entries.
- "scores" must contain exactly 5 entries in the same order as the input questions/answers.

Return a JSON object with:
- "scores": a list of 5 objects, each with "question", "answer", and "score" (0-100)
- "average_score": the average of the 5 scores (rounded to 1 decimal)
- "feedback": a readable summary of strengths, weaknesses, and suggestions for improvement, in plain English.

Questions:
"""
    for i, q in enumerate(questions, 1):
        grading_prompt += f"{i}. {q}\n"
    grading_prompt += "\nAnswers:\n"
    for i, a in enumerate(answers, 1):
        grading_prompt += f"{i}. {a}\n"

    response = None
    for attempt in range(2):
        response = await _run_ai_call(
            lambda: ollama_client.chat(
                model='mistral',
                format='json',
                messages=[
                    {"role": "system", "content": "You are a strict, fair, and robust behavioral interview grader. Always return valid JSON."},
                    {"role": "user", "content": grading_prompt}
                ],
            )
        )
        try:
            result = _parse_model_json_content(response['message']['content'])
            result = _normalize_grading_result(result, questions, answers)
            await _persist_grading_result(interview_id, result, request)
            return result
        except Exception:
            logger.exception(
                "Failed to parse grading response from model on attempt %s. Content preview: %s",
                attempt + 1,
                str(response.get('message', {}).get('content', ''))[:500],
            )

    if response is not None:
        logger.error(
            "All grading parse attempts failed. Last content preview: %s",
            str(response.get('message', {}).get('content', ''))[:500],
        )

    try:
        # Fallback: basic structure if parsing fails
        scores = []
        for q, a in zip(questions, answers):
            scores.append({"question": q, "answer": a, "score": 0})
        return {
            "scores": scores,
            "average_score": 0.0,
            "feedback": "There was an error grading the answers. Please try again."
        }
    except Exception:
        return {"error": "Unable to grade interview at this time."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
