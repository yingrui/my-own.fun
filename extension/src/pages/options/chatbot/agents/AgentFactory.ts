import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import intl from "react-intl-universal";
import {
  LangGraphAgent,
  pageContentSkill,
  createOptionsEnvironmentBuilder,
} from "@src/shared/langgraph";
import type { ChatSession } from "@src/shared/langgraph/runtime/types";

class AgentFactory {
  create(config: GluonConfigure): ChatSession {
    const name = intl.get("assistant_name").d("myFun");
    const description = intl.get("agent_description_myfun").d(
      "myFun, your browser assistant",
    );
    const skills = config.enableSearch ? [pageContentSkill] : [];

    return new LangGraphAgent({
      config,
      name,
      description,
      contextLength: config.contextLength ?? 5,
      skills,
      getSystemPrompt: createOptionsEnvironmentBuilder(config, name),
    });
  }
}

export default AgentFactory;
