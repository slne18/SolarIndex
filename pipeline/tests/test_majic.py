"""Tests jointure propriétaire foncier MAJIC DGFiP."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lib.majic import (
    build_id_parcelle,
    dedupe_majic_records,
    majic_to_proprietaire,
    normalize_siren,
    owner_priority,
)


class MajicTest(unittest.TestCase):
    def test_build_id_parcelle_abzac(self):
        # Section sur 1 caractère → padding espace (format IDU IGN)
        self.assertEqual(build_id_parcelle("33001", None, "A", 163), "33001000 A0163")

    def test_build_id_parcelle_bordeaux(self):
        self.assertEqual(build_id_parcelle("33063", "", "TS", 13), "33063000TS0013")

    def test_normalize_siren(self):
        self.assertEqual(normalize_siren("347651317"), "347651317")
        self.assertEqual(normalize_siren("U26002209"), "U26002209")

    def test_majic_to_proprietaire(self):
        out = majic_to_proprietaire({
            "denomination": "AEROPORT DE BORDEAUX MERIGNAC",
            "siren": "487607202",
        })
        self.assertEqual(out["proprietaire_foncier"], "AEROPORT DE BORDEAUX MERIGNAC")
        self.assertEqual(out["siren_proprietaire_foncier"], "487607202")

    def test_pick_private_over_commune(self):
        rows = [
            {"id_parcelle": "x", "denomination": "COMMUNE DE BORDEAUX", "siren": "213300635"},
            {"id_parcelle": "x", "denomination": "SOCIETE TEST SAS", "siren": "347651317"},
        ]
        best = max(rows, key=owner_priority)
        self.assertEqual(best["siren"], "347651317")
        deduped = dedupe_majic_records(rows)
        self.assertEqual(len(deduped), 1)
        self.assertEqual(deduped[0]["siren"], "347651317")

    def test_no_match(self):
        self.assertIsNone(majic_to_proprietaire(None)["proprietaire_foncier"])


if __name__ == "__main__":
    unittest.main()
