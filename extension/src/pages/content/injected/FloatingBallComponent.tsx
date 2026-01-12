import useStorage from "@root/src/shared/hooks/useStorage";
import configureStorage from "@root/src/shared/storages/gluonConfig";
import { useRef } from "react";
import Draggable from "react-draggable";

export default function FloatingBallComponent() {
  const draggedRef = useRef<boolean>(false);
  const configStorage = useStorage(configureStorage);

  const handleClick = () => {
    if (draggedRef.current) {
      return;
    }
    chrome.runtime.sendMessage({ type: "open_side_panel" });
  };

  const iconSrc = chrome.runtime.getURL("icons/logo.png");
  return (
    <Draggable
      defaultClassName={configStorage.enableFloatingBall ? "" : "hidden"}
      onDrag={() => {
        draggedRef.current = true;
      }}
      onStop={() => {
        draggedRef.current = false;
      }}
      axis="y"
    >
      <div className="floating-window" onClick={handleClick}>
        <img draggable="false" src={iconSrc} alt="icon" />
      </div>
    </Draggable>
  );
}
