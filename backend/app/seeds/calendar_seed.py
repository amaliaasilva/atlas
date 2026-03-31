"""Atlas Finance — Seed: Feriados Nacionais BR 2026–2034 (BE-A-03)

Popula a tabela calendar_exceptions com todos os feriados nacionais fixos
e móveis (Páscoa, Carnaval, Sexta-feira Santa, Corpus Christi).

Uso:
    python -m app.seeds.calendar_seed
"""

from datetime import date, timedelta
import uuid

# ── Algoritmo de Páscoa (Computus gregoriano) ─────────────────────────────────


def easter(year: int) -> date:
    """Retorna a data da Páscoa pelo algoritmo gregoriano anônimo."""
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)


# ── Constantes ────────────────────────────────────────────────────────────────

YEARS = range(2026, 2035)  # 2026 a 2034 inclusive


def get_national_holidays(year: int) -> list[tuple[date, str]]:
    """Retorna lista de (data, descrição) dos feriados nacionais de um ano."""
    e = easter(year)
    carnival_monday = e - timedelta(days=48)
    carnival_tuesday = e - timedelta(days=47)
    good_friday = e - timedelta(days=2)
    corpus_christi = e + timedelta(days=60)

    holidays = [
        # ── Feriados fixos ─────────────────────────────────────────────────────
        (date(year, 1, 1), "Confraternização Universal (Ano Novo)"),
        (date(year, 4, 21), "Tiradentes"),
        (date(year, 5, 1), "Dia do Trabalho"),
        (date(year, 9, 7), "Independência do Brasil"),
        (date(year, 10, 12), "Nossa Senhora Aparecida"),
        (date(year, 11, 2), "Finados"),
        (date(year, 11, 15), "Proclamação da República"),
        (date(year, 11, 20), "Dia da Consciência Negra"),
        (date(year, 12, 25), "Natal"),
        # ── Feriados móveis (Páscoa + derivados) ──────────────────────────────
        (carnival_monday, "Carnaval — Segunda-feira"),
        (carnival_tuesday, "Carnaval — Terça-feira"),
        (good_friday, "Sexta-feira Santa"),
        (corpus_christi, "Corpus Christi"),
    ]

    return holidays


def run_seed(db) -> int:
    """
    Insere feriados nacionais 2026–2034.
    Idempotente: verifica existência antes de inserir.
    Retorna número de novos registros inseridos.
    """
    from app.models.calendar_exception import CalendarException, CalendarExceptionType

    inserted = 0
    for year in YEARS:
        for holiday_date, description in get_national_holidays(year):
            # Verifica se já existe
            existing = (
                db.query(CalendarException)
                .filter(
                    CalendarException.unit_id.is_(None),
                    CalendarException.exception_date == holiday_date,
                    CalendarException.exception_type
                    == CalendarExceptionType.holiday_national,
                )
                .first()
            )
            if not existing:
                entry = CalendarException(
                    id=str(uuid.uuid4()),
                    unit_id=None,
                    exception_date=holiday_date,
                    exception_type=CalendarExceptionType.holiday_national,
                    description=description,
                )
                db.add(entry)
                inserted += 1

    db.commit()
    return inserted


if __name__ == "__main__":
    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        count = run_seed(db)
        print(f"✅ Seed concluído: {count} feriados inseridos para 2026–2034.")
    finally:
        db.close()
