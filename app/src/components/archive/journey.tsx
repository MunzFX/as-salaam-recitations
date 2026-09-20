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
    let energy = 0; // spring position (0..1.1, may overshoot briefly)
    let spring = 0; // spring velocity
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
      const frameDt = dt / 16;
      const y = window.scrollY;
      velocity += ((Math.abs(y - lastY) - velocity) * 0.35 * frameDt);
      lastY = y;

      // Damped spring: energy chases velocity up fast and settles back
      // with a smooth ease and a hint of overshoot — no hard clamping,
      // so the wave breathes like the reference site.
      const target = Math.min(1.1, velocity / 18);
      const stiffness = 0.34 * frameDt;
      const damping = Math.pow(0.82, frameDt);
      spring += (target - energy) * stiffness;
      spring *= damping;
      energy += spring;

      const k = seamK(y);
      const amplitude = Math.min(1.1, energy * (0.3 + 0.85 * k));
      const active = amplitude > 0.015;

      stage.toggleAttribute("data-liquid", active);
      if (!active) {
        map.setAttribute("scale", "0");
        turbulence.setAttribute("numOctaves", "2");
        media.style.transform = "";
      } else {
        const viewport = window.innerWidth;
        const maxScale = viewport <= 600 ? 46 : 96;
        map.setAttribute("scale", String((amplitude * maxScale).toFixed(2)));
        turbulence.setAttribute("numOctaves", viewport <= 600 ? "2" : "3");

        // Drift the turbulence so the water keeps flowing while displaced.
        phase += dt * 0.00055 * (0.4 + amplitude);
        const bfX = (0.004 + 0.0032 * Math.sin(phase)).toFixed(4);
        const bfY = (0.09 + 0.045 * Math.sin(phase * 1.7)).toFixed(4);
        turbulence.setAttribute("baseFrequency", `${bfX} ${bfY}`);

        // Liquid stretch along the scroll axis plus a horizontal wobble.
        // A slight overall zoom keeps the film edge-to-edge during the
        // lateral shift so the stage background never peeks through.
        const wobble = Math.sin(now / 80) * amplitude * 10;
        const zoom = 1 + amplitude * 0.03;
        media.style.transform = `translate3d(${wobble.toFixed(2)}px, ${(Math.sin(now / 140) * amplitude * 4).toFixed(2)}px, 0) skewX(${(Math.sin(now / 125) * amplitude * 1.8).toFixed(3)}deg) scale(${zoom.toFixed(4)}) scaleY(${(1 + amplitude * 0.028).toFixed(4)})`;
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
