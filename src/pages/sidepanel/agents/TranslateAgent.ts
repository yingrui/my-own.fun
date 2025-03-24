import ThoughtAgent, {
  ThoughtAgentProps,
} from "@src/shared/agents/ThoughtAgent";
import Thought from "@src/shared/agents/core/Thought";
import intl from "react-intl-universal";
import ChatMessage from "@src/shared/agents/core/ChatMessage";

class TranslateAgent extends ThoughtAgent {
  constructor(props: ThoughtAgentProps) {
    super(
      props,
      "Translator",
      intl
        .get("agent_description_translator")
        .d("Translator, your translation assistant"),
    );
    this.addTool(
      "translate",
      "translate given content to target language for user, default languages are Chinese & English",
      ["userInput", "targetLanguage"],
    );
  }

  async translate(args: object, messages: ChatMessage[]): Promise<Thought> {
    const userInput = args["userInput"];
    const targetLanguage =
      args["targetLanguage"] || "opposite language according to user input";
    const prompt = `You're a translator and good at Chinese & English. Please translate to ${targetLanguage}.
Directly output the result, below is user input:
${userInput}`;

    return await this.chatCompletion({
      messages: messages,
      systemPrompt: prompt,
      userInput: userInput,
    });
  }
}

export default TranslateAgent;
