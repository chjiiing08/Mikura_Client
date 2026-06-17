import bg from "../assets/basicBg.png";
import nextButton from "../assets/nextButton.png";
import photoBasicFrame from "../assets/photoBasicFrame.png";
import FullScreenBackground from "../components/FullScreenBackground";
import styled from "styled-components";
import { ManitoText, MulmaruText } from "../components/PikuraText";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const TOTAL_SLOT_COUNT = 4;
const TOTAL_PHOTO_COUNT = 6;

export default function SelectPhoto() {
  const navigate = useNavigate();
  const photos = useMemo(() => getStoredPhotos(), []);
  const [selectedPhotos, setSelectedPhotos] = useState<(string | null)[]>(
    Array.from({ length: TOTAL_SLOT_COUNT }, () => null),
  );
  const selectedSlotIndex = selectedPhotos.findIndex((photo) => !photo);
  const isSelectionComplete = selectedPhotos.every(isPhotoDataUrl);
  const currentSlotNumber =
    selectedSlotIndex === -1 ? TOTAL_SLOT_COUNT : selectedSlotIndex + 1;

  function handleSelectPhoto(photo: string) {
    setSelectedPhotos((currentPhotos) => {
      const nextPhotos = [...currentPhotos];
      const selectedIndex = nextPhotos.indexOf(photo);

      if (selectedIndex !== -1) {
        nextPhotos[selectedIndex] = null;
        return nextPhotos;
      }

      const targetIndex = nextPhotos.findIndex((currentPhoto) => !currentPhoto);
      const nextSlotIndex =
        targetIndex === -1 ? TOTAL_SLOT_COUNT - 1 : targetIndex;

      nextPhotos[nextSlotIndex] = photo;
      return nextPhotos;
    });
  }

  function handleNext() {
    if (!isSelectionComplete) {
      alert("사진 4개를 모두 선택해주세요!");
      return;
    }

    const confirmedPhotos = selectedPhotos.filter(isPhotoDataUrl);
    sessionStorage.setItem("mikuraSelectedPhotos", JSON.stringify(confirmedPhotos));
    navigate("/decophoto");
  }

  return (
    <FullScreenBackground background={bg}>
      <GuideText>사진을 골라주세요~^^*</GuideText>
      <StepText>{currentSlotNumber}</StepText>
      <SelectionLayout>
        <FramePreview>
          <FramePhotoGrid>
            {selectedPhotos.map((photo, index) => (
              <FramePhotoSlot key={index}>
                {photo ? (
                  <FramePhoto src={photo} alt={`선택한 사진 ${index + 1}`} />
                ) : null}
              </FramePhotoSlot>
            ))}
          </FramePhotoGrid>
          <FrameImage src={photoBasicFrame} alt="" />
        </FramePreview>

        <ThumbnailGrid>
          {Array.from({ length: TOTAL_PHOTO_COUNT }, (_, index) => {
            const photo = photos[index];
            const selectedIndex = photo ? selectedPhotos.indexOf(photo) : -1;
            const isUsed = selectedIndex !== -1;

            return (
              <ThumbnailButton
                key={index}
                type="button"
                $hasPhoto={Boolean(photo)}
                $isSelected={isUsed}
                disabled={!photo}
                onClick={() => photo && handleSelectPhoto(photo)}
              >
                {photo ? (
                  <>
                    <ThumbnailImage
                      src={photo}
                      alt={`촬영 사진 ${index + 1}`}
                    />
                    {isUsed && (
                      <SelectedOverlay>
                        <SelectedNumber>{selectedIndex + 1}</SelectedNumber>
                      </SelectedOverlay>
                    )}
                  </>
                ) : (
                  <ThumbnailNumber>{index + 1}</ThumbnailNumber>
                )}
              </ThumbnailButton>
            );
          })}
        </ThumbnailGrid>
      </SelectionLayout>
      <NextButton type="button" aria-label="다음" onClick={handleNext}>
        <img src={nextButton} alt="" />
      </NextButton>
    </FullScreenBackground>
  );
}

function getStoredPhotos() {
  try {
    const rawPhotos = sessionStorage.getItem("mikuraPhotos");
    const photos = rawPhotos ? JSON.parse(rawPhotos) : [];

    return Array.isArray(photos) ? photos.filter(isPhotoDataUrl) : [];
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
  width: min(90%, 920px);
  transform: translateX(-50%);
  text-shadow: 0 0 9.2px #F6A8DC;
  -webkit-text-stroke-width: 6px;
  -webkit-text-stroke-color: #F175A5;
  font-size: 50px;
`;

const StepText = styled(MulmaruText)`
  position: absolute;
  top: 16%;
  left: 50%;
  z-index: 3;
  transform: translateX(-50%);
  font-size: 46px;
  text-shadow: 0 0 8px #ff7dbd;
  -webkit-text-stroke-width: 2px;
  -webkit-text-stroke-color: #FFF;
  color: rgba(253, 49, 127, 0.52);
`;

const SelectionLayout = styled.div`
  position: absolute;
  top: 30%;
  left: 50%;
  z-index: 2;
  display: grid;
  width: min(88vw, 1120px);
  grid-template-columns: minmax(0, 700px) minmax(190px, 1fr);
  gap: clamp(18px, 2.2vw, 38px);
  align-items: center;
  transform: translateX(-50%);
`;

const FramePreview = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 804 / 626;
`;

const FramePhotoGrid = styled.div`
  position: absolute;
  inset: 6.07% 4.85% 19.17% 4.73%;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  column-gap: 2.74%;
  row-gap: 2.72%;
`;

const FramePhotoSlot = styled.div`
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: transparent;
`;

const FramePhoto = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const FrameImage = styled.img`
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
`;

const ThumbnailGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(98px, 1fr));
  gap: clamp(8px, 0.9vw, 14px);
`;

const ThumbnailButton = styled.button<{
  $hasPhoto: boolean;
  $isSelected: boolean;
}>`
  position: relative;
  aspect-ratio: 1.36 / 1;
  border: ${({ $hasPhoto }) => ($hasPhoto ? 0 : "6px solid #fff")};
  padding: 0;
  background: ${({ $hasPhoto }) =>
    $hasPhoto ? "transparent" : "rgba(255, 255, 255, 0.82)"};
  overflow: hidden;
  cursor: pointer;

  &:disabled {
    cursor: default;
    opacity: 0.45;
  }
`;

const ThumbnailImage = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0.693px;
  box-shadow: 0 0 7.003px 3.072px #FFF;
`;

const SelectedOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 0.693px;
  background: rgba(230, 230, 230, 0.8);
`;

const SelectedNumber = styled(MulmaruText)`
  color: rgba(230, 230, 230, 0.56);
  font-size: clamp(30px, 4vw, 58px);
  text-shadow:
    4px 0 0 rgba(255, 255, 255, 0.9),
    -4px 0 0 rgba(255, 255, 255, 0.9),
    0 4px 0 rgba(255, 255, 255, 0.9),
    0 -4px 0 rgba(255, 255, 255, 0.9),
    4px 4px 0 rgba(255, 255, 255, 0.9),
    -4px 4px 0 rgba(255, 255, 255, 0.9),
    4px -4px 0 rgba(255, 255, 255, 0.9),
    -4px -4px 0 rgba(255, 255, 255, 0.9);
`;

const ThumbnailNumber = styled(MulmaruText)`
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: rgba(230, 230, 230, 0.52);
  font-size: clamp(28px, 3.6vw, 52px);
  text-shadow:
    4px 0 0 rgba(255, 255, 255, 0.82),
    -4px 0 0 rgba(255, 255, 255, 0.82),
    0 4px 0 rgba(255, 255, 255, 0.82),
    0 -4px 0 rgba(255, 255, 255, 0.82),
    4px 4px 0 rgba(255, 255, 255, 0.82),
    -4px 4px 0 rgba(255, 255, 255, 0.82),
    4px -4px 0 rgba(255, 255, 255, 0.82),
    -4px -4px 0 rgba(255, 255, 255, 0.82);
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
