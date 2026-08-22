import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const publicDirectory = path.join(projectRoot, "public");
const outputDirectory = path.join(publicDirectory, "media/display-assets");
const manifestPath = path.join(projectRoot, "src/data/display-assets.json");

const SOURCE_GROUPS = [
  {
    directory: path.join(publicDirectory, "media/images/commercial-design"),
    widths: [960, 1600, 2400],
  },
  {
    directory: path.join(publicDirectory, "media/images/archive"),
    widths: [480, 960],
  },
];

const IMAGE_PATTERN = /\.(png|jpe?g)$/i;
const DISPLAY_QUALITY = 88;
const PREVIEW_WIDTH = 48;
const PREVIEW_QUALITY = 42;
const MAX_WEBP_EDGE = 16000;

const toPublicUrl = (filePath) =>
  `/${path.relative(publicDirectory, filePath).split(path.sep).join("/")}`;

const listImages = async (directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listImages(filePath)));
    } else if (IMAGE_PATTERN.test(entry.name)) {
      files.push(filePath);
    }
  }

  return files;
};

const hashBuffer = (buffer) => createHash("sha1").update(buffer).digest("hex");
const existingManifest = await fs
  .readFile(manifestPath, "utf8")
  .then((source) => JSON.parse(source))
  .catch(() => ({}));

await fs.mkdir(outputDirectory, { recursive: true });

const manifest = {};
const generatedFiles = new Set();
let generatedCount = 0;

for (const group of SOURCE_GROUPS) {
  const sourceFiles = await listImages(group.directory);

  for (const sourcePath of sourceFiles) {
    const sourceUrl = toPublicUrl(sourcePath);
    const sourceBuffer = await fs.readFile(sourcePath);
    const metadata = await sharp(sourceBuffer).metadata();
    if (!metadata.width || !metadata.height) continue;

    const maxWidthForHeight = Math.max(
      1,
      Math.floor((MAX_WEBP_EDGE * metadata.width) / metadata.height)
    );
    const widths = Array.from(
      new Set(
        [...group.widths, metadata.width].map((width) =>
          Math.min(width, metadata.width, maxWidthForHeight)
        )
      )
    ).sort((left, right) => left - right);
    const signature = hashBuffer(
      Buffer.from(
        `${hashBuffer(sourceBuffer)}:${widths.join(",")}:${DISPLAY_QUALITY}:${PREVIEW_WIDTH}:${PREVIEW_QUALITY}`
      )
    ).slice(0, 14);
    const assetId = hashBuffer(Buffer.from(sourceUrl)).slice(0, 12);
    const previewFileName = `${assetId}-${signature}-preview.webp`;
    const previewPath = path.join(outputDirectory, previewFileName);
    const sourceEntries = widths.map((width) => ({
      width,
      fileName: `${assetId}-${signature}-${width}.webp`,
    }));
    const expectedFiles = [previewFileName, ...sourceEntries.map((entry) => entry.fileName)];
    const previous = existingManifest[sourceUrl];
    const canReuse =
      previous?.signature === signature &&
      (await Promise.all(
        expectedFiles.map((fileName) =>
          fs.access(path.join(outputDirectory, fileName)).then(() => true).catch(() => false)
        )
      )).every(Boolean);

    if (!canReuse) {
      await sharp(sourceBuffer)
        .resize({ width: PREVIEW_WIDTH, withoutEnlargement: true })
        .webp({ quality: PREVIEW_QUALITY, effort: 4 })
        .toFile(previewPath);

      for (const entry of sourceEntries) {
        await sharp(sourceBuffer)
          .resize({ width: entry.width, withoutEnlargement: true })
          .webp({ quality: DISPLAY_QUALITY, effort: 5, smartSubsample: true })
          .toFile(path.join(outputDirectory, entry.fileName));
      }
      generatedCount += 1;
    }

    expectedFiles.forEach((fileName) => generatedFiles.add(fileName));
    manifest[sourceUrl] = {
      signature,
      width: metadata.width,
      height: metadata.height,
      previewUrl: `/media/display-assets/${previewFileName}`,
      src: `/media/display-assets/${sourceEntries.at(-1).fileName}`,
      sources: sourceEntries.map((entry) => ({
        width: entry.width,
        url: `/media/display-assets/${entry.fileName}`,
      })),
    };
  }
}

for (const fileName of await fs.readdir(outputDirectory)) {
  if (fileName.endsWith(".webp") && !generatedFiles.has(fileName)) {
    await fs.unlink(path.join(outputDirectory, fileName));
  }
}

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(
  `[display-assets] ${Object.keys(manifest).length} assets ready (${generatedCount} regenerated).`
);
