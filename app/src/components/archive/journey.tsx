import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollScrub } from "../scroll-scrub/scroll-scrub";
import {
  scrollScrubScenes,
  scrollScrubTheme,
} from "../../archive-journey-scenes";

export function Journey() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        root.current
          ?.querySelectorAll<HTMLElement>(".chapter-content")
          .forEach((node, index) => {
            if (!index) return;
            gsap.fromTo(
              node,
              { y: 35, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                ease: "none",
                scrollTrigger: {
                  trigger: node.closest(".scroll-scrub__chapter"),
                  start: "top 70%",
                  end: "top 15%",
                  scrub: 0.65,
                },
              },
            );
          });
      }, root);
      return () => ctx.revert();
    });
    return () => media.revert();
  }, []);

  return (
    <main id="main" className="cinematic-home" ref={root}>
      <ScrollScrub
        scenes={scrollScrubScenes}
        theme={scrollScrubTheme}
        className="as-salaam-journey"
      />
    </main>
  );
}
