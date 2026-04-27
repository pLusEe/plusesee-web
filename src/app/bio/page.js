"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import styles from "./Bio.module.css";
import defaultSiteContent from "../../data/site-content.json";

const defaultBio = defaultSiteContent.bio;

const isRecord = (value) => value && typeof value === "object" && !Array.isArray(value);

function FallingTitle({ text }) {
  const titleRef = useRef(null);
  const charRefs = useRef([]);
  const physicsRef = useRef([]);
  const dragRef = useRef(null);
  const characters = useMemo(() => Array.from(text || ""), [text]);

  useLayoutEffect(() => {
    const title = titleRef.current;
    const hero = title?.closest("[data-bio-hero]");
    if (!title || !hero) return undefined;

    const setCharTransform = (idx) => {
      const char = charRefs.current[idx];
      const item = physicsRef.current[idx];
      if (!char || !item) return;
      char.style.transform = `translate3d(${item.x}px, ${item.y}px, 0) rotate(${item.rotation}deg)`;
    };

    const measure = (reset = false) => {
      const chars = charRefs.current.filter(Boolean);
      chars.forEach((char) => {
        char.style.transform = "translate3d(0, 0, 0)";
      });

      const heroRect = hero.getBoundingClientRect();
      const midpoint = (chars.length - 1) / 2;

      physicsRef.current = chars.map((char, idx) => {
        const rect = char.getBoundingClientRect();
        const previous = physicsRef.current[idx] || {};
        const floor = Math.max(0, heroRect.bottom - rect.bottom - 1);
        const minX = heroRect.left - rect.left;
        const maxX = heroRect.right - rect.right;

        return {
          x: reset ? 0 : previous.x || 0,
          y: reset ? 0 : Math.min(previous.y || 0, floor),
          vx: reset ? (idx - midpoint) * 8 : previous.vx || 0,
          vy: reset ? 0 : previous.vy || 0,
          rotation: reset ? 0 : previous.rotation || 0,
          vr: reset ? (idx % 2 === 0 ? -18 : 18) : previous.vr || 0,
          floor,
          minX,
          maxX,
          dragging: previous.dragging || false,
        };
      });

      chars.forEach((_, idx) => setCharTransform(idx));
    };

    measure(true);

    let raf = 0;
    let prev = performance.now();
    const gravity = 2250;
    const bounce = 0.28;
    const floorFriction = 0.9;
    const wallBounce = 0.32;

    const tick = (now) => {
      const dt = Math.min(0.032, (now - prev) / 1000);
      prev = now;

      physicsRef.current.forEach((item, idx) => {
        if (!item || item.dragging) {
          setCharTransform(idx);
          return;
        }

        item.vy += gravity * dt;
        item.x += item.vx * dt;
        item.y += item.vy * dt;
        item.rotation += item.vr * dt;

        if (item.x < item.minX) {
          item.x = item.minX;
          item.vx = Math.abs(item.vx) * wallBounce;
          item.vr *= -0.45;
        } else if (item.x > item.maxX) {
          item.x = item.maxX;
          item.vx = -Math.abs(item.vx) * wallBounce;
          item.vr *= -0.45;
        }

        if (item.y >= item.floor) {
          item.y = item.floor;
          if (Math.abs(item.vy) > 70) {
            item.vy = -Math.abs(item.vy) * bounce;
          } else {
            item.vy = 0;
          }
          item.vx *= floorFriction;
          item.vr *= 0.72;
          if (Math.abs(item.vx) < 3) item.vx = 0;
          if (Math.abs(item.vr) < 2) item.vr = 0;
        }

        setCharTransform(idx);
      });

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);

    const onResize = () => measure(false);
    window.addEventListener("resize", onResize);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [characters.length, text]);

  const handlePointerDown = (event, idx) => {
    const item = physicsRef.current[idx];
    const char = charRefs.current[idx];
    if (!item || !char) return;

    event.preventDefault();
    char.setPointerCapture?.(event.pointerId);
    item.dragging = true;
    item.vx = 0;
    item.vy = 0;
    item.vr = 0;
    dragRef.current = {
      idx,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      itemX: item.x,
      itemY: item.y,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: event.timeStamp,
    };
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const item = physicsRef.current[drag.idx];
    const char = charRefs.current[drag.idx];
    if (!item || !char) return;

    const now = event.timeStamp;
    const dt = Math.max(0.001, (now - drag.lastTime) / 1000);
    const nextX = drag.itemX + event.clientX - drag.startX;
    const nextY = drag.itemY + event.clientY - drag.startY;

    item.x = Math.max(item.minX, Math.min(item.maxX, nextX));
    item.y = Math.max(0, Math.min(item.floor, nextY));
    item.vx = (event.clientX - drag.lastX) / dt;
    item.vy = (event.clientY - drag.lastY) / dt;
    item.rotation += item.vx * 0.0015;
    char.style.transform = `translate3d(${item.x}px, ${item.y}px, 0) rotate(${item.rotation}deg)`;

    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.lastTime = now;
  };

  const handlePointerUp = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const item = physicsRef.current[drag.idx];
    const char = charRefs.current[drag.idx];
    if (item) {
      item.dragging = false;
      item.vr = item.vx * 0.04;
    }
    char?.releasePointerCapture?.(event.pointerId);
    dragRef.current = null;
  };

  return (
    <h1 ref={titleRef} className={`${styles.title} ${styles.fallingTitle}`}>
      {characters.map((char, idx) => {
        const isSpace = char === " ";
        const isWordGap = idx === 5;
        return (
          <span
            key={`${char}-${idx}`}
            ref={(node) => {
              charRefs.current[idx] = node;
            }}
            className={`${styles.titleChar} ${isSpace ? styles.titleSpace : ""} ${
              isWordGap ? styles.titleWordGap : ""
            }`}
            onPointerDown={(event) => handlePointerDown(event, idx)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {isSpace ? "\u00A0" : char}
          </span>
        );
      })}
    </h1>
  );
}

function PairedText({ cn, en, href }) {
  const content = (
    <span className={styles.pairedText}>
      {cn ? <span className={styles.primaryLine}>{cn}</span> : null}
      {en ? <span className={styles.secondaryLine}>{en}</span> : null}
    </span>
  );

  return href ? (
    <a className={styles.metaLink} href={href}>
      {content}
    </a>
  ) : (
    content
  );
}

function renderMetaItem(item, idx) {
  if (!isRecord(item)) return null;

  return (
    <div key={`${item.labelCn || item.label}-${idx}`} className={styles.metaBlock}>
      <span className={styles.metaLabel}>
        {item.label || [item.labelEn, item.labelCn].filter(Boolean).join(" / ")}
      </span>
      {item.valueCn || item.valueEn ? (
        <PairedText cn={item.valueCn} en={item.valueEn} href={item.href} />
      ) : item.href ? (
        <a className={styles.metaLink} href={item.href}>
          {item.value}
        </a>
      ) : (
        <span className={styles.metaValue}>{item.value}</span>
      )}
    </div>
  );
}

function renderFocusItem(item, idx) {
  if (isRecord(item)) {
    return (
      <li key={`${item.cn || item.en}-${idx}`} className={styles.compactItem}>
        <PairedText cn={item.cn} en={item.en} />
      </li>
    );
  }

  return <li key={`${item}-${idx}`}>{item}</li>;
}

function renderProjectItem(item, idx) {
  if (isRecord(item)) {
    return (
      <li key={`${item.title}-${idx}`} className={styles.projectItem}>
        <div className={styles.itemTopline}>
          <span className={styles.primaryLine}>{item.title}</span>
          {item.role ? <span className={styles.projectRole}>{item.role}</span> : null}
        </div>
      </li>
    );
  }

  return <li key={`${item}-${idx}`}>{item}</li>;
}

function renderWorkItem(item, idx) {
  if (isRecord(item)) {
    return (
      <li key={`${item.companyCn}-${item.period}-${idx}`} className={styles.experienceItem}>
        <div className={styles.itemTopline}>
          <div className={styles.experienceGroup}>
            <PairedText cn={item.companyCn} en={item.companyEn} />
          </div>
          <div className={styles.experienceRight}>
            <div className={styles.experienceRole}>
              <PairedText cn={item.roleCn} />
            </div>
            <div className={styles.experienceMeta}>
              <PairedText cn={[item.locationCn, item.period].filter(Boolean).join(" · ")} />
            </div>
          </div>
        </div>
      </li>
    );
  }

  return <li key={`${item}-${idx}`}>{item}</li>;
}

export default function BioPage() {
  const [bio, setBio] = useState(defaultBio);

  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((data) => {
        if (data?.bio && typeof data.bio === "object") {
          setBio({
            ...defaultBio,
            ...data.bio,
            meta: Array.isArray(data.bio.meta) ? data.bio.meta : defaultBio.meta,
            aboutParagraphs: Array.isArray(data.bio.aboutParagraphs)
              ? data.bio.aboutParagraphs
              : defaultBio.aboutParagraphs,
            services: Array.isArray(data.bio.services) ? data.bio.services : defaultBio.services,
            collaborators: Array.isArray(data.bio.collaborators)
              ? data.bio.collaborators
              : defaultBio.collaborators,
            projectExperience: Array.isArray(data.bio.projectExperience)
              ? data.bio.projectExperience
              : defaultBio.projectExperience,
            workExperience: Array.isArray(data.bio.workExperience)
              ? data.bio.workExperience
              : defaultBio.workExperience,
          });
        }
      })
      .catch(() => {});
  }, []);

  const metaItems = useMemo(() => (Array.isArray(bio.meta) ? bio.meta : []), [bio.meta]);

  return (
    <div className={styles.page}>
      <div className={styles.gridNoise} aria-hidden="true"></div>

      <main className={styles.main}>
        <section className={styles.hero} data-bio-hero>
          <div className={styles.heroText}>
            {bio.kicker ? <p className={styles.kicker}>{bio.kicker}</p> : null}
            <FallingTitle text={bio.title} />
            {bio.lead ? <p className={styles.lead}>{bio.lead}</p> : null}
          </div>
          {bio.photoUrl ? (
            <div className={styles.heroMedia}>
              <img src={bio.photoUrl} alt="Bio portrait" className={styles.portrait} />
            </div>
          ) : null}
        </section>

        <section className={styles.content}>
          <aside className={styles.sideMeta}>
            {metaItems.map(renderMetaItem)}
          </aside>

          <div className={styles.columns}>
            <article className={styles.block}>
              <h2>Focus / 方向</h2>
              <ul>
                {(bio.services || []).map(renderFocusItem)}
              </ul>
            </article>

            {(bio.workExperience || []).length > 0 ? (
              <article className={styles.block}>
                <h2>Work Experience / 工作经历</h2>
                <ul>
                  {(bio.workExperience || []).map(renderWorkItem)}
                </ul>
              </article>
            ) : null}

            {(bio.projectExperience || []).length > 0 ? (
              <article className={styles.block}>
                <h2>Project Experience / 项目经历</h2>
                <ul>
                  {(bio.projectExperience || []).map(renderProjectItem)}
                </ul>
              </article>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
