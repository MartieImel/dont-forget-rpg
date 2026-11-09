import { useState } from "react";

export default function TabIcon({ src, fallback, alt }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>
        {fallback}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      style={{ width: 24, height: 24, objectFit: "contain", imageRendering: "pixelated" }}
    />
  );
}
