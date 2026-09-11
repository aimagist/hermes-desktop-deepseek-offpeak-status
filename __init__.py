"""DeepSeek off-peak status — agent half.

Registers one read-only tool, ``deepseek_rate_status``: it tells the agent
whether DeepSeek is billing peak or off-peak right now and when the rate next
switches, so a long job can be postponed into the cheap window.

The desktop half (``desktop/plugin.js``) puts the same state in the status bar.

Schedule, in UTC, Monday to Friday: peak 01:00-04:00 and 06:00-10:00, all other
hours off-peak (off-peak is half of the peak rate). Source:
https://api-docs.deepseek.com/quick_start/pricing (footnote 1).
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

# Peak windows in UTC hours, [start, end). Same constant as desktop/plugin.js.
PEAK_WINDOWS = ((1, 4), (6, 10))

# Minute-by-minute sweep bound: the longest jump is the weekend (~3 days).
LOOKAHEAD_MINUTES = 60 * 24 * 8

SCHEMA = {
    "name": "deepseek_rate_status",
    "description": (
        "Report whether DeepSeek API tokens are at peak or off-peak rates right now, "
        "when the rate next switches and how long that is. Off-peak is half price. "
        "Call it before starting a long or bulk job, or when the user asks whether "
        "now is a cheap time to run something."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "in_hours": {
                "type": "number",
                "description": (
                    "Optional. Report the state N hours from now instead of now "
                    "(e.g. 3.5), to check whether a job that starts later lands in off-peak."
                ),
            }
        },
        "required": [],
    },
}


def _is_peak(moment: datetime) -> bool:
    """Peak only on UTC weekdays, inside one of the two windows."""
    if moment.weekday() >= 5:  # Saturday or Sunday
        return False
    return any(start <= moment.hour < end for start, end in PEAK_WINDOWS)


def _next_switch(moment: datetime) -> datetime | None:
    """The next moment the rate flips, or None if none is found."""
    peak = _is_peak(moment)
    cursor = moment.replace(second=0, microsecond=0) + timedelta(minutes=1)
    for _ in range(LOOKAHEAD_MINUTES):
        if _is_peak(cursor) != peak:
            return cursor
        cursor += timedelta(minutes=1)
    return None


def _human_delta(delta: timedelta) -> str:
    seconds = max(0, int(delta.total_seconds()))
    days, rest = divmod(seconds, 86400)
    hours, rest = divmod(rest, 3600)
    minutes = rest // 60
    if days:
        return f"{days}d {hours}h"
    if hours:
        return f"{hours}h{minutes:02d}m"
    return f"{minutes}m"


def rate_status(at: datetime | None = None) -> dict:
    """Structured rate state at ``at`` (defaults to now, UTC)."""
    now = at or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    peak = _is_peak(now)
    switch = _next_switch(now)
    state = {
        "period": "peak" if peak else "off-peak",
        "rates": "full price" if peak else "half price (50% off peak)",
        "utc": now.isoformat(),
        "local": now.astimezone().isoformat(),
        "peak_windows_utc": [f"{start:02d}:00-{end:02d}:00" for start, end in PEAK_WINDOWS],
        "peak_days": "Monday to Friday, UTC (the whole weekend is off-peak)",
    }

    if switch is not None:
        left = _human_delta(switch - now)
        state["next_switch_utc"] = switch.isoformat()
        state["next_switch_local"] = switch.astimezone().isoformat()
        state["switches_to"] = "peak" if not peak else "off-peak"
        state["time_until_switch"] = left
        state["summary"] = (
            f"{state['period']} now ({state['rates']}); "
            f"{state['switches_to']} in {left}"
        )
    else:
        state["summary"] = f"{state['period']} now ({state['rates']})"

    if peak:
        state["advice"] = "Full price. A long job is cheaper if it can wait for the next off-peak window."
    else:
        state["advice"] = "Half price. Good window to run long or bulk jobs."

    return state


def deepseek_rate_status(args: dict, **kwargs) -> str:
    """Tool handler — always returns a JSON string, never raises."""
    try:
        hours = args.get("in_hours")
        at = None
        if hours not in (None, ""):
            at = datetime.now(timezone.utc) + timedelta(hours=float(hours))
        return json.dumps(rate_status(at))
    except Exception as error:  # noqa: BLE001 - the registry must never see a raise
        return json.dumps({"error": f"deepseek_rate_status failed: {error}"})


def register(ctx) -> None:
    """Wire the tool into the registry."""
    ctx.register_tool(
        name="deepseek_rate_status",
        toolset="deepseek-offpeak",
        schema=SCHEMA,
        handler=deepseek_rate_status,
    )


if __name__ == "__main__":
    # Self-check: python __init__.py   (asserts the schedule windows)
    checks = [
        ("monday 00:30 UTC is off-peak", datetime(2026, 9, 14, 0, 30, tzinfo=timezone.utc), False),
        ("monday 01:00 UTC is peak", datetime(2026, 9, 14, 1, 0, tzinfo=timezone.utc), True),
        ("monday 03:59 UTC is peak", datetime(2026, 9, 14, 3, 59, tzinfo=timezone.utc), True),
        ("monday 04:00 UTC is off-peak", datetime(2026, 9, 14, 4, 0, tzinfo=timezone.utc), False),
        ("monday 09:59 UTC is peak", datetime(2026, 9, 14, 9, 59, tzinfo=timezone.utc), True),
        ("monday 10:00 UTC is off-peak", datetime(2026, 9, 14, 10, 0, tzinfo=timezone.utc), False),
        ("saturday 02:00 UTC is off-peak", datetime(2026, 9, 12, 2, 0, tzinfo=timezone.utc), False),
    ]
    failures = 0
    for label, moment, expected in checks:
        actual = _is_peak(moment)
        if actual != expected:
            failures += 1
            print(f"FAIL  {label}: expected {expected}, got {actual}")
        else:
            print(f"ok    {label}")

    # Friday after 10:00 UTC runs cheap all the way to Monday 01:00 UTC.
    switch = _next_switch(datetime(2026, 9, 18, 10, 0, tzinfo=timezone.utc))
    expected_switch = datetime(2026, 9, 21, 1, 0, tzinfo=timezone.utc)
    if switch != expected_switch:
        failures += 1
        print(f"FAIL  friday 10:00 → monday 01:00: got {switch}")
    else:
        print("ok    friday 10:00 → monday 01:00")

    print("\nAll ok" if failures == 0 else f"\n{failures} failures")
    raise SystemExit(0 if failures == 0 else 1)
