"use client";

import { useState, useEffect } from "react";
import RingCarousel from "../components/RingCarousel";
import AIChatSection from "../components/AIChatSection";

export default function Home() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((data) => setItems(data))
      .catch(console.error);
  }, []);

  const scrollToChat = () => {
    const chatElement = document.getElementById("ai-chat");
    if (chatElement) {
      chatElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="snap-container">
      {/* Section 1: 3D Ring Carousel */}
      <section id="ring" className="snap-section">
        {items.length > 0 ? (
          <RingCarousel items={items} />
        ) : (
          <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", color: "#999" }}>
            正在加载作品...
          </div>
        )}
        
        {/* Scroll Down Arrow */}
        <div className="scroll-arrow" onClick={scrollToChat}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M12 19L19 12M12 19L5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </section>

      {/* Section 2: AI Chat — scrolled into view */}
      <section id="ai-chat" className="snap-section">
        <AIChatSection />
      </section>
    </div>
  );
}
