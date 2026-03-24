"use client";

import { useMemo, useState, useEffect } from "react";
import RingCarousel from "../components/RingCarousel";
import AIChatSection from "../components/AIChatSection";
import defaultSiteContent from "../data/site-content.json";

const LEGACY_CATEGORY_TO_TAGS = {
  "home ai / ring": ["home"],
  home: ["home"],
  ring: ["home"],
  "commercial design": ["commercial"],
  commercial: ["commercial"],
  "personal design": ["personalLibrary", "personalBook"],
  personal: ["personalLibrary", "personalBook"],
  bio: ["bio"],
};

const normalizeTags = (rawCategories, rawCategory) => {
  const source = [];
  if (Array.isArray(rawCategories)) source.push(...rawCategories);
  if (typeof rawCategories === "string") source.push(...rawCategories.split(","));
  if (typeof rawCategory === "string" && rawCategory.trim()) source.push(rawCategory.trim());
  return Array.from(
    new Set(
      source.flatMap((value) => {
        const text = String(value || "").trim();
        if (!text) return [];
        if (["home", "commercial", "personalLibrary", "personalBook", "bio"].includes(text)) return [text];
        return LEGACY_CATEGORY_TO_TAGS[text.toLowerCase()] || [];
      })
    )
  );
};

export default function Home() {
  const [items, setItems] = useState([]);
  const [content, setContent] = useState(defaultSiteContent);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(console.error);

    fetch("/api/content")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object") {
          setContent(data);
        }
      })
      .catch(() => {});
  }, []);

  const ringItems = useMemo(() => {
    const selectedIds = Array.isArray(content?.home?.ring?.selectedWorkIds)
      ? content.home.ring.selectedWorkIds.map((id) => String(id))
      : [];
    if (selectedIds.length > 0) {
      const map = new Map(items.map((item) => [String(item?.id), item]));
      const selected = selectedIds.map((id) => map.get(id)).filter(Boolean);
      if (selected.length > 0) return selected;
    }

    const filter = String(content?.home?.ring?.categoryFilter || "").trim().toLowerCase();
    if (!filter) return items;
    return items.filter((item) => {
      const category = String(item?.category || "").toLowerCase();
      if (category === filter) return true;
      return normalizeTags(item?.categories, item?.category).includes(filter);
    });
  }, [content, items]);

  const aiInputPlaceholder =
    content?.home?.ai?.inputPlaceholder || defaultSiteContent.home.ai.inputPlaceholder;

  const scrollToChat = () => {
    const chatElement = document.getElementById("ai-chat");
    if (chatElement) {
      chatElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="snap-container" style={{ position: "relative", zIndex: 1 }}>
      <section id="ring" className="snap-section">
        {ringItems.length > 0 ? (
          <RingCarousel items={ringItems} />
        ) : (
          <div
            style={{
              height: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem",
              color: "#999",
            }}
          >
            正在加载作品...
          </div>
        )}

        <div className="scroll-arrow" onClick={scrollToChat}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5V19M12 19L19 12M12 19L5 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </section>

      <section id="ai-chat" className="snap-section">
        <AIChatSection inputPlaceholder={aiInputPlaceholder} />
      </section>
    </div>
  );
}
