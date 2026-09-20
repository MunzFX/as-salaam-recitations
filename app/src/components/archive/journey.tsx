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

  // Scroll-driven water/glitch warp at chapter seams. The SVG displacement
  // follows signed scroll velocity through a damped spring, while the noise
  // phase is derived from scroll position. That keeps the transition smooth,
  // reversible, and still on the exact same film/playhead timeline.
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
    let scrollVelocity = 0;
    let energy = 0;
    let springVelocity = 0;
    let liquidActive = false;

    const measure = () => {
      boundaries = Array.from(
        host.querySelectorAll<HTMLElement>(".scroll-scrub__chapter"),
      )
        .slice(0, -1)
        .map((band) => band.getBoundingClientRect().bottom + window.scrollY);
    };

    const seamStrength = (y: number) => {
      const half = window.innerHeight * 0.9;
      let strength = 0;
      for (const boundary of boundaries) {
        const distance = Math.abs(y - boundary);
        if (distance >= half) continue;
        const proximity = 1 - distance / half;
        const eased = proximity * proximity * (3 - 2 * proximity);
        strength = Math.max(strength, eased);
      }
      return strength;
    };

    const resetVisuals = () => {
      map.setAttribute("scale", "0");
      turbulence.setAttribute("numOctaves", "2");
      media.style.transform = "";
    };

    const tick = (now: number) => {
      const seconds = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000));
      lastT = now;

      const y = window.scrollY;
      const instantVelocity = (y - lastY) / seconds;
      lastY = y;

      // Normalize wheel, trackpad, touch and scrollbar input into one smooth
      // signed velocity. The exponential blend is stable at any refresh rate.
      const velocityBlend = 1 - Math.exp(-seconds * 18);
      scrollVelocity += (instantVelocity - scrollVelocity) * velocityBlend;

      // Critically damped-style spring: fast attack, gentle release, no jitter
      // when scrolling stops. A small overshoot gives the wave an organic tail.
      const target = Math.min(1.1, Math.abs(scrollVelocity) / 1600);
      springVelocity += (target - energy) * 150 * seconds;
      springVelocity *= Math.exp(-20 * seconds);
      energy += springVelocity * seconds;
      if (energy < 0) {
        energy = 0;
        springVelocity = 0;
      } else if (energy > 1.15) {
        energy = 1.15;
        springVelocity = Math.min(0, springVelocity);
      }

      const seam = seamStrength(y);
      const amplitude = energy * (0.22 + 0.98 * seam);

      // Hysteresis avoids rapidly mounting/unmounting the SVG filter around
      // zero, which otherwise appears as a tiny flash on some browsers.
      if (!liquidActive && amplitude > 0.012) liquidActive = true;
      if (liquidActive && amplitude < 0.006) liquidActive = false;
      stage.toggleAttribute("data-liquid", liquidActive);

      if (!liquidActive) {
        resetVisuals();
      } else {
        const mobile = window.innerWidth <= 600;
        const maxScale = mobile ? 44 : 92;
        map.setAttribute("scale", String((amplitude * maxScale).toFixed(2)));
        turbulence.setAttribute("numOctaves", mobile ? "2" : "3");

        // Position-driven phase means reversing the scroll reverses the wave
        // instead of starting an unrelated time animation.
        const phase = y * 0.0105;
        const signedMotion = Math.max(
          -1,
          Math.min(1, scrollVelocity / 1400),
        );
        const frequencyX =
          0.0038 + 0.0028 * (0.5 + 0.5 * Math.sin(phase * 0.7));
        const frequencyY =
          0.078 + 0.052 * (0.5 + 0.5 * Math.cos(phase * 1.11));
        turbulence.setAttribute(
          "baseFrequency",
          `${frequencyX.toFixed(4)} ${frequencyY.toFixed(4)}`,
        );

        const wobble =
          (Math.sin(phase * 1.7) * 0.55 + signedMotion * 0.45) *
          amplitude *
          12;
        const rippleY = Math.cos(phase * 1.2) * amplitude * 4;
        const skew =
          (Math.sin(phase * 2.2) * 0.9 + signedMotion * 1.6) * amplitude;
        const zoom = 1 + amplitude * 0.035;
        const stretch = 1 + amplitude * 0.025;
        media.style.transform = `translate3d(${wobble.toFixed(2)}px, ${rippleY.toFixed(2)}px, 0) skewX(${skew.toFixed(3)}deg) scale(${zoom.toFixed(4)}) scaleY(${stretch.toFixed(4)})`;
      }

      frame = window.requestAnimationFrame(tick);
    };

    const onResize = () => measure();

    measure();
    frame = window.requestAnimationFrame(tick);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      stage.removeAttribute("data-liquid");
      resetVisuals();
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
