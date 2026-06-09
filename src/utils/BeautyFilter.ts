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
const LEFT_NOSTRIL  = 294;  // 왼쪽 콧볼 바깥 끝
const RIGHT_NOSTRIL = 64;   // 오른쪽 콧볼 바깥 끝

export interface BeautyOptions {
  whitening   : number;   // 미백 0~1 (기본 0.4)
  smoothing   : number;   // 스무딩 0~1 (기본 0.4)
  eyeScale    : number;   // 눈 확대 1.0~1.5 (기본 1.25)
  jawSlim     : number;   // 턱 슬림 0~1 (기본 0.25)
  noseSlim    : number;   // 콧볼 축소 0~1 (기본 0.3)
  noseShorter : number;   // 코 길이 축소 0~1 (기본 0.2)
  lipTint     : number;   // 입술 핑크 틴트 0~1
  lipGloss    : number;   // 입술 광택 0~1
  blushStrength: number;  // 볼터치 0~1
  irisScale   : number;   // 눈동자 확대 1.0~1.4
  eyeSparkle  : boolean;  // 프리쿠라 눈 반짝임
  aegyoSal    : number;   // 애교살 0~1
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
  lipTint     : 0.45,
  lipGloss    : 0.35,
  blushStrength: 0.35,
  irisScale   : 1.12,
  eyeSparkle  : true,
  aegyoSal    : 0.35,
  eyeHighlight: false,
  debug       : false,
};

export class BeautyFilter {
  private landmarker: FaceLandmarker | null = null;
  private lastPerfTs = 0;
  private detectFrame = 0;
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

  private polygonBounds(poly: Pt[], w: number, h: number) {
    const xs = poly.map(p => p.x);
    const ys = poly.map(p => p.y);
    return {
      x0: Math.max(0, Math.floor(Math.min(...xs))),
      x1: Math.min(w, Math.ceil(Math.max(...xs))),
      y0: Math.max(0, Math.floor(Math.min(...ys))),
      y1: Math.min(h, Math.ceil(Math.max(...ys))),
    };
  }

  private drawPath(ctx: CanvasRenderingContext2D, pts: Pt[], close = true) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (close) ctx.closePath();
  }

  // ── 전체 화면 톤업: 프리쿠라처럼 밝고 뽀얗게 ────────────────────
  private getVideoFilterCSS(): string {
    const { smoothing } = this.options;
    const blur = Math.min(0.8, smoothing * 0.45).toFixed(2);
    return `brightness(1.22) contrast(1.04) saturate(1.18) blur(${blur}px)`;
  }

  // ── 가벼운 뽀얀 피부 느낌: 전체 화면에 연핑크 screen overlay ──────
  private applySoftPurikuraOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "rgba(255,235,245,1)";
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = "rgba(255,245,250,1)";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // ── 입술 메이크업: 핑크 틴트 + 채도 + 광택 ───────────────────────
  private applyLipMakeup(ctx: CanvasRenderingContext2D, pt: (i: number) => Pt) {
    const { lipTint, lipGloss } = this.options;
    if (lipTint <= 0 && lipGloss <= 0) return;

    const lips = LIPS.map(i => pt(i));
    const c = this.avg(lips);
    const bounds = this.polygonBounds(lips, ctx.canvas.width, ctx.canvas.height);
    const lipW = bounds.x1 - bounds.x0;
    const lipH = Math.max(1, bounds.y1 - bounds.y0);

    ctx.save();
    this.drawPath(ctx, lips);
    ctx.clip();

    if (lipTint > 0) {
      ctx.globalCompositeOperation = "soft-light";
      ctx.fillStyle = `rgba(255, 70, 135, ${0.32 * lipTint})`;
      ctx.fillRect(bounds.x0, bounds.y0, lipW, lipH);

      ctx.globalCompositeOperation = "source-over";
      const tint = ctx.createRadialGradient(c.x, c.y, 1, c.x, c.y, Math.max(lipW, lipH) * 0.55);
      tint.addColorStop(0, `rgba(255, 96, 155, ${0.26 * lipTint})`);
      tint.addColorStop(1, `rgba(210, 34, 92, ${0.12 * lipTint})`);
      ctx.fillStyle = tint;
      ctx.fillRect(bounds.x0, bounds.y0, lipW, lipH);
    }

    if (lipGloss > 0) {
      const gloss = ctx.createRadialGradient(c.x, c.y - lipH * 0.18, 0, c.x, c.y - lipH * 0.18, lipW * 0.38);
      gloss.addColorStop(0, `rgba(255,255,255,${0.35 * lipGloss})`);
      gloss.addColorStop(0.45, `rgba(255,230,238,${0.16 * lipGloss})`);
      gloss.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gloss;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y - lipH * 0.12, lipW * 0.24, lipH * 0.23, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ── 볼터치: 양 볼에 핑크/코랄 radial gradient ───────────────────
  private applyBlush(ctx: CanvasRenderingContext2D, pt: (i: number) => Pt) {
    const { blushStrength } = this.options;
    if (blushStrength <= 0) return;

    const leftCheek = this.avg([pt(50), pt(205), pt(187)]);
    const rightCheek = this.avg([pt(280), pt(425), pt(411)]);
    const faceW = Math.abs(pt(454).x - pt(234).x);
    const rx = faceW * 0.16;
    const ry = faceW * 0.095;

    const draw = (c: Pt, coral: boolean) => {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(coral ? -0.08 : 0.08);
      ctx.scale(1, ry / rx);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      grad.addColorStop(0, coral ? `rgba(255,125,105,${0.24 * blushStrength})` : `rgba(255,102,156,${0.24 * blushStrength})`);
      grad.addColorStop(0.52, coral ? `rgba(255,150,125,${0.13 * blushStrength})` : `rgba(255,145,180,${0.13 * blushStrength})`);
      grad.addColorStop(1, "rgba(255,170,190,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    draw(leftCheek, false);
    draw(rightCheek, true);
    ctx.restore();
  }

  // ── 눈 보정 강화: 흰자/애교살/속눈썹/반짝임 ─────────────────────
  private applyEyeMakeup(ctx: CanvasRenderingContext2D, pt: (i: number) => Pt) {
    const { aegyoSal, eyeSparkle } = this.options;
    const drawEye = (eyeIdx: number[], irisIdx: number[], flip: number) => {
      const eye = eyeIdx.map(i => pt(i));
      const iris = irisIdx.map(i => pt(i));
      const c = this.avg(iris);
      const bounds = this.polygonBounds(eye, ctx.canvas.width, ctx.canvas.height);
      const eyeW = bounds.x1 - bounds.x0;
      const eyeH = Math.max(1, bounds.y1 - bounds.y0);

      // 눈 흰자 밝기 증가.
      ctx.save();
      this.drawPath(ctx, eye);
      ctx.clip();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(bounds.x0, bounds.y0, eyeW, eyeH);
      ctx.restore();

      if (aegyoSal > 0) {
        const salY = bounds.y1 + eyeH * 0.42;
        const grad = ctx.createRadialGradient(c.x, salY, 0, c.x, salY, eyeW * 0.52);
        grad.addColorStop(0, `rgba(255,238,232,${0.22 * aegyoSal})`);
        grad.addColorStop(0.42, `rgba(255,208,216,${0.11 * aegyoSal})`);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(c.x, salY, eyeW * 0.42, eyeH * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(170,105,112,${0.10 * aegyoSal})`;
        ctx.lineWidth = Math.max(1, eyeH * 0.045);
        ctx.beginPath();
        ctx.ellipse(c.x, salY + eyeH * 0.34, eyeW * 0.38, eyeH * 0.20, 0, Math.PI * 0.08, Math.PI * 0.92);
        ctx.stroke();
      }

      // 속눈썹이 길어 보이도록 위쪽 눈꺼풀에서 짧은 라인을 뻗음.
      const lashPts = eye.slice(1, 8);
      ctx.save();
      ctx.strokeStyle = "rgba(35,22,26,0.42)";
      ctx.lineWidth = Math.max(1, eyeH * 0.055);
      ctx.lineCap = "round";
      lashPts.forEach((p, idx) => {
        if (idx % 2 !== 0) return;
        const out = 4 + eyeH * 0.22;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + flip * out * 0.22, p.y - out);
        ctx.stroke();
      });
      ctx.restore();

      if (eyeSparkle || this.options.eyeHighlight) {
        const sparkle = ctx.createRadialGradient(c.x - eyeW * 0.09, c.y - eyeH * 0.18, 0, c.x - eyeW * 0.09, c.y - eyeH * 0.18, eyeW * 0.18);
        sparkle.addColorStop(0, "rgba(255,255,255,0.72)");
        sparkle.addColorStop(0.36, "rgba(255,255,255,0.28)");
        sparkle.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = sparkle;
        ctx.beginPath();
        ctx.arc(c.x - eyeW * 0.09, c.y - eyeH * 0.18, eyeW * 0.18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.82)";
        ctx.beginPath();
        ctx.arc(c.x + eyeW * 0.10, c.y - eyeH * 0.12, Math.max(1.5, eyeH * 0.11), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    drawEye(LEFT_EYE, LEFT_IRIS, -1);
    drawEye(RIGHT_EYE, RIGHT_IRIS, 1);
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
    this.applySoftPurikuraOverlay(ctx, cw, ch);

    // 랜드마크 감지: 매 프레임 실행하지 않고 캐시된 결과를 재사용해서 렉을 줄임.
    if (this._ready && this.landmarker) {
      this.detectFrame = (this.detectFrame + 1) % 3;
      const shouldDetect = this.detectFrame === 0;
      const ts = performance.now();
      if (shouldDetect && ts - this.lastPerfTs >= 45) {
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

    // 메이크업/프리쿠라 레이어
    this.applyBlush(ctx, pt);
    this.applyLipMakeup(ctx, pt);
    this.applyEyeMakeup(ctx, pt);

    if (this.options.debug) this.drawDebug(ctx, pt, cw, ch);
  }

  capture(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    this.process(video, canvas);
  }
}
