import { NEWS_TICKER_ITEMS } from "@/lib/news-ticker";

function TickerSegment({ copy }: { copy: "a" | "b" }) {
  return (
    <>
      {NEWS_TICKER_ITEMS.map((item) => (
        <span key={`${copy}-${item.url}`} className="news-ticker-item">
          <span className="news-ticker-source">{item.source}</span>
          <a
            href={item.url}
            className="news-ticker-link"
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={copy === "b" ? -1 : undefined}
            aria-hidden={copy === "b" || undefined}
          >
            {item.headline}
          </a>
          <span className="news-ticker-sep" aria-hidden>
            ◆
          </span>
        </span>
      ))}
    </>
  );
}

export default function NewsTickerBanner() {
  return (
    <aside className="news-ticker" aria-label="Actualités ombrières solaires et loi APER">
      <div className="news-ticker-inner">
        <span className="news-ticker-badge" aria-hidden>
          Actu APER
        </span>
        <div className="news-ticker-viewport">
          <div className="news-ticker-track">
            <TickerSegment copy="a" />
            <TickerSegment copy="b" />
          </div>
        </div>
      </div>
      <ul className="sr-only">
        {NEWS_TICKER_ITEMS.map((item) => (
          <li key={item.url}>
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              {item.source} — {item.headline}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
