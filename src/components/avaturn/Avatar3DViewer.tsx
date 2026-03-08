import { useEffect, useRef, memo } from "react";
import "@google/model-viewer";

// Type declaration for model-viewer is in src/types/model-viewer.d.ts

interface Avatar3DViewerProps {
  src: string;
  size: "lg" | "xl";
  className?: string;
}

function Avatar3DViewerInner({ src, size, className }: Avatar3DViewerProps) {
  const cameraOrbit = size === "xl" ? "0deg 75deg 2.2m" : "0deg 75deg 1.8m";
  const autoRotate = size === "xl";

  return (
    <div className={className} style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: "50%" }}>
      <model-viewer
        src={src}
        alt="Avatar 3D"
        camera-orbit={cameraOrbit}
        camera-target="0m 0.8m 0m"
        auto-rotate={autoRotate}
        rotation-per-second="20deg"
        interaction-prompt="none"
        shadow-intensity="0"
        loading="lazy"
        style={{
          width: "100%",
          height: "100%",
          background: "transparent",
          // Disable interaction hints
          "--poster-color": "transparent",
        } as React.CSSProperties}
      />
    </div>
  );
}

const Avatar3DViewer = memo(Avatar3DViewerInner);
export default Avatar3DViewer;
