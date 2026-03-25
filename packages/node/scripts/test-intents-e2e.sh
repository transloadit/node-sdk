#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
WORKDIR="${1:-/tmp/node-sdk-intent-e2e}"
OUTDIR="$WORKDIR/out"
LOGDIR="$WORKDIR/logs"
FIXTUREDIR="$WORKDIR/fixtures"
CLI=(node "$REPO_ROOT/packages/node/src/cli.ts")
PREVIEW_URL='https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'

if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$REPO_ROOT/.env"
  set +a
fi

if [[ -z "${TRANSLOADIT_KEY:-}" || -z "${TRANSLOADIT_SECRET:-}" ]]; then
  echo "Missing TRANSLOADIT_KEY / TRANSLOADIT_SECRET. Expected them in $REPO_ROOT/.env or the environment." >&2
  exit 1
fi

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
}

prepare_fixtures() {
  require_command curl
  require_command ffmpeg
  require_command zip

  rm -rf "$WORKDIR"
  mkdir -p "$OUTDIR" "$LOGDIR" "$FIXTUREDIR"

  cp "$REPO_ROOT/packages/node/examples/fixtures/berkley.jpg" "$FIXTUREDIR/input.jpg"
  cp "$REPO_ROOT/packages/node/test/e2e/fixtures/testsrc.mp4" "$FIXTUREDIR/input.mp4"
  printf 'Hello from Transloadit CLI intents\n' >"$FIXTUREDIR/input.txt"
  zip -j "$FIXTUREDIR/input.zip" "$FIXTUREDIR/input.txt" >/dev/null
  ffmpeg -f lavfi -i sine=frequency=1000:duration=1 -q:a 9 -acodec libmp3lame -y "$FIXTUREDIR/input.mp3" >/dev/null 2>&1
  curl -L --fail --silent --show-error -o "$FIXTUREDIR/input.pdf" "$PREVIEW_URL"
}

verify_file_type() {
  local path="$1"
  local expected="$2"

  [[ -s "$path" ]] || return 1
  file "$path" | grep -F "$expected" >/dev/null
}

verify_png() {
  verify_file_type "$1" 'PNG image data'
}

verify_jpeg() {
  verify_file_type "$1" 'JPEG image data'
}

verify_pdf() {
  verify_file_type "$1" 'PDF document'
}

verify_mp3() {
  verify_file_type "$1" 'Audio file'
}

verify_zip() {
  verify_file_type "$1" 'Zip archive data'
}

verify_document_thumbs() {
  [[ -f "$1/in.png" ]] || return 1
  verify_png "$1/in.png"
}

verify_video_thumbs() {
  [[ -f "$1/in_0.jpg" ]] || return 1
  verify_jpeg "$1/in_0.jpg"
}

verify_video_encode_hls() {
  [[ -f "$1/high/in.mp4" ]] || return 1
  [[ -f "$1/low/in.mp4" ]] || return 1
  [[ -f "$1/mid/in.mp4" ]] || return 1
  [[ -f "$1/adaptive/my_playlist.m3u8" ]] || return 1
}

verify_file_decompress() {
  [[ -f "$1/input.txt" ]] || return 1
  grep -F 'Hello from Transloadit CLI intents' "$1/input.txt" >/dev/null
}

run_case() {
  local name="$1"
  local output_path="$2"
  local verifier="$3"
  shift 3

  local logfile="$LOGDIR/${name}.log"
  rm -rf "$output_path"
  mkdir -p "$(dirname "$output_path")"

  set +e
  "${CLI[@]}" "$@" >"$logfile" 2>&1
  local exit_code=$?
  set -e

  local verdict='FAIL'
  local detail=''

  if [[ $exit_code -eq 0 ]] && "$verifier" "$output_path"; then
    verdict='OK'
    if [[ -f "$output_path" ]]; then
      detail="$(file "$output_path" | sed 's#^.*: ##' | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g')"
    else
      detail="$(find "$output_path" -type f | sed "s#^$output_path/##" | sort | tr '\n' ',' | sed 's/,$//')"
    fi
  else
    if [[ -s "$logfile" ]]; then
      detail="$(tail -n 8 "$logfile" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g' | cut -c1-220)"
    else
      detail='No output captured'
    fi
  fi

  printf '%s\t%s\t%s\t%s\n' "$name" "$exit_code" "$verdict" "$detail"
}

prepare_fixtures

RESULTS_TSV="$WORKDIR/results.tsv"
printf 'command\texit\tverdict\tdetail\n' >"$RESULTS_TSV"

run_case image-generate "$OUTDIR/image-generate.png" verify_png \
  image generate \
  --prompt 'A small red bicycle on a cream background, studio lighting' \
  --model 'google/nano-banana' \
  --out "$OUTDIR/image-generate.png" \
  >>"$RESULTS_TSV"

run_case preview-generate "$OUTDIR/preview-generate.png" verify_png \
  preview generate \
  --input "$PREVIEW_URL" \
  --width 300 \
  --out "$OUTDIR/preview-generate.png" \
  >>"$RESULTS_TSV"

run_case image-remove-background "$OUTDIR/image-remove-background.png" verify_png \
  image remove-background \
  --input "$FIXTUREDIR/input.jpg" \
  --out "$OUTDIR/image-remove-background.png" \
  >>"$RESULTS_TSV"

run_case image-optimize "$OUTDIR/image-optimize.jpg" verify_jpeg \
  image optimize \
  --input "$FIXTUREDIR/input.jpg" \
  --out "$OUTDIR/image-optimize.jpg" \
  >>"$RESULTS_TSV"

run_case image-resize "$OUTDIR/image-resize.jpg" verify_jpeg \
  image resize \
  --input "$FIXTUREDIR/input.jpg" \
  --width 200 \
  --out "$OUTDIR/image-resize.jpg" \
  >>"$RESULTS_TSV"

run_case document-convert "$OUTDIR/document-convert.pdf" verify_pdf \
  document convert \
  --input "$FIXTUREDIR/input.txt" \
  --format pdf \
  --out "$OUTDIR/document-convert.pdf" \
  >>"$RESULTS_TSV"

run_case document-optimize "$OUTDIR/document-optimize.pdf" verify_pdf \
  document optimize \
  --input "$FIXTUREDIR/input.pdf" \
  --out "$OUTDIR/document-optimize.pdf" \
  >>"$RESULTS_TSV"

run_case document-auto-rotate "$OUTDIR/document-auto-rotate.pdf" verify_pdf \
  document auto-rotate \
  --input "$FIXTUREDIR/input.pdf" \
  --out "$OUTDIR/document-auto-rotate.pdf" \
  >>"$RESULTS_TSV"

run_case document-thumbs "$OUTDIR/document-thumbs" verify_document_thumbs \
  document thumbs \
  --input "$FIXTUREDIR/input.pdf" \
  --out "$OUTDIR/document-thumbs" \
  >>"$RESULTS_TSV"

run_case audio-waveform "$OUTDIR/audio-waveform.png" verify_png \
  audio waveform \
  --input "$FIXTUREDIR/input.mp3" \
  --out "$OUTDIR/audio-waveform.png" \
  >>"$RESULTS_TSV"

run_case text-speak "$OUTDIR/text-speak.mp3" verify_mp3 \
  text speak \
  --prompt 'Hello from the Transloadit Node CLI intents test.' \
  --provider aws \
  --out "$OUTDIR/text-speak.mp3" \
  >>"$RESULTS_TSV"

run_case video-thumbs "$OUTDIR/video-thumbs" verify_video_thumbs \
  video thumbs \
  --input "$FIXTUREDIR/input.mp4" \
  --out "$OUTDIR/video-thumbs" \
  >>"$RESULTS_TSV"

run_case video-encode-hls "$OUTDIR/video-encode-hls" verify_video_encode_hls \
  video encode-hls \
  --input "$FIXTUREDIR/input.mp4" \
  --out "$OUTDIR/video-encode-hls" \
  >>"$RESULTS_TSV"

run_case file-compress "$OUTDIR/file-compress.zip" verify_zip \
  file compress \
  --input "$FIXTUREDIR/input.txt" \
  --format zip \
  --out "$OUTDIR/file-compress.zip" \
  >>"$RESULTS_TSV"

run_case file-decompress "$OUTDIR/file-decompress" verify_file_decompress \
  file decompress \
  --input "$FIXTUREDIR/input.zip" \
  --out "$OUTDIR/file-decompress" \
  >>"$RESULTS_TSV"

column -t -s $'\t' "$RESULTS_TSV"

if awk -F '\t' 'NR > 1 && $3 != "OK" { exit 1 }' "$RESULTS_TSV"; then
  echo
  echo "All intent commands passed. Fixtures, outputs, and logs are in $WORKDIR"
else
  echo
  echo "One or more intent commands failed. Inspect $LOGDIR for details." >&2
  exit 1
fi
