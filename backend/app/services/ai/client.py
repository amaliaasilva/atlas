"""
Atlas Finance — AIClient
Abstração provider-agnóstica sobre OpenAI / Gemini / mock.

Configuração via settings.AI_PROVIDER:
  "mock"   → retorna defaults (sem chamada de rede) — adequado para dev/CI
  "openai" → usa openai>=1.0 (pip install openai)
  "gemini" → usa google-generativeai (pip install google-generativeai)
"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

from app.core.config import settings

log = logging.getLogger(__name__)


class AIClient:
    """Provider-agnostic LLM client."""

    def __init__(self) -> None:
        self.provider = settings.AI_PROVIDER

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def chat(self, system: str, user: str, model: str | None = None) -> str:
        """
        Gera uma resposta de texto livre.

        Returns
        -------
        str — resposta do modelo (ou "__mock__" quando provider=mock)
        """
        if self.provider == "mock":
            return "__mock__"
        if self.provider == "openai":
            return self._openai_chat(system, user, model or settings.AI_MODEL_COPILOT)
        if self.provider == "gemini":
            return self._gemini_chat(system, user)
        return "__mock__"

    def structured_output(self, system: str, user: str, schema: dict[str, Any]) -> dict[str, Any]:
        """
        Gera saída JSON estruturada conforme ``schema`` (JSON Schema dict).
        Provider=mock retorna o primeiro campo de cada propriedade com valor padrão.
        """
        if self.provider == "mock":
            return self._mock_structured(schema)
        if self.provider == "openai":
            return self._openai_structured(system, user, schema)
        return self._mock_structured(schema)

    # ------------------------------------------------------------------
    # OpenAI provider (requires `pip install openai`)
    # ------------------------------------------------------------------

    def _openai_chat(self, system: str, user: str, model: str) -> str:
        try:
            from openai import OpenAI  # type: ignore
        except ImportError:
            log.warning("openai package not installed — falling back to mock")
            return "__mock__"
        if not settings.OPENAI_API_KEY:
            log.warning("OPENAI_API_KEY not set — falling back to mock")
            return "__mock__"
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.3,
            timeout=30,
        )
        return resp.choices[0].message.content or ""

    def _openai_structured(self, system: str, user: str, schema: dict[str, Any]) -> dict[str, Any]:
        try:
            from openai import OpenAI  # type: ignore
        except ImportError:
            return self._mock_structured(schema)
        if not settings.OPENAI_API_KEY:
            return self._mock_structured(schema)
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        resp = client.chat.completions.create(
            model=settings.AI_MODEL_AUDIT,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            timeout=30,
        )
        raw = resp.choices[0].message.content or "{}"
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return self._mock_structured(schema)

    # ------------------------------------------------------------------
    # Gemini provider (requires `pip install google-generativeai`)
    # ------------------------------------------------------------------

    def _gemini_chat(self, system: str, user: str) -> str:
        try:
            import google.generativeai as genai  # type: ignore
        except ImportError:
            log.warning("google-generativeai package not installed — falling back to mock")
            return "__mock__"
        if not settings.GEMINI_API_KEY:
            log.warning("GEMINI_API_KEY not set — falling back to mock")
            return "__mock__"
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.AI_MODEL_COPILOT)
        combined = f"{system}\n\n{user}"
        return model.generate_content(combined).text or ""

    # ------------------------------------------------------------------
    # Mock provider — no network calls
    # ------------------------------------------------------------------

    @staticmethod
    def _mock_structured(schema: dict[str, Any]) -> dict[str, Any]:
        """Retorna defaults para cada propriedade do JSON Schema (para testes)."""
        type_defaults: dict[str, Any] = {
            "string": "",
            "number": 0.0,
            "integer": 0,
            "boolean": False,
            "array": [],
            "object": {},
        }
        result: dict[str, Any] = {}
        props = schema.get("properties", {})
        for key, prop_schema in props.items():
            t = prop_schema.get("type", "string")
            result[key] = type_defaults.get(t, None)
        return result


# Singleton para importação direta
ai_client = AIClient()
