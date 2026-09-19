import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Headphones,
  LockKeyhole,
  Search,
  Sun,
  Volume2,
  Repeat,
  Heart,
  Share2,
} from "lucide-react";
import { usePlayer } from "./player";
import { SurahCarousel } from "./surah-carousel";
import { ParticleWave } from "./particle-wave";
import { matches, time, type Surah, type Recording } from "../../lib/archive";
import seed from "../../lib/surah-seed.json";

const fallback = seed as Surah[];
export function Revelation({ surah }: { surah: Surah }) {
  return (
    <span className={"origin-label " + surah.revelation_type}>
      {surah.revelation_type === "Makki" ? (
        <Sun size={13} aria-hidden />
      ) : (
        <span className="madani-arch" aria-hidden />
      )}
      {surah.revelation_type}
      <span className="meta-dot">·</span>
      {surah.ayah_count} Ayahs
    </span>
  );
}
function Kicker({ number, children }: { number: string; children: React.ReactNode }) {
  return (
    <p className="chapter-kicker">
      <span>{number}</span>
      <i />
      {children}
    </p>
  );
}
export function Invitation() {
  const p = usePlayer();
  const previous = p.catalog?.recordings.find((r) => r.id === p.resume?.id);
  return (
    <div className="chapter-content invitation-content">
      <Kicker number="01">The invitation</Kicker>
      <h1>
        Begin with
        <br />
        <em>listening.</em>
      </h1>
      <p className="chapter-description">
        A quiet place for the Qur'an.
        <br />
        Recitations from As-Salaam Institute.
      </p>
      <div className="chapter-actions">
        <a href="#featured" className="film-button solid">
          Explore recitations <ArrowUpRight size={17} />
        </a>
        {previous && (
          <button className="film-button" onClick={() => p.play(previous, p.resume?.position)}>
            <Headphones size={16} /> Continue listening
          </button>
        )}
      </div>
      <a href="#featured" className="journey-scroll">
        <span>SCROLL TO ENTER</span>
        <ArrowDown size={18} />
      </a>
      <div className="invitation-signature">
        LISTEN <i /> REFLECT <i /> REMEMBER
      </div>
    </div>
  );
}

export function EmbeddedPlayer({
  recording,
  compact = false,
}: {
  recording?: Recording;
  compact?: boolean;
}) {
  const p = usePlayer(),
    active = !!recording && p.current?.id === recording.id;
  const all = p.catalog?.recordings || [],
    index = all.findIndex((r) => r.id === (active ? p.current?.id : recording?.id));
  const duration = active ? p.duration : recording?.duration || 0,
    position = active ? p.position : 0;
  const choose = (delta: number) => {
    const next = all[index + delta];
    if (next) p.play(next);
  };
  return (
    <div className={"embedded-player " + (compact ? "compact" : "")}>
      <div className="inline-track">
        <input
          type="range"
          aria-label="Recording playback position"
          min="0"
          max={duration || 1}
          step=".1"
          value={position}
          disabled={!active}
          onChange={(e) => p.seek(+e.target.value)}
        />
        <div>
          <span>{recording ? time(position) : "—:—"}</span>
          <span>{recording ? time(duration) : "—:—"}</span>
        </div>
      </div>
      <div className="inline-transport">
        <button aria-label="Previous recording" onClick={() => choose(-1)} disabled={index <= 0}>
          <SkipBack size={19} />
        </button>
        <button
          className="film-play"
          aria-label={active && p.playing ? "Pause recording" : "Play recording"}
          disabled={!recording}
          onClick={() => {
            if (recording) active ? p.toggle() : p.play(recording);
          }}
        >
          {active && p.playing ? (
            <Pause size={21} fill="currentColor" />
          ) : (
            <Play size={21} fill="currentColor" />
          )}
        </button>
        <button
          aria-label="Next recording"
          onClick={() => choose(1)}
          disabled={index < 0 || index >= all.length - 1}
        >
          <SkipForward size={19} />
        </button>
      </div>
      {!compact && (
        <div className="inline-options">
          <label>
            <Volume2 size={16} />
            <span className="sr-only">Volume</span>
            <input
              aria-label="Recording volume"
              type="range"
              min="0"
              max="1"
              step=".01"
              value={p.volume}
              onChange={(e) => p.setVolume(+e.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Playback speed</span>
            <select
              aria-label="Recording speed"
              value={p.speed}
              onChange={(e) => p.setSpeed(+e.target.value)}
            >
              {[0.75, 1, 1.25, 1.5, 2].map((v) => (
                <option key={v} value={v}>
                  {v}×
                </option>
              ))}
            </select>
          </label>
          <button
            aria-label="Repeat recording"
            aria-pressed={p.repeat}
            onClick={() => p.setRepeat(!p.repeat)}
          >
            <Repeat size={16} />
          </button>
          <button
            aria-label="Save to favourites"
            aria-pressed={!!recording && p.favorite.includes(recording.id)}
            disabled={!active}
            onClick={p.fav}
          >
            <Heart size={16} />
          </button>
          <button aria-label="Share recording" disabled={!active} onClick={p.share}>
            <Share2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export function Featured() {
  const p = usePlayer(),
    recording = p.catalog?.recordings.find((r) => r.featured) || p.catalog?.recordings[0];
  const surah =
    (p.catalog?.surahs || fallback).find((s) => s.id === recording?.surah_id) || fallback[0];
  return (
    <div className="chapter-content featured-content">
      <div className="editorial-copy">
        <Kicker number="02">Featured recording</Kicker>
        <h2>
          A voice carried
          <br />
          through the <em>Qur'an.</em>
        </h2>
        <p className="chapter-description">
          A moment of stillness.
          <br />A chapter to return to.
        </p>
        <Link to="/recitations" className="underlined-link">
          Discover the recordings <ArrowRight size={18} />
        </Link>
      </div>
      <article className="featured-player glass-panel">
        <div className="player-card-top">
          <span>{recording ? "SELECTED RECITATION" : "THE ARCHIVE BEGINS HERE"}</span>
          <span>{String(surah.number).padStart(3, "0")}</span>
        </div>
        <div lang="ar" dir="rtl" className="featured-arabic">
          {surah.arabic_name}
        </div>
        <h3>{surah.name}</h3>
        <Revelation surah={surah} />
        <p className="reciter-line">{recording?.reciter_name || "As-Salaam Institute"}</p>
        <EmbeddedPlayer recording={recording} />
        {!recording && (
          <p className="unpublished-note">
            This space will feature your first published recitation.
          </p>
        )}
      </article>
    </div>
  );
}

export function Browse() {
  const { catalog } = usePlayer(),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState("All");
  const rows = (catalog?.surahs || fallback).filter(
    (s) => matches(s, q) && (filter === "All" || s.revelation_type === filter),
  );
  return (
    <div className="chapter-content browse-content">
      <div className="editorial-copy">
        <Kicker number="03">Browse Surahs</Kicker>
        <h2>
          Every Surah,
          <br />
          <em>carefully arranged.</em>
        </h2>
        <p className="chapter-description">
          Find a familiar chapter.
          <br />
          Or begin somewhere new.
        </p>
        <div className="collection-count">
          <strong>114</strong>
          <span>
            CHAPTERS
            <br />
            ONE QUR'AN
          </span>
        </div>
      </div>
      <div className="browse-panel glass-panel">
        <label className="film-search">
          <Search size={18} />
          <span className="sr-only">Search Surahs</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or Surah number"
          />
        </label>
        <div className="film-filters" aria-label="Revelation classification">
          {["All", "Makki", "Madani"].map((f) => (
            <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === "Makki" && <Sun size={13} />}{" "}
              {f === "Madani" && <span className="madani-arch" />}
              {f}
            </button>
          ))}
        </div>
        <div className="browse-rows">
          {rows.slice(0, 4).map((s) => (
            <Link className="browse-row" to="/surah/$slug" params={{ slug: s.slug }} key={s.id}>
              <span className="browse-number">{String(s.number).padStart(3, "0")}</span>
              <div>
                <h3>{s.name}</h3>
                <Revelation surah={s} />
              </div>
              <span lang="ar" dir="rtl">
                {s.arabic_name.replace(/^سُورَةُ\s*/, "")}
              </span>
              <ArrowUpRight size={15} />
            </Link>
          ))}
          {!rows.length && (
            <p className="search-empty">No Surahs found. Try another name or number.</p>
          )}
        </div>
        <div className="browse-panel-bottom">
          <span role="status">{rows.length} Surahs</span>
          <Link to="/surahs" search={{ q }}>
            Open full library <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Listening() {
  const p = usePlayer(),
    recording =
      p.current || p.catalog?.recordings.find((r) => r.featured) || p.catalog?.recordings[0];
  const surah = (p.catalog?.surahs || fallback).find((s) => s.id === recording?.surah_id);
  return (
    <div className="chapter-content listening-content">
      <Kicker number="04">A space to listen</Kicker>
      <h2>
        Let the world
        <br />
        <em>grow quiet.</em>
      </h2>
      <ParticleWave />
      <div className="immersive-player">
        <p className="listening-selection">
          {surah ? (
            <>
              <span lang="ar" dir="rtl">
                {surah.arabic_name}
              </span>
              {surah.name} <i /> {recording?.reciter_name}
            </>
          ) : (
            "Your next moment of stillness starts here."
          )}
        </p>
        <EmbeddedPlayer recording={recording} />
        {!recording && (
          <p className="unpublished-note">Your recitations will appear when you publish them.</p>
        )}
      </div>
    </div>
  );
}

export function AllRecordings() {
  const { catalog, play } = usePlayer(),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState("All"),
    [selected, setSelected] = useState(18),
    [availableOnly, setAvailableOnly] = useState(false);
  const rows = (catalog?.surahs || fallback).filter(
    (s) =>
      matches(s, q) &&
      (filter === "All" || s.revelation_type === filter) &&
      (!availableOnly || catalog?.recordings.some((r) => r.surah_id === s.id)),
  );
  const surah = rows.find((s) => s.id === selected) || rows[0];
  const index = rows.findIndex((s) => s.id === surah?.id),
    recording = catalog?.recordings.find((r) => r.surah_id === surah?.id);
  const step = (delta: number) => {
    if (rows.length) setSelected(rows[(index + delta + rows.length) % rows.length].id);
  };
  return (
    <div className="chapter-content gallery-content">
      <div className="gallery-heading">
        <div>
          <Kicker number="05">All recordings</Kicker>
          <h2>
            Every chapter.
            <br />
            <em>A new return.</em>
          </h2>
        </div>
        <div className="gallery-tools">
          <label className="film-search">
            <Search size={16} />
            <span className="sr-only">Find a Surah in the gallery</span>
            <input
              type="search"
              placeholder="Find your Surah"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <div className="film-filters">
            {["All", "Makki", "Madani"].map((f) => (
              <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
          <label className="available-toggle">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
            />{" "}
            With recordings
          </label>
        </div>
      </div>
      {rows.length ? (
        <>
          <SurahCarousel surahs={rows} selected={surah.id} onSelect={setSelected} />
          <div className="gallery-selection">
            <button className="circle-arrow" aria-label="Previous Surah" onClick={() => step(-1)}>
              <ChevronLeft size={20} />
            </button>
            <div aria-live="polite">
              <p className="selected-surah-number">{String(surah.number).padStart(3, "0")} / 114</p>
              <h3>{surah.name}</h3>
              <Revelation surah={surah} />
            </div>
            <button className="circle-arrow" aria-label="Next Surah" onClick={() => step(1)}>
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="gallery-bottom">
            {recording ? (
              <button className="film-button solid" onClick={() => play(recording)}>
                <Play size={14} /> Play recording
              </button>
            ) : (
              <span className="unpublished-note">Recording not yet published</span>
            )}
            <Link to="/surah/$slug" params={{ slug: surah.slug }} className="underlined-link">
              Open Surah <ArrowUpRight size={15} />
            </Link>
          </div>
        </>
      ) : (
        <div className="gallery-empty">
          <p>No Surahs match your selection.</p>
          <button
            className="film-button"
            onClick={() => {
              setQ("");
              setFilter("All");
              setAvailableOnly(false);
            }}
          >
            Reset filters
          </button>
        </div>
      )}
      <div className="gallery-footer">
        <span>
          DRAG TO EXPLORE <i /> USE THE ARROW KEYS
        </span>
        <Link to="/surahs">
          View as a list <ArrowUpRight size={14} />
        </Link>
      </div>
    </div>
  );
}

export function PrivateArchive() {
  return (
    <div className="chapter-content private-content">
      <div className="editorial-copy">
        <Kicker number="06">The private archive</Kicker>
        <h2>
          Your voice.
          <br />
          <em>Preserved.</em>
        </h2>
        <p className="chapter-description">
          A home for each recitation.
          <br />A place to share it with the world.
        </p>
        <Link className="film-button solid" to="/admin">
          <LockKeyhole size={16} /> Enter your archive <ArrowUpRight size={16} />
        </Link>
        <p className="owner-note">Private access for the owner of As-Salaam Institute.</p>
      </div>
      <div className="archive-note">
        <span className="note-line" />
        <p>
          One recording.
          <br />A thousand returns.
        </p>
        <span>AS-SALAAM INSTITUTE</span>
      </div>
    </div>
  );
}
