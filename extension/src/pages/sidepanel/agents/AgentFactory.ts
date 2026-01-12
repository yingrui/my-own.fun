import Agent from "@src/shared/agents/core/Agent";
import DelegateAgent from "@src/shared/agents/DelegateAgent";
import ThoughtAgent from "@src/shared/agents/ThoughtAgent";
import BaseAgentFactory from "@src/shared/configurers/BaseAgentFactory";
import LocalConversationRepository from "@src/shared/repositories/LocalConversationRepository";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import intl from "react-intl-universal";
import BACopilotAgent from "./BACopilotAgent";
import GoogleAgent from "./GoogleAgent";
import MyFunCopilot from "./MyFunCopilot";
import TranslateAgent from "./TranslateAgent";
import UiTestAgent from "./UiTestAgent";

class AgentFactory extends BaseAgentFactory {
  create(config: GluonConfigure): Agent {
    const props = this.thoughtAgentProps(config);

    const baCopilotKnowledgeApi = config.baCopilotKnowledgeApi ?? "";
    const baCopilotTechDescription = config.baCopilotTechDescription ?? "";
    const baCopilotApi = config.baCopilotApi ?? "";
    const apiKey = config.apiKey ?? "";

    this.setConversationRepository(new LocalConversationRepository());

    const agents: ThoughtAgent[] = [
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

    if (config.enableSearch) {
      agents.push(new GoogleAgent(props));
    }

    const agent = new MyFunCopilot(
      props,
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
}

export default AgentFactory;
