import ThoughtAgent from "@src/shared/agents/ThoughtAgent";
import DelegateAgent from "@src/shared/agents/DelegateAgent";
import MyFun from "./MyFun";
import BACopilotAgent from "./BACopilotAgent";
import TranslateAgent from "./TranslateAgent";
import UiTestAgent from "./UiTestAgent";
import GoogleAgent from "./GoogleAgent";
import Agent from "@src/shared/agents/core/Agent";
import LocalConversationRepository from "@src/shared/repositories/LocalConversationRepository";
import intl from "react-intl-universal";
import ChatMessage from "@src/shared/agents/core/ChatMessage";
import BaseAgentFactory from "@src/shared/configurers/BaseAgentFactory";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";

class AgentFactory extends BaseAgentFactory {
  create(config: GluonConfigure, initMessages: ChatMessage[]): Agent {
    const props = this.thoughtAgentProps(config);

    const baCopilotKnowledgeApi = config.baCopilotKnowledgeApi ?? "";
    const baCopilotTechDescription = config.baCopilotTechDescription ?? "";
    const baCopilotApi = config.baCopilotApi ?? "";
    const apiKey = config.apiKey ?? "";

    this.setInitMessages(initMessages);
    this.setConversationRepository(new LocalConversationRepository());

    const agents: ThoughtAgent[] = [
      new GoogleAgent(props),
      new TranslateAgent(props),
      new UiTestAgent(props),
      new BACopilotAgent(
        props,
        baCopilotKnowledgeApi,
        baCopilotApi,
        baCopilotTechDescription,
        apiKey,
      ),
    ];

    const agent = new MyFun(
      props,
      true,
      intl.get("assistant_name").d("myFun"),
      intl.get("agent_description_myfun").d("myFun, your browser assistant"),
      agents,
    );

    const commands = [
      { value: "summary", label: intl.get("command_summary").d("/summary") },
      { value: "search", label: intl.get("command_search").d("/search") },
      { value: "tasking", label: intl.get("command_tasking").d("/tasking") },
      { value: "ui_test", label: intl.get("command_ui_test").d("/ui_test") },
      {
        value: "user_story",
        label: intl.get("command_user_story").d("/user_story"),
      },
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

  public static getInitialSystemMessage(language: string): string {
    return intl.get("myfun_initial_system_prompt", { language: language })
      .d(`As an assistant or chrome copilot named myFun.
You can decide to call different tools or directly answer questions in ${language}, should not add assistant in answer.
Output format should be in markdown format, and use mermaid format for diagram generation.`);
  }

  public static getInitialMessages(language: string): ChatMessage[] {
    const messages = [
      new ChatMessage({
        role: "system",
        content: AgentFactory.getInitialSystemMessage(language),
      }),
      new ChatMessage({
        role: "assistant",
        content: intl
          .get("myfun_greeting")
          .d("Hello! How can I assist you today?"),
      }),
    ];
    return messages;
  }
}

export default AgentFactory;
