import ChatMessage from "../core/ChatMessage";
import Conversation from "../core/Conversation";
import Interaction from "../core/Interaction";

interface ContextTransformer {
  toMessages(conversation: Conversation): ChatMessage[];
}

class DefaultContextTransformer implements ContextTransformer {
  toMessages(conversation: Conversation): ChatMessage[] {
    const messages = conversation.getMessages();
    const systemPrompt = conversation.getSystemPrompt();
    if (systemPrompt) {
      messages.unshift(
        new ChatMessage({ role: "system", content: systemPrompt }),
      );
    }
    const interactionMessages = this.toInteractionMessages(
      conversation.getCurrentInteraction(),
    );
    return [...messages, ...interactionMessages];
  }

  private toInteractionMessages(interaction: Interaction): ChatMessage[] {
    const messages: ChatMessage[] = [];
    const steps = interaction.getSteps();
    for (const step of steps) {
      if (step.status === "completed") {
        if (step.systemMessage) {
          messages.push(
            new ChatMessage({ role: "system", content: step.systemMessage }),
          );
        }
        if (step.result) {
          messages.push(
            new ChatMessage({ role: "assistant", content: step.result }),
          );
        }
      }
    }
    return messages;
  }
}

export default ContextTransformer;
export { DefaultContextTransformer };
