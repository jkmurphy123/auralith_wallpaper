"""Cache read/write utilities."""

import json
import os
from pathlib import Path


def ensure_cache_dir(path: str) -> None:
    """Create cache directory if it doesn't exist."""
    Path(path).mkdir(parents=True, exist_ok=True)


def write_json_cache(path: str, data: dict) -> None:
    """Write a dictionary to a JSON cache file atomically."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp_path = path + ".tmp"
    with open(tmp_path, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp_path, path)


def read_json_cache(path: str) -> dict | None:
    """Read a JSON cache file, returning None if missing or malformed."""
    try:
        with open(path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None
