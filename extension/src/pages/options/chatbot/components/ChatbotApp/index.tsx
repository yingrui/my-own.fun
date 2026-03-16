import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Layout, List, Modal, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import type { SessionMessage } from "@src/shared/langgraph/runtime/types";
import ChatWindow from "@pages/options/chatbot/components/ChatWindow";
import ArtifactPanel from "@src/shared/components/ArtifactPanel";
import { useArtifacts } from "@src/shared/artifacts";
import {
  type ChatConversationRecord,
  createChatConversation,
  deleteChatConversation,
  getChatConversation,
  listChatConversations,
  updateChatConversation,
} from "@src/shared/services/backendApi";
import "./index.css";
import AgentFactory from "@pages/options/chatbot/agents/AgentFactory";
import intl from "react-intl-universal";
import AppShell from "@src/shared/components/AppShell";
import { v4 as uuidv4 } from "uuid";
import { message as antdMessage } from "antd";

const SAVE_DEBOUNCE_MS = 2000;
const TITLE_MAX_LEN = 50;

function deriveTitle(messages: SessionMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  const text = firstUser?.content?.trim() ?? "";
  return text.length > TITLE_MAX_LEN
    ? `${text.slice(0, TITLE_MAX_LEN)}…`
    : text || "New chat";
}

function messagesForSave(messages: SessionMessage[]): SessionMessage[] {
  return messages.map(({ id, role, content, name, stepItems }) => ({
    id,
    role,
    content,
    name,
    stepItems,
  }));
}

interface ChatbotAppProps {
  config: GluonConfigure;
}

const ChatbotApp: React.FC<ChatbotAppProps> = ({ config }) => {
  const [collapsed, setCollapsed] = useState(true);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ChatConversationRecord[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const agent = useMemo(() => new AgentFactory().create(config), [config]);
  const { artifacts, partialArtifact, hasArtifactContent, artifactsByMessageId } = useArtifacts(messages);

  useEffect(() => {
    const state = agent.getState();
    setMessages(state.messages);
    setGenerating(state.generating);
    const unsubscribe = agent.onStateChange((state) => {
      setMessages(state.messages);
      setGenerating(state.generating);
    });
    return () => unsubscribe();
  }, [agent]);

  const loadConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      const list = await listChatConversations();
      setConversations(list);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      saveTimeoutRef.current = null;
      const msgs = agent.getState().messages;
      if (msgs.length === 0) return;
      if (agent.getState().generating) return;

      const toSave = messagesForSave(msgs);
      const title = deriveTitle(msgs);

      try {
        if (currentChatId) {
          await updateChatConversation(currentChatId, { title, messages: toSave });
        } else {
          const chatId = uuidv4();
          await createChatConversation(chatId, title, toSave);
          setCurrentChatId(chatId);
        }
        await loadConversations();
      } catch (err) {
        antdMessage.error(
          intl.get("chat_save_error").d("Failed to save. Check backend connection.")
        );
      }
    }, SAVE_DEBOUNCE_MS);
  }, [agent, currentChatId, loadConversations]);

  useEffect(() => {
    if (messages.length > 0 && !generating) {
      scheduleSave();
    }
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [messages, generating, scheduleSave]);

  const handleNewChat = useCallback(() => {
    agent.clear();
    setCurrentChatId(null);
  }, [agent]);

  const handleSelectChat = useCallback(
    async (chatId: string) => {
      if (chatId === currentChatId) return;
      try {
        const chat = await getChatConversation(chatId);
        if (!chat) return;
        agent.loadConversation?.(chat.messages as SessionMessage[]);
        setCurrentChatId(chatId);
      } catch (err) {
        antdMessage.error(
          intl.get("chat_load_error").d("Failed to load conversation.")
        );
      }
    },
    [agent, currentChatId]
  );

  const handleDeleteChat = useCallback(
    (chatId: string) => {
      Modal.confirm({
        title: intl.get("chat_delete_confirm_title").d("Delete conversation?"),
        content: intl.get("chat_delete_confirm_content").d("This cannot be undone."),
        okText: intl.get("common_delete").d("Delete"),
        okType: "danger",
        cancelText: intl.get("common_cancel").d("Cancel"),
        onOk: async () => {
          try {
            await deleteChatConversation(chatId);
            if (currentChatId === chatId) {
              agent.clear();
              setCurrentChatId(null);
            }
            await loadConversations();
          } catch (err) {
            antdMessage.error(
              intl.get("chat_delete_error").d("Failed to delete conversation.")
            );
          }
        },
      });
    },
    [agent, currentChatId, loadConversations]
  );

  return (
    <AppShell
      siderId="chatbot-left-sider"
      collapsed={collapsed}
      onToggleCollapsed={() => setCollapsed(!collapsed)}
      sider={
        collapsed ? null : (
          <div className="chatbot-sider-content">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              block
              onClick={handleNewChat}
              style={{ marginBottom: 12 }}
            >
              {intl.get("chat_new").d("New chat")}
            </Button>
            <div className="chatbot-conversations-list">
              <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
                {intl.get("chat_saved").d("Saved conversations")}
              </Typography.Text>
              {conversationsLoading ? (
                <Typography.Text type="secondary">{intl.get("common_loading").d("Loading...")}</Typography.Text>
              ) : conversations.length === 0 ? (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {intl.get("chat_none").d("No saved conversations yet")}
                </Typography.Text>
              ) : (
                <List
                  size="small"
                  dataSource={conversations}
                  renderItem={(item) => (
                    <List.Item
                      key={item.chatId}
                      onClick={() => handleSelectChat(item.chatId)}
                      style={{
                        cursor: "pointer",
                        background: currentChatId === item.chatId ? "var(--gm-color-selected-bg, #e6f4ff)" : undefined,
                        borderRadius: 4,
                        padding: "4px 8px",
                        marginBottom: 4,
                      }}
                      actions={[
                        <Typography.Text
                          key="del"
                          type="danger"
                          style={{ fontSize: 11 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChat(item.chatId);
                          }}
                        >
                          {intl.get("common_delete").d("Delete")}
                        </Typography.Text>,
                      ]}
                    >
                      <List.Item.Meta
                        title={<Typography.Text ellipsis style={{ fontSize: 13 }}>{item.title}</Typography.Text>}
                        description={
                          item.updatedAt
                            ? new Date(item.updatedAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })
                            : null
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>
          </div>
        )
      }
      content={
        <Layout className={`chatbot-main${hasArtifactContent ? " chatbot-main--with-artifacts" : ""}`}>
          <Layout className={"chatbot-conversation"}>
            <ChatWindow
              config={config}
              agent={agent}
              messages={messages}
              artifactsByMessageId={artifactsByMessageId}
              onArtifactClick={setSelectedArtifactId}
            />
          </Layout>
          {hasArtifactContent && (
            <div className={"chatbot-artifact-panel"}>
              <ArtifactPanel
                artifacts={artifacts}
                partialArtifact={partialArtifact}
                selectedArtifactId={selectedArtifactId}
              />
            </div>
          )}
        </Layout>
      }
    />
  );
};

export default ChatbotApp;
