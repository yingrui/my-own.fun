import React, { useState, useCallback, useEffect } from "react";
import type { BoxOnPage } from "../../utils";

export interface ImageWithBoxesProps {
  src: string;
  alt: string;
  imgWidth: number;
  imgHeight: number;
  boxesOnPage: BoxOnPage[];
  selectedBlockIndex: number | null;
  onBlockClick: (blockIndex: number) => void;
}

const ImageWithBoxes: React.FC<ImageWithBoxesProps> = ({
  src,
  alt,
  imgWidth,
  imgHeight,
  boxesOnPage,
  selectedBlockIndex,
  onBlockClick,
}) => {
  const [naturalSize, setNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    setNaturalSize(null);
  }, [src]);

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      setNaturalSize({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    },
    []
  );

  const w = naturalSize?.width ?? imgWidth;
  const h = naturalSize?.height ?? imgHeight;

  if (w <= 0 || h <= 0) return <img src={src} alt={alt} />;
  return (
    <div className="document-image-with-boxes">
      <img src={src} alt={alt} onLoad={handleLoad} />
      {boxesOnPage.map(({ blockIndex, bbox, label }) => {
        const [x1, y1, x2, y2] = bbox;
        const left = (x1 / w) * 100;
        const top = (y1 / h) * 100;
        const width = ((x2 - x1) / w) * 100;
        const height = ((y2 - y1) / h) * 100;
        const isSelected = selectedBlockIndex === blockIndex;
        return (
          <div
            key={blockIndex}
            className={`document-image-box ${isSelected ? "selected" : ""}`}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${width}%`,
              height: `${height}%`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onBlockClick(blockIndex);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onBlockClick(blockIndex)}
            aria-label={label || `Block ${blockIndex + 1}`}
          />
        );
      })}
    </div>
  );
};

export default ImageWithBoxes;
