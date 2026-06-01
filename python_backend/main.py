import asyncio
import json
import logging
import os
import time
from collections import defaultdict, deque
from functools import partial
from pathlib import Path

import requests
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio
from starlette.concurrency import run_in_threadpool
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from ai_client import AIClientError, ChatMessage, build_ai_client


APP_ENV = os.getenv("APP_ENV", "production" if os.getenv("K_SERVICE") else "development").strip().lower()
IS_PRODUCTION = APP_ENV == "production"
PRODUCTION_CORS_ORIGINS = ["https://knappi.ca"]
DEVELOPMENT_CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]


def _get_env(name, default=None, *, required_in_production=False):
    value = os.getenv(name)
    if value is not None:
        stripped = value.strip()
        if stripped:
            return stripped

    if required_in_production and IS_PRODUCTION:
        raise RuntimeError(f"{name} must be set when APP_ENV=production.")

    return default


def _load_cors_origins():
    default_origins = PRODUCTION_CORS_ORIGINS if IS_PRODUCTION else DEVELOPMENT_CORS_ORIGINS
    raw_origins = os.getenv("CORS_ALLOW_ORIGINS")
    if not raw_origins:
        return [*default_origins]

    origins = [*default_origins]
    for origin in raw_origins.split(","):
        origin = origin.strip().rstrip("/")
        if origin and origin not in origins:
            origins.append(origin)
    if "*" in origins:
        raise ValueError("CORS_ALLOW_ORIGINS cannot include '*' when allow_credentials=True.")
    return origins


ALLOWED_CORS_ORIGINS = _load_cors_origins()

app = FastAPI()


class VoiceAssistant:
    def __init__(self):
        self.sample_rate = 16000
        self.model_size = _get_env("WHISPER_MODEL_SIZE", "tiny")
        self.compute_type = _get_env("WHISPER_COMPUTE_TYPE", "int8")
        self._whisper_model = None

    def get_whisper_model(self):
        if self._whisper_model is None:
            self._whisper_model = WhisperModel(
                self.model_size,
                device="auto",
                compute_type=self.compute_type,
            )
        return self._whisper_model


assistant = VoiceAssistant()

# Configurable service endpoints
AI_PROVIDER = _get_env("AI_PROVIDER", "vertex_ai" if IS_PRODUCTION else "ollama").lower()
OLLAMA_HOST = _get_env("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = _get_env("OLLAMA_MODEL", "mistral")
GOOGLE_CLOUD_PROJECT = _get_env(
    "GOOGLE_CLOUD_PROJECT",
    _get_env("GCP_PROJECT_ID"),
    required_in_production=AI_PROVIDER == "vertex_ai",
)
VERTEX_AI_LOCATION = _get_env("VERTEX_AI_LOCATION", "us-central1")
GEMINI_MODEL = _get_env("GEMINI_MODEL", "gemini-2.5-flash")
SPRING_API_BASE = _get_env(
    "SPRING_API_BASE",
    "http://localhost:8080/api/v1",
    required_in_production=True,
)
AUTH_CHECK_TIMEOUT_SECONDS = float(_get_env("AUTH_CHECK_TIMEOUT_SECONDS", "5"))
GRADING_PERSIST_TIMEOUT_SECONDS = float(_get_env("GRADING_PERSIST_TIMEOUT_SECONDS", "5"))
AI_REQUEST_TIMEOUT_SECONDS = float(_get_env("AI_REQUEST_TIMEOUT_SECONDS", "30"))
MAX_AUDIO_UPLOAD_SIZE_BYTES = int(_get_env("MAX_AUDIO_UPLOAD_SIZE_BYTES", str(10 * 1024 * 1024)))
MAX_AUDIO_DURATION_SECONDS = float(_get_env("MAX_AUDIO_DURATION_SECONDS", "300"))
AUDIO_UPLOAD_CHUNK_SIZE_BYTES = 1024 * 1024
MAX_REQUEST_BODY_SIZE_BYTES = int(
    _get_env("MAX_REQUEST_BODY_SIZE_BYTES", str(MAX_AUDIO_UPLOAD_SIZE_BYTES + (1024 * 1024)))
)
MAX_JSON_BODY_SIZE_BYTES = int(_get_env("MAX_JSON_BODY_SIZE_BYTES", str(256 * 1024)))
MAX_ROLE_LENGTH = int(_get_env("MAX_ROLE_LENGTH", "120"))
MAX_TOPIC_LENGTH = int(_get_env("MAX_TOPIC_LENGTH", "160"))
MAX_SHORT_TEXT_LENGTH = int(_get_env("MAX_SHORT_TEXT_LENGTH", "500"))
MAX_ADDITIONAL_CONTEXT_LENGTH = int(_get_env("MAX_ADDITIONAL_CONTEXT_LENGTH", "1000"))
MAX_TRANSCRIPT_LENGTH = int(_get_env("MAX_TRANSCRIPT_LENGTH", "12000"))
MAX_FOLLOW_UPS_PER_PROMPT = int(_get_env("MAX_FOLLOW_UPS_PER_PROMPT", "2"))
MAX_TECH_CHAT_MEMORY_BLOCK_LENGTH = int(
    _get_env("MAX_TECH_CHAT_MEMORY_BLOCK_LENGTH", "2400")
)
MAX_PREVIOUS_QA_ITEMS = int(_get_env("MAX_PREVIOUS_QA_ITEMS", "5"))
RATE_LIMIT_WINDOW_SECONDS = int(_get_env("RATE_LIMIT_WINDOW_SECONDS", "60"))
RATE_LIMIT_TRANSCRIPTION_PER_WINDOW = int(_get_env("RATE_LIMIT_TRANSCRIPTION_PER_WINDOW", "10"))
RATE_LIMIT_DRILL_GENERATION_PER_WINDOW = int(
    _get_env("RATE_LIMIT_DRILL_GENERATION_PER_WINDOW", "12")
)
RATE_LIMIT_DRILL_EVALUATION_PER_WINDOW = int(
    _get_env("RATE_LIMIT_DRILL_EVALUATION_PER_WINDOW", "20")
)
RATE_LIMIT_QUESTION_GENERATION_PER_WINDOW = int(
    _get_env("RATE_LIMIT_QUESTION_GENERATION_PER_WINDOW", "10")
)
RATE_LIMIT_ACK_PER_WINDOW = int(_get_env("RATE_LIMIT_ACK_PER_WINDOW", "30"))
RATE_LIMIT_GRADING_PER_WINDOW = int(_get_env("RATE_LIMIT_GRADING_PER_WINDOW", "12"))
RATE_LIMIT_TECH_CHAT_PER_WINDOW = int(_get_env("RATE_LIMIT_TECH_CHAT_PER_WINDOW", "30"))
AI_CONCURRENCY_LIMIT = int(_get_env("AI_CONCURRENCY_LIMIT", "4"))
AI_CONCURRENCY_ACQUIRE_TIMEOUT_SECONDS = float(
    _get_env("AI_CONCURRENCY_ACQUIRE_TIMEOUT_SECONDS", "2")
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
AUDIO_EXTENSION_BY_CONTENT_TYPE = {
    "audio/webm": ".webm",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/mp4": ".mp4",
    "audio/x-m4a": ".m4a",
    "audio/ogg": ".ogg",
    "audio/flac": ".flac",
}
logger = logging.getLogger(__name__)

ai_client = build_ai_client(
    provider=AI_PROVIDER,
    ollama_host=OLLAMA_HOST,
    ollama_model=OLLAMA_MODEL,
    project_id=GOOGLE_CLOUD_PROJECT,
    location=VERTEX_AI_LOCATION,
    gemini_model=GEMINI_MODEL,
    timeout_seconds=AI_REQUEST_TIMEOUT_SECONDS,
)
ai_request_semaphore = asyncio.Semaphore(AI_CONCURRENCY_LIMIT)


class RequestBodyTooLargeError(Exception):
    def __init__(self, limit_bytes):
        super().__init__(f"Request body exceeds the {limit_bytes} byte limit.")
        self.limit_bytes = limit_bytes


def _cors_headers_for_origin(origin):
    if origin not in ALLOWED_CORS_ORIGINS:
        return []

    return [
        (b"access-control-allow-origin", origin.encode("latin-1")),
        (b"access-control-allow-credentials", b"true"),
        (b"vary", b"Origin"),
    ]


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
                        headers,
                        status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        f"Request body exceeds the {limit_bytes} byte limit.",
                    )
                    return
            except ValueError:
                await self._send_json_error(
                    send,
                    headers,
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
                headers,
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                f"Request body exceeds the {exc.limit_bytes} byte limit.",
            )

    async def _send_json_error(self, send: Send, request_headers: dict, status_code: int, detail: str):
        payload = json.dumps({"detail": detail}).encode("utf-8")
        response_headers = [
            (b"content-type", b"application/json"),
            (b"content-length", str(len(payload)).encode("ascii")),
            *_cors_headers_for_origin(request_headers.get("origin", "")),
        ]
        await send(
            {
                "type": "http.response.start",
                "status": status_code,
                "headers": response_headers,
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


def _normalize_non_negative_int(value, field_name, *, default=0, maximum=10):
    if value in (None, ""):
        return default
    try:
        normalized = int(value)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be a non-negative integer.",
        )

    if normalized < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be a non-negative integer.",
        )
    return min(normalized, maximum)


def _candidate_declined_to_answer(answer):
    normalized = " ".join((answer or "").lower().replace(".", " ").replace(",", " ").split())
    if not normalized:
        return False
    decline_phrases = {
        "i don't know",
        "i dont know",
        "i do not know",
        "don't know",
        "dont know",
        "do not know",
        "not sure",
        "i'm not sure",
        "im not sure",
        "no idea",
        "i have no idea",
        "i can't answer",
        "i cant answer",
    }
    return normalized in decline_phrases or normalized.startswith("i don't know ") or normalized.startswith("i dont know ")


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


async def _generate_ai_text(
    *,
    system_prompt: str,
    user_prompt: str,
    json_mode: bool = False,
    temperature: float = 0.2,
):
    try:
        return await _run_ai_call(
            partial(
                ai_client.generate,
                [
                    ChatMessage(role="system", content=system_prompt),
                    ChatMessage(role="user", content=user_prompt),
                ],
                json_mode=json_mode,
                temperature=temperature,
            )
        )
    except AIClientError as exc:
        logger.exception("AI provider request failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


def _transcribe_audio_file(tmp_path):
    decoded_audio = decode_audio(tmp_path, sampling_rate=assistant.sample_rate)
    duration_seconds = len(decoded_audio) / assistant.sample_rate
    if duration_seconds > MAX_AUDIO_DURATION_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Audio duration exceeds the {MAX_AUDIO_DURATION_SECONDS:.0f} second limit.",
        )

    segments, _ = assistant.get_whisper_model().transcribe(tmp_path)
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


TECH_CHAT_PERSONAS = {
    "curious-generalist": {
        "name": "Maya",
        "archetype": "Curious generalist",
        "bio": "A senior engineer who connects ideas across product, infrastructure, and developer experience.",
        "affinities": "architecture tradeoffs, AI tooling, developer workflows, product engineering",
        "prompt": """You are Maya, a senior engineer and curious generalist. You like connecting ideas across domains, following useful tangents, and asking how one technical choice relates to another. You are warm, quick, and conversational, not evaluative.""",
        "wind_down": "Close by tying the conversation back to a broader idea the user raised.",
    },
    "skeptical-tech-lead": {
        "name": "Dev",
        "archetype": "Skeptical tech lead",
        "bio": "A technically deep lead who pushes for concrete reasoning and tradeoffs.",
        "affinities": "system design, backend architecture, operational constraints, engineering tradeoffs",
        "prompt": """You are Dev, a skeptical but constructive tech lead. You push back on vague claims, ask why simpler options are not enough, and care about precise technical reasoning. You should feel like a colleague pressure-testing an idea, not an interviewer.""",
        "wind_down": "Close by naming the strongest claim and one assumption still worth testing.",
    },
    "pm-who-doesnt-code": {
        "name": "Leah",
        "archetype": "PM who does not code",
        "bio": "A sharp product partner who asks for first-principles explanations and user impact.",
        "affinities": "user impact, product tradeoffs, launch risk, technical decisions for non-engineers",
        "prompt": """You are Leah, a smart product manager who does not code. You ask for first-principles explanations, user impact, and plain language. When the user leans on jargon, ask what it actually means for users or decisions.""",
        "wind_down": "Close by translating the thread back into user or business impact.",
    },
    "systems-thinker": {
        "name": "Ravi",
        "archetype": "Systems thinker",
        "bio": "An engineer who naturally looks for edge cases, reliability, and long-term pressure.",
        "affinities": "scale, reliability, distributed systems, queues, failure modes",
        "prompt": """You are Ravi, a systems thinker. You naturally look for scale limits, edge cases, long-tail behavior, and failure modes. You are calm and thoughtful, and you treat reliability questions as interesting rather than scary.""",
        "wind_down": "Close with one lingering edge case or systems implication to keep thinking about.",
    },
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


def _get_tech_chat_persona(persona_id):
    if isinstance(persona_id, str) and persona_id in TECH_CHAT_PERSONAS:
        return TECH_CHAT_PERSONAS[persona_id]
    return TECH_CHAT_PERSONAS["curious-generalist"]


def _normalize_tech_chat_messages(value, *, max_items=80):
    if value is None:
        return []
    if not isinstance(value, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="messages must be a list.",
        )
    if len(value) > max_items:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"messages exceeds the {max_items} item limit.",
        )

    messages = []
    for index, item in enumerate(value):
        if not isinstance(item, dict):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="messages must contain objects.",
            )
        role = item.get("role")
        if role not in ("candidate", "interviewer", "user", "assistant"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"messages[{index}].role is invalid.",
            )
        content = _normalize_text_field(
            item.get("content"),
            f"messages[{index}].content",
            default="",
            max_length=MAX_TRANSCRIPT_LENGTH,
        )
        if content:
            messages.append(
                {
                    "role": "user" if role in ("candidate", "user") else "assistant",
                    "content": content,
                }
            )
    return messages


def _format_tech_chat_messages(messages):
    lines = []
    for message in messages:
        speaker = "User" if message["role"] == "user" else "Persona"
        lines.append(f"{speaker}: {message['content']}")
    return "\n".join(lines)


def _truncate_tech_chat_memory_block(memory_block):
    if len(memory_block) <= MAX_TECH_CHAT_MEMORY_BLOCK_LENGTH:
        return memory_block

    truncated = memory_block[:MAX_TECH_CHAT_MEMORY_BLOCK_LENGTH].rsplit("\n", 1)[0].strip()
    return truncated or memory_block[:MAX_TECH_CHAT_MEMORY_BLOCK_LENGTH].strip()


def _build_tech_chat_context(messages, memory_block=""):
    active_window = messages[-12:]
    older = messages[:-12]
    memory = _truncate_tech_chat_memory_block(memory_block.strip()) if memory_block else ""
    if older and not memory:
        memory = _format_tech_chat_messages(older[-12:])
    return memory, active_window


def _normalize_tech_chat_recap(raw_result):
    result = raw_result if isinstance(raw_result, dict) else {}
    highlights = _normalize_string_list(result.get("highlights"), limit=3)
    fuzzy_spots = _normalize_string_list(result.get("fuzzySpots"), limit=2)
    topics_covered = _normalize_string_list(result.get("topicsCovered"), limit=10)
    takeaway_line = result.get("takeawayLine")

    return {
        "highlights": highlights
        or ["You gave at least one concrete explanation that made the technical idea easier to follow."],
        "fuzzySpots": fuzzy_spots
        or ["A few parts could use sharper stakes, examples, or less shorthand next time."],
        "topicsCovered": topics_covered or ["technical communication"],
        "takeawayLine": takeaway_line.strip()
        if isinstance(takeaway_line, str) and takeaway_line.strip()
        else "You had a useful thread here; next time, make the concrete stakes visible a little earlier.",
    }


def _normalize_tech_chat_memory_result(raw_result, fallback_memory):
    result = raw_result if isinstance(raw_result, dict) else {}
    memory_block = result.get("memoryBlock")
    if not isinstance(memory_block, str) or not memory_block.strip():
        memory_block = result.get("memory_block")

    if isinstance(memory_block, str) and memory_block.strip():
        return _truncate_tech_chat_memory_block(memory_block.strip())

    return _truncate_tech_chat_memory_block(fallback_memory.strip())


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
require_tech_chat_user = _rate_limited_auth_dependency(
    "tech_chat",
    RATE_LIMIT_TECH_CHAT_PER_WINDOW,
)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.get("/readyz")
def readyz():
    return {
        "status": "ready",
        "environment": APP_ENV,
        "ai_provider": AI_PROVIDER,
        "gemini_model": GEMINI_MODEL if AI_PROVIDER == "vertex_ai" else None,
        "whisper_model": assistant.model_size,
        "whisper_compute_type": assistant.compute_type,
    }


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
            logger.warning(
                "Unsupported transcription upload content type. content_type=%s filename=%s",
                audio.content_type,
                audio.filename,
            )
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Unsupported audio type.",
            )

        file_extension = Path(audio.filename or "").suffix.lower()
        if file_extension and file_extension not in ALLOWED_AUDIO_EXTENSIONS:
            logger.warning(
                "Unsupported transcription upload extension. content_type=%s filename=%s",
                audio.content_type,
                audio.filename,
            )
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Unsupported audio file extension.",
            )
        temp_suffix = AUDIO_EXTENSION_BY_CONTENT_TYPE.get(content_type, file_extension or ".webm")

        total_size = 0
        with tempfile.NamedTemporaryFile(suffix=temp_suffix, delete=False) as tmp:
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
        except Exception as exc:
            logger.warning(
                "Unable to decode transcription upload. content_type=%s filename=%s temp_suffix=%s size=%s error=%s",
                audio.content_type,
                audio.filename,
                temp_suffix,
                total_size,
                exc,
            )
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


@app.post("/tech_chat/start")
async def tech_chat_start(
    request: Request,
    _: dict = Depends(require_tech_chat_user),
):
    data = await _parse_json_request(request)
    persona_id = _normalize_text_field(
        data.get("persona_id"),
        "persona_id",
        default="curious-generalist",
        max_length=MAX_SHORT_TEXT_LENGTH,
    )
    persona = _get_tech_chat_persona(persona_id)
    topic_seed = _normalize_text_field(
        data.get("topic_seed"),
        "topic_seed",
        default="",
        max_length=MAX_TOPIC_LENGTH,
    )
    surprise_me = bool(data.get("surprise_me", False))

    prompt = f"""
You are opening a casual Tech Chat session as {persona["name"]}, {persona["archetype"]}.

Persona bio: {persona["bio"]}
Natural topic affinities: {persona["affinities"]}

User-provided topic seed: {topic_seed or "none"}
Surprise me requested: {surprise_me}

Return valid JSON with:
- topic_seed: a short topic label
- opener: your first chat message to the user

Rules:
- If the user provided a topic, open by engaging that topic directly.
- If no topic was provided or surprise_me is true, propose one spontaneous topic that fits the persona.
- Sound like a colleague starting a thoughtful chat, not a coach, examiner, or menu.
- Ask exactly one question.
- Keep the opener under 90 words.
- Return JSON only.
"""
    response_text = await _generate_ai_text(
        system_prompt=persona["prompt"],
        user_prompt=prompt,
        json_mode=True,
        temperature=0.7,
    )

    try:
        parsed = _parse_model_json_content(response_text)
    except Exception:
        logger.exception("Failed to parse Tech Chat opener response.")
        parsed = {}

    opener = parsed.get("opener") if isinstance(parsed, dict) else None
    resolved_topic = parsed.get("topic_seed") if isinstance(parsed, dict) else None
    return {
        "topic_seed": resolved_topic.strip()
        if isinstance(resolved_topic, str) and resolved_topic.strip()
        else topic_seed
        or persona["affinities"].split(",", 1)[0].strip(),
        "opener": opener.strip()
        if isinstance(opener, str) and opener.strip()
        else "I was thinking about a technical tradeoff earlier, and I am curious how you would frame it. What angle feels most interesting to you?",
    }


@app.post("/tech_chat/respond")
async def tech_chat_respond(
    request: Request,
    _: dict = Depends(require_tech_chat_user),
):
    data = await _parse_json_request(request)
    persona_id = _normalize_text_field(
        data.get("persona_id"),
        "persona_id",
        default="curious-generalist",
        max_length=MAX_SHORT_TEXT_LENGTH,
    )
    persona = _get_tech_chat_persona(persona_id)
    topic_seed = _normalize_text_field(
        data.get("topic_seed"),
        "topic_seed",
        default="",
        max_length=MAX_TOPIC_LENGTH,
    )
    turn_count = _normalize_optional_positive_int(data.get("turn_count"), "turn_count") or 1
    soft_turn_limit = _normalize_optional_positive_int(
        data.get("soft_turn_limit"),
        "soft_turn_limit",
    ) or 16
    messages = _normalize_tech_chat_messages(data.get("messages"))
    memory_block = _normalize_text_field(
        data.get("memory_block"),
        "memory_block",
        default="",
        max_length=MAX_TECH_CHAT_MEMORY_BLOCK_LENGTH,
    )
    memory, active_window = _build_tech_chat_context(messages, memory_block)

    phase = "open"
    if turn_count >= soft_turn_limit:
        phase = "close"
    elif turn_count >= max(1, soft_turn_limit - 2):
        phase = "wind_down"

    prompt = f"""
You are continuing a casual Tech Chat session.

Topic seed: {topic_seed or "open technical conversation"}
Conversation phase: {phase}
Turn count: {turn_count}
Soft session limit: {soft_turn_limit}
Persona wind-down style: {persona["wind_down"]}

[SESSION MEMORY]
{memory or "No earlier compressed memory yet."}
[END SESSION MEMORY]

[ACTIVE WINDOW]
{_format_tech_chat_messages(active_window)}
[END ACTIVE WINDOW]

Return valid JSON:
{{
  "response": "<your next message>",
  "should_end": <true only when this response naturally closes the session>
}}

Rules:
- Be a curious colleague, not an evaluator.
- Ask at most one question.
- React to what the user said before asking anything.
- Follow useful tangents.
- Occasionally push for precision, but never be hostile.
- Match the user's tone and energy without becoming theatrical.
- Volunteer a useful observation or connection when it helps the conversation move, even if the user did not ask a direct question.
- If the active window contains multiple user turns in a row, treat that as a redirect or interruption and answer the newest thread first.
- Keep most replies between 1 and 5 sentences.
- If phase is wind_down, wrap the current thread instead of opening a brand-new one.
- If phase is close, close warmly in persona voice and set should_end to true.
- Return JSON only.
"""

    response_text = await _generate_ai_text(
        system_prompt=persona["prompt"],
        user_prompt=prompt,
        json_mode=True,
        temperature=0.75,
    )

    try:
        parsed = _parse_model_json_content(response_text)
    except Exception:
        logger.exception("Failed to parse Tech Chat response.")
        parsed = {}

    response = parsed.get("response") if isinstance(parsed, dict) else None
    should_end = bool(parsed.get("should_end")) if isinstance(parsed, dict) else False
    if phase == "close":
        should_end = True

    return {
        "response": response.strip()
        if isinstance(response, str) and response.strip()
        else "That is interesting. Say a little more about the part that feels most important to you.",
        "should_end": should_end,
    }


@app.post("/tech_chat/compress")
async def tech_chat_compress(
    request: Request,
    _: dict = Depends(require_tech_chat_user),
):
    data = await _parse_json_request(request)
    persona_id = _normalize_text_field(
        data.get("persona_id"),
        "persona_id",
        default="curious-generalist",
        max_length=MAX_SHORT_TEXT_LENGTH,
    )
    persona = _get_tech_chat_persona(persona_id)
    current_memory = _normalize_text_field(
        data.get("memory_block"),
        "memory_block",
        default="",
        max_length=MAX_TECH_CHAT_MEMORY_BLOCK_LENGTH,
    )
    messages = _normalize_tech_chat_messages(data.get("messages"), max_items=24)

    if not messages:
        return {"memory_block": current_memory}

    prompt = f"""
You are silently compressing memory for a casual technical conversation.

Persona: {persona["name"]}, {persona["archetype"]}

Existing memory block:
{current_memory or "No existing memory yet."}

New older exchanges to fold into memory:
{_format_tech_chat_messages(messages)}

Return valid JSON:
{{
  "memoryBlock": "[SESSION MEMORY]\\nEarlier in this conversation: <2-4 concise sentences>\\nKey topics touched: <comma-separated concepts>\\nOpen threads: <unresolved questions or topics, or none>\\n[END SESSION MEMORY]"
}}

Rules:
- Preserve key technical claims, positions, and tradeoffs.
- Preserve anything the user explained well or struggled to explain.
- Preserve unresolved threads that the persona should be able to naturally reference later.
- Keep the memory under {MAX_TECH_CHAT_MEMORY_BLOCK_LENGTH} characters.
- Do not include raw transcript unless a specific phrase is essential.
- Return JSON only.
"""

    response_text = await _generate_ai_text(
        system_prompt="You compress technical conversation history into concise session memory. Always return valid JSON.",
        user_prompt=prompt,
        json_mode=True,
        temperature=0.2,
    )

    try:
        parsed = _parse_model_json_content(response_text)
    except Exception:
        logger.exception("Failed to parse Tech Chat memory compression response.")
        parsed = {}

    return {"memory_block": _normalize_tech_chat_memory_result(parsed, current_memory)}


@app.post("/tech_chat/recap")
async def tech_chat_recap(
    request: Request,
    _: dict = Depends(require_tech_chat_user),
):
    data = await _parse_json_request(request)
    persona_id = _normalize_text_field(
        data.get("persona_id"),
        "persona_id",
        default="curious-generalist",
        max_length=MAX_SHORT_TEXT_LENGTH,
    )
    persona = _get_tech_chat_persona(persona_id)
    messages = _normalize_tech_chat_messages(data.get("messages"))
    session_id = _normalize_optional_positive_int(data.get("session_id"), "session_id")
    memory_block = _normalize_text_field(
        data.get("memory_block"),
        "memory_block",
        default="",
        max_length=MAX_TECH_CHAT_MEMORY_BLOCK_LENGTH,
    )
    memory, active_window = _build_tech_chat_context(messages, memory_block)

    prompt = f"""
You are generating a post-session recap for a technical communication practice app.

The user just completed a casual technical conversation with you, playing the persona of {persona["name"]}.

Return valid JSON with exactly:
{{
  "highlights": ["<2-3 strings describing specific moments of strong articulation>"],
  "fuzzySpots": ["<1-2 strings describing where explanation got vague or jargon-heavy>"],
  "topicsCovered": ["<technical topics or concepts mentioned>"],
  "takeawayLine": "<one sentence in {persona["name"]}'s voice>"
}}

Rules:
- No scores, grades, or percentages.
- Be constructive and honest.
- Reference specific moments, not generic praise.
- Return JSON only.

[SESSION MEMORY]
{memory or "No earlier compressed memory."}
[END SESSION MEMORY]

[ACTIVE WINDOW]
{_format_tech_chat_messages(active_window)}
[END ACTIVE WINDOW]
"""
    response_text = await _generate_ai_text(
        system_prompt=persona["prompt"],
        user_prompt=prompt,
        json_mode=True,
        temperature=0.35,
    )

    try:
        parsed = _parse_model_json_content(response_text)
    except Exception:
        logger.exception("Failed to parse Tech Chat recap.")
        parsed = {}

    result = _normalize_tech_chat_recap(parsed)
    await _persist_grading_result(session_id, result, request)
    return result


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

    response_text = await _generate_ai_text(
        system_prompt="You create concise, realistic technical communication drills for developers. Always return valid JSON.",
        user_prompt=generation_prompt,
        json_mode=True,
    )

    try:
        result = _parse_model_json_content(response_text)
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
    answer_history = _normalize_string_list_field(
        data.get("answer_history"),
        "answer_history",
        max_items=MAX_FOLLOW_UPS_PER_PROMPT + 1,
        max_item_length=MAX_TRANSCRIPT_LENGTH,
    )
    follow_up_count = _normalize_non_negative_int(
        data.get("follow_up_count"),
        "follow_up_count",
        default=max(0, len(answer_history) - 1),
        maximum=MAX_FOLLOW_UPS_PER_PROMPT,
    )
    max_follow_ups = _normalize_non_negative_int(
        data.get("max_follow_ups"),
        "max_follow_ups",
        default=MAX_FOLLOW_UPS_PER_PROMPT,
        maximum=MAX_FOLLOW_UPS_PER_PROMPT,
    )
    session_id = _normalize_optional_positive_int(data.get("session_id"), "session_id")

    if not isinstance(transcript, str) or not transcript.strip():
        return {"error": "A transcript is required to evaluate the drill."}

    if not answer_history:
        answer_history = [transcript]

    combined_answer = "\n\nFollow-up expansion: ".join(
        answer for answer in answer_history if isinstance(answer, str) and answer.strip()
    )
    can_push_back = follow_up_count < max_follow_ups and not _candidate_declined_to_answer(transcript)

    evaluation_prompt = f"""
You are an expert technical communication coach for developers.

You are evaluating a spoken answer. If the combined answer is too vague, incomplete, unclear, or unsupported, push back once by asking for a specific expansion before scoring it.

First decide whether the combined answer is sufficient to score. Score the combined answer on:
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
- follow-ups already asked for this prompt: {follow_up_count}
- follow-up limit for this prompt: {max_follow_ups}

Current answer attempt:
{transcript}

Combined answer so far:
{combined_answer}

If the answer is unclear or too thin and follow-ups remain, return valid JSON with exactly these keys:
- needs_followup: true
- acknowledgement: a short, direct sentence naming what is missing
- follow_up_question: one specific interviewer-style question asking the candidate to expand the missing detail

Otherwise return valid JSON with exactly these keys:
- overall_score (number 0-100)
- categories (array of 4 objects with keys: key, score, feedback)
- strengths (array of 2-4 strings)
- missing_points (array of 2-4 strings)
- improved_outline (array of 3-5 strings)
- retry_advice (string)
- feedback (string)

Rules:
- needs_followup must be false or omitted when the candidate says they do not know, when the follow-up limit has been reached, or when the combined answer is scoreable
- ask at most one follow-up question
- a follow-up should request concrete evidence, reasoning, tradeoffs, impact, or audience-specific framing
- categories must contain exactly these keys in this order: clarity, correctness, depth, audience_fit
- be strict but fair
- reward explanations that lead with the point, stay technically accurate, and match the audience
- penalize vague explanations, missing tradeoffs, technical inaccuracies, and audience mismatch
- do not include markdown
"""

    response = None
    for attempt in range(2):
        response = await _generate_ai_text(
            system_prompt="You are a strict, fair technical communication coach. Always return valid JSON.",
            user_prompt=evaluation_prompt,
            json_mode=True,
        )

        try:
            result = _parse_model_json_content(response)
            if (
                can_push_back
                and isinstance(result, dict)
                and result.get("needs_followup") is True
                and isinstance(result.get("follow_up_question"), str)
                and result.get("follow_up_question").strip()
            ):
                return {
                    "needs_followup": True,
                    "acknowledgement": _normalize_text_field(
                        result.get("acknowledgement"),
                        "acknowledgement",
                        default="I need a little more detail before I can score that fairly.",
                        max_length=MAX_SHORT_TEXT_LENGTH,
                    ),
                    "follow_up_question": _normalize_text_field(
                        result.get("follow_up_question"),
                        "follow_up_question",
                        max_length=MAX_SHORT_TEXT_LENGTH,
                    ),
                }
            result = _normalize_communication_grading_result(result)
            await _persist_grading_result(session_id, result, request)
            return result
        except Exception:
            logger.exception(
                "Failed to parse technical drill evaluation on attempt %s. Content preview: %s",
                attempt + 1,
                str(response)[:500],
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
        f"Return valid JSON with one top-level key named questions. "
        f"The value must be an array of exactly 5 strings."
    )
    response_text = await _generate_ai_text(
        system_prompt="You are an expert behavioral interviewer that generates interview questions. Always return valid JSON.",
        user_prompt=prompt,
        json_mode=True,
    )

    try:
        parsed = _parse_model_json_content(response_text)
    except Exception:
        logger.exception("Failed to parse generated question response.")
        parsed = {}

    questions = _normalize_string_list(parsed.get("questions"), limit=5) if isinstance(parsed, dict) else []
    if len(questions) < 5:
        questions = [
            "Tell me about a time you had to make a difficult tradeoff under pressure.",
            "Describe a situation where you resolved a conflict with a teammate or cross-functional partner.",
            "Tell me about a project where you took ownership beyond your formal responsibilities.",
            "Describe a time when you received difficult feedback and how you responded.",
            "Tell me about a time you learned something quickly to deliver a better outcome.",
        ]

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
    answer_history = _normalize_string_list_field(
        data.get("answer_history"),
        "answer_history",
        max_items=MAX_FOLLOW_UPS_PER_PROMPT + 1,
        max_item_length=MAX_TRANSCRIPT_LENGTH,
    )
    follow_up_count = _normalize_non_negative_int(
        data.get("follow_up_count"),
        "follow_up_count",
        default=max(0, len(answer_history) - 1),
        maximum=MAX_FOLLOW_UPS_PER_PROMPT,
    )
    max_follow_ups = _normalize_non_negative_int(
        data.get("max_follow_ups"),
        "max_follow_ups",
        default=MAX_FOLLOW_UPS_PER_PROMPT,
        maximum=MAX_FOLLOW_UPS_PER_PROMPT,
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
    if not answer_history:
        answer_history = [user_answer]
    combined_answer = "\n\nFollow-up expansion: ".join(
        answer for answer in answer_history if isinstance(answer, str) and answer.strip()
    )
    can_push_back = follow_up_count < max_follow_ups and not _candidate_declined_to_answer(user_answer)
    
    # Build context from previous Q&A
    context = ""
    if previous_qa:
        context = "Previous Q&A:\n" + "\n".join([f"Q: {qa['question']}\nA: {qa['answer']}" for qa in previous_qa])
    
    if is_last_question:
        # Generate final acknowledgement and goodbye
        prompt = f"""You are an expert behavioral interviewer. The candidate just answered the final question.

        Current question: {current_question}
        Candidate's latest answer attempt: {user_answer}
        Candidate's combined answer so far: {combined_answer}
        Follow-ups already asked for this question: {follow_up_count}
        Follow-up limit for this question: {max_follow_ups}
        {context}

        If the combined answer is unclear, too vague, or missing the candidate's specific action/result, and follow-ups remain, push back before ending.
        If the candidate says they do not know, the follow-up limit is reached, or the combined answer is sufficient, end the interview.

        Return one of these JSON shapes:
        {{"needs_followup": true, "acknowledgement": "briefly name what is missing", "follow_up_question": "one specific expansion question"}}
        or
        {{"acknowledgement": "your acknowledgement here", "goodbye": "your goodbye message here"}}"""
    else:
        # Generate acknowledgement and provide next question
        prompt = f"""You are an expert behavioral interviewer that is very thorough. The candidate just answered a question.

        Current question: {current_question}
        Candidate's latest answer attempt: {user_answer}
        Candidate's combined answer so far: {combined_answer}
        Follow-ups already asked for this question: {follow_up_count}
        Follow-up limit for this question: {max_follow_ups}
        {context}
        Next question: {next_question}

        If the combined answer is unclear, too vague, or missing the candidate's specific action/result, and follow-ups remain, push back before moving on.
        If the candidate says they do not know, the follow-up limit is reached, or the combined answer is sufficient, move to the next question.

        Return one of these JSON shapes:
        {{"needs_followup": true, "acknowledgement": "briefly name what is missing", "follow_up_question": "one specific expansion question"}}
        or
        {{"acknowledgement": "your acknowledgement here", "next_question": "{next_question}"}}"""
            
    response_text = await _generate_ai_text(
        system_prompt="You are a helpful AI that generates interview responses. Always return valid JSON.",
        user_prompt=prompt,
        json_mode=True,
    )
    
    try:
        result = _parse_model_json_content(response_text)
        if (
            can_push_back
            and isinstance(result, dict)
            and result.get("needs_followup") is True
            and isinstance(result.get("follow_up_question"), str)
            and result.get("follow_up_question").strip()
        ):
            return {
                "needs_followup": True,
                "acknowledgement": _normalize_text_field(
                    result.get("acknowledgement"),
                    "acknowledgement",
                    default="I need a little more detail before we move on.",
                    max_length=MAX_SHORT_TEXT_LENGTH,
                ),
                "follow_up_question": _normalize_text_field(
                    result.get("follow_up_question"),
                    "follow_up_question",
                    max_length=MAX_SHORT_TEXT_LENGTH,
                ),
            }
        if is_last_question:
            return {
                "acknowledgement": _normalize_text_field(
                    result.get("acknowledgement") if isinstance(result, dict) else None,
                    "acknowledgement",
                    default="Thank you for your answer.",
                    max_length=MAX_SHORT_TEXT_LENGTH,
                ),
                "goodbye": _normalize_text_field(
                    result.get("goodbye") if isinstance(result, dict) else None,
                    "goodbye",
                    default="Thank you for participating in this interview. Good luck with your job search!",
                    max_length=MAX_SHORT_TEXT_LENGTH,
                ),
            }
        return {
            "acknowledgement": _normalize_text_field(
                result.get("acknowledgement") if isinstance(result, dict) else None,
                "acknowledgement",
                default="Thank you for your answer.",
                max_length=MAX_SHORT_TEXT_LENGTH,
            ),
            "next_question": next_question,
        }
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
        response = await _generate_ai_text(
            system_prompt="You are a strict, fair, and robust behavioral interview grader. Always return valid JSON.",
            user_prompt=grading_prompt,
            json_mode=True,
        )
        try:
            result = _parse_model_json_content(response)
            result = _normalize_grading_result(result, questions, answers)
            await _persist_grading_result(interview_id, result, request)
            return result
        except Exception:
            logger.exception(
                "Failed to parse grading response from model on attempt %s. Content preview: %s",
                attempt + 1,
                str(response)[:500],
            )

    if response is not None:
        logger.error(
            "All grading parse attempts failed. Last content preview: %s",
            str(response)[:500],
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

    port = int(_get_env("PORT", "8081"))
    uvicorn.run(app, host="0.0.0.0", port=port)
