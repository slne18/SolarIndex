import { describe, expect, it } from "vitest";
import { NEWS_FALLBACK_IMAGE, NEWS_TICKER_ITEMS, resolveNewsImage } from "@/lib/news-ticker";

const HERO_HOME_IMAGE = "/images/hero-home.png";

describe("NEWS_TICKER_ITEMS", () => {
  it("expose cinq sources presse avec URL https", () => {
    expect(NEWS_TICKER_ITEMS).toHaveLength(5);
    const sources = NEWS_TICKER_ITEMS.map((item) => item.source);
    expect(sources).toEqual([
      "L'Echo du Solaire",
      "Révolution Énergétique",
      "Les Echos",
      "Le Monde",
      "Le Moniteur",
    ]);
    for (const item of NEWS_TICKER_ITEMS) {
      expect(item.url.startsWith("https://")).toBe(true);
      expect(item.headline.length).toBeGreaterThan(10);
      expect(item.excerpt.length).toBeGreaterThan(40);
    }
  });

  it("n'affiche une illustration que pour les articles qui en ont une", () => {
    const withImage = NEWS_TICKER_ITEMS.filter((item) => resolveNewsImage(item));
    const withoutImage = NEWS_TICKER_ITEMS.filter((item) => !resolveNewsImage(item));
    expect(withImage).toHaveLength(2);
    expect(withoutImage).toHaveLength(3);
    expect(withoutImage.map((item) => item.source)).toEqual(["Les Echos", "Le Monde", "Le Moniteur"]);
    const urls = withImage.map((item) => resolveNewsImage(item)!.url);
    expect(new Set(urls).size).toBe(2);
    for (const url of urls) {
      expect(url.startsWith("https://")).toBe(true);
      expect(url).not.toBe(HERO_HOME_IMAGE);
    }
  });

  it("ne fournit pas d'image de repli si imageUrl absent", () => {
    const resolved = resolveNewsImage({
      source: "Test",
      headline: "Titre de test assez long",
      excerpt: "Extrait de test suffisamment long pour valider le comportement sans image.",
      url: "https://example.com/article",
    });
    expect(resolved).toBeNull();
  });

  it("ignore une imageUrl pointant vers la photo hero", () => {
    const resolved = resolveNewsImage({
      source: "Test",
      headline: "Titre de test assez long",
      excerpt: "Extrait de test suffisamment long pour valider le comportement de repli.",
      url: "https://example.com/article",
      imageUrl: HERO_HOME_IMAGE,
    });
    expect(resolved?.url).toBe(NEWS_FALLBACK_IMAGE);
  });
});
