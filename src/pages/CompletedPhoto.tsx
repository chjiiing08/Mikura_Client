import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import QRCode from "qrcode";
import bg from "../assets/basicBg.png";
import FullScreenBackground from "../components/FullScreenBackground";
import { ManitoText, MulmaruText } from "../components/PikuraText";

// Next.js 백엔드 서버 주소 (로컬: http://localhost:3000, 배포 후: https://your-domain.com)
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function CompletedPhoto() {
  const navigate = useNavigate();
  const completedPhoto = useMemo(() => sessionStorage.getItem("mikuraFramedPhoto"), []);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const uploadedIdRef = useRef<string | null>(null);

  // 페이지 진입 시 사진 업로드 → QR 코드 생성
  useEffect(() => {
    if (!completedPhoto) return;

    let cancelled = false;

    async function uploadAndGenerateQr() {
      try {
        const res = await fetch(`${API_BASE}/api/photos/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageData: completedPhoto }),
        });

        if (!res.ok) throw new Error("업로드 실패");

        const { id, downloadUrl } = await res.json();
        if (cancelled) return;

        uploadedIdRef.current = id;

        const qr = await QRCode.toDataURL(downloadUrl, {
          width: 256,
          margin: 1,
          color: { dark: "#4b3f45", light: "#ffffff" },
        });

        if (!cancelled) setQrDataUrl(qr);
      } catch {
        if (!cancelled) setQrError(true);
      }
    }

    uploadAndGenerateQr();
    return () => { cancelled = true; };
  }, [completedPhoto]);

  const handleFinish = () => {
    navigate("/");
  };

  const handleAddToPhotoBook = async () => {
    if (completedPhoto) {
      const photoBookPhoto = await createPhotoBookPhoto(completedPhoto);
      const nextEntry = {
        id: uploadedIdRef.current ?? `photo-book-${Date.now()}`,
        photo: photoBookPhoto,
        memo: "",
        createdAt: new Date().toISOString(),
      };

      try {
        sessionStorage.setItem("mikuraPendingPhotoBookEntry", JSON.stringify(nextEntry));
      } catch (error) {
        console.warn("Failed to prepare photo book entry, retrying compressed image", error);
        const smallerPhoto = await createPhotoBookPhoto(completedPhoto, 720, 0.78);
        sessionStorage.setItem("mikuraPendingPhotoBookEntry", JSON.stringify({ ...nextEntry, photo: smallerPhoto }));
      }
    }

    navigate("/photobook");
  };

  return (
    <FullScreenBackground background={bg}>
      <TitleText>예쁜 사진이 완성됐어요!</TitleText>

      <ResultLayout>
        <PhotoArea>
          {completedPhoto ? (
            <CompletedImage src={completedPhoto} alt="완성된 프리쿠라 사진" />
          ) : (
            <EmptyPhoto>완성된 사진을 불러오지 못했어요</EmptyPhoto>
          )}
        </PhotoArea>

        <RightArea>
          <QrGuide>
            QR코드를 스캔하면
            <br />
            다운로드 받을 수 있어요 ♡
          </QrGuide>

          <HandDrawnArrow aria-hidden="true" viewBox="0 0 118 92">
            <path d="M89 19C52 15 26 34 31 59C33 70 43 75 55 70" />
            <path d="M50 61L57 70L47 76" />
          </HandDrawnArrow>

          <QrCard>
            {qrDataUrl ? (
              <QrImage src={qrDataUrl} alt="다운로드 QR 코드" />
            ) : qrError ? (
              <QrErrorText>QR 생성 실패</QrErrorText>
            ) : (
              <QrLoadingText>QR 생성 중…</QrLoadingText>
            )}
          </QrCard>

          <ButtonRow>
            <ActionButton type="button" onClick={handleFinish}>
              끝내기
            </ActionButton>
            <ActionButton type="button" onClick={handleAddToPhotoBook}>
              포토북에 넣기
            </ActionButton>
          </ButtonRow>
        </RightArea>
      </ResultLayout>
    </FullScreenBackground>
  );
}

export default CompletedPhoto;

async function createPhotoBookPhoto(photo: string, maxWidth = 960, quality = 0.86) {
  const image = await loadImage(photo);
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return photo;
  }

  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    image.src = src;
  });
}

const TitleText = styled(ManitoText)`
  position: absolute;
  top: 7.2%;
  left: 50%;
  z-index: 3;
  margin: 0;
  transform: translateX(-50%);
  color: #ff87ba;
  text-shadow: 0 0 8px #f6a8dc;
  -webkit-text-stroke-width: 5px;
  -webkit-text-stroke-color: #fff;
  font-size: clamp(28px, 3.2vw, 45px);
  white-space: nowrap;
`;

const ResultLayout = styled.main`
  position: absolute;
  top: 22%;
  left: 50%;
  z-index: 2;
  display: grid;
  width: min(74vw, 1060px);
  grid-template-columns: minmax(420px, 1fr) 315px;
  gap: clamp(38px, 5vw, 82px);
  align-items: end;
  transform: translateX(-50%);
`;

const PhotoArea = styled.section`
  display: grid;
  aspect-ratio: 285 / 229;
  place-items: center;
`;

const CompletedImage = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
`;

const EmptyPhoto = styled(MulmaruText)`
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  background: rgba(255, 255, 255, 0.65);
  color: #ff8fbd;
  font-size: 24px;
`;

const RightArea = styled.aside`
  position: relative;
  display: grid;
  justify-items: center;
  padding-bottom: 2px;
`;

const QrGuide = styled(MulmaruText)`
  position: absolute;
  top: -78px;
  left: -18px;
  color: #4a3940;
  font-size: 15px;
  line-height: 1.25;
  text-align: center;
  white-space: nowrap;
`;

const HandDrawnArrow = styled.svg`
  position: absolute;
  top: -46px;
  left: -88px;
  width: 118px;
  height: 92px;
  overflow: visible;

  path {
    fill: none;
    stroke: #4b3f45;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
`;

const QrCard = styled.div`
  display: grid;
  width: clamp(156px, 15vw, 210px);
  aspect-ratio: 1 / 1;
  place-items: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 18px rgba(255, 154, 201, 0.26), 0 0 0 1px rgba(255, 255, 255, 0.72);
`;

const QrImage = styled.img`
  width: 82%;
  height: 82%;
  border-radius: 4px;
`;

const QrLoadingText = styled(MulmaruText)`
  color: #c8a8b8;
  font-size: 13px;
  text-align: center;
`;

const QrErrorText = styled(MulmaruText)`
  color: #e07090;
  font-size: 13px;
  text-align: center;
`;

const ButtonRow = styled.div`
  display: grid;
  width: min(100%, 300px);
  grid-template-columns: 1fr 1.38fr;
  gap: 18px;
  margin-top: 34px;
`;

const ActionButton = styled.button`
  min-height: 44px;
  border: 0;
  border-radius: 8px;
  background: rgba(255, 184, 217, 0.96);
  color: #fff;
  font-family: "Mulmaru", "Mulmaru Mono", sans-serif;
  font-size: 18px;
  line-height: 1;
  box-shadow: 0 3px 0 rgba(255, 145, 196, 0.38);
  cursor: pointer;
  transition: transform 180ms ease, background-color 180ms ease;

  &:hover {
    background: #ffa8d1;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(1px);
  }
`;
