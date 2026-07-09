import json
from typing import Optional

from app.ai.client import get_ai_client
from app.ai.prompts import EXTRACT_PROMPT
from app.core.config import get_settings

settings = get_settings()


def extract_from_text(content: str) -> Optional[dict]:
    """Extract structured loan data from document text.

    Returns a dict on success. On any AI/provider failure returns None so the
    caller can degrade gracefully (the UI must never blank out).
    """
    try:
        client = get_ai_client()
        response = client.chat.completions.create(
            model=settings.ai_model,
            messages=[
                {"role": "system", "content": "You are a precise data extraction assistant. Return only valid JSON."},
                {"role": "user", "content": EXTRACT_PROMPT.format(content=content[:8000])},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        text = response.choices[0].message.content
        if not text:
            return None
        return json.loads(text)
    except Exception as e:
        # Log but do NOT raise: keep the flow alive so validation/risk still run.
        print(f"[AI EXTRACT WARNING] extraction failed: {e}")
        return None

