import Agent from "@src/shared/agents/core/Agent";
import ThoughtAgent from "@src/shared/agents/ThoughtAgent";
import DelegateAgent from "@src/shared/agents/DelegateAgent";
import GoogleAgent from "@pages/sidepanel/agents/GoogleAgent";
import LocalConversationRepository from "@src/shared/repositories/LocalConversationRepository";
import intl from "react-intl-universal";
import ChatMessage from "@src/shared/agents/core/ChatMessage";
import BaseAgentFactory from "@src/shared/configurers/BaseAgentFactory";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import { locale } from "@src/shared/utils/i18n";
import MyFunAssistant from "@pages/options/chatbot/agents/MyFunAssistant";

class AgentFactory extends BaseAgentFactory {
  create(config: GluonConfigure): Agent {
    const props = this.thoughtAgentProps(config);

    this.setInitMessages(AgentFactory.getInitialMessages(config));
    this.setConversationRepository(new LocalConversationRepository());

    const agents: ThoughtAgent[] = [
      new GoogleAgent(props),
    ];

    const agent = new MyFunAssistant(
      props,
      intl.get("assistant_name").d("myFun"),
      intl.get("agent_description_myfun").d("myFun, your browser assistant"),
      agents,
    );

    const commands = [
      { value: "search", label: intl.get("command_search").d("/search") },
    ];
    const delegateAgent = new DelegateAgent(
      agent,
      agents,
      commands,
      props.conversation,
    );

    this.postCreateAgent(delegateAgent);
    return delegateAgent;
  }

  private static getInitialSystemMessage(language: string): string {
    return intl.get("myfun_initial_system_prompt", { language: language })
      .d(`As an assistant or chrome copilot named myFun.
You can decide to call different tools or directly answer questions in ${language}, should not add assistant in answer.
Output format should be in markdown format, and use mermaid format for diagram generation.`);
  }

  public static getInitialMessages(config: GluonConfigure): ChatMessage[] {
    const language = intl.get(locale(config.language)).d("English");

    const messages = [
      new ChatMessage({
        role: "system",
        content: AgentFactory.getInitialSystemMessage(language),
      }),
    ];
    return messages;
  }
}

export default AgentFactory;
