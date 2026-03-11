"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence, useSpring, useMotionTemplate } from "framer-motion";
import styles from "./RingCarousel.module.css";

export default function RingCarousel({ items }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
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

  // Start with a rotation and far away for entry animation
  const wheelAngle = useMotionValue(90);
  const smoothWheelAngle = useSpring(wheelAngle, { damping: 25, stiffness: 60 }); // 1.2s spin (fast to slow)
  const rotationY = useTransform(() => rotationYFromMouse.get() + smoothWheelAngle.get());

  const entryZ = useMotionValue(-4000);
  const smoothEntryZ = useSpring(entryZ, { damping: 25, stiffness: 50 }); // 1.2s zoom-in (graceful ease-out)

  useEffect(() => {
    // Fly in and spin to 0 on mount
    wheelAngle.set(0);
    entryZ.set(0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dynamicTranslateZ = useTransform(() => translateZ.get() + smoothEntryZ.get());

  const containerTransform = useMotionTemplate`translateZ(${dynamicTranslateZ}px) rotateX(${rotationX}deg) rotateY(${rotationY}deg) rotateZ(${rotationZ}deg)`;

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

  const sceneRef = useRef(null);
  
  // Continuous scroll counter differentiates 'exploring' from 'swiping away'
  const continuousDownScroll = useRef(0);
  const scrollEnergy = useMotionValue(0); 
  const smoothEnergy = useSpring(scrollEnergy, { damping: 30, stiffness: 150 });
  
  // Scale the ENTIRE scene down instead of the 3D inner ring to avoid 3D clipping bugs in browsers
  const sceneScale = useTransform(smoothEnergy, [0, 400], [1, 0.55]);
  const sceneOpacity = useTransform(smoothEnergy, [0, 400], [1, 0]);

  const isTransitioning = useRef(false);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const handleWheel = (e) => {
      // Allow detail view to handle its own scrolling if open
      if (document.querySelector(`.${styles.detailView}`)) return;
      
      e.preventDefault(); // Stop native scroll snap while in the ring
      if (isTransitioning.current) return;

      if (e.deltaY > 0) {
        // User scrolling down: Accumulate permanently
        continuousDownScroll.current += e.deltaY;

        // Phase 1: Pure rotation (first 250px of accumulated downward scroll)
        if (continuousDownScroll.current < 250) {
          wheelAngle.set(wheelAngle.get() - e.deltaY * 0.15);
        } 
        // Phase 2: Push away & Snap (scroll > 250px)
        else {
          // Still rotate very slightly for flavor
          wheelAngle.set(wheelAngle.get() - e.deltaY * 0.05);

          const newEnergy = scrollEnergy.get() + e.deltaY;
          scrollEnergy.set(Math.min(newEnergy, 500)); // Visual cap
          
          // Threshold to snap (400)
          if (newEnergy > 400) {
            isTransitioning.current = true;
            
            const chatElement = document.getElementById("ai-chat");
            if (chatElement) {
              chatElement.scrollIntoView({ behavior: "smooth" });
            }
            
            // Reset state after animation finishes
            setTimeout(() => {
              scrollEnergy.set(0); 
              continuousDownScroll.current = 0;
              isTransitioning.current = false;
            }, 1000);
          }
        }
      } else {
        // User scrolling UP: smoothly pull the ring back toward them
        continuousDownScroll.current = Math.max(0, continuousDownScroll.current + e.deltaY);
        scrollEnergy.set(Math.max(0, scrollEnergy.get() + e.deltaY));
        wheelAngle.set(wheelAngle.get() - e.deltaY * 0.15); // normal up-spin
      }
    };

    scene.addEventListener("wheel", handleWheel, { passive: false });
    return () => scene.removeEventListener("wheel", handleWheel);
  }, [selectedItem]); // re-bind if selectedItem changes so we know if detail is open

  return (
    <motion.div
      ref={sceneRef}
      className={styles.scene}
      onMouseMove={handleMouseMove}
      style={{ scale: sceneScale, opacity: sceneOpacity }}
    >
      {/* Hovered item center preview */}
      <div className={styles.centerPreview}>
        <AnimatePresence mode="wait">
          {hoveredIndex !== null && displayItems[hoveredIndex] && (
            <motion.div
              key={hoveredIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={styles.centerContent}
            >
              <h3 className={styles.centerTitle}>{displayItems[hoveredIndex].title}</h3>
              <motion.img
                layoutId={`img-${hoveredIndex}`}
                src={displayItems[hoveredIndex].imageUrl}
                alt={displayItems[hoveredIndex].title}
                className={styles.centerImage}
              />
              {displayItems[hoveredIndex].category && (
                <p className={styles.centerCategory}>{displayItems[hoveredIndex].category}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3D Ring Container */}
      <motion.div
        className={styles.ring}
        style={{ 
          transformStyle: "preserve-3d", 
          transform: containerTransform 
        }}
      >
        {displayItems.map((item, i) => {
          const angle = (i / displayItems.length) * 360;
          return (
            <div
              key={`${item.id}-${i}`}
              className={styles.ringItem}
              role="button"
              tabIndex={0}
              style={{
                transform: `rotateY(${angle}deg) translateZ(850px) rotateY(90deg)`,
                transformStyle: "preserve-3d",
              }}
              onClick={() => setSelectedItem(item)}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className={`${styles.ringTitle} ${hoveredIndex === i ? styles.active : ""}`}>
                {item.title}
              </div>
              <img
                src={item.imageUrl}
                alt={item.title}
                className={`${styles.ringImage} ${hoveredIndex === i ? styles.active : ""}`}
              />
            </div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
