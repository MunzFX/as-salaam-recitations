"""Join the existing Higgsfield films into six moving, seam-matched chapters.

No generation or network calls. Install pillow/imageio-ffmpeg or set
AS_SALAAM_FFMPEG to an existing ffmpeg binary. Outputs are reproducible.
"""
import io
import json
import os
from pathlib import Path
import shutil
import subprocess

from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "design/source"
OUTPUT = ROOT / "app/public/assets/world"
WORK = ROOT / ".tooling/continuous-journey"
WORK.mkdir(parents=True, exist_ok=True)
FFMPEG = os.environ.get("AS_SALAAM_FFMPEG") or shutil.which("ffmpeg")
if not FFMPEG:
    import imageio_ffmpeg
    FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

FPS = 24
# The normalized dissolve produces 551 frames. Cuts land on even keyframes.
# Copy the same encoded boundary frame into adjacent files, avoiding jumps.
BOUNDARIES = [0, 108, 216, 324, 432, 492, 550]


def ff(*args, capture=False):
    return subprocess.run(
        [FFMPEG, "-hide_banner", "-loglevel", "error", "-y", *map(str, args)],
        check=True, stdout=subprocess.PIPE if capture else None,
    ).stdout


master = WORK / "continuous-master-hq.mp4"
if not master.exists() or master.stat().st_size < 1024:
    inputs = []
    filters = []
    for i in range(5):
        inputs += ["-i", SOURCE / f"transition-{i + 1:02}.mp4"]
        filters.append(
            f"[{i}:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,trim=end=5,"
            f"setpts=PTS-STARTPTS,format=yuv420p,fps={FPS}[v{i}]"
        )
    previous = "v0"
    for i in range(1, 5):
        filters.append(
            f"[{previous}][v{i}]xfade=transition=fade:duration=0.5:"
            f"offset={4.5 * i},fps={FPS}[mix{i}]"
        )
        previous = f"mix{i}"
    ff(*inputs, "-filter_complex_threads", 2, "-filter_complex", ";".join(filters),
       "-map", f"[{previous}]", "-an", "-r", FPS, "-fps_mode", "cfr",
       "-c:v", "libx264", "-preset", "ultrafast", "-crf", 0,
       "-pix_fmt", "yuv420p", master)


def decoded_frame(path, last=False):
    data = ff("-i", path, "-vf", "reverse" if last else "null",
              "-frames:v", 1, "-f", "image2pipe", "-vcodec", "png", "pipe:1", capture=True)
    return Image.open(io.BytesIO(data)).convert("RGB")


variants = [("", "null", 21, 6), ("-mobile", "scale=-2:1280,crop=720:1280", 20, 4)]
for suffix, framing, crf, gop in variants:
    encoded = WORK / f"continuous-hq{suffix}.mp4"
    if os.environ.get("AS_SALAAM_REUSE_ENCODED") != "1":
        ff("-i", master, "-an", "-vf", f"{framing},setpts=N/({FPS}*TB)",
           "-r", FPS, "-fps_mode", "cfr", "-c:v", "libx264", "-preset", "fast",
           "-crf", crf, "-g", gop, "-keyint_min", gop, "-bf", 0,
           "-sc_threshold", 0, "-pix_fmt", "yuv420p", "-movflags", "+faststart", encoded)

report = {"source": "Five existing Higgsfield clips; no new generation",
          "fps": FPS, "master_frames": 551, "desktop_resolution": [1920,1080],
          "mobile_resolution": [720,1280],
          "quality_priority": "User requested full video quality over the previous bandwidth reduction",
          "seams": [], "chapters": []}
for index, (start, end) in enumerate(zip(BOUNDARIES, BOUNDARIES[1:]), 1):
    chapter = {"chapter": index, "start_frame": start, "end_frame": end,
               "scroll": (end - start) / 48 + (1 if index == 6 else 0)}
    for suffix, framing, crf, gop in variants:
        target = OUTPUT / f"journey-hq-{index:02}{suffix}.mp4"
        ff("-ss", start / FPS, "-i", WORK / f"continuous-hq{suffix}.mp4",
           "-t", (end - start + 1) / FPS, "-an", "-c:v", "copy",
           "-avoid_negative_ts", "make_zero", "-movflags", "+faststart", target)
        first = decoded_frame(target)
        poster = target.with_name(target.stem + "-poster.webp")
        first.save(poster, lossless=True, method=6)
        assert ImageChops.difference(first, Image.open(poster).convert("RGB")).getbbox() is None
        if index > 1:
            previous = OUTPUT / f"journey-hq-{index - 1:02}{suffix}.mp4"
            difference = ImageStat.Stat(ImageChops.difference(decoded_frame(previous, last=True), first))
            error = sum(difference.mean) / 3
            assert error == 0, (index, suffix, error)
            report["seams"].append({"chapter": index, "variant": suffix or "desktop",
                                    "mean_rgb_difference": round(error, 4)})
        chapter["mobile_bytes" if suffix else "desktop_bytes"] = target.stat().st_size
        assert target.stat().st_size < 25 * 1024**2, "Cloudflare static asset size limit"
    report["chapters"].append(chapter)
    print(f"Prepared continuous chapter {index}", flush=True)

for variant, budget in [("desktop", 96 * 1024**2), ("mobile", 48 * 1024**2)]:
    total = sum(chapter[f"{variant}_bytes"] for chapter in report["chapters"])
    assert total <= budget, (variant, total, budget)
    report[f"{variant}_video_bytes"] = total
(ROOT / "design/continuous-journey-checks.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
