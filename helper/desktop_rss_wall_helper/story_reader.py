"""Read JSON story files from a folder and emit FeedCache-compatible output.

Designed for the Desktop RSS Wall extension's "file" source mode.
Each JSON file (one per date) contains a list of stories. Each invocation
advances to the next file in the folder, looping back endlessly.

State is persisted in a state.json file alongside the feed cache so the
helper can pick up where it left off across invocations.
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .models import FeedCache, FeedItem


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def read_story_cache(
    folder: str,
    state: Optional[dict] = None,
) -> tuple[FeedCache, dict]:
    """Read JSON story files from *folder* and produce a FeedCache.

    Returns ``(cache, new_state)``.  *state* carries the cursor between
    invocations (``current_file`` name).  After returning the stories from
    the current file the cursor advances to the next file so the next call
    picks up a fresh batch.

    When *state* is ``None`` or the tracked file no longer exists on disk
    the cursor resets to the first file in the folder.

    Each story is mapped to a ``FeedItem``:

    * headline   → title
    * summary    → summary
    * published_at → published
    * date / story_id → link (informational only)
    """
    folder_path = Path(folder).expanduser().resolve()
    state = dict(state or {})
    cache = FeedCache(
        source_url=folder,
        fetched_at=datetime.now(timezone.utc).isoformat(),
        feed_title="",
        items=[],
    )

    # Collect sorted JSON files
    files = sorted(
        p for p in folder_path.glob("*.json")
        if p.is_file()
    )
    if not files:
        cache.error = f"No JSON story files found in {folder}"
        return cache, state

    # Determine current file
    current_file = state.get("current_file", "")
    idx = _find_file_index(files, current_file)

    # If we can't find the tracked file, start from the beginning
    if idx < 0:
        idx = 0

    file_path = files[idx]
    batch = _load_batch(file_path)

    # Feed title from filename + date
    cache.feed_title = f"World News — {batch.get('date', file_path.stem)}"

    # Map stories to FeedItems
    for story in batch.get("stories", []):
        meta = story.get("metadata", {})
        item = FeedItem(
            title=story.get("headline", "(no headline)"),
            summary=story.get("body", "") or story.get("summary", ""),
            published=meta.get("published_at", batch.get("date", "")),
            link=meta.get("story_id", ""),
        )
        cache.items.append(item)

    if not cache.items:
        cache.error = f"No stories in {file_path.name}"

    # Advance cursor to next file (loop back)
    next_idx = (idx + 1) % len(files)
    new_state = {"current_file": files[next_idx].name}

    return cache, new_state


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _find_file_index(files: list[Path], name: str) -> int:
    """Return the index of *name* in *files*, or -1 if not found."""
    for i, p in enumerate(files):
        if p.name == name:
            return i
    return -1


def _load_batch(path: Path) -> dict:
    """Load and parse a single JSON story batch file.

    Returns an empty dict on any error (missing file, bad JSON, etc.).
    """
    try:
        with open(path) as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return {}
        return data
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return {}
