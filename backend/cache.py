"""Server-side TTL cache with async lock."""

import asyncio
import time
from typing import Any, Callable, Optional

import structlog

logger = structlog.get_logger()

_cache: dict[str, tuple[Any, float]] = {}
_locks: dict[str, asyncio.Lock] = {}


def _get_lock(key: str) -> asyncio.Lock:
    if key not in _locks:
        _locks[key] = asyncio.Lock()
    return _locks[key]


async def cached(key: str, ttl_seconds: int, fetch_fn: Callable) -> Any:
    """Get a cached value, calling fetch_fn if missing or expired."""
    entry = _cache.get(key)
    if entry:
        value, ts = entry
        if time.time() - ts < ttl_seconds:
            return value

    lock = _get_lock(key)
    async with lock:
        # Double-check after acquiring lock
        entry = _cache.get(key)
        if entry:
            value, ts = entry
            if time.time() - ts < ttl_seconds:
                return value

        value = await fetch_fn()
        _cache[key] = (value, time.time())
        logger.debug("cache_miss", key=key, ttl=ttl_seconds)
        return value


def invalidate(key: str):
    """Remove a specific cache entry."""
    _cache.pop(key, None)


def invalidate_prefix(prefix: str):
    """Remove all entries matching a prefix."""
    keys = [k for k in _cache if k.startswith(prefix)]
    for k in keys:
        _cache.pop(k, None)


def clear_all():
    """Clear entire cache."""
    _cache.clear()
