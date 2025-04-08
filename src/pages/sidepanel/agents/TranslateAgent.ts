import ThoughtAgent, {
  ThoughtAgentProps,
} from "@src/shared/agents/ThoughtAgent";
import Thought from "@src/shared/agents/core/Thought";
import intl from "react-intl-universal";
import ChatMessage from "@src/shared/agents/core/ChatMessage";
import { Tool } from "@src/shared/agents/decorators/tool";
import _ from "lodash";

class TranslateAgent extends ThoughtAgent {
  constructor(props: ThoughtAgentProps) {
    super(
      props,
      "Translator",
      intl
        .get("agent_description_translator")
        .d("Translator, your translation assistant"),
    );
  }

  @Tool({
    description:
      "translate given content to target language for user, default languages are Chinese & English",
    required: ["userInput", "targetLanguage"],
    properties: {
      userInput: { type: "string" },
      targetLanguage: { type: "string" },
    },
  })
  async translate(userInput: string, targetLanguage: string): Promise<Thought> {
    targetLanguage = _.isEmpty(targetLanguage)
      ? "opposite language according to user input"
      : targetLanguage;
    const prompt = `You're a translator and good at Chinese & English. Please translate to ${targetLanguage}.
Directly output the result, below is user input:
${userInput}`;

    return await this.chatCompletion({
      messages: this.getConversation().getMessages(),
      systemPrompt: prompt,
      userInput: userInput,
    });
  }
}

export default TranslateAgent;
