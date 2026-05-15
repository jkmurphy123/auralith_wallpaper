"""Configuration support for the helper tools."""

from dataclasses import dataclass, field


@dataclass
class HelperConfig:
    """Configuration for the Desktop RSS Wall helper."""

    rss_feed_url: str = "https://example.com/feed.xml"
    rss_max_items: int = 5
    cache_dir: str = "~/.cache/desktop-rss-wall"
    config_dir: str = "~/.config/desktop-rss-wall"


DEFAULT_CONFIG = HelperConfig()
