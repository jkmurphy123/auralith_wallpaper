"""Image folder indexing — scan directories and build an image cache."""

from datetime import datetime, timezone
from pathlib import Path

from .models import ImageCache, ImageEntry

SUPPORTED_EXTENSIONS = frozenset({".jpg", ".jpeg", ".png", ".webp"})


def _is_supported(filepath: Path) -> bool:
    """Return True if the file has a supported image extension."""
    return filepath.suffix.lower() in SUPPORTED_EXTENSIONS


def index_images(folder: str, recursive: bool = False) -> ImageCache:
    """Scan *folder* for supported image files and return an ImageCache.

    When *recursive* is False only the top-level directory is scanned.
    Entries are sorted by path for deterministic output.
    """
    cache = ImageCache(
        folder=folder,
        recursive=recursive,
        indexed_at=datetime.now(timezone.utc).isoformat(),
    )

    root = Path(folder)

    if not root.exists():
        cache.error = f"Folder does not exist: {folder}"
        return cache

    if not root.is_dir():
        cache.error = f"Path is not a directory: {folder}"
        return cache

    try:
        if recursive:
            files = sorted(root.rglob("*"))
        else:
            files = sorted(root.glob("*"))
    except PermissionError as exc:
        cache.error = f"Permission denied reading folder: {exc}"
        return cache

    images: list[ImageEntry] = []
    for fp in files:
        if not fp.is_file():
            continue
        if not _is_supported(fp):
            continue
        try:
            stat = fp.stat()
        except OSError:
            # Skip files we can't stat (broken symlinks, etc.)
            continue
        images.append(
            ImageEntry(
                path=str(fp),
                mtime=stat.st_mtime,
                size_bytes=stat.st_size,
            )
        )

    cache.images = images

    if not images:
        cache.error = f"No supported image files found in {folder}"

    return cache
