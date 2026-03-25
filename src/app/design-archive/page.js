"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import styles from "./PersonalDesignLibrary.module.css";
import defaultSiteContent from "../../data/site-content.json";

const MEDIA_IMAGES_BASE = "/media/images";
const DEFAULT_BOOK_COVER = `${MEDIA_IMAGES_BASE}/youshenyouren4.jpg`;
const DEFAULT_FALLBACK_IMAGE = `${MEDIA_IMAGES_BASE}/placeholder1.jpg`;

const normalizeImageUrl = (url, fallback = DEFAULT_FALLBACK_IMAGE) => {
  if (typeof url !== "string") return fallback;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "." || trimmed === "/." || trimmed.endsWith("/.")) return fallback;
  if (/^(https?:|data:)/.test(trimmed)) return trimmed;
  if (trimmed.startsWith(`${MEDIA_IMAGES_BASE}/`)) return trimmed;
  if (trimmed.startsWith("/")) return `${MEDIA_IMAGES_BASE}${trimmed}`;
  return `${MEDIA_IMAGES_BASE}/${trimmed}`;
};

const DEFAULT_FALLING_IMAGES = [
  { src: "portfolio1.jpg", rotate: 270, width: 1279, height: 1865 },
  { src: "portfolio2.jpg", rotate: 0, width: 1279, height: 1993 },
  { src: "portfolio3.jpg", rotate: 270, width: 1279, height: 1706 },
  { src: "portfolio4.jpg", rotate: 0, width: 1279, height: 1706 },
];

const DEFAULT_LIBRARY_CONFIG = defaultSiteContent.personalDesign.library;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function RotatingBook({ coverUrl }) {
  const groupRef = useRef(null);
  const safeCoverUrl = useMemo(() => normalizeImageUrl(coverUrl, DEFAULT_BOOK_COVER), [coverUrl]);
  const frontTexture = useTexture(safeCoverUrl);

  const preparedTexture = useMemo(() => {
    if (!frontTexture) return null;
    const nextTexture = frontTexture.clone();
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    nextTexture.anisotropy = 8;
    nextTexture.needsUpdate = true;
    return nextTexture;
  }, [frontTexture]);

  const materials = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.84,
      metalness: 0.02,
      emissive: "#ffffff",
      emissiveIntensity: 0.12,
    });
    const topBottom = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.86,
      metalness: 0.02,
      emissive: "#ffffff",
      emissiveIntensity: 0.1,
    });
    const front = new THREE.MeshStandardMaterial({
      map: preparedTexture || null,
      roughness: 0.82,
      metalness: 0.03,
    });
    const back = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.88,
      metalness: 0.02,
      emissive: "#ffffff",
      emissiveIntensity: 0.08,
    });

    // Box material order: right, left, top, bottom, front, back.
    return [side, side, topBottom, topBottom, front, back];
  }, [preparedTexture]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.rotation.y = 0.08 + Math.sin(t * 0.42) * 0.5;
    groupRef.current.rotation.x = Math.sin(t * 0.5) * 0.055 - 0.03;
    groupRef.current.position.y = Math.sin(t * 0.62) * 0.022;
  });

  return (
    <group ref={groupRef} scale={[0.84, 0.84, 0.84]}>
      <mesh castShadow receiveShadow material={materials}>
        <boxGeometry args={[1.02, 1.62, 0.04]} />
      </mesh>
      <mesh position={[0, 0, -0.008]} castShadow receiveShadow>
        <boxGeometry args={[0.94, 1.54, 0.022]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.92}
          metalness={0}
          emissive="#ffffff"
          emissiveIntensity={0.05}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.02, 0]} receiveShadow>
        <planeGeometry args={[2.4, 2.4]} />
        <shadowMaterial opacity={0.12} />
      </mesh>
    </group>
  );
}

function BookletCanvas({ coverUrl }) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      camera={{ position: [0, 0, 3.25], fov: 37 }}
      gl={{ antialias: true, alpha: true }}
      className={styles.bookletCanvas}
    >
      <ambientLight intensity={1.25} />
      <hemisphereLight args={["#ffffff", "#eef1f6", 0.72]} />
      <directionalLight position={[2.8, 5.2, 3.8]} intensity={1.18} castShadow />
      <directionalLight position={[-3, 2.5, 2.5]} intensity={0.62} />
      <directionalLight position={[0.4, 1.8, -2.4]} intensity={0.24} />
      <Suspense fallback={null}>
        <RotatingBook coverUrl={coverUrl} />
      </Suspense>
    </Canvas>
  );
}

export default function PersonalDesignLibraryPage() {
  const stageRef = useRef(null);
  const cardsRef = useRef([]);
  const dragRef = useRef({
    id: null,
    offsetX: 0,
    offsetY: 0,
    lastTime: 0,
    vx: 0,
    vy: 0,
  });
  const [cards, setCards] = useState([]);
  const [libraryConfig, setLibraryConfig] = useState(DEFAULT_LIBRARY_CONFIG);

  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((data) => {
        const nextLibrary = data?.personalDesign?.library;
        if (nextLibrary && typeof nextLibrary === "object") {
          setLibraryConfig({
            ...DEFAULT_LIBRARY_CONFIG,
            ...nextLibrary,
            book: {
              ...DEFAULT_LIBRARY_CONFIG.book,
              ...(nextLibrary.book || {}),
            },
            fallingImages:
              Array.isArray(nextLibrary.fallingImages) && nextLibrary.fallingImages.length > 0
                ? nextLibrary.fallingImages
                : DEFAULT_LIBRARY_CONFIG.fallingImages,
          });
        }
      })
      .catch(() => {});
  }, []);

  const book = useMemo(
    () => ({
      title: libraryConfig?.book?.title || DEFAULT_LIBRARY_CONFIG.book.title,
      type: libraryConfig?.book?.type || DEFAULT_LIBRARY_CONFIG.book.type,
      size: libraryConfig?.book?.size || DEFAULT_LIBRARY_CONFIG.book.size,
      year: libraryConfig?.book?.year || DEFAULT_LIBRARY_CONFIG.book.year,
      href: libraryConfig?.book?.href || DEFAULT_LIBRARY_CONFIG.book.href,
      cover: normalizeImageUrl(
        libraryConfig?.book?.coverUrl || DEFAULT_LIBRARY_CONFIG.book.coverUrl,
        DEFAULT_BOOK_COVER
      ),
      openLabel: libraryConfig?.book?.openLabel || DEFAULT_LIBRARY_CONFIG.book.openLabel,
    }),
    [libraryConfig]
  );

  const fallingImages = useMemo(() => {
    const base =
      Array.isArray(libraryConfig?.fallingImages) && libraryConfig.fallingImages.length > 0
        ? libraryConfig.fallingImages
        : DEFAULT_FALLING_IMAGES;

    return base.map((item, index) => ({
      src: normalizeImageUrl(item?.src, DEFAULT_FALLBACK_IMAGE),
      rotate: Number.isFinite(item?.rotate) ? item.rotate : index % 2 ? 0 : 270,
      width: Number.isFinite(item?.width) ? item.width : 1279,
      height: Number.isFinite(item?.height) ? item.height : 1706,
    }));
  }, [libraryConfig]);

  const rightNote = useMemo(() => {
    if (Array.isArray(libraryConfig?.rightNote) && libraryConfig.rightNote.length >= 2) {
      return libraryConfig.rightNote;
    }
    return DEFAULT_LIBRARY_CONFIG.rightNote;
  }, [libraryConfig]);

  const leftCopyright =
    libraryConfig?.leftCopyright || DEFAULT_LIBRARY_CONFIG.leftCopyright || "© 2026 plusesee.me";

  const getLocalPoint = useCallback((event) => {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, [fallingImages]);

  const buildCards = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const width = stage.clientWidth;
    const height = stage.clientHeight;
    const base = clamp(width * 0.2, 150, 228);
    const gap = clamp(width * 0.018, 10, 18);
    let cursor = clamp(width * 0.04, 12, 34);

    const next = fallingImages.map((item, index) => {
      const ratio = item.width / item.height;
      const rotated = item.rotate === 90 || item.rotate === 270;
      const w = rotated ? base : base * ratio;
      const h = rotated ? base * ratio : base;
      const y = -h - 36 - index * (h * 0.7);
      const x = cursor;
      cursor += w + gap;
      return {
        id: index,
        ...item,
        ratio,
        rotated,
        w,
        h,
        x,
        y,
        vx: (index - (fallingImages.length - 1) / 2) * 20,
        vy: 0,
        z: index + 1,
      };
    });

    const maxRight = Math.max(...next.map((card) => card.x + card.w));
    if (maxRight > width - 8) {
      const shift = maxRight - (width - 8);
      next.forEach((card) => {
        card.x = clamp(card.x - shift, 8, Math.max(8, width - card.w - 8));
      });
    }

    cardsRef.current = next;
    setCards(next);
  }, [fallingImages]);

  useEffect(() => {
    buildCards();
    window.addEventListener("resize", buildCards);
    return () => window.removeEventListener("resize", buildCards);
  }, [buildCards]);

  useEffect(() => {
    const onPointerMove = (event) => {
      const drag = dragRef.current;
      if (drag.id === null) return;
      const local = getLocalPoint(event);
      const stage = stageRef.current;
      if (!local || !stage) return;

      const next = [...cardsRef.current];
      const idx = next.findIndex((card) => card.id === drag.id);
      if (idx < 0) return;
      const card = next[idx];
      const now = performance.now();
      const dt = Math.max(0.001, (now - drag.lastTime) / 1000);

      const x = clamp(local.x - drag.offsetX, 0, stage.clientWidth - card.w);
      const y = clamp(local.y - drag.offsetY, -card.h * 1.4, stage.clientHeight - card.h);

      drag.vx = (x - card.x) / dt;
      drag.vy = (y - card.y) / dt;
      drag.lastTime = now;

      next[idx] = { ...card, x, y, vx: 0, vy: 0 };
      cardsRef.current = next;
      setCards(next);
    };

    const releaseDrag = () => {
      const drag = dragRef.current;
      if (drag.id === null) return;

      const next = [...cardsRef.current];
      const idx = next.findIndex((card) => card.id === drag.id);
      if (idx >= 0) {
        const card = next[idx];
        next[idx] = {
          ...card,
          vx: drag.vx * 0.62,
          vy: drag.vy * 0.62,
        };
      }

      cardsRef.current = next;
      setCards(next);
      dragRef.current = {
        id: null,
        offsetX: 0,
        offsetY: 0,
        lastTime: 0,
        vx: 0,
        vy: 0,
      };
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", releaseDrag);
    window.addEventListener("pointercancel", releaseDrag);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", releaseDrag);
      window.removeEventListener("pointercancel", releaseDrag);
    };
  }, [getLocalPoint]);

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    const gravity = 2250;
    const bounce = 0.28;
    const wallBounce = 0.36;
    const floorFriction = 0.91;

    const tick = (now) => {
      const dt = Math.min(0.033, (now - prev) / 1000);
      prev = now;
      const stage = stageRef.current;

      if (stage && cardsRef.current.length > 0) {
        const width = stage.clientWidth;
        const height = stage.clientHeight;
        const dragId = dragRef.current.id;

        const next = cardsRef.current.map((card) => {
          if (card.id === dragId) return card;

          let x = card.x + card.vx * dt;
          let y = card.y + card.vy * dt;
          let vx = card.vx;
          let vy = card.vy + gravity * dt;

          const floor = height - card.h;
          const maxX = width - card.w;

          if (x < 0) {
            x = 0;
            vx = Math.abs(vx) * wallBounce;
          } else if (x > maxX) {
            x = maxX;
            vx = -Math.abs(vx) * wallBounce;
          }

          if (y > floor) {
            y = floor;
            vy = Math.abs(vy) < 46 ? 0 : -Math.abs(vy) * bounce;
            vx *= floorFriction;
          }

          vx *= 0.997;
          return { ...card, x, y, vx, vy };
        });

        cardsRef.current = next;
        setCards(next);
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const handleCardPointerDown = useCallback(
    (event, id) => {
      event.preventDefault();
      const local = getLocalPoint(event);
      if (!local) return;

      const next = [...cardsRef.current];
      const idx = next.findIndex((card) => card.id === id);
      if (idx < 0) return;
      const target = next[idx];
      const maxZ = next.reduce((max, card) => Math.max(max, card.z), 0);

      next[idx] = { ...target, z: maxZ + 1, vx: 0, vy: 0 };
      cardsRef.current = next;
      setCards(next);

      dragRef.current = {
        id,
        offsetX: local.x - target.x,
        offsetY: local.y - target.y,
        lastTime: performance.now(),
        vx: 0,
        vy: 0,
      };
    },
    [getLocalPoint]
  );

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.books}>
          <article className={`${styles.book} ${styles.bookWithPreview}`}>
            <div className={styles.coverStage}>
              <Link href={book.href} className={`${styles.coverLink} ${styles.coverTrigger}`}>
                <div className={styles.coverWrap}>
                  <BookletCanvas coverUrl={book.cover} />
                </div>
              </Link>

              <div ref={stageRef} className={styles.fallStage} aria-hidden="true">
                {cards.map((item) => (
                  <div
                    key={item.id}
                    className={`${styles.fallCard} ${item.rotated ? styles.fallCardRotated : ""}`}
                    onPointerDown={(event) => handleCardPointerDown(event, item.id)}
                    style={{
                      width: `${item.w}px`,
                      height: `${item.h}px`,
                      transform: `translate3d(${item.x}px, ${item.y}px, 0)`,
                      zIndex: item.z,
                      "--card-width": `${item.w}px`,
                      "--card-height": `${item.h}px`,
                    }}
                  >
                    <img
                      src={item.src}
                      alt=""
                      className={`${styles.fallImage} ${
                        item.rotate === 90
                          ? styles.fallImageRotate90
                          : item.rotate === 270
                            ? styles.fallImageRotate270
                            : ""
                      }`}
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            </div>

            <section className={styles.info}>
              <div className={styles.metaRow}>
                <span>[TYPE]</span>
                <span>{book.type}</span>
              </div>
              <div className={styles.metaRow}>
                <span>[SIZE]</span>
                <span>{book.size}</span>
              </div>
              <div className={styles.metaRow}>
                <span>[YEAR]</span>
                <span>{book.year}</span>
              </div>

              <Link href={book.href} className={styles.openBtn}>
                {book.openLabel}
              </Link>
            </section>
          </article>
        </section>

        <p className={styles.rightNote} aria-hidden="true">
          <span>{rightNote[0]}</span>
          <span>{rightNote[1]}</span>
        </p>

        <p className={styles.leftCopyright} aria-hidden="true">
          {leftCopyright}
        </p>
      </main>
    </div>
  );
}
