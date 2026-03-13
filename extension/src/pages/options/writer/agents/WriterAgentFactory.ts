import WriterContext from "@src/pages/options/writer/context/WriterContext";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import intl from "react-intl-universal";
import {
  LangGraphAgent,
  createWriterEnvironmentBuilder,
} from "@src/shared/langgraph";
import { createWriterSkill } from "@src/shared/langgraph/skills/writer";
import type { ChatSession } from "@src/shared/langgraph/runtime/types";

class WriterAgentFactory {
  create(config: GluonConfigure, context: WriterContext): ChatSession {
    const name = intl.get("assistant_name").d("myFun");
    const description = intl.get("agent_description_myfun").d(
      "myFun, your browser assistant",
    );
    const writerSkill = createWriterSkill(config, context);
    const skills = [writerSkill];

    const commandOptions = [
      { value: "autocomplete", label: "/autocomplete, continue writing" },
      {
        value: "outline",
        label: intl.get("options_app_writer_command_outline").d("/outline"),
      },
      {
        value: "review",
        label: intl.get("options_app_writer_command_review").d("/review"),
      },
      {
        value: "search",
        label: intl.get("options_app_writer_command_search").d("/search"),
      },
    ];

    return new LangGraphAgent({
      config,
      name,
      description,
      contextLength: config.contextLength ?? 5,
      skills,
      commandOptions,
      getSystemPrompt: createWriterEnvironmentBuilder(config, name, () => ({
        getTitle: () => context.getTitle(),
        getContent: () => context.getContent(),
      })),
    });
  }
}

export default WriterAgentFactory;
