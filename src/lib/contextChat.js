export function openContextChatFromElement(target, context) {
  if (typeof window === "undefined" || !(target instanceof HTMLElement)) return false;
  if (!context?.title) return false;

  const selectedText = window.getSelection()?.toString().trim();
  if (selectedText) return false;

  const rect = target.getBoundingClientRect();
  const panelWidth = Math.min(390, window.innerWidth - 32);
  const panelHeight = Math.min(520, window.innerHeight - 104);
  const gap = 16;
  const canOpenRight = rect.right + gap + panelWidth <= window.innerWidth - 12;
  const left = canOpenRight
    ? rect.right + gap
    : Math.max(12, rect.left - panelWidth - gap);
  const panelTop = Math.min(
    Math.max(rect.top, 12),
    Math.max(12, window.innerHeight - panelHeight - 54)
  );

  window.dispatchEvent(
    new CustomEvent("plusesee:open-context-chat", {
      detail: {
        context,
        position: {
          left,
          top: panelTop + panelHeight + 10,
        },
      },
    })
  );

  return true;
}
