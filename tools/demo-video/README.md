# Build the demo video

This package records a reproducible browser workflow with Playwright and edits it with Remotion. It is isolated from the main application package and uses synthetic data in a dedicated PGlite database.

Run every command from the repository root.

## Install the tools

Install the package dependencies and Chromium once:

```bash
pnpm --dir tools/demo-video install --ignore-workspace
pnpm --dir tools/demo-video install-browser
```

## Prepare the demo environment

Reset and seed the isolated demo database:

```bash
pnpm --dir tools/demo-video reset-data
```

Start the application on a dedicated port with that database:

```bash
PORT=3100 PGLITE_DATA_DIR=.data/demo-video pnpm dev
```

This leaves the default `.data/pglite` database and the usual development port untouched.

## Verify the browser workflow

Run the deterministic smoke test:

```bash
DEMO_URL=http://localhost:3100 pnpm --dir tools/demo-video smoke
```

The smoke test executes the complete workflow without recording. It mocks geocoding and routing boundaries, while authentication, patient registration, alerts, and plan persistence use the real application and isolated database.

## Review the headed preview

Run the complete workflow in a visible 1920×1080 browser:

```bash
DEMO_URL=http://localhost:3100 pnpm --dir tools/demo-video preview
```

Preview mode does not create or modify video artifacts. It uses the application's live Nominatim, OSRM, and OpenStreetMap integrations, so network access is required.

Use shorter holds for a quick review:

```bash
DEMO_URL=http://localhost:3100 \
  DEMO_ACTION_DELAY_MS=0 \
  DEMO_PATIENT_DETAIL_HOLD_MS=1000 \
  DEMO_FINAL_HOLD_MS=1000 \
  pnpm --dir tools/demo-video preview
```

Do not capture or edit the video until the complete headed workflow has been reviewed and explicitly approved.

## Capture the approved workflow

Record the real application flow:

```bash
DEMO_URL=http://localhost:3100 pnpm --dir tools/demo-video record
```

Playwright writes the browser recording to `tools/demo-video/public/capture.webm`. The same run also writes:

- `tools/demo-video/artifacts/capture-events.json`, containing generic stages and pointer timing;
- `tools/demo-video/src/captureTimeline.generated.ts`, containing only the pointer fields consumed by Remotion.

Playwright video does not reliably include the system cursor. The composition reconstructs it from the captured coordinates and timestamps, including click feedback.

Running `record` without `DEMO_URL` records only the minimal synthetic fixture used to validate the capture setup.

## Review and render the composition

Open Remotion Studio:

```bash
pnpm --dir tools/demo-video studio
```

Review the pacing, framing, cursor synchronization, zooms, and text before rendering. The detailed pregnancy form is the only section shown at 2× speed; the source-to-output time map keeps the cursor and editorial events synchronized.

Render the final MP4:

```bash
pnpm --dir tools/demo-video render
```

The output is written to:

```text
tools/demo-video/output/demo.mp4
```

The current composition is 1920×1080 at 30 fps and has no audio stream.

## Run final checks

Type-check the demo package:

```bash
pnpm --dir tools/demo-video type-check
```

Inspect the encoded video:

```bash
ffprobe -v error \
  -show_entries format=duration,size \
  -show_entries stream=codec_name,codec_type,width,height,avg_frame_rate \
  -of json \
  tools/demo-video/output/demo.mp4
```

Confirm that generated artifacts remain ignored:

```bash
git check-ignore \
  tools/demo-video/public/capture.webm \
  tools/demo-video/output/demo.mp4 \
  tools/demo-video/artifacts/capture-events.json
```

## Source layout

| Path | Purpose |
|---|---|
| `src/demoFlow.ts` | Shared browser workflow used by smoke, preview, and capture |
| `src/scenario.ts` | Synthetic scenario and viewport configuration |
| `src/smoke.ts` | Deterministic end-to-end verification |
| `src/preview.ts` | Headed review without recording |
| `src/record.ts` | Browser capture and pointer-event generation |
| `src/captureTimeline.generated.ts` | Typed pointer timeline consumed by Remotion |
| `src/timeline.ts` | Editorial timing, speed mapping, cards, and zooms |
| `src/DemoVideo.tsx` | Remotion composition |

## Generated artifacts

These paths are intentionally ignored by Git:

```text
tools/demo-video/artifacts/
tools/demo-video/output/
tools/demo-video/public/capture.webm
```

## Known limitations

- At smaller viewport sizes, the sidebar footer can cover the last rows in the priority list. The demo uses 1920×1080 to avoid this issue.
- Abruptly terminating the application can leave the persistent PGlite directory inconsistent. Use the dedicated port and `.data/demo-video` database, and stop the owned server process normally. If the synthetic demo database no longer opens, run `pnpm --dir tools/demo-video reset-data`.
- Preview and capture depend on live Nominatim, OSRM, and OpenStreetMap responses. The deterministic smoke test remains available when those services are unavailable.
