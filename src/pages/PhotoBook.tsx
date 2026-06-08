import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import bg from "../assets/basicBg.png";
import photoBookImage from "../assets/photoBook.png";
import FullScreenBackground from "../components/FullScreenBackground";
import { ManitoText } from "../components/PikuraText";

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

const STORAGE_KEY = "mikuraPhotoBookPhotos";
const PENDING_STORAGE_KEY = "mikuraPendingPhotoBookEntry";
const PAGE_SIZE = 4;

const SLOTS: Slot[] = [
  { left: 12.9, top: 13.0, width: 17.2, memoLeft: 30.4, memoTop: 13.4, memoWidth: 9.5, memoHeight: 13.5 },
  { left: 27.7, top: 51.5, width: 18.1, memoLeft: 17.7, memoTop: 54.2, memoWidth: 9.1, memoHeight: 13.2 },
  { left: 55.0, top: 13.0, width: 17.0, memoLeft: 72.9, memoTop: 13.4, memoWidth: 9.5, memoHeight: 13.2 },
  { left: 67.8, top: 51.5, width: 18.0, memoLeft: 61.4, memoTop: 54.3, memoWidth: 9.4, memoHeight: 13.2 },
];

function PhotoBook() {
  const navigate = useNavigate();
  const initialEntries = useMemo(() => getPhotoBookEntries(), []);
  const [entries, setEntries] = useState<PhotoBookEntry[]>(initialEntries);
  const [pageIndex, setPageIndex] = useState(() => Math.max(0, Math.ceil(initialEntries.length / PAGE_SIZE) - 1));
  const pages = useMemo(() => chunkEntries(entries), [entries]);
  const safePageIndex = Math.min(pageIndex, Math.max(0, pages.length - 1));
  const visibleEntries = pages[safePageIndex] ?? [];
  const canGoPrev = safePageIndex > 0;
  const canGoNext = safePageIndex < pages.length - 1;

  useEffect(() => {
    if (pageIndex !== safePageIndex) {
      setPageIndex(safePageIndex);
    }
  }, [pageIndex, safePageIndex]);

  function handleMemoChange(id: string, memo: string) {
    setEntries((currentEntries) =>
      currentEntries.map((entry) => (entry.id === id ? { ...entry, memo } : entry)),
    );
  }

  function handleSave() {
    savePhotoBookEntries(entries);
    sessionStorage.removeItem(PENDING_STORAGE_KEY);
    navigate("/");
  }

  function handleBack() {
    sessionStorage.removeItem(PENDING_STORAGE_KEY);
    navigate(-1);
  }

  return (
    <FullScreenBackground background={bg}>
      <TitleText>포토북을 예쁘게 꾸며주세요~</TitleText>

      <BookStage>
        <BookImage src={photoBookImage} alt="" />

        {visibleEntries.map((entry, index) => {
          const slot = SLOTS[index];

          return (
            <PhotoBookSlot key={entry.id}>
              <SlotPhoto $slot={slot}>
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

        {entries.length === 0 ? <EmptyText>아직 저장된 프리쿠라가 없어요</EmptyText> : null}

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
    </FullScreenBackground>
  );
}

export default PhotoBook;

function getPhotoBookEntries() {
  try {
    const rawEntries = sessionStorage.getItem(STORAGE_KEY);
    const parsedEntries = rawEntries ? JSON.parse(rawEntries) : [];

    if (!Array.isArray(parsedEntries)) {
      return [];
    }

    const entries = parsedEntries.flatMap((entry, index): PhotoBookEntry[] => {
      if (typeof entry === "string" && entry.startsWith("data:image/")) {
        return [
          {
            id: `legacy-${index}-${Date.now()}`,
            photo: entry,
            memo: "",
            createdAt: new Date().toISOString(),
          },
        ];
      }

      if (isPhotoBookEntry(entry)) {
        return [entry];
      }

      return [];
    });
    const pendingEntry = getPendingPhotoBookEntry();

    if (pendingEntry && !entries.some((entry) => entry.id === pendingEntry.id)) {
      return [...entries, pendingEntry];
    }

    return entries;
  } catch {
    const pendingEntry = getPendingPhotoBookEntry();

    return pendingEntry ? [pendingEntry] : [];
  }
}

function getPendingPhotoBookEntry() {
  try {
    const rawEntry = sessionStorage.getItem(PENDING_STORAGE_KEY);
    const pendingEntry = rawEntry ? JSON.parse(rawEntry) : null;

    return isPhotoBookEntry(pendingEntry) ? pendingEntry : null;
  } catch {
    return null;
  }
}

function isPhotoBookEntry(entry: unknown): entry is PhotoBookEntry {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "id" in entry &&
    "photo" in entry &&
    "memo" in entry &&
    "createdAt" in entry &&
    typeof entry.id === "string" &&
    typeof entry.photo === "string" &&
    typeof entry.memo === "string" &&
    typeof entry.createdAt === "string"
  );
}

function savePhotoBookEntries(entries: PhotoBookEntry[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function chunkEntries(entries: PhotoBookEntry[]) {
  const chunks: PhotoBookEntry[][] = [];

  for (let index = 0; index < entries.length; index += PAGE_SIZE) {
    chunks.push(entries.slice(index, index + PAGE_SIZE));
  }

  return chunks.length > 0 ? chunks : [[]];
}

function formatDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

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
  color: #ff87ba;
  text-shadow: 0 0 8px #f6a8dc;
  -webkit-text-stroke-width: 5px;
  -webkit-text-stroke-color: #fff;
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
`;

const SlotPhoto = styled.div<{ $slot: Slot }>`
  position: absolute;
  left: ${({ $slot }) => $slot.left}%;
  top: ${({ $slot }) => $slot.top}%;
  display: grid;
  width: ${({ $slot }) => $slot.width}%;
  aspect-ratio: 285 / 229;
  place-items: center;
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
  color: #ff87ba;
  -webkit-text-stroke-width: 4px;
  -webkit-text-stroke-color: #fff;
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
