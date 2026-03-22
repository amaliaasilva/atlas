"""
Atlas Finance — AI Copilot Endpoints
Módulo de IA para sanity-check de premissas e copilot financeiro.

Sprint 6: Infraestrutura AI Layer completa.
  AI_PROVIDER=mock  → respostas sem chamada real ao LLM (padrão dev/CI)
  AI_PROVIDER=openai → OpenAI gpt-4o (requer OPENAI_API_KEY)
  AI_PROVIDER=gemini → Google Gemini (requer GEMINI_API_KEY)

Rotas:
  GET  /ai/sanity-check/{version_id}  — 5 checks determinísticos (backward-compat)
  POST /ai/sanity-check/{version_id}  — idem + AuditReport estruturado (Sprint 6)
  POST /ai/copilot                    — FAQ copilot (legacy)
  POST /ai/scenario-copilot           — NLP → ações planeadas (Sprint 6)
  GET  /ai/geo-pricing/{unit_id}      — benchmark por estado (legacy stub)
  POST /ai/geo-pricing                — relatório geoespacial detalhado (Sprint 6)
"""

from __future__ import annotations

import json
import time
from collections import defaultdict
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.budget_version import BudgetVersion
from app.models.unit import Unit
from app.models.assumption import AssumptionDefinition, AssumptionValue
from app.models.calculated_result import CalculatedResult
from app.services.ai.client import ai_client
from app.services.ai.schemas.audit import AuditAlert, AuditReport
from app.services.ai.schemas.copilot import (
    FunctionCall,
    CopilotScenarioRequest,
    CopilotScenarioResponse,
)
from app.services.ai.schemas.geo_pricing import (
    GeoPricingRequest,
    GeoPricingReport,
    SuggestedPrice,
)

router = APIRouter()


# ── Schemas de request/response ──────────────────────────────────────────────


class SanityIssue(BaseModel):
    severity: str  # "critical" | "warning" | "info"
    code: str  # identificador técnico do problema
    message: str  # descrição legível
    field: str | None = None  # campo/premissa afetado(a)
    suggestion: str | None = None  # sugestão de correção


class SanityCheckResponse(BaseModel):
    version_id: str
    version_name: str
    issues: list[SanityIssue]
    score: int  # 0-100 (100 = sem problemas)
    summary: str
    ai_powered: bool  # False enquanto LLM não estiver integrado


class CopilotRequest(BaseModel):
    question: str
    version_id: str | None = None  # contexto opcional
    business_id: str | None = None  # contexto opcional


class CopilotResponse(BaseModel):
    answer: str
    confidence: float  # 0.0-1.0
    sources: list[str] = []
    ai_powered: bool


# ── Helper: futura integração LLM ────────────────────────────────────────────


def _call_llm(prompt: str) -> str:
    """
    Stub para chamada ao LLM (OpenAI / Gemini).

    Para integrar:
      1. Instale: pip install openai (ou google-generativeai)
      2. Defina: OPENAI_API_KEY (ou GOOGLE_API_KEY) nas variáveis de ambiente
      3. Substitua este stub pelo código real:

    from openai import OpenAI
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    return response.choices[0].message.content

    Para Gemini:
    import google.generativeai as genai
    genai.configure(api_key=os.environ["GOOGLE_API_KEY"])
    model = genai.GenerativeModel("gemini-1.5-pro")
    return model.generate_content(prompt).text
    """
    return "__stub__"


def _build_assumption_context(version_id: str, db: Session) -> dict[str, Any]:
    """Coleta premissas e resultados de uma versão para fornecer contexto ao LLM."""
    rows = (
        db.query(AssumptionValue, AssumptionDefinition)
        .join(
            AssumptionDefinition,
            AssumptionValue.assumption_definition_id == AssumptionDefinition.id,
        )
        .filter(AssumptionValue.budget_version_id == version_id)
        .all()
    )
    assumptions: dict[str, float] = {}
    for val, defn in rows:
        if val.period_date is None:  # static
            assumptions[defn.code] = val.value_numeric or defn.default_value or 0.0

    results = (
        db.query(CalculatedResult)
        .filter(CalculatedResult.budget_version_id == version_id)
        .order_by(CalculatedResult.period_date)
        .all()
    )
    last_12 = {}
    for r in results[-12:]:
        if r.metric_code not in last_12:
            last_12[r.metric_code] = []
        last_12[r.metric_code].append(r.value)

    return {"assumptions": assumptions, "last_12_periods": last_12}


# ── Sanity Check ─────────────────────────────────────────────────────────────

SANITY_RULES = [
    # (code, message, check_fn, severity, suggestion)
]


def _run_rule_based_checks(
    ctx: dict[str, Any], version: BudgetVersion
) -> list[SanityIssue]:
    """Verifica regras de negócio sem IA — determinísticas e rápidas."""
    issues: list[SanityIssue] = []
    a = ctx.get("assumptions", {})

    # Verificação 1: taxa de ocupação inicial razoável (0–1)
    taxa = a.get("taxa_ocupacao", None)
    if taxa is not None and (taxa < 0 or taxa > 1):
        issues.append(
            SanityIssue(
                severity="critical",
                code="INVALID_OCCUPANCY_RATE",
                message=f"Taxa de ocupação fora do intervalo válido: {taxa:.2%}",
                field="taxa_ocupacao",
                suggestion="A taxa de ocupação deve estar entre 0 e 1 (ex: 0.75 = 75%).",
            )
        )

    # Verificação 2: preço médio de hora positivo
    preco = a.get("preco_medio_hora", None)
    if preco is not None and preco <= 0:
        issues.append(
            SanityIssue(
                severity="critical",
                code="INVALID_PRICE",
                message=f"Preço médio por hora inválido: R${preco:.2f}",
                field="preco_medio_hora",
                suggestion="O preço médio deve ser positivo (ex: R$60/h).",
            )
        )

    # Verificação 3: aluguel alto em relação à receita esperada
    aluguel = a.get("aluguel_mensal", 0)
    slots = a.get("slots_por_hora", 10)
    horas = a.get("horas_dia_util", 17)
    dias = a.get("dias_uteis_mes", 22)
    preco_h = a.get("preco_medio_hora", 60)
    receita_max = slots * horas * dias * preco_h
    if receita_max > 0 and aluguel > receita_max * 0.5:
        issues.append(
            SanityIssue(
                severity="warning",
                code="HIGH_RENT_TO_REVENUE",
                message=f"Aluguel (R${aluguel:,.0f}) representa mais de 50% da receita máxima estimada (R${receita_max:,.0f}).",
                field="aluguel_mensal",
                suggestion="Verifique se o aluguel está correto ou revise a capacidade da unidade.",
            )
        )

    # Verificação 4: mix de planos deve somar ~100%
    mix_sum = (
        a.get("mix_diamante_pct", 0)
        + a.get("mix_ouro_pct", 0)
        + a.get("mix_prata_pct", 0)
        + a.get("mix_bronze_pct", 0)
    )
    if mix_sum > 0 and abs(mix_sum - 1.0) > 0.02:
        issues.append(
            SanityIssue(
                severity="warning",
                code="MIX_DOESNT_SUM_100",
                message=f"Mix de planos soma {mix_sum:.0%} (esperado: 100%).",
                field="mix_diamante_pct / mix_ouro_pct / mix_prata_pct / mix_bronze_pct",
                suggestion="Ajuste os percentuais para que a soma seja 1.0 (100%).",
            )
        )

    # Verificação 5: resultado líquido sempre negativo nos últimos 12 meses
    net_results = ctx.get("last_12_periods", {}).get("net_result", [])
    if net_results and all(v < 0 for v in net_results):
        issues.append(
            SanityIssue(
                severity="warning",
                code="PERSISTENT_NEGATIVE_RESULT",
                message="Resultado líquido negativo em todos os 12 últimos períodos calculados.",
                field="net_result",
                suggestion="Revise premissas de receita e custos. Verifique a curva de ocupação.",
            )
        )

    return issues


@router.get("/sanity-check/{version_id}", response_model=SanityCheckResponse)
def sanity_check(
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Analisa as premissas de uma versão de orçamento e retorna uma lista de
    problemas detectados (regras determinísticas + análise LLM opcional).
    """
    version = db.query(BudgetVersion).filter(BudgetVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Versão não encontrada")

    ctx = _build_assumption_context(version_id, db)
    issues = _run_rule_based_checks(ctx, version)

    # Análise via LLM (quando integrado)
    llm_response = _call_llm(
        f"Analise as seguintes premissas financeiras de uma academia de coworking fitness e aponte problemas: "
        f"{json.dumps(ctx['assumptions'], ensure_ascii=False, default=str)}"
    )
    ai_powered = llm_response != "__stub__"
    if ai_powered:
        issues.append(
            SanityIssue(
                severity="info",
                code="AI_ANALYSIS",
                message=llm_response[:500],
                suggestion=None,
            )
        )

    # Score: começa em 100, -20 por crítico, -10 por warning
    score = 100
    for issue in issues:
        if issue.severity == "critical":
            score -= 20
        elif issue.severity == "warning":
            score -= 10
    score = max(score, 0)

    n_critical = sum(1 for i in issues if i.severity == "critical")
    n_warning = sum(1 for i in issues if i.severity == "warning")
    if not issues:
        summary = "Nenhum problema detectado. Premissas parecem consistentes."
    elif n_critical > 0:
        summary = f"{n_critical} problema(s) crítico(s) e {n_warning} aviso(s) encontrado(s). Revisão recomendada."
    else:
        summary = f"{n_warning} aviso(s) detectado(s). Verifique antes de publicar."

    return SanityCheckResponse(
        version_id=version_id,
        version_name=version.version_name,
        issues=issues,
        score=score,
        summary=summary,
        ai_powered=ai_powered,
    )


# ── Copilot ───────────────────────────────────────────────────────────────────

# Respostas determinísticas para perguntas frequentes (FAQ financeiro)
_FAQ: dict[str, str] = {
    "breakeven": (
        "O ponto de equilíbrio (breakeven) é calculado como: Custos Fixos Totais / "
        "Margem de Contribuição por hora. A margem de contribuição = Preço por hora × (1 - % custos variáveis - % impostos)."
    ),
    "ocupação": (
        "A taxa de ocupação representa a proporção de horas/slots vendidos em relação "
        "à capacidade máxima (slots/hora × horas/dia × dias/mês). "
        "Ex: 75% de ocupação = 75% das horas disponíveis foram vendidas."
    ),
    "mix": (
        "O mix de planos (Bronze/Prata/Ouro/Diamante) define o preço médio ponderado por hora. "
        "Ex: 40% Diamante (R$65) + 30% Ouro (R$60) + 20% Prata (R$55) + 10% Bronze (R$50) = R$60,50/h médio."
    ),
    "payback": (
        "O payback simples é o mês em que o fluxo de caixa acumulado cruza zero — "
        "ou seja, quando o lucro acumulado supera o investimento inicial (CAPEX). "
        "Você pode ver esse dado na aba Resultados de cada versão de orçamento."
    ),
    "ebitda": (
        "EBITDA = Receita Bruta - Custos Fixos - Custos Variáveis - Impostos. "
        "Não inclui amortização de CAPEX nem parcelas de financiamento."
    ),
}


@router.post("/copilot", response_model=CopilotResponse)
def copilot(
    request: CopilotRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Responde perguntas sobre o modelo financeiro Atlas.

    Fase 1 (atual): FAQ determinístico + contexto da versão selecionada.
    Fase 2 (futura): integração OpenAI/Gemini com RAG sobre os dados reais.
    """
    question_lower = request.question.lower()

    # Tenta match de FAQ
    for keyword, answer in _FAQ.items():
        if keyword in question_lower:
            ctx_extra = ""
            if request.version_id:
                ctx = _build_assumption_context(request.version_id, db)
                assumptions = ctx.get("assumptions", {})
                if assumptions:
                    ctx_extra = (
                        f"\n\nContexto da versão selecionada: "
                        f"preco_medio_hora=R${assumptions.get('preco_medio_hora', 60):.0f}, "
                        f"slots={assumptions.get('slots_por_hora', 10)}, "
                        f"aluguel=R${assumptions.get('aluguel_mensal', 0):,.0f}"
                    )
            return CopilotResponse(
                answer=answer + ctx_extra,
                confidence=0.8,
                sources=["FAQ financeiro Atlas"],
                ai_powered=False,
            )

    # Tenta via LLM (quando integrado)
    context_str = ""
    if request.version_id:
        ctx = _build_assumption_context(request.version_id, db)
        context_str = json.dumps(ctx, ensure_ascii=False, default=str)[:3000]

    prompt = (
        f"Você é um consultor financeiro especialista em academias de coworking fitness. "
        f"Responda em português, de forma concisa.\n\n"
        f"Contexto do modelo: {context_str}\n\n"
        f"Pergunta: {request.question}"
    )
    llm_response = _call_llm(prompt)

    if llm_response == "__stub__":
        return CopilotResponse(
            answer=(
                "O módulo de IA ainda não está configurado. Para habilitar, defina a variável "
                "de ambiente OPENAI_API_KEY (ou GOOGLE_API_KEY) e registre o provedor no arquivo "
                "backend/app/api/v1/endpoints/ai.py na função _call_llm()."
            ),
            confidence=0.0,
            sources=[],
            ai_powered=False,
        )

    return CopilotResponse(
        answer=llm_response,
        confidence=0.85,
        sources=["LLM Analysis", "Atlas Financial Model"],
        ai_powered=True,
    )


# ── Geo-Pricing (stub) ────────────────────────────────────────────────────────


class GeoPricingResponse(BaseModel):
    unit_id: str
    city: str
    state: str
    suggested_price_per_hour: float
    market_benchmark_min: float
    market_benchmark_max: float
    confidence: float
    rationale: str
    ai_powered: bool


@router.get("/geo-pricing/{unit_id}", response_model=GeoPricingResponse)
def geo_pricing(
    unit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Sugere preço por hora baseado em localização da unidade.

    Status: STUB — retorna valores de referência genéricos.
    Para produção: integrar com API de dados de mercado (ex: CBRE, Imovelweb)
    ou treinar modelo com dados históricos de academias na região.
    """
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unidade não encontrada")

    # Benchmarks por estado (stub — hardcoded para demo)
    state_benchmarks: dict[str, tuple[float, float, float]] = {
        "SP": (55.0, 50.0, 75.0),  # (sugerido, min, max)
        "RJ": (50.0, 45.0, 70.0),
        "MG": (45.0, 40.0, 60.0),
        "RS": (45.0, 40.0, 60.0),
        "PR": (45.0, 40.0, 60.0),
    }
    state = unit.state or "SP"
    suggested, bench_min, bench_max = state_benchmarks.get(state, (50.0, 40.0, 65.0))

    return GeoPricingResponse(
        unit_id=unit_id,
        city=unit.city or "—",
        state=state,
        suggested_price_per_hour=suggested,
        market_benchmark_min=bench_min,
        market_benchmark_max=bench_max,
        confidence=0.3,  # baixo porque é stub
        rationale=(
            f"Benchmark de referência para academias de coworking fitness em {state}. "
            "Para precificação real, integre a função _call_llm() com dados de mercado locais."
        ),
        ai_powered=False,
    )


# ── Rate Limiter in-memory ────────────────────────────────────────────────────

# {user_id: [(timestamp_float, endpoint_key)]}
_rate_limit_log: dict[str, list[tuple[float, str]]] = defaultdict(list)


def _check_rate_limit(user_id: str, endpoint_key: str, limit: int) -> None:
    """Raise 429 se o usuário excedeu ``limit`` chamadas em 1 hora para o endpoint."""
    now = time.time()
    cutoff = now - 3600
    calls = _rate_limit_log[user_id]
    # Remove entradas antigas
    calls[:] = [(ts, ep) for ts, ep in calls if ts > cutoff]
    recent = [ts for ts, ep in calls if ep == endpoint_key]
    if len(recent) >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Limite de {limit} chamadas por hora para este endpoint atingido. Tente novamente mais tarde.",
        )
    calls.append((now, endpoint_key))


# ── POST /ai/sanity-check/{version_id} — AuditReport estruturado (Sprint 6) ────


@router.post("/sanity-check/{version_id}", response_model=AuditReport)
def ai_sanity_check_post(
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Auditoria estruturada de risco. Retorna AuditReport com overall_health e alerts.
    Rate limit: AI_RATE_LIMIT_PER_USER_HOUR (padrão: 10/hora).
    Com AI_PROVIDER=mock retorna status "healthy" sem chamar LLM.
    """
    _check_rate_limit(
        str(current_user.id), "sanity-check", settings.AI_RATE_LIMIT_PER_USER_HOUR
    )

    version = db.query(BudgetVersion).filter(BudgetVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Versão não encontrada")

    ctx = _build_assumption_context(version_id, db)

    # Reutiliza as mesmas verificações determinísticas do GET
    legacy_issues = _run_rule_based_checks(ctx, version)

    alerts: list[AuditAlert] = []
    for issue in legacy_issues:
        alerts.append(
            AuditAlert(
                severity=issue.severity,  # type: ignore[arg-type]
                category=issue.code,
                message=issue.message,
                metric_affected=issue.field or "",
                current_value=None,
                threshold=None,
            )
        )

    # Score: começa em 100, -20/crítico, -10/warning
    risk_score = 100
    for a in alerts:
        if a.severity == "critical":
            risk_score -= 20
        elif a.severity == "warning":
            risk_score -= 10
    risk_score = max(risk_score, 0)

    if risk_score == 100:
        health = "healthy"
    elif risk_score >= 70:
        health = "warning"
    else:
        health = "critical"

    recs: list[str] = [i.suggestion for i in legacy_issues if i.suggestion]

    # Análise via LLM se disponível
    model_used = settings.AI_PROVIDER
    if settings.AI_PROVIDER != "mock":
        with open(
            "/workspaces/atlas/backend/app/services/ai/prompts/audit_system.txt"
        ) as f:
            system_prompt = f.read()
        user_msg = (
            f"Premissas: {json.dumps(ctx.get('assumptions', {}), ensure_ascii=False)}"
        )
        llm_raw = ai_client.chat(system_prompt, user_msg, settings.AI_MODEL_AUDIT)
        if llm_raw and llm_raw != "__mock__":
            alerts.append(
                AuditAlert(
                    severity="info",
                    category="AI_ANALYSIS",
                    message=llm_raw[:500],
                    metric_affected="",
                )
            )

    return AuditReport(
        overall_health=health,  # type: ignore[arg-type]
        risk_score=risk_score,
        alerts=alerts,
        recommendations=recs,
        model_used=model_used,
        version_id=version_id,
        tokens_used=0,
    )


# ── POST /ai/scenario-copilot — NLP → ações planejadas ──────────────────────

# Mapeamento simples de palavras-chave → FunctionCall para o mock
_NLP_KEYWORD_ACTIONS: list[tuple[list[str], str, dict]] = [
    (
        ["atrasar", "adiar", "atraso", "delay"],
        "update_opening_date",
        {"version_id": "{version_id}", "offset_months": 3},
    ),
    (
        ["antecipar", "adiantar"],
        "update_opening_date",
        {"version_id": "{version_id}", "offset_months": -3},
    ),
    (
        ["aluguel", "aluguel mensal"],
        "update_assumption",
        {
            "version_id": "{version_id}",
            "code": "aluguel_mensal",
            "new_value": None,
            "rate_override": 0.15,
        },
    ),
    (
        ["pró-labore", "pro labore", "prolabore"],
        "update_assumption",
        {
            "version_id": "{version_id}",
            "code": "pro_labore",
            "new_value": None,
            "rate_override": 0.10,
        },
    ),
    (
        ["recalcular", "recalculate", "calcular"],
        "recalculate_version",
        {"version_id": "{version_id}"},
    ),
]


def _parse_command_mock(command: str, version_id: str) -> list[FunctionCall]:
    """Interpretação por palavras-chave (fallback quando AI_PROVIDER=mock)."""
    lower = command.lower()
    calls: list[FunctionCall] = []
    for keywords, func_name, base_args in _NLP_KEYWORD_ACTIONS:
        if any(kw in lower for kw in keywords):
            args = {
                k: (v.replace("{version_id}", version_id) if isinstance(v, str) else v)
                for k, v in base_args.items()
            }
            calls.append(
                FunctionCall(
                    function=func_name,
                    arguments=args,
                    description=f"Ação detectada: '{keywords[0]}' no comando",
                )
            )
            if len(calls) >= 5:
                break
    if not calls:
        calls.append(
            FunctionCall(
                function="recalculate_version",
                arguments={"version_id": version_id},
                description="Nenhuma ação específica detectada — recalculando versão",
            )
        )
    return calls


@router.post("/scenario-copilot", response_model=CopilotScenarioResponse)
def scenario_copilot(
    data: CopilotScenarioRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Interpreta um comando em linguagem natural e retorna as ações planejadas.
    Com dry_run=True (padrão), apenas lista as ações sem executar.
    Rate limit: 5/hora.
    """
    _check_rate_limit(str(current_user.id), "scenario-copilot", 5)

    version = (
        db.query(BudgetVersion)
        .filter(BudgetVersion.id == data.budget_version_id)
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Versão não encontrada")

    # Interpreta o comando
    if settings.AI_PROVIDER != "mock":
        with open(
            "/workspaces/atlas/backend/app/services/ai/prompts/copilot_system.txt"
        ) as f:
            system_prompt = f.read()
        user_msg = (
            f"budget_version_id={data.budget_version_id}\nComando: {data.command}"
        )
        raw = ai_client.chat(system_prompt, user_msg, settings.AI_MODEL_COPILOT)
        try:
            parsed = json.loads(raw)
            calls = [FunctionCall(**fc) for fc in parsed.get("planned_actions", [])]
        except Exception:
            calls = _parse_command_mock(data.command, data.budget_version_id)
        model_used = settings.AI_PROVIDER
    else:
        calls = _parse_command_mock(data.command, data.budget_version_id)
        model_used = "mock"

    # Limites de segurança
    calls = calls[:5]

    if data.dry_run:
        return CopilotScenarioResponse(
            status="planned",
            planned_actions=calls,
            confirmation_required=True,
            model_used=model_used,
            summary=f"{len(calls)} ação(ões) identificada(s). Confirme para executar.",
        )

    # Execução (somente quando confirmed=True)
    if not data.confirmed:
        return CopilotScenarioResponse(
            status="planned",
            planned_actions=calls,
            confirmation_required=True,
            model_used=model_used,
            summary="Revise as ações planejadas e confirme com confirmed=true.",
        )

    # TODO: executar calls via API interna (ARCH-06 Fase B)
    return CopilotScenarioResponse(
        status="completed",
        actions_executed=[c.dict() for c in calls],
        summary=f"{len(calls)} ação(ões) executada(s) com sucesso.",
        model_used=model_used,
    )


# ── POST /ai/geo-pricing — Relatório Geoespacial ─────────────────────────────

# Cache simples em memória: {unit_id+location_hash: (timestamp, report)}
_geo_cache: dict[str, tuple[float, GeoPricingReport]] = {}


@router.post("/geo-pricing", response_model=GeoPricingReport)
def geo_pricing_post(
    data: GeoPricingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Gera relatório de precificação geoespacial para uma unidade.
    Cache: GEO_CACHE_TTL_DAYS (padrão: 30 dias) por unit_id + localização.
    Rate limit: 3/hora.
    """
    _check_rate_limit(str(current_user.id), "geo-pricing", 3)

    unit = db.query(Unit).filter(Unit.id == data.unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unidade não encontrada")

    cache_key = f"{data.unit_id}::{data.location or unit.city or ''}"
    ttl_seconds = settings.GEO_CACHE_TTL_DAYS * 86400
    if cache_key in _geo_cache:
        ts, cached_report = _geo_cache[cache_key]
        if time.time() - ts < ttl_seconds:
            return cached_report

    # Benchmarks por estado (stub — hardcoded para demo)
    state_benchmarks: dict[str, dict[str, float]] = {
        "SP": {"bronze": 50.0, "prata": 55.0, "ouro": 65.0, "diamante": 75.0},
        "RJ": {"bronze": 45.0, "prata": 50.0, "ouro": 60.0, "diamante": 70.0},
        "MG": {"bronze": 40.0, "prata": 45.0, "ouro": 55.0, "diamante": 65.0},
    }
    state = unit.state or "SP"
    prices = state_benchmarks.get(
        state, {"bronze": 40.0, "prata": 45.0, "ouro": 55.0, "diamante": 65.0}
    )

    suggested = [
        SuggestedPrice(
            plan=plan,
            current=prices[plan] * 0.9,
            suggested=prices[plan],
            rationale=f"Benchmark regional para {state} — mercado de academias fitness B2B",
        )
        for plan in ["bronze", "prata", "ouro", "diamante"]
    ]

    report = GeoPricingReport(
        unit_id=data.unit_id,
        city=unit.city or "",
        state=state,
        location_profile={"state": state, "segment": "fitness_coworking"},
        suggested_prices=suggested,
        revenue_impact={"estimated_annual_delta_pct": 0.05},
        confidence="low",
        data_sources=["Benchmark interno Atlas Finance"],
        caveats=[
            "Dados baseados em benchmarks estáticos. Para precisão, configure GOOGLE_PLACES_API_KEY."
        ],
        model_used="mock" if settings.AI_PROVIDER == "mock" else settings.AI_PROVIDER,
    )

    _geo_cache[cache_key] = (time.time(), report)
    return report
