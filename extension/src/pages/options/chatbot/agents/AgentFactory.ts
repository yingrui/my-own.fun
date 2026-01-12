import MyFunAssistant from "@pages/options/chatbot/agents/MyFunAssistant";
import GoogleAgent from "@pages/sidepanel/agents/GoogleAgent";
import Agent from "@src/shared/agents/core/Agent";
import DelegateAgent from "@src/shared/agents/DelegateAgent";
import ThoughtAgent from "@src/shared/agents/ThoughtAgent";
import BaseAgentFactory from "@src/shared/configurers/BaseAgentFactory";
import LocalConversationRepository from "@src/shared/repositories/LocalConversationRepository";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import intl from "react-intl-universal";

class AgentFactory extends BaseAgentFactory {
  create(config: GluonConfigure): Agent {
    const props = this.thoughtAgentProps(config);

    this.setConversationRepository(new LocalConversationRepository());

    const agents: ThoughtAgent[] = [new GoogleAgent(props)];

    const agent = new MyFunAssistant(
      props,
      intl.get("assistant_name").d("myFun"),
      intl.get("agent_description_myfun").d("myFun, your browser assistant"),
      agents,
    );

    let commands = [
      { value: "search", label: intl.get("command_search").d("/search") },
    ];

    if (!config.enableSearch) {
      agent.setDisabledTool("search");
      commands = [];
    }

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
