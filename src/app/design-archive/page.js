"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import styles from "./PersonalDesignLibrary.module.css";
import defaultSiteContent from "../../data/site-content.json";
import { openContextChatFromElement } from "../../lib/contextChat";

const MEDIA_IMAGES_BASE = "/media/images";
const DEFAULT_BOOK_COVER = `${MEDIA_IMAGES_BASE}/archive/Frame 1.png`;
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
const ARCHIVE_COVER_ASPECT = 867 / 1812;

function PlaceholderBook() {
  return (
    <group rotation={[-0.03, 0.08, 0]} scale={[0.68, 0.68, 0.68]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.62 * ARCHIVE_COVER_ASPECT, 1.62, 0.04]} />
        <meshStandardMaterial
          color="#f1f1ef"
          roughness={0.9}
          metalness={0}
          emissive="#ffffff"
          emissiveIntensity={0.08}
        />
      </mesh>
      <mesh position={[0, 0, -0.008]} castShadow receiveShadow>
        <boxGeometry args={[1.54 * ARCHIVE_COVER_ASPECT, 1.54, 0.022]} />
        <meshStandardMaterial color="#f7f7f5" roughness={0.94} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.02, 0]} receiveShadow>
        <planeGeometry args={[2.4, 2.4]} />
        <shadowMaterial opacity={0.08} />
      </mesh>
    </group>
  );
}

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
      color: "#ffffff",
      roughness: 0.9,
      metalness: 0,
      emissiveMap: preparedTexture || null,
      emissive: "#ffffff",
      emissiveIntensity: 0.28,
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
    <group ref={groupRef} scale={[0.68, 0.68, 0.68]}>
      <mesh castShadow receiveShadow material={materials}>
        <boxGeometry args={[1.62 * ARCHIVE_COVER_ASPECT, 1.62, 0.04]} />
      </mesh>
      <mesh position={[0, 0, -0.008]} castShadow receiveShadow>
        <boxGeometry args={[1.54 * ARCHIVE_COVER_ASPECT, 1.54, 0.022]} />
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
      <spotLight position={[0.25, 0.45, 3.1]} intensity={1.45} angle={0.44} penumbra={0.75} distance={8} />
      <Suspense fallback={<PlaceholderBook />}>
        <RotatingBook coverUrl={coverUrl} />
      </Suspense>
    </Canvas>
  );
}

export default function PersonalDesignLibraryPage() {
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
      cover: normalizeImageUrl(DEFAULT_BOOK_COVER, DEFAULT_BOOK_COVER),
      openLabel: libraryConfig?.book?.openLabel || DEFAULT_LIBRARY_CONFIG.book.openLabel,
    }),
    [libraryConfig]
  );

  const printImages = useMemo(() => {
    const base =
      Array.isArray(libraryConfig?.fallingImages) && libraryConfig.fallingImages.length > 0
        ? libraryConfig.fallingImages
        : DEFAULT_FALLING_IMAGES;

    return base.slice(0, 4).map((item, index) => {
      const rotate = Number.isFinite(item?.rotate) ? item.rotate : index % 2 ? 0 : 270;
      return {
        id: index,
        src: normalizeImageUrl(item?.src, DEFAULT_FALLBACK_IMAGE),
        rotate,
        width: Number.isFinite(item?.width) ? item.width : 1279,
        height: Number.isFinite(item?.height) ? item.height : 1706,
        rotated: rotate === 90 || rotate === 270,
      };
    });
  }, [libraryConfig]);

  const rightNote = useMemo(() => {
    if (Array.isArray(libraryConfig?.rightNote) && libraryConfig.rightNote.length >= 2) {
      return libraryConfig.rightNote;
    }
    return DEFAULT_LIBRARY_CONFIG.rightNote;
  }, [libraryConfig]);

  const leftCopyright =
    libraryConfig?.leftCopyright || DEFAULT_LIBRARY_CONFIG.leftCopyright || "© 2026 plusesee.me";

  const archiveContext = useMemo(
    () => ({
      id: "design-archive-book",
      type: "archive",
      title: book.title,
      date: book.year,
      intro: `这本 Design Archive 将 ${book.year} 年的个人设计实践整理为第一册作品集，未来还会以新的册次持续收录更多作品。`,
      description: `这是王佳奕持续整理个人设计实践的 Design Archive。目前第一册收录并整理了 ${book.year} 年的作品，同时以数字版本和实体印刷册呈现；未来还会继续收录新的作品，并制作新的册次。`,
      prompts: [
        "什么是 Design Archive？",
        "这本作品集创作于什么时候？",
        "为什么要建立 Design Archive？",
      ],
      inputPlaceholder: "向 AI 询问 Design Archive",
    }),
    [book]
  );

  const archiveWelcomeContext = useMemo(
    () => ({
      id: "design-archive-welcome",
      type: "archive",
      title: "WELCOME TO THE ARCHIVE",
      date: book.year,
      intro: `Design Archive 目前将 ${book.year} 年的个人设计实践整理成第一册作品集，未来会继续收录新作品并延续为新的册次。`,
      description: `Design Archive 是王佳奕持续整理个人设计实践的系列作品集。目前第一册整理了 ${book.year} 年的作品，未来还会继续收录新的作品并制作新的册次。`,
      prompts: [
        "Design Archive 里收录了什么？",
        "为什么采用档案的形式？",
        "应该如何浏览这个页面？",
      ],
      inputPlaceholder: "向 AI 询问这个设计档案",
    }),
    [book.year]
  );

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.books}>
          <article className={`${styles.book} ${styles.bookWithPreview}`}>
            <div className={styles.coverStage}>
              <Link
                href={book.href}
                className={`${styles.coverLink} ${styles.coverTrigger}`}
                aria-label={`打开${book.title}`}
              >
                <div className={styles.coverWrap}>
                  <BookletCanvas coverUrl={book.cover} />
                </div>
              </Link>

              <div className={styles.printPreview} aria-hidden="true">
                {printImages.map((item, index) => (
                  <div
                    key={item.id}
                    className={`${styles.printCard} ${styles[`printCard${index + 1}`]} ${item.rotated ? styles.printCardRotated : ""}`}
                    style={{
                      "--preview-delay": `${index * 45}ms`,
                    }}
                  >
                    <img
                      src={item.src}
                      alt=""
                      className={`${styles.printImage} ${
                        item.rotate === 90
                          ? styles.printImageRotate90
                          : item.rotate === 270
                            ? styles.printImageRotate270
                            : ""
                      }`}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  </div>
                ))}
                <span className={styles.printPreviewCaption}>[FORMAT] PRINTED EDITION</span>
              </div>
            </div>

            <section className={styles.info}>
              <button
                type="button"
                className={styles.infoAsk}
                data-cursor-ai="true"
                aria-label={`向 AI 询问：${book.title}`}
                onClick={(event) => openContextChatFromElement(event.currentTarget, archiveContext)}
              >
                <span className={styles.metaRow}>
                  <span>[TYPE]</span>
                  <span>{book.type}</span>
                </span>
                <span className={styles.metaRow}>
                  <span>[SIZE]</span>
                  <span>{book.size}</span>
                </span>
                <span className={styles.metaRow}>
                  <span>[YEAR]</span>
                  <span>{book.year}</span>
                </span>
              </button>

              <Link href={book.href} className={styles.openBtn}>
                {book.openLabel}
              </Link>
            </section>
          </article>
        </section>

        <button
          type="button"
          className={styles.rightNote}
          data-cursor-ai="true"
          aria-label="向 AI 询问：Welcome to the Archive"
          onClick={(event) =>
            openContextChatFromElement(event.currentTarget, archiveWelcomeContext)
          }
        >
          <span>{rightNote[0]}</span>
          <span>{rightNote[1]}</span>
        </button>

        <p className={styles.leftCopyright} aria-hidden="true">
          {leftCopyright}
        </p>
      </main>
    </div>
  );
}
