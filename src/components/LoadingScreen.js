"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import styles from "./LoadingScreen.module.css";

export default function LoadingScreen() {
  const pathname = usePathname();
  const [text, setText] = useState("");
  const [isFading, setIsFading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const fullText = "plusesee";

  useEffect(() => {
    // Abort and hide immediately if not on the root index
    if (pathname !== "/") {
      setIsFinished(true);
      return;
    }

    // Reset everything in case we just soft-routed back to "/"
    setIsFinished(false);
    setIsFading(false);
    setText("");

    let currentIndex = 0;
    
    // Slight initial delay before typing starts
    const startDelay = setTimeout(() => {
      const typingInterval = setInterval(() => {
        setText(fullText.slice(0, currentIndex + 1));
        currentIndex++;
        
        if (currentIndex >= fullText.length) {
          clearInterval(typingInterval);
          
          // Wait to let users read the full word, then fade out
          setTimeout(() => {
            setIsFading(true);
            
            // Wait for CSS opacity transition to complete before unmounting
            setTimeout(() => {
              setIsFinished(true);
            }, 400);
          }, 700);
        }
      }, 55); // Typing speed per character
      
      return () => clearInterval(typingInterval);
    }, 200);

    return () => clearTimeout(startDelay);
  }, [pathname]);

  if (isFinished || pathname !== "/") return null;

  return (
    <div className={`${styles.loader} ${isFading ? styles.fadeOut : ""}`}>
      <div className={styles.textContainer}>
        {text}<span className={styles.cursor}></span>
      </div>
    </div>
  );
}
