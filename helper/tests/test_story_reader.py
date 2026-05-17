"""Tests for story_reader.py — JSON story file to FeedCache conversion."""

import json
import tempfile
from pathlib import Path

from desktop_rss_wall_helper.story_reader import read_story_cache


def _make_story_file(folder: Path, name: str, date: str, stories: list[dict]) -> Path:
    """Write a single JSON story batch file. Returns the file path."""
    path = folder / name
    data = {"date": date, "stories": stories}
    path.write_text(json.dumps(data))
    return path


def make_story(headline: str, summary: str = "", published: str = "", story_id: str = "") -> dict:
    """Minimal story dict helper."""
    return {
        "headline": headline,
        "summary": summary or f"Summary of {headline}",
        "body": f"Body of {headline}",
        "category": "politics",
        "metadata": {
            "story_id": story_id or f"story-{headline}",
            "published_at": published or "2026-01-01T00:00:00Z",
            "target_date": "2026-01-01",
            "world_id": "world-test",
        },
        "referenced_entities": [],
        "continuity_effects": [],
    }


class TestReadStoryCache:
    """Test the story_reader module with temporary JSON files."""

    def test_empty_folder_returns_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            cache, state = read_story_cache(tmp)
            assert cache.error is not None
            assert "No JSON story files" in cache.error
            assert len(cache.items) == 0

    def test_single_file_returns_stories(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            _make_story_file(folder, "2026-01-01.json", "2026-01-01", [
                make_story("Headline 1"),
                make_story("Headline 2"),
                make_story("Headline 3"),
            ])

            cache, state = read_story_cache(str(folder))
            assert cache.error is None
            assert len(cache.items) == 3
            assert cache.items[0].title == "Headline 1"
            assert cache.items[1].title == "Headline 2"
            assert cache.items[2].title == "Headline 3"
            assert "2026-01-01" in cache.feed_title

    def test_story_fields_map_correctly(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            _make_story_file(folder, "2026-01-01.json", "2026-01-01", [
                {
                    "headline": "Test Headline",
                    "summary": "Test summary text",
                    "body": "Long body text...",
                    "category": "politics",
                    "metadata": {
                        "story_id": "story-2026-01-01-001",
                        "published_at": "2026-01-01T08:00:00Z",
                        "target_date": "2026-01-01",
                        "world_id": "world-test",
                    },
                    "referenced_entities": ["Entity A"],
                    "continuity_effects": [],
                },
            ])

            cache, state = read_story_cache(str(folder))
            item = cache.items[0]
            assert item.title == "Test Headline"
            assert item.summary == "Long body text..."
            assert item.published == "2026-01-01T08:00:00Z"
            assert item.link == "story-2026-01-01-001"

    def test_no_summary_falls_back_to_body(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            _make_story_file(folder, "2026-01-01.json", "2026-01-01", [
                {
                    "headline": "No Summary Story",
                    "body": "This is the body text.",
                    "category": "politics",
                    "metadata": {"story_id": "s1", "published_at": ""},
                },
            ])

            cache, state = read_story_cache(str(folder))
            assert cache.items[0].summary == "This is the body text."

    def test_cycles_through_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            _make_story_file(folder, "2026-01-01.json", "2026-01-01", [
                make_story("Day 1 Story"),
            ])
            _make_story_file(folder, "2026-01-02.json", "2026-01-02", [
                make_story("Day 2 Story"),
            ])
            _make_story_file(folder, "2026-01-03.json", "2026-01-03", [
                make_story("Day 3 Story"),
            ])

            # Run 1: starts at first file
            cache1, state1 = read_story_cache(str(folder))
            assert cache1.items[0].title == "Day 1 Story"
            assert state1["current_file"] == "2026-01-02.json"

            # Run 2: second file
            cache2, state2 = read_story_cache(str(folder), state1)
            assert cache2.items[0].title == "Day 2 Story"
            assert state2["current_file"] == "2026-01-03.json"

            # Run 3: third file
            cache3, state3 = read_story_cache(str(folder), state2)
            assert cache3.items[0].title == "Day 3 Story"
            assert state3["current_file"] == "2026-01-01.json"  # looped back

    def test_picks_up_from_state(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            _make_story_file(folder, "2026-01-01.json", "2026-01-01", [
                make_story("A"),
            ])
            _make_story_file(folder, "2026-01-02.json", "2026-01-02", [
                make_story("B"),
            ])

            # Give state pointing to second file
            cache, state = read_story_cache(str(folder), {"current_file": "2026-01-02.json"})
            assert cache.items[0].title == "B"
            # Next should wrap around
            assert state["current_file"] == "2026-01-01.json"

    def test_stale_state_resets_to_first(self):
        """If the tracked file no longer exists, reset to first file."""
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            _make_story_file(folder, "2026-01-01.json", "2026-01-01", [
                make_story("Still Here"),
            ])

            cache, state = read_story_cache(str(folder), {"current_file": "gone.json"})
            assert cache.items[0].title == "Still Here"

    def test_file_without_stories_reports_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            path = folder / "empty.json"
            path.write_text('{"date": "2026-01-01", "stories": []}')

            cache, state = read_story_cache(str(folder))
            assert cache.error is not None
            assert "No stories" in cache.error

    def test_non_json_files_ignored(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            _make_story_file(folder, "2026-01-01.json", "2026-01-01", [
                make_story("Real Story"),
            ])
            (folder / "readme.md").write_text("not a story file")
            (folder / "data.csv").write_text("col1,col2")

            cache, state = read_story_cache(str(folder))
            # Only .json files are globbed; .md and .csv are ignored
            assert cache.error is None
            assert len(cache.items) == 1
            assert cache.items[0].title == "Real Story"

    def test_malformed_json_is_skipped_gracefully(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            _make_story_file(folder, "good.json", "2026-01-01", [
                make_story("The Good One"),
            ])
            (folder / "bad.json").write_text("{not valid json!!!")

            cache, state = read_story_cache(str(folder))
            # First file sorted is bad.json, which returns empty dict -> error
            # So it depends on sorting... let me check which comes first
            # bad.json comes before good.json alphabetically
            files = sorted(folder.glob("*.json"))
            assert files[0].name == "bad.json"

            # First run hits bad.json -> error
            cache1, state1 = read_story_cache(str(folder))
            assert cache1.error is not None
            assert "No stories" in cache1.error
            assert state1["current_file"] == "good.json"

            # Second run hits good.json
            cache2, state2 = read_story_cache(str(folder), state1)
            assert cache2.error is None
            assert cache2.items[0].title == "The Good One"
