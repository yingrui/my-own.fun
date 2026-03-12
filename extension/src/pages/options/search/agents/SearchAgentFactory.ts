import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import {
  createSearchAgent,
  type SearchAgentInterface,
} from "./SearchLangGraphAgent";

class SearchAgentFactory {
  create(config: GluonConfigure): SearchAgentInterface {
    return createSearchAgent(config);
  }
}

export default SearchAgentFactory;
