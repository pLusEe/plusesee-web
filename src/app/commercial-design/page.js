"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./CommercialDesign.module.css";
import defaultSiteContent from "../../data/site-content.json";

const FALLBACK_IMAGE = "/media/images/placeholder1.jpg";

const getThumb = (item) => {
  if (item?.thumbUrl) return item.thumbUrl;
  if ((item?.mediaType || "image") === "image" && item?.mediaUrl) return item.mediaUrl;
  if (item?.imageUrl) return item.imageUrl;
  return FALLBACK_IMAGE;
};

const isVideoUrl = (url) => /\.(mp4|webm|mov|m4v|ogg)$/i.test(String(url || "").trim());

const toStyleObject = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {});

const resolveImage = (safeItems, section, key, fallbackIndex) => {
  const urlKey = `${key}Url`;
  const indexKey = `${key}Index`;
  const rawUrl = String(section?.[urlKey] || "").trim();
  if (rawUrl) return rawUrl;

  const idx = Number.isInteger(section?.[indexKey]) ? section[indexKey] : fallbackIndex;
  return getThumb(safeItems[idx] || safeItems[fallbackIndex] || null);
};

const defaultCommercial = defaultSiteContent.commercialDesign;

export default function CommercialDesignPage() {
  const [activeSection, setActiveSection] = useState("all");
  const [items, setItems] = useState([]);
  const [commercial, setCommercial] = useState(defaultCommercial);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));

    fetch("/api/content")
      .then((r) => r.json())
      .then((data) => {
        if (data?.commercialDesign && typeof data.commercialDesign === "object") {
          setCommercial({
            ...defaultCommercial,
            ...data.commercialDesign,
            sections: {
              ...defaultCommercial.sections,
              ...(data.commercialDesign.sections || {}),
            },
          });
        }
      })
      .catch(() => {});
  }, []);

  const safeItems = useMemo(() => {
    if (Array.isArray(items) && items.length > 0) return items;
    return [{ title: "Placeholder", mediaUrl: FALLBACK_IMAGE, thumbUrl: FALLBACK_IMAGE }];
  }, [items]);

  const sections = commercial?.sections || defaultCommercial.sections;
  const navItems = Array.isArray(commercial?.navItems) && commercial.navItems.length > 0
    ? commercial.navItems
    : defaultCommercial.navItems;

  const allHero = resolveImage(safeItems, sections.all, "rightImage", 0);
  const sitesLeft = resolveImage(safeItems, sections.sitesInUse, "leftImage", 1);
  const sitesRight = resolveImage(safeItems, sections.sitesInUse, "rightImage", 2);
  const graphicRight = resolveImage(safeItems, sections.graphicDesign, "rightImage", 3);
  const styleLeft = resolveImage(safeItems, sections.style, "leftImage", 4);
  const acrossImage = resolveImage(safeItems, sections.acrossSpread, "image", 5);
  const archRight = resolveImage(safeItems, sections.archDesign, "rightImage", 0);
  const artLeft = resolveImage(safeItems, sections.art, "leftImage", 1);
  const artRight = resolveImage(safeItems, sections.art, "rightImage", 2);
  const photoLeft = resolveImage(safeItems, sections.photo, "leftImage", 3);
  const shopsRight = resolveImage(safeItems, sections.shops, "rightImage", 4);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -40% 0px" }
    );

    const spreads = document.querySelectorAll(`.${styles.spread}`);
    spreads.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const handleNavClick = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: "smooth" });
  };

  const renderMedia = (url, alt, className, style) => {
    if (isVideoUrl(url)) {
      return (
        <video
          src={url}
          className={className}
          style={style}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
        />
      );
    }
    return <img src={url} alt={alt} className={className} style={style} />;
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.bookContainer}>
        <div className={styles.spineOverlayContainer} aria-hidden="true">
          <img
            src={commercial?.spineImageUrl || defaultCommercial.spineImageUrl}
            alt=""
            className={styles.spineMultiply}
            draggable="false"
          />
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.navGroup}>
            <div className={styles.navTitle}>User Work</div>
            <ul className={styles.navList}>
              {navItems.map((item) => (
                <li key={item.id} className={styles.navItem}>
                  <a
                    href={`#${item.id}`}
                    className={`${styles.navLink} ${activeSection === item.id ? styles.navLinkActive : ""}`}
                    onClick={(e) => handleNavClick(e, item.id)}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <a href="#extra" className={styles.navExtra}>
              {sections?.extra?.linkLabel || "Extra Material"} <span>→</span>
            </a>
          </div>
        </aside>

        <section id="all" className={styles.spread}>
          <div className={styles.leftPage}></div>
          <div className={`${styles.rightPage} ${styles.fullBleed}`}>
            {renderMedia(
              allHero,
              "Project 1",
              `${styles.fullBleedImg} ${styles.heroRightImg}`,
              toStyleObject(sections?.all?.rightImageStyle)
            )}
          </div>
        </section>

        <section id="sites-in-use" className={styles.spread}>
          <div className={`${styles.leftPage} ${styles.flexCenter} ${styles.flushRight}`}>
            {renderMedia(
              sitesLeft,
              "Project 2 Left",
              styles.containedImg,
              toStyleObject(sections?.sitesInUse?.leftImageStyle)
            )}
          </div>
          <div className={`${styles.rightPage} ${styles.flexCenter} ${styles.flushLeft}`}>
            {renderMedia(
              sitesRight,
              "Project 2 Right",
              styles.containedImg,
              toStyleObject(sections?.sitesInUse?.rightImageStyle)
            )}
          </div>
        </section>

        <section id="graphic-design" className={styles.spread}>
          <div className={`${styles.leftPage} ${styles.flexCenter}`}>
            <div className={styles.textBlock}>
              <h2 className={styles.textTitle}>{sections?.graphicDesign?.title || "Graphic & Print"}</h2>
              <p className={styles.textBody}>{sections?.graphicDesign?.body1 || ""}</p>
              {sections?.graphicDesign?.body2 ? <p className={styles.textBody}>{sections.graphicDesign.body2}</p> : null}
              {sections?.graphicDesign?.credit ? (
                <div className={styles.creditBottom}>{sections.graphicDesign.credit}</div>
              ) : null}
            </div>
          </div>
          <div className={`${styles.rightPage} ${styles.fullBleed}`}>
            {renderMedia(
              graphicRight,
              "Project 4",
              styles.fullBleedImg,
              toStyleObject(sections?.graphicDesign?.rightImageStyle)
            )}
          </div>
        </section>

        <section id="style" className={styles.spread}>
          <div className={`${styles.leftPage} ${styles.fullBleed} ${styles.flushRight}`}>
            {renderMedia(
              styleLeft,
              "Project 5",
              styles.fullBleedImg,
              toStyleObject(sections?.style?.leftImageStyle)
            )}
            {sections?.style?.overlayText ? (
              <div style={{ position: "absolute", ...toStyleObject(sections?.style?.overlayStyle) }}>
                {String(sections.style.overlayText)
                  .split("\n")
                  .map((line, idx) => (
                    <div key={`${line}-${idx}`}>{line}</div>
                  ))}
              </div>
            ) : null}
          </div>
          <div className={styles.rightPage}></div>
        </section>

        <section id="across-spread" className={`${styles.spread} ${styles.acrossSpread}`}>
          {renderMedia(
            acrossImage,
            "Across spread project",
            styles.acrossSpreadImg,
            toStyleObject(sections?.acrossSpread?.imageStyle)
          )}
          <div className={styles.leftPage}></div>
          <div className={styles.rightPage}></div>
        </section>

        <section id="arch-design" className={styles.spread}>
          <div className={`${styles.leftPage} ${styles.flexCenter}`}>
            <div className={styles.textBlock}>
              <h2 className={styles.textTitle}>{sections?.archDesign?.title || "Architecture & Space"}</h2>
              <p className={styles.textBody}>{sections?.archDesign?.body || ""}</p>
            </div>
          </div>
          <div className={`${styles.rightPage} ${styles.flexCenter} ${styles.flushLeft}`}>
            {renderMedia(
              archRight,
              "Project Arch",
              styles.containedImg,
              toStyleObject(sections?.archDesign?.rightImageStyle)
            )}
          </div>
        </section>

        <section id="art" className={styles.spread}>
          <div className={`${styles.leftPage} ${styles.flexCenter} ${styles.flushRight}`}>
            {renderMedia(
              artLeft,
              "Project Art",
              `${styles.containedImg} ${styles.shadowedImg}`,
              toStyleObject(sections?.art?.leftImageStyle)
            )}
          </div>
          <div className={`${styles.rightPage} ${styles.flexCenter} ${styles.flushLeft}`}>
            {renderMedia(
              artRight,
              "Project Art Right",
              `${styles.containedImg} ${styles.shadowedImg}`,
              toStyleObject(sections?.art?.rightImageStyle)
            )}
          </div>
        </section>

        <section id="photo" className={styles.spread}>
          <div className={`${styles.leftPage} ${styles.flexCenter} ${styles.flushRight}`}>
            {renderMedia(
              photoLeft,
              "Project Photo",
              styles.containedImg,
              toStyleObject(sections?.photo?.leftImageStyle)
            )}
          </div>
          <div className={styles.rightPage}></div>
        </section>

        <section id="shops" className={styles.spread}>
          <div className={styles.leftPage}></div>
          <div className={`${styles.rightPage} ${styles.flexCenter} ${styles.flushLeft}`}>
            {renderMedia(
              shopsRight,
              "Project Shop",
              `${styles.containedImg} ${styles.shadowedImg}`,
              toStyleObject(sections?.shops?.rightImageStyle)
            )}
            {sections?.shops?.caption ? <div className={styles.caption}>{sections.shops.caption}</div> : null}
          </div>
        </section>

        <section id="extra" className={styles.spread}>
          <div className={`${styles.leftPage} ${styles.flexCenter}`}>
            <div className={styles.textBlock}>
              <h2 className={styles.textTitle}>{sections?.extra?.title || "Extra Material"}</h2>
              <p className={styles.textBody}>{sections?.extra?.body || ""}</p>
            </div>
          </div>
          <div className={`${styles.rightPage} ${styles.flexCenter}`}></div>
        </section>
      </div>
    </div>
  );
}
