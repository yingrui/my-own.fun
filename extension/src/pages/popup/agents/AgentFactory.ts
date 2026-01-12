import BaseAgentFactory from "@root/src/shared/configurers/BaseAgentFactory";
import { GluonConfigure } from "@src/shared/storages/gluonConfig";
import BrowserCopilot from "@pages/popup/agents/BrowserCopilot";

class AgentFactory extends BaseAgentFactory {
  create(config: GluonConfigure): BrowserCopilot {
    return new BrowserCopilot(this.thoughtAgentProps(config));
  }
}

export default AgentFactory;
