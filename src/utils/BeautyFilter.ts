import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { Delaunay } from "d3-delaunay";
import fx from "glfx";

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

type Point = { x: number; y: number };

// ── 코 슬림 (양쪽 콧볼을 중심으로 당기기) ───────────────────────────
const noseSlimWarp = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  leftNose: Point,
  rightNose: Point,
  noseCenter: Point,
  faceWidth: number,
  strength: number,
) => {
  const src = ctx.getImageData(0, 0, width, height);
  const dst = ctx.getImageData(0, 0, width, height);
  const s = src.data;
  const d = dst.data;

  const applySide = (center: Point, targetX: number) => {
    const radiusX = faceWidth * 0.12;
    const radiusY = faceWidth * 0.16;
    const minX = Math.max(0, Math.floor(center.x - radiusX));
    const maxX = Math.min(width, Math.ceil(center.x + radiusX));
    const minY = Math.max(0, Math.floor(center.y - radiusY));
    const maxY = Math.min(height, Math.ceil(center.y + radiusY));

    for (let y = minY; y < maxY; y++) {
      for (let x = minX; x < maxX; x++) {
        const dx = (x - center.x) / radiusX;
        const dy = (y - center.y) / radiusY;
        const dist = dx * dx + dy * dy;
        if (dist > 1) continue;
        const t = 1 - dist;
        const weight = t * t * (3 - 2 * t) * strength;
        const pullX = targetX - center.x;
        const srcX = Math.round(x - pullX * weight);
        const srcY = y;
        if (srcX < 0 || srcX >= width) continue;
        const di = (y * width + x) * 4;
        const si = (srcY * width + srcX) * 4;
        d[di] = s[si];
        d[di + 1] = s[si + 1];
        d[di + 2] = s[si + 2];
        d[di + 3] = s[si + 3];
      }
    }
  };

  applySide(leftNose, noseCenter.x);
  applySide(rightNose, noseCenter.x);
  ctx.putImageData(dst, 0, 0);
};

// ── 코 단축 (아래쪽 픽셀을 위로 당기기) ─────────────────────────────
const midFaceWarp = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  center: Point,
  faceWidth: number,
  strength: number,
) => {
  const src = ctx.getImageData(0, 0, width, height);
  const dst = ctx.getImageData(0, 0, width, height);
  const s = src.data;
  const d = dst.data;
  const radiusX = faceWidth * 0.18;
  const radiusY = faceWidth * 0.14;
  const minX = Math.max(0, Math.floor(center.x - radiusX));
  const maxX = Math.min(width, Math.ceil(center.x + radiusX));
  const minY = Math.max(0, Math.floor(center.y - radiusY));
  const maxY = Math.min(height, Math.ceil(center.y + radiusY));

  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      const dx = (x - center.x) / radiusX;
      const dy = (y - center.y) / radiusY;
      const dist = dx * dx + dy * dy;
      if (dist > 1) continue;
      const t = 1 - dist;
      const weight = t * t * (3 - 2 * t) * strength;
      const srcX = x;
      const srcY = Math.round(y + radiusY * 0.25 * weight);
      if (srcY < 0 || srcY >= height) continue;
      const di = (y * width + x) * 4;
      const si = (srcY * width + srcX) * 4;
      d[di] = s[si];
      d[di + 1] = s[si + 1];
      d[di + 2] = s[si + 2];
      d[di + 3] = s[si + 3];
    }
  }
  ctx.putImageData(dst, 0, 0);
};

// ── 바이리니어 샘플링 ────────────────────────────────────────────────
const sampleBilinear = (
  src: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  out: Uint8ClampedArray,
  di: number,
) => {
  const x0 = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(y)));
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const i00 = (y0 * width + x0) * 4;
  const i10 = (y0 * width + x1) * 4;
  const i01 = (y1 * width + x0) * 4;
  const i11 = (y1 * width + x1) * 4;
  for (let c = 0; c < 4; c++) {
    const top = src[i00 + c] * (1 - tx) + src[i10 + c] * tx;
    const bottom = src[i01 + c] * (1 - tx) + src[i11 + c] * tx;
    out[di + c] = top * (1 - ty) + bottom * ty;
  }
};

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

// ── 얼굴형/턱 슬림 (Delaunay 삼각분할 기반) ─────────────────────────
const faceSlimWarp = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  landmarks: Point[],
  faceCenter: Point,
  faceWidth: number,
  strength: number,
  chinSquish: number = 0.07,
) => {
  const src = ctx.getImageData(0, 0, width, height);
  const dst = ctx.getImageData(0, 0, width, height);
  const s = src.data;
  const d = dst.data;

  const leftContour = [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152];
  const rightContour = [454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152];
  const movingContour = Array.from(new Set([...leftContour, ...rightContour]));
  const chin = landmarks[152];

  const contourPoints = movingContour.map((idx) => landmarks[idx]);
  const minX = Math.max(
    0,
    Math.floor(Math.min(...contourPoints.map((p) => p.x)) - faceWidth * 0.35),
  );
  const maxX = Math.min(
    width,
    Math.ceil(Math.max(...contourPoints.map((p) => p.x)) + faceWidth * 0.35),
  );
  const minY = Math.max(
    0,
    Math.floor(Math.min(...contourPoints.map((p) => p.y)) - faceWidth * 0.3),
  );
  const maxY = Math.min(height, Math.ceil(chin.y + faceWidth * 0.18));

  const cheekTopY =
    (landmarks[234].y +
      landmarks[454].y +
      landmarks[93].y +
      landmarks[323].y) /
    4;
  const lowerFaceHeight = Math.max(1, chin.y - cheekTopY);

  type ControlPoint = { src: Point; dst: Point };

  const getSlimWeight = (point: Point) => {
    const vertical = Math.min(
      1,
      Math.max(0, (point.y - cheekTopY) / lowerFaceHeight),
    );
    const cheekIn = smoothstep(0, 0.18, vertical);
    const jawBuild = 0.55 + 0.45 * smoothstep(0.2, 0.62, vertical);
    const chinRelease = 1 - smoothstep(0.82, 1, vertical);
    return cheekIn * jawBuild * chinRelease;
  };

  const controls: ControlPoint[] = [];
  const usedLandmarks = new Set<number>();

  const addControl = (srcPoint: Point, dstPoint = srcPoint) => {
    controls.push({ src: srcPoint, dst: dstPoint });
  };

  movingContour.forEach((idx) => {
    usedLandmarks.add(idx);
    if (idx === 152) {
      const upward = lowerFaceHeight * chinSquish;
      addControl(landmarks[idx], { x: landmarks[idx].x, y: landmarks[idx].y - upward });
      return;
    }
    const point = landmarks[idx];
    const side = point.x < faceCenter.x ? -1 : 1;
    const vertical = Math.min(1, Math.max(0, (point.y - cheekTopY) / lowerFaceHeight));
    const horizontalDistance = Math.abs(point.x - faceCenter.x);
    const inward = horizontalDistance * strength * getSlimWeight(point);
    const upward = lowerFaceHeight * chinSquish * smoothstep(0.4, 1, vertical);
    addControl(point, { x: point.x - side * inward, y: point.y - upward });
  });

  [
    10, 67, 109, 151, 338, 297, 33, 133, 159, 145, 362, 263, 386, 374, 1, 2,
    4, 5, 6, 168, 197, 61, 291, 13, 14, 17, 78, 308,
  ].forEach((idx) => {
    if (!usedLandmarks.has(idx)) addControl(landmarks[idx]);
  });

  [
    { x: minX, y: minY },
    { x: (minX + maxX) / 2, y: minY },
    { x: maxX, y: minY },
    { x: minX, y: (minY + maxY) / 2 },
    { x: maxX, y: (minY + maxY) / 2 },
    { x: minX, y: maxY },
    { x: (minX + maxX) / 2, y: maxY },
    { x: maxX, y: maxY },
  ].forEach((point) => addControl(point));

  const dstPoints = controls.map((control) => control.dst);
  const delaunay = Delaunay.from(
    dstPoints,
    (p) => p.x,
    (p) => p.y,
  );

  const getBarycentric = (point: Point, a: Point, b: Point, c: Point) => {
    const v0x = b.x - a.x,
      v0y = b.y - a.y;
    const v1x = c.x - a.x,
      v1y = c.y - a.y;
    const v2x = point.x - a.x,
      v2y = point.y - a.y;
    const den = v0x * v1y - v1x * v0y;
    if (Math.abs(den) < 0.0001) return null;
    const v = (v2x * v1y - v1x * v2y) / den;
    const w = (v0x * v2y - v2x * v0y) / den;
    const u = 1 - v - w;
    if (u < -0.001 || v < -0.001 || w < -0.001) return null;
    return { u, v, w };
  };

  for (let i = 0; i < delaunay.triangles.length; i += 3) {
    const ia = delaunay.triangles[i];
    const ib = delaunay.triangles[i + 1];
    const ic = delaunay.triangles[i + 2];
    const da = controls[ia].dst,
      db = controls[ib].dst,
      dc = controls[ic].dst;
    const sa = controls[ia].src,
      sb = controls[ib].src,
      sc = controls[ic].src;

    const triMinX = Math.max(0, Math.floor(Math.min(da.x, db.x, dc.x)));
    const triMaxX = Math.min(
      width - 1,
      Math.ceil(Math.max(da.x, db.x, dc.x)),
    );
    const triMinY = Math.max(0, Math.floor(Math.min(da.y, db.y, dc.y)));
    const triMaxY = Math.min(
      height - 1,
      Math.ceil(Math.max(da.y, db.y, dc.y)),
    );

    for (let y = triMinY; y <= triMaxY; y++) {
      for (let x = triMinX; x <= triMaxX; x++) {
        if (x < minX || x > maxX || y < minY || y > maxY) continue;
        const barycentric = getBarycentric({ x, y }, da, db, dc);
        if (!barycentric) continue;
        const srcX =
          sa.x * barycentric.u + sb.x * barycentric.v + sc.x * barycentric.w;
        const srcY =
          sa.y * barycentric.u + sb.y * barycentric.v + sc.y * barycentric.w;
        if (srcX < 0 || srcX >= width || srcY < 0 || srcY >= height) continue;
        const di = (y * width + x) * 4;
        sampleBilinear(s, width, height, srcX, srcY, d, di);
      }
    }
  }

  ctx.putImageData(dst, 0, 0);
};

// ── BeautyFilter 클래스 ──────────────────────────────────────────────
export class BeautyFilter {
  private landmarker: FaceLandmarker | null = null;
  private _ready = false;
  private fxCanvas: import("glfx").FxCanvas | null = null;
  private sourceCanvas: HTMLCanvasElement | null = null;

  get isReady() {
    return this._ready;
  }

  async init(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    this.landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numFaces: 4,
    });
    this.fxCanvas = fx.canvas();
    this.sourceCanvas = document.createElement("canvas");
    this._ready = true;
  }

  process(video: HTMLVideoElement, canvas: HTMLCanvasElement, intensity = 1) {
    if (video.readyState < 2 || video.videoWidth === 0) return;

    const { fxCanvas, sourceCanvas, landmarker } = this;
    if (!fxCanvas || !sourceCanvas || !landmarker) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // 비디오를 캔버스 크기에 맞게 크롭
    const vA = vw / vh;
    const cA = cw / ch;
    let sx = 0,
      sy = 0,
      sw = vw,
      sh = vh;
    if (vA > cA) {
      sw = vh * cA;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / cA;
      sy = (vh - sh) / 2;
    }

    sourceCanvas.width = cw;
    sourceCanvas.height = ch;

    const ctx = sourceCanvas.getContext("2d", { willReadFrequently: true });
    const outCtx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || !outCtx) return;

    // 1. 미러 반전 + 크롭하여 sourceCanvas에 그리기
    ctx.save();
    ctx.translate(cw, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
    ctx.restore();

    // 2. 랜드마크 감지
    const result = landmarker.detectForVideo(sourceCanvas, performance.now());

    // 3. glfx로 눈 확대
    const texture = fxCanvas.texture(sourceCanvas);
    fxCanvas.draw(texture);

    const avgPoint = (p: typeof result.faceLandmarks[0], indices: number[]): Point => {
      let x = 0, y = 0;
      indices.forEach((idx) => {
        x += p[idx].x * cw;
        y += p[idx].y * ch;
      });
      return { x: x / indices.length, y: y / indices.length };
    };

    if (result.faceLandmarks.length > 0) {
      // 3. glfx로 모든 얼굴 눈 확대 한 번에 처리
      let fxChain = fxCanvas.draw(texture);
      result.faceLandmarks.forEach((p) => {
        const faceWidth = Math.abs(p[234].x - p[454].x) * cw;
        const leftEye = avgPoint(p, [33, 133, 159, 145, 160, 158, 153, 144]);
        const rightEye = avgPoint(p, [362, 263, 386, 374, 387, 385, 380, 373]);
        fxChain = fxChain
          .bulgePinch(leftEye.x, leftEye.y, faceWidth * 0.18, 0.28 * intensity)
          .bulgePinch(rightEye.x, rightEye.y, faceWidth * 0.18, 0.28 * intensity);
      });
      fxChain.update();

      outCtx.clearRect(0, 0, cw, ch);
      outCtx.drawImage(fxCanvas as unknown as HTMLCanvasElement, 0, 0, cw, ch);

      // 4-6. 각 얼굴마다 코 슬림 → 얼굴형 슬림 → 코 단축 순으로 적용
      result.faceLandmarks.forEach((p) => {
        const faceWidth = Math.abs(p[234].x - p[454].x) * cw;
        const faceCenter = avgPoint(p, [1, 168, 197]);

        const leftNose = avgPoint(p, [114, 98, 129]);
        const rightNose = avgPoint(p, [343, 327, 358]);
        const noseCenter = avgPoint(p, [1, 2, 168]);
        noseSlimWarp(outCtx, cw, ch, leftNose, rightNose, noseCenter, faceWidth, 0.12 * intensity);

        const landmarks = p.map((point) => ({ x: point.x * cw, y: point.y * ch }));
        faceSlimWarp(outCtx, cw, ch, landmarks, faceCenter, faceWidth, 0.1 * intensity, 0.07 * intensity);

        const underEye = avgPoint(p, [145, 159, 374, 386]);
        const noseTip = { x: p[1].x * cw, y: p[1].y * ch };
        const midFaceCenter = {
          x: noseTip.x,
          y: underEye.y + (noseTip.y - underEye.y) * 0.65,
        };
        midFaceWarp(outCtx, cw, ch, midFaceCenter, faceWidth, 0.15 * intensity);
      });
    } else {
      fxCanvas.update();
      outCtx.clearRect(0, 0, cw, ch);
      outCtx.drawImage(fxCanvas as unknown as HTMLCanvasElement, 0, 0, cw, ch);
    }

    texture.destroy();
  }

  capture(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    this.process(video, canvas);
  }
}
