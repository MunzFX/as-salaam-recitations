import assets from "../../cinematic-assets.json";

const films = new Map(assets.map(asset => [asset.path.split("/").at(-1)!, asset.url]));

// The CDN supports browser CORS and ranges. Only the approved films are routed;
// no build downloads, open redirects, or Worker outbound networking are needed.
export function cinematicFilm(request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  const name = new URL(request.url).pathname.slice("/api/films/".length);
  const source = films.get(name);
  if (!source) return new Response("Film not found", { status: 404 });
  return new Response(null, {
    status: 302,
    headers: { Location: source, "Cache-Control": "public, max-age=3600" },
  });
}
