import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface Props {
  chart: string;
  loading?: boolean;
}

const Mermaid = ({ chart, loading }: Props) => {
  const containerRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!loading) {
      mermaid.parse(chart).then((value) => {
        if (value) {
          mermaid.initialize({ startOnLoad: true, theme: "neutral" });
          if (containerRef.current) {
            mermaid.contentLoaded();
            setError(null); // 清除之前的错误状态
          }
        } else {
          setError(true);
        }
      });
    }
  }, [chart, loading]);

  return (
    <div className="mermaid" ref={containerRef}>
      {chart}
    </div>
  );
};

export default Mermaid;
