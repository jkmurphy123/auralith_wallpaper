"""RSS feed fetching and parsing via feedparser."""

from datetime import datetime, timezone

import feedparser

from .models import FeedCache, FeedItem


def fetch_feed(url: str, max_items: int = 5) -> FeedCache:
    """Fetch and parse an RSS/Atom feed, returning a FeedCache.

    On network or parse errors the returned FeedCache will have
    ``error`` set to a human-readable message; the caller should
    preserve the last successful cache when an error is present.
    """
    cache = FeedCache(
        source_url=url,
        fetched_at=datetime.now(timezone.utc).isoformat(),
    )

    try:
        parsed = feedparser.parse(url)
    except Exception as exc:
        cache.error = f"Failed to fetch feed: {exc}"
        return cache

    # feedparser sets 'bozo' on parse errors but still returns
    # whatever it could salvage. Treat bozo + empty entries as failure.
    if parsed.bozo and not parsed.entries:
        bozo_msg = str(getattr(parsed, "bozo_exception", parsed.bozo))
        cache.error = f"Feed parse error: {bozo_msg}"
        return cache

    # Feed title
    feed = parsed.feed
    cache.feed_title = getattr(feed, "title", "") or ""

    # Truncate to max_items
    for entry in parsed.entries[:max_items]:
        published_raw = entry.get("published", "") or entry.get("updated", "")
        item = FeedItem(
            title=getattr(entry, "title", "(no title)") or "(no title)",
            link=getattr(entry, "link", "") or "",
            published=str(published_raw) if published_raw else "",
            summary=getattr(entry, "summary", "") or "",
        )
        cache.items.append(item)

    if not cache.items and not cache.error:
        cache.error = "Feed returned no items"

    return cache
