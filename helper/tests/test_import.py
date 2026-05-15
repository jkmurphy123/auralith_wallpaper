"""Basic import and smoke tests for the helper package."""

import desktop_rss_wall_helper
import desktop_rss_wall_helper.cli
import desktop_rss_wall_helper.config
import desktop_rss_wall_helper.models
import desktop_rss_wall_helper.cache


def test_package_version() -> None:
    """Helper package reports a version string."""
    assert desktop_rss_wall_helper.__version__ == "0.1.0"


def test_config_defaults() -> None:
    """Default config has expected values."""
    cfg = desktop_rss_wall_helper.config.DEFAULT_CONFIG
    assert cfg.rss_feed_url == "https://example.com/feed.xml"
    assert cfg.rss_max_items == 5


def test_cache_write_and_read(tmp_path) -> None:
    """Cache write followed by read returns the same data."""
    from desktop_rss_wall_helper.cache import write_json_cache, read_json_cache

    path = str(tmp_path / "test.json")
    data = {"version": 1, "items": [{"title": "Hello"}]}

    write_json_cache(path, data)
    result = read_json_cache(path)

    assert result == data


def test_cache_read_missing() -> None:
    """Reading a nonexistent cache file returns None."""
    from desktop_rss_wall_helper.cache import read_json_cache

    result = read_json_cache("/nonexistent/path/never.json")
    assert result is None


def test_cli_app_exists() -> None:
    """CLI Typer app is importable."""
    from desktop_rss_wall_helper.cli import app

    assert app is not None
