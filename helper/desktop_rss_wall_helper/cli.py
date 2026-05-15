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
import subprocess
import sys
from pathlib import Path

import typer

from .cache import write_json_cache, read_json_cache
from .image_indexer import index_images as index_image_folder
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
    cache = index_image_folder(folder, recursive=recursive)

    if cache.error and cache.images:
        # Partial success — found images but also some issue.
        write_json_cache(output, _image_cache_to_dict(cache))
        typer.echo(
            f"Indexed {len(cache.images)} image(s) from {folder} (with warnings)\n"
            f"→ {output}",
        )
        return

    if cache.error:
        # Total failure — no images found or folder doesn't exist.
        # Preserve any existing cache.
        existing = read_json_cache(output)
        if existing is not None:
            typer.echo(
                f"Image index FAILED for {folder}: {cache.error}\n"
                f"Preserving last successful cache at {output}",
                err=True,
            )
            raise typer.Exit(code=1)

        # No existing cache — write the error cache so the extension
        # sees a structured empty result.
        typer.echo(
            f"Image index FAILED for {folder}: {cache.error}\n"
            f"No previous cache exists — writing empty state to {output}",
            err=True,
        )
        write_json_cache(output, _image_cache_to_dict(cache))
        raise typer.Exit(code=1)

    # Success — write the image cache
    write_json_cache(output, _image_cache_to_dict(cache))
    typer.echo(
        f"Indexed {len(cache.images)} image(s) from {folder}\n"
        f"→ {output}",
    )


@app.command()
def refresh_all(
    feed_url: str = typer.Option(
        "", "--feed-url",
        help="RSS feed URL (default: read from GSettings)",
    ),
    max_items: int = typer.Option(
        0, "--max-items",
        help="Max feed items (default: read from GSettings)",
    ),
    image_folder: str = typer.Option(
        "", "--image-folder",
        help="Slideshow folder (default: read from GSettings)",
    ),
    image_recursive: bool = typer.Option(
        False, "--image-recursive",
        help="Include subfolders when indexing images",
    ),
) -> None:
    """Refresh all caches — RSS feed + image index.

    Reads GSettings for defaults when CLI args are not provided.
    Designed to be called from a systemd user timer.
    """
    SCHEMA = "org.gnome.shell.extensions.desktop-rss-wall@sagethorn.local"
    errors = []

    # ---- RSS feed ----------------------------------------------------------
    if not feed_url:
        feed_url = _read_gsetting_string(SCHEMA, "rss-feed-url", "")
    if max_items <= 0:
        max_items = _read_gsetting_int(SCHEMA, "rss-max-items", 5)

    if not feed_url:
        typer.echo("⚠  RSS feed URL not set — skipping feed refresh", err=True)
        errors.append("rss: no feed URL configured")
    else:
        feed_output = os.path.join(CACHE_DIR, "feed.json")
        typer.echo(f"Fetching RSS: {feed_url}  (max {max_items} items)")

        cache = fetch_feed(feed_url, max_items)
        if cache.error:
            # Preserve existing cache if possible
            existing = read_json_cache(feed_output)
            if existing is not None:
                typer.echo(f"✗ RSS fetch FAILED: {cache.error}", err=True)
                typer.echo("  Preserving last successful cache", err=True)
            else:
                _write_state_error(cache.error, feed_url)
                write_json_cache(feed_output, _cache_to_dict(cache))
                typer.echo(f"✗ RSS fetch FAILED (no prior cache): {cache.error}", err=True)
            errors.append(f"rss: {cache.error}")
        else:
            write_json_cache(feed_output, _cache_to_dict(cache))
            typer.echo(
                f"  ✓ {len(cache.items)} items from \"{cache.feed_title}\""
            )

    # ---- Image index -------------------------------------------------------
    if not image_folder:
        image_folder = _read_gsetting_string(SCHEMA, "slideshow-folder", "")

    if not image_recursive:
        image_recursive = _read_gsetting_bool(
            SCHEMA, "slideshow-include-subfolders", False,
        )

    if not image_folder:
        typer.echo("⚠  Image folder not set — skipping image index", err=True)
        errors.append("images: no folder configured")
    else:
        image_output = os.path.join(CACHE_DIR, "images.json")
        typer.echo(
            f"Indexing images: {image_folder}  "
            f"(recursive={'yes' if image_recursive else 'no'})"
        )

        cache = index_image_folder(image_folder, recursive=image_recursive)
        if cache.images:
            write_json_cache(image_output, _image_cache_to_dict(cache))
            typer.echo(f"  ✓ {len(cache.images)} image(s)")
            if cache.error:
                typer.echo(f"  ⚠ {cache.error}", err=True)
        elif cache.error:
            existing = read_json_cache(image_output)
            if existing is not None:
                typer.echo(f"✗ Image index FAILED: {cache.error}", err=True)
                typer.echo("  Preserving last successful cache", err=True)
            else:
                write_json_cache(image_output, _image_cache_to_dict(cache))
                typer.echo(
                    f"✗ Image index FAILED (no prior cache): {cache.error}",
                    err=True,
                )
            errors.append(f"images: {cache.error}")

    # ---- Summary -----------------------------------------------------------
    if errors:
        typer.echo(
            f"\nRefresh complete with {len(errors)} issue(s):",
            err=True,
        )
        for e in errors:
            typer.echo(f"  • {e}", err=True)
        raise typer.Exit(code=1)

    typer.echo("\n✓ All caches refreshed")


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


def _image_cache_to_dict(cache) -> dict:
    """Convert an ImageCache to a JSON-serialisable dict."""
    return {
        "version": cache.version,
        "indexed_at": cache.indexed_at,
        "folder": cache.folder,
        "recursive": cache.recursive,
        "images": [
            {
                "path": i.path,
                "mtime": i.mtime,
                "size_bytes": i.size_bytes,
            }
            for i in cache.images
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


# ---------------------------------------------------------------------------
# GSettings helpers (read via gsettings CLI)
# ---------------------------------------------------------------------------

GSETTINGS_TIMEOUT = 5  # seconds


def _read_gsetting_string(schema: str, key: str, default: str = "") -> str:
    """Read a string GSettings value via the gsettings CLI.

    Returns *default* if the schema/key is missing or the command fails.
    """
    try:
        result = subprocess.run(
            ["gsettings", "get", schema, key],
            capture_output=True, text=True, timeout=GSETTINGS_TIMEOUT,
        )
        if result.returncode != 0:
            return default
        val = result.stdout.strip()
        # gsettings returns 'value' (single-quoted) for strings
        if val.startswith("'") and val.endswith("'"):
            return val[1:-1]
        return val
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        return default


def _read_gsetting_int(schema: str, key: str, default: int = 0) -> int:
    """Read an integer GSettings value via the gsettings CLI."""
    try:
        result = subprocess.run(
            ["gsettings", "get", schema, key],
            capture_output=True, text=True, timeout=GSETTINGS_TIMEOUT,
        )
        if result.returncode != 0:
            return default
        return int(result.stdout.strip())
    except (ValueError, subprocess.TimeoutExpired, FileNotFoundError, OSError):
        return default


def _read_gsetting_bool(schema: str, key: str, default: bool = False) -> bool:
    """Read a boolean GSettings value via the gsettings CLI."""
    try:
        result = subprocess.run(
            ["gsettings", "get", schema, key],
            capture_output=True, text=True, timeout=GSETTINGS_TIMEOUT,
        )
        if result.returncode != 0:
            return default
        return result.stdout.strip().lower() == "true"
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        return default


if __name__ == "__main__":
    app()
