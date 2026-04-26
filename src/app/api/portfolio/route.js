import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { writeFile } from "fs/promises";
import { createHash } from "crypto";

const dataFilePath = path.join(process.cwd(), "src", "data", "portfolio.json");
const PUBLIC_ROOT = path.join(process.cwd(), "public");
const IMAGE_ROOT = path.join(PUBLIC_ROOT, "media", "images");
const FALLBACK_THUMB_URL = "/media/images/placeholder1.jpg";
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif"]);

const WORK_TAG_IDS = ["home", "commercial", "personalLibrary", "personalBook", "bio"];

const LEGACY_TO_TAGS = {
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

const TAG_TO_LEGACY = {
  home: "home ai / ring",
  commercial: "commercial design",
  personalLibrary: "design archive",
  personalBook: "design archive",
  bio: "bio",
};

const sanitizeText = (value) => (typeof value === "string" ? value.trim() : "");
const unique = (list) => Array.from(new Set(list));
const sanitizeUrl = (value) => (typeof value === "string" ? value.trim() : "");
const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));
const isInvalidUrl = (value) =>
  !value || value === "." || value === "/." || value.endsWith("/.");

const normalizeMediaType = (value) => {
  const text = sanitizeText(value).toLowerCase();
  if (text === "video" || text === "audio" || text === "image") return text;
  return "image";
};

const inferTagsFromMediaUrl = (mediaUrl) => {
  const safe = sanitizeUrl(mediaUrl).toLowerCase();
  if (!safe) return [];

  if (
    safe.includes("/media/images/commercial-design/") ||
    safe.includes("/media/images/commercialdesign/")
  ) {
    return ["commercial"];
  }

  if (
    safe.includes("/media/images/design-archive/work2019-2024/") ||
    safe.includes("/media/images/designarchive/work2019-2024/")
  ) {
    return ["personalLibrary", "personalBook"];
  }

  if (
    safe.includes("/media/images/design-archive/") ||
    safe.includes("/media/images/designarchive/")
  ) {
    return ["personalLibrary", "personalBook"];
  }

  return [];
};

const normalizeTags = (rawCategories, rawCategory, mediaUrl = "") => {
  const source = [];
  if (Array.isArray(rawCategories)) source.push(...rawCategories);
  if (typeof rawCategories === "string") source.push(...rawCategories.split(","));
  if (typeof rawCategory === "string" && rawCategory.trim()) source.push(rawCategory.trim());

  const normalized = source
    .flatMap((value) => {
      const text = sanitizeText(value);
      if (!text) return [];
      if (WORK_TAG_IDS.includes(text)) return [text];
      const mapped = LEGACY_TO_TAGS[text.toLowerCase()];
      if (mapped) return mapped;
      return [];
    })
    .filter((tag) => WORK_TAG_IDS.includes(tag));

  const uniqueTags = unique(normalized);
  if (uniqueTags.length > 0) return uniqueTags;
  return unique(inferTagsFromMediaUrl(mediaUrl));
};

const pickLegacyCategory = (tags, fallbackValue) => {
  for (const tag of tags) {
    if (TAG_TO_LEGACY[tag]) return TAG_TO_LEGACY[tag];
  }
  const fallback = sanitizeText(fallbackValue);
  return fallback || "uncategorized";
};

const inferTitleFromMediaUrl = (mediaUrl) => {
  const safe = sanitizeUrl(mediaUrl);
  const file = safe.split("/").pop() || "";
  const base = file.replace(/\.[^.]+$/, "");
  const title = base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return title || "Untitled";
};

const normalizeRingAspect = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0.9;
  return clampNumber(parsed, 0.45, 2.2);
};

const normalizeRingCrop = (value) => {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const focusX = Number(source.focusX);
  const focusY = Number(source.focusY);
  const zoom = Number(source.zoom);

  return {
    focusX: Number.isFinite(focusX) ? clampNumber(focusX, 0, 1) : 0.5,
    focusY: Number.isFinite(focusY) ? clampNumber(focusY, 0, 1) : 0.5,
    zoom: Number.isFinite(zoom) ? clampNumber(zoom, 1, 3) : 1,
  };
};

const normalizeItemRecord = (item = {}) => {
  const mediaType = normalizeMediaType(item.mediaType);
  const mediaUrl = sanitizeUrl(item.mediaUrl);
  const tags = normalizeTags(item.categories, item.category, mediaUrl);
  const thumbCandidate = sanitizeUrl(item.thumbUrl);
  const thumbUrl = !isInvalidUrl(thumbCandidate)
    ? thumbCandidate
    : mediaType === "image" && !isInvalidUrl(mediaUrl)
      ? mediaUrl
      : FALLBACK_THUMB_URL;

  return {
    id: String(item.id || Date.now()),
    title: sanitizeText(item.title) || inferTitleFromMediaUrl(mediaUrl),
    category: pickLegacyCategory(tags, item.category),
    categories: tags,
    description: sanitizeText(item.description),
    date: sanitizeText(item.date),
    mediaType,
    mediaUrl,
    thumbUrl,
    ringAspect: normalizeRingAspect(item.ringAspect),
    ringCrop: normalizeRingCrop(item.ringCrop),
  };
};

const readStoredItems = async () => {
  try {
    const fileContents = await fs.readFile(dataFilePath, "utf8");
    const normalized = fileContents.replace(/^\uFEFF/, "");
    const parsed = JSON.parse(normalized);
    return Array.isArray(parsed) ? parsed.map(normalizeItemRecord) : [];
  } catch {
    return [];
  }
};

const writeStoredItems = async (items) => {
  await writeFile(dataFilePath, `${JSON.stringify(items, null, 2)}\n`);
};

const toPublicUrl = (absolutePath) => {
  const relative = path.relative(PUBLIC_ROOT, absolutePath).split(path.sep).join("/");
  if (!relative || relative.startsWith("..")) return "";
  return `/${relative}`;
};

const walkImageFiles = async (rootDir) => {
  const results = [];
  const queue = [rootDir];
  while (queue.length > 0) {
    const current = queue.pop();
    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (IMAGE_EXTENSIONS.has(ext)) {
          results.push(fullPath);
        }
      }
    }
  }
  return results;
};

const readFilesystemImageItems = async () => {
  const files = await walkImageFiles(IMAGE_ROOT);
  return files
    .map((absolutePath) => {
      const mediaUrl = toPublicUrl(absolutePath);
      if (!mediaUrl) return null;
      const tags = inferTagsFromMediaUrl(mediaUrl);
      const idHash = createHash("md5").update(mediaUrl).digest("hex").slice(0, 12);
      return normalizeItemRecord({
        id: `fs-${idHash}`,
        title: inferTitleFromMediaUrl(mediaUrl),
        category: pickLegacyCategory(tags, ""),
        categories: tags,
        description: "",
        date: "",
        mediaType: "image",
        mediaUrl,
        thumbUrl: mediaUrl,
      });
    })
    .filter(Boolean)
    .sort((a, b) => a.mediaUrl.localeCompare(b.mediaUrl));
};

const mergeStoredAndFilesystemItems = (storedItems, filesystemItems) => {
  const mapByMediaUrl = new Map();
  for (const item of filesystemItems) {
    mapByMediaUrl.set(sanitizeUrl(item.mediaUrl), item);
  }
  for (const item of storedItems) {
    const key = sanitizeUrl(item.mediaUrl);
    if (key) {
      mapByMediaUrl.set(key, normalizeItemRecord(item));
    } else {
      mapByMediaUrl.set(`manual:${item.id}`, normalizeItemRecord(item));
    }
  }
  return Array.from(mapByMediaUrl.values());
};

export async function GET() {
  try {
    const storedItems = await readStoredItems();
    const filesystemItems = await readFilesystemImageItems();
    const mergedItems = mergeStoredAndFilesystemItems(storedItems, filesystemItems);
    return NextResponse.json(mergedItems);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const items = await readStoredItems();

    if (body.action === "bulkUpsert") {
      const incomingItems = Array.isArray(body.items) ? body.items : [];
      const nextItems = [...items];

      incomingItems.forEach((rawItem) => {
        const mediaType = normalizeMediaType(rawItem?.mediaType);
        const mediaUrl = sanitizeUrl(rawItem?.mediaUrl);
        if (isInvalidUrl(mediaUrl)) return;

        const requestedThumbUrl = sanitizeUrl(rawItem?.thumbUrl);
        const thumbUrl = !isInvalidUrl(requestedThumbUrl)
          ? requestedThumbUrl
          : mediaType === "image"
            ? mediaUrl
            : FALLBACK_THUMB_URL;

        const normalizedItem = normalizeItemRecord({
          id: String(rawItem?.id || Date.now()),
          title: sanitizeText(rawItem?.title) || inferTitleFromMediaUrl(mediaUrl),
          category: rawItem?.category,
          categories: rawItem?.categories ?? rawItem?.tags,
          description: sanitizeText(rawItem?.description),
          date: sanitizeText(rawItem?.date),
          mediaType,
          mediaUrl,
          thumbUrl,
          ringAspect: rawItem?.ringAspect,
          ringCrop: rawItem?.ringCrop,
        });

        let index = nextItems.findIndex((item) => String(item.id) === normalizedItem.id);
        if (index < 0) {
          index = nextItems.findIndex((item) => sanitizeUrl(item.mediaUrl) === normalizedItem.mediaUrl);
        }

        if (index < 0) {
          nextItems.push(normalizedItem);
        } else {
          nextItems[index] = normalizedItem;
        }
      });

      await writeStoredItems(nextItems);
      return NextResponse.json({ success: true, items: nextItems });
    }

    if (body.action === "delete") {
      const targetId = String(body.id || "");
      const updated = items.filter((item) => String(item.id) !== targetId);
      await writeStoredItems(updated);
      return NextResponse.json({ success: true });
    }

    if (body.action === "update") {
      const targetId = String(body.id || "");
      const index = items.findIndex((item) => String(item.id) === targetId);

      if (index < 0) {
        const mediaType = normalizeMediaType(body.mediaType);
        const mediaUrl = sanitizeUrl(body.mediaUrl);
        if (isInvalidUrl(mediaUrl)) {
          return NextResponse.json({ error: "Missing media URL for update" }, { status: 400 });
        }
        const requestedThumbUrl = sanitizeUrl(body.thumbUrl);
        const thumbUrl = !isInvalidUrl(requestedThumbUrl)
          ? requestedThumbUrl
          : mediaType === "image"
            ? mediaUrl
            : FALLBACK_THUMB_URL;
        const upserted = normalizeItemRecord({
          id: targetId || String(Date.now()),
          title: sanitizeText(body.title) || inferTitleFromMediaUrl(mediaUrl),
          category: sanitizeText(body.category),
          categories: body.categories ?? body.tags,
          description: sanitizeText(body.description),
          date: sanitizeText(body.date),
          mediaType,
          mediaUrl,
          thumbUrl,
          ringAspect: body.ringAspect,
          ringCrop: body.ringCrop,
        });
        items.push(upserted);
        await writeStoredItems(items);
        return NextResponse.json(upserted);
      }

      const previous = items[index];
      const nextMediaType = normalizeMediaType(body.mediaType || previous.mediaType);
      const incomingMediaUrl = sanitizeUrl(body.mediaUrl);
      const nextMediaUrl = isInvalidUrl(incomingMediaUrl)
        ? previous.mediaUrl || ""
        : incomingMediaUrl;
      const incomingThumbUrl = sanitizeUrl(body.thumbUrl);
      const nextThumbUrl = !isInvalidUrl(incomingThumbUrl)
        ? incomingThumbUrl
        : nextMediaType === "image" && !isInvalidUrl(nextMediaUrl)
          ? nextMediaUrl
          : previous.thumbUrl || FALLBACK_THUMB_URL;
      const nextItem = normalizeItemRecord({
        ...previous,
        id: previous.id,
        title: sanitizeText(body.title) || previous.title || inferTitleFromMediaUrl(nextMediaUrl),
        category: body.category ?? previous.category,
        categories: body.categories ?? body.tags ?? previous.categories,
        description: sanitizeText(body.description) || previous.description || "",
        date: sanitizeText(body.date) || previous.date || "",
        mediaType: nextMediaType,
        mediaUrl: nextMediaUrl,
        thumbUrl: nextThumbUrl,
        ringAspect: body.ringAspect ?? previous.ringAspect,
        ringCrop: body.ringCrop ?? previous.ringCrop,
      });

      items[index] = nextItem;
      await writeStoredItems(items);
      return NextResponse.json(nextItem);
    }

    const normalizedId = String(Date.now());
    const normalizedMediaType = normalizeMediaType(body.mediaType);
    const normalizedMediaUrl = sanitizeUrl(body.mediaUrl);
    const requestedThumbUrl = sanitizeUrl(body.thumbUrl);
    const normalizedThumbUrl = !isInvalidUrl(requestedThumbUrl)
      ? requestedThumbUrl
      : normalizedMediaType === "image" && !isInvalidUrl(normalizedMediaUrl)
        ? normalizedMediaUrl
        : FALLBACK_THUMB_URL;

    const newItem = normalizeItemRecord({
      id: normalizedId,
      title: sanitizeText(body.title) || inferTitleFromMediaUrl(normalizedMediaUrl),
      category: body.category,
      categories: body.categories ?? body.tags,
      description: sanitizeText(body.description),
      date: sanitizeText(body.date),
      mediaType: normalizedMediaType,
      mediaUrl: normalizedMediaUrl,
      thumbUrl: normalizedThumbUrl,
      ringAspect: body.ringAspect,
      ringCrop: body.ringCrop,
    });

    items.push(newItem);
    await writeStoredItems(items);
    return NextResponse.json(newItem, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
