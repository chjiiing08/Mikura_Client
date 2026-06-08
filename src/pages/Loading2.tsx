import loadingIcon from "../assets/loadingIcon2.png";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoadingView from "../components/LoadingView";

const TOTAL_PHOTO_COUNT = 6;
const MIN_LOADING_TIME_MS = 900;

function Loading2() {
  const navigate = useNavigate();

  useEffect(() => {
    let isCancelled = false;

    async function waitForPhotos() {
      const startedAt = Date.now();
      const photos = getStoredPhotos();

      if (photos.length < TOTAL_PHOTO_COUNT) {
        navigate("/camera", { replace: true });
        return;
      }

      await Promise.all(photos.map(preloadImage));

      const elapsedTime = Date.now() - startedAt;
      const remainingTime = Math.max(0, MIN_LOADING_TIME_MS - elapsedTime);

      window.setTimeout(() => {
        if (!isCancelled) {
          navigate("/selectphoto", { replace: true });
        }
      }, remainingTime);
    }

    waitForPhotos();

    return () => {
      isCancelled = true;
    };
  }, [navigate]);

  return <LoadingView icon={loadingIcon} />;
}

export default Loading2;

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

function preloadImage(src: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });
}
