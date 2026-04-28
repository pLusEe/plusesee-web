"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "../PersonalDesign.module.css";
import defaultSiteContent from "../../../data/site-content.json";

const LEGACY_CATEGORY_TO_TAGS = {
  "home ai / ring": ["home"],
  home: ["home"],
  ring: ["home"],
  "commercial design": ["commercial"],
  commercial: ["commercial"],
  "personal design": ["personalLibrary", "personalBook"],
  "design archive": ["personalLibrary", "personalBook"],
  personal: ["personalLibrary", "personalBook"],
  bio: ["bio"],
};

const getThumb = (item) => {
  if (item?.thumbUrl) return item.thumbUrl;
  if ((item?.mediaType || "image") === "image" && item?.mediaUrl) return item.mediaUrl;
  if (item?.imageUrl) return item.imageUrl;
  return "/media/images/placeholder1.jpg";
};

const toSafeUrl = (url) => encodeURI(url || "");
const DEFAULT_BOOK_CONFIG = defaultSiteContent.personalDesign.book2019;
const ARCHIVE_FRAME_COUNT = 80;
const ARCHIVE_PAGE_IMAGES = Array.from(
  { length: ARCHIVE_FRAME_COUNT - 1 },
  (_, index) => `/media/images/archive/Frame ${index + 2}.png`
);

const normalizeTags = (rawCategories, rawCategory) => {
  const source = [];
  if (Array.isArray(rawCategories)) source.push(...rawCategories);
  if (typeof rawCategories === "string") source.push(...rawCategories.split(","));
  if (typeof rawCategory === "string" && rawCategory.trim()) source.push(rawCategory.trim());
  return Array.from(
    new Set(
      source.flatMap((value) => {
        const text = String(value || "").trim();
        if (!text) return [];
        if (["home", "commercial", "personalLibrary", "personalBook", "bio"].includes(text)) return [text];
        return LEGACY_CATEGORY_TO_TAGS[text.toLowerCase()] || [];
      })
    )
  );
};

export default function PersonalDesignPage() {
  const normalFlipMs = 600;
  const fastFlipMinMs = 300;
  const fastFlipMaxMs = 700;
  const [items, setItems] = useState([]);
  const [bookConfig, setBookConfig] = useState(DEFAULT_BOOK_CONFIG);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));

    fetch("/api/content")
      .then((r) => r.json())
      .then((data) => {
        const nextBook = data?.personalDesign?.book2019;
        if (nextBook && typeof nextBook === "object") {
          setBookConfig({
            ...DEFAULT_BOOK_CONFIG,
            ...nextBook,
            pages: Array.isArray(nextBook.pages) ? nextBook.pages : DEFAULT_BOOK_CONFIG.pages,
            pageWorkIds: Array.isArray(nextBook.pageWorkIds) ? nextBook.pageWorkIds : DEFAULT_BOOK_CONFIG.pageWorkIds,
            projects: Array.isArray(nextBook.projects) ? nextBook.projects : DEFAULT_BOOK_CONFIG.projects,
          });
        }
      })
      .catch(() => {});
  }, []);

  const personalItems = useMemo(() => {
    return items.filter((item) => {
      const tags = normalizeTags(item?.categories, item?.category);
      if (tags.includes("personalBook")) return true;
      if (tags.includes("personalLibrary")) return true;
      const category = String(item?.category || "").toLowerCase();
      return category === "personal design" || category === "design archive";
    });
  }, [items]);

  const orderedByConfigIds = useMemo(() => {
    const ids = Array.isArray(bookConfig?.pageWorkIds) ? bookConfig.pageWorkIds.map((id) => String(id)) : [];
    if (ids.length === 0) return [];
    const map = new Map(personalItems.map((item) => [String(item?.id), item]));
    return ids.map((id) => map.get(id)).filter(Boolean);
  }, [bookConfig, personalItems]);

  const pageItems = orderedByConfigIds.length > 0 ? orderedByConfigIds : personalItems.length > 0 ? personalItems : items;
  const safeItems = pageItems.length > 0 ? pageItems : [{ id: "placeholder", title: "Placeholder" }];
  const firstLeftPageImage = toSafeUrl(ARCHIVE_PAGE_IMAGES[0] || "");

  const pages = useMemo(() => {
    if (ARCHIVE_PAGE_IMAGES.length > 0) {
      const sheetImages = ARCHIVE_PAGE_IMAGES.slice(1);
      const result = [];
      for (let i = 0; i < sheetImages.length; i += 2) {
        const frontImage = sheetImages[i];
        const backImage = sheetImages[i + 1] || "";
        result.push({
          front: {
            title: "",
            text: "",
            background: toSafeUrl(frontImage),
            pageNum: i + 2,
          },
          back: {
            title: "",
            text: "",
            background: toSafeUrl(backImage),
            pageNum: i + 3,
          },
        });
      }
      return result;
    }

    if (orderedByConfigIds.length > 0) {
      const result = [];
      for (let i = 0; i < orderedByConfigIds.length; i += 2) {
        const frontItem = orderedByConfigIds[i];
        const backItem = orderedByConfigIds[i + 1] || orderedByConfigIds[i];
        result.push({
          front: {
            title: frontItem.title || `Page ${i + 1}`,
            text: frontItem.description || "",
            background: toSafeUrl(getThumb(frontItem)),
            pageNum: i + 1,
          },
          back: {
            title: backItem.title || `Page ${i + 2}`,
            text: backItem.description || "",
            background: toSafeUrl(getThumb(backItem)),
            pageNum: i + 2,
          },
        });
      }
      return result;
    }

    if (Array.isArray(bookConfig?.pages) && bookConfig.pages.length > 0) {
      return bookConfig.pages.map((page, idx) => ({
        front: {
          title: page?.front?.title || `Page ${idx * 2 + 1}`,
          text: page?.front?.text || "",
          background: toSafeUrl(page?.front?.background || getThumb(safeItems[idx * 2] || safeItems[0])),
          pageNum: Number.isFinite(page?.front?.pageNum) ? page.front.pageNum : idx * 2 + 1,
        },
        back: {
          title: page?.back?.title || `Page ${idx * 2 + 2}`,
          text: page?.back?.text || "",
          background: toSafeUrl(
            page?.back?.background || getThumb(safeItems[idx * 2 + 1] || safeItems[idx * 2] || safeItems[0])
          ),
          pageNum: Number.isFinite(page?.back?.pageNum) ? page.back.pageNum : idx * 2 + 2,
        },
      }));
    }

    const result = [];
    for (let i = 0; i < safeItems.length; i += 2) {
      const frontItem = safeItems[i];
      const backItem = safeItems[i + 1] || safeItems[i];
      result.push({
        front: {
          title: frontItem.title || `Page ${i + 1}`,
          text: frontItem.description || "",
          background: toSafeUrl(getThumb(frontItem)),
          pageNum: i + 1,
        },
        back: {
          title: backItem.title || `Page ${i + 2}`,
          text: backItem.description || "",
          background: toSafeUrl(getThumb(backItem)),
          pageNum: i + 2,
        },
      });
    }
    return result;
  }, [bookConfig, orderedByConfigIds, safeItems]);

  const projects = useMemo(() => {
    if (Array.isArray(bookConfig?.projects) && bookConfig.projects.length > 0) {
      return bookConfig.projects.map((project, idx) => ({
        start: Number.isFinite(project?.start) ? project.start : idx * 2 + 1,
        end: Number.isFinite(project?.end) ? project.end : idx * 2 + 2,
        name: String(project?.name || `Project ${idx + 1}`),
      }));
    }

    const normalizeTitle = (title) =>
      String(title || "Untitled")
        .replace(/\s+[IVXLCDM]+$/i, "")
        .replace(/\s+\d+$/, "")
        .trim();

    const ranges = [
      { start: 1, end: 4 },
      { start: 5, end: 6 },
      { start: 7, end: 10 },
      { start: 11, end: 18 },
      { start: 19, end: 26 },
      { start: 27, end: 34 },
      { start: 35, end: 42 },
      { start: 43, end: 50 },
    ];

    return ranges.map((range) => {
      const item = safeItems[Math.max(0, Math.min(range.start - 1, safeItems.length - 1))];
      return {
        ...range,
        name: normalizeTitle(item?.title),
      };
    });
  }, [bookConfig, safeItems]);

  const bookRef = useRef(null);
  const pagesRef = useRef([]);
  const flipLock = useRef(false);
  const inputLock = useRef(0);
  const navAnimatingRef = useRef(false);
  const navTokenRef = useRef(0);
  const performFlipRef = useRef(null);
  const [currentSpreadStart, setCurrentSpreadStart] = useState(1);
  const normalEase = "cubic-bezier(0.37, 0, 0.63, 1)";
  const fastEase = "cubic-bezier(0.4, 0, 0.2, 1)";
  const shouldLoadSheet = useCallback(
    (idx) => {
      const sheetStartPage = idx * 2 + 1;
      return idx < 2 || Math.abs(sheetStartPage - currentSpreadStart) <= 6;
    },
    [currentSpreadStart]
  );

  const updateZIndexes = useCallback(() => {
    const pageEls = pagesRef.current;
    if (!pageEls.length) return;
    const total = pageEls.length;
    pageEls.forEach((page, idx) => {
      if (page.classList.contains(styles.flipping)) {
        page.style.zIndex = String(total + 1000);
        return;
      }
      if (page.classList.contains(styles.turned)) {
        page.style.zIndex = String(idx + 1);
      } else {
        page.style.zIndex = String(total - idx);
      }
    });

    const firstUnturned = pageEls.findIndex((page) => !page.classList.contains(styles.turned));
    let lastTurned = -1;
    for (let i = pageEls.length - 1; i >= 0; i -= 1) {
      if (pageEls[i].classList.contains(styles.turned)) {
        lastTurned = i;
        break;
      }
    }

    pageEls.forEach((page) => page.classList.remove(styles.pageActive));
    if (firstUnturned !== -1) {
      pageEls[firstUnturned].classList.add(styles.pageActive);
    }
    if (lastTurned !== -1) {
      pageEls[lastTurned].classList.add(styles.pageActive);
    }

    const totalPages = pageEls.length * 2 + 1;
    const spreadStart = firstUnturned === -1 ? Math.max(1, totalPages - 1) : firstUnturned * 2 + 1;
    setCurrentSpreadStart(spreadStart);

  }, []);

  useEffect(() => {
    const book = bookRef.current;
    if (!book) return;

    const pageEls = Array.from(book.querySelectorAll(`.${styles.page}`));
    pagesRef.current = pageEls;

    const getFirstUnturned = () => pageEls.findIndex((page) => !page.classList.contains(styles.turned));
    const getLastTurned = () => {
      for (let i = pageEls.length - 1; i >= 0; i -= 1) {
        if (pageEls[i].classList.contains(styles.turned)) return i;
      }
      return -1;
    };

    const performFlip = (
      action,
      targetIndex,
      durationMs = normalFlipMs,
      timingFunction = normalEase
    ) =>
      new Promise((resolve) => {
        if (flipLock.current) return resolve(false);
        const page = pageEls[targetIndex];
        if (!page) return resolve(false);

        flipLock.current = true;
        page.classList.add(styles.flipping);
        page.style.transitionDuration = `${durationMs}ms`;
        page.style.transitionTimingFunction = timingFunction;
        if (action === "turn") {
          page.style.transform = "rotateY(-180deg)";
        } else {
          page.style.transform = "rotateY(0deg)";
        }

        updateZIndexes();

        const handleEnd = (event) => {
          if (event.propertyName !== "transform") return;
          flipLock.current = false;
          page.classList.remove(styles.flipping);
          if (action === "turn") {
            page.classList.add(styles.turned);
          } else {
            page.classList.remove(styles.turned);
          }
          page.style.transform = "";
          updateZIndexes();
          page.removeEventListener("transitionend", handleEnd);
          resolve(true);
        };

        page.addEventListener("transitionend", handleEnd);

        setTimeout(() => {
          if (flipLock.current) {
            flipLock.current = false;
            if (action === "turn") {
              page.classList.add(styles.turned);
            } else {
              page.classList.remove(styles.turned);
            }
            page.style.transform = "";
            updateZIndexes();
            resolve(true);
          }
        }, durationMs + 200);
      });

    performFlipRef.current = performFlip;

    const handleClickFactory = (idx) => () => {
      if (flipLock.current) return;
      const page = pageEls[idx];
      if (!page.classList.contains(styles.pageActive)) return;
      const isTurned = page.classList.contains(styles.turned);
      const firstUnturned = getFirstUnturned();
      const lastTurned = getLastTurned();
      const total = pageEls.length;

      let targetPage = null;
      let action = "";

      if (!isTurned && idx === firstUnturned) {
        targetPage = page;
        action = "turn";
      } else if (isTurned && idx === lastTurned) {
        targetPage = page;
        action = "unturn";
      }

      if (!targetPage) return;
      performFlip(action, idx, normalFlipMs, normalEase);
    };

    const handlers = pageEls.map((_, idx) => handleClickFactory(idx));
    pageEls.forEach((page, idx) => {
      page.addEventListener("click", handlers[idx]);
      page.addEventListener("transitionend", updateZIndexes);
    });

    const handleWheel = (event) => {
      if (navAnimatingRef.current) return;
      const now = Date.now();
      if (now - inputLock.current < 500) return;
      const delta = event.deltaY;
      if (Math.abs(delta) < 10) return;
      const firstUnturned = getFirstUnturned();
      const lastTurned = getLastTurned();

      if (delta > 0 && firstUnturned !== -1) {
        event.preventDefault();
        inputLock.current = now;
        performFlip("turn", firstUnturned, normalFlipMs, normalEase);
      } else if (delta < 0 && lastTurned !== -1) {
        event.preventDefault();
        inputLock.current = now;
        performFlip("unturn", lastTurned, normalFlipMs, normalEase);
      }
    };

    const handleKeyDown = (event) => {
      if (navAnimatingRef.current) return;
      if (event.repeat) return;
      const key = event.key;
      const isNext = key === "ArrowRight" || key === "ArrowDown" || key === "PageDown";
      const isPrev = key === "ArrowLeft" || key === "ArrowUp" || key === "PageUp";
      if (!isNext && !isPrev) return;

      const firstUnturned = getFirstUnturned();
      const lastTurned = getLastTurned();

      if (isNext && firstUnturned !== -1) {
        event.preventDefault();
        performFlip("turn", firstUnturned, normalFlipMs, normalEase);
      } else if (isPrev && lastTurned !== -1) {
        event.preventDefault();
        performFlip("unturn", lastTurned, normalFlipMs, normalEase);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    const zIndexRaf = window.requestAnimationFrame(updateZIndexes);

    return () => {
      window.cancelAnimationFrame(zIndexRaf);
      pageEls.forEach((page, idx) => {
        page.removeEventListener("click", handlers[idx]);
        page.removeEventListener("transitionend", updateZIndexes);
      });
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      performFlipRef.current = null;
    };
  }, [pages, updateZIndexes]);

  const jumpToPage = useCallback(
    (start) => {
      const pageEls = pagesRef.current;
      if (!pageEls.length) return;
      const performFlip = performFlipRef.current;
      if (!performFlip) return;

      const targetSheet = Math.max(0, Math.floor((start - 1) / 2));
      const firstUnturned = pageEls.findIndex((page) => !page.classList.contains(styles.turned));
      const currentSheet = firstUnturned === -1 ? pageEls.length : firstUnturned;

      if (targetSheet === currentSheet) return;

      const token = Date.now();
      navTokenRef.current = token;
      navAnimatingRef.current = true;

      const run = async () => {
        const totalSteps = Math.max(1, Math.abs(targetSheet - currentSheet));
        const targetTotalMs = 1500;
        const getFactor = (t) => {
          if (t <= 0.25) return 0.15 + (0.6 - 0.15) * (t / 0.25); // slow -> slightly faster
          if (t <= 0.5) return 0.6 + (1.0 - 0.6) * ((t - 0.25) / 0.25); // -> fast
          if (t <= 0.75) return 1.0 + (0.6 - 1.0) * ((t - 0.5) / 0.25); // -> slightly fast
          return 0.6 + (0.0 - 0.6) * ((t - 0.75) / 0.25); // -> very slow
        };

        const rawDurations = Array.from({ length: totalSteps }, (_, stepIndex) => {
          if (totalSteps === 1) return fastFlipMaxMs;
          const t = stepIndex / (totalSteps - 1); // 0..1
          const factor = Math.min(1, Math.max(0, getFactor(t)));
          return fastFlipMaxMs - (fastFlipMaxMs - fastFlipMinMs) * factor;
        });
        const rawTotal = rawDurations.reduce((sum, v) => sum + v, 0) || 1;
        const lastWeight = rawDurations[rawDurations.length - 1];
        const lastShare = lastWeight / rawTotal;
        const desiredLastShare = 0.5;
        const boost = lastShare >= desiredLastShare ? 1 : desiredLastShare / lastShare;

        const boosted = rawDurations.map((value, idx) =>
          idx === rawDurations.length - 1 ? value * boost : value
        );
        const boostedTotal = boosted.reduce((sum, v) => sum + v, 0) || 1;
        const scale = targetTotalMs / boostedTotal;

        const getStepDuration = (stepIndex) =>
          Math.max(60, Math.round(boosted[stepIndex] * scale));

        if (targetSheet > currentSheet) {
          let step = 0;
          for (let i = currentSheet; i < targetSheet; i += 1) {
            if (navTokenRef.current !== token) return;
            await performFlip("turn", i, getStepDuration(step), fastEase);
            step += 1;
          }
        } else {
          let step = 0;
          for (let i = currentSheet - 1; i >= targetSheet; i -= 1) {
            if (navTokenRef.current !== token) return;
            await performFlip("unturn", i, getStepDuration(step), fastEase);
            step += 1;
          }
        }
      };

      run().finally(() => {
        if (navTokenRef.current === token) {
          navAnimatingRef.current = false;
        }
      });
    },
    [updateZIndexes]
  );

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const frameParam = Number(searchParams.get("frame"));
    if (!Number.isFinite(frameParam) || frameParam < 2) return;
    if (pages.length === 0) return;

    const sheetIndex = Math.max(0, Math.floor((frameParam - 2) / 2));
    const targetStart = sheetIndex * 2 + 1;
    const raf = window.requestAnimationFrame(() => {
      jumpToPage(targetStart);
    });

    return () => window.cancelAnimationFrame(raf);
  }, [jumpToPage, pages.length]);

  return (
    <div className={styles.bookPage}>
      <div className={styles.gridBg} />

      <div className={styles.bookSpread}>
        <aside className={styles.leftPage}>
          <div className={styles.sidebarInner}>
            <div className={styles.sidebarTitle}>design archive</div>

            <div className={styles.projectList}>
              {projects.map((project, idx) => {
                const isActive =
                  project.end >= currentSpreadStart && project.start <= currentSpreadStart + 1;
                return (
                <div key={`${project.name}-${project.start}`} className={styles.projectItem}>
                  <div
                    className={`${styles.projectRow} ${isActive ? styles.projectRowActive : ""}`}
                  >
                    <button
                      type="button"
                      className={styles.projectJump}
                      onClick={() => jumpToPage(project.start)}
                    >
                      <span className={styles.projectLabel}>project {String(idx + 1).padStart(2, "0")}</span>
                      <span className={styles.projectName}>{project.name}</span>
                    </button>
                    <button
                      type="button"
                      className={styles.projectRange}
                      onClick={() => jumpToPage(project.start)}
                    >
                      {project.start}-{project.end}
                    </button>
                  </div>
                </div>
              )})}
            </div>
          </div>
        </aside>

        <div className={styles.pagesStage}>
          <div className={styles.staticLeftPage} aria-hidden="true">
            {firstLeftPageImage ? (
              <img
                src={firstLeftPageImage}
                alt=""
                className={styles.pageImage}
                draggable={false}
                decoding="async"
              />
            ) : null}
          </div>
          <div ref={bookRef} className={styles.book}>
            {pages.map((page, idx) => {
              const loadSheet = shouldLoadSheet(idx);
              return (
                <div key={`page-${idx}`} className={styles.page} data-index={idx}>
                  <div
                    className={styles.front}
                  >
                    {loadSheet ? (
                      <img
                        src={page.front.background}
                        alt=""
                        className={styles.pageImage}
                        draggable={false}
                        loading={idx < 2 ? "eager" : "lazy"}
                        decoding="async"
                      />
                    ) : null}
                    {(page.front.title || page.front.text) && (
                      <div className={styles.pageContent}>
                        {page.front.title && <div className={styles.pageTitle}>{page.front.title}</div>}
                        {page.front.text && <div className={styles.pageText}>{page.front.text}</div>}
                      </div>
                    )}
                  </div>
                  <div className={styles.back}>
                    {loadSheet && page.back.background ? (
                      <img
                        src={page.back.background}
                        alt=""
                        className={styles.pageImage}
                        draggable={false}
                        loading={idx < 2 ? "eager" : "lazy"}
                        decoding="async"
                      />
                    ) : null}
                    {(page.back.title || page.back.text) && (
                      <div className={styles.pageContent}>
                        {page.back.title && <div className={styles.pageTitle}>{page.back.title}</div>}
                        {page.back.text && <div className={styles.pageText}>{page.back.text}</div>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${styles.spine} ${styles.spineSecondary}`}>
          <div className={styles.spineImage} />
        </div>
      </div>
    </div>
  );
}
