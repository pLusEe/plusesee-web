"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./AIChatSection.module.css";

const BOT_AVATAR = "P";

export default function AIChatSection() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setMessages(prev => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "bot", text: data.reply || "（无回复）" }]);
    } catch {
      setMessages(prev => [...prev, { role: "bot", text: "抱歉，出现了网络错误。" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isChatStarted = messages.length > 0;

  return (
    <div className={`${styles.section} ${isChatStarted ? styles.chatActive : styles.chatEmpty}`}>
      <div className={styles.chatContainer}>
        
        {!isChatStarted ? (
          <div className={styles.heroCenter}>
            <video 
              src="/logo.webm" 
              autoPlay 
              loop 
              muted 
              playsInline 
              className={styles.heroLogo} 
            />
          </div>
        ) : (
          <div className={styles.messagesArea}>
            <div className={styles.messagesList}>
              {messages.map((msg, i) => (
                <div key={i} className={`${styles.messageRow} ${msg.role === "user" ? styles.userRow : styles.botRow}`}>
                  {msg.role === "bot" && (
                    <div className={styles.avatar}>{BOT_AVATAR}</div>
                  )}
                  <div className={`${styles.bubble} ${msg.role === "user" ? styles.userBubble : styles.botBubble}`}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className={`${styles.messageRow} ${styles.botRow}`}>
                  <div className={styles.avatar}>{BOT_AVATAR}</div>
                  <div className={`${styles.bubble} ${styles.botBubble} ${styles.loadingBubble}`}>
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} className={styles.bottomSpacer} />
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className={styles.inputArea}>
          <div className={styles.inputBox}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="可以问我简历有关的问题"
              rows={1}
            />
            <button
              className={`${styles.sendBtn} ${input.trim() && !loading ? styles.sendActive : ""}`}
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              aria-label="Send"
            >
              {/* Up arrow icon explicitly styled like ChatGPT */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
