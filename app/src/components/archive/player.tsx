import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { api, time, type Catalog, type Recording } from "../../lib/archive";
type PlayerContextValue = {
  catalog: Catalog | null;
  error: string;
  refresh: () => void;
  play: (r: Recording, position?: number) => void;
  current: Recording | null;
  open: () => void;
  playing: boolean;
  position: number;
  duration: number;
  toggle: () => void;
  step: (delta: number) => void;
  seek: (value: number) => void;
  speed: number;
  setSpeed: (value: number) => void;
  volume: number;
  setVolume: (value: number) => void;
  repeat: boolean;
  setRepeat: (value: boolean) => void;
  favorite: string[];
  fav: () => void;
  share: () => Promise<void>;
  resume: { id: string; position: number } | null;
  audioElement: () => HTMLAudioElement | null;
};
const Context = createContext<PlayerContextValue>(null!);
export const usePlayer = () => useContext(Context);
export function PlayerProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [error, setError] = useState(""),
    [current, setCurrent] = useState<Recording | null>(null),
    [playing, setPlaying] = useState(false),
    [position, setPosition] = useState(0),
    [duration, setDuration] = useState(0),
    [expanded, setExpanded] = useState(false),
    [speed, setSpeed] = useState(1),
    [repeat, setRepeat] = useState(false),
    [volume, setVolume] = useState(1),
    [favorite, setFavorite] = useState<string[]>([]),
    [resume, setResume] = useState<{ id: string; position: number } | null>(null),
    [notice, setNotice] = useState("");
  const audio = useRef<HTMLAudioElement>(null),
    pending = useRef(0),
    wantPlay = useRef(false),
    lastSaved = useRef(0);
  const refresh = () => {
    api("catalog")
      .then((data) => {
        setCatalog(data);
        setError("");
      })
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    refresh();
    try {
      setFavorite(JSON.parse(localStorage.getItem("as-favorites") || "[]"));
      setResume(JSON.parse(localStorage.getItem("as-listening") || "null"));
    } catch {}
  }, []);
  const save = () => {
    if (current && audio.current)
      try {
        localStorage.setItem(
          "as-listening",
          JSON.stringify({ id: current.id, position: audio.current.currentTime }),
        );
      } catch {}
  };
  useEffect(() => {
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, [current]);
  function play(r: Recording, at = 0) {
    setNotice("");
    pending.current = at;
    wantPlay.current = true;
    if (current?.id === r.id && audio.current) {
      if (at) audio.current.currentTime = at;
      void audio.current.play().catch(() => setNotice("Tap play to start the recording."));
    } else {
      save();
      setPosition(at);
      setDuration(r.duration);
      setCurrent(r);
    }
  }
  const toggle = () => {
    if (audio.current) {
      if (audio.current.paused)
        void audio.current
          .play()
          .catch(() => setNotice("Playback could not start. Please try again."));
      else audio.current.pause();
    }
  };
  function step(delta: number) {
    const rows = catalog?.recordings || [],
      i = rows.findIndex((x) => x.id === current?.id),
      r = rows[i + delta];
    if (r) play(r);
  }
  useEffect(() => {
    if (!current || !audio.current) return;
    audio.current.load();
  }, [current?.id]);
  useEffect(() => {
    if (audio.current) {
      audio.current.playbackRate = speed;
      audio.current.volume = volume;
      audio.current.loop = repeat;
    }
  }, [speed, volume, repeat, current]);
  useEffect(() => {
    if (!current || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.reciter_name,
      album: "As-Salaam Institute",
    });
    navigator.mediaSession.setActionHandler("play", () => void audio.current?.play());
    navigator.mediaSession.setActionHandler("pause", () => audio.current?.pause());
    navigator.mediaSession.setActionHandler("previoustrack", () => step(-1));
    navigator.mediaSession.setActionHandler("nexttrack", () => step(1));
    return () => {
      for (const action of ["play", "pause", "previoustrack", "nexttrack"] as MediaSessionAction[])
        navigator.mediaSession.setActionHandler(action, null);
    };
  }, [current, catalog]);
  const surah = catalog?.surahs.find((s) => s.id === current?.surah_id);
  const rows = catalog?.recordings || [],
    idx = rows.findIndex((x) => x.id === current?.id);
  const seek = (value: number) => {
    if (audio.current) {
      audio.current.currentTime = value;
      setPosition(value);
    }
  };
  async function share() {
    if (!surah) return;
    const url = location.origin + "/surah/" + surah.slug;
    try {
      if (navigator.share)
        await navigator.share({ title: surah.name + " | As-Salaam Institute", url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice("Link copied.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setNotice("Copy this page address to share the Surah.");
    }
  }
  function fav() {
    if (!current) return;
    const next = favorite.includes(current.id)
      ? favorite.filter((x) => x !== current.id)
      : [...favorite, current.id];
    setFavorite(next);
    try {
      localStorage.setItem("as-favorites", JSON.stringify(next));
    } catch {}
  }
  const resumeRow = rows.find((x) => x.id === resume?.id);
  return (
    <Context.Provider
      value={{
        catalog,
        error,
        refresh,
        play,
        current,
        open: () => setExpanded(true),
        playing,
        position,
        duration,
        toggle,
        step,
        seek,
        speed,
        setSpeed,
        volume,
        setVolume,
        repeat,
        setRepeat,
        favorite,
        fav,
        share,
        resume,
        audioElement: () => audio.current,
      }}
    >
      {children}
      <audio
        ref={audio}
        preload="metadata"
        src={current ? "/api/archive/audio?id=" + current.id : undefined}
        onLoadedMetadata={() => {
          const a = audio.current!;
          setDuration(Number.isFinite(a.duration) ? a.duration : current?.duration || 0);
          a.currentTime = Math.min(pending.current, a.duration || pending.current);
          if (wantPlay.current) {
            wantPlay.current = false;
            void a.play().catch(() => setNotice("Tap play to begin listening."));
          }
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          save();
        }}
        onTimeUpdate={() => {
          const p = audio.current?.currentTime || 0;
          setPosition(p);
          if (Math.abs(p - lastSaved.current) > 5) {
            lastSaved.current = p;
            save();
          }
        }}
        onEnded={() => {
          if (!repeat) step(1);
        }}
        onError={() => {
          setPlaying(false);
          setNotice("This recording could not load. Check your connection and try again.");
        }}
      />
      {!current && resumeRow && (
        <aside className="resume-player">
          <span>Continue listening: {resumeRow.title}</span>
          <button onClick={() => play(resumeRow, resume?.position)}>
            Continue at {time(resume?.position || 0)} →
          </button>
          <button aria-label="Dismiss continue listening" onClick={() => setResume(null)}>
            ×
          </button>
        </aside>
      )}
      {current && (
        <aside className="mini-player" aria-label="Now playing">
          <button className="now-title" onClick={() => setExpanded(true)}>
            <small>NOW PLAYING</small>
            <strong>
              {surah?.number}. {surah?.name}
            </strong>
            <span>{current.reciter_name}</span>
          </button>
          <div className="mini-time">
            {time(position)} / {time(duration)}
          </div>
          <button aria-label="Previous recording" disabled={idx <= 0} onClick={() => step(-1)}>
            ‹
          </button>
          <button
            className="play-orb small"
            aria-label={playing ? "Pause" : "Play"}
            onClick={toggle}
          >
            {playing ? "Ⅱ" : "▶"}
          </button>
          <button
            aria-label="Next recording"
            disabled={idx >= rows.length - 1}
            onClick={() => step(1)}
          >
            ›
          </button>
          <progress max={duration || 1} value={position} />
        </aside>
      )}
      {expanded && current && (
        <div
          className="player-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setExpanded(false);
          }}
        >
          <section
            className="full-player"
            role="dialog"
            aria-modal="true"
            aria-label="Recording player"
            onKeyDown={(e) => {
              if (e.key === "Escape") setExpanded(false);
              if (e.key === "Tab") {
                const nodes = e.currentTarget.querySelectorAll<HTMLElement>(
                  "button:not(:disabled),a,input,select",
                );
                const first = nodes[0],
                  last = nodes[nodes.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <button
              autoFocus
              className="close-player"
              aria-label="Close full player"
              onClick={() => setExpanded(false)}
            >
              ×
            </button>
            <small>
              {String(surah?.number).padStart(2, "0")} · {surah?.revelation_type.toUpperCase()} ·{" "}
              {surah?.ayah_count} AYAHS
            </small>
            <div className="player-arabic" lang="ar" dir="rtl">
              {surah?.arabic_name}
            </div>
            <h2>{surah?.name}</h2>
            <p>
              {current.reciter_name} · {current.title}
            </p>
            <div className="playback-track">
              <label htmlFor="seek">Playback position</label>
              <input
                id="seek"
                aria-label="Seek recording"
                type="range"
                min="0"
                max={duration || 1}
                step=".1"
                value={position}
                onChange={(e) => seek(+e.target.value)}
              />
              <div>
                <span>{time(position)}</span>
                <span>{time(duration)}</span>
              </div>
            </div>
            <div className="transport">
              <button disabled={idx <= 0} onClick={() => step(-1)}>
                ‹ Previous
              </button>
              <button
                className="play-orb"
                onClick={toggle}
                aria-label={playing ? "Pause recording" : "Play recording"}
              >
                {playing ? "Ⅱ" : "▶"}
              </button>
              <button disabled={idx >= rows.length - 1} onClick={() => step(1)}>
                Next ›
              </button>
            </div>
            <div className="player-options">
              <label>
                Speed
                <select
                  aria-label="Playback speed"
                  value={speed}
                  onChange={(e) => setSpeed(+e.target.value)}
                >
                  {[0.75, 1, 1.25, 1.5, 2].map((v) => (
                    <option key={v} value={v}>
                      {v}×
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Volume
                <input
                  aria-label="Volume"
                  type="range"
                  min="0"
                  max="1"
                  step=".01"
                  value={volume}
                  onChange={(e) => setVolume(+e.target.value)}
                />
              </label>
              <button aria-pressed={repeat} onClick={() => setRepeat(!repeat)}>
                Repeat {repeat ? "on" : "off"}
              </button>
              <button aria-pressed={favorite.includes(current.id)} onClick={fav}>
                {favorite.includes(current.id) ? "♥ Saved" : "♡ Favourite"}
              </button>
              <button onClick={share}>Share ↗</button>
              {!!current.allow_download && (
                <a href={"/api/archive/audio?id=" + current.id + "&download=1"}>Download ↓</a>
              )}
            </div>
            {surah && (
              <Link
                to="/surah/$slug"
                params={{ slug: surah.slug }}
                onClick={() => setExpanded(false)}
              >
                Open Surah page →
              </Link>
            )}
            <p role="status">{notice}</p>
          </section>
        </div>
      )}
      {!expanded && notice && (
        <div role="status" className="toast">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
