import Conversation from "./core/Conversation";

interface ConversationRepository {
  save(conversation: Conversation): Promise<string>;
}

export default ConversationRepository;
