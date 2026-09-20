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
        root.current?.querySelectorAll<HTMLElement>(".chapter-content").forEach((node, index) => {
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
                scrub: 0.4,
              },
            },
          );
        });
      }, root);
      return () => ctx.revert();
    });
    return () => media.revert();
  }, []);

  // Scroll-driven WATER warp at the chapter seams: the film itself is
  // displaced by an SVG turbulence filter whose strength follows scroll
  // VELOCITY with a spring — fast scroll = deep liquid stretch, and it
  // eases back to zero when scrolling stops (like the reference site).
  // Peaks at the seams between chapters. Purely visual: it never reads
  // or alters scrub timing.
  useEffect(() => {
    const host = root.current;
    const stage = host?.querySelector<HTMLElement>(".scroll-scrub");
    const media = host?.querySelector<HTMLElement>(".scroll-scrub__media");
    const map = host?.querySelector<SVGFEDisplacementMapElement>(
      "[data-liquid-map]",
    );
    const turbulence = host?.querySelector<SVGFETurbulenceElement>(
      "[data-liquid-turbulence]",
    );
    if (!host || !stage || !media || !map || !turbulence) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let frame = 0;
    let boundaries: number[] = [];
    let lastY = window.scrollY;
    let lastT = performance.now();
    let velocity = 0; // smoothed |scroll delta| in px per frame
    let energy = 0; // spring value that chases velocity
    let phase = 0;

    const measure = () => {
      boundaries = Array.from(
        host.querySelectorAll<HTMLElement>(".scroll-scrub__chapter"),
      )
        .slice(0, -1) // seams sit between chapters, not after the last one
        .map((band) => band.getBoundingClientRect().bottom + window.scrollY);
    };

    const seamK = (y: number) => {
      const half = window.innerHeight * 0.9;
      let k = 0;
      for (const boundary of boundaries) {
        const d = Math.abs(y - boundary);
        if (d >= half) {
          continue;
        }
        const t = 1 - d / half;
        const eased = t * t * (3 - 2 * t);
        if (eased > k) {
          k = eased;
        }
      }
      return k;
    };

    const tick = (now: number) => {
      const dt = Math.min(64, Math.max(1, now - lastT));
      lastT = now;
      const y = window.scrollY;
      velocity += ((Math.abs(y - lastY) - velocity) * 0.35 * dt) / 16;
      lastY = y;

      // Spring: energy chases velocity up and eases back to zero.
      const target = Math.min(1, velocity / 26);
      energy += (target - energy) * Math.min(1, 0.16 * (dt / 16));

      const k = seamK(y);
      const amplitude = energy * (0.25 + 0.75 * k);
      const active = amplitude > 0.015;

      stage.toggleAttribute("data-liquid", active);
      if (!active) {
        map.setAttribute("scale", "0");
        media.style.transform = "";
      } else {
        const viewport = window.innerWidth;
        const maxScale = viewport <= 600 ? 34 : 62;
        map.setAttribute("scale", String((amplitude * maxScale).toFixed(2)));

        // Drift the turbulence so the water keeps flowing while displaced.
        phase += dt * 0.00045 * (0.4 + amplitude);
        const bfX = (0.004 + 0.0028 * Math.sin(phase)).toFixed(4);
        const bfY = (0.09 + 0.04 * Math.sin(phase * 1.7)).toFixed(4);
        turbulence.setAttribute("baseFrequency", `${bfX} ${bfY}`);

        // Liquid stretch along the scroll axis plus a horizontal wobble.
        // A slight overall zoom keeps the film edge-to-edge during the
        // lateral shift so the stage background never peeks through.
        const wobble = Math.sin(now / 85) * amplitude * 6;
        const zoom = 1 + amplitude * 0.022;
        media.style.transform = `translate3d(${wobble.toFixed(2)}px, 0, 0) skewX(${(Math.sin(now / 130) * amplitude * 1.1).toFixed(3)}deg) scale(${zoom.toFixed(4)}) scaleY(${(1 + amplitude * 0.02).toFixed(4)})`;
      }

      frame = window.requestAnimationFrame(tick);
    };

    const onResize = () => {
      measure();
    };

    measure();
    frame = window.requestAnimationFrame(tick);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      stage.removeAttribute("data-liquid");
      map.setAttribute("scale", "0");
      media.style.transform = "";
    };
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
