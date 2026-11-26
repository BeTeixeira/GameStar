import re
from pathlib import Path

import pytest

from app.domain.badge_catalog import BADGE_IDS

MOBILE_CATALOG = Path(__file__).resolve().parents[3] / "mobile" / "src" / "data" / "badges.ts"


def test_catalog_has_unique_ids() -> None:
    assert len(BADGE_IDS) == 133


@pytest.mark.skipif(not MOBILE_CATALOG.exists(), reason="mobile app not present")
def test_backend_catalog_matches_mobile_catalog() -> None:
    """O app e a API precisam conhecer as mesmas badges; ao criar uma, atualize os dois."""
    mobile_ids = set(re.findall(r'\{ id: "([^"]+)"', MOBILE_CATALOG.read_text(encoding="utf-8")))

    assert BADGE_IDS == mobile_ids
