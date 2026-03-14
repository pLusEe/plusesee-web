 "use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./PersonalDesign.module.css";
import portfolio from "../../data/portfolio.json";

const getThumb = (item) => {
  if (item?.thumbUrl) return item.thumbUrl;
  if ((item?.mediaType || "image") === "image" && item?.mediaUrl) return item.mediaUrl;
  if (item?.imageUrl) return item.imageUrl;
  return "/placeholder1.jpg";
};

export default function PersonalDesignPage() {
  const items = Array.isArray(portfolio) ? portfolio : [];
  const personalItems = useMemo(
    () => items.filter((item) => item.category === "personal design"),
    [items]
  );
  const pageItems = personalItems.length > 0 ? personalItems : items;
  const safeItems = pageItems.length > 0 ? pageItems : [{ id: "placeholder" }];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);
  const [flipDirection, setFlipDirection] = useState(1);
  const [isFlipping, setIsFlipping] = useState(false);
  const wheelLock = useRef(false);
  const pageRef = useRef(null);
  const rightLeafRef = useRef(null);

  const currentItem = safeItems[currentIndex % safeItems.length];
  const nextIndex = (currentIndex + 1) % safeItems.length;
  const prevIndex = (currentIndex - 1 + safeItems.length) % safeItems.length;
  const rightItem =
    isFlipping && flipDirection < 0
      ? safeItems[prevIndex]
      : isFlipping
        ? safeItems[nextIndex]
        : safeItems[nextIndex];

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const handleWheel = (event) => {
      event.preventDefault();
      if (wheelLock.current || isFlipping || safeItems.length <= 1) return;

      const direction = event.deltaY > 0 ? 1 : -1;
      const next =
        direction > 0 ? (currentIndex + 1) % safeItems.length : (currentIndex - 1 + safeItems.length) % safeItems.length;

      wheelLock.current = true;
      setFlipDirection(direction);
      setTargetIndex(next);
      setIsFlipping(true);
    };

    page.addEventListener("wheel", handleWheel, { passive: false });
    return () => page.removeEventListener("wheel", handleWheel);
  }, [currentIndex, isFlipping, safeItems.length]);

  useEffect(() => {
    if (!isFlipping) return;
    const page = rightLeafRef.current;
    if (!page) return;

    let rafId;
    const duration = 900;
    const start = performance.now();
    const direction = flipDirection;

    const easeInOut = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animate = (time) => {
      const progress = Math.min(1, (time - start) / duration);
      const eased = easeInOut(progress);
      const angle = (direction > 0 ? -180 : 180) * eased;
      const lift = Math.sin(Math.PI * eased) * 6;
      page.style.transform = `rotateY(${angle}deg) translateZ(${lift}px)`;

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        page.style.transform = "rotateY(0deg)";
        setCurrentIndex(targetIndex);
        setIsFlipping(false);
        wheelLock.current = false;
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [isFlipping, flipDirection, targetIndex]);

  return (
    <div ref={pageRef} className={styles.bookPage}>
      <div className={styles.gridBg} />

      <div className={styles.bookSpread}>
        <aside className={styles.leftPage}>
          <div className={styles.sidebarInner}>
            <a className={styles.sidebarLogo} href="/">
              PLUSESEE
            </a>

            <div className={styles.sidebarNav}>
              <div className={styles.sidebarLabel}>Work</div>
              <a className={styles.sidebarLink} href="/">
                Home
              </a>
              <a className={styles.sidebarLink} href="/personal-design">
                Personal Design
              </a>
            </div>

            <div className={styles.sidebarIndex}>
              <div className={styles.indexLabel}>Index</div>
              <button className={`${styles.indexItem} ${styles.indexActive}`} type="button">
                01
              </button>
              <button className={styles.indexItem} type="button">
                02
              </button>
            </div>
          </div>
        </aside>

        <div className={styles.spine}>
          <div className={styles.spineImage} />
        </div>

        <section className={styles.rightPage}>
          <div className={styles.pageFill}>
            <img
              src={getThumb(currentItem)}
              alt={currentItem?.title || "Personal design image"}
              className={styles.pageImage}
            />
          </div>
        </section>

        <div className={`${styles.spine} ${styles.spineSecondary}`}>
          <div className={styles.spineImage} />
        </div>

        <section
          ref={rightLeafRef}
          className={`${styles.rightLeaf} ${isFlipping ? styles.isFlipping : ""}`}
        >
          <div className={styles.pageFill}>
            <img
              src={getThumb(rightItem)}
              alt={rightItem?.title || "Personal design image"}
              className={styles.pageImage}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
