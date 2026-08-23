"use client";

import { useEffect, useState } from "react";
import styles from "./CustomCursor.module.css";

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 }); // Start off-screen
  const [hoverData, setHoverData] = useState({ active: false, text: "" });
  const [isClickable, setIsClickable] = useState(false);
  const [direction, setDirection] = useState("");
  const [isVisible, setIsVisible] = useState(false); // Only show after move

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const directionTarget = target?.closest?.("[data-cursor-direction]");
      const nextDirection = directionTarget?.getAttribute(
        "data-cursor-direction"
      );
      const hoverTextTarget = target?.closest?.("[data-hover-text]");
      if (nextDirection === "left" || nextDirection === "right") {
        setDirection(nextDirection);
        setHoverData({ active: false, text: "" });
        setIsClickable(false);
      } else if (hoverTextTarget) {
        setDirection("");
        setHoverData({
          active: true,
          text: hoverTextTarget.getAttribute("data-hover-text"),
        });
        setIsClickable(false);
      } else {
        setDirection("");
        setHoverData({ active: false, text: "" });
        const clickableTarget = target?.closest?.("a, button, [role='button'], [data-cursor-clickable='true']");
        setIsClickable(!!clickableTarget);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div
      className={`${styles.cursor} ${hoverData.active ? styles.active : ""} ${
        isClickable && !hoverData.active ? styles.clickable : ""
      } ${direction ? styles.direction : ""} ${isVisible ? styles.visible : ""}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {hoverData.active && <span className={styles.text}>{hoverData.text}</span>}
      <span className={styles.directionCue} aria-hidden="true">
        <svg
          className={`${styles.directionIcon} ${
            direction === "left" ? styles.directionIconVisible : ""
          }`}
          viewBox="0 0 16 22"
          fill="none"
        >
          <path
            d="M10.5 5.5 5 11l5.5 5.5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <svg
          className={`${styles.directionIcon} ${
            direction === "right" ? styles.directionIconVisible : ""
          }`}
          viewBox="0 0 16 22"
          fill="none"
        >
          <path
            d="m5.5 5.5 5.5 5.5-5.5 5.5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}
