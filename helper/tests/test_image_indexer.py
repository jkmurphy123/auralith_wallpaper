"""Tests for image_indexer — image folder indexing."""

from pathlib import Path

import pytest

from desktop_rss_wall_helper.image_indexer import index_images, SUPPORTED_EXTENSIONS


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _touch(path: Path) -> None:
    """Create an empty file, making parent directories as needed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("")


def _make_fake_image(dir_: Path, name: str) -> Path:
    """Create an empty file with the given name in *dir_* and return its path."""
    p = dir_ / name
    _touch(p)
    return p


# ---------------------------------------------------------------------------
# Happy-path tests
# ---------------------------------------------------------------------------


def test_indexes_supported_images_only(tmp_path: Path) -> None:
    """Only .jpg, .jpeg, .png, .webp files should be indexed."""
    folder = tmp_path / "images"
    folder.mkdir()

    _make_fake_image(folder, "photo.jpg")
    _make_fake_image(folder, "photo.jp2")        # not supported
    _make_fake_image(folder, "image.png")
    _make_fake_image(folder, "readme.txt")
    _make_fake_image(folder, "banner.webp")
    _make_fake_image(folder, "notes.md")
    _make_fake_image(folder, "screenshot.jpeg")

    cache = index_images(str(folder))

    assert cache.error is None
    assert cache.folder == str(folder)
    assert cache.recursive is False
    assert len(cache.images) == 4

    names = {Path(i.path).name for i in cache.images}
    assert names == {"photo.jpg", "image.png", "banner.webp", "screenshot.jpeg"}


def test_indexes_empty_folder(tmp_path: Path) -> None:
    """An empty folder returns an error and empty image list."""
    folder = tmp_path / "empty"
    folder.mkdir()

    cache = index_images(str(folder))

    assert cache.error is not None
    assert "No supported image files" in cache.error
    assert cache.images == []
    assert cache.folder == str(folder)


def test_indexes_recursive(tmp_path: Path) -> None:
    """Recursive mode should descend into subdirectories."""
    folder = tmp_path / "photos"
    folder.mkdir()

    _make_fake_image(folder, "a.jpg")
    sub = folder / "vacation"
    _make_fake_image(sub, "b.png")
    _make_fake_image(sub, "notes.txt")      # should be skipped
    deep = folder / "extra" / "deep"
    _make_fake_image(deep, "c.webp")

    cache = index_images(str(folder), recursive=True)

    assert cache.error is None
    assert cache.recursive is True
    assert len(cache.images) == 3
    names = {Path(i.path).name for i in cache.images}
    assert names == {"a.jpg", "b.png", "c.webp"}


def test_non_recursive_excludes_subfolders(tmp_path: Path) -> None:
    """In non-recursive mode, images in subdirectories are not indexed."""
    folder = tmp_path / "photos"
    folder.mkdir()

    _make_fake_image(folder, "top.jpg")
    sub = folder / "nested"
    _make_fake_image(sub, "hidden.png")

    cache = index_images(str(folder), recursive=False)

    assert cache.error is None
    assert len(cache.images) == 1
    assert Path(cache.images[0].path).name == "top.jpg"


def test_images_sorted_by_path(tmp_path: Path) -> None:
    """Images should be returned in alphabetical order by path."""
    folder = tmp_path / "gallery"
    folder.mkdir()

    _make_fake_image(folder, "zebra.jpg")
    _make_fake_image(folder, "alpha.png")
    _make_fake_image(folder, "middle.webp")

    cache = index_images(str(folder))

    assert cache.error is None
    paths = [Path(i.path).name for i in cache.images]
    assert paths == ["alpha.png", "middle.webp", "zebra.jpg"]


def test_image_entry_fields(tmp_path: Path) -> None:
    """Each ImageEntry should have path, mtime, and size_bytes set."""
    folder = tmp_path / "images"
    folder.mkdir()
    img = _make_fake_image(folder, "test.jpg")
    img.write_bytes(b"\x00" * 42)

    cache = index_images(str(folder))

    assert len(cache.images) == 1
    entry = cache.images[0]
    assert entry.path == str(img)
    assert entry.mtime > 0
    assert entry.size_bytes == 42


def test_cache_structure(tmp_path: Path) -> None:
    """ImageCache should have all required fields with correct values."""
    folder = tmp_path / "images"
    folder.mkdir()
    _make_fake_image(folder, "a.png")

    cache = index_images(str(folder))

    assert cache.version == 1
    assert "T" in cache.indexed_at
    assert cache.indexed_at.startswith("202")     # ISO timestamp
    assert cache.folder == str(folder)
    assert cache.recursive is False
    assert len(cache.images) == 1
    assert cache.error is None


# ---------------------------------------------------------------------------
# Error / edge-case tests
# ---------------------------------------------------------------------------


def test_nonexistent_folder(tmp_path: Path) -> None:
    """A folder that doesn't exist returns an error."""
    cache = index_images(str(tmp_path / "does-not-exist"))

    assert cache.error is not None
    assert "does not exist" in cache.error.lower()
    assert cache.images == []


def test_path_is_file_not_folder(tmp_path: Path) -> None:
    """Passing a file path instead of a folder returns an error."""
    f = tmp_path / "not-a-folder.jpg"
    _touch(f)

    cache = index_images(str(f))

    assert cache.error is not None
    assert "not a directory" in cache.error.lower()
    assert cache.images == []


def test_all_supported_extensions(tmp_path: Path) -> None:
    """Verify every extension in SUPPORTED_EXTENSIONS is actually picked up."""
    folder = tmp_path / "extensions"
    folder.mkdir()

    for ext in SUPPORTED_EXTENSIONS:
        _make_fake_image(folder, f"image{ext}")

    cache = index_images(str(folder))

    assert cache.error is None
    assert len(cache.images) == len(SUPPORTED_EXTENSIONS)


def test_case_insensitive_extension_matching(tmp_path: Path) -> None:
    """Extensions should match case-insensitively (.JPG, .PNG, etc.)."""
    folder = tmp_path / "mixedcase"
    folder.mkdir()

    _make_fake_image(folder, "upper.JPG")
    _make_fake_image(folder, "mixed.PnG")
    _make_fake_image(folder, "lower.jpg")

    cache = index_images(str(folder))

    assert cache.error is None
    assert len(cache.images) == 3


def test_skips_broken_symlinks(tmp_path: Path) -> None:
    """Broken symlinks should be skipped silently."""
    folder = tmp_path / "with_symlinks"
    folder.mkdir()

    _make_fake_image(folder, "real.jpg")
    # Create a broken symlink
    broken = folder / "broken.png"
    broken.symlink_to("/definitely/does/not/exist.png")

    cache = index_images(str(folder))

    assert cache.error is None
    assert len(cache.images) == 1
    assert Path(cache.images[0].path).name == "real.jpg"


def test_no_duplicates(tmp_path: Path) -> None:
    """The same file should not appear twice."""
    folder = tmp_path / "dedup"
    folder.mkdir()
    _make_fake_image(folder, "only.png")

    cache = index_images(str(folder))

    assert len(cache.images) == 1
