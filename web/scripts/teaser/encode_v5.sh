#!/usr/bin/env bash
# Encode les 4 plans PNG → MP4 H.264 CRF 18, framerate auto.
set -eo pipefail

SRC=/tmp/photo-folio-rushes-v5
OUT=$SRC/mp4
mkdir -p "$OUT"

duration_for() {
  case "$1" in
    home) echo 4.5 ;;
    entrailles) echo 8.7 ;;
    dans-la-rue) echo 8.5 ;;
    fiat-lux) echo 8.5 ;;
  esac
}

for plan in home entrailles dans-la-rue fiat-lux; do
  dir="$SRC/frames-$plan"
  n=$(ls "$dir"/*.png 2>/dev/null | wc -l | tr -d ' ')
  if [ "$n" -eq 0 ]; then
    echo "SKIP $plan (0 frames)"
    continue
  fi
  dur=$(duration_for "$plan")
  fps=$(python3 -c "print(round($n / $dur, 3))")
  echo "→ $plan : $n frames / ${dur}s = ${fps} fps"
  ffmpeg -y -loglevel error \
    -framerate "$fps" -i "$dir/frame-%05d.png" \
    -c:v libx264 -preset slow -crf 18 \
    -pix_fmt yuv420p \
    -sws_flags lanczos+accurate_rnd+full_chroma_int \
    -r 30 \
    -movflags +faststart \
    "$OUT/$plan-v5.mp4"
done

echo
echo "Sortie :"
ls -la "$OUT"/
