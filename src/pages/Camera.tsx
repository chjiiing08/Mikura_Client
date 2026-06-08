import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/basicBg.png";
import cameraClipMask from "../assets/cameraClipMask.png";
import cameraMask from "../assets/cameraMask.png";
import FullScreenBackground from "../components/FullScreenBackground";
import { ManitoText, MulmaruText } from "../components/PikuraText";
import Loading from "./Loading";
import styled from "styled-components";
import { BeautyFilter } from "../utils/BeautyFilter";

const TOTAL_PHOTO_COUNT = 6;
const COUNTDOWN_START = 5;
const COUNTDOWN_END = 1;
const CAPTURE_WIDTH = 1231;
const CAPTURE_HEIGHT = 714;
const SHUTTER_MOTION_DURATION = 520;

function CameraPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const beautyFilterRef = useRef<BeautyFilter | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const capturedPhotosRef = useRef<string[]>([]);
  const countdownRef = useRef(COUNTDOWN_START);
  const shutterTimeoutRef = useRef<number | null>(null);
  const navigationTimeoutRef = useRef<number | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [capturedCount, setCapturedCount] = useState(1);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isMaskReady, setIsMaskReady] = useState(false);
  const [shutterMotionKey, setShutterMotionKey] = useState(0);
  const [isShutterMotionActive, setIsShutterMotionActive] = useState(false);
  const isReady = isCameraReady && isMaskReady;

  // 카메라 스트림 시작 + BeautyFilter 초기화
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        if (isCancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        stream = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        const filter = new BeautyFilter();
        await filter.init();
        if (!isCancelled) {
          beautyFilterRef.current = filter;
        }
      } catch (error) {
        console.error("Failed to start camera", error);
        setIsCameraReady(true);
      }
    }

    startCamera();

    return () => {
      isCancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      beautyFilterRef.current = null;
    };
  }, []);

  // BeautyFilter 렌더링 루프
  useEffect(() => {
    const loop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const filter = beautyFilterRef.current;

      if (video && canvas) {
        if (filter?.isReady) {
          filter.process(video, canvas);
        } else if (video.readyState >= 2 && video.videoWidth > 0) {
          // BeautyFilter 로딩 전 fallback: 미러 영상만 표시
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            ctx.restore();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (shutterTimeoutRef.current) {
        window.clearTimeout(shutterTimeoutRef.current);
      }

      if (navigationTimeoutRef.current) {
        window.clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const playShutterMotion = useCallback(() => {
    if (shutterTimeoutRef.current) {
      window.clearTimeout(shutterTimeoutRef.current);
    }

    setShutterMotionKey((currentKey) => currentKey + 1);
    setIsShutterMotionActive(true);

    shutterTimeoutRef.current = window.setTimeout(() => {
      setIsShutterMotionActive(false);
    }, SHUTTER_MOTION_DURATION);
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;

    if (
      !video ||
      video.videoWidth === 0 ||
      video.videoHeight === 0 ||
      capturedPhotosRef.current.length >= TOTAL_PHOTO_COUNT
    ) {
      return;
    }

    playShutterMotion();

    const canvas = document.createElement("canvas");
    canvas.width = CAPTURE_WIDTH;
    canvas.height = CAPTURE_HEIGHT;

    const filter = beautyFilterRef.current;
    if (filter?.isReady) {
      filter.capture(video, canvas);
    } else {
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return;
      }

      const sourceAspect = video.videoWidth / video.videoHeight;
      const captureAspect = CAPTURE_WIDTH / CAPTURE_HEIGHT;
      const sourceWidth =
        sourceAspect > captureAspect
          ? video.videoHeight * captureAspect
          : video.videoWidth;
      const sourceHeight =
        sourceAspect > captureAspect
          ? video.videoHeight
          : video.videoWidth / captureAspect;
      const sourceX = (video.videoWidth - sourceWidth) / 2;
      const sourceY = (video.videoHeight - sourceHeight) / 2;

      ctx.translate(CAPTURE_WIDTH, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(
        video,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        CAPTURE_WIDTH,
        CAPTURE_HEIGHT,
      );
    }

    const photo = canvas.toDataURL("image/jpeg", 0.85);
    const nextPhotos = [...capturedPhotosRef.current, photo];
    capturedPhotosRef.current = nextPhotos;

    try {
      sessionStorage.setItem("mikuraPhotos", JSON.stringify(nextPhotos));
    } catch (error) {
      console.warn("Failed to save captured photos", error);
    }

    if (nextPhotos.length >= TOTAL_PHOTO_COUNT) {
      setCapturedCount(TOTAL_PHOTO_COUNT);
      navigationTimeoutRef.current = window.setTimeout(() => {
        navigate("/loading2");
      }, SHUTTER_MOTION_DURATION);
      return;
    }

    setCapturedCount(nextPhotos.length + 1);
  }, [navigate, playShutterMotion]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (countdownRef.current <= COUNTDOWN_END) {
        countdownRef.current = COUNTDOWN_START;
        setCountdown(COUNTDOWN_START);
        try {
          capturePhoto();
        } catch (error) {
          console.error("Failed to capture photo", error);
        }
        return;
      }

      const nextCount = countdownRef.current - 1;
      countdownRef.current = nextCount;
      setCountdown(nextCount);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [capturePhoto, isReady]);

  return (
    <FullScreenBackground background={bg}>
      <GuideText $isReady={isReady}>
        귀엽고 깜찍하게 포즈를 취해보세요 &gt;.&lt;
      </GuideText>
      <CameraFrame $isReady={isReady}>
        <VideoMask $mask={cameraClipMask}>
          {/* 스트림 소스용 video: 화면에는 표시 안 함 */}
          <HiddenVideo
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onCanPlay={() => setIsCameraReady(true)}
          />
          {/* BeautyFilter가 렌더링하는 canvas */}
          <CameraCanvas
            ref={canvasRef}
            width={CAPTURE_WIDTH}
            height={CAPTURE_HEIGHT}
          />
        </VideoMask>

        <MaskImage
          src={cameraMask}
          alt=""
          onLoad={() => setIsMaskReady(true)}
        />
        <CountdownText>{countdown}</CountdownText>
        <PhotoProgressText>
          {capturedCount}/{TOTAL_PHOTO_COUNT}
        </PhotoProgressText>
      </CameraFrame>
      <ShutterMotion
        key={shutterMotionKey}
        $isActive={isShutterMotionActive}
        aria-hidden="true"
      />
      {!isReady && <Loading />}
    </FullScreenBackground>
  );
}

export default CameraPage;

const CameraFrame = styled.div<{ $isReady: boolean }>`
  position: absolute;
  top: 25%;
  left: 50%;
  width: 62%;
  aspect-ratio: 1231 / 714;
  transform: translateX(-50%);
  opacity: ${({ $isReady }) => ($isReady ? 1 : 0)};

  ${({ $isReady }) =>
    $isReady
      ? `
        animation: camera-frame-ready 280ms ease both;
      `
      : ""}

  @keyframes camera-frame-ready {
    from {
      transform: translateX(-50%) scale(0.985);
    }

    to {
      transform: translateX(-50%) scale(1);
    }
  }

`;

const VideoMask = styled.div<{ $mask: string }>`
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  overflow: hidden;
  mask-image: url(${({ $mask }) => $mask});
  mask-repeat: no-repeat;
  mask-size: 100% 100%;
  mask-position: center;
  -webkit-mask-image: url(${({ $mask }) => $mask});
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100%;
  -webkit-mask-position: center;
`;

const HiddenVideo = styled.video`
  position: fixed;
  top: -9999px;
  left: -9999px;
  width: 1px;
  height: 1px;
`;

const CameraCanvas = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
`;

const CountdownText = styled(MulmaruText)`
  position: absolute;
  top: 15%;
  left: 50%;
  z-index: 3;
  transform: translateX(-50%);
  font-size: clamp(42px, 7vw, 147px);
  text-shadow:
    0 0 8px #ff7dbd,
    0 4px 0 #f175a5;
  -webkit-text-stroke-width: 3px;
  -webkit-text-stroke-color: #f175a5;
`;

const PhotoProgressText = styled(MulmaruText)`
  position: absolute;
  bottom: 4%;
  left: 50%;
  z-index: 3;
  transform: translateX(-50%);
  font-size: clamp(28px, 3.6vw, 52px);
  text-shadow:
    0 0 7px #ff7dbd,
    0 3px 0 #f175a5;
  -webkit-text-stroke-width: 2px;
  -webkit-text-stroke-color: #f175a5;
`;

const ShutterMotion = styled.div<{ $isActive: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 20;
  background: #fff;
  opacity: ${({ $isActive }) => ($isActive ? 1 : 0)};
  pointer-events: none;

  ${({ $isActive }) =>
    $isActive
      ? `
        animation: shutter-flash ${SHUTTER_MOTION_DURATION}ms ease-out both;
      `
      : ""}

  &::before {
    position: absolute;
    inset: -18%;
    content: "";
    pointer-events: none;
    background:
      radial-gradient(circle at 50% 44%, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.88) 32%, rgba(255, 226, 243, 0.42) 64%, rgba(255, 226, 243, 0) 100%);
    mix-blend-mode: screen;

    ${({ $isActive }) =>
      $isActive
        ? `
          animation: shutter-bloom ${SHUTTER_MOTION_DURATION}ms ease-out both;
        `
        : ""}
  }

  @keyframes shutter-flash {
    0% {
      opacity: 0;
    }

    8% {
      opacity: 0.9;
    }

    24% {
      opacity: 0.62;
    }

    100% {
      opacity: 0;
    }
  }

  @keyframes shutter-bloom {
    0% {
      transform: scale(0.92);
      filter: blur(0);
    }

    22% {
      transform: scale(1);
      filter: blur(1px);
    }

    100% {
      transform: scale(1.08);
      filter: blur(8px);
    }
  }
`;

const GuideText = styled(ManitoText)<{ $isReady: boolean }>`
  position: absolute;
  top: 10%;
  left: 50%;
  z-index: 3;
  width: min(90%, 920px);
  transform: translateX(-50%);
  text-shadow: 0 0 9.2px #F6A8DC;
  -webkit-text-stroke-width: 6px;
  -webkit-text-stroke-color: #F175A5;
  font-size: 60px;
  opacity: ${({ $isReady }) => ($isReady ? 1 : 0)};
`;

const MaskImage = styled.img`
  position: absolute;
  inset: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  object-fit: fill;
  transform: scale(1.070, 1.11);
  transform-origin: center;
  pointer-events: none;
`;
