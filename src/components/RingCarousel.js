"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import ringThumbnailManifest from "../data/ring-thumbnails.json";
import styles from "./RingCarousel.module.css";

const TARGET_RING_SLOTS = 45;
const TEXTURE_LOAD_CONCURRENCY = 4;
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
  commercial: "commercial design",
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
    return "commercial design";
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
  if (Math.abs(sourceAspect - targetAspect) < 0.02 && zoom <= 1.001) {
    return finalizeTexture(texture.clone());
  }
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
    const loader = new THREE.TextureLoader();

    const resetTimer = window.setTimeout(() => {
      if (!cancelled) setTextures(new Map());
    }, 0);
    preparationTimers.add(resetTimer);

    const publishTexture = (spec, texture) => {
      if (cancelled) {
        texture.dispose();
        return;
      }

      ownedTextures.add(texture);
      setTextures((current) => {
        const next = new Map(current);
        next.set(spec.key, texture);
        return next;
      });
    };

    const loadNext = () => {
      if (cancelled) return;

      while (activeLoads < TEXTURE_LOAD_CONCURRENCY && nextIndex < uniqueSpecs.length) {
        const spec = uniqueSpecs[nextIndex];
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
                  if (spec.prepared) {
                    publishTexture(spec, finalizeTexture(loadedTexture));
                  } else {
                    const preparedTexture = prepareTexture(loadedTexture, spec.item);
                    loadedTexture.dispose();
                    publishTexture(spec, preparedTexture);
                  }
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

const angularDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

function Card({
  index,
  texture,
  targetAspect,
  angle,
  radius,
  selected,
  hovered,
  selectedMode,
  label,
  title,
  onSelect,
  onHover,
  onActionHover,
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
    let tY, tZ, tScale, tOpacity, targetRotY, tTint;

    if (selectedMode) {
      // Rigid background layout, uniform sizes, no frontness stretching
      tY = (frontness - 0.5) * 0.16 + (selected ? 0.08 : 0.015);
      
      const popOut = selected ? radius * 0.25 : 0;
      targetVector.current.set(
        Math.sin(angle) * (radius + popOut),
        tY,
        Math.cos(angle) * (radius + popOut)
      );
      
      tScale = selected ? 1.06 : 0.5;
      tOpacity = selected ? 1 : 0.15;
      tTint = selected ? WHITE_TINT : DIM_TINT;
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

    const hoverActive = hovered && !selectedMode;
    if (hoverActive && texture) {
      tOpacity = Math.max(tOpacity, 0.98);
    }

    const hoverBoost = hoverActive ? 1.12 : 1;
    tScale *= hoverBoost;
    targetScale.current.setScalar(tScale);

    // 3. Apply easing
    mesh.position.x = THREE.MathUtils.damp(mesh.position.x, targetVector.current.x, 6.8, delta);
    mesh.position.y = THREE.MathUtils.damp(mesh.position.y, targetVector.current.y, 6.8, delta);
    mesh.position.z = THREE.MathUtils.damp(mesh.position.z, targetVector.current.z, 6.8, delta);

    mesh.scale.x = THREE.MathUtils.damp(mesh.scale.x, targetScale.current.x, 8, delta);
    mesh.scale.y = THREE.MathUtils.damp(mesh.scale.y, targetScale.current.y, 8, delta);
    mesh.scale.z = THREE.MathUtils.damp(mesh.scale.z, targetScale.current.z, 8, delta);

    if (materialRef.current) {
      materialRef.current.opacity = THREE.MathUtils.damp(materialRef.current.opacity, tOpacity, 8.4, delta);
      materialRef.current.color.lerp(tTint, 1 - Math.exp(-7 * delta));
    }

    // 4. Rotation
    if (selected && mesh.parent) {
      mesh.parent.getWorldQuaternion(parentQuaternion.current);
      desiredQuaternion.current.copy(parentQuaternion.current).invert().multiply(camera.quaternion);
      mesh.quaternion.slerp(desiredQuaternion.current, 1 - Math.exp(-8.5 * delta));
    } else if (hoverActive && mesh.parent) {
      mesh.rotation.x = THREE.MathUtils.damp(mesh.rotation.x, 0, 7, delta);
      mesh.rotation.y = dampAngle(mesh.rotation.y, -mesh.parent.rotation.y, 8.5, delta);
      mesh.rotation.z = THREE.MathUtils.damp(mesh.rotation.z, 0, 7, delta);
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

  const cardWidth = 0.68 * cardAspect;
  const cardHeight = 0.68;
  const hitboxWidth = cardHeight * 1.35;
  const hitboxHeight = cardHeight * 1.75;
  const hitboxDepth = 0.72;

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
          onActionHover(true);
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
      {selectedMode && selected && (label || title) && (
        <Html
          position={[0, -0.64, 0]}
          center
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            color: 'rgba(60, 60, 60, 0.8)',
            fontFamily: 'inherit',
            textAlign: 'center',
            userSelect: 'none',
          }}
        >
          <div className={styles.cardCaption}>
            {label && <span className={styles.cardCaptionCategory}>{label}</span>}
            {title && <span className={styles.cardCaptionTitle}>{title}</span>}
          </div>
        </Html>
      )}
    </group>
  );
}

function CameraRig({ focusActive, radius }) {
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

    // Only apply mouse drift when NOT focused — in focus mode, lock camera perfectly still
    const idleDriftX = focusActive ? 0 : pointer.x * 0.14;
    const idleDriftY = focusActive ? 0 : pointer.y * 0.36;
    desiredPosition.current.set(CAMERA_START.x + idleDriftX, CAMERA_START.y + idleDriftY, CAMERA_START.z);
    desiredLookAt.current.set(LOOK_AT_START.x + (focusActive ? 0 : pointer.x * 0.18), LOOK_AT_START.y + (focusActive ? 0 : pointer.y * 0.22), LOOK_AT_START.z);

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
  rotationTarget,
  onHover,
  onSelect,
  onActionHover,
}) {
  const groupRef = useRef(null);
  const textureSpecs = useMemo(() => displayItems.map(getTextureSpec), [displayItems]);
  const textures = useProgressiveTextures(textureSpecs);
  const textureSignature = useMemo(
    () => textureSpecs.map((spec) => spec.key).join("|"),
    [textureSpecs]
  );
  const hasAnyTexture = textures.size > 0;
  const readySignatureRef = useRef("");
  const { viewport, pointer } = useThree();
  const groupScale = useRef(new THREE.Vector3(1, 1, 1));
  const swayRef = useRef(0);

  useEffect(() => {
    if (!hasAnyTexture || readySignatureRef.current === textureSignature) return undefined;

    let secondFrame;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        readySignatureRef.current = textureSignature;
        window.dispatchEvent(new CustomEvent("plusesee:ring-ready"));
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [hasAnyTexture, textureSignature]);

  const radius = Math.min(viewport.width, viewport.height) * 0.66;
  const count = displayItems.length;
  const selectedAngle =
    selectedIndex === null || count === 0
      ? null
      : (selectedIndex / count) * Math.PI * 2;
  const sceneRotationTarget = selectedAngle === null ? rotationTarget : -selectedAngle;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const selectedMode = selectedIndex !== null;
    const targetX = selectedIndex === null ? 0.15 + pointer.y * 0.05 : 0;
    const targetScale = selectedMode ? 1.22 : 1;
    const swayTarget = selectedMode ? 0 : pointer.x * 2.4;
    swayRef.current = selectedMode
      ? 0
      : THREE.MathUtils.damp(swayRef.current, swayTarget, 6.4, delta);
    groupScale.current.setScalar(targetScale);

    // Shortest angular path math prevents brutal 360-spins across array boundaries (e.g., photo 41 -> photo 0)
    let diff = sceneRotationTarget - groupRef.current.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const targetGroupY = groupRef.current.rotation.y + diff;

    groupRef.current.rotation.y = THREE.MathUtils.damp(
      groupRef.current.rotation.y,
      targetGroupY + swayRef.current,
      selectedMode ? 10.5 : 4.2,
      delta
    );
    groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetX, 4.6, delta);
    groupRef.current.scale.x = THREE.MathUtils.damp(groupRef.current.scale.x, groupScale.current.x, selectedMode ? 10.5 : 3.4, delta);
    groupRef.current.scale.y = THREE.MathUtils.damp(groupRef.current.scale.y, groupScale.current.y, selectedMode ? 10.5 : 3.4, delta);
    groupRef.current.scale.z = THREE.MathUtils.damp(groupRef.current.scale.z, groupScale.current.z, selectedMode ? 10.5 : 3.4, delta);
  });

  return (
    <>
      <CameraRig focusActive={selectedIndex !== null} radius={radius} />
      <group ref={groupRef} position={GROUP_POSITION.toArray()}>
        {displayItems.map((item, index) => {
          const textureSpec = textureSpecs[index];
          return (
            <Card
              key={`${item.id}-${index}`}
              index={index}
              texture={textures.get(textureSpec.key) || null}
              targetAspect={textureSpec.aspect}
              angle={(index / count) * Math.PI * 2}
              radius={radius}
              selected={selectedIndex === index}
              hovered={hoveredIndex === index}
              selectedMode={selectedIndex !== null}
              label={resolveCategoryLabel(item)}
              title={item.title}
              onSelect={onSelect}
              onHover={onHover}
              onActionHover={onActionHover}
            />
          );
        })}
      </group>
    </>
  );
}

export default function RingCarousel({ items }) {
  const sceneRef = useRef(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [rotationTarget, setRotationTarget] = useState(Math.PI / 2);
  const [scrollEnergy, setScrollEnergy] = useState(0);
  const [selectedCardHovered, setSelectedCardHovered] = useState(false);
  const displayItems = useMemo(() => getDisplayItems(items), [items]);
  const hoveredItem = hoveredIndex !== null ? displayItems[hoveredIndex] : null;
  const rotationAtSelectRef = useRef(null);
  const scrollCooldownRef = useRef(false);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    let downMomentum = 0;
    let locked = false;

    const handleWheel = (event) => {
      event.preventDefault();
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
        return;
      }

      // ── Normal mode: rotate the ring ──
      setRotationTarget((current) => current - delta * 0.0035);

      if (delta > 0) {
        downMomentum += delta;
        setScrollEnergy((current) => Math.min(1, current + delta / 800));
        if (downMomentum > 520 && !locked) {
          locked = true;
          document.getElementById("ai-chat")?.scrollIntoView({ behavior: "smooth" });
          setTimeout(() => {
            downMomentum = 0;
            setScrollEnergy(0);
            locked = false;
          }, 1000);
        }
      } else {
        downMomentum = Math.max(0, downMomentum + delta);
        setScrollEnergy((current) => Math.max(0, current + delta / 800));
      }
    };

    scene.addEventListener("wheel", handleWheel, { passive: false });
    return () => scene.removeEventListener("wheel", handleWheel);
  }, [displayItems.length, selectedIndex]);

  useEffect(() => {
    const scene = sceneRef.current;
    const snapContainer = scene?.closest(".snap-container");
    if (!scene || !snapContainer) return undefined;

    const handleScroll = () => {
      const rect = scene.getBoundingClientRect();
      if (Math.abs(rect.top) < window.innerHeight * 0.12) {
        setScrollEnergy(0);
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex]);

  const closeExpanded = () => {
    setSelectedIndex(null);
    setHoveredIndex(null);
    setSelectedCardHovered(false);
  };

  const handleSelect = (index) => {
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
    setRotationTarget((current) => {
      rotationAtSelectRef.current = current;
      return current;
    });
  };

  return (
    <div
      ref={sceneRef}
      className={styles.scene}
      data-cursor-clickable={selectedCardHovered ? "true" : undefined}
      style={{
        opacity: 1 - scrollEnergy * 0.08,
      }}
    >
      <div className={styles.canvasWrap}>
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
            displayItems={displayItems}
            selectedIndex={selectedIndex}
            hoveredIndex={hoveredIndex}
            rotationTarget={rotationTarget}
            onHover={setHoveredIndex}
            onSelect={handleSelect}
            onActionHover={setSelectedCardHovered}
          />
        </Canvas>
      </div>

      {selectedIndex === null && hoveredItem && (
        <div className={styles.hoverLabel}>
          <span className={styles.hoverCategory}>{resolveCategoryLabel(hoveredItem)}</span>
          <span className={styles.hoverTitle}>{hoveredItem.title}</span>
        </div>
      )}
    </div>
  );
}
