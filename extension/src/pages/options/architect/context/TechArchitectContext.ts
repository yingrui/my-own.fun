import { GluonConfigure } from "@src/shared/storages/gluonConfig";
import ArchitectAgentFactory from "@pages/options/architect/agents/ArchitectAgentFactory";
import TechArchitectAgent from "../agents/TechArchitectAgent";

class TechArchitectContext {
  private readonly agent: TechArchitectAgent;

  constructor(config: GluonConfigure) {
    this.agent = new ArchitectAgentFactory().createTechArchitectAgent(config);
  }

  getAgent(): TechArchitectAgent {
    return this.agent;
  }
}

export default TechArchitectContext;
