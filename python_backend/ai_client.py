import json
from dataclasses import dataclass

try:
    import google.auth
    from google.auth.transport.requests import Request as GoogleAuthRequest
except ImportError:  # pragma: no cover - resolved in deployed environments via requirements.txt
    google = None
    GoogleAuthRequest = None


class AIClientError(RuntimeError):
    pass


@dataclass(frozen=True)
class ChatMessage:
    role: str
    content: str


class OllamaAIClient:
    def __init__(self, host: str, model: str):
        import ollama

        self._client = ollama.Client(host=host)
        self._model = model

    def generate(self, messages: list[ChatMessage], *, json_mode: bool = False, temperature: float = 0.2) -> str:
        payload = {
            "model": self._model,
            "messages": [{"role": message.role, "content": message.content} for message in messages],
            "options": {"temperature": temperature},
        }

        if json_mode:
            payload["format"] = "json"

        response = self._client.chat(**payload)
        content = response.get("message", {}).get("content")
        if not isinstance(content, str) or not content.strip():
            raise AIClientError("The Ollama response did not contain any text output.")
        return content


class VertexAIGeminiClient:
    _SCOPE = "https://www.googleapis.com/auth/cloud-platform"

    def __init__(
        self,
        *,
        project_id: str | None,
        location: str,
        model: str,
        timeout_seconds: float,
    ):
        if google is None or GoogleAuthRequest is None:
            raise RuntimeError("google-auth is required when AI_PROVIDER=vertex_ai.")

        credentials, detected_project = google.auth.default(scopes=[self._SCOPE])
        self._credentials = credentials
        self._auth_request = GoogleAuthRequest()
        self._project_id = project_id or detected_project
        if not self._project_id:
            raise RuntimeError(
                "GOOGLE_CLOUD_PROJECT must be set or available from Application Default Credentials."
            )

        self._location = location
        self._model = model
        self._timeout_seconds = timeout_seconds

    def _get_access_token(self) -> str:
        if not self._credentials.valid:
            self._credentials.refresh(self._auth_request)
        token = self._credentials.token
        if not token:
            raise AIClientError("Unable to acquire a Vertex AI access token.")
        return token

    def generate(self, messages: list[ChatMessage], *, json_mode: bool = False, temperature: float = 0.2) -> str:
        import requests

        system_parts: list[str] = []
        contents: list[dict] = []

        for message in messages:
            if not message.content.strip():
                continue

            if message.role == "system":
                system_parts.append(message.content.strip())
                continue

            role = "model" if message.role == "assistant" else "user"
            contents.append({"role": role, "parts": [{"text": message.content}]})

        if not contents:
            raise AIClientError("At least one non-system message is required to call Vertex AI.")

        generation_config: dict[str, object] = {"temperature": temperature}
        if json_mode:
            generation_config["responseMimeType"] = "application/json"

        payload: dict[str, object] = {
            "contents": contents,
            "generationConfig": generation_config,
        }
        if system_parts:
            payload["systemInstruction"] = {"parts": [{"text": "\n\n".join(system_parts)}]}

        url = (
            f"https://{self._location}-aiplatform.googleapis.com/v1/projects/{self._project_id}"
            f"/locations/{self._location}/publishers/google/models/{self._model}:generateContent"
        )
        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {self._get_access_token()}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=self._timeout_seconds,
        )

        if not response.ok:
            detail = response.text.strip()
            raise AIClientError(
                f"Vertex AI request failed with status {response.status_code}: {detail or 'No details provided.'}"
            )

        return self._extract_text(response.json())

    def _extract_text(self, payload: dict) -> str:
        candidates = payload.get("candidates", [])
        if not isinstance(candidates, list) or not candidates:
            prompt_feedback = payload.get("promptFeedback")
            if prompt_feedback:
                raise AIClientError(f"Vertex AI returned no candidates: {json.dumps(prompt_feedback)}")
            raise AIClientError("Vertex AI returned no candidates.")

        parts = candidates[0].get("content", {}).get("parts", [])
        fragments = [part.get("text", "") for part in parts if isinstance(part, dict)]
        content = "".join(fragment for fragment in fragments if isinstance(fragment, str)).strip()
        if not content:
            raise AIClientError("Vertex AI returned an empty response.")
        return content


def build_ai_client(
    *,
    provider: str,
    ollama_host: str | None,
    ollama_model: str | None,
    project_id: str | None,
    location: str,
    gemini_model: str,
    timeout_seconds: float,
):
    normalized_provider = provider.strip().lower()

    if normalized_provider == "ollama":
        if not ollama_host:
            raise RuntimeError("OLLAMA_HOST must be set when AI_PROVIDER=ollama.")
        return OllamaAIClient(ollama_host, ollama_model or "mistral")

    if normalized_provider == "vertex_ai":
        return VertexAIGeminiClient(
            project_id=project_id,
            location=location,
            model=gemini_model,
            timeout_seconds=timeout_seconds,
        )

    raise RuntimeError(f"Unsupported AI_PROVIDER: {provider}")
