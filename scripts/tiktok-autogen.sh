#!/bin/zsh
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

REPO="/Users/ladmin/watchthisapp"
cd "$REPO" || exit 1

command -v ffmpeg >/dev/null || { echo "ffmpeg missing"; exit 1; }

# Ensure Playwright exists
if ! node -e "require('playwright')" >/dev/null 2>&1; then
  npm i -D playwright >/dev/null 2>&1
  npx playwright install chromium >/dev/null 2>&1
fi

DATE="$(date +%F)"
OUT_DIR="$REPO/growth/videos/$DATE"
TMP_DIR="$OUT_DIR/.tmp"
mkdir -p "$OUT_DIR" "$TMP_DIR"

# pick top 3 most recently changed slugs from latest commit; fallback to fixed slugs
SLUGS=($(git show --name-only --pretty="" HEAD | rg '^data/recommendations/.+\.json$' | sed 's#data/recommendations/##; s#\.json$##' | head -n 3))
if [[ ${#SLUGS[@]} -eq 0 ]]; then
  SLUGS=("wuthering-heights" "interstellar" "dune")
fi

for SLUG in "${SLUGS[@]}"; do
  MOVIE="${SLUG//-/ }"
  WORK="$TMP_DIR/$SLUG"
  mkdir -p "$WORK"

  # Capture 3 vertical screenshots at different scroll positions
  node - <<JS
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto("https://movieslike.app/movies-like/${SLUG}", { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "${WORK}/s1.png", fullPage: false });
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(700);
  await page.screenshot({ path: "${WORK}/s2.png", fullPage: false });
  await page.mouse.wheel(0, 1000);
  await page.waitForTimeout(700);
  await page.screenshot({ path: "${WORK}/s3.png", fullPage: false });
  await browser.close();
})();
JS

  # Voiceover
  say -v Samantha "If you liked ${MOVIE}, here are better picks from MoviesLike. Search ${MOVIE} movieslike." -o "$WORK/voice.aiff"

  # Render 30s vertical video (3 x 10s)
  ffmpeg -y \
    -loop 1 -t 10 -i "$WORK/s1.png" \
    -loop 1 -t 10 -i "$WORK/s2.png" \
    -loop 1 -t 10 -i "$WORK/s3.png" \
    -i "$WORK/voice.aiff" \
    -filter_complex "\
[0:v]scale=1080:1920,format=yuv420p[v0];\
[1:v]scale=1080:1920,format=yuv420p[v1];\
[2:v]scale=1080:1920,format=yuv420p[v2];\
[v0][v1][v2]concat=n=3:v=1:a=0[v]" \
    -map "[v]" -map 3:a \
    -c:v libx264 -pix_fmt yuv420p -r 30 -shortest \
    "$OUT_DIR/${SLUG}.mp4" >/dev/null 2>&1

done

# Captions file
{
  echo "# TikTok Captions ($DATE)"
  for SLUG in "${SLUGS[@]}"; do
    MOVIE="${SLUG//-/ }"
    echo
    echo "## $SLUG.mp4"
    echo "If you liked ${MOVIE}, try these picks on MoviesLike. #movietok #movies #film #recommendations"
  done
} > "$OUT_DIR/captions.md"

echo "Done. Videos in: $OUT_DIR"
ls -1 "$OUT_DIR" | rg '\.mp4$|captions\.md'
