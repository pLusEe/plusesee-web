"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import styles from "./Carousel3D.module.css";

const ROLES = [
  "Architects.",
  "Designers.",
  "Retail Planners.",
  "Innovators.",
  "Creators.",
  "CLOU."
];

function CarouselItem({ item, index, totalItems, smoothAngle, onSelect, activeIndex }) {
  const baseAngle = (index / totalItems) * Math.PI * 2;
  
  // Custom transforming functions for elliptic path
  const x = useTransform(smoothAngle, (latestAngle) => {
    return Math.sin(baseAngle + latestAngle) * 700; // X radius
  });
  
  const z = useTransform(smoothAngle, (latestAngle) => {
    return Math.cos(baseAngle + latestAngle) * 350; // Z radius
  });

  // Calculate distance from front (0 or 2PI)
  const distFromFront = useTransform(smoothAngle, (latestAngle) => {
    let currentAngle = (baseAngle + latestAngle) % (Math.PI * 2);
    if (currentAngle < 0) currentAngle += Math.PI * 2;
    return Math.min(currentAngle, Math.PI * 2 - currentAngle);
  });

  const scale = useTransform(distFromFront, (d) => 1 - (d / Math.PI) * 0.4);
  const opacity = useTransform(distFromFront, (d) => 1 - (d / Math.PI) * 0.8);
  const zIndex = useTransform(distFromFront, (d) => Math.round(100 - d * 10));

  const isActive = index === activeIndex;

  return (
    <motion.div
      className={styles.carouselItem}
      style={{
        x,
        z,
        scale,
        opacity,
        zIndex,
      }}
      onClick={() => onSelect(item)}
      whileHover={{ y: -20, transition: { duration: 0.2 } }}
    >
      <motion.div className={styles.imageWrapper}>
        <motion.img 
          layoutId={`image-${item.id}`} 
          src={item.imageUrl} 
          alt={item.title} 
          className={styles.image} 
        />
        <div className={styles.hoverTitle}>{item.title}</div>
      </motion.div>
    </motion.div>
  );
}

export default function Carousel3D({ items }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Fill array for a dense ring
  const minItems = 24; 
  let displayItems = [...items];
  if (items.length > 0) {
    while (displayItems.length < minItems) {
      displayItems = [...displayItems, ...items];
    }
  }
  displayItems = displayItems.slice(0, Math.max(minItems, items.length));

  // Framer Motion values for rotation
  const angle = useMotionValue(0);
  // Smooth spring for physics
  const smoothAngle = useSpring(angle, { damping: 25, stiffness: 120 });
  
  // Track continuous index
  const angleRef = useRef(0);
  const step = (Math.PI * 2) / displayItems.length;

  // Handle wheel scroll
  useEffect(() => {
    const handleWheel = (e) => {
      // Prevent page scrolling while orbiting
      e.preventDefault();
      const delta = e.deltaY * 0.002;
      angleRef.current -= delta;
      
      // Calculate closest index for snapping physics
      const closestIndex = Math.round(-angleRef.current / step);
      const safeIndex = ((closestIndex % displayItems.length) + displayItems.length) % displayItems.length;
      setActiveIndex(safeIndex);
      
      // Update motion value
      angle.set(angleRef.current);
    };

    let timeout;
    const handleSnap = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        // Snap to nearest item when scroll stops
        const closestIndex = Math.round(-angleRef.current / step);
        angleRef.current = -closestIndex * step;
        angle.set(angleRef.current);
      }, 150);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("wheel", handleSnap, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("wheel", handleSnap);
    };
  }, [step, displayItems.length, angle]);

  const [roleIndex, setRoleIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setRoleIndex((prev) => (prev + 1) % ROLES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.container}>
      {/* Dynamic Center Text */}
      <div className={styles.centerTextContainer}>
        <AnimatePresence mode="popLayout">
          <motion.h2
            key={roleIndex}
            initial={{ opacity: 0, filter: "blur(10px)", y: 20 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            exit={{ opacity: 0, filter: "blur(10px)", y: -20 }}
            transition={{ duration: 0.8 }}
            className={styles.centerText}
          >
            We are <br/>{ROLES[roleIndex]}
          </motion.h2>
        </AnimatePresence>
      </div>

      {/* 3D Scene */}
      <div className={styles.scene}>
        <div className={styles.carouselPivot}>
          {displayItems.map((item, i) => (
            <CarouselItem
              key={`${item.id}-${i}`}
              item={item}
              index={i}
              totalItems={displayItems.length}
              smoothAngle={smoothAngle}
              onSelect={setSelectedItem}
              activeIndex={activeIndex}
            />
          ))}
        </div>
      </div>

      {/* Shared Element Detail Transition */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div 
            className={styles.detailView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className={styles.detailHeader}>
              <button 
                className={styles.closeBtn} 
                onClick={() => setSelectedItem(null)}
                data-hover-text="CLOSE"
              >
                &times;
              </button>
            </div>
            
            <div className={styles.detailContent}>
              <motion.div className={styles.detailImageContainer}>
                <motion.img 
                  layoutId={`image-${selectedItem.id}`}
                  src={selectedItem.imageUrl} 
                  alt={selectedItem.title} 
                  className={styles.detailHeroImage}
                />
              </motion.div>
              
              <motion.div 
                className={styles.detailInfo}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <h1 className={styles.detailTitle}>{selectedItem.title}</h1>
                <div className={styles.hr} />
                <p className={styles.detailDesc}>{selectedItem.description}</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
