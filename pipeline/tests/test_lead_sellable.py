import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lib.lead_sellable import is_lead_sellable


class TestLeadSellable(unittest.TestCase):
    def test_sellable_baseline(self):
        self.assertTrue(
            is_lead_sellable(
                {
                    "detection": "libre",
                    "adresse": "1 rue Test",
                    "siren": "123456789",
                    "id_parcelle": "ABC",
                    "surface_m2": 2000,
                    "vision_surface_couverte_pct": None,
                }
            )
        )

    def test_rejects_equipe(self):
        self.assertFalse(
            is_lead_sellable(
                {
                    "detection": "equipe",
                    "adresse": "1 rue Test",
                    "siren": "123456789",
                    "id_parcelle": "ABC",
                    "surface_m2": 2000,
                }
            )
        )

    def test_rejects_gray_band_surface(self):
        self.assertFalse(
            is_lead_sellable(
                {
                    "detection": "libre",
                    "adresse": "1 rue Test",
                    "siren": "123456789",
                    "id_parcelle": "ABC",
                    "surface_m2": 1550,
                }
            )
        )

    def test_rejects_high_vision_coverage(self):
        self.assertFalse(
            is_lead_sellable(
                {
                    "detection": "libre",
                    "adresse": "1 rue Test",
                    "siren": "123456789",
                    "id_parcelle": "ABC",
                    "surface_m2": 2000,
                    "vision_surface_couverte_pct": 46,
                }
            )
        )


if __name__ == "__main__":
    unittest.main()
