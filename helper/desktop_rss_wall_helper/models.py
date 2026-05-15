"""Data models for the Desktop RSS Wall helper."""

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class FeedItem:
    """A single RSS feed item."""

    title: str
    link: str = ""
    published: str = ""
    summary: str = ""


@dataclass
class FeedCache:
    """Cached RSS feed data."""

    version: int = 1
    fetched_at: str = ""
    source_url: str = ""
    feed_title: str = ""
    items: list[FeedItem] = field(default_factory=list)
    error: str | None = None


@dataclass
class ImageEntry:
    """An indexed image file."""

    path: str
    mtime: float = 0.0
    size_bytes: int = 0


@dataclass
class ImageCache:
    """Cached image index data."""

    version: int = 1
    indexed_at: str = ""
    folder: str = ""
    recursive: bool = False
    images: list[ImageEntry] = field(default_factory=list)
    error: str | None = None
