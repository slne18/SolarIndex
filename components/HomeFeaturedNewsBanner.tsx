"use client";

import { useCallback, useEffect, useState } from "react";
import { NEWS_TICKER_ITEMS } from "@/lib/news-ticker";

const ROTATE_MS = 30_000;

export default function HomeFeaturedNewsBanner() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [motionOk, setMotionOk] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: no-preference)");
    setMotionOk(mq.matches);
    const onChange = () => setMotionOk(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const goTo = useCallback((index: number) => {
    setActiveIndex((index + NEWS_TICKER_ITEMS.length) % NEWS_TICKER_ITEMS.length);
  }, []);

  useEffect(() => {
    if (!motionOk) return;
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % NEWS_TICKER_ITEMS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [motionOk]);

  const item = NEWS_TICKER_ITEMS[activeIndex];
  const hasImage = Boolean(item.imageUrl);

  return (
    <section className="home-news-banner" aria-label="Actualités ombrières solaires et loi APER">
      <div className="container-x py-10 sm:py-12">
        <div
          className={`home-news-banner-panel ${hasImage ? "home-news-banner-panel-split" : "home-news-banner-panel-text"}`}
        >
          {hasImage ? (
            <figure className="home-news-banner-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.imageAlt ?? ""}
                className="home-news-banner-image"
                loading="lazy"
                decoding="async"
              />
            </figure>
          ) : null}

          <div className="home-news-banner-body">
            <p className="home-news-banner-eyebrow">
              <span className="home-news-banner-badge">Actu</span>
              <span>{item.source}</span>
            </p>

            <blockquote className="home-news-banner-excerpt">&ldquo;{item.excerpt}&rdquo;</blockquote>

            <a
              href={item.url}
              className="home-news-banner-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Lire l&apos;article
              <span aria-hidden> →</span>
            </a>
          </div>
        </div>

        <div className="home-news-banner-nav" role="tablist" aria-label="Choisir un article">
          {NEWS_TICKER_ITEMS.map((news, index) => (
            <button
              key={news.url}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`${news.source} — ${news.headline}`}
              className={`home-news-banner-dot ${index === activeIndex ? "home-news-banner-dot-active" : ""}`}
              onClick={() => goTo(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
