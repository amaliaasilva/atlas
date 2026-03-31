"""
Atlas Finance — Revenue Calculator
Modelo de negócio: venda de slots/hora para Personal Trainers (Coworking B2B).

Fórmula central:
    capacity_hours  = (dias_uteis × horas_dia_semana + sábados × horas_sábado) × vagas_por_hora
    active_hours    = capacity_hours × occupancy_rate
    avg_price       = Σ(plan.price_per_hour × plan.mix_pct)   [mix de planos]
    cowork_revenue  = active_hours × avg_price

Fallback legado (max_students × ticket) usado apenas se slots_per_hour == 0 E avg_price_per_hour == 0.
"""

import math
from app.services.financial_engine.models import RevenueInputs, ServicePlanMix


def calculate_avg_price_per_hour(service_plans: list[ServicePlanMix]) -> float:
    """
    Preço médio ponderado (R$/hora) derivado do mix de planos de serviço.
    Ex: [Diamante 65×0.40, Ouro 60×0.30, Prata 55×0.20, Bronze 50×0.10] → R$ 60,00/h

    §16.7 — mix_pct validation: se a soma diferir de 1.0 por mais de 1%,
    normaliza automaticamente para garantir que o cálculo seja coerente.
    """
    if not service_plans:
        return 0.0
    total_mix = sum(p.mix_pct for p in service_plans)
    if total_mix <= 0:
        return 0.0
    # Normaliza se necessário (tolerância de 1%)
    if abs(total_mix - 1.0) > 0.01:
        plans = [
            ServicePlanMix(
                name=p.name,
                price_per_hour=p.price_per_hour,
                mix_pct=p.mix_pct / total_mix,
            )
            for p in service_plans
        ]
    else:
        plans = service_plans
    return round(sum(p.price_per_hour * p.mix_pct for p in plans), 2)


def calculate_capacity_hours_month(inputs: RevenueInputs) -> float:
    """
    Horas totais disponíveis no mês (capacidade máxima física).
    = (dias_uteis × horas_semana + sábados × horas_sábado) × vagas_por_hora
    """
    total_hours = (
        inputs.working_days_month * inputs.hours_per_day_weekday
        + inputs.saturdays_month * inputs.hours_per_day_saturday
    )
    return round(total_hours * inputs.slots_per_hour, 2)


def calculate_gross_revenue(inputs: RevenueInputs) -> dict:
    """
    Calcula receita bruta e seus componentes para o período.

    Prioridade:
      1. Modelo coworking B2B (slots_per_hour > 0 e preço disponível via mix ou avg_price_per_hour)
      2. Fallback legado (max_students × ticket médio — SmartFit style)
    """
    capacity_hours = calculate_capacity_hours_month(inputs)
    active_hours = round(capacity_hours * inputs.occupancy_rate, 2)

    # Determina preço médio: mix de planos > campo direto > legado
    if inputs.service_plans:
        avg_price = calculate_avg_price_per_hour(inputs.service_plans)
    else:
        avg_price = inputs.avg_price_per_hour

    if capacity_hours > 0 and avg_price > 0:
        # ── MODELO COWORKING B2B ────────────────────────────────────────────
        cowork_revenue = round(active_hours * avg_price, 2)
        other = round(inputs.other_revenue, 2)
        total = round(cowork_revenue + other, 2)
        return {
            "gross_revenue": total,
            "cowork_revenue": cowork_revenue,
            "membership_revenue": cowork_revenue,  # alias compatibilidade
            "personal_training_revenue": 0.0,
            "other_revenue": other,
            "capacity_hours_month": capacity_hours,
            "active_hours_month": active_hours,
            "avg_price_per_hour": avg_price,
            "active_students": math.ceil(active_hours),  # slots ocupados (compat.)
        }

    # ── FALLBACK LEGADO (max_students × ticket) ─────────────────────────────
    active = math.floor(inputs.max_students * inputs.occupancy_rate)
    monthly = math.floor(active * inputs.mix_monthly_pct)
    quarterly = math.floor(active * inputs.mix_quarterly_pct)
    annual = active - monthly - quarterly
    membership = round(
        monthly * inputs.avg_ticket_monthly
        + quarterly * inputs.avg_ticket_quarterly
        + annual * inputs.avg_ticket_annual,
        2,
    )
    personal = round(
        inputs.num_personal_trainers * inputs.avg_personal_revenue_month, 2
    )
    other = round(inputs.other_revenue, 2)
    total = round(membership + personal + other, 2)
    return {
        "gross_revenue": total,
        "cowork_revenue": membership,
        "membership_revenue": membership,
        "personal_training_revenue": personal,
        "other_revenue": other,
        "capacity_hours_month": 0.0,
        "active_hours_month": float(active),
        "avg_price_per_hour": inputs.avg_ticket_monthly,
        "active_students": active,
    }
