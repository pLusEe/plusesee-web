"use client";

import { useEffect, useState } from "react";
import styles from "./CustomCursor.module.css";

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 }); // Start off-screen
  const [hoverData, setHoverData] = useState({ active: false, text: "" });
  const [isClickable, setIsClickable] = useState(false);
  const [isVisible, setIsVisible] = useState(false); // Only show after move

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseOver = (e) => {
      // Data-hover text (large black circle) takes priority
      const hoverTextTarget = e.target.closest("[data-hover-text]");
      if (hoverTextTarget) {
        setHoverData({
          active: true,
          text: hoverTextTarget.getAttribute("data-hover-text"),
        });
        setIsClickable(false);
      } else {
        setHoverData({ active: false, text: "" });
        // Check for general clickable elements for hollow circle
        const clickableTarget = e.target.closest("a, button, [role='button']");
        setIsClickable(!!clickableTarget);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  return (
    <div
      className={`${styles.cursor} ${hoverData.active ? styles.active : ""} ${
        isClickable && !hoverData.active ? styles.clickable : ""
      } ${isVisible ? styles.visible : ""}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {hoverData.active && <span className={styles.text}>{hoverData.text}</span>}
    </div>
  );
}
