"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import * as THREE from "three";
import ringThumbnailManifest from "../data/ring-thumbnails.json";
import styles from "./RingCarousel.module.css";

const TARGET_RING_SLOTS = 45;
const TEXTURE_LOAD_CONCURRENCY = 4;
const MAX_DECODED_RING_IMAGES = 30;
const RING_IMAGE_CACHE_TTL_MS = 5 * 60 * 1000;
const HOME_INTRO_SESSION_KEY = "plusesee:home-intro-completed";
const RING_FORMATION_SESSION_KEY = "plusesee:ring-formation-completed";
const RING_CORNER_RADIUS_RATIO = 0.03;
const RING_ENTRY_ANGLE = Math.PI;
const RING_MOTION_FRACTION = 0.94;
const INTRO_VIEW_BLEND_START = 0.08;
const RING_ENTRY_TILT = 0.035;
const RING_IDLE_TILT = 0.1;
const DEFAULT_CARD_SIZE = 0.68;
const DEFAULT_RING_SIZE = 0.65;
const HOVER_CARD_SIZE = 0.8;
const HOVER_RING_SIZE = 0.4;
const INTRO_PATHS = {
  current: { label: "CURRENT", approachSlots: 4.5, duration: 2.4 },
  path1: { label: "PATH 1", approachSlots: 12, duration: 2.55 },
  path2: { label: "PATH 2", approachSlots: 16, duration: 2.65 },
  path3: { label: "PATH 3", approachSlots: 16, duration: 2.65 },
};
const decodedRingImageCache = new Map();
const CAMERA_START = new THREE.Vector3(0, 1.4, 26);
const LOOK_AT_START = new THREE.Vector3(0, 0.42, 0);
const GROUP_POSITION = new THREE.Vector3(0, 0.4, 0);
const MIN_CARD_ASPECT = 0.45;
const MAX_CARD_ASPECT = 2.2;
const WHITE_TINT = new THREE.Color(1, 1, 1);
const DIM_TINT = new THREE.Color(0.7, 0.7, 0.75);
const PLACEHOLDER_TINT = new THREE.Color(0.88, 0.88, 0.88);

const dampAngle = (current, target, lambda, delta) => {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return THREE.MathUtils.damp(current, current + diff, lambda, delta);
};

const smoothstep = (start, end, value) => {
  const progress = THREE.MathUtils.clamp((value - start) / (end - start), 0, 1);
  return progress * progress * (3 - 2 * progress);
};

const getRingAngle = (index, count) =>
  RING_ENTRY_ANGLE + ((count - index) / Math.max(1, count)) * Math.PI * 2;

const cubicBezier = (start, controlA, controlB, end, progress) => {
  const inverse = 1 - progress;
  return (
    inverse * inverse * inverse * start +
    3 * inverse * inverse * progress * controlA +
    3 * inverse * progress * progress * controlB +
    progress * progress * progress * end
  );
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

const getIntroViewBlend = (progress) =>
  smoothstep(INTRO_VIEW_BLEND_START, 1, progress);

const setApproachPathPosition = (target, pathId, radius, progress) => {
  const startX = radius * 0.8;
  const startY = -0.28;
  const startZ = -radius * 1.75;
  const endX = Math.sin(RING_ENTRY_ANGLE) * radius;
  const endZ = Math.cos(RING_ENTRY_ANGLE) * radius;
  const baseX = cubicBezier(startX, radius * 0.62, radius * 0.18, endX, progress);
  const baseY = cubicBezier(startY, -0.14, 0.03, 0, progress);
  const baseZ = cubicBezier(startZ, -radius * 1.55, -radius * 1.18, endZ, progress);
  const envelope = Math.sin(Math.PI * progress);

  if (pathId === "path1") {
    // A long, low arch: it begins farther away, carries its horizontal motion
    // for longer, then meets the existing ring entry without a tall wall of cards.
    const pathX = cubicBezier(
      radius * 0.95,
      radius * 0.74,
      radius * 0.22,
      endX,
      progress
    );
    const pathZ = cubicBezier(
      -radius * 2.2,
      -radius * 1.95,
      -radius * 1.32,
      endZ,
      progress
    );
    target.set(
      pathX - envelope * radius * 0.06,
      baseY + envelope * radius * 0.4,
      pathZ
    );
    return;
  }

  if (pathId === "path2") {
    // Two visible turns around the approach axis, shrinking cleanly into the ring.
    const phase = progress * Math.PI * 4;
    const helixRadius = radius * 0.46 * Math.pow(envelope, 0.78);
    target.set(
      baseX + Math.sin(phase) * helixRadius * 0.28,
      baseY + Math.sin(phase) * helixRadius * 0.78,
      baseZ + Math.cos(phase) * helixRadius
    );
    return;
  }

  if (pathId === "path3") {
    // A broad screen-space figure eight with a quieter depth roll.
    const phase = progress * Math.PI * 2;
    const loopEnvelope = Math.pow(envelope, 0.72);
    target.set(
      baseX + Math.cos(phase) * radius * 0.14 * loopEnvelope,
      baseY + Math.sin(phase * 2) * radius * 0.56 * loopEnvelope,
      baseZ + Math.sin(phase) * radius * 1.05 * loopEnvelope
    );
    return;
  }

  target.set(baseX, baseY, baseZ);
};

const getThumb = (item) => {
  if (item.thumbUrl) return item.thumbUrl;
  if ((item.mediaType || "image") === "image" && item.mediaUrl) return item.mediaUrl;
  if (item.imageUrl) return item.imageUrl;
  return "/media/images/placeholder1.jpg";
};

const normalizeMediaPath = (value) => decodeURIComponent(String(value || "")).toLowerCase();

const resolveItemTarget = (item) => {
  if (item?.targetUrl) return item.targetUrl;

  const mediaPath = normalizeMediaPath(item?.mediaUrl || item?.imageUrl || item?.thumbUrl);
  if (!mediaPath) return null;

  if (mediaPath.includes("/media/images/commercial-design/")) {
    if (mediaPath.includes("/wechat-csc/") || mediaPath.includes("客服中心")) {
      return "/commercial-design#project-wechat-cmsc";
    }
    if (mediaPath.includes("马年海报260423")) {
      return "/commercial-design#project-horse-poster-260423";
    }
    if (mediaPath.includes("微信经营助手智能体验创新与ip动效设计")) {
      return "/commercial-design#project-wechat-ai-ip-motion";
    }
    if (mediaPath.includes("/feishu-pt1/")) {
      return "/commercial-design#project-feishu-pte";
    }
    if (mediaPath.includes("/feishu-pt2/")) {
      return "/commercial-design#project-feishu-pte2";
    }
  }

  if (mediaPath.includes("/media/images/archive/")) {
    const match = mediaPath.match(/frame\s+(\d+)\.png$/i);
    if (!match) return "/design-archive/2019-2024";
    return `/design-archive/2019-2024?frame=${match[1]}`;
  }

  return null;
};

const resolveJumpTarget = (item) => {
  if (item?.targetUrl) return item.targetUrl;

  const mediaPath = normalizeMediaPath(item?.mediaUrl || item?.imageUrl || item?.thumbUrl);
  if (!mediaPath) return null;

  if (mediaPath.includes("/media/images/commercial-design/")) {
    if (mediaPath.includes("/wechat-csc/") || mediaPath.includes("客服中心")) {
      return "/commercial-design#project-wechat-cmsc";
    }
    if (mediaPath.includes("马年海报260423")) {
      return "/commercial-design#project-horse-poster-260423";
    }
    if (mediaPath.includes("/feishu-pt1/")) {
      return "/commercial-design#project-feishu-pte";
    }
    if (mediaPath.includes("/feishu-pt2/")) {
      return "/commercial-design#project-feishu-pte2";
    }
    return "/commercial-design#project-wechat-ai-ip-motion";
  }

  return resolveItemTarget(item);
};

const TAG_LABELS = {
  commercial: "design on view",
  personalLibrary: "design archive2019-2024",
  personalBook: "design archive2019-2024",
};

const resolveCategoryLabel = (item) => {
  const categories = Array.isArray(item?.categories) ? item.categories : [];
  const mediaPath = normalizeMediaPath(item?.mediaUrl || item?.imageUrl || item?.thumbUrl);
  const category = normalizeMediaPath(item?.category);

  if (
    categories.includes("commercial") ||
    category.includes("commercial") ||
    mediaPath.includes("/media/images/commercial-design/") ||
    mediaPath.includes("/media/images/thumbnail/")
  ) {
    return "design on view";
  }

  if (
    categories.some((tag) => TAG_LABELS[tag] === "design archive2019-2024") ||
    category.includes("archive") ||
    mediaPath.includes("/media/images/archive/")
  ) {
    return "design archive2019-2024";
  }

  return categories.map((tag) => TAG_LABELS[tag]).find(Boolean) || "work";
};

const getDisplayItems = (items) => {
  if (!items.length) return [];
  const slotCount = Math.max(TARGET_RING_SLOTS, items.length);
  return Array.from({ length: slotCount }, (_, index) => items[index % items.length]);
};

const clampValue = (value, min, max) => Math.min(max, Math.max(min, value));

const finalizeTexture = (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
};

const pruneDecodedRingImageCache = () => {
  const now = Date.now();
  decodedRingImageCache.forEach((entry, key) => {
    if (now - entry.lastUsed > RING_IMAGE_CACHE_TTL_MS) {
      decodedRingImageCache.delete(key);
    }
  });

  if (decodedRingImageCache.size <= MAX_DECODED_RING_IMAGES) return;
  const oldestEntries = Array.from(decodedRingImageCache.entries()).sort(
    (left, right) => left[1].lastUsed - right[1].lastUsed
  );
  oldestEntries
    .slice(0, decodedRingImageCache.size - MAX_DECODED_RING_IMAGES)
    .forEach(([key]) => decodedRingImageCache.delete(key));
};

const cacheDecodedRingImage = (key, image) => {
  if (!image) return;
  decodedRingImageCache.set(key, { image, lastUsed: Date.now() });
  pruneDecodedRingImageCache();
};

const createTextureFromCachedImage = (image) => finalizeTexture(new THREE.Texture(image));

const getRingSettings = (item) => ({
  aspect: clampValue(
    typeof item?.ringAspect === "number" ? item.ringAspect : 1,
    MIN_CARD_ASPECT,
    MAX_CARD_ASPECT
  ),
  focusX: clampValue(
    typeof item?.ringCrop?.focusX === "number" ? item.ringCrop.focusX : 0.5,
    0,
    1
  ),
  focusY: clampValue(
    typeof item?.ringCrop?.focusY === "number" ? item.ringCrop.focusY : 0.5,
    0,
    1
  ),
  zoom: clampValue(
    typeof item?.ringCrop?.zoom === "number" ? item.ringCrop.zoom : 1,
    1,
    3
  ),
});

const isSameNumber = (left, right) => Math.abs(Number(left) - Number(right)) < 0.0001;

const getTextureSpec = (item) => {
  const sourceUrl = getThumb(item);
  const settings = getRingSettings(item);
  const generated = ringThumbnailManifest[String(item?.id || "")];
  const canUseGenerated =
    generated &&
    generated.sourceUrl === sourceUrl &&
    isSameNumber(generated.aspect, settings.aspect) &&
    isSameNumber(generated.focusX, settings.focusX) &&
    isSameNumber(generated.focusY, settings.focusY) &&
    isSameNumber(generated.zoom, settings.zoom);

  const url = canUseGenerated ? generated.url : sourceUrl;
  const prepared = Boolean(canUseGenerated);
  const key = prepared
    ? `generated:${url}`
    : `source:${url}:${settings.aspect}:${settings.focusX}:${settings.focusY}:${settings.zoom}`;

  return { key, url, prepared, item, aspect: settings.aspect };
};

const getTargetAspect = (item, sourceAspect) => {
  if (typeof item?.ringAspect === "number") {
    return clampValue(item.ringAspect, MIN_CARD_ASPECT, MAX_CARD_ASPECT);
  }
  return clampValue(sourceAspect, MIN_CARD_ASPECT, MAX_CARD_ASPECT);
};

const getCropRect = (sourceWidth, sourceHeight, targetAspect, zoom = 1, focusX = 0.5, focusY = 0.5) => {
  const sourceAspect = sourceWidth / sourceHeight;
  const safeZoom = clampValue(zoom, 1, 3);

  let baseCropWidth;
  let baseCropHeight;

  if (sourceAspect > targetAspect) {
    baseCropHeight = sourceHeight;
    baseCropWidth = baseCropHeight * targetAspect;
  } else {
    baseCropWidth = sourceWidth;
    baseCropHeight = baseCropWidth / targetAspect;
  }

  const cropWidth = Math.max(1, Math.round(baseCropWidth / safeZoom));
  const cropHeight = Math.max(1, Math.round(baseCropHeight / safeZoom));
  const x = clampValue(
    Math.round((sourceWidth - cropWidth) * clampValue(focusX, 0, 1)),
    0,
    Math.max(0, sourceWidth - cropWidth)
  );
  const y = clampValue(
    Math.round((sourceHeight - cropHeight) * clampValue(focusY, 0, 1)),
    0,
    Math.max(0, sourceHeight - cropHeight)
  );

  return { x, y, cropWidth, cropHeight };
};

const prepareTexture = (texture, item) => {
  const source = texture?.image;
  if (!source?.width || !source?.height) {
    return finalizeTexture(texture.clone());
  }

  const sourceAspect = source.width / source.height;
  const targetAspect = getTargetAspect(item, sourceAspect);
  const focusX = clampValue(
    typeof item?.ringCrop?.focusX === "number" ? item.ringCrop.focusX : 0.5,
    0,
    1
  );
  const focusY = clampValue(
    typeof item?.ringCrop?.focusY === "number" ? item.ringCrop.focusY : 0.5,
    0,
    1
  );
  const zoom = clampValue(
    typeof item?.ringCrop?.zoom === "number" ? item.ringCrop.zoom : 1,
    1,
    3
  );
  const { x, y, cropWidth, cropHeight } = getCropRect(
    source.width,
    source.height,
    targetAspect,
    zoom,
    focusX,
    focusY
  );

  const canvas = document.createElement("canvas");
  canvas.width = cropWidth;
  canvas.height = cropHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    return finalizeTexture(texture.clone());
  }

  const cornerRadius = Math.max(2, Math.min(cropWidth, cropHeight) * RING_CORNER_RADIUS_RATIO);
  context.beginPath();
  context.roundRect(0, 0, cropWidth, cropHeight, cornerRadius);
  context.clip();
  context.drawImage(source, x, y, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return finalizeTexture(new THREE.CanvasTexture(canvas));
};

const useProgressiveTextures = (textureSpecs) => {
  const [textures, setTextures] = useState(() => new Map());

  useEffect(() => {
    let cancelled = false;
    let nextIndex = 0;
    let activeLoads = 0;
    const preparationTimers = new Set();
    const ownedTextures = new Set();
    const uniqueSpecs = Array.from(
      new Map(textureSpecs.map((spec) => [spec.key, spec])).values()
    );
    pruneDecodedRingImageCache();
    const cachedTextures = new Map();
    uniqueSpecs.forEach((spec) => {
      const cached = decodedRingImageCache.get(spec.key);
      if (!cached) return;
      cached.lastUsed = Date.now();
      const texture = createTextureFromCachedImage(cached.image);
      ownedTextures.add(texture);
      cachedTextures.set(spec.key, texture);
    });
    const pendingSpecs = uniqueSpecs.filter((spec) => !cachedTextures.has(spec.key));
    const loader = new THREE.TextureLoader();

    const resetTimer = window.setTimeout(() => {
      if (!cancelled) setTextures(cachedTextures);
    }, 0);
    preparationTimers.add(resetTimer);

    const publishTexture = (spec, texture) => {
      if (cancelled) {
        texture.dispose();
        return;
      }

      ownedTextures.add(texture);
      cacheDecodedRingImage(spec.key, texture.image);
      setTextures((current) => {
        const next = new Map(current);
        next.set(spec.key, texture);
        return next;
      });
    };

    const loadNext = () => {
      if (cancelled) return;

      while (activeLoads < TEXTURE_LOAD_CONCURRENCY && nextIndex < pendingSpecs.length) {
        const spec = pendingSpecs[nextIndex];
        nextIndex += 1;
        activeLoads += 1;

        loader.load(
          spec.url,
          (loadedTexture) => {
            const timer = window.setTimeout(() => {
              preparationTimers.delete(timer);

              if (cancelled) {
                loadedTexture.dispose();
              } else {
                try {
                  const textureItem = spec.prepared
                    ? {
                        ringAspect: spec.aspect,
                        ringCrop: { focusX: 0.5, focusY: 0.5, zoom: 1 },
                      }
                    : spec.item;
                  const preparedTexture = prepareTexture(loadedTexture, textureItem);
                  loadedTexture.dispose();
                  publishTexture(spec, preparedTexture);
                } catch (error) {
                  loadedTexture.dispose();
                  console.warn(`[ring] Could not prepare texture: ${spec.url}`, error);
                }
              }

              activeLoads -= 1;
              loadNext();
            }, 0);

            preparationTimers.add(timer);
          },
          undefined,
          (error) => {
            console.warn(`[ring] Could not load texture: ${spec.url}`, error);
            activeLoads -= 1;
            loadNext();
          }
        );
      }
    };

    loadNext();

    return () => {
      cancelled = true;
      preparationTimers.forEach((timer) => window.clearTimeout(timer));
      ownedTextures.forEach((texture) => texture.dispose());
    };
  }, [textureSpecs]);

  return textures;
};

function Card({
  index,
  texture,
  targetAspect,
  angle,
  radius,
  selected,
  hovered,
  sideHovered,
  selectedMode,
  introProgressRef,
  introPath,
  cardSize,
  count,
  onSelect,
  onHover,
  onActionHover,
  onSideHover,
}) {
  const { camera } = useThree();
  const groupRef = useRef(null);
  const materialRef = useRef(null);
  const targetVector = useRef(new THREE.Vector3());
  const targetScale = useRef(new THREE.Vector3(1, 1, 1));
  const parentQuaternion = useRef(new THREE.Quaternion());
  const desiredQuaternion = useRef(new THREE.Quaternion());

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;

    material.map = texture || null;
    material.opacity = texture ? 0 : 0.025;
    material.color.copy(texture ? WHITE_TINT : PLACEHOLDER_TINT);
    material.needsUpdate = true;
  }, [texture]);

  useFrame((_, delta) => {
    const mesh = groupRef.current;
    if (!mesh || !mesh.parent) return;

    // 1. Calculate dynamic real-time frontness based on the parent group's continuous rotation
    const groupRotY = mesh.parent.rotation.y;
    const worldAngle = angle + groupRotY;
    const frontness = (Math.cos(worldAngle) + 1) / 2;

    // 2. Compute targets
    let tY, tScale, tOpacity, targetRotY, tTint;

    if (selectedMode) {
      // Rigid background layout, uniform sizes, no frontness stretching
      tY = (frontness - 0.5) * 0.16 + (selected ? 0.08 : 0.015);
      
      const popOut = selected ? radius * 0.25 : 0;
      targetVector.current.set(
        Math.sin(angle) * (radius + popOut),
        tY,
        Math.cos(angle) * (radius + popOut)
      );
      
      tScale = selected ? 1.06 : sideHovered ? 0.56 : 0.5;
      tOpacity = selected ? 1 : sideHovered ? 0.34 : 0.15;
      tTint = selected || sideHovered ? WHITE_TINT : DIM_TINT;
    } else {
      // Dynamic overview layout, front cards bloom and scale up
      tY = (frontness - 0.5) * 0.18;
      targetVector.current.set(Math.sin(angle) * radius, tY, Math.cos(angle) * radius);
      
      tScale = 0.76 + frontness * 0.82;
      tOpacity = 0.36 + frontness * 0.46;
      tTint = WHITE_TINT;
    }

    if (!texture) {
      tOpacity = selectedMode && selected ? 0.1 : 0.045;
      tTint = PLACEHOLDER_TINT;
    }

    const introProgress = introProgressRef.current;
    const introActive = introProgress < 0.999;

    if (introActive) {
      const pathConfig = INTRO_PATHS[introPath] || INTRO_PATHS.current;
      const approachSlots = pathConfig.approachSlots;
      // A single moving head drives every card. Subtracting the card index keeps
      // the train evenly spaced while the leading cards progressively trace the ring.
      const linearMotionProgress = THREE.MathUtils.clamp(
        introProgress / RING_MOTION_FRACTION,
        0,
        1
      );
      const motionProgress =
        introPath === "path1"
          ? 1 - Math.pow(1 - linearMotionProgress, 1.28)
          : linearMotionProgress;
      const pathPosition =
        motionProgress * (count + approachSlots) - index;
      const approachProgress = THREE.MathUtils.clamp(
        pathPosition / approachSlots,
        0,
        1
      );
      let pathAngle = RING_ENTRY_ANGLE;

      if (pathPosition <= approachSlots) {
        setApproachPathPosition(
          targetVector.current,
          introPath,
          radius,
          approachProgress
        );
      } else {
        const ringSlots = Math.min(pathPosition - approachSlots, count - index);
        pathAngle = RING_ENTRY_ANGLE + (ringSlots / count) * Math.PI * 2;
        const pathWorldAngle = pathAngle + groupRotY;
        const pathFrontness = (Math.cos(pathWorldAngle) + 1) / 2;
        targetVector.current.set(
          Math.sin(pathAngle) * radius,
          (pathFrontness - 0.5) * 0.18,
          Math.cos(pathAngle) * radius
        );
        tScale = 0.76 + pathFrontness * 0.82;
        tOpacity = texture ? 0.36 + pathFrontness * 0.46 : 0.045;
      }

      const revealProgress = smoothstep(0.05, 0.72, approachProgress);
      tScale *= THREE.MathUtils.lerp(0.62, 1, revealProgress);
      tOpacity *= revealProgress;
      targetRotY = pathAngle + Math.PI / 2;
    }

    const directCardHover = hovered && !selectedMode && !introActive;

    if (directCardHover && texture) {
      tOpacity = Math.max(tOpacity, 0.98);
    }

    const hoverBoost = directCardHover ? 1.12 : 1;
    tScale *= hoverBoost * (cardSize / DEFAULT_CARD_SIZE);
    targetScale.current.setScalar(tScale);

    // 3. Apply easing
    const positionDamping = introActive ? 14 : 6.8;
    const scaleDamping = introActive ? 13 : 8;
    const opacityDamping = introActive ? 14 : 8.4;
    mesh.position.x = THREE.MathUtils.damp(mesh.position.x, targetVector.current.x, positionDamping, delta);
    mesh.position.y = THREE.MathUtils.damp(mesh.position.y, targetVector.current.y, positionDamping, delta);
    mesh.position.z = THREE.MathUtils.damp(mesh.position.z, targetVector.current.z, positionDamping, delta);

    mesh.scale.x = THREE.MathUtils.damp(mesh.scale.x, targetScale.current.x, scaleDamping, delta);
    mesh.scale.y = THREE.MathUtils.damp(mesh.scale.y, targetScale.current.y, scaleDamping, delta);
    mesh.scale.z = THREE.MathUtils.damp(mesh.scale.z, targetScale.current.z, scaleDamping, delta);

    if (materialRef.current) {
      materialRef.current.opacity = THREE.MathUtils.damp(materialRef.current.opacity, tOpacity, opacityDamping, delta);
      materialRef.current.color.lerp(tTint, 1 - Math.exp(-7 * delta));
    }

    // 4. Rotation
    if (selected && mesh.parent) {
      mesh.parent.getWorldQuaternion(parentQuaternion.current);
      desiredQuaternion.current.copy(parentQuaternion.current).invert().multiply(camera.quaternion);
      mesh.quaternion.slerp(desiredQuaternion.current, 1 - Math.exp(-8.5 * delta));
    } else if (introActive && mesh.parent) {
      mesh.rotation.x = THREE.MathUtils.damp(mesh.rotation.x, 0, 12, delta);
      mesh.rotation.y = dampAngle(mesh.rotation.y, targetRotY, 14, delta);
      mesh.rotation.z = THREE.MathUtils.damp(mesh.rotation.z, 0, 12, delta);
    } else {
      targetRotY = angle + Math.PI / 2;
      mesh.rotation.x = THREE.MathUtils.damp(mesh.rotation.x, 0, 7, delta);
      mesh.rotation.y = dampAngle(mesh.rotation.y, targetRotY, 7, delta);
      mesh.rotation.z = THREE.MathUtils.damp(mesh.rotation.z, 0, 7, delta);
    }
  });

  const cardAspect = texture?.image && texture.image.width && texture.image.height
    ? texture.image.width / texture.image.height
    : targetAspect;

  const cardWidth = DEFAULT_CARD_SIZE * cardAspect;
  const cardHeight = DEFAULT_CARD_SIZE;
  const selectedActionTarget = selectedMode && selected;
  const hitboxWidth = selectedActionTarget
    ? Math.max(cardWidth * 1.06, cardHeight * 0.58)
    : cardHeight * 1.35;
  const hitboxHeight = selectedActionTarget
    ? cardHeight * 1.12
    : cardHeight * 1.75;
  const hitboxDepth = selectedActionTarget ? 0.16 : 0.72;

  return (
    <group
      ref={groupRef}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(index);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        if (selectedMode && selected) {
          onSideHover(null, "");
          onActionHover(true);
          return;
        }
        if (selectedMode) {
          onSideHover(index, event.pointer.x < 0 ? "left" : "right");
          return;
        }
        if (!selectedMode) onHover(index);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        if (selectedMode && selected) {
          onActionHover(false);
          return;
        }
        if (selectedMode) {
          onSideHover(null, "");
          return;
        }
        if (!selectedMode) onHover(null);
      }}
    >
      <mesh>
        <boxGeometry args={[hitboxWidth, hitboxHeight, hitboxDepth]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <planeGeometry args={[cardWidth, cardHeight]} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture || null}
          transparent
          toneMapped={false}
          opacity={texture ? 0 : 0.025}
          color={texture ? "#ffffff" : "#e0e0e0"}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function CameraRig({ focusActive, radius, introProgressRef }) {
  const { camera, pointer } = useThree();
  const cameraRef = useRef(camera);
  const lookAtTarget = useRef(LOOK_AT_START.clone());
  const focusProgress = useRef(0);
  const desiredPosition = useRef(CAMERA_START.clone());
  const desiredLookAt = useRef(LOOK_AT_START.clone());

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useFrame((_, delta) => {
    const activeCamera = cameraRef.current;
    if (!activeCamera) return;

    focusProgress.current = THREE.MathUtils.damp(focusProgress.current, focusActive ? 1 : 0, 4.8, delta);
    const introViewBlend = getIntroViewBlend(introProgressRef.current);

    // Introduce the idle viewpoint gradually through most of the formation.
    // Waiting until the last settle frames made the perspective change read as a cut.
    const idleInputBlend = focusActive ? 0 : introViewBlend;
    const idleDriftX = pointer.x * 0.14 * idleInputBlend;
    const idleDriftY = pointer.y * 0.36 * idleInputBlend;
    desiredPosition.current.set(CAMERA_START.x + idleDriftX, CAMERA_START.y + idleDriftY, CAMERA_START.z);
    desiredLookAt.current.set(
      LOOK_AT_START.x + pointer.x * 0.18 * idleInputBlend,
      LOOK_AT_START.y + pointer.y * 0.22 * idleInputBlend,
      LOOK_AT_START.z
    );

    if (focusProgress.current > 0.001) {
      const eased = focusProgress.current * focusProgress.current * (3 - 2 * focusProgress.current);
      const focusX = 0;
      const focusY = GROUP_POSITION.y - 0.15;
      const focusCameraZ = radius + 9.5;
      const focusLookZ = radius - 1.1;
      desiredPosition.current.set(
        THREE.MathUtils.lerp(CAMERA_START.x, focusX, eased),
        THREE.MathUtils.lerp(CAMERA_START.y, focusY - 0.35, eased),
        THREE.MathUtils.lerp(CAMERA_START.z, focusCameraZ, eased)
      );
      desiredLookAt.current.set(
        THREE.MathUtils.lerp(LOOK_AT_START.x, focusX, eased),
        THREE.MathUtils.lerp(LOOK_AT_START.y, focusY, eased),
        THREE.MathUtils.lerp(LOOK_AT_START.z, focusLookZ, eased)
      );
    }

    const cameraDamping = focusActive ? 7.6 : 5.2;
    activeCamera.position.x = THREE.MathUtils.damp(activeCamera.position.x, desiredPosition.current.x, cameraDamping, delta);
    activeCamera.position.y = THREE.MathUtils.damp(activeCamera.position.y, desiredPosition.current.y, cameraDamping, delta);
    activeCamera.position.z = THREE.MathUtils.damp(activeCamera.position.z, desiredPosition.current.z, cameraDamping, delta);

    lookAtTarget.current.lerp(desiredLookAt.current, 1 - Math.exp(-(focusActive ? 7.4 : 5.4) * delta));
    activeCamera.lookAt(lookAtTarget.current);
  });

  return null;
}

function RingScene({
  displayItems,
  selectedIndex,
  hoveredIndex,
  rotationTargetRef,
  introMode,
  introPath,
  cardSize,
  ringSize,
  onHover,
  onSelect,
  onActionHover,
  sideHoveredIndex,
  onSideHover,
  onReady,
  onIntroComplete,
}) {
  const groupRef = useRef(null);
  const textureSpecs = useMemo(() => displayItems.map(getTextureSpec), [displayItems]);
  const textures = useProgressiveTextures(textureSpecs);
  const textureSignature = useMemo(
    () => textureSpecs.map((spec) => spec.key).join("|"),
    [textureSpecs]
  );
  const uniqueTextureCount = useMemo(
    () => new Set(textureSpecs.map((spec) => spec.key)).size,
    [textureSpecs]
  );
  const minimumReadyTextureCount = Math.min(uniqueTextureCount, 8);
  const hasEnoughTextures = textures.size >= minimumReadyTextureCount;
  const readySignatureRef = useRef("");
  const { viewport, pointer } = useThree();
  const groupScale = useRef(new THREE.Vector3(1, 1, 1));
  const swayRef = useRef(0);
  const introProgressRef = useRef(introMode === "skip" ? 1 : 0);
  const introCompletionSentRef = useRef(introMode === "skip");

  useLayoutEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = rotationTargetRef.current;
    }
  }, [rotationTargetRef]);

  useEffect(() => {
    if (introMode === "skip") {
      introProgressRef.current = 1;
      introCompletionSentRef.current = true;
      return;
    }

    if (introMode === "play") {
      introProgressRef.current = 0;
      introCompletionSentRef.current = false;
    }
  }, [introMode]);

  useEffect(() => {
    if (!hasEnoughTextures || readySignatureRef.current === textureSignature) return undefined;

    let secondFrame;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        readySignatureRef.current = textureSignature;
        window.dispatchEvent(new CustomEvent("plusesee:ring-ready"));
        onReady();
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [hasEnoughTextures, onReady, textureSignature]);

  const radius = Math.min(viewport.width, viewport.height) * ringSize;
  const count = displayItems.length;
  const selectedAngle =
    selectedIndex === null || count === 0
      ? null
      : getRingAngle(selectedIndex, count);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (introMode === "play" && introProgressRef.current < 1) {
      const pathConfig = INTRO_PATHS[introPath] || INTRO_PATHS.current;
      introProgressRef.current = Math.min(
        1,
        introProgressRef.current + delta / pathConfig.duration
      );
      if (introProgressRef.current >= 1 && !introCompletionSentRef.current) {
        introCompletionSentRef.current = true;
        onIntroComplete();
      }
    }

    const introProgress = introProgressRef.current;
    const introViewBlend = getIntroViewBlend(introProgress);
    const selectedMode = selectedIndex !== null;
    const targetX = selectedMode
      ? 0
      : THREE.MathUtils.lerp(
          RING_ENTRY_TILT,
          RING_IDLE_TILT,
          introViewBlend
        ) + pointer.y * 0.025 * introViewBlend;
    const targetScale = selectedMode ? 1.22 : 1;
    const swayTarget = selectedMode
      ? 0
      : pointer.x * 2.4 * introViewBlend;
    swayRef.current = THREE.MathUtils.damp(swayRef.current, swayTarget, 6.4, delta);
    groupScale.current.setScalar(targetScale);

    let targetGroupY = rotationTargetRef.current + swayRef.current;
    if (selectedAngle !== null) {
      // Selection still takes the shortest route to the chosen card. The idle
      // wheel target stays unwrapped so fast continuous scrolling never reverses.
      let diff = -selectedAngle - groupRef.current.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      targetGroupY = groupRef.current.rotation.y + diff;
    }

    groupRef.current.rotation.y = THREE.MathUtils.damp(
      groupRef.current.rotation.y,
      targetGroupY,
      selectedMode ? 10.5 : 4.2,
      delta
    );
    groupRef.current.rotation.x = THREE.MathUtils.damp(
      groupRef.current.rotation.x,
      targetX,
      3,
      delta
    );
    groupRef.current.scale.x = THREE.MathUtils.damp(groupRef.current.scale.x, groupScale.current.x, selectedMode ? 10.5 : 3.4, delta);
    groupRef.current.scale.y = THREE.MathUtils.damp(groupRef.current.scale.y, groupScale.current.y, selectedMode ? 10.5 : 3.4, delta);
    groupRef.current.scale.z = THREE.MathUtils.damp(groupRef.current.scale.z, groupScale.current.z, selectedMode ? 10.5 : 3.4, delta);
  });

  return (
    <>
      <CameraRig
        focusActive={selectedIndex !== null}
        radius={radius}
        introProgressRef={introProgressRef}
      />
      <group
        ref={groupRef}
        position={GROUP_POSITION.toArray()}
      >
        {displayItems.map((item, index) => {
          const textureSpec = textureSpecs[index];
          return (
            <Card
              key={`${item.id}-${index}`}
              index={index}
              texture={textures.get(textureSpec.key) || null}
              targetAspect={textureSpec.aspect}
              angle={getRingAngle(index, count)}
              radius={radius}
              selected={selectedIndex === index}
              hovered={hoveredIndex === index}
              sideHovered={sideHoveredIndex === index}
              selectedMode={selectedIndex !== null}
              introProgressRef={introProgressRef}
              introPath={introPath}
              cardSize={cardSize}
              count={count}
              onSelect={onSelect}
              onHover={onHover}
              onActionHover={onActionHover}
              onSideHover={onSideHover}
            />
          );
        })}
      </group>
    </>
  );
}

export default function RingCarousel({ items }) {
  const prefersReducedMotion = useReducedMotion();
  const sceneRef = useRef(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [selectedCardHovered, setSelectedCardHovered] = useState(false);
  const [sideHover, setSideHover] = useState({ index: null, direction: "" });
  const [ringReady, setRingReady] = useState(false);
  const [homeIntroFinished, setHomeIntroFinished] = useState(false);
  const [introMode, setIntroMode] = useState("waiting");
  const [motionTestMode, setMotionTestMode] = useState(false);
  const [introPath, setIntroPath] = useState("current");
  const [introInstance, setIntroInstance] = useState(0);
  const [cardSize, setCardSize] = useState(DEFAULT_CARD_SIZE);
  const [ringSize, setRingSize] = useState(DEFAULT_RING_SIZE);
  const displayItems = useMemo(() => getDisplayItems(items), [items]);
  const hoveredItem = hoveredIndex !== null ? displayItems[hoveredIndex] : null;
  const selectedItem = selectedIndex !== null ? displayItems[selectedIndex] : null;
  const hoverLayoutActive = hoveredIndex !== null && selectedIndex === null;
  const effectiveCardSize = hoverLayoutActive ? HOVER_CARD_SIZE : cardSize;
  const effectiveRingSize = hoverLayoutActive ? HOVER_RING_SIZE : ringSize;
  const rotationTargetRef = useRef(Math.PI / 2);
  const scrollEnergyRef = useRef(0);
  const scrollCooldownRef = useRef(false);
  const interactionReady = introMode === "skip" || introMode === "complete";

  const handleRingReady = useCallback(() => {
    setRingReady(true);
  }, []);

  const handleFormationComplete = useCallback(() => {
    if (!isLocalMotionTest()) {
      try {
        window.sessionStorage.setItem(RING_FORMATION_SESSION_KEY, "1");
      } catch {}
    }
    setIntroMode("complete");
  }, []);

  useEffect(() => {
    const localMotionTest = isLocalMotionTest();

    if (localMotionTest) {
      const testFrame = window.requestAnimationFrame(() => {
        setMotionTestMode(true);
        setHomeIntroFinished(true);
        setIntroMode("waiting");
      });
      return () => window.cancelAnimationFrame(testFrame);
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let formationCompleted = false;
    let loadingCompleted = false;

    try {
      formationCompleted = window.sessionStorage.getItem(RING_FORMATION_SESSION_KEY) === "1";
      loadingCompleted = window.sessionStorage.getItem(HOME_INTRO_SESSION_KEY) === "1";
    } catch {}

    if (prefersReducedMotion || formationCompleted) {
      if (prefersReducedMotion) {
        try {
          window.sessionStorage.setItem(RING_FORMATION_SESSION_KEY, "1");
        } catch {}
      }
      const skipFrame = window.requestAnimationFrame(() => {
        setIntroMode("skip");
        setHomeIntroFinished(true);
      });
      return () => window.cancelAnimationFrame(skipFrame);
    }

    const initializeFrame = window.requestAnimationFrame(() => {
      setHomeIntroFinished(loadingCompleted);
    });
    const handleHomeIntroFinished = () => setHomeIntroFinished(true);
    window.addEventListener("plusesee:home-intro-finished", handleHomeIntroFinished);
    return () => {
      window.cancelAnimationFrame(initializeFrame);
      window.removeEventListener("plusesee:home-intro-finished", handleHomeIntroFinished);
    };
  }, []);

  useEffect(() => {
    if (introMode !== "waiting" || !ringReady || !homeIntroFinished) return undefined;
    const playFrame = window.requestAnimationFrame(() => setIntroMode("play"));
    return () => window.cancelAnimationFrame(playFrame);
  }, [homeIntroFinished, introMode, ringReady]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    let downMomentum = 0;
    let locked = false;
    const updateScrollEnergy = (nextValue) => {
      scrollEnergyRef.current = THREE.MathUtils.clamp(nextValue, 0, 1);
      scene.style.opacity = String(1 - scrollEnergyRef.current * 0.08);
    };

    const handleWheel = (event) => {
      event.preventDefault();
      if (!interactionReady) return;
      const delta = event.deltaY;

      // ── Selected mode: scroll switches to next/prev card ──
      if (selectedIndex !== null) {
        if (scrollCooldownRef.current) return; // debounce
        scrollCooldownRef.current = true;
        setTimeout(() => { scrollCooldownRef.current = false; }, 350);

        const count = displayItems.length;
        const step = delta > 0 ? 1 : -1;
        const nextIndex = (selectedIndex + step + count) % count;
        setSelectedIndex(nextIndex);
        setHoveredIndex(nextIndex);
        setSelectedCardHovered(false);
        setSideHover({ index: null, direction: "" });
        return;
      }

      // ── Normal mode: rotate the ring ──
      rotationTargetRef.current -= delta * 0.0035;

      if (delta > 0) {
        downMomentum += delta;
        updateScrollEnergy(scrollEnergyRef.current + delta / 800);
        if (downMomentum > 520 && !locked) {
          locked = true;
          document.getElementById("ai-chat")?.scrollIntoView({ behavior: "smooth" });
          setTimeout(() => {
            downMomentum = 0;
            updateScrollEnergy(0);
            locked = false;
          }, 1000);
        }
      } else {
        downMomentum = Math.max(0, downMomentum + delta);
        updateScrollEnergy(scrollEnergyRef.current + delta / 800);
      }
    };

    scene.addEventListener("wheel", handleWheel, { passive: false });
    return () => scene.removeEventListener("wheel", handleWheel);
  }, [displayItems.length, interactionReady, selectedIndex]);

  useEffect(() => {
    const scene = sceneRef.current;
    const snapContainer = scene?.closest(".snap-container");
    if (!scene || !snapContainer) return undefined;

    const handleScroll = () => {
      const rect = scene.getBoundingClientRect();
      if (Math.abs(rect.top) < window.innerHeight * 0.12) {
        scrollEnergyRef.current = 0;
        scene.style.opacity = "1";
      }
    };

    handleScroll();
    snapContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => snapContainer.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (selectedIndex === null) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedIndex(null);
        setHoveredIndex(null);
        setSelectedCardHovered(false);
        setSideHover({ index: null, direction: "" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex]);

  const closeExpanded = () => {
    setSelectedIndex(null);
    setHoveredIndex(null);
    setSelectedCardHovered(false);
    setSideHover({ index: null, direction: "" });
  };

  const replayIntro = (nextPath = introPath) => {
    setIntroPath(nextPath);
    setHoveredIndex(null);
    setSelectedIndex(null);
    setSelectedCardHovered(false);
    setSideHover({ index: null, direction: "" });
    scrollEnergyRef.current = 0;
    if (sceneRef.current) sceneRef.current.style.opacity = "1";
    setRingReady(false);
    setHomeIntroFinished(true);
    setIntroMode("waiting");
    setIntroInstance((current) => current + 1);
  };

  const handleSelect = (index) => {
    if (!interactionReady) return;

    if (selectedIndex === index) {
      const targetUrl = resolveJumpTarget(displayItems[index]);
      if (targetUrl) {
        window.location.assign(targetUrl);
      }
      return;
    }

    setSelectedIndex(index);
    setHoveredIndex(index);
    setSelectedCardHovered(false);
    setSideHover({ index: null, direction: "" });
  };

  return (
    <div
      ref={sceneRef}
      className={styles.scene}
      data-cursor-clickable={selectedCardHovered ? "true" : undefined}
      data-cursor-direction={sideHover.direction || undefined}
    >
      <div
        className={styles.canvasWrap}
        onPointerLeave={() => {
          setHoveredIndex(null);
        }}
      >
        <Canvas
          dpr={[1, 1.8]}
          camera={{ position: CAMERA_START.toArray(), fov: 17.5 }}
          gl={{ alpha: true, antialias: true }}
          onPointerMissed={() => {
            if (selectedIndex !== null) closeExpanded();
          }}
        >
          <ambientLight intensity={1.05} />
          <directionalLight position={[4, 5, 10]} intensity={0.72} />
          <RingScene
            key={`ring-intro-${introInstance}`}
            displayItems={displayItems}
            selectedIndex={selectedIndex}
            hoveredIndex={hoveredIndex}
            rotationTargetRef={rotationTargetRef}
            introMode={introMode}
            introPath={introPath}
            cardSize={effectiveCardSize}
            ringSize={effectiveRingSize}
            onHover={(index) => {
              if (interactionReady) setHoveredIndex(index);
            }}
            onSelect={handleSelect}
            onActionHover={setSelectedCardHovered}
            sideHoveredIndex={sideHover.index}
            onSideHover={(index, direction) => {
              setSideHover({ index, direction });
            }}
            onReady={handleRingReady}
            onIntroComplete={handleFormationComplete}
          />
        </Canvas>
      </div>

      <div className={styles.selectedCaption} aria-live="polite" aria-atomic="true">
        <AnimatePresence initial={false} mode="wait">
          {interactionReady && selectedItem && (
            <motion.div
              key={`${selectedItem.id}-${selectedIndex}`}
              className={styles.cardCaption}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
              animate={
                prefersReducedMotion
                  ? { opacity: 1, y: 0, transition: { duration: 0 } }
                  : {
                      opacity: 1,
                      y: 0,
                      transition: {
                        opacity: { duration: 0.34, ease: "linear" },
                        y: { duration: 0.32, ease: [0.22, 0.61, 0.36, 1] },
                      },
                    }
              }
              exit={
                prefersReducedMotion
                  ? { opacity: 0, transition: { duration: 0 } }
                  : {
                      opacity: 0,
                      y: 0,
                      transition: {
                        opacity: { duration: 0.06, ease: [0.4, 0, 1, 1] },
                        y: { duration: 0 },
                      },
                    }
              }
            >
              <span className={styles.cardCaptionCategory}>
                {resolveCategoryLabel(selectedItem)}
              </span>
              <span className={styles.cardCaptionTitle}>{selectedItem.title}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {interactionReady && selectedIndex === null && hoveredItem && (
        <div className={styles.hoverLabel}>
          <span className={styles.hoverCategory}>{resolveCategoryLabel(hoveredItem)}</span>
          <span className={styles.hoverTitle}>{hoveredItem.title}</span>
        </div>
      )}

      {motionTestMode && (
        <div className={styles.motionTestPanel} data-cursor-clickable="true">
          <span className={styles.motionTestTitle}>RING PATH LAB</span>
          <div className={styles.motionTestControls}>
            {Object.entries(INTRO_PATHS).map(([pathId, config]) => (
              <button
                key={pathId}
                type="button"
                className={`${styles.motionTestButton} ${
                  introPath === pathId ? styles.motionTestButtonActive : ""
                }`}
                aria-pressed={introPath === pathId}
                onClick={() => replayIntro(pathId)}
              >
                {config.label}
              </button>
            ))}
            <button
              type="button"
              className={`${styles.motionTestButton} ${styles.motionTestReplay}`}
              onClick={() => replayIntro()}
            >
              REPLAY
            </button>
          </div>
          <div className={styles.motionTestAdjustments}>
            <label className={styles.motionTestSliderRow} htmlFor="ring-card-size">
              <span className={styles.motionTestSliderLabel}>CARD SIZE</span>
              <output
                className={styles.motionTestSliderValue}
                htmlFor="ring-card-size"
              >
                {cardSize.toFixed(2)}
              </output>
              <input
                id="ring-card-size"
                className={styles.motionTestRange}
                type="range"
                min="0.45"
                max="0.9"
                step="0.01"
                value={cardSize}
                aria-valuetext={cardSize.toFixed(2)}
                onInput={(event) => setCardSize(Number(event.currentTarget.value))}
              />
            </label>
            <label className={styles.motionTestSliderRow} htmlFor="ring-radius-size">
              <span className={styles.motionTestSliderLabel}>RING SIZE</span>
              <output
                className={styles.motionTestSliderValue}
                htmlFor="ring-radius-size"
              >
                {ringSize.toFixed(2)}
              </output>
              <input
                id="ring-radius-size"
                className={styles.motionTestRange}
                type="range"
                min="0.48"
                max="0.84"
                step="0.01"
                value={ringSize}
                aria-valuetext={ringSize.toFixed(2)}
                onInput={(event) => setRingSize(Number(event.currentTarget.value))}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
