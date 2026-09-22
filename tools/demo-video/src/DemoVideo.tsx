import {Video} from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  capturedPointerEvents,
  type CapturedPointerEvent,
} from "./captureTimeline.generated";
import {
  captureDurationInFrames,
  demoTimeline,
  outroDurationInFrames,
  pregnancySpeedup,
  sourceFrameToOutputFrame,
  type CardEvent,
  type FocusEvent,
} from "./timeline";

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const pointerMoves = capturedPointerEvents
  .filter((event): event is CapturedPointerEvent => event.type === "move")
  .map((event) => ({
    ...event,
    atFrame: sourceFrameToOutputFrame(event.atFrame),
    durationInFrames: Math.max(
      1,
      sourceFrameToOutputFrame(event.atFrame + event.durationInFrames) -
        sourceFrameToOutputFrame(event.atFrame),
    ),
  }));
const pointerClicks = capturedPointerEvents
  .filter((event): event is CapturedPointerEvent => event.type === "click")
  .map((event) => ({...event, atFrame: sourceFrameToOutputFrame(event.atFrame)}));

const isActive = (
  frame: number,
  event: FocusEvent | CardEvent,
): boolean => frame >= event.startFrame && frame < event.startFrame + event.durationInFrames;

function activePointerMove(frame: number): number {
  let index = -1;
  for (let candidate = 0; candidate < pointerMoves.length; candidate++) {
    if ((pointerMoves[candidate]?.atFrame ?? Number.POSITIVE_INFINITY) > frame) break;
    index = candidate;
  }
  return index;
}

const PointerOverlay = () => {
  const frame = useCurrentFrame();
  const moveIndex = activePointerMove(frame);
  if (moveIndex < 0) return null;

  const move = pointerMoves[moveIndex];
  if (!move) return null;
  const previous = pointerMoves[moveIndex - 1];
  const fromX = previous?.x ?? 40;
  const fromY = previous?.y ?? 1030;
  const progress = interpolate(
    frame,
    [move.atFrame, move.atFrame + Math.max(1, move.durationInFrames)],
    [0, 1],
    {...clamp, easing: Easing.bezier(0.4, 0, 0.2, 1)},
  );
  const x = interpolate(progress, [0, 1], [fromX, move.x], clamp);
  const y = interpolate(progress, [0, 1], [fromY, move.y], clamp);
  const click = pointerClicks.find(
    (event) => frame >= event.atFrame && frame < event.atFrame + 14,
  );
  const clickProgress = click
    ? interpolate(frame, [click.atFrame, click.atFrame + 14], [0, 1], clamp)
    : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: x - 3,
        top: y - 3,
        width: 44,
        height: 54,
        filter: "drop-shadow(0 3px 4px rgb(15 23 42 / 55%))",
        pointerEvents: "none",
      }}
    >
      {click ? (
        <div
          style={{
            position: "absolute",
            left: 3,
            top: 3,
            width: 26,
            height: 26,
            border: "5px solid #14b8a6",
            borderRadius: "50%",
            opacity: interpolate(clickProgress, [0, 1], [0.9, 0], clamp),
            scale: interpolate(clickProgress, [0, 1], [0.45, 2.2], clamp),
          }}
        />
      ) : null}
      <svg viewBox="0 0 26 34" width="38" height="50" aria-hidden="true">
        <path
          d="M2 2v25l7-7 5 11 5-2-5-11h10L2 2Z"
          fill="#0d9488"
          stroke="white"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
      </svg>
    </div>
  );
};

const Intro = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #115e59 100%)",
        color: "white",
        display: "flex",
        fontFamily: "system-ui, sans-serif",
        justifyContent: "center",
        opacity: interpolate(frame, [55, 90], [1, 0], clamp),
      }}
    >
      <div style={{maxWidth: 1100, textAlign: "center"}}>
        <div style={{fontSize: 76, fontWeight: 750, letterSpacing: -2}}>Saúde no Território</div>
        <div style={{fontSize: 36, marginTop: 20, opacity: 0.9}}>
          Cadastro, busca ativa e planejamento de visitas
        </div>
        <div
          style={{
            display: "inline-block",
            marginTop: 38,
            padding: "12px 20px",
            border: "1px solid rgb(255 255 255 / 35%)",
            borderRadius: 999,
            fontSize: 23,
            fontWeight: 600,
          }}
        >
          Demonstração com dados sintéticos
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Outro = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #115e59 100%)",
        color: "white",
        display: "flex",
        fontFamily: "system-ui, sans-serif",
        justifyContent: "center",
        opacity: interpolate(frame, [0, 15], [0, 1], clamp),
      }}
    >
      <div style={{maxWidth: 1100, textAlign: "center"}}>
        <div style={{fontSize: 62, fontWeight: 740, letterSpacing: -1.5}}>
          Plano salvo. Rota pronta para a equipe.
        </div>
        <div style={{fontSize: 30, marginTop: 24, opacity: 0.85}}>
          Saúde Territorial · dados sintéticos
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const DemoVideo = () => {
  const frame = useCurrentFrame();
  const focus = demoTimeline.events.find(
    (event): event is FocusEvent => event.type === "focus" && isActive(frame, event),
  );
  const card = demoTimeline.events.find(
    (event): event is CardEvent => event.type === "card" && isActive(frame, event),
  );
  const focusProgress = focus
    ? interpolate(
        frame,
        [
          focus.startFrame,
          focus.startFrame + 18,
          focus.startFrame + focus.durationInFrames - 18,
          focus.startFrame + focus.durationInFrames,
        ],
        [0, 1, 1, 0],
        {...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1)},
      )
    : 0;
  const scale = focus ? interpolate(focusProgress, [0, 1], [1, focus.scale], clamp) : 1;
  const focusCenterX = focus ? focus.box.x + focus.box.width / 2 : 960;
  const focusCenterY = focus ? focus.box.y + focus.box.height / 2 : 540;

  return (
    <AbsoluteFill style={{backgroundColor: "#0f172a", overflow: "hidden"}}>
      <Sequence durationInFrames={captureDurationInFrames}>
        <AbsoluteFill
          style={{
            scale,
            transformOrigin: `${focusCenterX}px ${focusCenterY}px`,
          }}
        >
          <Video
            from={0}
            durationInFrames={720}
            muted
            objectFit="cover"
            src={staticFile("capture.webm")}
            style={{height: "100%", width: "100%"}}
            trimBefore={0}
          />
          <Video
            from={720}
            durationInFrames={450}
            muted
            objectFit="cover"
            playbackRate={2}
            src={staticFile("capture.webm")}
            style={{height: "100%", width: "100%"}}
            trimBefore={720}
          />
          <Video
            from={1170}
            durationInFrames={1506}
            muted
            objectFit="cover"
            src={staticFile("capture.webm")}
            style={{height: "100%", width: "100%"}}
            trimBefore={1620}
          />
          <PointerOverlay />
        </AbsoluteFill>

        {frame >= 75 ? (
          <div
            style={{
              position: "absolute",
              top: 20,
              left: "50%",
              translate: "-50% 0",
              padding: "9px 16px",
              border: "1px solid rgb(255 255 255 / 35%)",
              borderRadius: 999,
              backgroundColor: "rgb(15 23 42 / 82%)",
              color: "white",
              fontFamily: "system-ui, sans-serif",
              fontSize: 20,
              fontWeight: 650,
              letterSpacing: 0.2,
            }}
          >
            Demonstração · dados sintéticos
          </div>
        ) : null}

        {frame >= pregnancySpeedup.outputStartFrame &&
        frame < pregnancySpeedup.outputStartFrame + pregnancySpeedup.outputDurationInFrames ? (
          <div
            style={{
              position: "absolute",
              top: 76,
              left: 24,
              padding: "9px 14px",
              borderRadius: 10,
              backgroundColor: "rgb(15 23 42 / 82%)",
              color: "white",
              fontFamily: "system-ui, sans-serif",
              fontSize: 19,
              fontWeight: 700,
            }}
          >
            Trecho acelerado · 2×
          </div>
        ) : null}

        {card ? (
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 36,
              translate: "-50% 0",
              width: 780,
              padding: "17px 24px 19px",
              border: "1px solid rgb(255 255 255 / 24%)",
              borderRadius: 18,
              backgroundColor: "rgb(15 23 42 / 90%)",
              boxShadow: "0 14px 36px rgb(15 23 42 / 30%)",
              color: "white",
              fontFamily: "system-ui, sans-serif",
              opacity: interpolate(
                frame,
                [
                  card.startFrame,
                  card.startFrame + 10,
                  card.startFrame + card.durationInFrames - 10,
                  card.startFrame + card.durationInFrames,
                ],
                [0, 1, 1, 0],
                clamp,
              ),
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "#5eead4",
                fontSize: 19,
                fontWeight: 750,
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              {card.eyebrow}
            </div>
            <div style={{fontSize: 32, fontWeight: 650, marginTop: 6}}>{card.text}</div>
          </div>
        ) : null}

        <Sequence durationInFrames={90}>
          <Intro />
        </Sequence>
      </Sequence>

      <Sequence from={captureDurationInFrames} durationInFrames={outroDurationInFrames}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
