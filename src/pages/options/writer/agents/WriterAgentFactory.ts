import WriterContext from "@src/pages/options/writer/context/WriterContext";
import DelegateAgent from "@src/shared/agents/DelegateAgent";
import BaseAgentFactory from "@src/shared/configurers/BaseAgentFactory";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import intl from "react-intl-universal";
import WriterAgent from "./WriterAgent";

class WriterAgentFactory extends BaseAgentFactory {
  create(config: GluonConfigure, context: WriterContext): DelegateAgent {
    const props = this.thoughtAgentProps(config);
    props.enableMultimodal = false;
    props.enableReflection = false;

    const commands = [
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

    const writerAgent = new WriterAgent(props, context);
    const delegateAgent = new DelegateAgent(
      writerAgent,
      [writerAgent],
      commands,
      props.conversation,
      true, //chitchat when tool not found
    );
    this.postCreateAgent(delegateAgent);
    return delegateAgent;
  }
}

export default WriterAgentFactory;
