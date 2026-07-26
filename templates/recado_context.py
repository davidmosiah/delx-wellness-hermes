#!/usr/bin/env python3
"""Build context for "O Recado do Dia".

This script is intentionally read-only: it summarizes the local WHOOP digest
context and recent Nourish intake entries so Hermes can generate one concise
daily message without inventing food, recovery, or training data.
"""

from __future__ import annotations

import json
import os
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any

try:
    from zoneinfo import ZoneInfo
except Exception:  # pragma: no cover - Python <3.9 fallback for unusual hosts.
    ZoneInfo = None  # type: ignore[assignment]


DEFAULT_HERMES_HOME = "/root/.hermes"
DEFAULT_PROFILE = "david"
DEFAULT_TIMEZONE = "America/Fortaleza"
DEFAULT_LOOKBACK_DAYS = 2
DEFAULT_MAX_ENTRIES = 12


def env_int(name: str, default: int) -> int:
    try:
        value = int(os.environ.get(name, ""))
    except ValueError:
        return default
    return value if value > 0 else default


def local_timezone():
    zone = os.environ.get("RECADO_LOCAL_TZ", DEFAULT_TIMEZONE)
    if ZoneInfo is not None:
        try:
            return ZoneInfo(zone)
        except Exception:
            pass
    return timezone.utc


LOCAL_TZ = local_timezone()
LOOKBACK_DAYS = env_int("RECADO_FOOD_LOOKBACK_DAYS", DEFAULT_LOOKBACK_DAYS)
MAX_ENTRIES = env_int("RECADO_MAX_FOOD_ENTRIES", DEFAULT_MAX_ENTRIES)


def intake_path() -> Path:
    explicit = os.environ.get("RECADO_INTAKE_PATH")
    if explicit:
        return Path(explicit)
    hermes_home = os.environ.get("HERMES_HOME", DEFAULT_HERMES_HOME)
    profile = os.environ.get("RECADO_NOURISH_PROFILE", DEFAULT_PROFILE)
    return Path(hermes_home) / "nourish" / profile / "intake.jsonl"


def now_utc() -> datetime:
    override = os.environ.get("RECADO_NOW")
    if override:
        parsed = parse_datetime(override)
        if parsed is not None:
            return parsed
    return datetime.now(timezone.utc)


def parse_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    try:
        if len(raw) == 10:
            parsed_date = date.fromisoformat(raw)
            local_dt = datetime.combine(parsed_date, time(hour=12), tzinfo=LOCAL_TZ)
            return local_dt.astimezone(timezone.utc)
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=LOCAL_TZ)
    return parsed.astimezone(timezone.utc)


def entry_time(entry: dict[str, Any]) -> str:
    for key in ("timestamp", "logged_at", "loggedAt", "date"):
        value = entry.get(key)
        if value:
            return str(value)
    return ""


def recent_food(path: Path, days: int = LOOKBACK_DAYS, max_entries: int = MAX_ENTRIES) -> list[dict[str, Any]]:
    cutoff = now_utc() - timedelta(days=days)
    entries: list[tuple[datetime | None, dict[str, Any]]] = []
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        return []

    for line in lines:
        raw = line.strip()
        if not raw:
            continue
        try:
            entry = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if not isinstance(entry, dict):
            continue
        parsed_time = parse_datetime(entry_time(entry))
        if parsed_time is None or parsed_time >= cutoff:
            entries.append((parsed_time, entry))

    entries.sort(key=lambda item: item[0] or datetime.min.replace(tzinfo=timezone.utc))
    return [entry for _, entry in entries[-max_entries:]]


def food_name(entry: dict[str, Any]) -> str:
    if entry.get("food_name"):
        return str(entry["food_name"])
    food_ref = entry.get("food_ref")
    if isinstance(food_ref, dict) and food_ref.get("name"):
        return str(food_ref["name"])
    custom_food = entry.get("custom_food")
    if isinstance(custom_food, dict):
        if custom_food.get("display_name_pt_br"):
            return str(custom_food["display_name_pt_br"])
        if custom_food.get("name"):
            return str(custom_food["name"])
    if entry.get("notes"):
        return str(entry["notes"])
    if entry.get("text"):
        return str(entry["text"])
    return "unknown food"


def nutrients(entry: dict[str, Any]) -> dict[str, float]:
    value = entry.get("nutrients")
    if not isinstance(value, dict):
        return {}
    out: dict[str, float] = {}
    for key in ("calories_kcal", "protein_g", "carbohydrates_g", "fat_g", "fiber_g", "sodium_mg"):
        nutrient_value = value.get(key)
        if isinstance(nutrient_value, (int, float)):
            out[key] = float(nutrient_value)
    return out


def rounded(value: float, digits: int = 0) -> str:
    rounded_value = round(value, digits)
    if digits == 0:
        return str(int(rounded_value))
    return str(rounded_value)


def nutrient_fragment(entry: dict[str, Any]) -> str:
    data = nutrients(entry)
    parts: list[str] = []
    if "calories_kcal" in data:
        parts.append(f"{rounded(data['calories_kcal'])} kcal")
    if "protein_g" in data:
        parts.append(f"{rounded(data['protein_g'], 1)}g protein")
    if "carbohydrates_g" in data:
        parts.append(f"{rounded(data['carbohydrates_g'], 1)}g carbs")
    if "fat_g" in data:
        parts.append(f"{rounded(data['fat_g'], 1)}g fat")
    return ", ".join(parts)


def food_totals(entries: list[dict[str, Any]]) -> dict[str, float]:
    totals: dict[str, float] = {}
    for entry in entries:
        for key, value in nutrients(entry).items():
            totals[key] = totals.get(key, 0.0) + value
    return totals


def load_whoop_context() -> str:
    if os.environ.get("RECADO_SKIP_WHOOP") == "1":
        return "(WHOOP context skipped by RECADO_SKIP_WHOOP=1.)"
    try:
        from whoop_digest_context_lib import daily_context

        return str(daily_context())
    except Exception as exc:  # noqa: BLE001
        return f"(WHOOP context unavailable: {exc})"


def print_food(entries: list[dict[str, Any]]) -> None:
    print(f"## Food log - last {LOOKBACK_DAYS} days (Nourish)\n")
    if not entries:
        print(
            "(NO FOOD LOGGED in the lookback window. The food axis is empty. "
            "In your message, gently ask the user to log meals on Telegram as text or photo. "
            "Do not invent meals or imply food causality.)"
        )
        return

    totals = food_totals(entries)
    if totals:
        total_bits: list[str] = []
        if "calories_kcal" in totals:
            total_bits.append(f"{rounded(totals['calories_kcal'])} kcal")
        if "protein_g" in totals:
            total_bits.append(f"{rounded(totals['protein_g'], 1)}g protein")
        if "carbohydrates_g" in totals:
            total_bits.append(f"{rounded(totals['carbohydrates_g'], 1)}g carbs")
        if "fat_g" in totals:
            total_bits.append(f"{rounded(totals['fat_g'], 1)}g fat")
        if total_bits:
            print(f"Totals from logged entries: {', '.join(total_bits)}\n")

    for entry in entries:
        stamp = entry_time(entry) or "timestamp unavailable"
        meal = entry.get("meal_type") or "meal"
        line = f"- {stamp} [{meal}] {food_name(entry)}"
        fragment = nutrient_fragment(entry)
        if fragment:
            line += f" ({fragment})"
        confidence = entry.get("confidence")
        if isinstance(confidence, (int, float)):
            line += f"; confidence={round(float(confidence), 2)}"
        source_trace = entry.get("source_trace")
        if source_trace:
            line += f"; source={source_trace}"
        notes = entry.get("notes")
        if notes and notes != food_name(entry):
            line += f"; notes={notes}"
        print(line)


def main() -> None:
    user_name = os.environ.get("RECADO_USER_NAME", "David")
    print(f"RECADO_CONTEXT_V1 user={user_name} generated_at_local={now_utc().astimezone(LOCAL_TZ).strftime('%Y-%m-%d %H:%M %Z')}")
    print("\n## WHOOP context (recovery / sleep / strain / HRV)\n")
    print(load_whoop_context())
    print()
    print_food(recent_food(intake_path()))


if __name__ == "__main__":
    main()
