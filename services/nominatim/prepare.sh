#!/usr/bin/env bash
set -euo pipefail

# Porto Alegre bounding box: west,south,east,north
BBOX="-51.32,-30.27,-51.04,-29.95"
SUL_URL="https://download.geofabrik.de/south-america/brazil/sul-latest.osm.pbf"
SUL_PBF="/tmp/sul-latest.osm.pbf"
OUTPUT="$(dirname "$0")/porto-alegre.osm.pbf"

if [ -f "$OUTPUT" ]; then
  echo "porto-alegre.osm.pbf already exists. Replacing..."

fi

echo "Downloading Sul region PBF (~395MB)..."
curl -L --progress-bar -o "$SUL_PBF" "$SUL_URL"

echo "Extracting Porto Alegre (bbox: $BBOX)..."
osmium extract --bbox "$BBOX" --output "$OUTPUT" --overwrite "$SUL_PBF"

echo "Cleaning up Sul PBF..."
rm -f "$SUL_PBF"

echo "Done: $OUTPUT ($(du -sh "$OUTPUT" | cut -f1))"
