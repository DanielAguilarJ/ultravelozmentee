#!/usr/bin/env python3
"""
optimize_media.py — Compresión/optimización de imágenes y vídeo para
ultravelozmentee.

Uso:
    python3 scripts/optimize_media.py image <input> <output.webp> [--max-width 1600] [--quality 82]
    python3 scripts/optimize_media.py video <input> <output.mp4> [--crf 28] [--max-width 1280]
    python3 scripts/optimize_media.py bgvideo <input> <output.mp4> [--crf 32] [--max-width 1280]

Reglas de calidad aplicadas:
- Imágenes: se re-encodan a WebP (mejor ratio compresión/calidad que JPG/PNG
  para foto realista), con redimensionado a un ancho máximo razonable para web
  (evita subir un archivo de 4000px cuando el contenedor CSS mide 800px).
- Vídeo (`video`): H.264 MP4 con audio, para contenido que se ve y se oye.
- Vídeo de fondo (`bgvideo`): H.264 MP4 SIN audio y muy comprimido, para capas
  decorativas detrás de filtros CSS. Genera además un póster (primer frame),
  necesario para el hueco mientras carga y para `prefers-reduced-motion`.
"""
import argparse
import subprocess
import sys
from pathlib import Path

from PIL import Image


def optimize_image(src: Path, dst: Path, max_width: int, quality: int) -> None:
    img = Image.open(src)
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        img = img.convert("RGBA")
    else:
        img = img.convert("RGB")

    if img.width > max_width:
        ratio = max_width / img.width
        new_size = (max_width, round(img.height * ratio))
        img = img.resize(new_size, Image.LANCZOS)

    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, "WEBP", quality=quality, method=6)

    before = src.stat().st_size
    after = dst.stat().st_size
    pct = (1 - after / before) * 100 if before else 0
    print(f"[image] {src.name} ({before/1024:.0f} KB) -> {dst.name} "
          f"({after/1024:.0f} KB, -{pct:.0f}%) [{img.width}x{img.height}]")


def optimize_video(src: Path, dst: Path, max_width: int, crf: int) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    vf = f"scale='min({max_width},iw)':-2"
    cmd = [
        "ffmpeg", "-y", "-i", str(src),
        "-vf", vf,
        "-c:v", "libx264", "-preset", "slow", "-crf", str(crf),
        "-c:a", "aac", "-b:a", "96k",
        "-movflags", "+faststart",
        str(dst),
    ]
    subprocess.run(cmd, check=True, capture_output=True)

    poster = dst.with_suffix(".jpg")
    subprocess.run([
        "ffmpeg", "-y", "-i", str(src), "-ss", "00:00:00.5",
        "-frames:v", "1", "-vf", f"scale='min({max_width},iw)':-2",
        str(poster),
    ], check=True, capture_output=True)

    before = src.stat().st_size
    after = dst.stat().st_size
    pct = (1 - after / before) * 100 if before else 0
    print(f"[video] {src.name} ({before/1024/1024:.1f} MB) -> {dst.name} "
          f"({after/1024/1024:.1f} MB, -{pct:.0f}%) + poster {poster.name}")


def optimize_bgvideo(src: Path, dst: Path, max_width: int, crf: int,
                     poster_at: str, webp_poster: bool,
                     crop: str | None = None) -> None:
    """Perfil para vídeo decorativo de fondo (banda con parallax).

    Se optimiza para peso, no para fidelidad: es una capa atmosférica que
    va detrás de un filtro CSS (grayscale/brightness) y un gradiente, así
    que el detalle fino no se percibe y sí se nota cada KB descargado.

    - Sin pista de audio (`-an`): un fondo decorativo nunca debe sonar,
      y además los navegadores solo permiten autoplay si va en silencio.
    - `-movflags +faststart`: mueve el índice al principio para que el
      vídeo empiece a pintar antes de terminar de descargarse.
    - `-pix_fmt yuv420p`: perfil de máxima compatibilidad (Safari iOS).
    - `crop` recorta ANTES de escalar, para no gastar bits en píxeles que
      el contenedor CSS nunca va a mostrar. Formato ffmpeg: w:h:x:y.
    - Se genera un póster para que el hueco no quede vacío mientras
      carga y para servir a quien tenga `prefers-reduced-motion`.
    """
    dst.parent.mkdir(parents=True, exist_ok=True)
    chain = []
    if crop:
        chain.append(f"crop={crop}")
    chain.append(f"scale='min({max_width},iw)':-2")
    vf = ",".join(chain)

    subprocess.run([
        "ffmpeg", "-y", "-i", str(src),
        "-an",
        "-vf", vf,
        "-c:v", "libx264", "-profile:v", "main", "-level", "4.0",
        "-preset", "veryslow", "-crf", str(crf),
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(dst),
    ], check=True, capture_output=True)

    poster = dst.with_suffix(".webp" if webp_poster else ".jpg")
    if webp_poster:
        # ffmpeg + libwebp es quisquilloso con los flags de calidad según la
        # build, así que se extrae el frame a PNG temporal y lo convierte
        # Pillow, que ya se usa para el resto de las imágenes del sitio.
        tmp_frame = dst.with_name(dst.stem + "-frame.png")
        subprocess.run([
            "ffmpeg", "-y", "-ss", poster_at, "-i", str(src),
            "-frames:v", "1", "-vf", vf, str(tmp_frame),
        ], check=True, capture_output=True)
        Image.open(tmp_frame).convert("RGB").save(
            poster, "WEBP", quality=80, method=6
        )
        tmp_frame.unlink()
    else:
        subprocess.run([
            "ffmpeg", "-y", "-ss", poster_at, "-i", str(src),
            "-frames:v", "1", "-vf", vf, "-q:v", "4", str(poster),
        ], check=True, capture_output=True)

    before = src.stat().st_size
    after = dst.stat().st_size
    pct = (1 - after / before) * 100 if before else 0
    print(f"[bgvideo] {src.name} ({before/1024/1024:.1f} MB) -> {dst.name} "
          f"({after/1024:.0f} KB, -{pct:.0f}%) + póster {poster.name} "
          f"({poster.stat().st_size/1024:.0f} KB)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="mode", required=True)

    p_img = sub.add_parser("image")
    p_img.add_argument("src", type=Path)
    p_img.add_argument("dst", type=Path)
    p_img.add_argument("--max-width", type=int, default=1600)
    p_img.add_argument("--quality", type=int, default=82)

    p_vid = sub.add_parser("video")
    p_vid.add_argument("src", type=Path)
    p_vid.add_argument("dst", type=Path)
    p_vid.add_argument("--max-width", type=int, default=1280)
    p_vid.add_argument("--crf", type=int, default=28)

    p_bg = sub.add_parser(
        "bgvideo",
        help="Vídeo decorativo de fondo: sin audio, muy comprimido, con póster.",
    )
    p_bg.add_argument("src", type=Path)
    p_bg.add_argument("dst", type=Path)
    p_bg.add_argument("--max-width", type=int, default=1280)
    p_bg.add_argument("--crf", type=int, default=32)
    p_bg.add_argument("--poster-at", default="00:00:01",
                     help="Momento del que se extrae el póster (hh:mm:ss).")
    p_bg.add_argument("--jpg-poster", action="store_true",
                     help="Póster en JPEG en vez de WebP.")
    p_bg.add_argument("--crop", default=None,
                     help="Recorte previo al escalado, formato ffmpeg w:h:x:y "
                          "(p. ej. 720:720:280:0 para un cuadrado centrado).")

    args = parser.parse_args()

    if not args.src.exists():
        print(f"ERROR: no existe {args.src}", file=sys.stderr)
        sys.exit(1)

    if args.mode == "image":
        optimize_image(args.src, args.dst, args.max_width, args.quality)
    elif args.mode == "bgvideo":
        optimize_bgvideo(args.src, args.dst, args.max_width, args.crf,
                         args.poster_at, not args.jpg_poster, args.crop)
    else:
        optimize_video(args.src, args.dst, args.max_width, args.crf)


if __name__ == "__main__":
    main()
