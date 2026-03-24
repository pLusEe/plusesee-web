import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';

const dataFilePath = path.join(process.cwd(), 'src', 'data', 'portfolio.json');
const FALLBACK_THUMB_URL = '/media/images/placeholder1.jpg';

const WORK_TAG_IDS = ['home', 'commercial', 'personalLibrary', 'personalBook', 'bio'];

const LEGACY_TO_TAGS = {
  'home ai / ring': ['home'],
  home: ['home'],
  ring: ['home'],
  'commercial design': ['commercial'],
  commercial: ['commercial'],
  'personal design': ['personalLibrary', 'personalBook'],
  personal: ['personalLibrary', 'personalBook'],
  bio: ['bio'],
};

const TAG_TO_LEGACY = {
  home: 'home ai / ring',
  commercial: 'commercial design',
  personalLibrary: 'personal design',
  personalBook: 'personal design',
  bio: 'bio',
};

const sanitizeText = (value) => (typeof value === 'string' ? value.trim() : '');
const unique = (list) => Array.from(new Set(list));
const sanitizeUrl = (value) => (typeof value === 'string' ? value.trim() : '');
const isInvalidUrl = (value) =>
  !value || value === '.' || value === '/.' || value.endsWith('/.');

const normalizeTags = (rawCategories, rawCategory) => {
  const source = [];
  if (Array.isArray(rawCategories)) source.push(...rawCategories);
  if (typeof rawCategories === 'string') source.push(...rawCategories.split(','));
  if (typeof rawCategory === 'string' && rawCategory.trim()) source.push(rawCategory.trim());

  const tags = source
    .flatMap((value) => {
      const text = sanitizeText(value);
      if (!text) return [];
      if (WORK_TAG_IDS.includes(text)) return [text];
      const mapped = LEGACY_TO_TAGS[text.toLowerCase()];
      if (mapped) return mapped;
      return [];
    })
    .filter((tag) => WORK_TAG_IDS.includes(tag));

  return unique(tags);
};

const pickLegacyCategory = (tags, fallbackValue) => {
  for (const tag of tags) {
    if (TAG_TO_LEGACY[tag]) return TAG_TO_LEGACY[tag];
  }
  const fallback = sanitizeText(fallbackValue);
  return fallback || 'uncategorized';
};

const normalizeMediaType = (value) => {
  const text = sanitizeText(value).toLowerCase();
  if (text === 'video' || text === 'audio' || text === 'image') return text;
  return 'image';
};

const normalizeItemRecord = (item = {}) => {
  const tags = normalizeTags(item.categories, item.category);
  const mediaType = normalizeMediaType(item.mediaType);
  const mediaUrl = sanitizeUrl(item.mediaUrl);
  const thumbCandidate = sanitizeUrl(item.thumbUrl);
  const thumbUrl = !isInvalidUrl(thumbCandidate)
    ? thumbCandidate
    : mediaType === 'image' && !isInvalidUrl(mediaUrl)
      ? mediaUrl
      : FALLBACK_THUMB_URL;

  return {
    id: String(item.id || Date.now()),
    title: sanitizeText(item.title) || 'Untitled',
    category: pickLegacyCategory(tags, item.category),
    categories: tags,
    description: sanitizeText(item.description),
    date: sanitizeText(item.date),
    mediaType,
    mediaUrl,
    thumbUrl,
  };
};

export async function GET() {
  try {
    const fileContents = await fs.readFile(dataFilePath, 'utf8');
    const normalized = fileContents.replace(/^\uFEFF/, '');
    const parsed = JSON.parse(normalized);
    const items = Array.isArray(parsed) ? parsed.map(normalizeItemRecord) : [];
    return NextResponse.json(items);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const fileContents = await fs.readFile(dataFilePath, 'utf8');
    const normalized = fileContents.replace(/^\uFEFF/, '');
    const rawItems = JSON.parse(normalized);
    const items = Array.isArray(rawItems) ? rawItems.map(normalizeItemRecord) : [];

    if (body.action === 'delete') {
      const updated = items.filter(item => item.id !== body.id);
      await writeFile(dataFilePath, `${JSON.stringify(updated, null, 2)}\n`);
      return NextResponse.json({ success: true });
    }

    if (body.action === 'update') {
      const targetId = String(body.id || '');
      const index = items.findIndex((item) => String(item.id) === targetId);
      if (index < 0) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      const previous = items[index];
      const nextMediaType = normalizeMediaType(body.mediaType || previous.mediaType);
      const incomingMediaUrl = sanitizeUrl(body.mediaUrl);
      const nextMediaUrl = isInvalidUrl(incomingMediaUrl)
        ? previous.mediaUrl || ''
        : incomingMediaUrl;
      const incomingThumbUrl = sanitizeUrl(body.thumbUrl);
      const nextThumbUrl = !isInvalidUrl(incomingThumbUrl)
        ? incomingThumbUrl
        : nextMediaType === 'image' && !isInvalidUrl(nextMediaUrl)
          ? nextMediaUrl
          : previous.thumbUrl || FALLBACK_THUMB_URL;
      const nextTags = normalizeTags(body.categories ?? body.tags ?? previous.categories, body.category ?? previous.category);

      const nextItem = {
        ...previous,
        title: sanitizeText(body.title) || previous.title || 'Untitled',
        category: pickLegacyCategory(nextTags, body.category ?? previous.category),
        categories: nextTags,
        description: sanitizeText(body.description) || previous.description || '',
        date: sanitizeText(body.date) || previous.date || '',
        mediaType: nextMediaType,
        mediaUrl: nextMediaUrl,
        thumbUrl: nextThumbUrl,
      };

      items[index] = nextItem;
      await writeFile(dataFilePath, `${JSON.stringify(items, null, 2)}\n`);
      return NextResponse.json(nextItem);
    }

    const normalizedId = String(Date.now());
    const normalizedMediaType = normalizeMediaType(body.mediaType);
    const normalizedMediaUrl = sanitizeUrl(body.mediaUrl);
    const requestedThumbUrl = sanitizeUrl(body.thumbUrl);
    const normalizedThumbUrl = !isInvalidUrl(requestedThumbUrl)
      ? requestedThumbUrl
      : normalizedMediaType === 'image' && !isInvalidUrl(normalizedMediaUrl)
        ? normalizedMediaUrl
        : FALLBACK_THUMB_URL;
    const normalizedTags = normalizeTags(body.categories ?? body.tags, body.category);

    // Create new item
    const newItem = {
      id: normalizedId,
      title: sanitizeText(body.title) || 'Untitled',
      category: pickLegacyCategory(normalizedTags, body.category),
      categories: normalizedTags,
      description: sanitizeText(body.description),
      date: sanitizeText(body.date),
      mediaType: normalizedMediaType,
      mediaUrl: normalizedMediaUrl,
      thumbUrl: normalizedThumbUrl,
    };

    items.push(newItem);
    await writeFile(dataFilePath, `${JSON.stringify(items, null, 2)}\n`);
    return NextResponse.json(newItem, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
