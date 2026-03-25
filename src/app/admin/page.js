"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import styles from "./Admin.module.css";
import defaultSiteContent from "../../data/site-content.json";

const FALLBACK_IMAGE = "/media/images/placeholder1.jpg";

const WORK_TAGS = [
  { id: "home", label: "2.1 首页圆环" },
  { id: "commercial", label: "2.2 商业设计" },
  { id: "personalLibrary", label: "2.3 个人设计册子（含 2.3.1）" },
  { id: "bio", label: "2.4 Bio" },
];

const TAG_LABELS = {
  home: "2.1 首页圆环",
  commercial: "2.2 商业设计",
  personalLibrary: "2.3 个人设计册子",
  personalBook: "2.3 个人设计册子",
  bio: "2.4 Bio",
};

const PANEL_ITEMS = [
  { key: "works", label: "1. 作品管理", hint: "左侧上传，右侧管理已上传作品" },
  { key: "home", label: "2.1 首页圆环 + AI", hint: "圆环图片勾选排序，AI 文案修改" },
  { key: "commercial", label: "2.2 商业设计", hint: "项目切换编辑：名称、布局、素材绑定" },
  { key: "personalLibrary", label: "2.3 个人设计册子", hint: "封面、飘落素材、2.3.1 册子页面都在这里" },
  { key: "bio", label: "2.4 Bio", hint: "头像、简介、经历信息" },
];

const MEDIA_TYPE_LABELS = {
  image: "图片",
  video: "视频",
  audio: "音频",
};

const LEGACY_CATEGORY_TO_TAGS = {
  "home ai / ring": ["home"],
  home: ["home"],
  ring: ["home"],
  "commercial design": ["commercial"],
  commercial: ["commercial"],
  "personal design": ["personalLibrary", "personalBook"],
  "design archive": ["personalLibrary", "personalBook"],
  personal: ["personalLibrary", "personalBook"],
  bio: ["bio"],
};

const TAG_TO_LEGACY_CATEGORY = {
  home: "home ai / ring",
  commercial: "commercial design",
  personalLibrary: "design archive",
  personalBook: "design archive",
  bio: "bio",
};

const COMMERCIAL_PROJECTS = [
  {
    sectionKey: "all",
    navId: "all",
    fallbackName: "Project 1",
    slots: [{ id: "main", label: "主视觉", urlKey: "rightImageUrl", indexKey: "rightImageIndex", styleKey: "rightImageStyle" }],
  },
  {
    sectionKey: "sitesInUse",
    navId: "sites-in-use",
    fallbackName: "Project 2",
    slots: [
      { id: "left", label: "左侧媒体", urlKey: "leftImageUrl", indexKey: "leftImageIndex", styleKey: "leftImageStyle" },
      { id: "right", label: "右侧媒体", urlKey: "rightImageUrl", indexKey: "rightImageIndex", styleKey: "rightImageStyle" },
    ],
  },
  {
    sectionKey: "graphicDesign",
    navId: "graphic-design",
    fallbackName: "Project 3",
    slots: [{ id: "main", label: "主视觉", urlKey: "rightImageUrl", indexKey: "rightImageIndex", styleKey: "rightImageStyle" }],
  },
  {
    sectionKey: "style",
    navId: "style",
    fallbackName: "Project 4",
    slots: [{ id: "main", label: "主视觉", urlKey: "leftImageUrl", indexKey: "leftImageIndex", styleKey: "leftImageStyle" }],
  },
  {
    sectionKey: "acrossSpread",
    navId: "across-spread",
    fallbackName: "Project 5",
    slots: [{ id: "main", label: "跨页媒体", urlKey: "imageUrl", indexKey: "imageIndex", styleKey: "imageStyle" }],
  },
  {
    sectionKey: "archDesign",
    navId: "arch-design",
    fallbackName: "Project 6",
    slots: [{ id: "main", label: "主视觉", urlKey: "rightImageUrl", indexKey: "rightImageIndex", styleKey: "rightImageStyle" }],
  },
  {
    sectionKey: "art",
    navId: "art",
    fallbackName: "Project 7",
    slots: [
      { id: "left", label: "左侧媒体", urlKey: "leftImageUrl", indexKey: "leftImageIndex", styleKey: "leftImageStyle" },
      { id: "right", label: "右侧媒体", urlKey: "rightImageUrl", indexKey: "rightImageIndex", styleKey: "rightImageStyle" },
    ],
  },
  {
    sectionKey: "photo",
    navId: "photo",
    fallbackName: "Project 8",
    slots: [{ id: "main", label: "主视觉", urlKey: "leftImageUrl", indexKey: "leftImageIndex", styleKey: "leftImageStyle" }],
  },
  {
    sectionKey: "shops",
    navId: "shops",
    fallbackName: "Project 9",
    slots: [{ id: "main", label: "主视觉", urlKey: "rightImageUrl", indexKey: "rightImageIndex", styleKey: "rightImageStyle" }],
  },
];

const COMMERCIAL_LAYOUT_PRESETS = [
  { id: "single", label: "单图" },
  { id: "full", label: "满版图" },
  { id: "split", label: "左右均分" },
  { id: "focus-left", label: "左大右小" },
  { id: "focus-right", label: "右大左小" },
];

const initialForm = {
  title: "",
  description: "",
  date: "",
  mediaType: "image",
  tags: ["personalLibrary"],
};

const toObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};
const toArray = (value, fallback = []) => (Array.isArray(value) ? value : fallback);
const toStringSafe = (value, fallback = "") => {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
};
const toNumberSafe = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const unique = (list) => Array.from(new Set(list));

const normalizeTags = (rawCategories, rawCategory) => {
  const source = [];
  if (Array.isArray(rawCategories)) source.push(...rawCategories);
  if (typeof rawCategories === "string") source.push(...rawCategories.split(","));
  if (typeof rawCategory === "string" && rawCategory.trim()) source.push(rawCategory.trim());

  const tags = source
    .flatMap((value) => {
      const text = toStringSafe(value).trim();
      if (!text) return [];
      if (TAG_LABELS[text]) return [text];
      return LEGACY_CATEGORY_TO_TAGS[text.toLowerCase()] || [];
    })
    .filter((tag) => TAG_LABELS[tag]);

  return unique(tags);
};

const pickLegacyCategory = (tags, fallback) => {
  for (const tag of tags) {
    if (TAG_TO_LEGACY_CATEGORY[tag]) return TAG_TO_LEGACY_CATEGORY[tag];
  }
  const nextFallback = toStringSafe(fallback).trim();
  return nextFallback || "uncategorized";
};

const normalizeMediaType = (value) => {
  const type = toStringSafe(value).trim().toLowerCase();
  if (type === "image" || type === "video" || type === "audio") return type;
  return "image";
};

const normalizeItem = (item) => {
  const tags = normalizeTags(item?.categories, item?.category);
  const mediaType = normalizeMediaType(item?.mediaType);
  const mediaUrl = toStringSafe(item?.mediaUrl).trim();
  const thumbUrl =
    toStringSafe(item?.thumbUrl).trim() ||
    (mediaType === "image" ? mediaUrl : FALLBACK_IMAGE) ||
    FALLBACK_IMAGE;

  return {
    id: toStringSafe(item?.id, `${Date.now()}`),
    title: toStringSafe(item?.title, "Untitled"),
    description: toStringSafe(item?.description),
    date: toStringSafe(item?.date),
    mediaType,
    mediaUrl,
    thumbUrl,
    categories: tags,
    category: pickLegacyCategory(tags, item?.category),
  };
};

const matchesMediaType = (item, acceptedTypes) => {
  const accepted = Array.isArray(acceptedTypes) && acceptedTypes.length > 0
    ? acceptedTypes
    : ["image", "video", "audio"];
  return accepted.includes(normalizeMediaType(item?.mediaType));
};

const isVideoUrl = (url) => /\.(mp4|webm|mov|m4v|ogg)$/i.test(toStringSafe(url));
const isAudioUrl = (url) => /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(toStringSafe(url));

const getThumb = (item) => {
  if (item?.thumbUrl) return item.thumbUrl;
  if (normalizeMediaType(item?.mediaType) === "image" && item?.mediaUrl) return item.mediaUrl;
  return FALLBACK_IMAGE;
};

const sortWorks = (list) =>
  [...list].sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));

const getCommercialStylePreset = (slotCount, presetId) => {
  if (slotCount <= 1) {
    if (presetId === "full") return [{ width: "100%", height: "100%", objectPosition: "center center" }];
    if (presetId === "focus-left") return [{ width: "78%", height: "100%", objectPosition: "left center" }];
    if (presetId === "focus-right") return [{ width: "78%", height: "100%", objectPosition: "right center" }];
    return [{ width: "88%", height: "100%", objectPosition: "center center" }];
  }

  if (presetId === "focus-left") {
    return [
      { width: "66%", height: "100%", objectPosition: "left center" },
      { width: "34%", height: "100%", objectPosition: "right center" },
    ];
  }
  if (presetId === "focus-right") {
    return [
      { width: "34%", height: "100%", objectPosition: "left center" },
      { width: "66%", height: "100%", objectPosition: "right center" },
    ];
  }
  return [
    { width: "50%", height: "100%", objectPosition: "center center" },
    { width: "50%", height: "100%", objectPosition: "center center" },
  ];
};

const setByPath = (target, path, value) => {
  let current = target;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    if (!current[key] || typeof current[key] !== "object") current[key] = {};
    current = current[key];
  }
  current[path[path.length - 1]] = value;
};

const mergeContent = (raw) => {
  const data = toObject(raw);
  const home = toObject(data.home);
  const commercial = toObject(data.commercialDesign);
  const personal = toObject(data.personalDesign);
  const library = toObject(personal.library);
  const book2019 = toObject(personal.book2019);
  const bio = toObject(data.bio);
  const sections = toObject(commercial.sections);

  const mergedSections = Object.keys(defaultSiteContent.commercialDesign.sections || {}).reduce((acc, key) => {
    acc[key] = {
      ...toObject(defaultSiteContent.commercialDesign.sections?.[key]),
      ...toObject(sections?.[key]),
    };
    return acc;
  }, {});

  return {
    ...defaultSiteContent,
    ...data,
    home: {
      ...defaultSiteContent.home,
      ...home,
      ai: {
        ...defaultSiteContent.home.ai,
        ...toObject(home.ai),
      },
      ring: {
        ...defaultSiteContent.home.ring,
        ...toObject(home.ring),
        selectedWorkIds: unique(toArray(home?.ring?.selectedWorkIds).map((id) => toStringSafe(id).trim()).filter(Boolean)),
      },
    },
    commercialDesign: {
      ...defaultSiteContent.commercialDesign,
      ...commercial,
      navItems:
        toArray(commercial.navItems).length > 0
          ? toArray(commercial.navItems)
          : defaultSiteContent.commercialDesign.navItems,
      sections: mergedSections,
    },
    personalDesign: {
      ...defaultSiteContent.personalDesign,
      ...personal,
      library: {
        ...defaultSiteContent.personalDesign.library,
        ...library,
        book: {
          ...defaultSiteContent.personalDesign.library.book,
          ...toObject(library.book),
        },
        fallingImages:
          toArray(library.fallingImages).length > 0
            ? toArray(library.fallingImages)
            : defaultSiteContent.personalDesign.library.fallingImages,
        rightNote:
          toArray(library.rightNote).length > 0
            ? toArray(library.rightNote)
            : defaultSiteContent.personalDesign.library.rightNote,
      },
      book2019: {
        ...defaultSiteContent.personalDesign.book2019,
        ...book2019,
        pages: toArray(book2019.pages),
        pageWorkIds: unique(toArray(book2019.pageWorkIds).map((id) => toStringSafe(id).trim()).filter(Boolean)),
        projects:
          toArray(book2019.projects).length > 0
            ? toArray(book2019.projects)
            : defaultSiteContent.personalDesign.book2019.projects,
      },
    },
    bio: {
      ...defaultSiteContent.bio,
      ...bio,
      meta: toArray(bio.meta, defaultSiteContent.bio.meta),
      aboutParagraphs: toArray(bio.aboutParagraphs, defaultSiteContent.bio.aboutParagraphs),
      services: toArray(bio.services, defaultSiteContent.bio.services),
      collaborators: toArray(bio.collaborators, defaultSiteContent.bio.collaborators),
      projectExperience: toArray(bio.projectExperience, defaultSiteContent.bio.projectExperience),
      workExperience: toArray(bio.workExperience, defaultSiteContent.bio.workExperience),
    },
  };
};

const normalizeForSave = (config) => {
  const next = mergeContent(config);

  next.home.ring.selectedWorkIds = unique(
    toArray(next.home?.ring?.selectedWorkIds)
      .map((id) => toStringSafe(id).trim())
      .filter(Boolean)
  );

  next.commercialDesign.navItems = toArray(next.commercialDesign.navItems)
    .map((item, idx) => ({
      id: toStringSafe(item?.id, `tab-${idx + 1}`).trim() || `tab-${idx + 1}`,
      label: toStringSafe(item?.label).trim() || `栏目 ${idx + 1}`,
    }))
    .filter((item) => item.id);

  if (next.commercialDesign.navItems.length === 0) {
    next.commercialDesign.navItems = defaultSiteContent.commercialDesign.navItems;
  }

  next.personalDesign.library.fallingImages = toArray(next.personalDesign.library.fallingImages)
    .map((item, idx) => ({
      src: toStringSafe(item?.src).trim(),
      rotate: toNumberSafe(item?.rotate, idx % 2 === 0 ? 270 : 0),
      width: toNumberSafe(item?.width, 1279),
      height: toNumberSafe(item?.height, 1706),
    }))
    .filter((item) => item.src);

  next.personalDesign.library.rightNote = toArray(next.personalDesign.library.rightNote)
    .map((item) => toStringSafe(item).trim())
    .filter(Boolean)
    .slice(0, 2);

  while (next.personalDesign.library.rightNote.length < 2) {
    next.personalDesign.library.rightNote.push("");
  }

  next.personalDesign.book2019.pageWorkIds = unique(
    toArray(next.personalDesign.book2019.pageWorkIds)
      .map((id) => toStringSafe(id).trim())
      .filter(Boolean)
  );

  next.personalDesign.book2019.projects = toArray(next.personalDesign.book2019.projects)
    .map((item, idx) => ({
      start: toNumberSafe(item?.start, idx * 2 + 1),
      end: toNumberSafe(item?.end, idx * 2 + 2),
      name: toStringSafe(item?.name).trim() || `Project ${idx + 1}`,
    }))
    .filter((item) => item.name);

  next.bio.meta = toArray(next.bio.meta)
    .map((item) => ({
      label: toStringSafe(item?.label).trim(),
      value: toStringSafe(item?.value).trim(),
      href: toStringSafe(item?.href).trim(),
    }))
    .filter((item) => item.label || item.value || item.href);

  const textLists = ["aboutParagraphs", "services", "collaborators", "projectExperience", "workExperience"];
  textLists.forEach((field) => {
    next.bio[field] = toArray(next.bio[field])
      .map((line) => toStringSafe(line).trim())
      .filter(Boolean);
  });

  return next;
};

const textListToMultiline = (list) => toArray(list).map((line) => toStringSafe(line)).join("\n");
const multilineToTextList = (value) =>
  toStringSafe(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

export default function AdminPage() {
  const [items, setItems] = useState([]);
  const [activePanel, setActivePanel] = useState("works");

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const fileInputRef = useRef(null);

  const [workQuery, setWorkQuery] = useState("");
  const [workTagFilter, setWorkTagFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [config, setConfig] = useState(() => mergeContent(defaultSiteContent));
  const [savedConfig, setSavedConfig] = useState(() => mergeContent(defaultSiteContent));
  const [contentLoading, setContentLoading] = useState(false);
  const [contentMessage, setContentMessage] = useState("");

  const [pickerQuery, setPickerQuery] = useState({});
  const [activeCommercialSection, setActiveCommercialSection] = useState("all");

  const itemMapById = useMemo(
    () => new Map(items.map((item) => [toStringSafe(item.id), item])),
    [items]
  );
  const itemMapByUrl = useMemo(
    () => new Map(items.map((item) => [toStringSafe(item.mediaUrl), item])),
    [items]
  );

  const currentEditingItem = useMemo(
    () => items.find((item) => toStringSafe(item.id) === toStringSafe(editingId)) || null,
    [items, editingId]
  );

  const getPickerKeyword = (pickerKey) => toStringSafe(pickerQuery[pickerKey]).trim().toLowerCase();
  const updatePickerKeyword = (pickerKey, value) => {
    setPickerQuery((prev) => ({ ...prev, [pickerKey]: value }));
  };

  const hasTag = (item, tagId) => {
    const tags = normalizeTags(item?.categories, item?.category);
    if (tagId === "personalLibrary") {
      return tags.includes("personalLibrary") || tags.includes("personalBook");
    }
    if (tagId === "personalBook") {
      return tags.includes("personalBook") || tags.includes("personalLibrary");
    }
    return tags.includes(tagId);
  };

  const getCandidates = (tagId, acceptedTypes = ["image", "video", "audio"]) => {
    const accepted = Array.isArray(acceptedTypes) && acceptedTypes.length > 0 ? acceptedTypes : ["image", "video", "audio"];
    return sortWorks(
      items.filter((item) => hasTag(item, tagId) && matchesMediaType(item, accepted))
    );
  };

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/portfolio");
      const data = await res.json();
      setItems(Array.isArray(data) ? data.map(normalizeItem) : []);
    } catch {
      setItems([]);
    }
  };

  const fetchContent = async () => {
    try {
      const res = await fetch("/api/content");
      const data = await res.json();
      const merged = mergeContent(data);
      setConfig(merged);
      setSavedConfig(merged);
    } catch {
      setContentMessage("内容配置读取失败，已回退默认配置。");
    }
  };

  useEffect(() => {
    fetchItems();
    fetchContent();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const clearPreviewBlob = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl("");
  };

  const resetWorkForm = () => {
    setForm(initialForm);
    setEditingId("");
    setUploadFile(null);
    clearPreviewBlob();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateConfigPath = (path, value) => {
    setConfig((prev) => {
      const next = structuredClone(prev);
      setByPath(next, path, value);
      return next;
    });
  };

  const uploadMediaFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "上传失败" }));
      throw new Error(err.error || "上传失败");
    }
    const data = await res.json();
    const url = toStringSafe(data?.url).trim();
    if (!url) throw new Error("上传后未返回可用地址");
    return url;
  };

  const handleMediaChange = (event) => {
    const file = event.target.files?.[0] || null;
    setUploadFile(file);
    clearPreviewBlob();
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      let tags = unique(toArray(form.tags).filter((tag) => TAG_LABELS[tag]));
      if (tags.includes("personalLibrary") && !tags.includes("personalBook")) {
        tags = [...tags, "personalBook"];
      }
      if (tags.length === 0) throw new Error("请至少选择一个所属板块。");

      let mediaUrl = toStringSafe(currentEditingItem?.mediaUrl);
      let thumbUrl = toStringSafe(currentEditingItem?.thumbUrl);

      if (uploadFile) {
        const uploadedUrl = await uploadMediaFile(uploadFile);
        mediaUrl = uploadedUrl;
        if (form.mediaType === "image") thumbUrl = uploadedUrl;
      }

      if (!editingId && !mediaUrl) {
        throw new Error("请先从本地选择一个要上传的文件。");
      }

      const payload = {
        title: form.title.trim() || "Untitled",
        description: form.description.trim(),
        date: form.date,
        mediaType: normalizeMediaType(form.mediaType),
        mediaUrl,
        thumbUrl: thumbUrl || (normalizeMediaType(form.mediaType) === "image" ? mediaUrl : FALLBACK_IMAGE),
        categories: tags,
        category: pickLegacyCategory(tags, currentEditingItem?.category),
      };

      const body = editingId
        ? { action: "update", id: editingId, ...payload }
        : payload;

      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "保存失败" }));
        throw new Error(err.error || "保存失败");
      }

      await fetchItems();
      const notice = editingId ? "作品更新成功。" : "作品上传成功。";
      resetWorkForm();
      setMessage(notice);
    } catch (error) {
      setMessage(error.message || "保存失败");
    } finally {
      setLoading(false);
    }
  };

  const startEditWork = (item) => {
    setActivePanel("works");
    setEditingId(toStringSafe(item.id));
    const normalized = normalizeTags(item.categories, item.category);
    const uiTags = normalized.includes("personalLibrary") || normalized.includes("personalBook")
      ? unique([...normalized.filter((tag) => tag !== "personalBook"), "personalLibrary"])
      : normalized;
    setForm({
      title: toStringSafe(item.title),
      description: toStringSafe(item.description),
      date: toStringSafe(item.date),
      mediaType: normalizeMediaType(item.mediaType),
      tags: uiTags,
    });
    setUploadFile(null);
    clearPreviewBlob();
    setPreviewUrl(toStringSafe(item.mediaUrl));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteWork = async (id) => {
    const shouldDelete = window.confirm("确认删除这个作品吗？");
    if (!shouldDelete) return;
    setMessage("");
    const res = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (!res.ok) {
      setMessage("删除失败，请重试。");
      return;
    }
    if (toStringSafe(editingId) === toStringSafe(id)) {
      resetWorkForm();
    }
    await fetchItems();
    setMessage("作品已删除。");
  };

  const filteredWorks = useMemo(() => {
    const keyword = workQuery.trim().toLowerCase();
    return sortWorks(
      items.filter((item) => {
        const tagMatch = workTagFilter === "all" ? true : hasTag(item, workTagFilter);
        if (!tagMatch) return false;
        if (!keyword) return true;
        const searchable = [
          toStringSafe(item.title),
          toStringSafe(item.description),
          toStringSafe(item.mediaUrl),
          normalizeTags(item.categories, item.category).map((tag) => TAG_LABELS[tag]).join(" "),
        ]
          .join(" ")
          .toLowerCase();
        return searchable.includes(keyword);
      })
    );
  }, [items, workQuery, workTagFilter]);

  const saveContent = async () => {
    setContentLoading(true);
    setContentMessage("");
    try {
      const normalized = normalizeForSave(config);
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: normalized }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "保存失败" }));
        throw new Error(err.error || "保存失败");
      }
      setConfig(normalized);
      setSavedConfig(normalized);
      setContentMessage("配置已保存。");
    } catch (error) {
      setContentMessage(error.message || "保存失败");
    } finally {
      setContentLoading(false);
    }
  };

  const resetContent = () => {
    setConfig(structuredClone(savedConfig));
    setContentMessage("已撤销未保存修改。");
  };

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(normalizeForSave(config)) !== JSON.stringify(normalizeForSave(savedConfig));
  }, [config, savedConfig]);

  const renderMiniPreview = (itemOrUrl, className = styles.previewThumb) => {
    const item = typeof itemOrUrl === "string" ? itemMapByUrl.get(itemOrUrl) : itemOrUrl;
    const mediaUrl = toStringSafe(item?.mediaUrl || itemOrUrl);
    const mediaType = normalizeMediaType(item?.mediaType);
    if (!mediaUrl) return <div className={`${styles.previewThumb} ${styles.previewEmpty}`}>无</div>;
    if (mediaType === "video" || isVideoUrl(mediaUrl)) {
      return <video src={mediaUrl} className={className} muted playsInline preload="metadata" />;
    }
    if (mediaType === "audio" || isAudioUrl(mediaUrl)) {
      return <div className={`${className} ${styles.audioBadge}`}>音频</div>;
    }
    return <img src={getThumb(item)} alt={toStringSafe(item?.title, "preview")} className={className} />;
  };

  const renderSingleWorkPicker = ({
    pickerKey,
    label,
    tagId,
    acceptedTypes = ["image"],
    value,
    onChange,
    emptyText = "未选择",
    detailsTitle = "展开缩略图选择",
  }) => {
    const candidates = getCandidates(tagId, acceptedTypes);
    const selectedItem =
      candidates.find((item) => toStringSafe(item.mediaUrl) === toStringSafe(value)) ||
      itemMapByUrl.get(toStringSafe(value));
    const keyword = getPickerKeyword(pickerKey);
    const visibleCandidates = candidates.filter((item) => {
      if (!keyword) return true;
      const hay = `${toStringSafe(item.title)} ${toStringSafe(item.mediaUrl)}`.toLowerCase();
      return hay.includes(keyword);
    });

    return (
      <div className={styles.fieldBlock}>
        <label className={styles.fieldLabel}>{label}</label>
        <div className={styles.pickerTopRow}>
          <select
            className={styles.input}
            value={selectedItem ? toStringSafe(selectedItem.id) : ""}
            onChange={(event) => {
              const selected = candidates.find((item) => toStringSafe(item.id) === event.target.value);
              onChange(selected ? toStringSafe(selected.mediaUrl) : "");
            }}
          >
            <option value="">{emptyText}</option>
            {visibleCandidates.map((item) => (
              <option key={`${pickerKey}-${item.id}`} value={toStringSafe(item.id)}>
                {item.title} · {MEDIA_TYPE_LABELS[item.mediaType]}
              </option>
            ))}
          </select>
          <input
            className={styles.searchInput}
            placeholder="搜索素材"
            value={toStringSafe(pickerQuery[pickerKey])}
            onChange={(event) => updatePickerKeyword(pickerKey, event.target.value)}
          />
        </div>

        <div className={styles.selectedInline}>
          {selectedItem ? (
            <>
              {renderMiniPreview(selectedItem)}
              <div className={styles.selectedText}>
                <strong>{selectedItem.title}</strong>
                <small>{selectedItem.mediaUrl}</small>
              </div>
            </>
          ) : (
            <span className={styles.tip}>{emptyText}</span>
          )}
        </div>

        <details className={styles.thumbPicker}>
          <summary>{detailsTitle}</summary>
          {visibleCandidates.length === 0 ? (
            <p className={styles.tip}>该板块暂无可选素材。先在「1.作品管理」里给作品勾选对应板块。</p>
          ) : (
            <div className={styles.thumbGrid}>
              {visibleCandidates.slice(0, 60).map((item) => (
                <button
                  key={`thumb-${pickerKey}-${item.id}`}
                  type="button"
                  className={`${styles.thumbItem} ${
                    selectedItem && toStringSafe(selectedItem.id) === toStringSafe(item.id)
                      ? styles.thumbItemActive
                      : ""
                  }`}
                  onClick={() => onChange(toStringSafe(item.mediaUrl))}
                >
                  {renderMiniPreview(item, styles.thumbImage)}
                  <span className={styles.thumbName}>{item.title}</span>
                </button>
              ))}
            </div>
          )}
        </details>
      </div>
    );
  };

  const renderOrderedWorkPicker = ({
    pickerKey,
    label,
    tagId,
    acceptedTypes = ["image"],
    values,
    onChange,
    detailsTitle = "展开素材列表",
  }) => {
    const orderedIds = unique(toArray(values).map((id) => toStringSafe(id)).filter(Boolean));
    const candidates = getCandidates(tagId, acceptedTypes);
    const candidateSet = new Set(candidates.map((item) => toStringSafe(item.id)));
    const selectedIds = orderedIds.filter((id) => candidateSet.has(id) || itemMapById.has(id));
    const keyword = getPickerKeyword(pickerKey);

    const visibleCandidates = candidates.filter((item) => {
      if (!keyword) return true;
      const hay = `${toStringSafe(item.title)} ${toStringSafe(item.mediaUrl)}`.toLowerCase();
      return hay.includes(keyword);
    });

    const toggleId = (id) => {
      const exists = selectedIds.includes(id);
      if (exists) {
        onChange(selectedIds.filter((currentId) => currentId !== id));
      } else {
        onChange([...selectedIds, id]);
      }
    };

    const moveItem = (index, direction) => {
      const target = index + direction;
      if (target < 0 || target >= selectedIds.length) return;
      const next = [...selectedIds];
      [next[index], next[target]] = [next[target], next[index]];
      onChange(next);
    };

    return (
      <div className={styles.fieldBlock}>
        <label className={styles.fieldLabel}>{label}</label>
        <div className={styles.selectedList}>
          {selectedIds.length === 0 ? (
            <p className={styles.tip}>当前未勾选素材。</p>
          ) : (
            selectedIds.map((id, index) => {
              const item = itemMapById.get(id);
              if (!item) return null;
              return (
                <div key={`${pickerKey}-selected-${id}`} className={styles.selectedRow}>
                  <span className={styles.orderIndex}>{index + 1}</span>
                  {renderMiniPreview(item)}
                  <div className={styles.selectedText}>
                    <strong>{item.title}</strong>
                    <small>{MEDIA_TYPE_LABELS[item.mediaType]}</small>
                  </div>
                  <div className={styles.rowActions}>
                    <button type="button" className={styles.iconBtn} onClick={() => moveItem(index, -1)}>
                      上
                    </button>
                    <button type="button" className={styles.iconBtn} onClick={() => moveItem(index, 1)}>
                      下
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => onChange(selectedIds.filter((currentId) => currentId !== id))}
                    >
                      删
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <details className={styles.thumbPicker}>
          <summary>{detailsTitle}</summary>
          <input
            className={styles.searchInput}
            placeholder="搜索素材"
            value={toStringSafe(pickerQuery[pickerKey])}
            onChange={(event) => updatePickerKeyword(pickerKey, event.target.value)}
          />
          {visibleCandidates.length === 0 ? (
            <p className={styles.tip}>该板块暂无素材，请先到「1.作品管理」上传并勾选对应板块。</p>
          ) : (
            <div className={styles.candidateList}>
              {visibleCandidates.map((item) => {
                const checked = selectedIds.includes(toStringSafe(item.id));
                return (
                  <label key={`${pickerKey}-candidate-${item.id}`} className={styles.candidateRow}>
                    <input type="checkbox" checked={checked} onChange={() => toggleId(toStringSafe(item.id))} />
                    {renderMiniPreview(item)}
                    <span className={styles.candidateText}>
                      {item.title}
                      <small>{MEDIA_TYPE_LABELS[item.mediaType]}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </details>
      </div>
    );
  };

  const renderWorkTags = (tags) => {
    const safeTags = normalizeTags(tags);
    const displayTags = unique(
      safeTags.map((tag) => (tag === "personalBook" ? "personalLibrary" : tag))
    );
    if (displayTags.length === 0) return <span className={styles.tagGhost}>未分配板块</span>;
    return displayTags.map((tag) => (
      <span key={`tag-${tag}`} className={styles.tagPill}>
        {TAG_LABELS[tag] || tag}
      </span>
    ));
  };

  const renderWorksPanel = () => (
    <div className={styles.workLayout}>
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h3>{editingId ? "编辑作品" : "新建作品"}</h3>
          <p>本地上传后直接进入作品列表。无需单独素材库。</p>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.fieldLabel}>标题</label>
          <input
            className={styles.input}
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />

          <label className={styles.fieldLabel}>描述</label>
          <textarea
            className={styles.textarea}
            rows={3}
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />

          <div className={styles.gridTwo}>
            <div>
              <label className={styles.fieldLabel}>媒体类型</label>
              <select
                className={styles.input}
                value={form.mediaType}
                onChange={(event) => setForm((prev) => ({ ...prev, mediaType: event.target.value }))}
              >
                <option value="image">图片</option>
                <option value="video">视频</option>
                <option value="audio">音频</option>
              </select>
            </div>
            <div>
              <label className={styles.fieldLabel}>日期</label>
              <input
                className={styles.input}
                type="date"
                value={form.date}
                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
              />
            </div>
          </div>

          <label className={styles.fieldLabel}>所属板块（可多选）</label>
          <div className={styles.tagSelector}>
            {WORK_TAGS.map((tag) => {
              const active = toArray(form.tags).includes(tag.id);
              return (
                <button
                  key={`form-tag-${tag.id}`}
                  type="button"
                  className={`${styles.tagToggle} ${active ? styles.tagToggleActive : ""}`}
                  onClick={() =>
                    setForm((prev) => {
                      const tags = toArray(prev.tags);
                      return {
                        ...prev,
                        tags: tags.includes(tag.id) ? tags.filter((id) => id !== tag.id) : [...tags, tag.id],
                      };
                    })
                  }
                >
                  {tag.label}
                </button>
              );
            })}
          </div>

          <label className={styles.fieldLabel}>从本地选择文件</label>
          <input ref={fileInputRef} className={styles.input} type="file" accept="image/*,video/*,audio/*" onChange={handleMediaChange} />

          <div className={styles.uploadPreview}>
            {previewUrl ? renderMiniPreview({ mediaUrl: previewUrl, mediaType: form.mediaType, thumbUrl: previewUrl }, styles.uploadPreviewMedia) : <span className={styles.tip}>未选择文件</span>}
          </div>

          {message ? <p className={styles.message}>{message}</p> : null}
          <div className={styles.inlineActions}>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? "保存中..." : editingId ? "更新作品" : "上传作品"}
            </button>
            {editingId ? (
              <button type="button" className={styles.ghostBtn} onClick={resetWorkForm}>
                取消编辑
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h3>已上传作品</h3>
          <p>支持搜索、筛选、编辑和删除。</p>
        </div>
        <div className={styles.toolbar}>
          <input
            className={styles.searchInput}
            placeholder="搜索标题/描述/地址"
            value={workQuery}
            onChange={(event) => setWorkQuery(event.target.value)}
          />
          <select className={styles.input} value={workTagFilter} onChange={(event) => setWorkTagFilter(event.target.value)}>
            <option value="all">全部板块</option>
            {WORK_TAGS.map((tag) => (
              <option key={`filter-${tag.id}`} value={tag.id}>
                {tag.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.workList}>
          {filteredWorks.length === 0 ? (
            <p className={styles.tip}>没有符合条件的作品。</p>
          ) : (
            filteredWorks.map((item) => (
              <div key={`work-${item.id}`} className={styles.workRow}>
                {renderMiniPreview(item)}
                <div className={styles.workText}>
                  <strong>{item.title}</strong>
                  <small>{item.description || "无描述"}</small>
                  <div className={styles.tagRow}>{renderWorkTags(item.categories)}</div>
                </div>
                <div className={styles.rowActions}>
                  <button type="button" className={styles.iconBtn} onClick={() => startEditWork(item)}>
                    编辑
                  </button>
                  <button type="button" className={styles.iconBtnDanger} onClick={() => deleteWork(item.id)}>
                    删除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );

  const ringIds = toArray(config?.home?.ring?.selectedWorkIds).map((id) => toStringSafe(id));

  const renderHomePanel = () => (
    <div className={styles.stack}>
      <details className={styles.card} open>
        <summary className={styles.sectionSummary}>圆环图片（2.1）</summary>
        {renderOrderedWorkPicker({
          pickerKey: "home-ring",
          label: "勾选并排序圆环素材（只显示勾选了 2.1 标签的图片）",
          tagId: "home",
          acceptedTypes: ["image"],
          values: ringIds,
          onChange: (ids) => updateConfigPath(["home", "ring", "selectedWorkIds"], ids),
          detailsTitle: "展开缩略图勾选",
        })}
      </details>

      <details className={styles.card} open>
        <summary className={styles.sectionSummary}>AI 文案</summary>
        <div className={styles.form}>
          <label className={styles.fieldLabel}>系统提示词</label>
          <textarea
            className={styles.textarea}
            rows={6}
            value={toStringSafe(config?.home?.ai?.systemPrompt)}
            onChange={(event) => updateConfigPath(["home", "ai", "systemPrompt"], event.target.value)}
          />

          <label className={styles.fieldLabel}>离线提示</label>
          <textarea
            className={styles.textarea}
            rows={3}
            value={toStringSafe(config?.home?.ai?.offlineMessage)}
            onChange={(event) => updateConfigPath(["home", "ai", "offlineMessage"], event.target.value)}
          />

          <label className={styles.fieldLabel}>输入框占位文案</label>
          <input
            className={styles.input}
            value={toStringSafe(config?.home?.ai?.inputPlaceholder)}
            onChange={(event) => updateConfigPath(["home", "ai", "inputPlaceholder"], event.target.value)}
          />
        </div>
      </details>
    </div>
  );

  const renderCommercialPanel = () => {
    const navItems = toArray(config?.commercialDesign?.navItems);
    const sections = toObject(config?.commercialDesign?.sections);
    const project =
      COMMERCIAL_PROJECTS.find((item) => item.sectionKey === activeCommercialSection) ||
      COMMERCIAL_PROJECTS[0];
    const sectionData = toObject(sections?.[project.sectionKey]);
    const currentLayout =
      toStringSafe(sectionData.layoutType) ||
      (project.slots.length > 1 ? "split" : "single");
    const navIndex = navItems.findIndex((item) => toStringSafe(item?.id) === project.navId);
    const projectName =
      navIndex >= 0
        ? toStringSafe(navItems[navIndex]?.label)
        : project.fallbackName;
    const commercialCandidates = getCandidates("commercial", ["image", "video"]);

    const setProjectName = (value) => {
      const nextValue = toStringSafe(value);
      if (navIndex >= 0) {
        updateConfigPath(["commercialDesign", "navItems", navIndex, "label"], nextValue);
        return;
      }
      updateConfigPath(["commercialDesign", "navItems"], [
        ...navItems,
        { id: project.navId, label: nextValue || project.fallbackName },
      ]);
    };

    const applyLayoutPreset = (presetId) => {
      setConfig((prev) => {
        const next = structuredClone(prev);
        const section = toObject(next?.commercialDesign?.sections?.[project.sectionKey]);
        const styles = getCommercialStylePreset(project.slots.length, presetId);
        section.layoutType = presetId;
        project.slots.forEach((slot, slotIndex) => {
          const currentStyle = toObject(section?.[slot.styleKey]);
          section[slot.styleKey] = {
            ...currentStyle,
            ...toObject(styles[slotIndex]),
          };
        });
        next.commercialDesign.sections[project.sectionKey] = section;
        return next;
      });
    };

    const previewSlots = project.slots.map((slot, index) => {
      const item = itemMapByUrl.get(toStringSafe(sectionData?.[slot.urlKey]));
      const style = toObject(sectionData?.[slot.styleKey]);
      const width = Number.parseFloat(toStringSafe(style.width));
      const widthRatio = Number.isFinite(width) ? Math.max(20, Math.min(100, width)) : project.slots.length > 1 ? 50 : 88;
      return {
        slot,
        item,
        widthRatio,
        index,
      };
    });

    return (
      <div className={styles.stack}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>项目切换编辑</h3>
            <p>左侧切项目，右侧只编辑当前项目，不再整页堆叠。</p>
          </div>
          <div className={styles.commercialEditorLayout}>
            <aside className={styles.projectSwitch}>
              {COMMERCIAL_PROJECTS.map((item, idx) => {
                const index = navItems.findIndex((nav) => toStringSafe(nav?.id) === item.navId);
                const label = index >= 0 ? toStringSafe(navItems[index]?.label) : item.fallbackName;
                const active = item.sectionKey === project.sectionKey;
                return (
                  <button
                    key={`commercial-project-${item.sectionKey}`}
                    type="button"
                    className={`${styles.projectSwitchBtn} ${active ? styles.projectSwitchBtnActive : ""}`}
                    onClick={() => setActiveCommercialSection(item.sectionKey)}
                  >
                    <span>项目 {idx + 1}</span>
                    <strong>{label}</strong>
                  </button>
                );
              })}
            </aside>

            <div className={styles.projectEditorMain}>
              <div className={styles.gridTwo}>
                <label className={styles.fieldBlock}>
                  <span className={styles.fieldLabel}>项目名称（同步左侧导航）</span>
                  <input className={styles.input} value={projectName} onChange={(event) => setProjectName(event.target.value)} />
                </label>
                <label className={styles.fieldBlock}>
                  <span className={styles.fieldLabel}>当前布局</span>
                  <input className={styles.input} value={currentLayout} readOnly />
                </label>
              </div>

              <div className={styles.layoutPresetGrid}>
                {COMMERCIAL_LAYOUT_PRESETS.map((preset) => (
                  <button
                    key={`layout-${preset.id}`}
                    type="button"
                    className={`${styles.layoutPresetBtn} ${currentLayout === preset.id ? styles.layoutPresetBtnActive : ""}`}
                    onClick={() => applyLayoutPreset(preset.id)}
                  >
                    <div className={`${styles.layoutPresetSketch} ${styles[`layoutPresetSketch_${preset.id}`]}`}>
                      <span />
                      <span />
                    </div>
                    <small>{preset.label}</small>
                  </button>
                ))}
              </div>

              <div className={`${styles.layoutPreviewBoard} ${styles[`layoutPreviewBoard_${currentLayout}`]}`}>
                {previewSlots.map((entry) => (
                  <div
                    key={`preview-${entry.slot.id}`}
                    className={styles.layoutPreviewSlot}
                    style={{ width: `${entry.widthRatio}%` }}
                  >
                    {entry.item ? renderMiniPreview(entry.item, styles.layoutPreviewMedia) : <span className={styles.tip}>未选素材</span>}
                    <small>{entry.slot.label}</small>
                  </div>
                ))}
              </div>

              <div className={styles.tableList}>
                {project.slots.map((slot, slotIndex) => {
                  const currentUrl = toStringSafe(sectionData?.[slot.urlKey]);
                  const styleData = toObject(sectionData?.[slot.styleKey]);
                  return (
                    <div key={`slot-${project.sectionKey}-${slot.urlKey}`} className={styles.compactBlock}>
                      {renderSingleWorkPicker({
                        pickerKey: `commercial-${project.sectionKey}-${slot.urlKey}`,
                        label: slot.label,
                        tagId: "commercial",
                        acceptedTypes: ["image", "video"],
                        value: currentUrl,
                        onChange: (url) => {
                          updateConfigPath(["commercialDesign", "sections", project.sectionKey, slot.urlKey], url);
                          const fallbackIndex = commercialCandidates.findIndex(
                            (item) => toStringSafe(item.mediaUrl) === toStringSafe(url)
                          );
                          if (slot.indexKey) {
                            updateConfigPath(
                              ["commercialDesign", "sections", project.sectionKey, slot.indexKey],
                              fallbackIndex >= 0 ? fallbackIndex : slotIndex
                            );
                          }
                        },
                        emptyText: "未绑定媒体",
                        detailsTitle: "展开可选媒体",
                      })}

                      <div className={styles.compactStyleRow}>
                        <label className={styles.fieldBlock}>
                          <span className={styles.fieldLabel}>宽度</span>
                          <input
                            className={styles.input}
                            placeholder="例如 50%"
                            value={toStringSafe(styleData.width)}
                            onChange={(event) =>
                              updateConfigPath(
                                ["commercialDesign", "sections", project.sectionKey, slot.styleKey, "width"],
                                event.target.value
                              )
                            }
                          />
                          <input
                            className={styles.rangeInput}
                            type="range"
                            min={20}
                            max={100}
                            value={Math.max(20, Math.min(100, toNumberSafe(parseFloat(toStringSafe(styleData.width)), 50)))}
                            onChange={(event) =>
                              updateConfigPath(
                                ["commercialDesign", "sections", project.sectionKey, slot.styleKey, "width"],
                                `${event.target.value}%`
                              )
                            }
                          />
                        </label>
                        <label className={styles.fieldBlock}>
                          <span className={styles.fieldLabel}>高度</span>
                          <input
                            className={styles.input}
                            placeholder="例如 100%"
                            value={toStringSafe(styleData.height)}
                            onChange={(event) =>
                              updateConfigPath(
                                ["commercialDesign", "sections", project.sectionKey, slot.styleKey, "height"],
                                event.target.value
                              )
                            }
                          />
                        </label>
                        <label className={styles.fieldBlock}>
                          <span className={styles.fieldLabel}>位置</span>
                          <input
                            className={styles.input}
                            placeholder="例如 center center"
                            value={toStringSafe(styleData.objectPosition)}
                            onChange={(event) =>
                              updateConfigPath(
                                ["commercialDesign", "sections", project.sectionKey, slot.styleKey, "objectPosition"],
                                event.target.value
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  };

  const renderPersonalLibraryPanel = () => {
    const book = toObject(config?.personalDesign?.library?.book);
    const fallingImages = toArray(config?.personalDesign?.library?.fallingImages);

    const selectedFallingIds = fallingImages
      .map((item) => itemMapByUrl.get(toStringSafe(item?.src))?.id)
      .filter(Boolean)
      .map((id) => toStringSafe(id));

    const updateFallingByIds = (ids) => {
      const previousBySrc = new Map(
        fallingImages.map((item) => [toStringSafe(item?.src), item])
      );
      const next = ids
        .map((id, idx) => {
          const work = itemMapById.get(id);
          if (!work) return null;
          const prev = previousBySrc.get(toStringSafe(work.mediaUrl));
          return {
            src: toStringSafe(work.mediaUrl),
            rotate: toNumberSafe(prev?.rotate, idx % 2 === 0 ? 270 : 0),
            width: toNumberSafe(prev?.width, 1279),
            height: toNumberSafe(prev?.height, 1706),
          };
        })
        .filter(Boolean);
      updateConfigPath(["personalDesign", "library", "fallingImages"], next);
    };

    return (
      <div className={styles.stack}>
        <details className={styles.card} open>
          <summary className={styles.sectionSummary}>书籍基础信息</summary>
          <div className={styles.gridTwo}>
            <label className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>标题</span>
              <input
                className={styles.input}
                value={toStringSafe(book?.title)}
                onChange={(event) => updateConfigPath(["personalDesign", "library", "book", "title"], event.target.value)}
              />
            </label>
            <label className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>类型</span>
              <input
                className={styles.input}
                value={toStringSafe(book?.type)}
                onChange={(event) => updateConfigPath(["personalDesign", "library", "book", "type"], event.target.value)}
              />
            </label>
            <label className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>尺寸</span>
              <input
                className={styles.input}
                value={toStringSafe(book?.size)}
                onChange={(event) => updateConfigPath(["personalDesign", "library", "book", "size"], event.target.value)}
              />
            </label>
            <label className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>年份</span>
              <input
                className={styles.input}
                value={toStringSafe(book?.year)}
                onChange={(event) => updateConfigPath(["personalDesign", "library", "book", "year"], event.target.value)}
              />
            </label>
            <label className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>打开链接</span>
              <input
                className={styles.input}
                value={toStringSafe(book?.href)}
                onChange={(event) => updateConfigPath(["personalDesign", "library", "book", "href"], event.target.value)}
              />
            </label>
            <label className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>按钮文案</span>
              <input
                className={styles.input}
                value={toStringSafe(book?.openLabel)}
                onChange={(event) => updateConfigPath(["personalDesign", "library", "book", "openLabel"], event.target.value)}
              />
            </label>
          </div>

          {renderSingleWorkPicker({
            pickerKey: "personal-library-cover",
            label: "封面图片",
            tagId: "personalLibrary",
            acceptedTypes: ["image"],
            value: toStringSafe(book?.coverUrl),
            onChange: (url) => updateConfigPath(["personalDesign", "library", "book", "coverUrl"], url),
            emptyText: "未设置封面",
            detailsTitle: "展开封面缩略图",
          })}
        </details>

        <details className={styles.card} open>
          <summary className={styles.sectionSummary}>飘落素材（高密度选择）</summary>
          {renderOrderedWorkPicker({
            pickerKey: "personal-library-falling",
            label: "勾选并排序飘落图片",
            tagId: "personalLibrary",
            acceptedTypes: ["image"],
            values: selectedFallingIds,
            onChange: updateFallingByIds,
            detailsTitle: "展开图片列表",
          })}

          <div className={styles.tableList}>
            {fallingImages.map((item, index) => (
              <div key={`falling-${index}-${item.src}`} className={styles.tableRow}>
                <span className={styles.fixedCell}>图 {index + 1}</span>
                {renderMiniPreview(itemMapByUrl.get(toStringSafe(item.src)) || { mediaUrl: item.src, mediaType: "image" })}
                <select
                  className={styles.input}
                  value={toNumberSafe(item.rotate, 0)}
                  onChange={(event) =>
                    updateConfigPath(
                      ["personalDesign", "library", "fallingImages", index, "rotate"],
                      toNumberSafe(event.target.value, 0)
                    )
                  }
                >
                  <option value={0}>旋转 0°</option>
                  <option value={90}>旋转 90°</option>
                  <option value={180}>旋转 180°</option>
                  <option value={270}>旋转 270°</option>
                </select>
              </div>
            ))}
          </div>
        </details>

        <details className={styles.card} open>
          <summary className={styles.sectionSummary}>右侧文案与版权</summary>
          <div className={styles.gridTwo}>
            <label className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>右侧文案第 1 行</span>
              <input
                className={styles.input}
                value={toStringSafe(config?.personalDesign?.library?.rightNote?.[0])}
                onChange={(event) => updateConfigPath(["personalDesign", "library", "rightNote", 0], event.target.value)}
              />
            </label>
            <label className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>右侧文案第 2 行</span>
              <input
                className={styles.input}
                value={toStringSafe(config?.personalDesign?.library?.rightNote?.[1])}
                onChange={(event) => updateConfigPath(["personalDesign", "library", "rightNote", 1], event.target.value)}
              />
            </label>
          </div>
          <label className={styles.fieldBlock}>
            <span className={styles.fieldLabel}>左下角版权文案</span>
            <input
              className={styles.input}
              value={toStringSafe(config?.personalDesign?.library?.leftCopyright)}
              onChange={(event) => updateConfigPath(["personalDesign", "library", "leftCopyright"], event.target.value)}
            />
          </label>
        </details>

        {renderPersonalBookPanel()}
      </div>
    );
  };

  const deriveIdsFromBookPages = () => {
    const pages = toArray(config?.personalDesign?.book2019?.pages);
    const ids = [];
    pages.forEach((page) => {
      const frontUrl = toStringSafe(page?.front?.background);
      const backUrl = toStringSafe(page?.back?.background);
      if (frontUrl && itemMapByUrl.get(frontUrl)) ids.push(toStringSafe(itemMapByUrl.get(frontUrl).id));
      if (backUrl && itemMapByUrl.get(backUrl)) ids.push(toStringSafe(itemMapByUrl.get(backUrl).id));
    });
    return unique(ids);
  };

  const renderPersonalBookPanel = () => {
    const explicitIds = toArray(config?.personalDesign?.book2019?.pageWorkIds).map((id) => toStringSafe(id));
    const pageWorkIds = explicitIds.length > 0 ? explicitIds : deriveIdsFromBookPages();
    const projects = toArray(config?.personalDesign?.book2019?.projects);

    const orderedItems = pageWorkIds
      .map((id) => itemMapById.get(id))
      .filter(Boolean);

    const spreads = [];
    for (let i = 0; i < orderedItems.length; i += 2) {
      spreads.push({
        left: orderedItems[i] || null,
        right: orderedItems[i + 1] || null,
        spread: Math.floor(i / 2) + 1,
      });
    }

    return (
      <>
        <details className={styles.card}>
          <summary className={styles.sectionSummary}>2.3.1 当前册子：页面图片顺序（第几页用哪张）</summary>
          {renderOrderedWorkPicker({
            pickerKey: "personal-book-pages",
            label: "勾选并排序页面图片",
            tagId: "personalLibrary",
            acceptedTypes: ["image"],
            values: pageWorkIds,
            onChange: (ids) => updateConfigPath(["personalDesign", "book2019", "pageWorkIds"], ids),
            detailsTitle: "展开页面素材列表",
          })}

          <div className={styles.tableList}>
            {spreads.length === 0 ? (
              <p className={styles.tip}>还没有页面素材。先在作品管理上传并勾选 2.3 类目。</p>
            ) : (
              spreads.map((spread) => (
                <div key={`spread-${spread.spread}`} className={styles.spreadRow}>
                  <span className={styles.fixedCell}>跨页 {spread.spread}</span>
                  <div className={styles.spreadCell}>
                    {spread.left ? renderMiniPreview(spread.left) : <span className={styles.tip}>空</span>}
                    <small>{spread.left?.title || "左页空"}</small>
                  </div>
                  <div className={styles.spreadCell}>
                    {spread.right ? renderMiniPreview(spread.right) : <span className={styles.tip}>空</span>}
                    <small>{spread.right?.title || "右页空"}</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </details>

        <details className={styles.card}>
          <summary className={styles.sectionSummary}>2.3.1 当前册子：项目范围</summary>
          <div className={styles.tableList}>
            {projects.map((project, index) => (
              <div key={`project-${index}`} className={styles.tableRow}>
                <input
                  className={styles.smallInput}
                  type="number"
                  value={toNumberSafe(project?.start, index * 2 + 1)}
                  onChange={(event) =>
                    updateConfigPath(
                      ["personalDesign", "book2019", "projects", index, "start"],
                      toNumberSafe(event.target.value, index * 2 + 1)
                    )
                  }
                />
                <input
                  className={styles.smallInput}
                  type="number"
                  value={toNumberSafe(project?.end, index * 2 + 2)}
                  onChange={(event) =>
                    updateConfigPath(
                      ["personalDesign", "book2019", "projects", index, "end"],
                      toNumberSafe(event.target.value, index * 2 + 2)
                    )
                  }
                />
                <input
                  className={styles.input}
                  value={toStringSafe(project?.name)}
                  onChange={(event) =>
                    updateConfigPath(["personalDesign", "book2019", "projects", index, "name"], event.target.value)
                  }
                />
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => {
                    const next = projects.filter((_, row) => row !== index);
                    updateConfigPath(["personalDesign", "book2019", "projects"], next);
                  }}
                >
                  删
                </button>
              </div>
            ))}
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() =>
                updateConfigPath(["personalDesign", "book2019", "projects"], [
                  ...projects,
                  { start: projects.length * 2 + 1, end: projects.length * 2 + 2, name: `Project ${projects.length + 1}` },
                ])
              }
            >
              新增项目范围
            </button>
          </div>
        </details>
      </>
    );
  };

  const renderBioPanel = () => {
    const meta = toArray(config?.bio?.meta);
    return (
      <div className={styles.stack}>
        <details className={styles.card} open>
          <summary className={styles.sectionSummary}>基础信息</summary>
          {renderSingleWorkPicker({
            pickerKey: "bio-photo",
            label: "头像图片",
            tagId: "bio",
            acceptedTypes: ["image"],
            value: toStringSafe(config?.bio?.photoUrl),
            onChange: (url) => updateConfigPath(["bio", "photoUrl"], url),
            emptyText: "未设置头像",
            detailsTitle: "展开头像素材",
          })}

          <div className={styles.form}>
            <label className={styles.fieldLabel}>副标题</label>
            <input
              className={styles.input}
              value={toStringSafe(config?.bio?.kicker)}
              onChange={(event) => updateConfigPath(["bio", "kicker"], event.target.value)}
            />
            <label className={styles.fieldLabel}>主标题</label>
            <textarea
              className={styles.textarea}
              rows={3}
              value={toStringSafe(config?.bio?.title)}
              onChange={(event) => updateConfigPath(["bio", "title"], event.target.value)}
            />
            <label className={styles.fieldLabel}>简介</label>
            <textarea
              className={styles.textarea}
              rows={3}
              value={toStringSafe(config?.bio?.lead)}
              onChange={(event) => updateConfigPath(["bio", "lead"], event.target.value)}
            />
          </div>
        </details>

        <details className={styles.card}>
          <summary className={styles.sectionSummary}>Meta 信息（可收起）</summary>
          <div className={styles.tableList}>
            {meta.map((row, index) => (
              <div key={`meta-${index}`} className={styles.tableRow}>
                <input
                  className={styles.input}
                  placeholder="字段名"
                  value={toStringSafe(row?.label)}
                  onChange={(event) => updateConfigPath(["bio", "meta", index, "label"], event.target.value)}
                />
                <input
                  className={styles.input}
                  placeholder="内容"
                  value={toStringSafe(row?.value)}
                  onChange={(event) => updateConfigPath(["bio", "meta", index, "value"], event.target.value)}
                />
                <input
                  className={styles.input}
                  placeholder="链接（可空）"
                  value={toStringSafe(row?.href)}
                  onChange={(event) => updateConfigPath(["bio", "meta", index, "href"], event.target.value)}
                />
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => updateConfigPath(["bio", "meta"], meta.filter((_, rowIndex) => rowIndex !== index))}
                >
                  删
                </button>
              </div>
            ))}
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={() => updateConfigPath(["bio", "meta"], [...meta, { label: "", value: "", href: "" }])}
            >
              新增 Meta
            </button>
          </div>
        </details>

        <details className={styles.card}>
          <summary className={styles.sectionSummary}>列表信息（每行一条，可收起）</summary>
          <div className={styles.gridTwo}>
            <label className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>About 段落</span>
              <textarea
                className={styles.textarea}
                rows={5}
                value={textListToMultiline(config?.bio?.aboutParagraphs)}
                onChange={(event) => updateConfigPath(["bio", "aboutParagraphs"], multilineToTextList(event.target.value))}
              />
            </label>
            <label className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>Services</span>
              <textarea
                className={styles.textarea}
                rows={5}
                value={textListToMultiline(config?.bio?.services)}
                onChange={(event) => updateConfigPath(["bio", "services"], multilineToTextList(event.target.value))}
              />
            </label>
            <label className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>Collaborators</span>
              <textarea
                className={styles.textarea}
                rows={5}
                value={textListToMultiline(config?.bio?.collaborators)}
                onChange={(event) => updateConfigPath(["bio", "collaborators"], multilineToTextList(event.target.value))}
              />
            </label>
            <label className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>项目经验</span>
              <textarea
                className={styles.textarea}
                rows={5}
                value={textListToMultiline(config?.bio?.projectExperience)}
                onChange={(event) => updateConfigPath(["bio", "projectExperience"], multilineToTextList(event.target.value))}
              />
            </label>
          </div>
          <label className={styles.fieldBlock}>
            <span className={styles.fieldLabel}>工作经验</span>
            <textarea
              className={styles.textarea}
              rows={4}
              value={textListToMultiline(config?.bio?.workExperience)}
              onChange={(event) => updateConfigPath(["bio", "workExperience"], multilineToTextList(event.target.value))}
            />
          </label>
        </details>
      </div>
    );
  };

  const renderActivePanel = () => {
    if (activePanel === "works") return renderWorksPanel();
    if (activePanel === "home") return renderHomePanel();
    if (activePanel === "commercial") return renderCommercialPanel();
    if (activePanel === "personalLibrary") return renderPersonalLibraryPanel();
    if (activePanel === "bio") return renderBioPanel();
    return null;
  };

  const panelMeta = PANEL_ITEMS.find((panel) => panel.key === activePanel) || PANEL_ITEMS[0];

  return (
    <div className={styles.page}>
      <div className={styles.adminBody}>
        <aside className={styles.sideNav}>
          <h2>Admin 管理面板</h2>
          <div className={styles.sideNavList}>
            {PANEL_ITEMS.map((item) => (
              <button
                key={`panel-${item.key}`}
                type="button"
                className={`${styles.sideNavBtn} ${activePanel === item.key ? styles.sideNavBtnActive : ""}`}
                onClick={() => setActivePanel(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Link href="/" className={styles.backLink}>
            返回前台
          </Link>
        </aside>

        <main className={styles.mainPane}>
          <div className={styles.panelHeader}>
            <div>
              <h1>{panelMeta.label}</h1>
              <p>{panelMeta.hint}</p>
            </div>
            <div className={styles.inlineActions}>
              <button type="button" className={styles.submitBtn} onClick={saveContent} disabled={contentLoading || !hasUnsavedChanges}>
                {contentLoading ? "保存中..." : "保存配置"}
              </button>
              <button type="button" className={styles.ghostBtn} onClick={resetContent} disabled={contentLoading || !hasUnsavedChanges}>
                撤销未保存
              </button>
            </div>
          </div>
          {contentMessage ? <p className={styles.message}>{contentMessage}</p> : null}
          <section className={styles.panelSection}>{renderActivePanel()}</section>
        </main>
      </div>
    </div>
  );
}
