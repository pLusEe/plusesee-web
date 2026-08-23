"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./FloatingAIChat.module.css";

const DEFAULT_PLACEHOLDER = "想了解什么问题";
const QUICK_PROMPTS = ["你的实习经历", "你的专业背景", "你的联系方式"];
const CONTEXT_QUICK_PROMPTS = [
  "这部分内容主要讲了什么？",
  "你在其中负责什么？",
  "最值得关注的是什么？",
];
const DRAG_THRESHOLD = 5;
const CONTEXT_PANEL_EXIT_MS = 230;

export default function FloatingAIChat({ inputPlaceholder = DEFAULT_PLACEHOLDER }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingIndex, setTypingIndex] = useState(null);
  const [position, setPosition] = useState(null);
  const [activeContext, setActiveContext] = useState(null);
  const [isPanelDragging, setIsPanelDragging] = useState(false);
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const typingRef = useRef(null);
  const panelDragRef = useRef(null);
  const contextCloseTimerRef = useRef(null);
  const lastMessage = messages[messages.length - 1];
  const lastMessageRole = lastMessage?.role;
  const lastMessageText = lastMessage?.text;

  const clampPosition = useCallback((left, top) => {
    const root = rootRef.current;
    const width = root?.offsetWidth || 50;
    const height = root?.offsetHeight || 50;
    const margin = 12;

    return {
      left: Math.min(Math.max(left, margin), window.innerWidth - width - margin),
      top: Math.min(Math.max(top, margin), window.innerHeight - height - margin),
    };
  }, []);

  const clampPanelPosition = useCallback((left, top) => {
    const panel = panelRef.current;
    const root = rootRef.current;
    const panelWidth = panel?.offsetWidth || Math.min(390, window.innerWidth - 32);
    const panelHeight = panel?.offsetHeight || Math.min(520, window.innerHeight - 104);
    const rootHeight = root?.offsetHeight || 42;
    const margin = 12;
    const minTop = panelHeight + 10 + margin;
    const maxTop = Math.max(minTop, window.innerHeight - rootHeight - margin);

    return {
      left: Math.min(Math.max(left, margin), window.innerWidth - panelWidth - margin),
      top: Math.min(Math.max(top, minTop), maxTop),
    };
  }, []);

  const clearPanelDrag = useCallback(() => {
    panelDragRef.current = null;
    setIsPanelDragging(false);
  }, []);

  const clearContextCloseTimer = useCallback(() => {
    if (contextCloseTimerRef.current === null) return;
    window.clearTimeout(contextCloseTimerRef.current);
    contextCloseTimerRef.current = null;
  }, []);

  const closeChat = useCallback(() => {
    clearPanelDrag();
    setIsOpen(false);
    if (!activeContext) return;

    clearContextCloseTimer();
    contextCloseTimerRef.current = window.setTimeout(() => {
      setActiveContext(null);
      setPosition(null);
      contextCloseTimerRef.current = null;
    }, CONTEXT_PANEL_EXIT_MS);
  }, [activeContext, clearContextCloseTimer, clearPanelDrag]);

  useEffect(
    () => () => {
      clearContextCloseTimer();
      panelDragRef.current = null;
    },
    [clearContextCloseTimer]
  );

  useEffect(() => {
    clearContextCloseTimer();
    clearPanelDrag();
    setPosition(null);
    setIsOpen(false);
    setActiveContext(null);
  }, [clearContextCloseTimer, clearPanelDrag, pathname]);

  useEffect(() => {
    const handleContextOpen = (event) => {
      const detail = event?.detail || {};
      const nextContext = detail.context;
      const nextPosition = detail.position;

      clearContextCloseTimer();
      clearPanelDrag();
      if (nextContext?.title) setActiveContext(nextContext);
      if (Number.isFinite(nextPosition?.left) && Number.isFinite(nextPosition?.top)) {
        setPosition(clampPosition(nextPosition.left, nextPosition.top));
      }
      setIsOpen(true);
    };

    window.addEventListener("plusesee:open-context-chat", handleContextOpen);
    return () => window.removeEventListener("plusesee:open-context-chat", handleContextOpen);
  }, [clampPosition, clearContextCloseTimer, clearPanelDrag]);

  useEffect(() => {
    const handleResize = () => {
      setPosition((currentPosition) => {
        if (!currentPosition) return currentPosition;
        return isOpen
          ? clampPanelPosition(currentPosition.left, currentPosition.top)
          : clampPosition(currentPosition.left, currentPosition.top);
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPanelPosition, clampPosition, isOpen]);

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
      if (event.key === "Escape") closeChat();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeChat]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDownOutside = (event) => {
      if (rootRef.current?.contains(event.target)) return;
      closeChat();
    };

    document.addEventListener("pointerdown", handlePointerDownOutside, true);
    return () => document.removeEventListener("pointerdown", handlePointerDownOutside, true);
  }, [closeChat, isOpen]);

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

      if (activeContext && apiMessages.length > 0) {
        const lastIndex = apiMessages.length - 1;
        apiMessages[lastIndex] = {
          ...apiMessages[lastIndex],
          content: [
            `当前页面正在查看的作品：${activeContext.title}`,
            activeContext.date ? `作品时间：${activeContext.date}` : "",
            activeContext.description ? `作品介绍：${activeContext.description}` : "",
            `用户问题：${text}`,
          ]
            .filter(Boolean)
            .join("\n"),
        };
      }

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

  const contextPrompts = Array.isArray(activeContext?.prompts)
    ? activeContext.prompts.filter((prompt) => typeof prompt === "string" && prompt.trim()).slice(0, 4)
    : [];
  const quickPrompts = contextPrompts.length > 0
    ? contextPrompts
    : activeContext
      ? CONTEXT_QUICK_PROMPTS
      : QUICK_PROMPTS;

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

  const handleLauncherClick = () => {
    if (!isOpen) {
      setIsOpen(true);
      return;
    }
    textareaRef.current?.focus();
  };

  const handlePanelPointerDown = (event) => {
    if (event.button !== 0) return;
    if (event.target.closest("button, a, input, textarea, select, [role='button']")) return;

    const panel = panelRef.current;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    const drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: rect.left,
      originTop: rect.top,
      panelHeight: rect.height,
      active: false,
    };

    panelDragRef.current = drag;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePanelPointerMove = (event) => {
    const drag = panelDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.active) {
      if (Math.hypot(dx, dy) <= DRAG_THRESHOLD) return;
      drag.active = true;
      setIsPanelDragging(true);
    }

    event.preventDefault();
    setPosition(
      clampPanelPosition(
        drag.originLeft + dx,
        drag.originTop + dy + drag.panelHeight + 10
      )
    );
  };

  const handlePanelPointerUp = (event) => {
    const drag = panelDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    panelDragRef.current = null;
    setIsPanelDragging(false);
  };

  return (
    <aside
      ref={rootRef}
      className={`${styles.floatingChat} ${isOpen ? styles.open : ""} ${
        position ? styles.dragged : ""
      } ${activeContext ? styles.contextual : ""} ${
        isPanelDragging ? styles.panelDragging : ""
      }`}
      style={position ? { left: `${position.left}px`, top: `${position.top}px` } : undefined}
      aria-live="polite"
    >
      <div
        ref={panelRef}
        className={styles.panel}
        aria-hidden={!isOpen}
        data-dragging={isPanelDragging ? "true" : "false"}
        onPointerDown={handlePanelPointerDown}
        onPointerMove={handlePanelPointerMove}
        onPointerUp={handlePanelPointerUp}
        onPointerCancel={handlePanelPointerUp}
      >
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
        </div>

        {activeContext ? (
          <div className={styles.contextBar}>
            <span>ASKING ABOUT</span>
            <strong>{activeContext.title}</strong>
          </div>
        ) : null}

        <div className={styles.messagesArea}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <p>想了解什么问题？</p>
              <div className={styles.quickPrompts}>
                {quickPrompts.map((prompt) => (
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
              placeholder={
                activeContext?.inputPlaceholder ||
                (activeContext ? "向 AI 询问这部分内容" : inputPlaceholder)
              }
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
        onClick={handleLauncherClick}
        aria-label={isOpen ? "项目问答已打开" : "打开项目问答"}
        aria-expanded={isOpen}
        data-cursor-hidden="true"
      >
        <span className={styles.dockLabel} aria-hidden="true">ASK AI</span>
        <span className={styles.dockSparkle} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 2.5c.45 5.5 3.55 8.6 9 9-5.45.45-8.55 3.55-9 9-.45-5.45-3.55-8.55-9-9 5.45-.4 8.55-3.5 9-9Z" />
            <circle cx="19.2" cy="4.8" r="1.25" />
          </svg>
        </span>
      </button>
    </aside>
  );
}
