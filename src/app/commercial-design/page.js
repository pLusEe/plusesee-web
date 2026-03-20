"use client";

import { useMemo, useState } from "react";
import styles from "./CommercialDesign.module.css";

const projects = [
  {
    id: "01",
    title: "Radiance",
    brand: "plusesee",
    categories: ["commercial design", "visual system", "spatial direction"],
    collaborators: "Marton Urban / Zalan Adorjan / Olav Niels",
    year: "2026",
    exhibited:
      "2026: internal concept presentation / 2026: commercial prototype release",
    description:
      "Radiance is a commercial design study built as a spatial image system. The project turns atmosphere into a product language through light, surface, scale, and a sequence of cinematic frames. This page borrows the archive-like layout from your reference: one quiet text field, one dominant visual field, and one compact strip of navigable supporting images.",
    credit: "visual direction generated for layout testing",
    slides: [
      { id: "01", name: "Blue chamber", palette: "blue", accent: "#7ea6ff" },
      { id: "02", name: "Red chamber", palette: "red", accent: "#ff7a5f" },
      { id: "03", name: "Blue disk", palette: "disk", accent: "#8da8ff" },
      { id: "04", name: "Light basin", palette: "basin", accent: "#c8dbff" },
      { id: "05", name: "Thermal glow", palette: "heat", accent: "#ff8a4e" },
    ],
    defaultIndex: 2,
  },
  {
    id: "02",
    title: "Noctilucent",
    brand: "plusesee",
    categories: ["commercial design", "installation identity", "light object"],
    collaborators: "Ari Feld / Nian Studio / plusesee",
    year: "2025",
    exhibited: "2025: art fair preview / 2025: client proposal package",
    description:
      "Noctilucent shifts the page into a warmer, more atmospheric register. The same interface system is reused so the page feels coherent, but the visual sequence changes tone, suggesting a second client world instead of a repetition of the first.",
    credit: "image system generated for commercial layout testing",
    slides: [
      { id: "01", name: "Signal red", palette: "ember", accent: "#ff6b5a" },
      { id: "02", name: "Core flare", palette: "flare", accent: "#ffae66" },
      { id: "03", name: "Shadow vessel", palette: "void", accent: "#8f7dff" },
      { id: "04", name: "Amber field", palette: "amber", accent: "#ffbc66" },
      { id: "05", name: "Echo bloom", palette: "bloom", accent: "#ff8f80" },
    ],
    defaultIndex: 1,
  },
];

function VisualFrame({ slide, large = false, active = false, onClick }) {
  return (
    <button
      type="button"
      className={`${styles.visualFrame} ${large ? styles.visualFrameLarge : ""} ${
        active ? styles.visualFrameActive : ""
      }`}
      onClick={onClick}
      style={{ "--accent": slide.accent }}
      aria-label={slide.name}
    >
      <div className={`${styles.visualSurface} ${styles[`palette${slide.palette}`]}`}>
        <div className={styles.glowLayer} />
        <div className={styles.ringLayer} />
        <div className={styles.grainLayer} />
      </div>
    </button>
  );
}

function ProjectSection({ project }) {
  const [activeIndex, setActiveIndex] = useState(project.defaultIndex || 0);
  const activeSlide = project.slides[activeIndex];
  const pageDisplay = useMemo(
    () =>
      `${String(activeIndex + 1).padStart(2, "0")} / ${String(project.slides.length).padStart(
        2,
        "0"
      )}`,
    [activeIndex, project.slides.length]
  );

  return (
    <section className={styles.projectSection}>
      <div className={styles.layout}>
        <div className={styles.infoPanel}>
          <header className={styles.headerRow}>
            <div className={styles.brandBlock}>
              <div className={styles.brandName}>{project.brand}</div>
              <div className={styles.brandMark}>PE</div>
            </div>
            <div className={styles.categoryBlock}>
              {project.categories.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          </header>

          <div className={styles.topMarkers}>
            <span />
            <span />
            <span />
          </div>

          <div className={styles.infoSpacer} />

          <div className={styles.pageCountRow}>
            <span>{pageDisplay}</span>
            <div className={styles.miniMarks}>
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detailLabel}>title</div>
            <div className={styles.detailValue}>{project.title}</div>

            <div className={styles.detailLabel}>collaborator</div>
            <div className={styles.detailValue}>{project.collaborators}</div>

            <div className={styles.detailLabel}>year</div>
            <div className={styles.detailValue}>{project.year}</div>

            <div className={styles.detailLabel}>exhibited</div>
            <div className={styles.detailValue}>{project.exhibited}</div>

            <div className={styles.detailLabel}>description</div>
            <div className={styles.detailValue}>{project.description}</div>
          </div>

          <footer className={styles.footerRow}>
            <div className={styles.footerMark}>PE</div>
            <div className={styles.footerCredit}>{project.credit}</div>
          </footer>
        </div>

        <div className={styles.mainVisualColumn}>
          <VisualFrame slide={activeSlide} large />
        </div>

        <aside className={styles.thumbRail}>
          <div className={styles.railTabs}>
            <span className={styles.tabActive}>work</span>
            <span>lab</span>
            <span>info</span>
          </div>

          <div className={styles.thumbList}>
            {project.slides.map((slide, index) => (
              <VisualFrame
                key={slide.id}
                slide={slide}
                active={index === activeIndex}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

export default function CommercialDesignPage() {
  return (
    <div className={styles.page}>
      {projects.map((project) => (
        <ProjectSection key={project.id} project={project} />
      ))}
    </div>
  );
}
