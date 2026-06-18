import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import bg from "../assets/basicBg.png";
import gayPng from "../assets/gay.png";
import cameraClipMask from "../assets/cameraClipMask.png";
import cameraMask from "../assets/cameraMask.png";
import FullScreenBackground from "../components/FullScreenBackground";
import { ManitoText, MulmaruText } from "../components/PikuraText";
import { BeautyFilter } from "../utils/BeautyFilter";
import Loading from "./Loading";

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

  const capturedPhotosRef = useRef<string[]>([]);
  const countdownRef = useRef(COUNTDOWN_START);
  const shutterTimeoutRef = useRef<number | null>(null);
  const navigationTimeoutRef = useRef<number | null>(null);

  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [capturedCount, setCapturedCount] = useState(1);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isMaskReady, setIsMaskReady] = useState(false);
  const [isBeautyReady, setIsBeautyReady] = useState(false);
  const [shutterMotionKey, setShutterMotionKey] = useState(0);
  const [isShutterMotionActive, setIsShutterMotionActive] = useState(false);
  const [beautyIntensity, setBeautyIntensity] = useState(100);
  const beautyIntensityRef = useRef(1);

  const isReady = isCameraReady && isMaskReady && isBeautyReady;

  useEffect(() => {
    const filter = new BeautyFilter();
    beautyFilterRef.current = filter;

    filter
      .init()
      .then(() => setIsBeautyReady(true))
      .catch((error) => {
        console.error("Failed to init beauty filter", error);
        setIsBeautyReady(true);
      });
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let isCancelled = false;

    async function startCamera() {
      try {
        // 외부 웹캠 우선 선택: 연결된 카메라 목록에서 내장 카메라 이외의 장치를 찾음
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        // 내장 카메라는 보통 label에 "integrated" / "facetime" / "isight" 포함
        const externalCam = videoDevices.find(
          (d) =>
            !/(integrated|facetime|isight|built-?in)/i.test(d.label) &&
            d.deviceId !== "",
        );

        const videoConstraint: MediaTrackConstraints = externalCam
          ? { deviceId: { exact: externalCam.deviceId } }
          : { facingMode: "user" };

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraint,
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
      } catch (error) {
        console.error("Failed to start camera", error);
        setIsCameraReady(true);
      }
    }

    startCamera();

    return () => {
      isCancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    let frameId = 0;

    const renderCamera = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const beautyFilter = beautyFilterRef.current;

      if (
        video &&
        canvas &&
        beautyFilter &&
        beautyFilter.isReady &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        if (canvas.width !== CAPTURE_WIDTH) canvas.width = CAPTURE_WIDTH;
        if (canvas.height !== CAPTURE_HEIGHT) canvas.height = CAPTURE_HEIGHT;

        beautyFilter.process(video, canvas, beautyIntensityRef.current);
      }

      frameId = window.requestAnimationFrame(renderCamera);
    };

    renderCamera();

    return () => {
      window.cancelAnimationFrame(frameId);
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
    const canvas = canvasRef.current;

    if (
      !canvas ||
      canvas.width === 0 ||
      canvas.height === 0 ||
      capturedPhotosRef.current.length >= TOTAL_PHOTO_COUNT
    ) {
      return;
    }

    playShutterMotion();

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
    if (!isReady) return;

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
          <CameraVideo
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onCanPlay={() => setIsCameraReady(true)}
          />

          <BeautyCanvas ref={canvasRef} />
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

      <BeautySliderWrap $isReady={isReady}>
        <BeautySliderLabel>보정</BeautySliderLabel>
        <BeautySliderBox>
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ display: "block" }}>
            <defs>
              <filter id="beauty-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* 배경 링 */}
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="9"
              strokeLinecap="round"
            />
            {/* 진행 링 (반시계 → 시계 방향, 상단 시작) */}
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke="rgba(255,255,255,0.95)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 52}
              strokeDashoffset={2 * Math.PI * 52 * (1 - beautyIntensity / 100)}
              transform="rotate(-90 60 60)"
              filter="url(#beauty-glow)"
            />
          </svg>
          <BeautyKitty src={gayPng} alt="보정" />
          <BeautyHiddenInput
            type="range"
            min="0"
            max="100"
            value={beautyIntensity}
            aria-label="보정 강도"
            onChange={(e) => {
              const val = Number(e.target.value);
              setBeautyIntensity(val);
              beautyIntensityRef.current = val / 100;
            }}
          />
        </BeautySliderBox>
        <BeautySliderValue>{beautyIntensity}%</BeautySliderValue>
      </BeautySliderWrap>

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

const CameraVideo = styled.video`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  pointer-events: none;
`;

const BeautyCanvas = styled.canvas`
  position: absolute;
  inset: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
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

const BeautySliderWrap = styled.div<{ $isReady: boolean }>`
  position: absolute;
  top: 50%;
  right: 4%;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  transform: translateY(-50%);
  opacity: ${({ $isReady }) => ($isReady ? 1 : 0)};
  transition: opacity 300ms ease;
`;

const BeautySliderLabel = styled(MulmaruText)`
  color: rgba(255, 255, 255, 0.92);
  font-size: 17px;
  text-shadow:
    0 0 8px rgba(255, 255, 255, 0.9),
    0 0 18px rgba(255, 200, 230, 0.6);
  white-space: nowrap;
`;

const BeautySliderValue = styled(MulmaruText)`
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  text-shadow:
    0 0 6px rgba(255, 255, 255, 0.8),
    0 0 14px rgba(255, 200, 230, 0.5);
`;

const BeautySliderBox = styled.div`
  position: relative;
  width: 120px;
  height: 120px;
`;

const BeautyKitty = styled.img`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 72px;
  height: 72px;
  transform: translate(-50%, -50%);
  object-fit: contain;
  pointer-events: none;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.7));
`;

const BeautyHiddenInput = styled.input`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  opacity: 0;
  writing-mode: vertical-lr;
  direction: rtl;
  cursor: pointer;
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
