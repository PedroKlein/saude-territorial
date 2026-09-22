export type Viewport = {
  width: number;
  height: number;
};

export type FocusEvent = {
  type: "focus";
  startFrame: number;
  durationInFrames: number;
  scale: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type CardEvent = {
  type: "card";
  startFrame: number;
  durationInFrames: number;
  eyebrow: string;
  text: string;
};

export type DemoEvent = FocusEvent | CardEvent;

export const pregnancySpeedup = {
  outputDurationInFrames: 450,
  outputStartFrame: 720,
  playbackRate: 2,
  sourceEndFrame: 1620,
  sourceStartFrame: 720,
} as const;

export function sourceFrameToOutputFrame(sourceFrame: number): number {
  if (sourceFrame <= pregnancySpeedup.sourceStartFrame) return sourceFrame;
  if (sourceFrame < pregnancySpeedup.sourceEndFrame) {
    return Math.round(
      pregnancySpeedup.outputStartFrame +
        (sourceFrame - pregnancySpeedup.sourceStartFrame) / pregnancySpeedup.playbackRate,
    );
  }
  return (
    pregnancySpeedup.outputStartFrame +
    pregnancySpeedup.outputDurationInFrames +
    sourceFrame -
    pregnancySpeedup.sourceEndFrame
  );
}

export const captureDurationInFrames = sourceFrameToOutputFrame(3126);
export const outroDurationInFrames = 90;

export const demoTimeline: {
  viewport: Viewport;
  events: DemoEvent[];
} = {
  viewport: {width: 1920, height: 1080},
  events: [
    {
      type: "card",
      startFrame: 105,
      durationInFrames: 105,
      eyebrow: "1 · Cadastro",
      text: "Cadastre a pessoa e selecione os acompanhamentos",
    },
    {
      type: "card",
      startFrame: 360,
      durationInFrames: 120,
      eyebrow: "Endereço",
      text: "Se o endereço não for localizado, posicione o pino no mapa",
    },
    {
      type: "card",
      startFrame: 630,
      durationInFrames: 105,
      eyebrow: "Gestação",
      text: "Registre as informações do acompanhamento pré-natal",
    },
    {
      type: "focus",
      startFrame: 1260,
      durationInFrames: 330,
      scale: 1.06,
      box: {x: 1390, y: 110, width: 490, height: 850},
    },
    {
      type: "card",
      startFrame: 1280,
      durationInFrames: 135,
      eyebrow: "2 · Priorização",
      text: "Uma gestação de alto risco gera um alerta automático",
    },
    {
      type: "card",
      startFrame: 1625,
      durationInFrames: 120,
      eyebrow: "3 · Plano do dia",
      text: "O sistema sugere as visitas prioritárias do dia",
    },
    {
      type: "card",
      startFrame: 1855,
      durationInFrames: 105,
      eyebrow: "Ajuste do plano",
      text: "Inclua manualmente outras visitas, se necessário",
    },
    {
      type: "card",
      startFrame: 2010,
      durationInFrames: 105,
      eyebrow: "4 · Rota",
      text: "Otimize a ordem das paradas e calcule o trajeto",
    },
    {
      type: "card",
      startFrame: 2140,
      durationInFrames: 165,
      eyebrow: "5 · Salvar e retomar",
      text: "Salve o plano para retomá-lo mais tarde",
    },
    {
      type: "card",
      startFrame: 2410,
      durationInFrames: 150,
      eyebrow: "Resultado",
      text: "Confira o trajeto completo no mapa",
    },
  ],
};
