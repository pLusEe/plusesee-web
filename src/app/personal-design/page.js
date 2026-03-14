"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./PersonalDesign.module.css";
import portfolio from "../../data/portfolio.json";

const getThumb = (item) => {
  if (item?.thumbUrl) return item.thumbUrl;
  if ((item?.mediaType || "image") === "image" && item?.mediaUrl) return item.mediaUrl;
  if (item?.imageUrl) return item.imageUrl;
  return "/placeholder1.jpg";
};

const toSafeUrl = (url) => encodeURI(url || "");

export default function PersonalDesignPage() {
  const items = Array.isArray(portfolio) ? portfolio : [];
  const personalItems = useMemo(
    () => items.filter((item) => item.category === "personal design"),
    [items]
  );
  const pageItems = personalItems.length > 0 ? personalItems : items;
  const safeItems = pageItems.length > 0 ? pageItems : [{ id: "placeholder", title: "Placeholder" }];

  const pages = useMemo(() => {
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
  }, [safeItems]);

  const projects = useMemo(() => {
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
    ];

    return ranges.map((range) => {
      const item = safeItems[Math.max(0, Math.min(range.start - 1, safeItems.length - 1))];
      return {
        ...range,
        name: normalizeTitle(item?.title),
      };
    });
  }, [safeItems]);

  const bookRef = useRef(null);
  const pagesRef = useRef([]);
  const flipLock = useRef(false);
  const inputLock = useRef(0);
  const navAnimatingRef = useRef(false);
  const navTokenRef = useRef(0);
  const performFlipRef = useRef(null);
  const [currentSpreadStart, setCurrentSpreadStart] = useState(1);

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

    const totalPages = pageEls.length * 2;
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

    const performFlip = (action, targetIndex) =>
      new Promise((resolve) => {
        if (flipLock.current) return resolve(false);
        const page = pageEls[targetIndex];
        if (!page) return resolve(false);

        flipLock.current = true;
        page.classList.add(styles.flipping);
        if (action === "turn") {
          page.style.transform = "rotateY(-180deg)";
        } else {
          page.style.transform = "rotateY(0deg)";
        }

        updateZIndexes();

        const handleEnd = (event) => {
          if (event.propertyName !== "transform") return;
          flipLock.current = false;
          updateZIndexes();
          page.classList.remove(styles.flipping);
          if (action === "turn") {
            page.classList.add(styles.turned);
          } else {
            page.classList.remove(styles.turned);
          }
          page.style.transform = "";
          page.removeEventListener("transitionend", handleEnd);
          resolve(true);
        };

        page.addEventListener("transitionend", handleEnd);

        setTimeout(() => {
          if (flipLock.current) {
            flipLock.current = false;
            updateZIndexes();
            if (action === "turn") {
              page.classList.add(styles.turned);
            } else {
              page.classList.remove(styles.turned);
            }
            page.style.transform = "";
            resolve(true);
          }
        }, 700);
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
      performFlip(action, idx);
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
        performFlip("turn", firstUnturned);
      } else if (delta < 0 && lastTurned !== -1) {
        event.preventDefault();
        inputLock.current = now;
        performFlip("unturn", lastTurned);
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
        performFlip("turn", firstUnturned);
      } else if (isPrev && lastTurned !== -1) {
        event.preventDefault();
        performFlip("unturn", lastTurned);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    updateZIndexes();

    return () => {
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
        if (targetSheet > currentSheet) {
          for (let i = currentSheet; i < targetSheet; i += 1) {
            if (navTokenRef.current !== token) return;
            await performFlip("turn", i);
          }
        } else {
          for (let i = currentSheet - 1; i >= targetSheet; i -= 1) {
            if (navTokenRef.current !== token) return;
            await performFlip("unturn", i);
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

  return (
    <div className={styles.bookPage}>
      <div className={styles.gridBg} />

      <div className={styles.bookSpread}>
        <aside className={styles.leftPage}>
          <div className={styles.sidebarInner}>
            <div className={styles.sidebarTitle}>personal design</div>

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
          <div ref={bookRef} className={styles.book}>
            {pages.map((page, idx) => (
              <div key={`page-${idx}`} className={styles.page} data-index={idx}>
                <div
                  className={styles.front}
                  style={{ backgroundImage: `url("${page.front.background}")` }}
                >
                  <div className={styles.pageContent}>
                    <div className={styles.pageTitle}>{page.front.title}</div>
                    {page.front.text && <div className={styles.pageText}>{page.front.text}</div>}
                  </div>
                  <span className={`${styles.pageNumber} ${styles.pageNumberRight}`}>
                    {String(page.front.pageNum).padStart(2, "0")}
                  </span>
                </div>
                <div
                  className={styles.back}
                  style={{ backgroundImage: `url("${page.back.background}")` }}
                >
                  <div className={styles.pageContent}>
                    <div className={styles.pageTitle}>{page.back.title}</div>
                    {page.back.text && <div className={styles.pageText}>{page.back.text}</div>}
                  </div>
                  <span className={`${styles.pageNumber} ${styles.pageNumberLeft}`}>
                    {String(page.back.pageNum).padStart(2, "0")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${styles.spine} ${styles.spineSecondary}`}>
          <div className={styles.spineImage} />
        </div>
      </div>
    </div>
  );
}
