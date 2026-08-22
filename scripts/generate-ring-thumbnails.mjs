import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const portfolioPath = path.join(projectRoot, "src/data/portfolio.json");
const manifestPath = path.join(projectRoot, "src/data/ring-thumbnails.json");
const outputDirectory = path.join(projectRoot, "public/media/ring-thumbnails");

const MIN_CARD_ASPECT = 0.45;
const MAX_CARD_ASPECT = 2.2;
const MAX_OUTPUT_EDGE = 768;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const readJson = async (filePath) => {
  const source = await fs.readFile(filePath, "utf8");
  return JSON.parse(source.replace(/^\uFEFF/, ""));
};

const getThumb = (item) => {
  if (item.thumbUrl) return item.thumbUrl;
  if ((item.mediaType || "image") === "image" && item.mediaUrl) return item.mediaUrl;
  if (item.imageUrl) return item.imageUrl;
  return "/media/images/placeholder1.jpg";
};

const getCropSettings = (item, sourceAspect) => ({
  aspect: clamp(
    typeof item.ringAspect === "number" ? item.ringAspect : sourceAspect,
    MIN_CARD_ASPECT,
    MAX_CARD_ASPECT
  ),
  focusX: clamp(
    typeof item.ringCrop?.focusX === "number" ? item.ringCrop.focusX : 0.5,
    0,
    1
  ),
  focusY: clamp(
    typeof item.ringCrop?.focusY === "number" ? item.ringCrop.focusY : 0.5,
    0,
    1
  ),
  zoom: clamp(
    typeof item.ringCrop?.zoom === "number" ? item.ringCrop.zoom : 1,
    1,
    3
  ),
});

const getCropRect = (sourceWidth, sourceHeight, settings) => {
  const sourceAspect = sourceWidth / sourceHeight;
  let baseCropWidth;
  let baseCropHeight;

  if (sourceAspect > settings.aspect) {
    baseCropHeight = sourceHeight;
    baseCropWidth = baseCropHeight * settings.aspect;
  } else {
    baseCropWidth = sourceWidth;
    baseCropHeight = baseCropWidth / settings.aspect;
  }

  const width = Math.max(1, Math.round(baseCropWidth / settings.zoom));
  const height = Math.max(1, Math.round(baseCropHeight / settings.zoom));
  const left = clamp(
    Math.round((sourceWidth - width) * settings.focusX),
    0,
    Math.max(0, sourceWidth - width)
  );
  const top = clamp(
    Math.round((sourceHeight - height) * settings.focusY),
    0,
    Math.max(0, sourceHeight - height)
  );

  return { left, top, width, height };
};

const sanitizeId = (value) =>
  String(value || "work")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "work";

const portfolio = await readJson(portfolioPath);
await fs.mkdir(outputDirectory, { recursive: true });

const manifest = {};
const generatedFiles = new Set();

for (const item of portfolio) {
  const sourceUrl = getThumb(item);
  if (!sourceUrl.startsWith("/")) continue;

  const sourcePath = path.join(
    projectRoot,
    "public",
    decodeURIComponent(sourceUrl).replace(/^\/+/, "")
  );

  try {
    const metadata = await sharp(sourcePath).metadata();
    if (!metadata.width || !metadata.height) continue;

    const settings = getCropSettings(item, metadata.width / metadata.height);
    const crop = getCropRect(metadata.width, metadata.height, settings);
    const signature = JSON.stringify({ sourceUrl, ...settings });
    const hash = createHash("sha1").update(signature).digest("hex").slice(0, 10);
    const fileName = `${sanitizeId(item.id)}-${hash}.webp`;
    const outputPath = path.join(outputDirectory, fileName);

    await sharp(sourcePath)
      .extract(crop)
      .resize({
        width: MAX_OUTPUT_EDGE,
        height: MAX_OUTPUT_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 88, effort: 5 })
      .toFile(outputPath);

    const outputMetadata = await sharp(outputPath).metadata();
    generatedFiles.add(fileName);
    manifest[String(item.id)] = {
      sourceUrl,
      url: `/media/ring-thumbnails/${fileName}`,
      aspect: settings.aspect,
      focusX: settings.focusX,
      focusY: settings.focusY,
      zoom: settings.zoom,
      width: outputMetadata.width,
      height: outputMetadata.height,
    };
  } catch (error) {
    console.warn(`[ring-thumbnails] Skipped ${item.id}: ${error.message}`);
  }
}

for (const fileName of await fs.readdir(outputDirectory)) {
  if (fileName.endsWith(".webp") && !generatedFiles.has(fileName)) {
    await fs.unlink(path.join(outputDirectory, fileName));
  }
}

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`[ring-thumbnails] Generated ${generatedFiles.size} optimized images.`);
