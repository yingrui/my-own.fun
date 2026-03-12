import { useCallback, useRef } from "react";

export const useScrollAnchor = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const bottomThresholdPx = 64;

  const isNearBottom = useCallback((element: HTMLDivElement) => {
    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    return distanceFromBottom <= bottomThresholdPx;
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    shouldAutoScrollRef.current = isNearBottom(scrollRef.current);
  }, [isNearBottom]);

  const scrollToBottom = useCallback((
    behavior: ScrollBehavior = "smooth",
    force = false,
  ) => {
    if (!force && !shouldAutoScrollRef.current) return;
    if (messagesRef.current) {
      messagesRef.current.scrollIntoView({
        block: "end",
        behavior,
      });
    }
    if (force) {
      shouldAutoScrollRef.current = true;
    }
  }, []);

  return {
    scrollRef,
    messagesRef,
    handleScroll,
    scrollToBottom,
  };
};
