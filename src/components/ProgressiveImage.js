"use client";

import { useState } from "react";
import displayAssetManifest from "../data/display-assets.json";
import styles from "./ProgressiveImage.module.css";

const getManifestKey = (src) => {
  try {
    return decodeURI(String(src || ""));
  } catch {
    return String(src || "");
  }
};

export default function ProgressiveImage({
  src,
  alt = "",
  sizes = "100vw",
  loading = "lazy",
  fetchPriority = "auto",
  frameClassName = "",
  imageClassName = "",
  fill = false,
  draggable,
  ariaHidden = false,
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const asset = displayAssetManifest[getManifestKey(src)];
  const imageSrc = asset?.src || src;
  const srcSet = asset?.sources
    ?.map((source) => `${source.url} ${source.width}w`)
    .join(", ");
  const frameStyle =
    !fill && asset?.width && asset?.height
      ? { aspectRatio: `${asset.width} / ${asset.height}` }
      : undefined;

  return (
    <span
      className={`${styles.frame} ${fill ? styles.fill : ""} ${loaded ? styles.loaded : ""} ${failed ? styles.failed : ""} ${frameClassName}`}
      style={frameStyle}
    >
      <span
        className={styles.preview}
        style={asset?.previewUrl ? { backgroundImage: `url("${asset.previewUrl}")` } : undefined}
        aria-hidden="true"
      />
      <img
        src={imageSrc}
        srcSet={srcSet || undefined}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        width={asset?.width}
        height={asset?.height}
        className={`${styles.image} ${imageClassName}`}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        draggable={draggable}
        aria-hidden={ariaHidden || undefined}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </span>
  );
}
