import { useCallback, useRef } from "react";

export const useScrollAnchor = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollIntoView({
        block: "end",
        behavior: "smooth",
      });
    }
  }, []);

  return {
    scrollRef,
    messagesRef,
    scrollToBottom,
  };
};
