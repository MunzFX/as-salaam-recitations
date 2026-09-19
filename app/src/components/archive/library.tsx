import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { usePlayer } from "./player";
import { matches, time, type Surah } from "../../lib/archive";
import seed from "../../lib/surah-seed.json";
export function Library({
  recordingsOnly = false,
  initialQuery = "",
}: {
  recordingsOnly?: boolean;
  initialQuery?: string;
}) {
  const { catalog, error, play, refresh } = usePlayer(),
    [q, setQ] = useState(initialQuery),
    [filter, setFilter] = useState("All"),
    [reciter, setReciter] = useState("");
  useEffect(() => setQ(initialQuery), [initialQuery]);
  const surahs = (catalog?.surahs || (seed as Surah[])).filter(
      (s) => matches(s, q) && (filter === "All" || s.revelation_type === filter),
    ),
    recordings = (catalog?.recordings || []).filter(
      (r) => surahs.some((s) => s.id === r.surah_id) && (!reciter || reciter === r.reciter_id),
    );
  return (
    <main id="main" className="page library">
      <div className="page-heading">
        <span className="eyebrow">THE COLLECTION</span>
        <h1>{recordingsOnly ? "Recitations." : "The Surah library."}</h1>
        <p>
          {recordingsOnly
            ? "Recordings published by As-Salaam Institute."
            : "114 chapters. A place for every return."}
        </p>
      </div>
      <div className="library-tools">
        <label>
          Search Surahs
          <input
            autoComplete="off"
            type="search"
            placeholder="Name, Arabic, or Surah number"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div className="filters">
          {["All", "Makki", "Madani"].map((f) => (
            <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        {recordingsOnly && (
          <label>
            Reciter
            <select value={reciter} onChange={(e) => setReciter(e.target.value)}>
              <option value="">All reciters</option>
              {catalog?.reciters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {error && (
        <div className="error" role="alert">
          {error} <button onClick={refresh}>Try again</button>
        </div>
      )}
      {recordingsOnly ? (
        <div className="recording-list">
          {recordings.map((r) => {
            const s = catalog?.surahs.find((x) => x.id === r.surah_id)!;
            return (
              <article key={r.id} className="recording-row">
                <span className="row-number">{String(s.number).padStart(2, "0")}</span>
                <div>
                  <Link to="/surah/$slug" params={{ slug: s.slug }}>
                    <h2>{r.title}</h2>
                  </Link>
                  <p>
                    {r.reciter_name} · {s.name}
                  </p>
                </div>
                <span>{time(r.duration)}</span>
                <button
                  className="play-orb small"
                  aria-label={"Play " + r.title}
                  onClick={() => play(r)}
                >
                  ▶
                </button>
              </article>
            );
          })}
          {!recordings.length && (
            <div className="empty">
              <h2>{q || reciter ? "No recordings found." : "A space ready for recitation."}</h2>
              <p>
                {q || reciter
                  ? "Try another search or filter."
                  : "Recordings will appear here when the institute publishes them."}
              </p>
              <Link to="/surahs">Explore the Surah library →</Link>
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="result-count" role="status">
            {surahs.length} SURAHS
          </p>
          <div className="surah-grid">
            {surahs.map((s) => {
              const r = catalog?.recordings.find((x) => x.surah_id === s.id);
              return (
                <article className="surah-row" key={s.id}>
                  <span className="row-number">{String(s.number).padStart(2, "0")}</span>
                  <Link to="/surah/$slug" params={{ slug: s.slug }}>
                    <h2>{s.name}</h2>
                    <p>
                      <span className={"revelation-symbol " + s.revelation_type} />
                      {s.revelation_type} · {s.ayah_count} Ayahs
                    </p>
                  </Link>
                  <div className="row-arabic" lang="ar" dir="rtl">
                    {s.arabic_name.replace(/^سُورَةُ\s*/, "")}
                  </div>
                  {r ? (
                    <button
                      className="row-play"
                      aria-label={"Play " + s.name}
                      onClick={() => play(r)}
                    >
                      ▶
                    </button>
                  ) : (
                    <Link
                      className="row-open"
                      to="/surah/$slug"
                      params={{ slug: s.slug }}
                      aria-label={"Open " + s.name}
                    >
                      ↗
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
          {!surahs.length && (
            <div className="empty">
              <h2>No Surahs found.</h2>
              <p>Try another name or number.</p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
