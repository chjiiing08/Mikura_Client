import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import bg from "../assets/basicBg.png";
import photoBookImage from "../assets/photoBook.png";
import FullScreenBackground from "../components/FullScreenBackground";
import { ManitoText } from "../components/PikuraText";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type PhotoBookEntry = {
  id: string;
  photo: string;
  memo: string;
  createdAt: string;
};

type Slot = {
  left: number;
  top: number;
  width: number;
  memoLeft: number;
  memoTop: number;
  memoWidth: number;
  memoHeight: number;
};

const PAGE_SIZE = 4;

const SLOTS: Slot[] = [
  { left: 12.9, top: 13.0, width: 17.2, memoLeft: 30.4, memoTop: 13.4, memoWidth: 9.5, memoHeight: 13.5 },
  { left: 27.7, top: 51.5, width: 18.1, memoLeft: 17.7, memoTop: 54.2, memoWidth: 9.1, memoHeight: 13.2 },
  { left: 55.0, top: 13.0, width: 17.0, memoLeft: 72.9, memoTop: 13.4, memoWidth: 9.5, memoHeight: 13.2 },
  { left: 67.8, top: 51.5, width: 18.0, memoLeft: 61.4, memoTop: 54.3, memoWidth: 9.4, memoHeight: 13.2 },
];

function PhotoBook() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<PhotoBookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  const pages = useMemo(() => chunkEntries(entries), [entries]);
  const safePageIndex = Math.min(pageIndex, Math.max(0, pages.length - 1));
  const visibleEntries = pages[safePageIndex] ?? [];
  const canGoPrev = safePageIndex > 0;
  const canGoNext = safePageIndex < pages.length - 1;

  useEffect(() => {
    if (pageIndex !== safePageIndex) setPageIndex(safePageIndex);
  }, [pageIndex, safePageIndex]);

  useEffect(() => {
    let cancelled = false;

    async function loadEntries() {
      try {
        const res = await fetch(`${API_BASE}/api/photobook`);
        if (!res.ok) throw new Error("조회 실패");
        const data: Array<{ id: string; image_url: string; memo: string; created_at: string }> = await res.json();
        if (!cancelled) {
          const loaded = data.map((row) => ({
            id: row.id,
            photo: row.image_url,
            memo: row.memo,
            createdAt: row.created_at,
          }));
          setEntries(loaded);
          setPageIndex(Math.max(0, Math.ceil(loaded.length / PAGE_SIZE) - 1));
        }
      } catch {
        // 로드 실패 시 빈 목록 유지
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEntries();
    return () => { cancelled = true; };
  }, []);

  function handleMemoChange(id: string, memo: string) {
    setEntries((current) => current.map((e) => (e.id === id ? { ...e, memo } : e)));
  }

  async function handleSave() {
    await Promise.all(
      entries.map((entry) =>
        fetch(`${API_BASE}/api/photobook/${entry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memo: entry.memo }),
        })
      )
    );
    navigate("/");
  }

  function handleBack() {
    navigate(-1);
  }

  return (
    <FullScreenBackground background={bg}>
      <TitleText>포토북을 예쁘게 꾸며주세요~</TitleText>

      <BookStage>
        <BookImage src={photoBookImage} alt="" />

        {!loading && visibleEntries.map((entry, index) => {
          const slot = SLOTS[index];

          return (
            <PhotoBookSlot key={entry.id}>
              <SlotPhoto $slot={slot} onClick={() => setLightboxPhoto(entry.photo)}>
                <PhotoImage src={entry.photo} alt="포토북 사진" />
              </SlotPhoto>
              <MemoGroup $slot={slot}>
                <MemoBox
                  value={entry.memo}
                  placeholder="텍스트 입력"
                  rows={Math.max(1, entry.memo.split("\n").length)}
                  aria-label="포토북 메모"
                  onChange={(event) => handleMemoChange(entry.id, event.target.value)}
                />
                <DateText>{formatDate(entry.createdAt)}</DateText>
              </MemoGroup>
            </PhotoBookSlot>
          );
        })}

        {!loading && entries.length === 0 ? <EmptyText>아직 저장된 프리쿠라가 없어요</EmptyText> : null}
        {loading ? <EmptyText>불러오는 중…</EmptyText> : null}

        <PageTurnButton
          type="button"
          $direction="prev"
          disabled={!canGoPrev}
          aria-label="이전 포토북 페이지"
          onClick={() => setPageIndex((current) => current - 1)}
        >
          &lt;
        </PageTurnButton>
        <PageTurnButton
          type="button"
          $direction="next"
          disabled={!canGoNext}
          aria-label="다음 포토북 페이지"
          onClick={() => setPageIndex((current) => current + 1)}
        >
          &gt;
        </PageTurnButton>
      </BookStage>

      <BottomButton type="button" $side="left" onClick={handleBack}>
        뒤로가기
      </BottomButton>
      <BottomButton type="button" $side="right" onClick={handleSave}>
        저장하기
      </BottomButton>

      {lightboxPhoto && (
        <LightboxOverlay onClick={() => setLightboxPhoto(null)}>
          <LightboxImage src={lightboxPhoto} alt="확대 사진" onClick={(e) => e.stopPropagation()} />
          <LightboxClose onClick={() => setLightboxPhoto(null)}>✕</LightboxClose>
        </LightboxOverlay>
      )}
    </FullScreenBackground>
  );
}

export default PhotoBook;

function chunkEntries(entries: PhotoBookEntry[]) {
  const chunks: PhotoBookEntry[][] = [];
  for (let index = 0; index < entries.length; index += PAGE_SIZE) {
    chunks.push(entries.slice(index, index + PAGE_SIZE));
  }
  return chunks.length > 0 ? chunks : [[]];
}

function formatDate(date: string) {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "";
  return `${parsedDate.getFullYear()}.${String(parsedDate.getMonth() + 1).padStart(2, "0")}.${String(
    parsedDate.getDate(),
  ).padStart(2, "0")}`;
}

const TitleText = styled(ManitoText)`
  position: absolute;
  top: 7.4%;
  left: 50%;
  z-index: 3;
  margin: 0;
  transform: translateX(-50%);
  text-shadow: 0 0 9.2px #f6a8dc;
  -webkit-text-stroke-width: 6px;
  -webkit-text-stroke-color: #f175a5;
  font-size: clamp(30px, 3.1vw, 46px);
  white-space: nowrap;
`;

const BookStage = styled.main`
  position: absolute;
  top: 23%;
  left: 50%;
  z-index: 2;
  width: min(80vw, 1180px);
  aspect-ratio: 1408 / 568;
  transform: translateX(-50%);
`;

const BookImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  clip-path: inset(0 4.7%);
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
`;

const PhotoBookSlot = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

const SlotPhoto = styled.div<{ $slot: Slot }>`
  position: absolute;
  left: ${({ $slot }) => $slot.left}%;
  top: ${({ $slot }) => $slot.top}%;
  display: grid;
  width: ${({ $slot }) => $slot.width}%;
  aspect-ratio: 285 / 229;
  place-items: center;
  cursor: pointer;
  pointer-events: auto;
`;

const PhotoImage = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
`;

const MemoGroup = styled.div<{ $slot: Slot }>`
  position: absolute;
  left: ${({ $slot }) => $slot.memoLeft}%;
  top: ${({ $slot }) => $slot.memoTop}%;
  width: ${({ $slot }) => $slot.memoWidth}%;
  height: ${({ $slot }) => $slot.memoHeight}%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const MemoBox = styled.textarea`
  width: 100%;
  border: 0;
  padding: 0;
  background: transparent;
  color: #30252b;
  font-family: "Mulmaru", "Mulmaru Mono", sans-serif;
  font-size: clamp(11px, 0.85vw, 16px);
  line-height: 1.15;
  font-weight: 700;
  resize: none;
  outline: none;
  overflow: hidden;
  field-sizing: content;

  &::placeholder {
    color: #30252b;
    opacity: 0.9;
  }
`;

const DateText = styled.div`
  color: #30252b;
  font-family: "Mulmaru", "Mulmaru Mono", sans-serif;
  font-size: clamp(8px, 0.62vw, 12px);
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
`;

const EmptyText = styled(ManitoText)`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  text-shadow: 0 0 9.2px #f6a8dc;
  -webkit-text-stroke-width: 6px;
  -webkit-text-stroke-color: #f175a5;
  font-size: clamp(26px, 3vw, 50px);
`;

const PageTurnButton = styled.button<{ $direction: "prev" | "next" }>`
  position: absolute;
  top: 49.2%;
  ${({ $direction }) => ($direction === "prev" ? "left: 9.1%;" : "right: 10.5%;")}
  z-index: 6;
  border: 0;
  background: transparent;
  width: 4%;
  height: 12%;
  color: #ff5aa6;
  font-family: "Mulmaru", "Mulmaru Mono", sans-serif;
  font-size: clamp(24px, 1vw, 38px);
  line-height: 1;
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.9);
  transform: translateY(-50%);
  cursor: pointer;

  &:disabled {
    opacity: 0.22;
    cursor: default;
  }
`;

const BottomButton = styled.button<{ $side: "left" | "right" }>`
  position: absolute;
  ${({ $side }) => ($side === "left" ? "left: 8%;" : "right: 8%;")}
  bottom: 8%;
  z-index: 3;
  min-width: 156px;
  min-height: 52px;
  border: 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  color: #ff9ccc;
  font-family: "Mulmaru", "Mulmaru Mono", sans-serif;
  font-size: 20px;
  box-shadow: 0 5px 0 rgba(255, 181, 216, 0.28);
  cursor: pointer;
`;

const LightboxOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.72);
`;

const LightboxImage = styled.img`
  max-width: min(86vw, 700px);
  max-height: 82vh;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
  user-select: none;
  -webkit-user-drag: none;
`;

const LightboxClose = styled.button`
  position: fixed;
  top: 24px;
  right: 32px;
  border: 0;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 28px;
  line-height: 1;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  cursor: pointer;
  backdrop-filter: blur(4px);

  &:hover {
    background: rgba(255, 255, 255, 0.32);
  }
`;
