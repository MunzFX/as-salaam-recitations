import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { scrollScrubScenes } from "../src/archive-journey-scenes";

test("every scroll chapter advances the continuous film with matching seams", () => {
  const media = JSON.parse(readFileSync(new URL("../../design/continuous-journey-checks.json", import.meta.url), "utf8"));
  expect(scrollScrubScenes).toHaveLength(6);
  for (const [index, scene] of scrollScrubScenes.entries()) {
    for (const clip of [scene.clip, scene.mobileClip]) {
      expect(clip).toMatch(/^\/api\/films\/journey-hq-\d{2}(-mobile)?\.mp4\?v=[a-f0-9]{12}$/);
    }
    for (const asset of [scene.poster, scene.mobilePoster]) {
      expect(asset).toBeTruthy();
      expect(existsSync(new URL(`../public${asset}`, import.meta.url))).toBe(true);
    }
    // The final viewport is occupied by the sticky stage, not scrub distance.
    const distance = scene.scroll! - (index === 5 ? 1 : 0);
    const chapter = media.chapters[index];
    const seconds = (chapter.end_frame - chapter.start_frame) / media.fps;
    expect(seconds / distance).toBeCloseTo(2, 6);
  }
  expect(media.seams).toHaveLength(10);
  for (const seam of media.seams) expect(seam.mean_rgb_difference).toBe(0);
  expect(media.desktop_resolution).toEqual([1920, 1080]);
  expect(media.mobile_resolution).toEqual([720, 1280]);
  expect(media.desktop_video_bytes).toBeLessThanOrEqual(96 * 1024 ** 2);
  expect(media.mobile_video_bytes).toBeLessThanOrEqual(48 * 1024 ** 2);
});

