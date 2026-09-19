import { useEffect, useRef } from "react";
import { usePlayer } from "./player";

/** Decorative light follows playback state; it is not a fabricated audio waveform. */
export function ParticleWave() {
  const host = useRef<HTMLDivElement>(null),
    state = useRef(false);
  const { playing } = usePlayer();
  useEffect(() => {
    state.current = playing;
  }, [playing]);
  useEffect(() => {
    let disposed = false,
      cleanup = () => {};
    const node = host.current!;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void import("three").then((THREE) => {
      if (disposed) return;
      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: false,
          powerPreference: "low-power",
        });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.setClearColor(0, 0);
      node.appendChild(renderer.domElement);
      const scene = new THREE.Scene(),
        camera = new THREE.PerspectiveCamera(40, 1, 0.1, 30);
      camera.position.z = 10;
      const n = 1800,
        positions = new Float32Array(n * 3),
        base = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const x = ((i % 150) / 149) * 16 - 8,
          y = (Math.floor(i / 150) / 11) * 1.1 - 0.55;
        base[i * 3] = x;
        base[i * 3 + 1] = y;
        base[i * 3 + 2] = Math.sin(i * 1.733) * 0.3;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        color: 0xe1bf78,
        size: 0.022,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      scene.add(new THREE.Points(geometry, material));
      let visible = false,
        frame = 0,
        phase = 0,
        last = 0;
      const resize = () => {
        renderer.setSize(node.clientWidth, node.clientHeight);
        camera.aspect = node.clientWidth / node.clientHeight;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(node);
      resize();
      const draw = (now: number) => {
        if (disposed) return;
        const dt = Math.min((now - last) / 1000, 0.1) || 0.016;
        last = now;
        if (state.current) phase += dt * 0.7;
        for (let i = 0; i < n; i++) {
          const x = base[i * 3],
            envelope = Math.exp((-x * x) / 20);
          positions[i * 3] = x;
          positions[i * 3 + 1] =
            base[i * 3 + 1] * envelope +
            Math.sin(x * 2.2 + phase) * envelope * 0.45 +
            Math.sin(x * 0.8 - phase) * 0.1;
          positions[i * 3 + 2] = base[i * 3 + 2];
        }
        geometry.attributes.position.needsUpdate = true;
        renderer.render(scene, camera);
        if (visible && state.current) frame = requestAnimationFrame(draw);
      };
      // A light timer detects play/pause without keeping an idle render loop alive.
      const timer = setInterval(() => {
        if (visible && !document.hidden) {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(draw);
        }
      }, 500);
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(draw);
        } else cancelAnimationFrame(frame);
      });
      observer.observe(node);
      cleanup = () => {
        clearInterval(timer);
        cancelAnimationFrame(frame);
        observer.disconnect();
        ro.disconnect();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);
  return (
    <div className="particle-wave" ref={host} aria-hidden="true">
      <div className="wave-fallback" />
    </div>
  );
}
