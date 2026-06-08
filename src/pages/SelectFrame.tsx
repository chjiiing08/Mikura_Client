import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import bg from "../assets/basicBg.png";
import basicFrame1 from "../assets/basicFrame.png";
import basicFrame2 from "../assets/basicFrame2.png";
import basicFrame3 from "../assets/basicFrame3.png";
import basicFrame4 from "../assets/basicFrame4.png";
import frame1 from "../assets/Frame1.png";
import frame2 from "../assets/Frame2.png";
import frame3 from "../assets/Frame3.png";
import frame4 from "../assets/Frame4.png";
import leopardPattern1 from "../assets/호피무늬1.png";
import leopardPattern2 from "../assets/호피무늬2.png";
import leopardPattern3 from "../assets/호피무늬3.png";
import leopardPattern4 from "../assets/호피무늬4.png";
import nextButton from "../assets/nextButton.png";
import selectColor1 from "../assets/selectColor.png";
import selectColor2 from "../assets/selectColor2.png";
import selectColor3 from "../assets/selectColor3.png";
import selectColor4 from "../assets/selectColor4.png";
import selectColor5 from "../assets/selectColor5.png";
import selectColor6 from "../assets/selectColor6.png";
import selectColor7 from "../assets/selectColor7.png";
import selectColor8 from "../assets/selectColor8.png";
import selectColor9 from "../assets/selectColor9.png";
import selectColor10 from "../assets/selectColor10.png";
import selectColor11 from "../assets/selectColor11.png";
import selectColor12 from "../assets/selectColor12.png";
import FullScreenBackground from "../components/FullScreenBackground";
import { ManitoText, MulmaruText } from "../components/PikuraText";

const PHOTO_SLOT_COUNT = 4;
const FRAME_TIME_LIMIT_SECONDS = 50;
const FRAME_WIDTH = 285;
const FRAME_HEIGHT = 229;
const FRAME_EXPORT_SCALE = 4;

type FrameSlot = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type FrameColor = {
  icon: string;
  fillColor?: string;
  fillImage?: string;
};

const PHOTO_SLOTS: FrameSlot[] = [
  { left: 4.85, top: 6.23, width: 43.66, height: 35.62 },
  { left: 51.37, top: 6.23, width: 43.78, height: 35.62 },
  { left: 4.85, top: 44.89, width: 43.66, height: 35.78 },
  { left: 51.37, top: 44.89, width: 43.78, height: 35.78 },
];

const FRAME_COLORS = [
  { icon: selectColor1, fillColor: "#fff" },
  { icon: selectColor2, fillColor: "#222" },
  { icon: selectColor3, fillColor: "#ffc3dd" },
  { icon: selectColor4, fillColor: "#888" },
  { icon: selectColor5, fillColor: "#5f5351" },
  { icon: selectColor6, fillColor: "#ef35b7" },
  { icon: selectColor7, fillColor: "#ffc3f2" },
  { icon: selectColor8, fillColor: "#f76496" },
  { icon: selectColor9, fillImage: leopardPattern1 },
  { icon: selectColor10, fillImage: leopardPattern2 },
  { icon: selectColor11, fillImage: leopardPattern3 },
  { icon: selectColor12, fillImage: leopardPattern4 },
] satisfies FrameColor[];

const FRAMES = [
  {
    id: "frame1",
    src: frame1,
    basicSrc: basicFrame1,
    label: "프레임 1",
    slots: [
      { left: 11.8, top: 14.5, width: 33.8, height: 21.6 },
      { left: 54.8, top: 14.5, width: 33.8, height: 21.6 },
      { left: 11.8, top: 50.5, width: 33.8, height: 22.2 },
      { left: 54.8, top: 50.5, width: 33.8, height: 22.2 },
    ],
  },
  {
    id: "frame2",
    src: frame2,
    basicSrc: basicFrame4,
    label: "프레임 2",
    slots: [
      { left: 15.4, top: 17.0, width: 31.8, height: 23.2 },
      { left: 54.9, top: 17.4, width: 33.7, height: 21.3 },
      { left: 11.9, top: 51.6, width: 33.5, height: 21.9 },
      { left: 56.0, top: 49.0, width: 27.1, height: 26.6 },
    ],
  },
  {
    id: "frame3",
    src: frame3,
    basicSrc: basicFrame3,
    label: "프레임 3",
    slots: [
      { left: 13.0, top: 16.8, width: 33.5, height: 22.6 },
      { left: 55.0, top: 16.8, width: 34.1, height: 22.6 },
      { left: 12.5, top: 51.0, width: 34.8, height: 23.5 },
      { left: 54.9, top: 51.0, width: 34.8, height: 23.5 },
    ],
  },
  {
    id: "frame4",
    src: frame4,
    basicSrc: basicFrame2,
    label: "프레임 4",
    slots: [
      { left: 11.9, top: 16.8, width: 33.8, height: 21.8 },
      { left: 55.4, top: 13.2, width: 33.6, height: 28.4 },
      { left: 13.8, top: 51.8, width: 34.2, height: 22.8 },
      { left: 54.8, top: 51.7, width: 33.8, height: 22.8 },
    ],
  },
] as const;

function SelectFrame() {
  const navigate = useNavigate();
  const decoratedPhotos = useMemo(() => getDecoratedPhotos(), []);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(FRAME_TIME_LIMIT_SECONDS);
  const selectedFrame = FRAMES[selectedFrameIndex];
  const selectedFrameStyle = FRAME_COLORS[selectedColorIndex];

  const handleNext = useCallback(async () => {
    const framedPhoto = await renderFramePhoto(decoratedPhotos, selectedFrame, selectedFrameStyle);
    if (framedPhoto) {
      sessionStorage.setItem("mikuraFramedPhoto", framedPhoto);
    }

    sessionStorage.setItem(
      "mikuraSelectedFrame",
      JSON.stringify({
        id: selectedFrame.id,
        src: selectedFrame.src,
        basicSrc: selectedFrame.basicSrc,
        frameStyle: selectedFrameStyle,
      }),
    );
    navigate("/completedphoto");
  }, [decoratedPhotos, navigate, selectedFrame, selectedFrameStyle]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setTimerSeconds((currentSeconds) => {
        if (currentSeconds <= 1) {
          window.clearInterval(timerId);
          handleNext();
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [handleNext]);

  return (
    <FullScreenBackground background={bg}>
      <GuideText>프레임을 꾸며주세요~^^*</GuideText>
      <TimerText>{timerSeconds}</TimerText>

      <SelectionLayout>
        <FramePreview>
          <FramePhotoLayer>
            {PHOTO_SLOTS.map((slot, index) => {
              const photo = decoratedPhotos[index];

              return (
                <FramePhotoSlot key={index} $slot={slot}>
                  {photo ? <FramePhoto src={photo} alt={`꾸민 사진 ${index + 1}`} /> : null}
                </FramePhotoSlot>
              );
            })}
          </FramePhotoLayer>
          <FrameStyleLayer
            $maskSrc={selectedFrame.basicSrc}
            $fillColor={selectedFrameStyle.fillColor}
            $fillImage={selectedFrameStyle.fillImage}
          />
        </FramePreview>

        <OptionPanelWrap>
          <OptionPanel>
            {selectedOptionIndex === 0 ? (
              <FrameGrid>
                {FRAMES.map((frame, index) => (
                  <FrameButton
                    key={frame.id}
                    type="button"
                    $isSelected={index === selectedFrameIndex}
                    onClick={() => setSelectedFrameIndex(index)}
                  >
                    <img src={frame.src} alt={frame.label} />
                  </FrameButton>
                ))}
              </FrameGrid>
            ) : (
              <ColorGrid>
                {FRAME_COLORS.map((color, index) => (
                  <ColorButton
                    key={color.icon}
                    type="button"
                    $isSelected={index === selectedColorIndex}
                    onClick={() => setSelectedColorIndex(index)}
                  >
                    <img src={color.icon} alt={`프레임 색 ${index + 1}`} />
                  </ColorButton>
                ))}
              </ColorGrid>
            )}
          </OptionPanel>

          <OptionTabs>
            {["♡", "♥"].map((label, index) => (
              <OptionTabButton
                key={label}
                type="button"
                $isActive={index === selectedOptionIndex}
                onClick={() => setSelectedOptionIndex(index)}
              >
                {label}
              </OptionTabButton>
            ))}
          </OptionTabs>
        </OptionPanelWrap>
      </SelectionLayout>

      <NextButton type="button" aria-label="다음" onClick={handleNext}>
        <img src={nextButton} alt="" />
      </NextButton>
    </FullScreenBackground>
  );
}

export default SelectFrame;

function getDecoratedPhotos() {
  try {
    const rawPhotos = sessionStorage.getItem("mikuraDecoratedPhotos") ?? sessionStorage.getItem("mikuraSelectedPhotos");
    const photos = rawPhotos ? JSON.parse(rawPhotos) : [];

    return Array.isArray(photos) ? photos.filter(isPhotoDataUrl).slice(0, PHOTO_SLOT_COUNT) : [];
  } catch {
    return [];
  }
}

function isPhotoDataUrl(photo: unknown): photo is string {
  return typeof photo === "string" && photo.startsWith("data:image/");
}

async function renderFramePhoto(photos: string[], frame: (typeof FRAMES)[number], frameStyle: (typeof FRAME_COLORS)[number]) {
  if (photos.length === 0) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = FRAME_WIDTH * FRAME_EXPORT_SCALE;
  canvas.height = FRAME_HEIGHT * FRAME_EXPORT_SCALE;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  ctx.scale(FRAME_EXPORT_SCALE, FRAME_EXPORT_SCALE);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);

  await Promise.all(
    PHOTO_SLOTS.map(async (slot, index) => {
      const photo = photos[index];
      if (!photo) {
        return;
      }

      const image = await loadImage(photo);
      const target = {
        x: (slot.left / 100) * FRAME_WIDTH,
        y: (slot.top / 100) * FRAME_HEIGHT,
        width: (slot.width / 100) * FRAME_WIDTH,
        height: (slot.height / 100) * FRAME_HEIGHT,
      };

      drawImageCover(ctx, image, target.x, target.y, target.width, target.height);
    }),
  );

  await drawStyledFrame(ctx, frame.basicSrc, frameStyle, FRAME_EXPORT_SCALE);

  return canvas.toDataURL("image/png");
}

async function drawStyledFrame(
  ctx: CanvasRenderingContext2D,
  maskSrc: string,
  frameStyle: (typeof FRAME_COLORS)[number],
  scale = 1,
) {
  const maskImage = await loadImage(maskSrc);
  const styleCanvas = document.createElement("canvas");
  styleCanvas.width = FRAME_WIDTH * scale;
  styleCanvas.height = FRAME_HEIGHT * scale;
  const styleCtx = styleCanvas.getContext("2d");

  if (!styleCtx) {
    return;
  }

  styleCtx.scale(scale, scale);

  if (frameStyle.fillImage) {
    const fillImage = await loadImage(frameStyle.fillImage);
    drawImageCover(styleCtx, fillImage, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
  } else {
    styleCtx.fillStyle = frameStyle.fillColor ?? "#fff";
    styleCtx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
  }

  styleCtx.globalCompositeOperation = "destination-in";
  styleCtx.drawImage(maskImage, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
  ctx.drawImage(styleCanvas, 0, 0, styleCanvas.width, styleCanvas.height, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    image.src = src;
  });
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  const drawWidth = imageRatio > targetRatio ? height * imageRatio : width;
  const drawHeight = imageRatio > targetRatio ? height : width / imageRatio;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

const GuideText = styled(ManitoText)`
  position: absolute;
  top: 8%;
  left: 50%;
  z-index: 3;
  width: min(90%, 920px);
  transform: translateX(-50%);
  color: #ff87ba;
  text-shadow: 0 0 9.2px #f6a8dc;
  -webkit-text-stroke-width: 6px;
  -webkit-text-stroke-color: #fff;
  font-size: 50px;
  text-align: center;
`;

const TimerText = styled(MulmaruText)`
  position: absolute;
  top: 16%;
  left: 50%;
  z-index: 3;
  transform: translateX(-50%);
  color: rgba(253, 49, 127, 0.52);
  font-size: 46px;
  text-shadow: 0 0 8px #ff7dbd;
  -webkit-text-stroke-width: 2px;
  -webkit-text-stroke-color: #fff;
`;

const SelectionLayout = styled.div`
  position: absolute;
  top: 27%;
  left: 50%;
  z-index: 2;
  display: grid;
  width: min(92vw, 1220px);
  grid-template-columns: minmax(0, 620px) minmax(360px, 520px);
  gap: clamp(22px, 2.6vw, 48px);
  align-items: center;
  transform: translateX(-50%);
`;

const FramePreview = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: ${FRAME_WIDTH} / ${FRAME_HEIGHT};
`;

const FramePhotoLayer = styled.div`
  position: absolute;
  z-index: 2;
  inset: 0;
`;

const FramePhotoSlot = styled.div<{ $slot: FrameSlot }>`
  position: absolute;
  left: ${({ $slot }) => $slot.left}%;
  top: ${({ $slot }) => $slot.top}%;
  display: grid;
  width: ${({ $slot }) => $slot.width}%;
  height: ${({ $slot }) => $slot.height}%;
  place-items: center;
  overflow: hidden;
  background: rgba(205, 205, 205, 0.82);
`;

const FramePhoto = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  min-width: 100%;
  min-height: 100%;
  object-fit: cover;
  object-position: center;
  user-select: none;
  -webkit-user-drag: none;
`;

const FrameStyleLayer = styled.div<{ $maskSrc: string; $fillColor?: string; $fillImage?: string }>`
  position: absolute;
  inset: 0;
  z-index: 3;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: ${({ $fillColor }) => $fillColor ?? "transparent"};
  background-image: ${({ $fillImage }) => ($fillImage ? `url(${$fillImage})` : "none")};
  background-position: center;
  background-repeat: no-repeat;
  background-size: ${({ $fillImage }) => ($fillImage ? "cover" : "auto")};
  mask-image: url(${({ $maskSrc }) => $maskSrc});
  mask-position: center;
  mask-repeat: no-repeat;
  mask-size: 100% 100%;
  -webkit-mask-image: url(${({ $maskSrc }) => $maskSrc});
  -webkit-mask-position: center;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100%;
  transition: background-color 240ms ease, background-image 240ms ease;
  pointer-events: none;
`;

const OptionPanelWrap = styled.div`
  position: relative;
`;

const OptionPanel = styled.div`
  position: relative;
  z-index: 2;
  min-height: clamp(310px, 32vw, 430px);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 0 7px 3px rgba(255, 255, 255, 0.82);
  padding: clamp(34px, 3.4vw, 54px);
`;

const FrameGrid = styled.div`
  display: grid;
  height: 100%;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(18px, 2vw, 28px);
`;

const FrameButton = styled.button<{ $isSelected: boolean }>`
  position: relative;
  aspect-ratio: 285 / 229;
  border: ${({ $isSelected }) => ($isSelected ? "5px solid #ff7fbd" : "0")};
  border-radius: 4px;
  padding: 0;
  background: transparent;
  box-shadow: ${({ $isSelected }) => ($isSelected ? "0 0 14px rgba(255, 94, 178, 0.55)" : "none")};
  overflow: hidden;
  cursor: pointer;

  & > img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const ColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(20px, 2vw, 30px) clamp(22px, 2.2vw, 34px);
  align-items: center;
  justify-items: center;
`;

const ColorButton = styled.button<{ $isSelected: boolean }>`
  width: min(100%, 92px);
  aspect-ratio: 1 / 1;
  border: ${({ $isSelected }) => ($isSelected ? "4px solid #ff7fbd" : "0")};
  border-radius: 10px;
  padding: 0;
  background: transparent;
  box-shadow: ${({ $isSelected }) => ($isSelected ? "0 0 0 4px rgba(255, 255, 255, 0.92), 0 0 16px rgba(255, 127, 189, 0.55)" : "none")};
  transform: ${({ $isSelected }) => ($isSelected ? "scale(1.06)" : "scale(1)")};
  transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
  cursor: pointer;

  & > img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
  }
`;

const OptionTabs = styled.div`
  position: absolute;
  top: 18px;
  right: -58px;
  z-index: 1;
  display: grid;
  gap: 13px;
`;

const OptionTabButton = styled.button<{ $isActive: boolean }>`
  display: grid;
  width: 62px;
  height: 48px;
  place-items: center;
  border: 0;
  border-radius: 0 10px 10px 0;
  background: ${({ $isActive }) => ($isActive ? "#ffa4ce" : "rgba(255, 177, 215, 0.72)")};
  color: #fff;
  font-family: "Mulmaru", "Mulmaru Mono", sans-serif;
  font-size: 28px;
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 7px 2px rgba(255, 255, 255, 0.68);
  cursor: pointer;
`;

const NextButton = styled.button`
  position: absolute;
  right: 6%;
  bottom: 9%;
  z-index: 3;
  width: 72px;
  height: 72px;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;

  & > img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;
