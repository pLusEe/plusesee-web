"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence, useSpring, useMotionTemplate } from "framer-motion";
import styles from "./RingCarousel.module.css";

export default function RingCarousel({ items }) {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dim, setDim] = useState({ w: 1200, h: 800 });

  useEffect(() => {
    setDim({ w: window.innerWidth, h: window.innerHeight });
    const handleResize = () => setDim({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const mouseX = useMotionValue(dim.w / 2);
  const mouseY = useMotionValue(dim.h / 2);
  const smoothX = useSpring(mouseX, { damping: 50, stiffness: 200 });
  const smoothY = useSpring(mouseY, { damping: 50, stiffness: 200 });

  const rotationYFromMouse = useTransform(smoothX, [0, dim.w], [50, -50]);
  const rotationX = useTransform(smoothY, [0, dim.h], [-12, -5]);
  const translateZ = useTransform(smoothY, [0, dim.h], [40, -40]);
  const rotationZ = useTransform(smoothX, [0, dim.w], [-2, 2]);

  const wheelAngle = useMotionValue(0);
  const smoothWheelAngle = useSpring(wheelAngle, { damping: 50, stiffness: 200 });
  const rotationY = useTransform(() => rotationYFromMouse.get() + smoothWheelAngle.get());

  const containerTransform = useMotionTemplate`translateZ(${translateZ}px) rotateX(${rotationX}deg) rotateY(${rotationY}deg) rotateZ(${rotationZ}deg)`;

  const handleMouseMove = (e) => {
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
  };

  // Ensure enough items around the ring (min 24 for a dense ring)
  const minItems = 24;
  let displayItems = [...items];
  if (items.length > 0) {
    while (displayItems.length < minItems) {
      displayItems = [...displayItems, ...items];
    }
    displayItems = displayItems.slice(0, Math.max(minItems, items.length * 3));
  }

  if (selectedItem) {
    return (
      <AnimatePresence>
        <motion.div
          className={styles.detailView}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button className={styles.closeBtn} onClick={() => setSelectedItem(null)}>×</button>
          <motion.div className={styles.detailContent}>
            <motion.div className={styles.detailImageContainer}>
              <motion.img
                layoutId={`img-${selectedItem.id}`}
                src={selectedItem.imageUrl}
                alt={selectedItem.title}
                className={styles.detailHeroImage}
              />
            </motion.div>
            <motion.div
              className={styles.detailInfo}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <h2 className={styles.detailTitle}>{selectedItem.title}</h2>
              <div className={styles.hr} />
              <p className={styles.detailDesc}>{selectedItem.description}</p>
              {selectedItem.prompt && (
                <p className={styles.detailMeta}>{selectedItem.prompt}</p>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div
      className={styles.scene}
      onMouseMove={handleMouseMove}
      onWheel={(e) => {
        e.preventDefault();
        wheelAngle.set(wheelAngle.get() - e.deltaY * 0.2);
      }}
    >
      {/* Hovered item center preview */}
      <div className={styles.centerPreview}>
        <AnimatePresence mode="wait">
          {hoveredItem && (
            <motion.div
              key={hoveredItem.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={styles.centerContent}
            >
              <h3 className={styles.centerTitle}>{hoveredItem.title}</h3>
              <motion.img
                layoutId={`img-${hoveredItem.id}`}
                src={hoveredItem.imageUrl}
                alt={hoveredItem.title}
                className={styles.centerImage}
              />
              {hoveredItem.category && (
                <p className={styles.centerCategory}>{hoveredItem.category}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3D Ring Container */}
      <motion.div
        className={styles.ring}
        style={{ transformStyle: "preserve-3d", transform: containerTransform }}
      >
        {displayItems.map((item, i) => {
          const angle = (i / displayItems.length) * 360;
          return (
            <div
              key={`${item.id}-${i}`}
              className={styles.ringItem}
              style={{
                transform: `rotateY(${angle}deg) translateZ(1100px) rotateY(90deg)`,
                transformStyle: "preserve-3d",
              }}
              onClick={() => setSelectedItem(item)}
              onMouseEnter={() => setHoveredItem(item)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                className={`${styles.ringImage} ${hoveredItem?.id === item.id ? styles.active : ""}`}
              />
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
