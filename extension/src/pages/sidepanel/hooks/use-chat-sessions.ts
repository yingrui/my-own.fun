import { useAtom, useSetAtom } from "jotai";
import { chatSessionsAtom } from "@pages/sidepanel/store/sessions";

export function useChatSessions() {
  const [chatSessions, setChatSessions] = useAtom(chatSessionsAtom);

  const addChatSession = (newSession: ChatSession) => {
    setChatSessions((prevSessions) => [...prevSessions, newSession]);
  };

  const removeChatSession = (sessionId: string) => {
    setChatSessions((prevSessions) =>
      prevSessions.filter((session) => session.id !== sessionId),
    );
  };

  const queryChatSession = (sessionId: string) => {
    return chatSessions.find((session) => session.id === sessionId);
  };

  return {
    chatSessions,
    addChatSession,
    removeChatSession,
    queryChatSession,
  };
}
