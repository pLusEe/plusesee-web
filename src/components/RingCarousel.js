"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import styles from "./RingCarousel.module.css";

const MIN_ITEMS = 42;

const getThumb = (item) => {
  if (item.thumbUrl) return item.thumbUrl;
  if ((item.mediaType || "image") === "image" && item.mediaUrl) return item.mediaUrl;
  if (item.imageUrl) return item.imageUrl;
  return "/placeholder1.jpg";
};

const getDisplayItems = (items) => {
  if (!items.length) return [];
  let next = [...items];
  while (next.length < MIN_ITEMS) next = [...next, ...items];
  return next.slice(0, Math.max(MIN_ITEMS, items.length * 3));
};

const cubicPoint = (p0, p1, p2, p3, t) => {
  const mt = 1 - t;
  return new THREE.Vector3(
    mt ** 3 * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t ** 3 * p3.x,
    mt ** 3 * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t ** 3 * p3.y,
    mt ** 3 * p0.z + 3 * mt * mt * t * p1.z + 3 * mt * t * t * p2.z + t ** 3 * p3.z
  );
};

const cubicTangent = (p0, p1, p2, p3, t) => {
  const mt = 1 - t;
  return new THREE.Vector3(
    3 * mt * mt * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    3 * mt * mt * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
    3 * mt * mt * (p1.z - p0.z) + 6 * mt * t * (p2.z - p1.z) + 3 * t * t * (p3.z - p2.z)
  );
};

const sampleBezierByArcLength = (p0, p1, p2, p3, count) => {
  const samples = Array.from({ length: 180 }, (_, index) => {
    const t = index / 179;
    return { t, point: cubicPoint(p0, p1, p2, p3, t) };
  });

  const cumulative = [0];
  for (let i = 1; i < samples.length; i += 1) {
    cumulative[i] = cumulative[i - 1] + samples[i].point.distanceTo(samples[i - 1].point);
  }

  const totalLength = cumulative[cumulative.length - 1] || 1;

  const sampleAt = (fraction) => {
    const targetLength = totalLength * fraction;
    let idx = cumulative.findIndex((length) => length >= targetLength);
    if (idx <= 0) {
      return { point: samples[0].point.clone(), tangent: cubicTangent(p0, p1, p2, p3, 0) };
    }

    const prevLength = cumulative[idx - 1];
    const nextLength = cumulative[idx];
    const segment = nextLength - prevLength || 1;
    const local = (targetLength - prevLength) / segment;
    const prev = samples[idx - 1];
    const curr = samples[idx];
    const t = prev.t + (curr.t - prev.t) * local;

    return {
      point: prev.point.clone().lerp(curr.point, local),
      tangent: cubicTangent(p0, p1, p2, p3, t),
    };
  };

  return Array.from({ length: count }, (_, order) => {
    const fraction = count === 1 ? 0 : order / (count - 1);
    return sampleAt(fraction);
  });
};

function Card({ index, texture, layout, selected, hovered, selectedAt, onSelect, onHover }) {
  const { camera } = useThree();
  const groupRef = useRef(null);
  const materialRef = useRef(null);
  const targetVector = useRef(new THREE.Vector3());
  const targetScale = useRef(new THREE.Vector3(1, 1, 1));
  const parentQuaternion = useRef(new THREE.Quaternion());
  const desiredQuaternion = useRef(new THREE.Quaternion());

  useEffect(() => {
    if (!texture) return;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
  }, [texture]);

  useFrame((_, delta) => {
    const mesh = groupRef.current;
    if (!mesh || !layout) return;

    let targetPosition = layout.position.clone();
    let targetRotationX = layout.rotation.x;
    let targetRotationY = layout.rotation.y;
    let targetRotationZ = layout.rotation.z;

    targetVector.current.copy(targetPosition);
    mesh.position.x = THREE.MathUtils.damp(mesh.position.x, targetVector.current.x, 7.2, delta);
    mesh.position.y = THREE.MathUtils.damp(mesh.position.y, targetVector.current.y, 7.2, delta);
    mesh.position.z = THREE.MathUtils.damp(mesh.position.z, targetVector.current.z, 7.2, delta);

    if (layout.faceCamera && mesh.parent) {
      mesh.parent.getWorldQuaternion(parentQuaternion.current);
      desiredQuaternion.current.copy(parentQuaternion.current).invert().multiply(camera.quaternion);
      mesh.quaternion.slerp(desiredQuaternion.current, 1 - Math.exp(-8 * delta));
    } else {
      mesh.rotation.x = THREE.MathUtils.damp(mesh.rotation.x, targetRotationX, 7.2, delta);
      mesh.rotation.y = THREE.MathUtils.damp(mesh.rotation.y, targetRotationY, 7.2, delta);
      mesh.rotation.z = THREE.MathUtils.damp(mesh.rotation.z, targetRotationZ, 7.2, delta);
    }

    const hoverScale = hovered && !selected ? 1.04 : 1;
    targetScale.current.setScalar(layout.scale * hoverScale);
    mesh.scale.x = THREE.MathUtils.damp(mesh.scale.x, targetScale.current.x, 8.5, delta);
    mesh.scale.y = THREE.MathUtils.damp(mesh.scale.y, targetScale.current.y, 8.5, delta);
    mesh.scale.z = THREE.MathUtils.damp(mesh.scale.z, targetScale.current.z, 8.5, delta);

    if (materialRef.current) {
      materialRef.current.opacity = THREE.MathUtils.damp(materialRef.current.opacity, layout.opacity, 8, delta);
    }

  });

  return (
    <group
      ref={groupRef}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(index);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(index);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onHover(null);
      }}
    >
      <mesh>
        <planeGeometry args={[1.04, 0.64]} />
        <meshBasicMaterial ref={materialRef} map={texture} transparent toneMapped={false} opacity={0.72} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function RingScene({ displayItems, selectedIndex, targetIndex, hoveredIndex, rotationTarget, selectedAt, onHover, onSelect, onTargetReached }) {
  const groupRef = useRef(null);
  const textures = useTexture(displayItems.map(getThumb));
  const { viewport, pointer } = useThree();

  const radius = Math.min(viewport.width, viewport.height) * 0.66;
  const sequenceIndices = useMemo(() => {
    if (selectedIndex === null || displayItems.length === 0) return [];
    return Array.from({ length: displayItems.length }, (_, offset) =>
      (selectedIndex + offset) % displayItems.length
    );
  }, [displayItems.length, selectedIndex]);

  const layoutMap = useMemo(() => {
    const next = new Map();
    const count = displayItems.length;

    const computeRingPose = (angle) => {
      // Frontness still needs to know global orientation (angle + rotationTarget) for shading
      const globalAngle = angle + rotationTarget;
      const frontness = (Math.cos(globalAngle) + 1) / 2;
      const scale = 0.72 + frontness * 0.86;
      const opacity = 0.4 + frontness * 0.4;
      const y = (frontness - 0.5) * 0.1;

      return {
        position: new THREE.Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius),
        rotation: new THREE.Euler(0, angle + Math.PI / 2, 0),
        scale,
        opacity,
        faceCamera: false,
      };
    };

    if (selectedIndex === null || count === 0) {
      displayItems.forEach((_, index) => {
        const angle = (index / count) * Math.PI * 2;
        next.set(index, computeRingPose(angle));
      });
      return next;
    }

    // Selected state
    displayItems.forEach((_, index) => {
      if (index === selectedIndex) {
        // Desired global position on screen (left margin, vertically centered)
        const globalTarget = new THREE.Vector3(-viewport.width * 0.16, 0, radius * 1.5);
        // Inverse rotate it into local group space so it stays locked even though the group is rotated
        globalTarget.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotationTarget);

        next.set(index, {
          position: globalTarget,
          rotation: new THREE.Euler(0, -rotationTarget, 0), // Counter-rotate so it faces camera perfectly
          scale: 3.0,
          opacity: 1,
          faceCamera: true, 
        });
      } else {
        const order = (index - selectedIndex + count) % count;
        
        // "队伍的尾巴往前缩, 间距变紧凑": 
        // We pack the remaining items slightly tighter to leave a safe gap (about 45 degrees)
        // so the tail never crosses paths with the enlarged head images.
        const angleStart = (selectedIndex / count) * Math.PI * 2;
        const arcSpan = Math.PI * 1.75; // subtle compression instead of aggressive squeezing
        const progressInQueue = (order - 1) / (count - 2); 
        const packedAngle = angleStart + progressInQueue * arcSpan;
        
        const pose = computeRingPose(packedAngle);
        
        // Push the background ring DEEP back and to the right, stretching the longitudinal depth
        const ringGlobalOffset = new THREE.Vector3(viewport.width * 0.12, 0, -radius * 0.8);
        ringGlobalOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotationTarget);
        
        pose.position.add(ringGlobalOffset);
        pose.scale *= 0.85; // Natural visual deflation is handled by perspective, but keep this to distinct the ring
        pose.opacity *= 0.65;
        
        // One-way tether (Bridge): Smoothly bezier-curve the first 5 followers from the Ring to the Head
        const numBridge = 5;
        if (order > 0 && order <= numBridge) {
          // Logarithmically-spaced T values to perfectly account for shrinking physical bounding boxes.
          // This keeps their visual GAP completely uniform while dropping them into the curve rapidly
          const tVals = [0, 0.72, 0.52, 0.36, 0.24, 0.14, 0.07, 0.03, 0.01];
          const t = tVals[order];
          
          const HeadPos = new THREE.Vector3(-viewport.width * 0.16, 0, radius * 1.5);
          HeadPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotationTarget);
          
          // Control point: gracefully pushes the curve into a deep, sweeping "S" ribbon
          // Z pushed massively back to 0.4 (from 1.1) to create extreme longitudinal stretching
          const ControlPos = new THREE.Vector3(viewport.width * 0.05, 0, radius * 0.4);
          ControlPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotationTarget);

          // Quadratic Bezier interpolation for Position
          const p0 = pose.position.clone();
          const p1 = ControlPos;
          const p2 = HeadPos;
          
          pose.position.x = Math.pow(1-t, 2)*p0.x + 2*(1-t)*t*p1.x + Math.pow(t, 2)*p2.x;
          pose.position.y = Math.pow(1-t, 2)*p0.y + 2*(1-t)*t*p1.y + Math.pow(t, 2)*p2.y;
          pose.position.z = Math.pow(1-t, 2)*p0.z + 2*(1-t)*t*p1.z + Math.pow(t, 2)*p2.z;
          
          pose.scale = THREE.MathUtils.lerp(pose.scale, 1.8, t);
          pose.opacity = THREE.MathUtils.lerp(pose.opacity, 1.0, t);
          
          // Rotation: The user clarified that the 5 bridge cards MUST stay 100% perfectly flat
          // facing the screen. They only start twisting naturally once they return to the ring.
          pose.rotation.y = -rotationTarget;
        }
        
        next.set(index, pose);
      }
    });

    return next;
  }, [displayItems, radius, rotationTarget, selectedIndex, viewport.width]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    // Parallax mouse sway + main scroll rotation
    const targetY = rotationTarget + pointer.x * 0.09;
    const targetX = 0.12 + pointer.y * 0.05;
    
    const currentY = groupRef.current.rotation.y;
    groupRef.current.rotation.y = THREE.MathUtils.damp(currentY, targetY, 4.6, delta);
    groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetX, 4.6, delta);
    
    if (targetIndex !== null && selectedIndex !== targetIndex) {
      // Overlap animations: trigger the pull-out as the ring approaches the front (0.35 rad ~ 20 deg)
      // This eliminates the stutter and makes the spin and pull-out feel like one continuous fluid motion
      if (Math.abs(groupRef.current.rotation.y - targetY) < 0.35) {
        onTargetReached(targetIndex);
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.4, 0]}>
      {displayItems.map((item, index) => (
        <Card
          key={`${item.id}-${index}`}
          index={index}
          texture={textures[index]}
          layout={layoutMap.get(index)}
          selected={selectedIndex !== null && sequenceIndices[0] === index}
          hovered={hoveredIndex === index}
          selectedAt={selectedAt}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </group>
  );
}

export default function RingCarousel({ items }) {
  const sceneRef = useRef(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [targetIndex, setTargetIndex] = useState(null); // The image requested to rotate to front before pulling out
  const [selectedAt, setSelectedAt] = useState(null);
  const [rotationTarget, setRotationTarget] = useState(Math.PI / 2);
  const [scrollEnergy, setScrollEnergy] = useState(0);
  const displayItems = useMemo(() => getDisplayItems(items), [items]);
  const hoveredItem = hoveredIndex !== null ? displayItems[hoveredIndex] : null;
  const selectedItem = selectedIndex !== null ? displayItems[selectedIndex] : null;

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    let downMomentum = 0;
    let locked = false;

    const handleWheel = (event) => {
      // Allow scrolling the ring as long as we aren't currently targeting or inspecting an image
      if (selectedIndex !== null || targetIndex !== null) return;
      event.preventDefault();

      const delta = event.deltaY;
      setRotationTarget((current) => current - delta * 0.00042);

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

  const closeExpanded = () => {
    setSelectedIndex(null);
    setTargetIndex(null);
    setSelectedAt(null);
    setHoveredIndex(null);
  };

  return (
    <div
      ref={sceneRef}
      className={styles.scene}
      style={{
        transform: `scale(${1 - scrollEnergy * 0.42})`,
        opacity: 1 - scrollEnergy,
      }}
    >
      <div className={styles.canvasWrap}>
        <Canvas
          dpr={[1, 1.8]}
          camera={{ position: [0, 1.4, 26], fov: 17.5 }}
          gl={{ alpha: true, antialias: true }}
          onPointerMissed={() => {
            if (selectedIndex !== null || targetIndex !== null) {
              closeExpanded();
            }
          }}
        >
          <ambientLight intensity={1.05} />
          <directionalLight position={[4, 5, 10]} intensity={0.72} />
          <RingScene
            displayItems={displayItems}
            selectedIndex={selectedIndex}
            targetIndex={targetIndex}
            hoveredIndex={hoveredIndex}
            rotationTarget={rotationTarget}
            selectedAt={selectedAt}
            onHover={setHoveredIndex}
            onTargetReached={(index) => {
              setSelectedIndex(index);
              setSelectedAt(performance.now());
            }}
            onSelect={(index) => {
              // Enable cross-clicking: if they click another image, switch to it!
              if (index === selectedIndex || index === targetIndex) return;
              
              setTargetIndex(index);
              
              // Calculate shortest path to spin the ring so that clicked item goes to front-center
              const intrinsicAngle = (index / displayItems.length) * Math.PI * 2;
              let currentRot = rotationTarget;
              let targetRot = -intrinsicAngle;
              
              let diff = targetRot - currentRot;
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              
              setRotationTarget(currentRot + diff);
            }}
          />
        </Canvas>
      </div>

      {selectedItem && (
        <div
          className={styles.infoPanel}
          onClick={(event) => event.stopPropagation()}
        >
          <button className={styles.backButton} type="button" onClick={() => {
            setSelectedIndex(null);
            setTargetIndex(null);
            setHoveredIndex(null);
            setSelectedAt(null);
          }}>
            Back
          </button>
          {selectedItem.category && <p className={styles.category}>{selectedItem.category}</p>}
          <h2 className={styles.title}>{selectedItem.title}</h2>
          {selectedItem.description && <p className={styles.description}>{selectedItem.description}</p>}
        </div>
      )}

      {!selectedItem && hoveredItem && (
        <div className={styles.hoverLabel}>
          <span className={styles.hoverCategory}>{hoveredItem.category || "work"}</span>
          <span className={styles.hoverTitle}>{hoveredItem.title}</span>
        </div>
      )}
    </div>
  );
}
