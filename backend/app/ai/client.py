from openai import OpenAI

from app.core.config import get_settings

settings = get_settings()


def get_ai_client() -> OpenAI:
    return OpenAI(
        base_url=settings.ai_base_url,
        api_key=settings.ai_api_key,
    )
