"""
CLI entry point for desktop-rss-wall-helper.

Subcommands (stubs for Milestone 0):
    fetch-rss     – Fetch and cache an RSS feed
    index-images  – Index images in a folder
    refresh-all   – Refresh feed and images
    validate-cache – Validate cache files

Run with:
    python -m desktop_rss_wall_helper.cli
    desktop-rss-wall-helper
"""

import typer

app = typer.Typer(
    name="desktop-rss-wall-helper",
    help="Helper tools for Desktop RSS Wall GNOME Shell extension",
    no_args_is_help=True,
)


@app.command()
def fetch_rss(
    url: str = typer.Option(..., "--url", help="RSS feed URL"),
    output: str = typer.Option(..., "--output", help="Output JSON cache path"),
    max_items: int = typer.Option(5, "--max-items", help="Max feed items to cache"),
) -> None:
    """Fetch an RSS feed and write a JSON cache file."""
    typer.echo(f"[stub] Would fetch {url} → {output} (max_items={max_items})")


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


if __name__ == "__main__":
    app()
