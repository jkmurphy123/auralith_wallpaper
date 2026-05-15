"""Tests for rss_fetcher — RSS feed fetching and parsing."""

from pathlib import Path

import pytest

from desktop_rss_wall_helper.rss_fetcher import fetch_feed

FIXTURES = Path(__file__).parent / "fixtures"


def _fixture_url(name: str) -> str:
    """Return a file:// URL for a fixture XML file."""
    return (FIXTURES / name).as_uri()


# ---------------------------------------------------------------------------
# Happy-path tests
# ---------------------------------------------------------------------------


def test_fetch_valid_rss() -> None:
    """Parsing a valid RSS 2.0 fixture returns feed items."""
    cache = fetch_feed(_fixture_url("valid_rss.xml"), max_items=5)

    assert cache.error is None, f"unexpected error: {cache.error}"
    assert cache.source_url == _fixture_url("valid_rss.xml")
    assert cache.feed_title == "Example News Feed"
    assert cache.fetched_at != ""
    assert len(cache.items) == 5  # max_items=5, file has 6

    # First item
    first = cache.items[0]
    assert first.title == "First Test Article"
    assert first.link == "https://example.com/article-1"
    assert first.published != ""
    assert first.summary == "Summary of the first test article."

    # Sixth item should *not* be included
    titles = [i.title for i in cache.items]
    assert "Sixth Article (beyond default max_items)" not in titles


def test_fetch_valid_atom() -> None:
    """Parsing a valid Atom feed returns items."""
    cache = fetch_feed(_fixture_url("valid_atom.xml"), max_items=5)

    assert cache.error is None
    assert cache.feed_title == "Example Atom Feed"
    assert len(cache.items) == 2

    first = cache.items[0]
    assert first.title == "Atom First Article"
    assert first.link == "https://example.com/atom-1"
    assert first.summary == "Atom summary one."


def test_fetch_with_lower_max_items() -> None:
    """max_items=2 returns only the first 2 items."""
    cache = fetch_feed(_fixture_url("valid_rss.xml"), max_items=2)

    assert cache.error is None
    assert len(cache.items) == 2
    assert cache.items[0].title == "First Test Article"
    assert cache.items[1].title == "Second Test Article"


# ---------------------------------------------------------------------------
# Error / edge-case tests
# ---------------------------------------------------------------------------


def test_fetch_empty_feed() -> None:
    """A feed with no <item> entries sets error."""
    cache = fetch_feed(_fixture_url("empty_rss.xml"), max_items=5)

    assert cache.error is not None
    assert "no items" in cache.error.lower()
    assert len(cache.items) == 0
    assert cache.feed_title == "Empty Feed"


def test_fetch_malformed_xml() -> None:
    """Malformed XML that feedparser cannot parse sets error."""
    cache = fetch_feed(_fixture_url("malformed_rss.xml"), max_items=5)

    assert cache.error is not None
    assert len(cache.items) == 0


def test_fetch_bad_url() -> None:
    """A completely invalid URL sets error."""
    cache = fetch_feed("not-a-valid-url://!!!", max_items=5)

    assert cache.error is not None
    assert len(cache.items) == 0


def test_fetch_nonexistent_domain() -> None:
    """An unresolvable domain sets error."""
    cache = fetch_feed("http://definitely-does-not-exist.invalid/feed.xml", max_items=5)

    assert cache.error is not None
    assert len(cache.items) == 0


def test_fetch_non_xml_response() -> None:
    """A URL that returns HTML (or non-feed content) sets error."""
    # Use a well-known site that won't return XML
    cache = fetch_feed("https://httpbin.org/html", max_items=5)

    assert cache.error is not None
    # Should be a parse error from feedparser
    assert len(cache.items) == 0


# ---------------------------------------------------------------------------
# Cache structure / model tests
# ---------------------------------------------------------------------------


def test_fetched_at_is_iso_format() -> None:
    """fetched_at should be a valid ISO timestamp."""
    cache = fetch_feed(_fixture_url("valid_rss.xml"), max_items=1)

    # Should contain 'T' and roughly look like an ISO timestamp
    assert "T" in cache.fetched_at
    assert cache.fetched_at.startswith("202")


def test_items_have_required_fields() -> None:
    """Every FeedItem must have the required string fields."""
    cache = fetch_feed(_fixture_url("valid_rss.xml"), max_items=5)

    for item in cache.items:
        assert isinstance(item.title, str) and item.title != ""
        assert isinstance(item.link, str)
        assert isinstance(item.published, str)
        assert isinstance(item.summary, str)


def test_source_url_matches_input() -> None:
    """source_url is set to the exact URL passed in."""
    url = _fixture_url("valid_rss.xml")
    cache = fetch_feed(url, max_items=5)

    assert cache.source_url == url
