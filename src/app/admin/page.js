"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./Admin.module.css";
import defaultSiteContent from "../../data/site-content.json";

const IMAGE_PREFIXES = ["/media/images/commercial-design/", "/media/images/archive/"];
const MIN_RING_ASPECT = 0.45;
const MAX_RING_ASPECT = 2.2;
const DEFAULT_RING_ASPECT = 0.9;
const DEFAULT_RING_CROP = { focusX: 0.5, focusY: 0.5, zoom: 1 };

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

const deepCloneEntries = (entries) =>
  entries.map((entry) => ({
    ...entry,
    categories: Array.isArray(entry.categories) ? [...entry.categories] : [],
    ringCrop: {
      focusX: entry?.ringCrop?.focusX ?? DEFAULT_RING_CROP.focusX,
      focusY: entry?.ringCrop?.focusY ?? DEFAULT_RING_CROP.focusY,
      zoom: entry?.ringCrop?.zoom ?? DEFAULT_RING_CROP.zoom,
    },
  }));

const isEligibleImage = (item) =>
  item &&
  (item.mediaType || "image") === "image" &&
  typeof item.mediaUrl === "string" &&
  IMAGE_PREFIXES.some((prefix) => item.mediaUrl.startsWith(prefix));

const inferCollection = (mediaUrl) =>
  mediaUrl.startsWith("/media/images/archive/") ? "archive" : "commercial";

const inferCategories = (mediaUrl) =>
  inferCollection(mediaUrl) === "archive" ? ["personalLibrary", "personalBook"] : ["commercial"];

const normalizeEntryFromItem = (item) => ({
  id: String(item?.id || ""),
  title: String(item?.title || "").trim() || "Untitled",
  mediaUrl: String(item?.mediaUrl || "").trim(),
  thumbUrl: String(item?.thumbUrl || item?.mediaUrl || "").trim(),
  category: String(item?.category || "").trim(),
  categories: Array.isArray(item?.categories) && item.categories.length > 0 ? item.categories : inferCategories(String(item?.mediaUrl || "").trim()),
  collection: inferCollection(String(item?.mediaUrl || "").trim()),
  ringAspect: clampNumber(Number(item?.ringAspect) || DEFAULT_RING_ASPECT, MIN_RING_ASPECT, MAX_RING_ASPECT),
  ringCrop: {
    focusX: clampNumber(Number(item?.ringCrop?.focusX) || DEFAULT_RING_CROP.focusX, 0, 1),
    focusY: clampNumber(Number(item?.ringCrop?.focusY) || DEFAULT_RING_CROP.focusY, 0, 1),
    zoom: clampNumber(Number(item?.ringCrop?.zoom) || DEFAULT_RING_CROP.zoom, 1, 3),
  },
});

const entrySnapshot = (entries) =>
  JSON.stringify(
    entries.map((entry) => ({
      id: entry.id,
      mediaUrl: entry.mediaUrl,
      ringAspect: Number(entry.ringAspect.toFixed(3)),
      ringCrop: {
        focusX: Number(entry.ringCrop.focusX.toFixed(4)),
        focusY: Number(entry.ringCrop.focusY.toFixed(4)),
        zoom: Number(entry.ringCrop.zoom.toFixed(3)),
      },
    }))
  );

const getCropRect = (sourceWidth, sourceHeight, targetAspect, zoom = 1, focusX = 0.5, focusY = 0.5) => {
  const sourceAspect = sourceWidth / sourceHeight;
  const safeAspect = clampNumber(targetAspect || DEFAULT_RING_ASPECT, MIN_RING_ASPECT, MAX_RING_ASPECT);
  const safeZoom = clampNumber(zoom || 1, 1, 3);

  let baseCropWidth;
  let baseCropHeight;

  if (sourceAspect > safeAspect) {
    baseCropHeight = sourceHeight;
    baseCropWidth = baseCropHeight * safeAspect;
  } else {
    baseCropWidth = sourceWidth;
    baseCropHeight = baseCropWidth / safeAspect;
  }

  const cropWidth = Math.max(1, Math.round(baseCropWidth / safeZoom));
  const cropHeight = Math.max(1, Math.round(baseCropHeight / safeZoom));
  const x = clampNumber(
    Math.round((sourceWidth - cropWidth) * clampNumber(focusX, 0, 1)),
    0,
    Math.max(0, sourceWidth - cropWidth)
  );
  const y = clampNumber(
    Math.round((sourceHeight - cropHeight) * clampNumber(focusY, 0, 1)),
    0,
    Math.max(0, sourceHeight - cropHeight)
  );

  return { x, y, cropWidth, cropHeight };
};

const getPreviewImageStyle = (entry, imageSize) => {
  if (!imageSize?.width || !imageSize?.height) {
    return {
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
    };
  }

  const crop = getCropRect(
    imageSize.width,
    imageSize.height,
    entry.ringAspect,
    entry.ringCrop.zoom,
    entry.ringCrop.focusX,
    entry.ringCrop.focusY
  );

  return {
    width: `${(imageSize.width / crop.cropWidth) * 100}%`,
    height: `${(imageSize.height / crop.cropHeight) * 100}%`,
    left: `${-(crop.x / crop.cropWidth) * 100}%`,
    top: `${-(crop.y / crop.cropHeight) * 100}%`,
  };
};

function CropPreview({ entry, imageSize, onImageLoad, compact = false }) {
  const imageStyle = getPreviewImageStyle(entry, imageSize);

  return (
    <div
      className={compact ? styles.previewFrameCompact : styles.previewFrame}
      style={{ aspectRatio: `${entry.ringAspect}` }}
    >
      <img
        src={entry.mediaUrl}
        alt={entry.title}
        className={styles.previewImage}
        style={imageStyle}
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (!naturalWidth || !naturalHeight) return;
          onImageLoad(entry.mediaUrl, { width: naturalWidth, height: naturalHeight });
        }}
      />
      <div className={styles.previewOverlay} />
    </div>
  );
}

export default function AdminPage() {
  const [items, setItems] = useState([]);
  const [content, setContent] = useState(defaultSiteContent);
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [savedEntries, setSavedEntries] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [imageSizes, setImageSizes] = useState({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setMessage("");
      try {
        const [itemsRes, contentRes] = await Promise.all([fetch("/api/portfolio"), fetch("/api/content")]);
        const itemsData = (await itemsRes.json()) || [];
        const contentData = (await contentRes.json()) || defaultSiteContent;
        if (cancelled) return;

        const safeItems = Array.isArray(itemsData) ? itemsData.filter(isEligibleImage).map(normalizeEntryFromItem) : [];
        const byId = new Map(safeItems.map((item) => [item.id, item]));
        const selectedIds = Array.isArray(contentData?.home?.ring?.selectedWorkIds)
          ? contentData.home.ring.selectedWorkIds.map((id) => String(id))
          : [];
        const hydrated = selectedIds.map((id) => byId.get(id)).filter(Boolean).map(normalizeEntryFromItem);

        setItems(safeItems);
        setContent(contentData && typeof contentData === "object" ? contentData : defaultSiteContent);
        setSelectedEntries(hydrated);
        setSavedEntries(deepCloneEntries(hydrated));
        setActiveIndex(hydrated.length > 0 ? 0 : -1);
      } catch (error) {
        if (!cancelled) {
          setMessage(error?.message || "加载失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedEntries.length) {
      if (activeIndex !== -1) setActiveIndex(-1);
      return;
    }
    if (activeIndex < 0 || activeIndex >= selectedEntries.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, selectedEntries]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return items.filter((item) => {
      if (collectionFilter !== "all" && item.collection !== collectionFilter) return false;
      if (!keyword) return true;
      return (
        item.title.toLowerCase().includes(keyword) ||
        item.mediaUrl.toLowerCase().includes(keyword)
      );
    });
  }, [collectionFilter, items, search]);

  const currentEntry = activeIndex >= 0 ? selectedEntries[activeIndex] : null;
  const hasUnsavedChanges = entrySnapshot(selectedEntries) !== entrySnapshot(savedEntries);

  const setEntryAt = (index, updater) => {
    setSelectedEntries((prev) =>
      prev.map((entry, entryIndex) => {
        if (entryIndex !== index) return entry;
        const nextEntry = typeof updater === "function" ? updater(entry) : updater;
        return {
          ...nextEntry,
          ringAspect: clampNumber(Number(nextEntry.ringAspect) || DEFAULT_RING_ASPECT, MIN_RING_ASPECT, MAX_RING_ASPECT),
          ringCrop: {
            focusX: clampNumber(Number(nextEntry?.ringCrop?.focusX) || DEFAULT_RING_CROP.focusX, 0, 1),
            focusY: clampNumber(Number(nextEntry?.ringCrop?.focusY) || DEFAULT_RING_CROP.focusY, 0, 1),
            zoom: clampNumber(Number(nextEntry?.ringCrop?.zoom) || DEFAULT_RING_CROP.zoom, 1, 3),
          },
        };
      })
    );
  };

  const addItemToSelection = (item) => {
    if (selectedEntries.some((entry) => entry.mediaUrl === item.mediaUrl)) {
      setMessage("这张图已经在首页圆环里了。");
      return;
    }
    const next = normalizeEntryFromItem(item);
    setSelectedEntries((prev) => [...prev, next]);
    setActiveIndex(selectedEntries.length);
    setMessage("已添加到首页圆环。");
  };

  const replaceActiveSelection = (item) => {
    if (activeIndex < 0) {
      addItemToSelection(item);
      return;
    }
    const next = normalizeEntryFromItem(item);
    setEntryAt(activeIndex, next);
    setMessage("已替换当前图片。");
  };

  const moveEntry = (index, direction) => {
    setSelectedEntries((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      setActiveIndex(target);
      return next;
    });
  };

  const removeEntry = (index) => {
    setSelectedEntries((prev) => prev.filter((_, entryIndex) => entryIndex !== index));
    setMessage("已移除这张图。");
  };

  const resetChanges = () => {
    const cloned = deepCloneEntries(savedEntries);
    setSelectedEntries(cloned);
    setActiveIndex(cloned.length > 0 ? 0 : -1);
    setMessage("已恢复到上次保存的状态。");
  };

  const handleImageLoad = (mediaUrl, size) => {
    setImageSizes((prev) => {
      const current = prev[mediaUrl];
      if (current?.width === size.width && current?.height === size.height) return prev;
      return { ...prev, [mediaUrl]: size };
    });
  };

  const saveChanges = async () => {
    setSaving(true);
    setMessage("");
    try {
      const nextContent = {
        ...content,
        home: {
          ...content.home,
          ring: {
            ...content?.home?.ring,
            selectedWorkIds: selectedEntries.map((entry) => entry.id),
          },
        },
      };

      const portfolioResponse = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulkUpsert",
          items: selectedEntries.map((entry) => ({
            id: entry.id,
            title: entry.title,
            category: entry.category,
            categories: entry.categories,
            description: "",
            date: "",
            mediaType: "image",
            mediaUrl: entry.mediaUrl,
            thumbUrl: entry.thumbUrl || entry.mediaUrl,
            ringAspect: entry.ringAspect,
            ringCrop: entry.ringCrop,
          })),
        }),
      });

      if (!portfolioResponse.ok) {
        const detail = await portfolioResponse.text();
        throw new Error(detail || "保存图片配置失败");
      }

      const portfolioPayload = await portfolioResponse.json();
      const returnedItems = Array.isArray(portfolioPayload?.items)
        ? portfolioPayload.items.filter(isEligibleImage).map(normalizeEntryFromItem)
        : [];

      const contentResponse = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: nextContent }),
      });

      if (!contentResponse.ok) {
        const detail = await contentResponse.text();
        throw new Error(detail || "保存首页配置失败");
      }

      setContent(nextContent);
      setSavedEntries(deepCloneEntries(selectedEntries));
      if (returnedItems.length > 0) {
        setItems((prev) => {
          const overrides = new Map(returnedItems.map((item) => [item.mediaUrl, item]));
          return prev.map((item) => overrides.get(item.mediaUrl) || item);
        });
      }
      setMessage("首页圆环图片配置已保存。");
    } catch (error) {
      setMessage(error?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <p className={styles.kicker}>Admin</p>
          <h1 className={styles.title}>首页圆环图片编辑</h1>
          <p className={styles.subtitle}>
            只保留首页圆环的选图、排序和裁切。图片来源限定为 `media/images/commercial-design` 与
            `media/images/archive`。
          </p>
        </div>
        <div className={styles.topActions}>
          <Link href="/" className={styles.backLink}>
            返回首页
          </Link>
          <button
            type="button"
            className={styles.ghostButton}
            disabled={!hasUnsavedChanges || saving}
            onClick={resetChanges}
          >
            还原
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={saving || loading || !hasUnsavedChanges}
            onClick={saveChanges}
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      {message ? <p className={styles.message}>{message}</p> : null}

      <div className={styles.layout}>
        <section className={styles.libraryPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>图片库</h2>
              <p>从真实素材里选图。点击添加，或者替换右侧当前选中的图片。</p>
            </div>
          </div>

          <div className={styles.filters}>
            <input
              className={styles.searchInput}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索文件名"
            />
            <div className={styles.segmented}>
              {[
                { id: "all", label: "全部" },
                { id: "commercial", label: "Commercial" },
                { id: "archive", label: "Archive" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.segmentButton} ${
                    collectionFilter === option.id ? styles.segmentButtonActive : ""
                  }`}
                  onClick={() => setCollectionFilter(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.libraryGrid}>
            {filteredItems.map((item) => {
              const isSelected = selectedEntries.some((entry) => entry.mediaUrl === item.mediaUrl);
              return (
                <article key={item.mediaUrl} className={styles.libraryCard}>
                  <img src={item.thumbUrl || item.mediaUrl} alt={item.title} className={styles.libraryThumb} />
                  <div className={styles.libraryMeta}>
                    <strong>{item.title}</strong>
                    <span>{item.collection === "archive" ? "Archive" : "Commercial"}</span>
                  </div>
                  <div className={styles.libraryActions}>
                    <button
                      type="button"
                      className={styles.smallButton}
                      disabled={isSelected}
                      onClick={() => addItemToSelection(item)}
                    >
                      {isSelected ? "已添加" : "添加"}
                    </button>
                    <button
                      type="button"
                      className={styles.smallGhostButton}
                      disabled={activeIndex < 0}
                      onClick={() => replaceActiveSelection(item)}
                    >
                      替换当前
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.editorPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>首页圆环</h2>
              <p>可以增加、减少、排序，并单独调整每一张图的展示范围。</p>
            </div>
            <div className={styles.countBadge}>{selectedEntries.length} 张</div>
          </div>

          <div className={styles.selectedList}>
            {selectedEntries.map((entry, index) => (
              <button
                key={`${entry.id}-${entry.mediaUrl}`}
                type="button"
                className={`${styles.selectedRow} ${activeIndex === index ? styles.selectedRowActive : ""}`}
                onClick={() => setActiveIndex(index)}
              >
                <span className={styles.orderIndex}>{String(index + 1).padStart(2, "0")}</span>
                <CropPreview
                  entry={entry}
                  imageSize={imageSizes[entry.mediaUrl]}
                  onImageLoad={handleImageLoad}
                  compact
                />
                <div className={styles.selectedMeta}>
                  <strong>{entry.title}</strong>
                  <span>{entry.collection === "archive" ? "Archive" : "Commercial"}</span>
                </div>
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={(event) => {
                      event.stopPropagation();
                      moveEntry(index, -1);
                    }}
                    disabled={index === 0}
                  >
                    上移
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={(event) => {
                      event.stopPropagation();
                      moveEntry(index, 1);
                    }}
                    disabled={index === selectedEntries.length - 1}
                  >
                    下移
                  </button>
                  <button
                    type="button"
                    className={styles.dangerButton}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeEntry(index);
                    }}
                  >
                    删除
                  </button>
                </div>
              </button>
            ))}
          </div>

          {currentEntry ? (
            <div className={styles.cropEditor}>
              <div className={styles.cropPreviewWrap}>
                <div className={styles.cropPreviewHeader}>
                  <h3>裁切预览</h3>
                  <span>
                    {currentEntry.collection === "archive" ? "Archive" : "Commercial"} / {currentEntry.title}
                  </span>
                </div>
                <CropPreview
                  entry={currentEntry}
                  imageSize={imageSizes[currentEntry.mediaUrl]}
                  onImageLoad={handleImageLoad}
                />
              </div>

              <div className={styles.controls}>
                <label className={styles.controlBlock}>
                  <span>卡片宽高比 {currentEntry.ringAspect.toFixed(2)}</span>
                  <input
                    type="range"
                    min={MIN_RING_ASPECT}
                    max={MAX_RING_ASPECT}
                    step="0.01"
                    value={currentEntry.ringAspect}
                    onChange={(event) =>
                      setEntryAt(activeIndex, {
                        ...currentEntry,
                        ringAspect: Number(event.target.value),
                      })
                    }
                  />
                </label>

                <label className={styles.controlBlock}>
                  <span>缩放 {currentEntry.ringCrop.zoom.toFixed(2)}x</span>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={currentEntry.ringCrop.zoom}
                    onChange={(event) =>
                      setEntryAt(activeIndex, {
                        ...currentEntry,
                        ringCrop: {
                          ...currentEntry.ringCrop,
                          zoom: Number(event.target.value),
                        },
                      })
                    }
                  />
                </label>

                <label className={styles.controlBlock}>
                  <span>横向位置 {Math.round(currentEntry.ringCrop.focusX * 100)}%</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.001"
                    value={currentEntry.ringCrop.focusX}
                    onChange={(event) =>
                      setEntryAt(activeIndex, {
                        ...currentEntry,
                        ringCrop: {
                          ...currentEntry.ringCrop,
                          focusX: Number(event.target.value),
                        },
                      })
                    }
                  />
                </label>

                <label className={styles.controlBlock}>
                  <span>纵向位置 {Math.round(currentEntry.ringCrop.focusY * 100)}%</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.001"
                    value={currentEntry.ringCrop.focusY}
                    onChange={(event) =>
                      setEntryAt(activeIndex, {
                        ...currentEntry,
                        ringCrop: {
                          ...currentEntry.ringCrop,
                          focusY: Number(event.target.value),
                        },
                      })
                    }
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>先从左侧图片库里添加首页圆环图片。</div>
          )}
        </section>
      </div>
    </div>
  );
}
