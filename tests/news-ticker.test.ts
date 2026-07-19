import { describe, expect, it } from "vitest";
import { NEWS_TICKER_ITEMS } from "@/lib/news-ticker";

describe("NEWS_TICKER_ITEMS", () => {
  it("expose quatre sources presse avec URL https", () => {
    expect(NEWS_TICKER_ITEMS).toHaveLength(4);
    const sources = NEWS_TICKER_ITEMS.map((item) => item.source);
    expect(sources).toEqual([
      "L'Echo du Solaire",
      "Révolution Énergétique",
      "Les Echos",
      "Le Monde",
    ]);
    for (const item of NEWS_TICKER_ITEMS) {
      expect(item.url.startsWith("https://")).toBe(true);
      expect(item.headline.length).toBeGreaterThan(10);
      expect(item.excerpt.length).toBeGreaterThan(40);
    }
  });

  it("inclut des illustrations pour les articles disponibles", () => {
    const withImage = NEWS_TICKER_ITEMS.filter((item) => item.imageUrl);
    expect(withImage.length).toBeGreaterThanOrEqual(2);
    for (const item of withImage) {
      expect(item.imageUrl?.startsWith("https://")).toBe(true);
    }
  });
});
