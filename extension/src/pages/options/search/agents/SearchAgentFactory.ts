import SearchAgent from "./SearchAgent";
import BaseAgentFactory from "@src/shared/configurers/BaseAgentFactory";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";

class SearchAgentFactory extends BaseAgentFactory {
  create(config: GluonConfigure): SearchAgent {
    const props = this.thoughtAgentProps(config);
    props.enableMultimodal = false;
    return new SearchAgent(props);
  }
}

export default SearchAgentFactory;
