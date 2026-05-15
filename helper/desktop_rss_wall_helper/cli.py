"""
CLI entry point for desktop-rss-wall-helper.

Subcommands:
    fetch-rss     – Fetch and cache an RSS feed
    index-images  – Index images in a folder  (stub)
    refresh-all   – Refresh feed and images   (stub)
    validate-cache – Validate cache files     (stub)

Run with:
    python -m desktop_rss_wall_helper.cli
    desktop-rss-wall-helper
"""

import json
import os
import sys
from pathlib import Path

import typer

from .cache import write_json_cache, read_json_cache
from .rss_fetcher import fetch_feed

app = typer.Typer(
    name="desktop-rss-wall-helper",
    help="Helper tools for Desktop RSS Wall GNOME Shell extension",
    no_args_is_help=True,
)

CACHE_DIR = os.path.expanduser("~/.cache/desktop-rss-wall")


@app.command()
def fetch_rss(
    url: str = typer.Option(..., "--url", help="RSS feed URL"),
    output: str = typer.Option(..., "--output", help="Output JSON cache path"),
    max_items: int = typer.Option(5, "--max-items", help="Max feed items to cache"),
) -> None:
    """Fetch an RSS feed and write a JSON cache file.

    On success the cache file is written with fresh feed data.
    On failure the last successful cache (if any) is preserved,
    and error details are written to a state.json file.
    """
    cache = fetch_feed(url, max_items)

    if cache.error:
        # Preserve existing cache — don't overwrite success with error.
        existing = read_json_cache(output)
        if existing is not None:
            # Keep the old cache but log the error to state
            _write_state_error(cache.error, url)
            typer.echo(
                f"Feed fetch FAILED for {url}: {cache.error}\n"
                f"Preserving last successful cache at {output}",
                err=True,
            )
            raise typer.Exit(code=1)

        # No existing cache either — write the error cache so the
        # extension at least sees a structured empty result.
        typer.echo(
            f"Feed fetch FAILED for {url}: {cache.error}\n"
            f"No previous cache exists — writing error state to {output}",
            err=True,
        )
        write_json_cache(output, _cache_to_dict(cache))
        raise typer.Exit(code=1)

    # Success — write the feed cache
    write_json_cache(output, _cache_to_dict(cache))
    typer.echo(
        f"Fetched {len(cache.items)} items from \"{cache.feed_title}\"\n"
        f"→ {output}"
    )


@app.command()
def index_images(
    folder: str = typer.Option(..., "--folder", help="Image folder path"),
    output: str = typer.Option(..., "--output", help="Output JSON cache path"),
    recursive: bool = typer.Option(False, "--recursive", help="Include subfolders"),
) -> None:
    """Index image files in a folder and write a JSON cache file."""
    typer.echo(f"[stub] Would index {folder} → {output} (recursive={recursive})")


@app.command()
def refresh_all() -> None:
    """Refresh all caches (RSS feed + image index)."""
    typer.echo("[stub] Would refresh all caches")


@app.command()
def validate_cache() -> None:
    """Validate existing cache files."""
    typer.echo("[stub] Would validate cache files")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _cache_to_dict(cache) -> dict:
    """Convert a FeedCache to a JSON-serialisable dict."""
    return {
        "version": cache.version,
        "fetched_at": cache.fetched_at,
        "source_url": cache.source_url,
        "feed_title": cache.feed_title,
        "items": [
            {
                "title": i.title,
                "link": i.link,
                "published": i.published,
                "summary": i.summary,
            }
            for i in cache.items
        ],
        "error": cache.error,
    }


def _write_state_error(error_msg: str, url: str) -> None:
    """Write error details to state.json in the cache directory."""
    state_path = os.path.join(CACHE_DIR, "state.json")
    state = read_json_cache(state_path) or {}
    state["last_error"] = error_msg
    state["last_error_url"] = url
    write_json_cache(state_path, state)


if __name__ == "__main__":
    app()
