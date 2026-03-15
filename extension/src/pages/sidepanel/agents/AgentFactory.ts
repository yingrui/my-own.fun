import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import intl from "react-intl-universal";
import {
  LangGraphAgent,
  researchSkill,
  webSurfingSkill,
  createSidepanelEnvironmentBuilder,
} from "@src/shared/langgraph";
import type { Skill } from "@src/shared/langgraph";
import type { ChatSession } from "@src/shared/langgraph/runtime/types";

class AgentFactory {
  create(config: GluonConfigure): ChatSession {
    const name = intl.get("assistant_name").d("myFun");
    const description = intl.get("agent_description_myfun").d(
      "myFun, your browser assistant",
    );
    const skills: Skill[] = config.enableSearch
      ? [researchSkill, webSurfingSkill]
      : [webSurfingSkill];

    return new LangGraphAgent({
      config,
      name,
      description,
      contextLength: config.contextLength ?? 5,
      skills,
      getSystemPrompt: createSidepanelEnvironmentBuilder(config, name),
    });
  }
}

export default AgentFactory;
