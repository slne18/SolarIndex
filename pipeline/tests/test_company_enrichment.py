import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lib.company_enrichment import (
    _normalize_phone,
    enrich_lead_contacts,
    format_dirigeant,
    pick_best_dirigeant,
)


class TestCompanyEnrichment(unittest.TestCase):
    def test_pick_best_dirigeant_prefers_president(self):
        dirs = [
            {"nom": "A", "prenoms": "ALICE", "qualite": "Commissaire aux comptes", "type_dirigeant": "personne physique"},
            {"nom": "B", "prenoms": "BOB", "qualite": "Président", "type_dirigeant": "personne physique"},
        ]
        best = pick_best_dirigeant(dirs)
        self.assertEqual(best["nom"], "B")

    def test_format_dirigeant(self):
        name, qualite = format_dirigeant(
            {"nom": "CAILLET", "prenoms": "BRUNO SERGE", "qualite": "Gérant"},
        )
        self.assertEqual(name, "Bruno Serge CAILLET")
        self.assertEqual(qualite, "Gérant")

    def test_normalize_phone(self):
        self.assertEqual(_normalize_phone("0140203040"), "01 40 20 30 40")
        self.assertEqual(_normalize_phone("+33 6 12 34 56 78"), "06 12 34 56 78")

    def test_enrich_lidl_exploitant(self):
        data = enrich_lead_contacts("343262622")
        self.assertTrue(data["dirigeant_exploitant"])
        self.assertEqual(data["dirigeant_nom"], data["dirigeant_exploitant"])


if __name__ == "__main__":
    unittest.main()
