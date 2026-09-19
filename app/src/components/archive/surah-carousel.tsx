import { useEffect, useRef, useState } from "react";
import type { Surah } from "../../lib/archive";

type Props = { surahs: Surah[]; selected: number; onSelect: (id: number) => void };
const mod = (n: number, length: number) => ((n % length) + length) % length;

/** The canvas is a visual supplement to the native select and Surah links. */
export function SurahCarousel({ surahs, selected, onSelect }: Props) {
  const host = useRef<HTMLDivElement>(null),
    data = useRef({ surahs, selected, onSelect });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    data.current = { surahs, selected, onSelect };
  }, [surahs, selected, onSelect]);
  useEffect(() => {
    let disposed = false,
      cleanup = () => {};
    const node = host.current!;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void (async () => {
      const THREE = await import("three");
      await document.fonts.ready;
      if (disposed) return;
      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
      } catch {
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.setAttribute("aria-hidden", "true");
      node.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
      camera.position.set(0, 1, 11);
      camera.lookAt(0, -0.4, 0);
      const geometry = new THREE.PlaneGeometry(2.75, 4.2);
      const textures = new Map<number, import("three").CanvasTexture>();
      function texture(s: Surah) {
        const existing = textures.get(s.id);
        if (existing) return existing;
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 784;
        const c = canvas.getContext("2d")!;
        const gradient = c.createLinearGradient(0, 0, 512, 784);
        gradient.addColorStop(0, "#4b3d2a");
        gradient.addColorStop(0.5, "#2d2419");
        gradient.addColorStop(1, "#1a150f");
        c.fillStyle = gradient;
        c.fillRect(0, 0, 512, 784);
        c.strokeStyle = "#968257";
        c.lineWidth = 1.5;
        c.strokeRect(16, 16, 480, 752);
        c.beginPath();
        c.moveTo(65, 550);
        c.lineTo(65, 285);
        c.bezierCurveTo(65, 180, 178, 168, 256, 85);
        c.bezierCurveTo(334, 168, 447, 180, 447, 285);
        c.lineTo(447, 550);
        c.strokeStyle = "#8e79513b";
        c.stroke();
        c.fillStyle = "#e1c98c";
        c.font = "26px Inter, sans-serif";
        c.textAlign = "left";
        c.fillText(String(s.number).padStart(3, "0"), 42, 66);
        c.textAlign = "center";
        c.fillStyle = "#f2ead8";
        c.direction = "rtl";
        c.font = '52px "Noto Naskh Arabic", serif';
        c.fillText(s.arabic_name.replace(/^سُورَةُ\s*/, ""), 256, 344, 422);
        c.direction = "ltr";
        c.font = '46px "Cormorant Garamond", serif';
        c.fillText(s.name, 256, 440, 434);
        c.fillStyle = "#c4b798";
        c.font = "20px Inter, sans-serif";
        c.fillText(s.revelation_type.toUpperCase() + "  ·  " + s.ayah_count + " AYAHS", 256, 488);
        c.strokeStyle = "#a68b55";
        c.beginPath();
        c.moveTo(188, 544);
        c.lineTo(324, 544);
        c.stroke();
        c.fillStyle = "#b6a57f";
        c.font = "17px Inter, sans-serif";
        c.fillText("AS-SALAAM INSTITUTE", 256, 710);
        if (s.revelation_type === "Makki") {
          c.strokeStyle = "#d1ad61";
          c.beginPath();
          c.arc(440, 56, 9, 0, Math.PI * 2);
          c.stroke();
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4;
            c.beginPath();
            c.moveTo(440 + Math.cos(a) * 13, 56 + Math.sin(a) * 13);
            c.lineTo(440 + Math.cos(a) * 17, 56 + Math.sin(a) * 17);
            c.stroke();
          }
        } else {
          c.strokeStyle = "#bbab8e";
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(428, 70);
          c.lineTo(428, 51);
          c.quadraticCurveTo(428, 39, 440, 34);
          c.quadraticCurveTo(452, 39, 452, 51);
          c.lineTo(452, 70);
          c.stroke();
        }
        const t = new THREE.CanvasTexture(canvas);
        t.colorSpace = THREE.SRGBColorSpace;
        textures.set(s.id, t);
        return t;
      }
      const slots = Array.from({ length: 15 }, () => {
        const material = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geometry, material);
        const reflection = new THREE.Mesh(geometry, material.clone());
        reflection.scale.y = -1;
        reflection.material.opacity = 0.11;
        scene.add(mesh, reflection);
        return { mesh, reflection, id: 0 };
      });
      const pointer = new THREE.Vector2(),
        raycaster = new THREE.Raycaster();
      let width = 1,
        height = 1,
        frame = 0,
        visible = false,
        last = 0,
        offset = 0,
        lastSelected = data.current.selected,
        lastList = "";
      let downX: number | null = null,
        startX = 0,
        moved = false;
      const resize = () => {
        width = node.clientWidth;
        height = node.clientHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.position.z = width < 600 ? 12 : 11;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(node);
      resize();
      function draw(now: number) {
        if (disposed) return;
        const d = data.current,
          n = d.surahs.length;
        const current = Math.max(
          0,
          d.surahs.findIndex((s) => s.id === d.selected),
        );
        const list = d.surahs.map((s) => s.id).join(",");
        if (lastList !== list) {
          offset = 0;
          lastList = list;
          lastSelected = d.selected;
        }
        if (lastSelected !== d.selected) {
          const old = d.surahs.findIndex((s) => s.id === lastSelected);
          let diff = current - old;
          if (diff > n / 2) diff -= n;
          if (diff < -n / 2) diff += n;
          offset += diff;
          lastSelected = d.selected;
        }
        const dt = Math.min((now - last) / 1000, 0.1) || 0.016;
        last = now;
        offset *= Math.exp(-dt * 10);
        for (let slot = 0; slot < slots.length; slot++) {
          const relative = slot - 7,
            s = d.surahs[mod(current + relative, n)],
            item = slots[slot];
          const duplicate =
            n < 15 && (relative < -Math.floor((n - 1) / 2) || relative > Math.ceil((n - 1) / 2));
          item.mesh.visible = item.reflection.visible = !duplicate;
          if (duplicate || !s) continue;
          if (item.id !== s.id) {
            item.mesh.material.map = texture(s);
            item.reflection.material.map = item.mesh.material.map;
            item.mesh.material.needsUpdate = true;
            item.reflection.material.needsUpdate = true;
            item.id = s.id;
            item.mesh.userData.id = s.id;
          }
          const a = (relative - offset) * 0.12,
            r = 25;
          item.mesh.position.set(Math.sin(a) * r, 0.65, Math.cos(a) * r - r);
          item.mesh.rotation.y = a;
          const center = Math.max(0, 1 - Math.abs(relative - offset));
          item.mesh.position.z += center * 0.65;
          item.mesh.position.y += center * 0.12;
          item.mesh.material.opacity = Math.max(0.15, 1 - Math.abs(relative - offset) * 0.055);
          item.mesh.material.color.setScalar(0.75 + center * 0.25);
          item.reflection.position.copy(item.mesh.position);
          item.reflection.position.y = -3.58 - center * 0.12;
          item.reflection.rotation.copy(item.mesh.rotation);
        }
        renderer.render(scene, camera);
        if (visible) frame = requestAnimationFrame(draw);
      }
      const observer = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting && !document.hidden;
          if (visible) {
            cancelAnimationFrame(frame);
            last = performance.now();
            frame = requestAnimationFrame(draw);
          } else cancelAnimationFrame(frame);
        },
        { rootMargin: "180px" },
      );
      observer.observe(node);
      const visibility = () => {
        if (document.hidden) {
          visible = false;
          cancelAnimationFrame(frame);
        } else {
          const b = node.getBoundingClientRect();
          visible = b.bottom > 0 && b.top < innerHeight;
          if (visible) frame = requestAnimationFrame(draw);
        }
      };
      document.addEventListener("visibilitychange", visibility);
      const selectDelta = (delta: number) => {
        const d = data.current,
          i = d.surahs.findIndex((s) => s.id === d.selected);
        if (d.surahs.length) d.onSelect(d.surahs[mod(i + delta, d.surahs.length)].id);
      };
      const down = (e: PointerEvent) => {
        downX = e.clientX;
        startX = e.clientX;
        moved = false;
        node.setPointerCapture(e.pointerId);
      };
      const move = (e: PointerEvent) => {
        if (downX === null) return;
        if (Math.abs(e.clientX - startX) > 7) moved = true;
        const distance = e.clientX - downX;
        if (Math.abs(distance) > 54) {
          selectDelta(distance > 0 ? -1 : 1);
          downX = e.clientX;
        }
      };
      const up = (e: PointerEvent) => {
        if (downX === null) return;
        downX = null;
        if (!moved) {
          const rect = node.getBoundingClientRect();
          pointer.set(
            ((e.clientX - rect.left) / width) * 2 - 1,
            (-(e.clientY - rect.top) / height) * 2 + 1,
          );
          raycaster.setFromCamera(pointer, camera);
          const hit = raycaster.intersectObjects(
            slots.filter((s) => s.mesh.visible).map((s) => s.mesh),
          )[0];
          if (hit) data.current.onSelect(hit.object.userData.id);
        }
      };
      const cancel = () => {
        downX = null;
      };
      const wheel = (e: WheelEvent) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 10) {
          e.preventDefault();
          selectDelta(e.deltaX > 0 ? 1 : -1);
        }
      };
      node.addEventListener("pointerdown", down);
      node.addEventListener("pointermove", move);
      node.addEventListener("pointerup", up);
      node.addEventListener("pointercancel", cancel);
      node.addEventListener("wheel", wheel, { passive: false });
      const lost = (e: Event) => {
        e.preventDefault();
        setReady(false);
        visible = false;
        cancelAnimationFrame(frame);
      };
      renderer.domElement.addEventListener("webglcontextlost", lost);
      setReady(true);
      draw(performance.now());
      cleanup = () => {
        cancelAnimationFrame(frame);
        ro.disconnect();
        observer.disconnect();
        document.removeEventListener("visibilitychange", visibility);
        node.removeEventListener("pointerdown", down);
        node.removeEventListener("pointermove", move);
        node.removeEventListener("pointerup", up);
        node.removeEventListener("pointercancel", cancel);
        node.removeEventListener("wheel", wheel);
        renderer.domElement.removeEventListener("webglcontextlost", lost);
        slots.forEach((s) => {
          s.mesh.material.dispose();
          s.reflection.material.dispose();
        });
        textures.forEach((t) => t.dispose());
        geometry.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch(() => setReady(false));
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);
  return (
    <div className="carousel-component" data-ready={ready}>
      <div
        ref={host}
        className="surah-carousel-canvas"
        role="group"
        aria-label="Rotating Surah gallery. Use left and right arrow keys to select."
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            const i = surahs.findIndex((s) => s.id === selected);
            onSelect(surahs[mod(i + (e.key === "ArrowRight" ? 1 : -1), surahs.length)].id);
          }
        }}
      />
      {!ready && (
        <div className="carousel-fallback">
          {surahs
            .filter(
              (s, i) =>
                s.id === selected || Math.abs(i - surahs.findIndex((x) => x.id === selected)) <= 2,
            )
            .map((s) => (
              <button key={s.id} aria-pressed={s.id === selected} onClick={() => onSelect(s.id)}>
                <small>{String(s.number).padStart(3, "0")}</small>
                <span lang="ar" dir="rtl">
                  {s.arabic_name}
                </span>
                <strong>{s.name}</strong>
                <small>
                  {s.revelation_type} · {s.ayah_count} Ayahs
                </small>
              </button>
            ))}
        </div>
      )}
      <label className="accessible-surah-select">
        Jump to Surah
        <select value={selected} onChange={(e) => onSelect(+e.target.value)}>
          {surahs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.number}. {s.name} — {s.revelation_type}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
