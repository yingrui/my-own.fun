import React from "react";
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
  if (imgWidth <= 0 || imgHeight <= 0) return <img src={src} alt={alt} />;
  return (
    <div className="document-image-with-boxes">
      <img src={src} alt={alt} />
      {boxesOnPage.map(({ blockIndex, bbox, label }) => {
        const [x1, y1, x2, y2] = bbox;
        const left = (x1 / imgWidth) * 100;
        const top = (y1 / imgHeight) * 100;
        const width = ((x2 - x1) / imgWidth) * 100;
        const height = ((y2 - y1) / imgHeight) * 100;
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
