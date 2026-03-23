"use client";

import { useState, useEffect } from "react";
import styles from "./CommercialDesign.module.css";
import portfolio from "../../data/portfolio.json";

const getThumb = (item) => {
  if (item?.thumbUrl) return item.thumbUrl;
  if ((item?.mediaType || "image") === "image" && item?.mediaUrl) return item.mediaUrl;
  if (item?.imageUrl) return item.imageUrl;
  return "/placeholder1.jpg";
};

export default function CommercialDesignPage() {
  const [activeSection, setActiveSection] = useState("all");
  
  const safeItems = Array.isArray(portfolio) && portfolio.length > 0 ? portfolio : Array(10).fill({ title: "Placeholder" });
  
  // Use images from portfolio.json for the layout demo
  const img1 = getThumb(safeItems[0]);
  const img2 = getThumb(safeItems[1] || safeItems[0]);
  const img3 = getThumb(safeItems[2] || safeItems[0]);
  const img4 = getThumb(safeItems[3] || safeItems[0]);
  const img5 = getThumb(safeItems[4] || safeItems[0]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
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
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navItems = [
    { id: "all", label: "All" },
    { id: "sites-in-use", label: "Sites In Use" },
    { id: "graphic-design", label: "Graphic Design" },
    { id: "style", label: "Style" },
    { id: "arch-design", label: "Arch. & Design" },
    { id: "art", label: "Art" },
    { id: "photo", label: "Photo" },
    { id: "shops", label: "Shops" }
  ];

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.bookContainer}>
        {/* Center Spine Shadow Container */}
        <div className={styles.spineOverlayContainer} aria-hidden="true">
          <img
            src="/crease-multiply2.png"
            alt=""
            className={styles.spineMultiply}
            draggable="false"
          />
        </div>
        
        {/* Left Sticky Navigation */}
        <aside className={styles.sidebar}>
          <div className={styles.navGroup}>
            <div className={styles.navTitle}>User Work</div>
            <ul className={styles.navList}>
              {navItems.map(item => (
                <li key={item.id} className={styles.navItem}>
                  <a 
                    href={`#${item.id}`} 
                    className={`${styles.navLink} ${activeSection === item.id ? styles.navLinkActive : ''}`}
                    onClick={(e) => handleNavClick(e, item.id)}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <a href="#extra" className={styles.navExtra}>
              Extra Material <span>↓</span>
            </a>
          </div>
        </aside>

        {/* Scrollable Content Spreads */}
        
        {/* Spread 1: Intro (Right Image matching the Sir Grayson Perry screenshot) */}
        <section id="all" className={styles.spread}>
          <div className={styles.leftPage}>
          </div>
          <div className={`${styles.rightPage} ${styles.flexCenter} ${styles.flushLeft}`}>
            <img src={img1} alt="Project 1" className={`${styles.containedImg} ${styles.shadowedImg}`} />
            <div className={styles.caption}>Sir Grayson Perry CBE RA</div>
          </div>
        </section>

        {/* Spread 2: Double Images */}
        <section id="sites-in-use" className={styles.spread}>
          <div className={`${styles.leftPage} ${styles.flexCenter} ${styles.flushRight}`}>
            <img src={img2} alt="Project 2 Left" className={styles.containedImg} />
          </div>
          <div className={`${styles.rightPage} ${styles.flexCenter} ${styles.flushLeft}`}>
             <img src={img3} alt="Project 2 Right" className={styles.containedImg} />
          </div>
        </section>

        {/* Spread 3: Left Text, Right Image */}
        <section id="graphic-design" className={styles.spread}>
          <div className={`${styles.leftPage} ${styles.flexCenter}`}>
            <div className={styles.textBlock}>
              <h2 className={styles.textTitle}>Graphic & Print</h2>
              <p className={styles.textBody}>
                This editorial layout mimics the structural rhythm of a high-end photography book. The rigid center spine and the generous whitespace allow the imagery to breathe, presenting visual systems with a quiet, confident authority.
              </p>
              <p className={styles.textBody}>
                The typography relies on tight letter-spacing and structural hierarchy, avoiding unnecessary ornaments.
              </p>
              <div className={styles.creditBottom}>
                Photography <strong>Plusesee Studio</strong>
              </div>
            </div>
          </div>
          <div className={`${styles.rightPage} ${styles.fullBleed}`}>
             <img src={img4} alt="Project 4" className={styles.fullBleedImg} />
          </div>
        </section>

        {/* Spread 4: Full Bleed Left Image (Matching second screenshot, Le Fool Collective) */}
        <section id="style" className={styles.spread}>
          <div className={`${styles.leftPage} ${styles.fullBleed} ${styles.flushRight}`}>
             <img src={img5} alt="Project 5" className={styles.fullBleedImg} />
             <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', fontSize: '0.65rem', color: '#fff' }}>
                Le Fool Collective<br/>@le_fool_club
             </div>
          </div>
          <div className={styles.rightPage}>
          </div>
        </section>
        
        {/* Spread 5: Arch & Design placeholder */}
        <section id="arch-design" className={styles.spread}>
          <div className={`${styles.leftPage} ${styles.flexCenter}`}>
            <div className={styles.textBlock}>
              <h2 className={styles.textTitle}>Architecture & Space</h2>
              <p className={styles.textBody}>
                A study in spatial relationships and structural harmony.
              </p>
            </div>
          </div>
          <div className={`${styles.rightPage} ${styles.flexCenter} ${styles.flushLeft}`}>
            <img src={img1} alt="Project Arch" className={styles.containedImg} />
          </div>
        </section>
        
        {/* Spread 6: Art placeholder */}
        <section id="art" className={styles.spread}>
          <div className={`${styles.leftPage} ${styles.flexCenter} ${styles.flushRight}`}>
            <img src={img2} alt="Project Art" className={`${styles.containedImg} ${styles.shadowedImg}`} />
          </div>
          <div className={`${styles.rightPage} ${styles.flexCenter} ${styles.flushLeft}`}>
             <img src={img3} alt="Project Art Right" className={`${styles.containedImg} ${styles.shadowedImg}`} />
          </div>
        </section>

        {/* Spread 7: Photo placeholder */}
        <section id="photo" className={styles.spread}>
          <div className={`${styles.leftPage} ${styles.flexCenter} ${styles.flushRight}`}>
            <img src={img4} alt="Project Photo" className={styles.containedImg} />
          </div>
          <div className={styles.rightPage}>
          </div>
        </section>

        {/* Spread 8: Shops placeholder */}
        <section id="shops" className={styles.spread}>
          <div className={styles.leftPage}></div>
          <div className={`${styles.rightPage} ${styles.flexCenter} ${styles.flushLeft}`}>
            <img src={img5} alt="Project Shop" className={`${styles.containedImg} ${styles.shadowedImg}`} />
            <div className={styles.caption}>Retail Concepts</div>
          </div>
        </section>
        
        <section id="extra" className={styles.spread}>
          <div className={`${styles.leftPage} ${styles.flexCenter}`}>
            <div className={styles.textBlock}>
              <h2 className={styles.textTitle}>Extra Material</h2>
              <p className={styles.textBody}>Additional resources and references.</p>
            </div>
          </div>
          <div className={`${styles.rightPage} ${styles.flexCenter}`}></div>
        </section>

      </div>
    </div>
  );
}
