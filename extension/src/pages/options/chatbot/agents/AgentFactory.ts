import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import intl from "react-intl-universal";
import {
  LangGraphAgent,
  pageContentSkill,
  researchSkill,
  createOptionsEnvironmentBuilder,
  createResearchEnvironmentBuilder,
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
      ? [pageContentSkill, researchSkill]
      : [pageContentSkill];

    return new LangGraphAgent({
      config,
      name,
      description,
      contextLength: config.contextLength ?? 5,
      skills,
      getSystemPrompt: createOptionsEnvironmentBuilder(config, name),
      commandOptions: [
        { value: "summary", label: "/summary" },
        { value: "search", label: "/search" },
        { value: "research", label: "/research" },
      ],
      commandSystemPrompts: {
        research: createResearchEnvironmentBuilder(config, name),
      },
    });
  }
}

export default AgentFactory;
