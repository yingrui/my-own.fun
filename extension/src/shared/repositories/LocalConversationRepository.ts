import ConversationRepository from "@src/shared/agents/ConversationRepository";
import Conversation from "@src/shared/agents/core/Conversation";
import ChatMessage from "@src/shared/agents/core/ChatMessage";

interface ConversationRecord {
  key: string;
  uuid: string;
  datetime: string;
  rounds: number;
  recordStatus: "Kept" | "Unkept";
  states: string[];
  interactions: InteractionRecord[];
}

interface InteractionRecord {
  uuid: string;
  datetime: string;
  goal: string;
  intent: string;
  intentArguments?: any;
  status: string;
  statusMessage: string;
  agentName: string;
  inputMessage: ChatMessage;
  outputMessage?: ChatMessage;
  like?: boolean;
}

class LocalConversationRepository implements ConversationRepository {
  private storage: chrome.storage.StorageArea;
  private readonly maxConversations: number;

  constructor(maxConversations = 1000) {
    this.storage = chrome.storage.local;
    this.maxConversations = maxConversations;
  }

  async save(conversation: Conversation): Promise<string> {
    const key = conversation.getKey();
    if (!key.startsWith("conversation_")) {
      throw new Error("Invalid conversation key");
    }

    const isCreateNewConversation = !(await this.exists(key));
    if (isCreateNewConversation) {
      await this.checkAndRemoveConversations();
    }

    await this.storage.set({ [key]: conversation });
    return key;
  }

  private async exists(key: string): Promise<boolean> {
    const value = await this.storage.get([key]);
    return !!value[key];
  }

  private async checkAndRemoveConversations() {
    const keys = await this.getKeys();
    if (keys.length > this.maxConversations) {
      const deleteCount = keys.length - this.maxConversations;
      const deleteKeys = await this.findUnkeptConversations(keys, deleteCount);
      for (const key of deleteKeys) {
        await this.delete(key);
      }
    }
  }

  async update(conversation: ConversationRecord): Promise<string> {
    const key = conversation.key;
    await this.storage.set({ [key]: conversation });
    return key;
  }

  async find(key: string): Promise<ConversationRecord> {
    const value = await this.storage.get([key]);
    const conversation = value[key];
    const defaultDialogueState = "chat";
    return {
      uuid: conversation.uuid,
      datetime: conversation.datetime,
      key: `conversation_${conversation.datetime}_${conversation.uuid}`,
      rounds: conversation.interactions.length,
      states: conversation.interactions.map((_) =>
        _.intent ? _.intent : defaultDialogueState,
      ),
      recordStatus: conversation.recordStatus !== "Kept" ? "Unkept" : "Kept",
      interactions: this.loadInteractions(conversation.interactions),
    };
  }

  private loadInteractions(
    interactions: InteractionRecord[],
  ): InteractionRecord[] {
    for (const i of interactions) {
      i.inputMessage = new ChatMessage(i.inputMessage);
      if (i.outputMessage) {
        i.outputMessage = new ChatMessage(i.outputMessage);
      }
    }
    return interactions;
  }

  delete(key: string): Promise<void> {
    return new Promise((resolve) => {
      this.storage.remove([key], () => {
        console.warn(`Deleted conversation with key: ${key}`);
        resolve();
      });
    });
  }

  async findAll(): Promise<ConversationRecord[]> {
    const conversations = [];
    for (const key of await this.getKeys()) {
      const record = await this.find(key);
      conversations.push(record);
    }
    return conversations;
  }

  async deleteAll(): Promise<void> {
    const keys = await this.getKeys();
    await this.storage.remove(keys);
  }

  private async getKeys(): Promise<string[]> {
    const keys = await this.storage.getKeys();
    return keys.filter((key) => key.startsWith("conversation_")).sort();
  }

  private async findUnkeptConversations(
    keys: string[],
    max: number,
  ): Promise<string[]> {
    // keys already sorted by datetime ascending
    const unkeptKeys = [];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = await this.find(key);
      if (value.recordStatus !== "Kept") {
        unkeptKeys.push(key);
      }
      if (unkeptKeys.length >= max) {
        break;
      }
    }
    return unkeptKeys;
  }
}

export default LocalConversationRepository;
export type { ConversationRecord, InteractionRecord };
