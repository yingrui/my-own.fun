import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Layout, List, Modal, Tooltip, Typography } from "antd";
import { CheckOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
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

type DateGroup = { label: string; sortOrder: number; conversations: ChatConversationRecord[] };

function groupConversationsByDate(conversations: ChatConversationRecord[]): DateGroup[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;

  const groups = new Map<string, { label: string; sortOrder: number; items: ChatConversationRecord[] }>();

  for (const c of conversations) {
    const ts = c.updatedAt ?? c.createdAt;
    const d = ts ? new Date(ts) : now;
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    let label: string;
    let sortOrder: number;

    if (dayStart >= todayStart) {
      label = intl.get("chat_group_today").d("Today");
      sortOrder = 0;
    } else if (dayStart >= yesterdayStart) {
      label = intl.get("chat_group_yesterday").d("Yesterday");
      sortOrder = 1;
    } else if (dayStart >= sevenDaysAgo) {
      label = intl.get("chat_group_7days").d("7 Days");
      sortOrder = 2;
    } else {
      label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      sortOrder = 3 + (sevenDaysAgo - dayStart) / (24 * 60 * 60 * 1000);
    }

    const key = label.startsWith("20") ? label : `${sortOrder}-${label}`;
    if (!groups.has(key)) {
      groups.set(key, { label, sortOrder, items: [] });
    }
    groups.get(key)!.items.push(c);
  }

  for (const g of groups.values()) {
    g.items.sort((a, b) => {
      const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      return tb - ta;
    });
  }

  return Array.from(groups.values())
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((g) => ({ label: g.label, sortOrder: g.sortOrder, conversations: g.items }));
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
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [expandedActionsChatId, setExpandedActionsChatId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<{ chatId: string | null; snapshot: string } | null>(null);

  const agent = useMemo(() => new AgentFactory().create(config), [config]);
  const { artifacts, partialArtifact, hasArtifactContent, artifactsByMessageId } = useArtifacts(messages);
  const groupedConversations = useMemo(
    () => groupConversationsByDate(conversations),
    [conversations]
  );

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
      const snapshot = JSON.stringify({ chatId: currentChatId, title, messages: toSave });

      // Skip save if content unchanged (e.g. after just loading a chat)
      if (lastSavedRef.current?.chatId === currentChatId && lastSavedRef.current?.snapshot === snapshot) {
        return;
      }

      try {
        let savedChatId = currentChatId;
        if (currentChatId) {
          await updateChatConversation(currentChatId, { title, messages: toSave });
        } else {
          savedChatId = uuidv4();
          await createChatConversation(savedChatId, title, toSave);
          setCurrentChatId(savedChatId);
        }
        lastSavedRef.current = { chatId: savedChatId, snapshot };
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
      setExpandedActionsChatId(null);
      try {
        const chat = await getChatConversation(chatId);
        if (!chat) return;
        agent.loadConversation?.(chat.messages as SessionMessage[]);
        setCurrentChatId(chatId);
        // Mark as already saved so we don't re-save on load (which would update updatedAt)
        const msgs = messagesForSave(chat.messages as SessionMessage[]);
        const title = chat.title || deriveTitle(chat.messages as SessionMessage[]);
        lastSavedRef.current = {
          chatId,
          snapshot: JSON.stringify({ chatId, title, messages: msgs }),
        };
      } catch (err) {
        antdMessage.error(
          intl.get("chat_load_error").d("Failed to load conversation.")
        );
      }
    },
    [agent, currentChatId]
  );

  const handleDeleteChat = useCallback(
    (e: React.MouseEvent, chatId: string) => {
      e.stopPropagation();
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
            setEditingChatId(null);
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

  const handleStartEdit = useCallback((e: React.MouseEvent, item: ChatConversationRecord) => {
    e.stopPropagation();
    setExpandedActionsChatId(null);
    setEditingChatId(item.chatId);
    setEditingTitle(item.title);
  }, []);

  const handleSaveTitle = useCallback(
    async (chatId: string) => {
      const trimmed = editingTitle.trim();
      if (!trimmed) {
        setEditingChatId(null);
        return;
      }
      try {
        await updateChatConversation(chatId, { title: trimmed });
        setConversations((prev) =>
          prev.map((c) => (c.chatId === chatId ? { ...c, title: trimmed } : c))
        );
      } catch (err) {
        antdMessage.error(
          intl.get("chat_save_error").d("Failed to save. Check backend connection.")
        );
      }
      setEditingChatId(null);
    },
    [editingTitle]
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
                <div className="chatbot-conversations-grouped">
                  {groupedConversations.map((group) => (
                    <div key={group.label} className="chatbot-conversations-group">
                      <Typography.Text
                        type="secondary"
                        className="chatbot-conversations-group-header"
                      >
                        {group.label}
                      </Typography.Text>
                      <List
                        size="small"
                        dataSource={group.conversations}
                        renderItem={(item) => (
                          <List.Item
                            key={item.chatId}
                            onClick={() => {
                              setExpandedActionsChatId(null);
                              if (editingChatId !== item.chatId) handleSelectChat(item.chatId);
                            }}
                            style={{
                              cursor: editingChatId === item.chatId ? "default" : "pointer",
                              background: currentChatId === item.chatId ? "var(--gm-color-selected-bg, #e6f4ff)" : undefined,
                              borderRadius: 4,
                              marginBottom: 4,
                            }}
                            actions={[
                              editingChatId === item.chatId ? (
                                <>
                                  <Tooltip key="check" title={intl.get("save").d("Save")} placement="top">
                                    <CheckOutlined
                                      style={{ fontSize: 12, marginRight: 6, color: "var(--ant-color-primary)" }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSaveTitle(item.chatId);
                                      }}
                                    />
                                  </Tooltip>
                                  <Tooltip key="del" title={intl.get("common_delete").d("Delete")} placement="top">
                                    <DeleteOutlined
                                      style={{ fontSize: 12, color: "var(--ant-color-error)" }}
                                      onClick={(e) => handleDeleteChat(e, item.chatId)}
                                    />
                                  </Tooltip>
                                </>
                              ) : expandedActionsChatId === item.chatId ? (
                                <>
                                  <Tooltip key="edit" title={intl.get("chat_edit_title").d("Edit title")} placement="top">
                                    <EditOutlined
                                      style={{ fontSize: 12, marginRight: 6 }}
                                      onClick={(e) => handleStartEdit(e, item)}
                                    />
                                  </Tooltip>
                                  <Tooltip key="del" title={intl.get("common_delete").d("Delete")} placement="top">
                                    <DeleteOutlined
                                      style={{ fontSize: 12, color: "var(--ant-color-error)" }}
                                      onClick={(e) => handleDeleteChat(e, item.chatId)}
                                    />
                                  </Tooltip>
                                </>
                              ) : (
                                <Typography.Link
                                  key="more"
                                  style={{ fontSize: 12, padding: 0 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedActionsChatId(item.chatId);
                                  }}
                                >
                                  ...
                                </Typography.Link>
                              ),
                            ]}
                          >
                            <List.Item.Meta
                              title={
                                editingChatId === item.chatId ? (
                                  <Input
                                    size="small"
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    onBlur={() => handleSaveTitle(item.chatId)}
                                    onPressEnter={() => handleSaveTitle(item.chatId)}
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                    style={{ fontSize: 13 }}
                                  />
                                ) : (
                                  <Tooltip title={item.title} placement="topLeft">
                                    <Typography.Text ellipsis style={{ fontSize: 13 }}>
                                      {item.title}
                                    </Typography.Text>
                                  </Tooltip>
                                )
                              }
                            />
                          </List.Item>
                        )}
                      />
                    </div>
                  ))}
                </div>
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
