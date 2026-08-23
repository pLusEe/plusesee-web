"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import styles from "./LoadingScreen.module.css";

const FULL_TEXT = "plusesee";
const MAX_RING_WAIT_MS = 3000;
const HOME_INTRO_SESSION_KEY = "plusesee:home-intro-completed";
let homeIntroCompleted = false;

const hasCompletedHomeIntro = () => {
  if (homeIntroCompleted) return true;
  try {
    return window.sessionStorage.getItem(HOME_INTRO_SESSION_KEY) === "1";
  } catch {
    return false;
  }
};

const markHomeIntroCompleted = () => {
  homeIntroCompleted = true;
  try {
    window.sessionStorage.setItem(HOME_INTRO_SESSION_KEY, "1");
  } catch {}
};

const isLocalMotionTest = () => {
  if (typeof window === "undefined") return false;
  const isLocalHost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  return (
    isLocalHost &&
    new URLSearchParams(window.location.search).get("motion-test") === "1"
  );
};

export default function LoadingScreen() {
  const pathname = usePathname();
  const [text, setText] = useState("");
  const [isFading, setIsFading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [typingFinished, setTypingFinished] = useState(false);
  const [ringReady, setRingReady] = useState(false);
  const [waitTimedOut, setWaitTimedOut] = useState(false);

  useEffect(() => {
    if (isLocalMotionTest()) {
      setIsFinished(true);
      return undefined;
    }

    if (pathname !== "/") {
      setIsFinished(true);
      return undefined;
    }

    if (hasCompletedHomeIntro()) {
      setIsFinished(true);
      return undefined;
    }

    setIsFinished(false);
    setIsFading(false);
    setText("");
    setTypingFinished(false);
    setRingReady(false);
    setWaitTimedOut(false);

    let currentIndex = 0;
    let typingInterval;
    let readingDelay;

    const handleRingReady = () => setRingReady(true);
    window.addEventListener("plusesee:ring-ready", handleRingReady);

    const startDelay = setTimeout(() => {
      typingInterval = setInterval(() => {
        setText(FULL_TEXT.slice(0, currentIndex + 1));
        currentIndex++;

        if (currentIndex >= FULL_TEXT.length) {
          clearInterval(typingInterval);
          readingDelay = setTimeout(() => {
            setTypingFinished(true);
          }, 700);
        }
      }, 55);
    }, 200);

    const maxWait = setTimeout(() => setWaitTimedOut(true), MAX_RING_WAIT_MS);

    return () => {
      window.removeEventListener("plusesee:ring-ready", handleRingReady);
      clearTimeout(startDelay);
      clearTimeout(readingDelay);
      clearTimeout(maxWait);
      clearInterval(typingInterval);
    };
  }, [pathname]);

  useEffect(() => {
    if (
      pathname !== "/" ||
      isFinished ||
      !typingFinished ||
      (!ringReady && !waitTimedOut)
    ) {
      return undefined;
    }

    setIsFading(true);
    const finishTimer = setTimeout(() => {
      markHomeIntroCompleted();
      setIsFinished(true);
      window.dispatchEvent(new CustomEvent("plusesee:home-intro-finished"));
    }, 400);
    return () => clearTimeout(finishTimer);
  }, [isFinished, pathname, ringReady, typingFinished, waitTimedOut]);

  if (isFinished || pathname !== "/") return null;

  return (
    <div className={`${styles.loader} ${isFading ? styles.fadeOut : ""}`}>
      <div className={styles.textContainer}>
        {text}<span className={styles.cursor}></span>
      </div>
    </div>
  );
}
