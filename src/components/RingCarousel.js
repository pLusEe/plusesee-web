"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture, Html } from "@react-three/drei";
import * as THREE from "three";
import styles from "./RingCarousel.module.css";

const MIN_ITEMS = 42;
const CAMERA_START = new THREE.Vector3(0, 1.4, 26);
const LOOK_AT_START = new THREE.Vector3(0, 0.42, 0);
const GROUP_POSITION = new THREE.Vector3(0, 0.4, 0);
const MIN_CARD_ASPECT = 0.45;
const MAX_CARD_ASPECT = 2.2;

const getThumb = (item) => {
  if (item.thumbUrl) return item.thumbUrl;
  if ((item.mediaType || "image") === "image" && item.mediaUrl) return item.mediaUrl;
  if (item.imageUrl) return item.imageUrl;
  return "/media/images/placeholder1.jpg";
};

const TAG_LABELS = {
  home: "2.1 首页圆环",
  commercial: "2.2 商业设计",
  personalLibrary: "2.3 个人库",
  personalBook: "2.3.1 个人设计 2019-2024",
  bio: "2.4 Bio",
};

const resolveCategoryLabel = (item) => {
  if (Array.isArray(item?.categories) && item.categories.length > 0) {
    const labels = item.categories
      .map((tag) => TAG_LABELS[tag] || String(tag || ""))
      .filter(Boolean);
    if (labels.length > 0) return labels.join(" / ");
  }
  return item?.category || "work";
};

const getDisplayItems = (items) => {
  if (!items.length) return [];
  let next = [...items];
  while (next.length < MIN_ITEMS) next = [...next, ...items];
  return next.slice(0, Math.max(MIN_ITEMS, items.length * 3));
};

const clampValue = (value, min, max) => Math.min(max, Math.max(min, value));

const finalizeTexture = (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
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

const angularDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

function Card({ index, texture, angle, radius, selected, hovered, selectedMode, title, onSelect, onHover }) {
  const { camera } = useThree();
  const groupRef = useRef(null);
  const materialRef = useRef(null);
  const targetVector = useRef(new THREE.Vector3());
  const targetScale = useRef(new THREE.Vector3(1, 1, 1));
  const parentQuaternion = useRef(new THREE.Quaternion());
  const desiredQuaternion = useRef(new THREE.Quaternion());

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
      tTint = selected ? new THREE.Color("#ffffff") : new THREE.Color(0.7, 0.7, 0.75);
    } else {
      // Dynamic overview layout, front cards bloom and scale up
      tY = (frontness - 0.5) * 0.18;
      targetVector.current.set(Math.sin(angle) * radius, tY, Math.cos(angle) * radius);
      
      tScale = 0.76 + frontness * 0.82;
      tOpacity = 0.36 + frontness * 0.46;
      tTint = new THREE.Color(1, 1, 1);
    }
    
    const hoverBoost = hovered && !selected ? 1.04 : 1;
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
    } else {
      targetRotY = angle + Math.PI / 2;
      mesh.rotation.x = THREE.MathUtils.damp(mesh.rotation.x, 0, 7, delta);
      mesh.rotation.y = THREE.MathUtils.damp(mesh.rotation.y, targetRotY, 7, delta);
      mesh.rotation.z = THREE.MathUtils.damp(mesh.rotation.z, 0, 7, delta);
    }
  });

  // Calculate the native aspect ratio of the loaded image so it never stretches
  const aspect = texture?.image && texture.image.width && texture.image.height
    ? texture.image.width / texture.image.height
    : 1.06 / 0.66;
  
  const cardWidth = 0.68 * aspect;
  const cardHeight = 0.68;

  return (
    <group
      ref={groupRef}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(index);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        if (!selectedMode) onHover(index);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        if (!selectedMode) onHover(null);
      }}
    >
      <mesh>
        <planeGeometry args={[cardWidth, cardHeight]} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          transparent
          toneMapped={false}
          opacity={0.72}
          color={new THREE.Color("#ffffff")}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {selectedMode && title && (
        <Html
          position={[0, -0.42, 0]}
          center
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            fontSize: '11px',
            letterSpacing: '0.08em',
            color: `rgba(60, 60, 60, ${selected ? 0.8 : 0.15})`,
            fontFamily: 'inherit',
            textAlign: 'center',
            userSelect: 'none',
          }}
        >
          {title}
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

function RingScene({ displayItems, selectedIndex, hoveredIndex, rotationTarget, onHover, onSelect }) {
  const groupRef = useRef(null);
  const textures = useTexture(displayItems.map(getThumb));
  const { viewport, pointer } = useThree();
  const groupScale = useRef(new THREE.Vector3(1, 1, 1));
  const swayRef = useRef(0);
  const previousSelectedRef = useRef(null);
  const preparedTextures = useMemo(
    () => displayItems.map((item, index) => prepareTexture(textures[index], item)),
    [displayItems, textures]
  );

  useEffect(
    () => () => {
      preparedTextures.forEach((texture) => texture.dispose());
    },
    [preparedTextures]
  );

  const radius = Math.min(viewport.width, viewport.height) * 0.66;
  const count = displayItems.length;
  const selectedAngle =
    selectedIndex === null || count === 0
      ? null
      : (selectedIndex / count) * Math.PI * 2;
  const sceneRotationTarget = selectedAngle === null ? rotationTarget : -selectedAngle;

  const activeLayoutY = selectedIndex !== null ? 0 : 0; // The rigid focus Y math was already flattened

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
    previousSelectedRef.current = selectedIndex;
  });

  return (
    <>
      <CameraRig focusActive={selectedIndex !== null} radius={radius} />
      <group ref={groupRef} position={GROUP_POSITION.toArray()}>
        {displayItems.map((item, index) => (
          <Card
            key={`${item.id}-${index}`}
            index={index}
            texture={preparedTextures[index]}
            angle={(index / count) * Math.PI * 2}
            radius={radius}
            selected={selectedIndex === index}
            hovered={hoveredIndex === index}
            selectedMode={selectedIndex !== null}
            title={item.title}
            onSelect={onSelect}
            onHover={onHover}
          />
        ))}
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
  const displayItems = useMemo(() => getDisplayItems(items), [items]);
  const hoveredItem = hoveredIndex !== null ? displayItems[hoveredIndex] : null;
  const selectedItem = selectedIndex !== null ? displayItems[selectedIndex] : null;
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
  }, [selectedIndex]);

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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex]);

  const closeExpanded = () => {
    setSelectedIndex(null);
    setHoveredIndex(null);
  };

  return (
    <div
      ref={sceneRef}
      className={styles.scene}
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
            onSelect={(index) => {
              setSelectedIndex(index);
              setHoveredIndex(index);
              setRotationTarget((current) => {
                rotationAtSelectRef.current = current;
                return current;
              });
            }}
          />
        </Canvas>
      </div>

      {selectedItem && (
        <div className={styles.infoPanel} onClick={(event) => event.stopPropagation()}>
          <button className={styles.backButton} type="button" onClick={closeExpanded}>
            Exit View
          </button>
          <p className={styles.category}>{resolveCategoryLabel(selectedItem)}</p>
          <h2 className={styles.title}>{selectedItem.title}</h2>
          {selectedItem.description && <p className={styles.description}>{selectedItem.description}</p>}
        </div>
      )}

      {!selectedItem && hoveredItem && (
        <div className={styles.hoverLabel}>
          <span className={styles.hoverCategory}>{resolveCategoryLabel(hoveredItem)}</span>
          <span className={styles.hoverTitle}>{hoveredItem.title}</span>
        </div>
      )}
    </div>
  );
}
