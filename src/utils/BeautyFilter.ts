import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const WASM_URL  = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

type Landmark = { x: number; y: number; z: number };
type Pt       = { x: number; y: number };

const FACE_OVAL  = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
const LEFT_EYE   = [33,246,161,160,159,158,157,173,133,155,154,153,145,144,163,7];
const RIGHT_EYE  = [362,398,384,385,386,387,388,466,263,249,390,373,374,380,381,382];
const LEFT_IRIS  = [468,469,470,471,472];
const RIGHT_IRIS = [473,474,475,476,477];
const LIPS       = [61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146];

// 코 관련 랜드마크
const NOSE_TIP      = 1;    // 코 끝
// const NOSE_BOTTOM   = 2;    // 코 밑
const LEFT_NOSTRIL  = 294;  // 왼쪽 콧볼 바깥 끝
const RIGHT_NOSTRIL = 64;   // 오른쪽 콧볼 바깥 끝
// const NOSE_CENTER   = 1;    // 코 끝 (콧볼 사이 중심 기준)

export interface BeautyOptions {
  whitening   : number;   // 미백 0~1 (기본 0.4)
  smoothing   : number;   // 스무딩 0~1 (기본 0.4)
  eyeScale    : number;   // 눈 확대 1.0~1.5 (기본 1.25)
  jawSlim     : number;   // 턱 슬림 0~1 (기본 0.25)
  noseSlim    : number;   // 콧볼 축소 0~1 (기본 0.3)
  noseShorter : number;   // 코 길이 축소 0~1 (기본 0.2)
  eyeHighlight: boolean;
  debug       : boolean;
}

const DEFAULT_OPTIONS: BeautyOptions = {
  whitening   : 0.4,
  smoothing   : 0.4,
  eyeScale    : 1.25,
  jawSlim     : 0.6,
  noseSlim    : 0.6,
  noseShorter : 0.2,
  eyeHighlight: false,
  debug       : false,
};

export class BeautyFilter {
  private landmarker: FaceLandmarker | null = null;
  private lastPerfTs = 0;
  latestLandmarks: Landmark[] | null = null;
  private _ready = false;
  options: BeautyOptions = { ...DEFAULT_OPTIONS };

  get isReady() { return this._ready; }

  async init(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    this.landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numFaces: 1,
    });
    this._ready = true;
  }

  // ── 좌표 유틸 ────────────────────────────────────────────────────

  private videoCrop(video: HTMLVideoElement, cw: number, ch: number) {
    const { videoWidth: vw, videoHeight: vh } = video;
    const vA = vw / vh, cA = cw / ch;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (vA > cA) { sw = vh * cA; sx = (vw - sw) / 2; }
    else          { sh = vw / cA; sy = (vh - sh) / 2; }
    return { sx, sy, sw, sh };
  }

  private toCanvas(
    lm: Landmark,
    cw: number, ch: number,
    sx: number, sy: number,
    sw: number, sh: number,
    vw: number, vh: number
  ): Pt {
    const cx = ((lm.x * vw - sx) / sw) * cw;
    const cy = ((lm.y * vh - sy) / sh) * ch;
    return { x: cw - cx, y: cy };
  }

  private avg(pts: Pt[]): Pt {
    return {
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    };
  }

  // ── 미백/스무딩: ctx.filter 로 캔버스에 직접 적용 ────────────────
  private getVideoFilterCSS(): string {
    const { whitening, smoothing } = this.options;
    const blur       = (smoothing  * 1.2).toFixed(1);
    const brightness = (1 + whitening * 0.22).toFixed(2);
    const saturate   = (1 - whitening * 0.18).toFixed(2);
    return `blur(${blur}px) brightness(${brightness}) saturate(${saturate})`;
  }

  // ── 핵심: Bulge Warp (눈 확대 / 콧볼 축소 공용) ──────────────────
  /**
   * src → dst 로 픽셀 displacement
   * strength > 1 : 바깥으로 밀기 (확대)
   * strength < 1 : 안으로 당기기 (축소)
   * feather      : 경계 자연스럽게 감쇠
   */
  private bulgeWarp(
    src: Uint8ClampedArray,
    dst: Uint8ClampedArray,
    w: number, h: number,
    center: Pt,
    radius: number,
    strength: number,    // >1 확대, <1 축소 (uniform)
    strengthX?: number,  // x축 별도 지정 (없으면 strength 사용)
    strengthY?: number   // y축 별도 지정 (없으면 strength 사용)
  ) {
    const cx = center.x, cy = center.y;
    const r2 = radius * radius;
    const sx_ = strengthX ?? strength;
    const sy_ = strengthY ?? strength;

    const yStart = Math.max(0,  Math.floor(cy - radius));
    const yEnd   = Math.min(h,  Math.ceil (cy + radius));
    const xStart = Math.max(0,  Math.floor(cx - radius));
    const xEnd   = Math.min(w,  Math.ceil (cx + radius));

    for (let y = yStart; y < yEnd; y++) {
      for (let x = xStart; x < xEnd; x++) {
        const dx = x - cx, dy = y - cy;
        const dist2 = dx * dx + dy * dy;
        if (dist2 >= r2) continue;

        // feather: 가장자리로 갈수록 0으로 수렴 (smoothstep)
        const t       = 1 - dist2 / r2;
        const feather = t * t * (3 - 2 * t);

        // x/y 축별 warp scale 분리
        const warpScaleX = 1 + (1 / sx_ - 1) * feather;
        const warpScaleY = 1 + (1 / sy_ - 1) * feather;
        const sx = cx + dx * warpScaleX;
        const sy = cy + dy * warpScaleY;

        const x0 = Math.floor(sx), y0 = Math.floor(sy);
        const x1 = x0 + 1,        y1 = y0 + 1;
        if (x0 < 0 || y0 < 0 || x1 >= w || y1 >= h) continue;

        const fx = sx - x0, fy = sy - y0;
        const i00 = (y0 * w + x0) * 4;
        const i10 = (y0 * w + x1) * 4;
        const i01 = (y1 * w + x0) * 4;
        const i11 = (y1 * w + x1) * 4;
        const di  = (y  * w + x ) * 4;

        for (let c = 0; c < 4; c++) {
          dst[di + c] =
            src[i00 + c] * (1 - fx) * (1 - fy) +
            src[i10 + c] *      fx  * (1 - fy) +
            src[i01 + c] * (1 - fx) *      fy  +
            src[i11 + c] *      fx  *      fy;
        }
      }
    }
  }

  // ── 턱 슬림: Displacement Warp + 완전한 feather ──────────────────
  /**
   * 경계선 제거 핵심:
   * - hard clip(rect) 완전 제거
   * - y 방향 feather를 smoothstep으로 처리
   * - 영향 범위 밖 픽셀은 건드리지 않음 (src 그대로 유지)
   */
  private jawSlimWarp(
    src: Uint8ClampedArray,
    dst: Uint8ClampedArray,
    w: number, h: number,
    chin: Pt,
    faceW: number,
    faceH: number,
    strength: number
  ) {
    const effectH = faceH * 0.4;
    const topY    = chin.y - effectH;

    for (let y = Math.max(0, topY | 0); y < Math.min(h, (chin.y + 5) | 0); y++) {
      // smoothstep feather: 위쪽은 0, 아래쪽(턱)은 1
      const tRaw    = (y - topY) / effectH;
      const t       = Math.max(0, Math.min(1, tRaw));
      const feather = t * t * (3 - 2 * t);             // smoothstep
      const maxShift = faceW * 0.07 * strength * feather;

      for (let x = 0; x < w; x++) {
        const dx    = x - chin.x;
        const side  = Math.max(-1, Math.min(1, dx / (faceW * 0.5)));
        const shift = side * maxShift;

        const sx = x + shift;
        const x0 = Math.floor(sx), x1 = x0 + 1;
        if (x0 < 0 || x1 >= w) continue;

        const fx = sx - x0;
        const i0 = (y * w + x0) * 4;
        const i1 = (y * w + x1) * 4;
        const di = (y * w + x ) * 4;

        for (let c = 0; c < 4; c++) {
          dst[di + c] = src[i0 + c] * (1 - fx) + src[i1 + c] * fx;
        }
      }
    }
  }

  // ── 눈 하이라이트 ────────────────────────────────────────────────
  private applyEyeHighlight(ctx: CanvasRenderingContext2D, pt: (i: number) => Pt) {
    if (!this.options.eyeHighlight) return;
    const draw = (irisIdx: number[]) => {
      const c = this.avg(irisIdx.map(i => pt(i)));
      const grad = ctx.createRadialGradient(c.x, c.y + 7, 0, c.x, c.y + 7, 15);
      grad.addColorStop(0,   "rgba(255,255,255,0.32)");
      grad.addColorStop(0.6, "rgba(255,255,255,0.12)");
      grad.addColorStop(1,   "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + 8, 11, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    };
    draw(LEFT_IRIS);
    draw(RIGHT_IRIS);
  }

  // ── 디버그 ───────────────────────────────────────────────────────
  private drawDebug(ctx: CanvasRenderingContext2D, pt: (i: number) => Pt, cw: number, ch: number) {
    const contour = (idx: number[], color: string, close = false) => {
      ctx.beginPath();
      const f = pt(idx[0]); ctx.moveTo(f.x, f.y);
      for (let i = 1; i < idx.length; i++) { const p = pt(idx[i]); ctx.lineTo(p.x, p.y); }
      if (close) ctx.closePath();
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
    };
    const dot = (idx: number, color: string, r = 4) => {
      const p = pt(idx);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI*2);
      ctx.fillStyle = color; ctx.fill();
    };
    contour(FACE_OVAL, "rgba(255,255,255,0.7)", true);
    contour(LEFT_EYE,  "rgba(100,220,255,0.9)", true);
    contour(RIGHT_EYE, "rgba(100,220,255,0.9)", true);
    contour(LIPS,      "rgba(255,140,180,0.9)", true);
    dot(NOSE_TIP,     "rgba(255,230,80,0.95)");
    dot(LEFT_NOSTRIL,  "rgba(255,100,100,0.95)");
    dot(RIGHT_NOSTRIL, "rgba(255,100,100,0.95)");
    dot(152,           "rgba(100,255,100,0.95)"); // chin
    ctx.font = `bold ${Math.round(cw*0.035)}px sans-serif`;
    ctx.fillStyle = "rgba(80,255,160,0.9)";
    ctx.textAlign = "center";
    ctx.fillText("DEBUG", cw/2, ch*0.05);
  }

  // ── 메인 process ─────────────────────────────────────────────────
  process(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    if (video.readyState < 2 || video.videoWidth === 0) return;

    const cw = canvas.width, ch = canvas.height;
    const vw = video.videoWidth, vh = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const { sx, sy, sw, sh } = this.videoCrop(video, cw, ch);

    ctx.save();
    ctx.translate(cw, 0); ctx.scale(-1, 1);
    ctx.filter = this.getVideoFilterCSS();
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
    ctx.restore();

    // 랜드마크 감지
    if (this._ready && this.landmarker) {
      const ts = performance.now();
      if (ts - this.lastPerfTs >= 16) {
        this.lastPerfTs = ts;
        const result = this.landmarker.detectForVideo(video, ts);
        this.latestLandmarks = (result.faceLandmarks?.[0] as Landmark[]) ?? null;
      }
    }

    if (!this.latestLandmarks) {
      ctx.font = `bold ${Math.round(cw * 0.04)}px sans-serif`;
      ctx.fillStyle = "rgba(255,80,80,0.85)";
      ctx.textAlign = "center";
      ctx.fillText("얼굴을 정면으로 봐주세요", cw / 2, ch * 0.92);
      return;
    }

    const lm = this.latestLandmarks;
    const pt = (i: number): Pt => this.toCanvas(lm[i], cw, ch, sx, sy, sw, sh, vw, vh);

    const { eyeScale, jawSlim, noseSlim, noseShorter } = this.options;

    if (eyeScale > 1.0 || jawSlim > 0 || noseSlim > 0 || noseShorter > 0) {
      const imgData = ctx.getImageData(0, 0, cw, ch);
      let src = new Uint8ClampedArray(imgData.data);
      let dst = new Uint8ClampedArray(src);   // src 복사본에서 시작

      // 1. 눈 확대 (Bulge)
      if (eyeScale > 1.0) {
        const leftCenter  = this.avg(LEFT_IRIS.map(i => pt(i)));
        const rightCenter = this.avg(RIGHT_IRIS.map(i => pt(i)));
        const eyeR = (center: Pt, eyeIdx: number[]) =>
          Math.max(...eyeIdx.map(i => {
            const p = pt(i);
            return Math.sqrt((p.x - center.x) ** 2 + (p.y - center.y) ** 2);
          })) * 2.8;

        // x축(옆): eyeScale 보다 약하게 / y축(위아래): eyeScale 그대로
        const scaleX = 1 + (eyeScale - 1) * 0.4;  // 옆은 35%만
        const scaleY = eyeScale*1.1;                     // 위아래는 100%
        this.bulgeWarp(src, dst, cw, ch, leftCenter,  eyeR(leftCenter,  LEFT_EYE),  eyeScale, scaleX, scaleY);
        this.bulgeWarp(src, dst, cw, ch, rightCenter, eyeR(rightCenter, RIGHT_EYE), eyeScale, scaleX, scaleY);
        src = new Uint8ClampedArray(dst); // 다음 단계 입력으로
      }

      // 2. 콧볼 축소 — 양쪽 콧볼 바깥점 사이 중심 기준
      if (noseSlim > 0) {
        const leftNostril  = pt(LEFT_NOSTRIL);
        const rightNostril = pt(RIGHT_NOSTRIL);

        // 중심: 콧볼 바깥점 사이 x 중간, y는 콧볼 실제 높이
        const noseCenter: Pt = {
          x: (leftNostril.x + rightNostril.x) / 2,
          y: (leftNostril.y + rightNostril.y) / 2,
        };

        // 반경: 콧볼 너비의 0.6배 (콧망울까지 안 닿게)
        const nostrilW   = Math.abs(rightNostril.x - leftNostril.x);
        const noseRadius = nostrilW * 0.6;
        const shrink     = 1 - noseSlim * 0.4;

        this.bulgeWarp(src, dst, cw, ch, noseCenter, noseRadius, shrink);
        src = new Uint8ClampedArray(dst);
      }

      // 3. 코 길이 축소 (코 끝을 위로 당기기)
      if (noseShorter > 0) {
        const noseTip = pt(NOSE_TIP);
        const noseShortRadius = Math.abs(pt(6).y - pt(168).y) * 1.8;
        // 위쪽으로 당기는 효과: y 중심을 코 위쪽으로 올린 center 사용
        const noseTopCenter: Pt = { x: noseTip.x, y: noseTip.y - noseShortRadius * 0.3 };
        const shrinkY = 1 - noseShorter * 0.15;

        this.bulgeWarp(src, dst, cw, ch, noseTopCenter, noseShortRadius, shrinkY);
        src = new Uint8ClampedArray(dst);
      }

      // 4. 턱 슬림 (경계선 없는 버전)
      if (jawSlim > 0) {
        const chin  = pt(152);
        const left  = pt(234), right = pt(454), top = pt(10);
        const faceW = Math.abs(right.x - left.x);
        const faceH = Math.abs(chin.y  - top.y);
        this.jawSlimWarp(src, dst, cw, ch, chin, faceW, faceH, jawSlim);
      }

      imgData.data.set(dst);
      ctx.putImageData(imgData, 0, 0);
    }

    // 눈 하이라이트
    this.applyEyeHighlight(ctx, pt);

    if (this.options.debug) this.drawDebug(ctx, pt, cw, ch);
  }

  capture(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    this.process(video, canvas);
  }
}
