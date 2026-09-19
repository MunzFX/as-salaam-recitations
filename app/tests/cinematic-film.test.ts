import { expect, test } from "bun:test";
import { cinematicFilm } from "../src/lib/cinematic-film.server";

test("film delivery rejects unapproved paths and writes", () => {
  expect(cinematicFilm(new Request("https://example.com/api/films/other.mp4")).status).toBe(404);
  expect(cinematicFilm(new Request("https://example.com/api/films/journey-hq-01.mp4", { method: "POST" })).status).toBe(405);
});

test("film delivery can only redirect to the approved media destination", () => {
  const result = cinematicFilm(new Request("https://example.com/api/films/journey-hq-01.mp4?url=https://untrusted.example", {
    headers: { Cookie: "private=value", Authorization: "Bearer private" },
  }));
  expect(result.status).toBe(302);
  expect(new URL(result.headers.get("Location")!).hostname.endsWith(".cloudfront.net")).toBe(true);
  expect(result.headers.get("Location")).not.toContain("untrusted");
  expect(result.headers.has("Cookie")).toBe(false);
  expect(result.headers.has("Authorization")).toBe(false);
  expect(result.headers.has("Set-Cookie")).toBe(false);
});
