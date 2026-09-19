import type {
  ScrollScrubScene,
  ScrollScrubTheme,
} from "./components/scroll-scrub/scroll-scrub";
import media from "../cinematic-assets.json";
import {
  Invitation,
  Featured,
  Browse,
  Listening,
  AllRecordings,
  PrivateArchive,
} from "./components/archive/journey-parts";

export const scrollScrubTheme: ScrollScrubTheme = {
  accent: "#d3b471",
  background: "#1f1911",
  ink: "#f8f1e5",
  muted: "#ddd4c1",
};
const chapters = [
  {
    id: "invitation",
    label: "Invitation",
    title: "Begin with listening.",
    content: <Invitation />,
    scroll: 2.25,
  },
  {
    id: "featured",
    label: "Featured recording",
    title: "A voice carried through the Qur’an.",
    content: <Featured />,
    scroll: 2.25,
  },
  {
    id: "browse",
    label: "Browse Surahs",
    title: "Every Surah, carefully arranged.",
    content: <Browse />,
    scroll: 2.25,
  },
  {
    id: "listening",
    label: "A space to listen",
    title: "Let the world grow quiet.",
    content: <Listening />,
    scroll: 2.25,
  },
  {
    id: "all-recordings",
    label: "All recordings",
    title: "Every chapter. A new return.",
    content: <AllRecordings />,
    scroll: 1.25,
  },
  {
    id: "private-archive",
    label: "Private archive",
    title: "Your voice. Preserved.",
    content: <PrivateArchive />,
    // The last viewport is occupied by the stage; only the rest can scrub.
    scroll: 1 + 58 / 48,
  },
];
// Every chapter advances the same continuous film at two seconds per viewport.
// Adjacent files share their actual boundary frame; no still-image dwell bands.
export const scrollScrubScenes: ScrollScrubScene[] = chapters.map(
  (chapter, index) => {
    const name = `/assets/world/journey-hq-${String(index + 1).padStart(2, "0")}`;
    const film = (suffix: string) => {
      const asset = media.find(asset => "/" + asset.path === name + suffix + ".mp4")!;
      return `/api/films/${asset.path.split("/").at(-1)}?v=${asset.sha256.slice(0, 12)}`;
    };
    return {
      ...chapter,
      body: "",
      clip: film(""),
      poster: name + "-poster.webp",
      mobileClip: film("-mobile"),
      mobilePoster: name + "-mobile-poster.webp",
    };
  },
);

