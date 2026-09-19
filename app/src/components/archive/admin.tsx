import { useEffect, useState, type FormEvent } from "react";
import { api, time, type Catalog, type Recording, type Surah } from "../../lib/archive";
import { usePlayer } from "./player";
type AdminData = Catalog & {
  files: { id: string; original_name: string; duration: number; created_at: string }[];
};
const initial = {
  surah_id: 1,
  reciter_id: "",
  audio_id: "",
  title: "",
  description: "",
  status: "draft",
  featured: false,
  allow_download: false,
  rights_confirmed: false,
  sort_order: 0,
};
export function Admin({ start = "Dashboard" }: { start?: string }) {
  const [auth, setAuth] = useState<boolean | null>(null),
    [configured, setConfigured] = useState(true),
    [password, setPassword] = useState(""),
    [data, setData] = useState<AdminData | null>(null),
    [tab, setTab] = useState(start),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState<typeof initial & { id?: string }>(initial),
    [progress, setProgress] = useState<number | null>(null),
    [reciterName, setReciterName] = useState(""),
    [reciterDesc, setReciterDesc] = useState(""),
    [surah, setSurah] = useState<Surah | null>(null),
    [about, setAbout] = useState(""),
    [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { refresh, play } = usePlayer();
  async function load() {
    const d = await api("admin");
    setData(d);
    setAbout(d.settings.about || "");
  }
  useEffect(() => {
    api("session")
      .then((s) => {
        setAuth(s.authenticated);
        setConfigured(s.configured);
        if (s.authenticated) void load().catch((e) => setMessage(e.message));
      })
      .catch((e) => {
        setAuth(false);
        setMessage(e.message);
      });
  }, []);
  async function action(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
      setMessage(success);
      await load();
      refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("login", { password });
      setPassword("");
      setAuth(true);
      await load();
      setMessage("");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function edit(r: Recording) {
    setForm({
      ...r,
      featured: !!r.featured,
      allow_download: !!r.allow_download,
      rights_confirmed: !!r.rights_confirmed,
    });
    setProgress(null);
    setTab("Upload Recording");
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("Checking audio…");
    setProgress(0);
    try {
      if (file.size > 50 * 1024 * 1024 || !/\.(mp3|m4a|wav)$/i.test(file.name))
        throw new Error("Choose an MP3, M4A or WAV file up to 50 MB.");
      const duration = await new Promise<number>((resolve, reject) => {
        const a = new Audio(),
          url = URL.createObjectURL(file);
        let timer: ReturnType<typeof setTimeout>;
        const clean = () => {
          clearTimeout(timer);
          a.removeAttribute("src");
          URL.revokeObjectURL(url);
        };
        a.preload = "metadata";
        a.onloadedmetadata = () => {
          const n = a.duration;
          clean();
          Number.isFinite(n) && n > 0
            ? resolve(n)
            : reject(new Error("This audio file has no readable duration."));
        };
        a.onerror = () => {
          clean();
          reject(new Error("This file cannot be played. Export it as MP3 and try again."));
        };
        timer = setTimeout(() => {
          clean();
          reject(new Error("Audio validation timed out. Try an MP3 file."));
        }, 20000);
        a.src = url;
      });
      const fd = new FormData();
      fd.append("file", file);
      fd.append("duration", String(duration));
      setMessage("Uploading recording…");
      const result = await new Promise<{ id: string }>((resolve, reject) => {
        const x = new XMLHttpRequest();
        x.open("POST", "/api/archive/upload");
        x.timeout = 180000;
        x.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        x.onload = () => {
          try {
            const d = JSON.parse(x.responseText);
            x.status >= 200 && x.status < 300
              ? resolve(d)
              : reject(new Error(d.error || "Upload failed."));
          } catch {
            reject(new Error("Upload failed. Please try again."));
          }
        };
        x.onerror = () => reject(new Error("Connection lost. Please retry the upload."));
        x.ontimeout = () => reject(new Error("Upload timed out. Please try again."));
        x.send(fd);
      });
      setForm((f) => ({ ...f, audio_id: result.id }));
      setProgress(100);
      setMessage("Upload complete. Review and save the recording.");
      await load();
    } catch (e) {
      setMessage((e as Error).message);
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }
  const field = (key: keyof typeof initial, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));
  const currentSurah = data?.surahs.find((s) => s.id === form.surah_id);
  if (auth === null)
    return (
      <main id="main" className="page admin">
        <p>Checking administrator access…</p>
      </main>
    );
  if (!auth)
    return (
      <main id="main" className="page admin admin-login">
        <p className="eyebrow">AS-SALAAM INSTITUTE</p>
        <h1>
          Administrator
          <br />
          sign in.
        </h1>
        <p className="admin-note">Manage recordings, reciters and the Surah library.</p>
        {!configured && (
          <div className="metadata-review">
            This private archive is awaiting secure owner access. Sign-in will become available
            once the administrator password has been configured for this website.
          </div>
        )}
        <form className="admin-form" onSubmit={login}>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              maxLength={512}
            />
          </label>
          <button className="save-button" disabled={busy || !configured}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="status-message" role="status">
          {message}
        </p>
      </main>
    );
  return (
    <main id="main" className="page admin">
      <p className="eyebrow">AS-SALAAM INSTITUTE</p>
      <h1>Recording studio.</h1>
      <nav className="admin-nav" aria-label="Administrator navigation">
        {["Dashboard", "Recordings", "Surahs", "Reciters", "Upload Recording", "Settings"].map(
          (t) => (
            <button
              key={t}
              aria-current={tab === t}
              onClick={() => {
                setTab(t);
                setMessage("");
                if (t === "Upload Recording") {
                  setForm(initial);
                  setProgress(null);
                }
              }}
            >
              {t}
            </button>
          ),
        )}
        <button
          onClick={async () => {
            await api("logout", {});
            setAuth(false);
            setData(null);
          }}
        >
          Sign out
        </button>
      </nav>
      <p role="status" className="status-message">
        {message}
      </p>
      {!data ? (
        <p>Loading your library…</p>
      ) : (
        <>
          {tab === "Dashboard" && (
            <>
              <h2>Your library at a glance.</h2>
              <div className="admin-stats">
                {[
                  ["Total Surahs", data.surahs.length],
                  [
                    "Published recordings",
                    data.recordings.filter((r) => r.status === "published").length,
                  ],
                  ["Draft recordings", data.recordings.filter((r) => r.status === "draft").length],
                  ["Featured recordings", data.recordings.filter((r) => r.featured).length],
                  ["Total audio files", data.files.length],
                  [
                    "Unpublished recordings",
                    data.recordings.filter((r) => r.status === "unpublished").length,
                  ],
                ].map(([label, n]) => (
                  <div key={label}>
                    <strong>{n}</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <h2>Recent uploads</h2>
              {data.files.slice(0, 8).map((f) => (
                <div className="recording-row" key={f.id}>
                  <div>
                    {f.original_name}
                    <p>{f.created_at}</p>
                  </div>
                  <span>{time(f.duration)}</span>
                </div>
              ))}
              {!data.files.length && <p>No audio files have been uploaded yet.</p>}
            </>
          )}
          {tab === "Recordings" && (
            <>
              <h2>Recordings</h2>
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Recording</th>
                      <th>Status</th>
                      <th>Featured</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recordings.map((r) => (
                      <tr key={r.id}>
                        <td>
                          {r.title}
                          <p>{r.reciter_name}</p>
                        </td>
                        <td>{r.status}</td>
                        <td>{r.featured ? "Yes" : "No"}</td>
                        <td>
                          <button onClick={() => play(r)}>Preview</button>
                          <button onClick={() => edit(r)}>Edit / replace audio</button>
                          <button onClick={() => setConfirmDelete(r.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.recordings.length && (
                <div className="empty">
                  <p>No recordings yet. Add a reciter, then upload your first recording.</p>
                </div>
              )}
              {confirmDelete && (
                <section className="error" role="alertdialog" aria-label="Delete recording">
                  <h2>Delete this recording?</h2>
                  <p>
                    The recording will be removed from the library. Its audio file remains available
                    for reuse.
                  </p>
                  <button onClick={() => setConfirmDelete(null)}>Cancel</button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void action(async () => {
                        await api("delete-recording", { id: confirmDelete, confirm: true });
                        setConfirmDelete(null);
                      }, "Recording deleted.")
                    }
                  >
                    Confirm delete
                  </button>
                </section>
              )}
            </>
          )}
          {tab === "Upload Recording" && (
            <>
              <h2>{form.id ? "Edit recording" : "Add a recording"}</h2>
              <form
                className="admin-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(() => api("save-recording", form), "Recording saved.");
                }}
              >
                <label>
                  Select Surah
                  <select
                    value={form.surah_id}
                    onChange={(e) => {
                      field("surah_id", +e.target.value);
                      if (!form.id)
                        field(
                          "title",
                          data.surahs.find((s) => s.id === +e.target.value)?.name || "",
                        );
                    }}
                  >
                    {data.surahs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {String(s.number).padStart(2, "0")} · {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                {currentSurah && (
                  <div className="metadata-review">
                    <strong>
                      {currentSurah.number} · {currentSurah.name}
                    </strong>
                    <p lang="ar" dir="rtl">
                      {currentSurah.arabic_name}
                    </p>
                    {currentSurah.revelation_type} · {currentSurah.ayah_count} Ayahs
                  </div>
                )}
                <div className="form-grid">
                  <label>
                    Reciter
                    <select
                      required
                      value={form.reciter_id}
                      onChange={(e) => field("reciter_id", e.target.value)}
                    >
                      <option value="">Select a reciter</option>
                      {data.reciters.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Recording title
                    <input
                      required
                      maxLength={200}
                      value={form.title}
                      onChange={(e) => field("title", e.target.value)}
                    />
                  </label>
                </div>
                {!data.reciters.length && (
                  <p>Add a reciter in the Reciters section before saving.</p>
                )}
                <div className="upload-zone">
                  <label>
                    {form.audio_id ? "Replace audio" : "Audio file"}
                    <input
                      type="file"
                      accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav"
                      disabled={busy}
                      onChange={(e) => void upload(e.target.files?.[0])}
                    />
                  </label>
                  <p>MP3, M4A or WAV. Maximum 50 MB.</p>
                  {progress !== null && (
                    <>
                      <progress max={100} value={progress} aria-label="Upload progress" />
                      <p>{progress === 100 ? "Upload complete" : progress + "% uploaded"}</p>
                    </>
                  )}
                  <label>
                    Or reuse an uploaded file
                    <select
                      required
                      value={form.audio_id}
                      onChange={(e) => field("audio_id", e.target.value)}
                    >
                      <option value="">Choose audio</option>
                      {data.files.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.original_name} ({time(f.duration)})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Description
                  <textarea
                    maxLength={5000}
                    value={form.description}
                    onChange={(e) => field("description", e.target.value)}
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Status
                    <select value={form.status} onChange={(e) => field("status", e.target.value)}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="unpublished">Unpublished</option>
                    </select>
                  </label>
                  <label>
                    Recording order
                    <input
                      type="number"
                      min="0"
                      max="999999"
                      value={form.sort_order}
                      onChange={(e) => field("sort_order", +e.target.value)}
                    />
                  </label>
                </div>
                {(
                  [
                    ["featured", "Featured on homepage"],
                    ["allow_download", "Allow listeners to download"],
                    [
                      "rights_confirmed",
                      "As-Salaam Institute has permission to distribute this recording",
                    ],
                  ] as const
                ).map(([k, label]) => (
                  <label className="check" key={k}>
                    <input
                      type="checkbox"
                      checked={form[k]}
                      onChange={(e) => field(k, e.target.checked)}
                    />
                    {label}
                  </label>
                ))}
                <button className="save-button" disabled={busy || !form.audio_id}>
                  {busy ? "Please wait…" : "Save recording"}
                </button>
              </form>
            </>
          )}
          {tab === "Reciters" && (
            <>
              <h2>Reciters</h2>
              {data.reciters.map((r) => (
                <article className="recording-row" key={r.id}>
                  <div>
                    <h3>{r.name}</h3>
                    <p>{r.description}</p>
                  </div>
                </article>
              ))}
              <form
                className="admin-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(async () => {
                    await api("save-reciter", { name: reciterName, description: reciterDesc });
                    setReciterName("");
                    setReciterDesc("");
                  }, "Reciter added.");
                }}
              >
                <label>
                  Reciter name
                  <input
                    required
                    maxLength={100}
                    value={reciterName}
                    onChange={(e) => setReciterName(e.target.value)}
                  />
                </label>
                <label>
                  Description
                  <textarea
                    maxLength={2000}
                    value={reciterDesc}
                    onChange={(e) => setReciterDesc(e.target.value)}
                  />
                </label>
                <button className="save-button" disabled={busy}>
                  Add reciter
                </button>
              </form>
            </>
          )}
          {tab === "Surahs" && (
            <>
              <h2>Review Surah metadata</h2>
              <p className="admin-note">
                Seeded from Al Quran Cloud. Review carefully before changing religious metadata.
                Surah numbers and URLs remain stable.
              </p>
              <label>
                Choose Surah
                <select
                  value={surah?.id || ""}
                  onChange={(e) =>
                    setSurah(data.surahs.find((s) => s.id === +e.target.value) || null)
                  }
                >
                  <option value="">Select Surah</option>
                  {data.surahs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.number} · {s.name}
                    </option>
                  ))}
                </select>
              </label>
              {surah && (
                <form
                  className="admin-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action(() => api("save-surah", surah), "Surah metadata saved.");
                  }}
                >
                  {(["name", "arabic_name", "transliteration"] as const).map((k) => (
                    <label key={k}>
                      {k.replace("_", " ")}
                      <input
                        required
                        value={surah[k]}
                        onChange={(e) => setSurah({ ...surah, [k]: e.target.value })}
                      />
                    </label>
                  ))}
                  <label>
                    Revelation classification
                    <select
                      value={surah.revelation_type}
                      onChange={(e) =>
                        setSurah({
                          ...surah,
                          revelation_type: e.target.value as "Makki" | "Madani",
                        })
                      }
                    >
                      <option>Makki</option>
                      <option>Madani</option>
                    </select>
                  </label>
                  <label>
                    Ayah count
                    <input
                      type="number"
                      min="1"
                      max="286"
                      value={surah.ayah_count}
                      onChange={(e) => setSurah({ ...surah, ayah_count: +e.target.value })}
                    />
                  </label>
                  <button className="save-button" disabled={busy}>
                    Save metadata
                  </button>
                </form>
              )}
            </>
          )}
          {tab === "Settings" && (
            <>
              <h2>Institute settings</h2>
              <label className="upload-zone">
                Official institute logo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      void action(async () => {
                        const fd = new FormData();
                        fd.append("file", file);
                        const r = await fetch("/api/archive/logo", { method: "POST", body: fd });
                        const d = await r.json();
                        if (!r.ok) throw new Error(d.error);
                      }, "Original logo saved without alteration.");
                  }}
                />
              </label>
              <form
                className="admin-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(() => api("settings", { about }), "Settings saved.");
                }}
              >
                <label>
                  About the platform
                  <textarea
                    maxLength={5000}
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                  />
                </label>
                <button className="save-button" disabled={busy}>
                  Save settings
                </button>
              </form>
              <p className="admin-note">
                Use the original institute logo only. Uploads are stored without alteration and
                displayed with their original proportions.
              </p>
              <p className="admin-note">
                The administrator password is managed privately by your website host.
                It cannot be viewed or changed from this page.
              </p>
            </>
          )}
        </>
      )}
    </main>
  );
}
