from app.core.config import settings
from app.ai.base import AIProvider
from app.ai.mock_provider import MockAIProvider

def get_ai_provider() -> AIProvider:
    provider_name = (settings.AI_PROVIDER or "mock").lower()
    if provider_name == "openai" and settings.OPENAI_API_KEY:
        try:
            from app.ai.openai_provider import OpenAIProvider
            return OpenAIProvider()
        except Exception:
            return MockAIProvider()
    elif provider_name == "ollama":
        try:
            from app.ai.ollama_provider import OllamaProvider
            return OllamaProvider()
        except Exception:
            return MockAIProvider()
    return MockAIProvider()
