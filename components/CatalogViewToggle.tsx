"use client";

export type CatalogView = "map" | "list";

export default function CatalogViewToggle({
  view,
  onChange,
}: {
  view: CatalogView;
  onChange: (v: CatalogView) => void;
}) {
  return (
    <div className="inline-flex catalog-view-toggle rounded-lg border p-1 text-sm">
      <button
        type="button"
        onClick={() => onChange("map")}
        className={`rounded-md px-4 py-2 transition ${
          view === "map" ? "bg-solar text-night font-semibold" : "text-slate-300 hover:text-white"
        }`}
      >
        Vue Carte
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={`rounded-md px-4 py-2 transition ${
          view === "list" ? "bg-solar text-night font-semibold" : "text-slate-300 hover:text-white"
        }`}
      >
        Vue Liste complète
      </button>
    </div>
  );
}
