import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getStroke } from "perfect-freehand";
import styled from "styled-components";
import bg from "../assets/basicBg.png";
import brush1 from "../assets/brush1.png";
import brush2 from "../assets/brush2.png";
import brush3 from "../assets/brush3.png";
import brush4 from "../assets/brush4.png";
import brush5 from "../assets/brush5.png";
import brush6 from "../assets/brush6.png";
import brush7 from "../assets/brush7.png";
import brush8 from "../assets/brush8.png";
import brush9 from "../assets/brush9.png";
import check1 from "../assets/check1.png";
import check2 from "../assets/check2.png";
import check3 from "../assets/check3.png";
import decoFrameTransparent from "../assets/decoFrameTransparent.png";
import removeButton from "../assets/removeButton.png";
import slideButton from "../assets/slideButton.png";
import FullScreenBackground from "../components/FullScreenBackground";
import { ManitoText, MulmaruText } from "../components/PikuraText";

const PHOTO_SLOT_COUNT = 4;
type StickerSize = "tiny" | "small" | "medium" | "large" | "xlarge" | "huge";
type StickerLayout = "grid" | "imageGrid" | "wrap";
type StickerGap = "normal" | "loose";
type StickerFont = "default" | "mulmaruMono";
type StickerKind = "text" | "image";

type ImageSticker = {
  src: string;
  size: StickerSize;
  fileName: string;
};

type StickerGroup = {
  icon: string;
  stickerSize: StickerSize;
  stickerLayout: StickerLayout;
  stickerGap: StickerGap;
  stickerFont: StickerFont;
  stickerKind: StickerKind;
  stickers: Array<string | ImageSticker>;
};

const check3StickerModules = import.meta.glob("../assets/stickers/**/*.{svg,png,webp}", {
  eager: true,
  import: "default",
  query: "?url",
});

const CHECK3_STICKER_ORDER = [
  "image 20.svg",
  "image 53.svg",
  "image 57.svg",
  "image 94.svg",
  "image 95.svg",
  "image 96.svg",
  "image 78.svg",
  "image 66.svg",
  "image 99.svg",
  "image 101.svg",
  "image 100.svg",
  "image 93.svg",
  "Subtract.svg",
  "Group 51.svg",
  "image 98.svg",
  "image 124.svg",
  "image 125.svg",
  "image 109.svg",
  "image 107.svg",
  "image 102.svg",
  "image 110.svg",
  "image 105.svg",
  "image 108.svg",
  "image 103.svg",
];

const CHECK3_STICKER_SIZE_BY_FILE: Partial<Record<string, StickerSize>> = {
  "image 20.svg": "small",
  "image 53.svg": "small",
  "image 57.svg": "small",
  "image 94.svg": "small",
  "image 95.svg": "small",
  "image 96.svg": "small",
  "image 124.svg": "tiny",
  "image 125.svg": "tiny",
  "image 103.svg": "medium",
  "Group 51.svg": "small",
  "Subtract.svg": "medium",
  "image 102.svg": "medium",
  "image 105.svg": "medium",
  "image 108.svg": "medium",
  "image 110.svg": "medium",
};

const CHECK3_STICKERS = buildCheck3Stickers();

const STICKER_GROUPS = [
  {
    icon: check1,
    stickerSize: "xlarge",
    stickerLayout: "grid",
    stickerGap: "normal",
    stickerFont: "default",
    stickerKind: "text",
    stickers: [
      "⸜( ˊᵕˋ )⸝♡",
      "( ˘ ³˘)♥",
      "(｀Д´)",
      "(◍•ᴗ•◍)♡",
      "(๑°ㅁ°๑)✧",
      "(⁎⁍̴̛ᴗ⁍̴̛⁎)",
      "(｡^ω^｡)",
      "(⁎⁍̴̛ω⁍̴̛⁎)",
      "(๑´∀๑)",
    ],
  },
  {
    icon: check2,
    stickerSize: "medium",
    stickerLayout: "wrap",
    stickerGap: "loose",
    stickerFont: "mulmaruMono",
    stickerKind: "text",
    stickers: ["츄릅..", "아.. 진짜 내꺼스러운데..?", "꺅 !!", "얼굴 100점 !", "사랑해~♡", "인생은 vㅔ리 굿", "오늘도 미모 열일 중", "너의 매력 속에서\n\t\t허우적... 허우적...", "愛してる~♥", "LIㄱr え占 좋ㅇr", "ブl분 좋ㅇr!", "かわいい", "天使♥", "내가 바로 미림 얼짱!"],
  },
  {
    icon: check3,
    stickerSize: "large",
    stickerLayout: "imageGrid",
    stickerGap: "normal",
    stickerFont: "default",
    stickerKind: "image",
    stickers: CHECK3_STICKERS,
  },
] satisfies StickerGroup[];
const BRUSH_STYLES = [
  { id: "basic", label: "기본 펜", icon: brush1, width: 8.2, texture: "solid", glow: 0 },
  { id: "neon", label: "네온 글로우 펜", icon: brush2, width: 6.2, texture: "neon", glow: 4.5 },
  { id: "glitter", label: "글리터 펜", icon: brush3, width: 6.8, texture: "glitter", glow: 2.2 },
  { id: "texture", label: "질감 브러쉬 펜", icon: brush4, width: 7.2, texture: "texture", glow: 0 },
  { id: "crayon", label: "크레용 펜", icon: brush5, width: 8.8, texture: "crayon", glow: 0 },
  { id: "pencil", label: "연필 질감 펜", icon: brush6, width: 4.4, texture: "pencil", glow: 0 },
  { id: "marker", label: "부드러운 형광펜", icon: brush7, width: 10.2, texture: "marker", glow: 1.4 },
  { id: "dash", label: "대시 펜", icon: brush8, width: 5.4, texture: "dash", glow: 0 },
  { id: "doodle", label: "얇은 낙서펜", icon: brush9, width: 2.2, texture: "doodle", glow: 0 },
] as const;
type BrushStyle = (typeof BRUSH_STYLES)[number]["id"];
type BrushTexture = (typeof BRUSH_STYLES)[number]["texture"];
type DrawPoint = {
  x: number;
  y: number;
  time: number;
};
type DrawStroke = {
  id: number;
  color: string;
  opacity: number;
  size: number;
  style: BrushStyle;
  points: DrawPoint[];
};

const STICKER_BUTTON_SIZE = {
  tiny: "clamp(12px, 1.1vw, 18px)",
  small: "clamp(13px, 1.25vw, 20px)",
  medium: "clamp(15px, 1.45vw, 24px)",
  large: "clamp(18px, 1.5vw, 30px)",
  xlarge: "clamp(18px, 1.8vw, 30px)",
  huge: "clamp(18px, 1.8vw, 30px)",
} satisfies Record<StickerSize, string>;

const STICKER_IMAGE_BUTTON_SIZE = {
  tiny: "clamp(28px, 2.5vw, 42px)",
  small: "clamp(32px, 2.8vw, 48px)",
  medium: "clamp(38px, 3.2vw, 56px)",
  large: "clamp(48px, 4.2vw, 68px)",
  xlarge: "clamp(54px, 4.8vw, 78px)",
  huge: "clamp(64px, 5.6vw, 92px)",
} satisfies Record<StickerSize, string>;

const STICKER_INITIAL_BOX_SIZE = {
  tiny: 30,
  small: 42,
  medium: 54,
  large: 66,
  xlarge: 78,
  huge: 92,
} satisfies Record<StickerSize, number>;

const STICKER_FONT_FAMILY = {
  default: '"Mulmaru", "Mulmaru Mono", "MulmaruMono", sans-serif',
  mulmaruMono: '"Mulmaru Mono", "MulmaruMono", "Mulmaru", sans-serif',
} satisfies Record<StickerFont, string>;

const STICKER_ROW_PAIRS = new Set(["인생은 vㅔ리 굿|오늘도 미모 열일 중"]);
const STICKER_IMAGE_PAIRS = new Set(["image 124.svg|image 125.svg"]);

type PlacedSticker = {
  id: number;
  kind: StickerKind;
  label: string;
  size: StickerSize;
  font: StickerFont;
  color: string;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  x: number;
  y: number;
};

type StickerEditMode = "move" | "resize" | "rotate";
type StickerEditState = {
  id: number;
  mode: StickerEditMode;
  pointerId: number;
  startX: number;
  startY: number;
  startSticker: PlacedSticker;
  startDistance: number;
  startAngle: number;
};

type PhotoDecoration = {
  drawStrokes: DrawStroke[];
  stickers: PlacedSticker[];
  maxStickerZIndex: number;
  history: DecorationSnapshot[];
  future: DecorationSnapshot[];
};

type DecorationSnapshot = {
  drawStrokes: DrawStroke[];
  stickers: PlacedSticker[];
  maxStickerZIndex: number;
};

function buildCheck3Stickers() {
  const stickerEntries = Object.entries(check3StickerModules);
  const orderedStickers = CHECK3_STICKER_ORDER.flatMap((fileName) =>
    stickerEntries
      .filter(([path]) => path.endsWith(`/${fileName}`))
      .map(([path, sticker]) => createImageSticker(path, sticker)),
  );

  const extraStickers = stickerEntries
    .filter(([path]) => !CHECK3_STICKER_ORDER.some((fileName) => path.endsWith(`/${fileName}`)))
    .sort(([firstPath], [secondPath]) => firstPath.localeCompare(secondPath, undefined, { numeric: true }))
    .map(([path, sticker]) => createImageSticker(path, sticker));

  return [...orderedStickers, ...extraStickers];
}

function createImageSticker(path: string, sticker: unknown): ImageSticker {
  const fileName = getFileName(path);

  return {
    src: sticker as string,
    fileName,
    size: CHECK3_STICKER_SIZE_BY_FILE[fileName] ?? "xlarge",
  };
}

function getFileName(path: string) {
  return decodeURIComponent(path.split("/").pop()?.split("?")[0] ?? "");
}

function getStickerFileName(sticker: string | ImageSticker) {
  return getFileName(getStickerLabel(sticker));
}

function getStickerLabel(sticker: string | ImageSticker) {
  return typeof sticker === "string" ? sticker : sticker.src;
}

function getStickerSize(sticker: string | ImageSticker, fallbackSize: StickerSize) {
  return typeof sticker === "string" ? fallbackSize : sticker.size;
}

function getInitialImageStickerBox(fileName: string, size: StickerSize) {
  const baseSize = STICKER_INITIAL_BOX_SIZE[size];
  const isLooseSvg = fileName.startsWith("image ");
  const imageScale = isLooseSvg ? 0.58 : 0.72;

  return { width: baseSize * imageScale, height: baseSize * imageScale };
}

function getInitialTextStickerBox(sticker: string, size: StickerSize) {
  const baseSize = STICKER_INITIAL_BOX_SIZE[size];
  const lineCount = sticker.split("\n").length;
  const longestLine = sticker.split("\n").reduce((longest, line) => Math.max(longest, line.length), 1);

  return {
    width: Math.max(baseSize * 0.7, longestLine * baseSize * 0.24),
    height: Math.max(baseSize * 0.34, lineCount * baseSize * 0.34),
  };
}

function createEmptyPhotoDecoration(): PhotoDecoration {
  return {
    drawStrokes: [],
    stickers: [],
    maxStickerZIndex: 4,
    history: [],
    future: [],
  };
}

function createDecorationSnapshot(decoration: PhotoDecoration): DecorationSnapshot {
  return {
    drawStrokes: decoration.drawStrokes,
    stickers: decoration.stickers,
    maxStickerZIndex: decoration.maxStickerZIndex,
  };
}

function applyDecorationSnapshot(decoration: PhotoDecoration, snapshot: DecorationSnapshot): PhotoDecoration {
  return {
    ...decoration,
    drawStrokes: snapshot.drawStrokes,
    stickers: snapshot.stickers,
    maxStickerZIndex: snapshot.maxStickerZIndex,
  };
}

function resolveStateValue<T>(value: React.SetStateAction<T>, currentValue: T) {
  return typeof value === "function" ? (value as (currentValue: T) => T)(currentValue) : value;
}

function getAngle(centerX: number, centerY: number, pointerX: number, pointerY: number) {
  return Math.atan2(pointerY - centerY, pointerX - centerX);
}

function getToneColor(hue: number, tone: number) {
  const lightness = tone < 50 ? 8 + tone * 0.84 : 50 + (tone - 50) * 0.92;
  const saturation = tone > 88 ? 100 - (tone - 88) * 5 : 100;

  return `hsl(${hue} ${Math.max(0, saturation)}% ${Math.min(96, lightness)}%)`;
}

function getToneGradient(hue: number) {
  return `linear-gradient(90deg, #050005 0%, hsl(${hue} 100% 18%) 24%, hsl(${hue} 100% 50%) 55%, hsl(${hue} 100% 76%) 78%, hsl(${hue} 28% 96%) 100%)`;
}

function getBrushConfig(style: BrushStyle) {
  return BRUSH_STYLES.find((brushStyle) => brushStyle.id === style) ?? BRUSH_STYLES[0];
}

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function getCanvasPoint(event: React.PointerEvent<HTMLCanvasElement>): DrawPoint {
  const rect = event.currentTarget.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    time: performance.now(),
  };
}

function resizeDrawingCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function redrawDrawingCanvas(canvas: HTMLCanvasElement | null, strokes: DrawStroke[]) {
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  strokes.forEach((stroke) => drawStroke(ctx, stroke));
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: DrawStroke) {
  if (stroke.points.length === 0) {
    return;
  }

  drawTexturedStroke(ctx, stroke);
}

function drawTexturedStroke(ctx: CanvasRenderingContext2D, stroke: DrawStroke) {
  const config = getBrushConfig(stroke.style);
  const points = stroke.points;
  const texture = config.texture as BrushTexture;
  const opacity = getBrushOpacity(texture);
  const strokeOpacity = stroke.opacity ?? 1;

  ctx.save();
  ctx.globalAlpha = opacity * strokeOpacity;
  ctx.strokeStyle = stroke.color;
  ctx.shadowColor = stroke.color;
  ctx.shadowBlur = config.glow;

  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, getBrushWidth(stroke, 0) * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = stroke.color;
    ctx.fill();
    ctx.restore();
    return;
  }

  if (texture === "dash") {
    drawDashStroke(ctx, stroke, strokeOpacity);
    ctx.restore();
    return;
  }

  if (texture === "neon") {
    drawFreehandStroke(ctx, stroke, stroke.color, 0.26 * strokeOpacity, 1.34);
    drawFreehandStroke(ctx, stroke, "rgba(255, 255, 255, 0.98)", 0.96 * strokeOpacity, 0.52);
    ctx.restore();
    return;
  }

  if (texture === "glitter") {
    drawFreehandStroke(ctx, stroke, stroke.color, 0.58 * strokeOpacity, 0.96);
    drawGlitterStroke(ctx, stroke, strokeOpacity);
    ctx.restore();
    return;
  }

  if (texture === "texture") {
    drawFreehandStroke(ctx, stroke, stroke.color, 0.72 * strokeOpacity, 1.04);
    drawDryBrushGrain(ctx, stroke, strokeOpacity);
    ctx.restore();
    return;
  }

  if (texture === "crayon") {
    drawFreehandStroke(ctx, stroke, stroke.color, 0.58 * strokeOpacity, 1.08);
    drawCrayonTexture(ctx, stroke, strokeOpacity);
    ctx.restore();
    return;
  }

  if (texture === "pencil") {
    drawFreehandStroke(ctx, stroke, stroke.color, 0.38 * strokeOpacity, 0.72);
    drawPencilGrain(ctx, stroke, strokeOpacity);
    ctx.restore();
    return;
  }

  if (texture === "marker") {
    drawFreehandStroke(ctx, stroke, stroke.color, 0.32 * strokeOpacity, 1.42);
    drawFreehandStroke(ctx, stroke, stroke.color, 0.2 * strokeOpacity, 0.92);
    ctx.restore();
    return;
  }

  if (texture === "doodle") {
    drawFreehandStroke(ctx, stroke, stroke.color, 0.9 * strokeOpacity, 0.72);
    ctx.restore();
    return;
  }

  drawFreehandStroke(ctx, stroke, stroke.color, opacity * strokeOpacity, 1);
  ctx.restore();
}

function drawFreehandStroke(
  ctx: CanvasRenderingContext2D,
  stroke: DrawStroke,
  color: string,
  alpha: number,
  widthScale: number,
) {
  const outline = getStroke(
    stroke.points.map((point, index) => {
      const progress = stroke.points.length <= 1 ? 0.5 : index / (stroke.points.length - 1);
      const pressure = 0.25 + Math.sin(progress * Math.PI) * 0.75;

      return [point.x, point.y, pressure];
    }),
    {
      size: stroke.size * (getBrushConfig(stroke.style).width / 10) * widthScale,
      thinning: 0.56,
      smoothing: 0.64,
      streamline: 0.48,
      simulatePressure: false,
      start: { taper: stroke.size * 0.7, cap: true },
      end: { taper: stroke.size * 1.05, cap: true },
    },
  );

  if (outline.length === 0) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(outline[0][0], outline[0][1]);
  outline.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function getBrushWidth(stroke: DrawStroke, index: number) {
  const config = getBrushConfig(stroke.style);
  const progress = stroke.points.length <= 1 ? 0.5 : index / (stroke.points.length - 1);
  const taper = Math.sin(progress * Math.PI);
  const styleScale = config.width / 10;

  return stroke.size * styleScale * (0.26 + taper * 0.74);
}

function getBrushOpacity(texture: BrushTexture) {
  if (texture === "marker") {
    return 0.42;
  }

  if (texture === "pencil") {
    return 0.72;
  }

  if (texture === "texture" || texture === "crayon") {
    return 0.62;
  }

  return 0.92;
}

function drawGlitterStroke(ctx: CanvasRenderingContext2D, stroke: DrawStroke, strokeOpacity: number) {
  const points = stroke.points;
  const step = Math.max(1, Math.floor(points.length / 28));

  points.forEach((point, pointIndex) => {
    if (pointIndex % step !== 0) {
      return;
    }

    const width = getBrushWidth(stroke, pointIndex);
    const sparkleCount = 2 + Math.floor(pseudoRandom(pointIndex * 19) * 3);

    for (let index = 0; index < sparkleCount; index += 1) {
      const angle = pseudoRandom(pointIndex * 37 + index) * Math.PI * 2;
      const distance = pseudoRandom(pointIndex * 43 + index) * width * 0.62;
      const x = point.x + Math.cos(angle) * distance;
      const y = point.y + Math.sin(angle) * distance;
      const radius = Math.max(0.8, width * (0.035 + pseudoRandom(pointIndex * 29 + index) * 0.035));

      ctx.save();
      ctx.globalAlpha = (0.58 + pseudoRandom(pointIndex * 13 + index) * 0.36) * strokeOpacity;
      ctx.fillStyle = index % 3 === 0 ? "rgba(255, 255, 255, 0.96)" : stroke.color;
      ctx.beginPath();
      ctx.moveTo(x, y - radius * 2.2);
      ctx.lineTo(x + radius * 0.72, y - radius * 0.72);
      ctx.lineTo(x + radius * 2.2, y);
      ctx.lineTo(x + radius * 0.72, y + radius * 0.72);
      ctx.lineTo(x, y + radius * 2.2);
      ctx.lineTo(x - radius * 0.72, y + radius * 0.72);
      ctx.lineTo(x - radius * 2.2, y);
      ctx.lineTo(x - radius * 0.72, y - radius * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  });
}

function drawDashStroke(ctx: CanvasRenderingContext2D, stroke: DrawStroke, strokeOpacity: number) {
  const width = Math.max(2, stroke.size * (getBrushConfig(stroke.style).width / 10) * 0.42);
  const dashLength = Math.max(8, width * 2.6);
  const gapLength = Math.max(5, width * 1.25);
  let distanceInPattern = 0;
  let drawingDash = true;

  ctx.save();
  ctx.globalAlpha = 0.86 * strokeOpacity;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";

  for (let index = 1; index < stroke.points.length; index += 1) {
    let start = stroke.points[index - 1];
    const end = stroke.points[index];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const segmentLength = Math.hypot(dx, dy);

    if (segmentLength === 0) {
      continue;
    }

    const unitX = dx / segmentLength;
    const unitY = dy / segmentLength;
    let consumed = 0;

    while (consumed < segmentLength) {
      const targetLength = drawingDash ? dashLength : gapLength;
      const remainingPattern = targetLength - distanceInPattern;
      const stepLength = Math.min(remainingPattern, segmentLength - consumed);
      const next = {
        x: start.x + unitX * stepLength,
        y: start.y + unitY * stepLength,
        time: start.time,
      };

      if (drawingDash) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(next.x, next.y);
        ctx.stroke();
      }

      consumed += stepLength;
      distanceInPattern += stepLength;
      start = next;

      if (distanceInPattern >= targetLength) {
        drawingDash = !drawingDash;
        distanceInPattern = 0;
      }
    }
  }

  ctx.restore();
}

function drawCrayonTexture(ctx: CanvasRenderingContext2D, stroke: DrawStroke, strokeOpacity: number) {
  drawDirectionalGrain(ctx, stroke, {
    alpha: 0.28 * strokeOpacity,
    color: "rgba(255, 255, 255, 0.76)",
    widthScale: 0.18,
    grains: 7,
    seed: 41,
  });
  drawDirectionalGrain(ctx, stroke, {
    alpha: 0.2 * strokeOpacity,
    color: stroke.color,
    widthScale: 0.12,
    grains: 8,
    seed: 83,
  });
}

function drawDryBrushGrain(ctx: CanvasRenderingContext2D, stroke: DrawStroke, strokeOpacity: number) {
  drawDirectionalGrain(ctx, stroke, {
    alpha: 0.24 * strokeOpacity,
    color: "rgba(255, 255, 255, 0.72)",
    widthScale: 0.13,
    grains: 5,
    seed: 23,
  });
  drawDirectionalGrain(ctx, stroke, {
    alpha: 0.16 * strokeOpacity,
    color: stroke.color,
    widthScale: 0.09,
    grains: 4,
    seed: 61,
  });
}

function drawPencilGrain(ctx: CanvasRenderingContext2D, stroke: DrawStroke, strokeOpacity: number) {
  drawDirectionalGrain(ctx, stroke, {
    alpha: 0.34 * strokeOpacity,
    color: stroke.color,
    widthScale: 0.08,
    grains: 6,
    seed: 97,
  });
}

function drawDirectionalGrain(
  ctx: CanvasRenderingContext2D,
  stroke: DrawStroke,
  options: { alpha: number; color: string; widthScale: number; grains: number; seed: number },
) {
  ctx.save();
  ctx.globalAlpha = options.alpha;
  ctx.strokeStyle = options.color;

  for (let index = 1; index < stroke.points.length; index += 1) {
    const start = stroke.points[index - 1];
    const end = stroke.points[index];
    const width = getBrushWidth(stroke, index);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);

    if (length === 0) {
      continue;
    }

    const normalX = -dy / length;
    const normalY = dx / length;
    ctx.lineWidth = Math.max(0.55, width * options.widthScale);

    for (let grain = 0; grain < options.grains; grain += 1) {
      if (pseudoRandom(index * options.seed + grain) < 0.28) {
        continue;
      }

      const offset = (pseudoRandom(index * 31 + grain + options.seed) - 0.5) * width;
      const jitter = (pseudoRandom(index * 47 + grain + options.seed) - 0.5) * width * 0.16;

      ctx.beginPath();
      ctx.moveTo(start.x + normalX * offset, start.y + normalY * offset);
      ctx.lineTo(end.x + normalX * (offset * 0.78 + jitter), end.y + normalY * (offset * 0.78 + jitter));
      ctx.stroke();
    }
  }

  ctx.restore();
}

export default function DecoPhoto() {
  const photos = useMemo(() => getSelectedPhotos(), []);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<DrawStroke | null>(null);
  const stickerEditRef = useRef<StickerEditState | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [activeStickerGroupIndex, setActiveStickerGroupIndex] = useState(0);
  const [selectedHue, setSelectedHue] = useState(326);
  const [colorTone, setColorTone] = useState(58);
  const [selectedColor, setSelectedColor] = useState(getToneColor(326, 58));
  const [brushSize, setBrushSize] = useState(24);
  const [brushType, setBrushType] = useState<BrushStyle>("basic");
  const [photoDecorations, setPhotoDecorations] = useState<PhotoDecoration[]>(() =>
    Array.from({ length: PHOTO_SLOT_COUNT }, createEmptyPhotoDecoration),
  );
  const [selectedStickerId, setSelectedStickerId] = useState<number | null>(null);
  const activePhoto = photos[activePhotoIndex];
  const activeStickerGroup = STICKER_GROUPS[activeStickerGroupIndex];
  const activeDecoration = photoDecorations[activePhotoIndex] ?? createEmptyPhotoDecoration();
  const drawStrokes = activeDecoration.drawStrokes;
  const stickers = activeDecoration.stickers;
  const maxStickerZIndex = activeDecoration.maxStickerZIndex;

  const redrawCanvas = useCallback((nextStrokes: DrawStroke[]) => {
    redrawDrawingCanvas(drawingCanvasRef.current, nextStrokes);
  }, []);

  function updateActiveDecoration(updater: (decoration: PhotoDecoration) => PhotoDecoration) {
    setPhotoDecorations((currentDecorations) =>
      currentDecorations.map((decoration, index) => (index === activePhotoIndex ? updater(decoration) : decoration)),
    );
  }

  function commitActiveDecorationChange(updater: (decoration: PhotoDecoration) => PhotoDecoration) {
    updateActiveDecoration((decoration) => {
      const previousSnapshot = createDecorationSnapshot(decoration);
      const nextDecoration = updater(decoration);

      return {
        ...nextDecoration,
        history: [...decoration.history, previousSnapshot],
        future: [],
      };
    });
  }

  function setStickers(value: React.SetStateAction<PlacedSticker[]>) {
    updateActiveDecoration((decoration) => ({
      ...decoration,
      stickers: resolveStateValue(value, decoration.stickers),
    }));
  }

  function setMaxStickerZIndex(value: React.SetStateAction<number>) {
    updateActiveDecoration((decoration) => ({
      ...decoration,
      maxStickerZIndex: resolveStateValue(value, decoration.maxStickerZIndex),
    }));
  }

  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) {
      return;
    }

    function syncCanvasSize() {
      if (!canvas) {
        return;
      }

      resizeDrawingCanvas(canvas);
      redrawDrawingCanvas(canvas, drawStrokes);
    }

    syncCanvasSize();
    window.addEventListener("resize", syncCanvasSize);

    return () => window.removeEventListener("resize", syncCanvasSize);
  }, [drawStrokes, activePhotoIndex]);

  useEffect(() => {
    redrawCanvas(drawStrokes);
  }, [drawStrokes, redrawCanvas]);

  useEffect(() => {
    setSelectedStickerId(null);
    stickerEditRef.current = null;
    drawingRef.current = false;
    currentStrokeRef.current = null;
  }, [activePhotoIndex]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.key === "Delete" || event.key === "Backspace") && selectedStickerId !== null) {
        setStickers((currentStickers) => currentStickers.filter((sticker) => sticker.id !== selectedStickerId));
        setSelectedStickerId(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedStickerId]);

  function handleDrawStart(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!activePhoto || selectedStickerId !== null) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const nextStroke: DrawStroke = {
      id: Date.now(),
      color: selectedColor,
      opacity: 1,
      size: brushSize,
      style: brushType,
      points: [getCanvasPoint(event)],
    };

    drawingRef.current = true;
    currentStrokeRef.current = nextStroke;
    updateActiveDecoration((decoration) => ({
      ...decoration,
      history: [...decoration.history, createDecorationSnapshot(decoration)],
      future: [],
    }));
    redrawCanvas([...drawStrokes, nextStroke]);
  }

  function handleDrawMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !currentStrokeRef.current) {
      return;
    }

    event.preventDefault();
    const point = getCanvasPoint(event);
    const nextStroke = {
      ...currentStrokeRef.current,
      points: [...currentStrokeRef.current.points, point],
    };

    currentStrokeRef.current = nextStroke;
    redrawCanvas([...drawStrokes, nextStroke]);
  }

  function handleDrawEnd(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !currentStrokeRef.current) {
      return;
    }

    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const finishedStroke = currentStrokeRef.current;
    drawingRef.current = false;
    currentStrokeRef.current = null;
    updateActiveDecoration((decoration) => ({
      ...decoration,
      drawStrokes: [...decoration.drawStrokes, finishedStroke],
    }));
  }

  function handleUndo() {
    updateActiveDecoration((decoration) => {
      const previousSnapshot = decoration.history[decoration.history.length - 1];
      if (!previousSnapshot) {
        return decoration;
      }

      return {
        ...applyDecorationSnapshot(decoration, previousSnapshot),
        history: decoration.history.slice(0, -1),
        future: [createDecorationSnapshot(decoration), ...decoration.future],
      };
    });
  }

  function handleRedo() {
    updateActiveDecoration((decoration) => {
      const nextSnapshot = decoration.future[0];
      if (!nextSnapshot) {
        return decoration;
      }

      return {
        ...applyDecorationSnapshot(decoration, nextSnapshot),
        history: [...decoration.history, createDecorationSnapshot(decoration)],
        future: decoration.future.slice(1),
      };
    });
  }

  function handleStickerDrag(sticker: string | ImageSticker, event: React.DragEvent<HTMLButtonElement>) {
    event.dataTransfer.setData("text/plain", getStickerLabel(sticker));
    event.dataTransfer.setData("application/x-sticker-size", getStickerSize(sticker, activeStickerGroup.stickerSize));
    event.dataTransfer.setData("application/x-sticker-file-name", getStickerFileName(sticker));
  }

  function handleHueChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextHue = Number(event.target.value);
    const nextColor = getToneColor(nextHue, colorTone);

    setSelectedHue(nextHue);
    setSelectedColor(nextColor);
  }

  function handleToneChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextTone = Number(event.target.value);

    setColorTone(nextTone);
    setSelectedColor(getToneColor(selectedHue, nextTone));
  }

  function handleCanvasDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();

    const sticker = event.dataTransfer.getData("text/plain");
    const stickerSize = event.dataTransfer.getData("application/x-sticker-size") as StickerSize;
    const stickerFileName = event.dataTransfer.getData("application/x-sticker-file-name");
    if (!sticker) {
      return;
    }

    const photoLayer = event.currentTarget.querySelector("[data-photo-layer]");
    const rect = photoLayer?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
    const stickerId = Date.now();
    const nextZIndex = maxStickerZIndex + 1;
    const placedStickerSize = stickerSize || activeStickerGroup.stickerSize;
    const initialBox =
      activeStickerGroup.stickerKind === "image"
        ? getInitialImageStickerBox(stickerFileName, placedStickerSize)
        : getInitialTextStickerBox(sticker, placedStickerSize);
    commitActiveDecorationChange((decoration) => ({
      ...decoration,
      maxStickerZIndex: nextZIndex,
      stickers: [
        ...decoration.stickers,
        {
        id: stickerId,
        kind: activeStickerGroup.stickerKind,
        label: sticker,
        size: placedStickerSize,
        font: activeStickerGroup.stickerFont,
        color: selectedColor,
        width: initialBox.width,
        height: initialBox.height,
        rotation: 0,
        zIndex: nextZIndex,
        x: Math.min(rect.width, Math.max(0, event.clientX - rect.left)),
        y: Math.min(rect.height, Math.max(0, event.clientY - rect.top)),
      },
      ],
    }));
    setSelectedStickerId(stickerId);
  }

  function bringStickerForward(stickerId: number) {
    setMaxStickerZIndex((currentMaxZIndex) => {
      const nextZIndex = currentMaxZIndex + 1;
      setStickers((currentStickers) =>
        currentStickers.map((sticker) => (sticker.id === stickerId ? { ...sticker, zIndex: nextZIndex } : sticker)),
      );
      return nextZIndex;
    });
  }

  function handleStickerEditPointerDown(
    sticker: PlacedSticker,
    mode: StickerEditMode,
    event: React.PointerEvent<HTMLElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();

    const rect = canvasWrapRef.current?.querySelector("[data-photo-layer]")?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    setSelectedStickerId(sticker.id);
    bringStickerForward(sticker.id);
    if (mode !== "move" || stickerEditRef.current === null) {
      updateActiveDecoration((decoration) => ({
        ...decoration,
        history: [...decoration.history, createDecorationSnapshot(decoration)],
        future: [],
      }));
    }
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    stickerEditRef.current = {
      id: sticker.id,
      mode,
      pointerId: event.pointerId,
      startX: pointerX,
      startY: pointerY,
      startSticker: sticker,
      startDistance: Math.hypot(pointerX - sticker.x, pointerY - sticker.y),
      startAngle: getAngle(sticker.x, sticker.y, pointerX, pointerY),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleStickerEditPointerMove(event: React.PointerEvent<HTMLElement>) {
    const editState = stickerEditRef.current;
    const rect = canvasWrapRef.current?.querySelector("[data-photo-layer]")?.getBoundingClientRect();
    if (!editState || !rect || editState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const pointerX = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
    const pointerY = Math.min(rect.height, Math.max(0, event.clientY - rect.top));
    const startSticker = editState.startSticker;

    setStickers((currentStickers) =>
      currentStickers.map((sticker) => {
        if (sticker.id !== editState.id) {
          return sticker;
        }

        if (editState.mode === "move") {
          return {
            ...sticker,
            x: Math.min(rect.width, Math.max(0, startSticker.x + pointerX - editState.startX)),
            y: Math.min(rect.height, Math.max(0, startSticker.y + pointerY - editState.startY)),
          };
        }

        if (editState.mode === "rotate") {
          const nextAngle = getAngle(startSticker.x, startSticker.y, pointerX, pointerY);

          return {
            ...sticker,
            rotation: startSticker.rotation + ((nextAngle - editState.startAngle) * 180) / Math.PI,
          };
        }

        const distance = Math.max(8, Math.hypot(pointerX - startSticker.x, pointerY - startSticker.y));
        const proportionalScale = distance / Math.max(8, editState.startDistance);

        if (event.shiftKey) {
          return {
            ...sticker,
            width: Math.max(24, startSticker.width + (pointerX - editState.startX) * 2),
            height: Math.max(24, startSticker.height + (pointerY - editState.startY) * 2),
          };
        }

        return {
          ...sticker,
          width: Math.max(24, startSticker.width * proportionalScale),
          height: Math.max(24, startSticker.height * proportionalScale),
        };
      }),
    );
  }

  function handleStickerEditPointerUp(event: React.PointerEvent<HTMLElement>) {
    const editState = stickerEditRef.current;
    if (!editState || editState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    stickerEditRef.current = null;
  }

  function handleDeleteSelectedSticker() {
    commitActiveDecorationChange((decoration) => ({
      ...decoration,
      stickers: decoration.stickers.filter((sticker) => sticker.id !== selectedStickerId),
    }));
    setSelectedStickerId(null);
  }

  return (
    <FullScreenBackground background={bg}>
      <GuideText>브러쉬와 스티커를 드래그해서 사진을 꾸며보세요~</GuideText>
      <TimerText>58</TimerText>

      <PhotoStrip>
        {Array.from({ length: PHOTO_SLOT_COUNT }, (_, index) => {
          const photo = photos[index];
          return (
            <PhotoSlot
              key={index}
              type="button"
              $isActive={index === activePhotoIndex}
              onClick={() => setActivePhotoIndex(index)}
            >
              {photo ? <PhotoSlotImage src={photo} alt={`선택 사진 ${index + 1}`} draggable={false} onDragStart={(event) => event.preventDefault()} /> : null}
            </PhotoSlot>
          );
        })}
      </PhotoStrip>

      <WorkArea>
        <CanvasWrap
          ref={canvasWrapRef}
          onPointerDown={() => setSelectedStickerId(null)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleCanvasDrop}
        >
          <PhotoDecoLayer data-photo-layer>
            {activePhoto ? <CanvasPhoto src={activePhoto} alt="꾸미는 사진" draggable={false} onDragStart={(event) => event.preventDefault()} /> : null}
            <DrawingCanvas
              ref={drawingCanvasRef}
              aria-label="사진 위 낙서 캔버스"
              onPointerDown={handleDrawStart}
              onPointerMove={handleDrawMove}
              onPointerUp={handleDrawEnd}
              onPointerCancel={handleDrawEnd}
              onPointerLeave={handleDrawEnd}
            />
            {stickers
              .slice()
              .sort((firstSticker, secondSticker) => firstSticker.zIndex - secondSticker.zIndex)
              .map((sticker) => {
                const isSelected = sticker.id === selectedStickerId;

                return (
                  <StickerTransformBox
                    key={sticker.id}
                    $width={sticker.width}
                    $height={sticker.height}
                    $rotation={sticker.rotation}
                    $zIndex={sticker.zIndex}
                    style={{ left: sticker.x, top: sticker.y }}
                    onPointerDown={(event) => handleStickerEditPointerDown(sticker, "move", event)}
                    onPointerMove={handleStickerEditPointerMove}
                    onPointerUp={handleStickerEditPointerUp}
                    onPointerCancel={handleStickerEditPointerUp}
                  >
                    {sticker.kind === "image" ? (
                      <PlacedStickerImage src={sticker.label} alt="" draggable={false} onDragStart={(event) => event.preventDefault()} />
                    ) : (
                      <PlacedStickerText
                        data-label={sticker.label}
                        $font={sticker.font}
                        $color={sticker.color}
                        $height={sticker.height}
                      >
                        {sticker.label}
                      </PlacedStickerText>
                    )}
                    {isSelected ? (
                      <StickerSelectionBox>
                        <StickerResizeHandle
                          $position="top-left"
                          onPointerDown={(event) => handleStickerEditPointerDown(sticker, "resize", event)}
                          onPointerMove={handleStickerEditPointerMove}
                          onPointerUp={handleStickerEditPointerUp}
                          onPointerCancel={handleStickerEditPointerUp}
                        />
                        <StickerResizeHandle
                          $position="top-right"
                          onPointerDown={(event) => handleStickerEditPointerDown(sticker, "resize", event)}
                          onPointerMove={handleStickerEditPointerMove}
                          onPointerUp={handleStickerEditPointerUp}
                          onPointerCancel={handleStickerEditPointerUp}
                        />
                        <StickerResizeHandle
                          $position="bottom-left"
                          onPointerDown={(event) => handleStickerEditPointerDown(sticker, "resize", event)}
                          onPointerMove={handleStickerEditPointerMove}
                          onPointerUp={handleStickerEditPointerUp}
                          onPointerCancel={handleStickerEditPointerUp}
                        />
                        <StickerResizeHandle
                          $position="bottom-right"
                          onPointerDown={(event) => handleStickerEditPointerDown(sticker, "resize", event)}
                          onPointerMove={handleStickerEditPointerMove}
                          onPointerUp={handleStickerEditPointerUp}
                          onPointerCancel={handleStickerEditPointerUp}
                        />
                        <StickerRotateHandle
                          onPointerDown={(event) => handleStickerEditPointerDown(sticker, "rotate", event)}
                          onPointerMove={handleStickerEditPointerMove}
                          onPointerUp={handleStickerEditPointerUp}
                          onPointerCancel={handleStickerEditPointerUp}
                        />
                        <StickerDeleteButton
                          type="button"
                          aria-label="스티커 삭제"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={handleDeleteSelectedSticker}
                        >
                          ×
                        </StickerDeleteButton>
                      </StickerSelectionBox>
                    ) : null}
                  </StickerTransformBox>
                );
              })}
          </PhotoDecoLayer>
          <FrameImage src={decoFrameTransparent} alt="" />
          <FrameHistoryControls>
            <FrameHistoryButton type="button" aria-label="되돌리기" onClick={handleUndo} disabled={activeDecoration.history.length === 0}>
              <img src={removeButton} alt="" draggable={false} />
            </FrameHistoryButton>
            <FrameHistoryButton type="button" aria-label="다시 실행" onClick={handleRedo} disabled={activeDecoration.future.length === 0}>
              <img src={slideButton} alt="" draggable={false} />
            </FrameHistoryButton>
          </FrameHistoryControls>
        </CanvasWrap>

        <ToolPanel>
          <StickerPanelWrap>
            <StickerPanel
              $gap={activeStickerGroup.stickerGap}
              $layout={activeStickerGroup.stickerLayout}
            >
              {activeStickerGroup.stickers.map((sticker, index, stickerList) => {
                const stickerLabel = getStickerLabel(sticker);
                const nextSticker = stickerList[index + 1];
                const nextStickerLabel = nextSticker ? getStickerLabel(nextSticker) : "";
                const pairKey = `${stickerLabel}|${nextStickerLabel}`;
                const isImageSticker = activeStickerGroup.stickerKind === "image";
                const imagePairKey = `${getStickerFileName(sticker)}|${nextSticker ? getStickerFileName(nextSticker) : ""}`;

                if (isImageSticker) {
                  if (index > 0 && STICKER_IMAGE_PAIRS.has(`${getStickerFileName(stickerList[index - 1])}|${getStickerFileName(sticker)}`)) {
                    return null;
                  }

                  if (nextSticker && STICKER_IMAGE_PAIRS.has(imagePairKey)) {
                    return (
                      <StickerImageButtonPair key={imagePairKey}>
                        {[sticker, nextSticker].map((pairedSticker) => {
                          const pairedStickerLabel = getStickerLabel(pairedSticker);

                          return (
                            <StickerImageButton
                              key={pairedStickerLabel}
                              type="button"
                              draggable
                              $size={getStickerSize(pairedSticker, activeStickerGroup.stickerSize)}
                              onDragStart={(event) => handleStickerDrag(pairedSticker, event)}
                            >
                              <img src={pairedStickerLabel} alt="" />
                            </StickerImageButton>
                          );
                        })}
                      </StickerImageButtonPair>
                    );
                  }

                  return (
                    <StickerImageButton
                      key={stickerLabel}
                      type="button"
                      draggable
                      $size={getStickerSize(sticker, activeStickerGroup.stickerSize)}
                      onDragStart={(event) => handleStickerDrag(sticker, event)}
                    >
                      <img src={stickerLabel} alt="" />
                    </StickerImageButton>
                  );
                }

                if (index > 0 && STICKER_ROW_PAIRS.has(`${getStickerLabel(stickerList[index - 1])}|${stickerLabel}`)) {
                  return null;
                }

                if (STICKER_ROW_PAIRS.has(pairKey)) {
                  return (
                    <StickerButtonPair key={pairKey}>
                      {[sticker, nextSticker].map((pairedSticker) => (
                        <StickerButton
                          key={getStickerLabel(pairedSticker)}
                          type="button"
                          draggable
                          data-label={getStickerLabel(pairedSticker)}
                          $font={activeStickerGroup.stickerFont}
                          $size={getStickerSize(pairedSticker, activeStickerGroup.stickerSize)}
                          $color={selectedColor}
                          onDragStart={(event) => handleStickerDrag(pairedSticker, event)}
                        >
                          {getStickerLabel(pairedSticker)}
                        </StickerButton>
                      ))}
                    </StickerButtonPair>
                  );
                }

                return (
                  <StickerButton
                    key={stickerLabel}
                    type="button"
                    draggable
                    data-label={stickerLabel}
                    $font={activeStickerGroup.stickerFont}
                    $size={getStickerSize(sticker, activeStickerGroup.stickerSize)}
                    $color={selectedColor}
                    onDragStart={(event) => handleStickerDrag(sticker, event)}
                  >
                    {stickerLabel}
                  </StickerButton>
                );
              })}
            </StickerPanel>
            <StickerTabs>
              {STICKER_GROUPS.map((group, index) => (
                <StickerTabButton
                  key={group.icon}
                  type="button"
                  $isActive={index === activeStickerGroupIndex}
                  onClick={() => setActiveStickerGroupIndex(index)}
                  aria-label={`${index + 1}번 스티커 종류`}
                >
                  <img src={group.icon} alt="" />
                </StickerTabButton>
              ))}
            </StickerTabs>
          </StickerPanelWrap>

          <BrushPanel>
            <BrushColorArea>
              <SpectrumPicker
                aria-label="브러쉬 색상"
                type="range"
                min="0"
                max="360"
                value={selectedHue}
                onChange={handleHueChange}
              />
              <TonePicker
                aria-label="브러쉬 상세 색상"
                type="range"
                min="0"
                max="100"
                value={colorTone}
                $hue={selectedHue}
                onChange={handleToneChange}
              />
            </BrushColorArea>
            <BrushToolArea>
              <BrushSizeSliderWrap>
                <BrushSizeSlider
                  aria-label="브러쉬 굵기"
                  type="range"
                  min="10"
                  max="46"
                  value={brushSize}
                  onChange={(event) => setBrushSize(Number(event.target.value))}
                />
              </BrushSizeSliderWrap>
              <BrushStyleGrid>
                {BRUSH_STYLES.map((style) => (
                  <BrushStyleButton
                    key={style.id}
                    type="button"
                    aria-label={style.label}
                    $isActive={style.id === brushType}
                    onClick={() => setBrushType(style.id)}
                  >
                    <BrushStylePreview
                      data-brush-style={style.id}
                      style={
                        {
                          "--brush-color": selectedColor,
                          "--brush-icon": `url(${style.icon})`,
                        } as React.CSSProperties
                      }
                    >
                      <img src={style.icon} alt="" draggable={false} />
                      <span aria-hidden="true" />
                    </BrushStylePreview>
                  </BrushStyleButton>
                ))}
              </BrushStyleGrid>
            </BrushToolArea>
            <BrushScrollRail />
          </BrushPanel>
        </ToolPanel>
      </WorkArea>
    </FullScreenBackground>
  );
}

function getSelectedPhotos() {
  try {
    const rawPhotos = sessionStorage.getItem("mikuraSelectedPhotos");
    const photos = rawPhotos ? JSON.parse(rawPhotos) : [];

    return Array.isArray(photos) ? photos.filter(isPhotoDataUrl).slice(0, PHOTO_SLOT_COUNT) : [];
  } catch {
    return [];
  }
}

function isPhotoDataUrl(photo: unknown): photo is string {
  return typeof photo === "string" && photo.startsWith("data:image/");
}

const GuideText = styled(ManitoText)`
  position: absolute;
  top: 8%;
  left: 50%;
  z-index: 3;
  width: min(90%, 980px);
  transform: translateX(-50%);
  text-shadow: 0 0 9.2px #f6a8dc;
  -webkit-text-stroke-width: 6px;
  -webkit-text-stroke-color: #f175a5;
  font-size: clamp(30px, 3.5vw, 42px);
`;

const TimerText = styled(MulmaruText)`
  position: absolute;
  top: 0;
  right: 0;
  z-index: 3;
  display: grid;
  width: clamp(86px, 9vw, 112px);
  height: clamp(78px, 8vw, 92px);
  place-items: center;
  border-radius: 0 0 0 52px;
  background: rgba(255, 255, 255, 0.82);
  color: rgba(253, 49, 127, 0.52);
  font-size: 36px;
  text-shadow: 0 0 8px #ff7dbd;
  -webkit-text-stroke-width: 2px;
  -webkit-text-stroke-color: #fff;
`;

const PhotoStrip = styled.div`
  position: absolute;
  top: 18%;
  left: 50%;
  z-index: 2;
  display: grid;
  width: min(86vw, 1400px);
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: clamp(16px, 2vw, 22px);
  transform: translateX(-50%);
`;

const PhotoSlot = styled.button<{ $isActive: boolean }>`
  height: clamp(92px, 11vw, 222px);
  border: ${({ $isActive }) => ($isActive ? "4px solid #ff8bc4" : "0")};
  border-radius: 14px;
  padding: 0;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 0 12px rgba(255, 151, 207, 0.45);
  overflow: hidden;
  cursor: pointer;
`;

const PhotoSlotImage = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
  -webkit-user-drag: none;
`;

const WorkArea = styled.div`
  position: absolute;
  top: 33%;
  left: 50%;
  z-index: 2;
  display: grid;
  width: min(96vw, 1480px);
  grid-template-columns: minmax(0, 900px) clamp(390px, 32vw, 520px);
  gap: clamp(0px, 0.5vw, 5px);
  align-items: stretch;
  transform: translateX(-52%);
`;

const CanvasWrap = styled.div`
  position: relative;
  aspect-ratio: 1078 / 764;
  overflow: hidden;
`;

const PhotoDecoLayer = styled.div`
  position: absolute;
  top: 16.75%;
  left: 11.22%;
  z-index: 1;
  width: 77.37%;
  height: 65.18%;
  border-radius: 5px;
  overflow: hidden;
`;

const CanvasPhoto = styled.img`
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 5px;
  user-select: none;
  -webkit-user-drag: none;
`;

const DrawingCanvas = styled.canvas`
  position: absolute;
  inset: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  border-radius: 5px;
  cursor: crosshair;
  touch-action: none;
`;

const FrameImage = styled.img`
  position: absolute;
  inset: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
`;

const FrameHistoryControls = styled.div`
  position: absolute;
  right: 19%;
  bottom: 18%;
  z-index: 8;
  display: flex;
  gap: clamp(22px, 2.4vw, 34px);
`;

const FrameHistoryButton = styled.button`
  width: clamp(34px, 3.2vw, 48px);
  height: clamp(48px, 4.6vw, 68px);
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;

  &:disabled {
    opacity: 0.38;
    cursor: default;
  }

  & > img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
  }
`;

const StickerTransformBox = styled.div<{ $width: number; $height: number; $rotation: number; $zIndex: number }>`
  position: absolute;
  z-index: ${({ $zIndex }) => $zIndex};
  display: grid;
  width: ${({ $width }) => $width}px;
  height: ${({ $height }) => $height}px;
  place-items: center;
  transform: translate(-50%, -50%) rotate(${({ $rotation }) => $rotation}deg);
  transform-origin: center;
  touch-action: none;
  cursor: move;
`;

const PlacedStickerText = styled(MulmaruText)<{ $font: StickerFont; $color: string; $height: number }>`
  position: relative;
  max-width: 100%;
  max-height: 100%;
  color: ${({ $color }) => $color};
  -webkit-text-fill-color: ${({ $color }) => $color};
  font-family: ${({ $font }) => STICKER_FONT_FAMILY[$font]};
  font-size: ${({ $height }) => Math.max(10, $height * 0.72)}px;
  font-style: normal;
  font-weight: 500;
  line-height: ${({ $font }) => ($font === "mulmaruMono" ? "normal" : "1.15")};
  text-shadow: ${({ $font }) =>
    $font === "mulmaruMono"
      ? "0 0 3.406px rgba(0, 0, 0, 0.25)"
      : `
       0 0 3.406px rgba(0, 0, 0, 0.25)
      `};
  -webkit-text-stroke-width: 0;
  -webkit-text-stroke-color: #fff;
  user-select: none;
  white-space: pre;
  -webkit-user-drag: none;
  pointer-events: none;

  ${({ $font }) =>
    $font === "mulmaruMono"
      ? `
        &::before {
          position: absolute;
          inset: 0;
          z-index: -1;
          content: attr(data-label);
          color: transparent;
          font: inherit;
          line-height: inherit;
          text-align: inherit;
          -webkit-text-fill-color: transparent;
          -webkit-text-stroke-width: 5.11px;
          -webkit-text-stroke-color: #fff;
          white-space: pre;
          pointer-events: none;
        }
      `
      : ""}
`;

const PlacedStickerImage = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  pointer-events: none;
`;

const StickerSelectionBox = styled.div`
  position: absolute;
  inset: -2px;
  border: 1.5px solid #ff78bb;
  border-radius: 3px;
  pointer-events: none;
`;

const StickerResizeHandle = styled.span<{ $position: "top-left" | "top-right" | "bottom-left" | "bottom-right" }>`
  position: absolute;
  width: 12px;
  height: 12px;
  border: 1.5px solid #ff78bb;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 0 8px rgba(255, 120, 187, 0.35);
  pointer-events: auto;
  ${({ $position }) => ($position.includes("top") ? "top: -7px;" : "bottom: -7px;")}
  ${({ $position }) => ($position.includes("left") ? "left: -7px;" : "right: -7px;")}
  cursor: ${({ $position }) => ($position === "top-left" || $position === "bottom-right" ? "nwse-resize" : "nesw-resize")};
`;

const StickerRotateHandle = styled.span`
  position: absolute;
  top: -34px;
  left: 50%;
  width: 16px;
  height: 16px;
  border: 1.5px solid #ff78bb;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 0 8px rgba(255, 120, 187, 0.35);
  transform: translateX(-50%);
  pointer-events: auto;
  cursor: grab;

  &::after {
    position: absolute;
    top: 15px;
    left: 50%;
    width: 1.5px;
    height: 18px;
    background: #ff78bb;
    content: "";
    transform: translateX(-50%);
  }
`;

const StickerDeleteButton = styled.button`
  position: absolute;
  top: -16px;
  right: -16px;
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border: 1.5px solid #ff78bb;
  border-radius: 50%;
  padding: 0;
  background: rgba(255, 255, 255, 0.98);
  color: #ff4aa7;
  font-size: 16px;
  line-height: 1;
  pointer-events: auto;
  cursor: pointer;
`;

const ToolPanel = styled.div`
  display: grid;
  height: 100%;
  grid-template-rows: minmax(0, 0.38fr) minmax(168px, 0.36fr);
  gap: clamp(24px, 0.5vw, 30px);
  transform: translate(-50px, 80px);
`;

const StickerPanel = styled.div<{ $gap: StickerGap; $layout: StickerLayout }>`
  position: relative;
  z-index: 4;
  display: ${({ $layout }) => ($layout === "wrap" ? "flex" : "grid")};
  width: 100%;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  grid-template-columns: ${({ $layout }) => {
    if ($layout === "grid") {
      return "repeat(3, minmax(0, 1fr))";
    }

    if ($layout === "imageGrid") {
      return "repeat(6, minmax(0, 1fr))";
    }

    return "none";
  }};
  flex-wrap: ${({ $layout }) => ($layout === "wrap" ? "wrap" : "nowrap")};
  gap: ${({ $gap, $layout }) =>
    $layout === "grid"
      ? "clamp(22px, 2vw, 34px) clamp(14px, 1.4vw, 24px)"
      : $layout === "imageGrid"
        ? "clamp(16px, 1.8vw, 28px) clamp(8px, 0.9vw, 16px)"
      : $gap === "loose"
        ? "clamp(14px, 1.4vw, 26px) clamp(14px, 1.5vw, 28px)"
      : "clamp(6px, 0.7vw, 12px) clamp(12px, 1.3vw, 22px)"};
  align-content: ${({ $layout }) => ($layout === "grid" ? "center" : "flex-start")};
  align-items: center;
  justify-content: ${({ $gap, $layout }) => ($layout === "wrap" && $gap === "loose" ? "center" : "flex-start")};
  justify-items: center;
  padding: clamp(13px, 1.3vw, 24px) clamp(20px, 1.9vw, 34px);
  padding-right: clamp(28px, 2.6vw, 46px);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.86);
  border-radius: 20.14px;
  box-shadow: 0 0 4.473px 0 rgba(0, 0, 0, 0.09), -2.738px -4.564px 5.477px 0 rgba(201, 122, 165, 0.25) inset, 0 1.826px 7.302px 0 rgba(255, 255, 255, 0.50) inset;
  overflow-x: hidden;
  overflow-y: auto;

  ${({ $layout }) =>
    $layout === "imageGrid"
      ? `
        padding: clamp(12px, 1.1vw, 18px) clamp(15px, 1.5vw, 24px);
        padding-right: clamp(28px, 2.4vw, 40px);
      `
      : ""}

  ${({ $layout }) =>
    $layout === "imageGrid"
      ? `
        & > :nth-child(13) { --row-spread-x: clamp(-18px, -1.4vw, -10px); }
        & > :nth-child(14) { --row-spread-x: clamp(-10px, -0.8vw, -6px); }
        & > :nth-child(15) { --row-spread-x: clamp(-4px, -0.3vw, -2px); }
        & > :nth-child(16) { --row-spread-x: clamp(4px, 0.3vw, 8px); }
        & > :nth-child(17) { --row-spread-x: clamp(10px, 0.8vw, 14px); }
        & > :nth-child(18) { --row-spread-x: clamp(18px, 1.4vw, 24px); }
      `
      : ""}

  &::-webkit-scrollbar {
    width: 7px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(118, 118, 118, 0.72);
  }
`;

const StickerPanelWrap = styled.div`
  position: relative;
  height: 100%;
  min-height: 0;
  min-width: 0;
`;

const StickerTabs = styled.div`
  position: absolute;
  top: 5px;
  right: 0;
  z-index: 2;
  display: grid;
  width: 30px;
  gap: 3px;
`;

const StickerTabButton = styled.button<{ $isActive: boolean }>`
  width: 76px;
  height: 66px;
  border: 0;
  padding: 0;
  background: transparent;
  opacity: ${({ $isActive }) => ($isActive ? 1 : 0.78)};
  transform: ${({ $isActive }) => ($isActive ? "translateX(12px)" : "translateX(0)")};
  transition: transform 160ms ease, opacity 160ms ease;
  cursor: pointer;

  & > img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const StickerButtonPair = styled.div`
  display: inline-flex;
  flex: 0 0 auto;
  gap: clamp(28px, 3vw, 52px);
  align-items: center;
  white-space: nowrap;
`;

const StickerImageButton = styled.button<{ $size: StickerSize }>`
  display: grid;
  width: ${({ $size }) => STICKER_IMAGE_BUTTON_SIZE[$size]};
  height: ${({ $size }) => STICKER_IMAGE_BUTTON_SIZE[$size]};
  place-items: center;
  border: 0;
  padding: 0;
  background: transparent;
  transform: translateX(var(--row-spread-x, 0));
  cursor: grab;

  & > img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
  }
`;

const StickerImageButtonPair = styled.div`
  display: inline-flex;
  gap: clamp(2px, 0.3vw, 6px);
  align-items: center;
  justify-content: center;
  justify-self: center;
  transform: translateX(var(--row-spread-x, 0)) translateY(clamp(-22px, -1.4vw, -14px));
`;

const StickerButton = styled.button<{ $font: StickerFont; $size: StickerSize; $color: string }>`
  flex: 0 0 auto;
  position: relative;
  justify-self: center;
  max-width: 100%;
  min-height: clamp(22px, 2.1vw, 34px);
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: ${({ $color }) => $color};
  -webkit-text-fill-color: ${({ $color }) => $color};
  font-family: ${({ $font }) => STICKER_FONT_FAMILY[$font]};
  font-size: ${({ $size }) => STICKER_BUTTON_SIZE[$size]};
  font-style: normal;
  font-weight: ${({ $font }) => ($font === "mulmaruMono" ? 500 : 700)};
  line-height: ${({ $font }) => ($font === "mulmaruMono" ? "normal" : "1.2")};
  text-shadow: ${({ $font }) =>
    $font === "mulmaruMono"
      ? "0 0 3.406px rgba(0, 0, 0, 0.25)"
      : `
        2px 0 0 #fff,
        -2px 0 0 #fff,
        0 2px 0 #fff,
        0 -2px 0 #fff
      `};
  -webkit-text-stroke-width: 0;
  -webkit-text-stroke-color: #fff;
  text-align: center;
  white-space: pre;
  cursor: grab;

  ${({ $font }) =>
    $font === "mulmaruMono"
      ? `
        &::before {
          position: absolute;
          inset: 0;
          z-index: -1;
          content: attr(data-label);
          color: transparent;
          font: inherit;
          line-height: inherit;
          text-align: inherit;
          -webkit-text-fill-color: transparent;
          -webkit-text-stroke-width: 5.11px;
          -webkit-text-stroke-color: #fff;
          white-space: pre;
          pointer-events: none;
        }
      `
      : ""}
`;

const BrushPanel = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.32fr) minmax(0, 1fr) 5px;
  gap: clamp(12px, 1.2vw, 16px);
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  min-height: 0;
  padding: clamp(14px, 1.35vw, 20px);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(255, 245, 250, 0.92)),
    #f8dfe8;
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow:
    0 10px 30px rgba(255, 120, 180, 0.16),
    inset 0 1px 2px rgba(255, 255, 255, 0.9),
    inset 0 -2px 6px rgba(255, 210, 230, 0.3);
  backdrop-filter: blur(10px);
`;

const BrushColorArea = styled.div`
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: clamp(6px, 0.7vw, 9px);
  min-height: 0;
`;

const SpectrumPicker = styled.input`
  width: 100%;
  height: 100%;
  min-height: 0;
  border-radius: 11px;
  outline: 0;
  background: linear-gradient(
    90deg,
    hsl(0 100% 50%) 0%,
    hsl(30 100% 50%) 8.333%,
    hsl(60 100% 50%) 16.666%,
    hsl(90 100% 50%) 25%,
    hsl(120 100% 50%) 33.333%,
    hsl(150 100% 50%) 41.666%,
    hsl(180 100% 50%) 50%,
    hsl(210 100% 50%) 58.333%,
    hsl(240 100% 50%) 66.666%,
    hsl(270 100% 50%) 75%,
    hsl(300 100% 50%) 83.333%,
    hsl(330 100% 50%) 91.666%,
    hsl(360 100% 50%) 100%
  );
  box-shadow:
    0 5px 12px rgba(255, 39, 157, 0.20),
    0 2px 4px rgba(255, 255, 255, 0.55) inset;
  appearance: none;
  cursor: pointer;

  &::-webkit-slider-runnable-track {
    height: 100%;
    border-radius: 11px;
    background: transparent;
  }

  &::-webkit-slider-thumb {
    width: 4px;
    height: clamp(34px, 5.8vw, 90px);
    border: 0;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 0 7px rgba(255, 255, 255, 0.92), 0 1px 3px rgba(253, 0, 165, 0.28);
    appearance: none;
  }
`;

const TonePicker = styled.input<{ $hue: number }>`
  width: 100%;
  height: 100%;
  border-radius: 11px;
  outline: 0;
  background: ${({ $hue }) => getToneGradient($hue)};
  box-shadow:
    0 5px 12px rgba(255, 39, 157, 0.17),
    0 2px 4px rgba(255, 255, 255, 0.55) inset;
  appearance: none;
  cursor: pointer;

  &::-webkit-slider-runnable-track {
    height: 100%;
    border-radius: 11px;
    background: transparent;
  }

  &::-webkit-slider-thumb {
    width: 4px;
    height: clamp(90px, 3.5vw, 45px);
    border: 0;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 0 7px rgba(255, 255, 255, 0.92), 0 1px 3px rgba(253, 0, 165, 0.28);
    appearance: none;
  }
`;

const BrushToolArea = styled.div`
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: clamp(4px, 0.5vw, 7px);
  min-width: 0;
`;

const BrushSizeSliderWrap = styled.div`
  position: relative;
  z-index: 0;
  justify-self: end;
  width: min(90%, 146px);
  height: 28px;

  &::before {
    position: absolute;
    z-index: 0;
    inset: 0 0 0 0;
    border-radius: 999px;
    background: #fde5ef;
    clip-path: polygon(6px 39%, 92% 0, 100% 0, 100% 100%, 92% 100%, 6px 62%);
    box-shadow: 0 4px 10px rgba(255, 88, 173, 0.12), 0 2px 4px rgba(255, 255, 255, 0.85) inset;
    content: "";
    pointer-events: none;
  }

  &::after {
    position: absolute;
    z-index: 0;
    top: 39%;
    left: 0;
    width: 12px;
    height: 23%;
    border-radius: 999px 0 0 999px;
    background: #fde5ef;
    content: "";
    pointer-events: none;
  }
`;

const BrushSizeSlider = styled.input`
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 28px;
  outline: 0;
  background: transparent;
  appearance: none;
  cursor: pointer;

  &::-webkit-slider-runnable-track {
    height: 28px;
    background: transparent;
  }

  &::-webkit-slider-thumb {
    width: 24px;
    height: 24px;
    margin-top: 2px;
    border: 0;
    border-radius: 50%;
    background: #f500a7;
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.68),
      0 4px 9px rgba(245, 0, 167, 0.30);
    appearance: none;
  }
`;

const BrushStyleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px 6px;
  align-content: center;
  justify-items: center;
  padding: 0 2px 8px;
`;

const BrushStyleButton = styled.button<{ $isActive: boolean }>`
  display: grid;
  width: min(100%, 42px);
  height: min(100%, 60px);
  place-items: center;
  border: 0;
  border-radius: 12px;
  background: ${({ $isActive }) => ($isActive ? "rgba(255, 255, 255, 0.58)" : "transparent")};
  backdrop-filter: blur(4px);
  box-shadow: ${({ $isActive }) =>
    $isActive
      ? `
        0 0 30px rgba(255, 105, 180, 0.18),
        inset 0 1px 3px rgba(255, 255, 255, 0.7)
      `
      : "none"};
  transition:
    background 0.15s ease,
    transform 0.12s ease,
    box-shadow 0.15s ease;
  cursor: pointer;

  &:hover {
    transform: scale(1.06);
  }

  &:active {
    transform: scale(0.96);
  }

`;

const BrushStylePreview = styled.span`
  position: relative;
  display: grid;
  width: 92%;
  height: 92%;
  place-items: center;
  pointer-events: none;

  & > img,
  & > span {
    grid-area: 1 / 1;
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
  }

  & > img {
    opacity: 0.36;
    filter: grayscale(1) contrast(1.55);
  }

  & > span {
    background: var(--brush-color);
    mask-image: var(--brush-icon);
    mask-repeat: no-repeat;
    mask-size: contain;
    mask-position: center;
    -webkit-mask-image: var(--brush-icon);
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-size: contain;
    -webkit-mask-position: center;
    mix-blend-mode: multiply;
  }

  &[data-brush-style="neon"] > img {
    opacity: 0;
  }

  &[data-brush-style="neon"] > span {
    opacity: 0.82;
    filter: blur(6px);
    mix-blend-mode: normal;
    transform: scale(1.16);
  }

  &[data-brush-style="neon"]::after {
    grid-area: 1 / 1;
    display: block;
    width: 100%;
    height: 100%;
    background: #fff;
    content: "";
    filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.9));
    mask-image: var(--brush-icon);
    mask-repeat: no-repeat;
    mask-size: contain;
    mask-position: center;
    -webkit-mask-image: var(--brush-icon);
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-size: contain;
    -webkit-mask-position: center;
    pointer-events: none;
  }
`;

const BrushScrollRail = styled.div`
  align-self: stretch;
  width: 4px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(122, 122, 122, 0.70), rgba(122, 122, 122, 0.46));
`;
