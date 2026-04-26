"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./FloatingAIChat.module.css";

const DEFAULT_PLACEHOLDER = "问项目、作品或合作方式";
const QUICK_PROMPTS = ["我的实习经历", "我的专业背景", "我的联系方式"];
const DRAG_THRESHOLD = 5;

export default function FloatingAIChat({ inputPlaceholder = DEFAULT_PLACEHOLDER }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingIndex, setTypingIndex] = useState(null);
  const [position, setPosition] = useState(null);
  const rootRef = useRef(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const typingRef = useRef(null);
  const dragRef = useRef(null);
  const lastMessage = messages[messages.length - 1];
  const lastMessageRole = lastMessage?.role;
  const lastMessageText = lastMessage?.text;

  const clampPosition = (left, top) => {
    const root = rootRef.current;
    const width = root?.offsetWidth || 50;
    const height = root?.offsetHeight || 50;
    const margin = 12;

    return {
      left: Math.min(Math.max(left, margin), window.innerWidth - width - margin),
      top: Math.min(Math.max(top, margin), window.innerHeight - height - margin),
    };
  };

  useEffect(() => {
    setPosition(null);
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      setPosition((currentPosition) => {
        if (!currentPosition) return currentPosition;
        return clampPosition(currentPosition.left, currentPosition.top);
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isOpen, messages]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const lastIdx = messages.length - 1;
    if (lastMessageRole !== "bot" || !lastMessageText) return;

    let charIdx = 0;
    setTypingIndex(lastIdx);

    if (typingRef.current) window.clearInterval(typingRef.current);

    typingRef.current = window.setInterval(() => {
      charIdx++;
      setMessages((prev) =>
        prev.map((message, index) =>
          index === lastIdx ? { ...message, displayText: lastMessageText.slice(0, charIdx) } : message
        )
      );

      if (charIdx >= lastMessageText.length) {
        window.clearInterval(typingRef.current);
        setTypingIndex(null);
      }
    }, 14);

    return () => window.clearInterval(typingRef.current);
  }, [lastMessageRole, lastMessageText, messages.length]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [input]);

  const sendMessage = async (value = input) => {
    if (!value.trim() || loading) return;

    const text = value.trim();
    const nextMessages = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setIsOpen(true);

    try {
      const apiMessages = nextMessages.map((message) => ({
        role: message.role === "user" ? "user" : "assistant",
        content: message.text,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        { role: "bot", text: data.content || "（无回复）", displayText: "" },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "抱歉，网络暂时没有连上。", displayText: "" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([]);
    setInput("");
    setTypingIndex(null);
    if (typingRef.current) window.clearInterval(typingRef.current);
  };

  const handleLauncherPointerDown = (event) => {
    if (event.button !== 0) return;

    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originLeft: rect.left,
      originTop: rect.top,
      moved: false,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleLauncherPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

    drag.moved = true;
    setPosition(clampPosition(drag.originLeft + dx, drag.originTop + dy));
  };

  const handleLauncherPointerUp = (event) => {
    const drag = dragRef.current;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);

    if (drag?.moved) {
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      const nextPosition = clampPosition(drag.originLeft + dx, drag.originTop + dy);
      setPosition(nextPosition);
      return;
    }

    if (drag) {
      setIsOpen((value) => !value);
    }
  };

  return (
    <aside
      ref={rootRef}
      className={`${styles.floatingChat} ${isOpen ? styles.open : ""} ${
        position ? styles.dragged : ""
      }`}
      style={position ? { left: `${position.left}px`, top: `${position.top}px` } : undefined}
      aria-live="polite"
    >
      <div className={styles.panel} aria-hidden={!isOpen}>
        <div className={styles.panelActions}>
          <button className={styles.iconButton} type="button" onClick={resetChat} aria-label="新对话">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle
                cx="12"
                cy="12"
                r="6.5"
                stroke="currentColor"
                strokeWidth="1.9"
              />
            </svg>
          </button>
          <button className={styles.closeButton} type="button" onClick={() => setIsOpen(false)} aria-label="关闭">
            <span aria-hidden="true" />
          </button>
        </div>

        <div className={styles.messagesArea}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <p>想了解什么问题？</p>
              <div className={styles.quickPrompts}>
                {QUICK_PROMPTS.map((prompt) => (
                  <button key={prompt} type="button" onClick={() => sendMessage(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`${styles.messageRow} ${
                  message.role === "user" ? styles.userRow : styles.botRow
                }`}
              >
                <div className={`${styles.bubble} ${message.role === "user" ? styles.userBubble : styles.botBubble}`}>
                  {message.role === "bot" ? message.displayText ?? message.text : message.text}
                  {message.role === "bot" && typingIndex === index && message.displayText !== message.text && (
                    <span className={styles.caret}>|</span>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className={`${styles.messageRow} ${styles.botRow}`}>
              <div className={`${styles.bubble} ${styles.botBubble} ${styles.loadingBubble}`}>
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form className={styles.inputArea} onSubmit={handleSubmit}>
          <div className={styles.inputBox}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={inputPlaceholder}
              rows={1}
            />
            <button
              className={`${styles.sendButton} ${input.trim() && !loading ? styles.sendActive : ""}`}
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="发送"
            />
          </div>
        </form>
      </div>

      <button
        className={styles.launcher}
        type="button"
        onPointerDown={handleLauncherPointerDown}
        onPointerMove={handleLauncherPointerMove}
        onPointerUp={handleLauncherPointerUp}
        aria-label={isOpen ? "关闭项目问答，可拖动" : "打开项目问答，可拖动"}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <span className={styles.launchClose} aria-hidden="true" />
        ) : (
          <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M7.5 16.5 4 20V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5V14a2.5 2.5 0 0 1-2.5 2.5h-10Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className={styles.launchText}>AI</span>
          </>
        )}
      </button>
    </aside>
  );
}
