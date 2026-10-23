"""Chemins repo / pipeline et bootstrap sys.path pour les scripts Python."""
from __future__ import annotations

import sys
from pathlib import Path

PIPELINE_ROOT = Path(__file__).resolve().parent
REPO_ROOT = PIPELINE_ROOT.parent


def ensure_pipeline_on_path() -> None:
    p = str(PIPELINE_ROOT)
    if p not in sys.path:
        sys.path.insert(0, p)
