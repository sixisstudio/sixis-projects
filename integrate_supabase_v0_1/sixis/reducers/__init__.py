"""
Reducer registry. Each event type maps to a reducer function that, given
the event and a read of current projection state, returns a list of
ProjectionMutation describing the projection writes that should atomically
follow the event insert.

Determinism contract (verified by scripts/two_writer_test.py):
  reduce(event, current_state) is a pure function. No wall-clock reads, no
  environment access, no network. The current_state dict is the only input
  beyond the event itself, and is supplied by the caller (typically the CLI
  verb that's emitting the event).

Adding a new event type:
  1. Add to migration 008's event_type enum (ALTER TYPE event_type ADD VALUE).
  2. Define a reducer function and decorate with @reducer('your_event_type').
  3. The reducer returns list[ProjectionMutation] (and optionally
     list[HistoryAppend] via the second tuple element).
"""
from __future__ import annotations

from collections.abc import Callable
from typing import Any

from ..backends import Event, HistoryAppend, ProjectionMutation

ReducerFn = Callable[[Event, dict[str, Any]], tuple[list[ProjectionMutation], list[HistoryAppend]]]

_REGISTRY: dict[str, ReducerFn] = {}


def reducer(event_type: str) -> Callable[[ReducerFn], ReducerFn]:
    def deco(fn: ReducerFn) -> ReducerFn:
        if event_type in _REGISTRY:
            raise ValueError(f"reducer for {event_type} already registered: {_REGISTRY[event_type]}")
        _REGISTRY[event_type] = fn
        return fn
    return deco


def dispatch(event: Event,
             current_state: dict[str, Any]) -> tuple[list[ProjectionMutation], list[HistoryAppend]]:
    fn = _REGISTRY.get(event.type)
    if fn is None:
        # Unmapped event types are valid — they emit but produce no projection
        # mutations. This handles meta events like 'discovery_answer_logged'
        # that don't write to projection tables.
        return [], []
    return fn(event, current_state)


def registered_types() -> list[str]:
    return sorted(_REGISTRY.keys())


# Eagerly import the core reducer module so its decorators register.
# Other reducer modules can be added under sixis/reducers/ and imported here.
from . import core  # noqa: E402, F401
