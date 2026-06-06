#!/usr/bin/env python3
import argparse
import subprocess
from pathlib import Path


IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".heic"}
VIDEO_EXTS = {".mov", ".mp4", ".m4v", ".avi", ".webm"}


def run(cmd):
    print(" ".join(str(part) for part in cmd))
    subprocess.run(cmd, check=True)


def is_relative_to(path, parent):
    try:
        path.relative_to(parent)
        return True
    except ValueError:
        return False


def rel_out(src, in_dir, out_dir, suffix, ext):
    rel = src.relative_to(in_dir).with_suffix("")
    dest = out_dir / rel.parent / f"{rel.name}{suffix}{ext}"
    dest.parent.mkdir(parents=True, exist_ok=True)
    return dest


def compress_image(src, in_dir, out_dir, width, quality):
    dest = rel_out(src, in_dir, out_dir, "", ".webp")
    if dest.exists() and dest.stat().st_mtime >= src.stat().st_mtime:
        return

    vf = f"scale='min({width},iw)':-2:flags=lanczos"
    run(["ffmpeg", "-y", "-i", src, "-vf", vf, "-quality", str(quality), dest])


def compress_video(src, in_dir, out_dir, width, crf, make_webm):
    mp4 = rel_out(src, in_dir, out_dir, "", ".mp4")
    poster = rel_out(src, in_dir, out_dir, "-poster", ".webp")

    if not mp4.exists() or mp4.stat().st_mtime < src.stat().st_mtime:
        vf = f"scale='min({width},iw)':-2:flags=lanczos"
        run(
            [
                "ffmpeg",
                "-y",
                "-i",
                src,
                "-vf",
                vf,
                "-c:v",
                "libx264",
                "-preset",
                "slow",
                "-crf",
                str(crf),
                "-pix_fmt",
                "yuv420p",
                "-movflags",
                "+faststart",
                "-an",
                mp4,
            ]
        )

    if not poster.exists() or poster.stat().st_mtime < src.stat().st_mtime:
        run(
            [
                "ffmpeg",
                "-y",
                "-ss",
                "0.1",
                "-i",
                src,
                "-frames:v",
                "1",
                "-vf",
                f"scale='min({width},iw)':-2:flags=lanczos",
                "-quality",
                "75",
                poster,
            ]
        )

    if make_webm:
        webm = rel_out(src, in_dir, out_dir, "", ".webm")
        if not webm.exists() or webm.stat().st_mtime < src.stat().st_mtime:
            run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    src,
                    "-vf",
                    f"scale='min({width},iw)':-2:flags=lanczos",
                    "-c:v",
                    "libvpx-vp9",
                    "-b:v",
                    "0",
                    "-crf",
                    "34",
                    "-an",
                    webm,
                ]
            )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input_dir", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--image-width", type=int, default=1600)
    parser.add_argument("--video-width", type=int, default=1280)
    parser.add_argument("--image-quality", type=int, default=78)
    parser.add_argument("--video-crf", type=int, default=28)
    parser.add_argument("--webm", action="store_true")
    args = parser.parse_args()

    input_dir = args.input_dir.resolve()
    output_dir = args.output_dir.resolve()

    for src in input_dir.rglob("*"):
        src = src.resolve()
        if not src.is_file() or is_relative_to(src, output_dir):
            continue

        ext = src.suffix.lower()
        if ext in IMAGE_EXTS:
            compress_image(src, input_dir, output_dir, args.image_width, args.image_quality)
        elif ext in VIDEO_EXTS:
            compress_video(src, input_dir, output_dir, args.video_width, args.video_crf, args.webm)


if __name__ == "__main__":
    main()
