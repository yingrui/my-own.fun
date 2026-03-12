import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import type { PopupAgent } from "./PopupAgent";
import { createPopupAgent } from "./PopupAgent";

class AgentFactory {
  async create(config: GluonConfigure): Promise<PopupAgent> {
    return createPopupAgent(config);
  }
}

export default AgentFactory;
