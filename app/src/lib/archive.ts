export type Surah = {
  id: number;
  number: number;
  name: string;
  arabic_name: string;
  transliteration: string;
  slug: string;
  revelation_type: "Makki" | "Madani";
  ayah_count: number;
  sort_order: number;
};
export type Recording = {
  id: string;
  surah_id: number;
  reciter_id: string;
  audio_id: string;
  title: string;
  description: string;
  status: string;
  featured: number;
  allow_download: number;
  rights_confirmed: number;
  sort_order: number;
  duration: number;
  reciter_name: string;
  created_at: string;
};
export type Catalog = {
  surahs: Surah[];
  recordings: Recording[];
  reciters: { id: string; name: string; slug: string; description: string }[];
  settings: Record<string, string>;
};
export function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .replace(/[^a-z0-9\u0621-\u064a]/g, "")
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u");
}
export function matches(s: Surah, q: string) {
  const n = normalize(q);
  return (
    !n ||
    [
      String(s.number),
      String(s.number).padStart(2, "0"),
      String(s.number).padStart(3, "0"),
      s.name,
      s.arabic_name,
      s.slug,
      s.transliteration,
    ].some((x) => normalize(x).includes(n))
  );
}
export const time = (n: number) => {
  const s = Math.max(0, Math.floor(n || 0));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};
export async function api(path: string, body?: unknown) {
  const r = await fetch(
    "/api/archive/" + path,
    body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Please try again.");
  return d;
}
