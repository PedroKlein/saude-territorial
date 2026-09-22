import {Composition} from "remotion";
import {DemoVideo} from "./DemoVideo";
import {captureDurationInFrames, demoTimeline, outroDurationInFrames} from "./timeline";

export const RemotionRoot = () => (
  <Composition
    id="DemoVideo"
    component={DemoVideo}
    durationInFrames={captureDurationInFrames + outroDurationInFrames}
    fps={30}
    width={demoTimeline.viewport.width}
    height={demoTimeline.viewport.height}
  />
);
