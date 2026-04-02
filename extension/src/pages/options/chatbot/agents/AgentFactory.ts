import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import intl from "react-intl-universal";
import {
  LangGraphAgent,
  pageContentSkill,
  researchSkill,
  filesystemSkill,
  terminalSkill,
  pythonExecutorSkill,
  createOptionsEnvironmentBuilder,
} from "@src/shared/langgraph";
import type { Skill } from "@src/shared/langgraph";
import type { ChatSession } from "@src/shared/langgraph/runtime/types";

class AgentFactory {
  create(config: GluonConfigure): ChatSession {
    const name = intl.get("assistant_name").d("myFun");
    const description = config.enableSuperAgent
      ? intl
          .get("agent_description_super")
          .d("myFun, your super agent with file, terminal, and Python access")
      : intl.get("agent_description_myfun").d("myFun, your browser assistant");

    const skills: Skill[] = config.enableSearch
      ? [pageContentSkill, researchSkill]
      : [pageContentSkill];

    if (config.enableSuperAgent) {
      skills.push(filesystemSkill, terminalSkill, pythonExecutorSkill);
    }

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
