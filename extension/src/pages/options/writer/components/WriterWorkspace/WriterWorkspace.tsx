import React from "react";

import DelegateAgent from "@src/shared/agents/DelegateAgent";
import WriterSider from "@pages/options/writer/components/WriterSider/WriterSider";
import WriterContext from "@pages/options/writer/context/WriterContext";

// TODO: Choose one of the following import statements
// When your developing feature is not using Mermaid, use the following import statement:
// When ready for release, use the following import statement:
// import WriterEditor from "@pages/options/writer/components/WriterEditorWithoutMermaid";
import WriterEditor from "@pages/options/writer/components/WriterEditor";

interface WriterWorkspaceProps {
  context: WriterContext;
  agent: DelegateAgent;
}

const WriterWorkspace: React.FC<WriterWorkspaceProps> = ({
  context,
  agent,
}) => {
  return (
    <>
      <WriterSider context={context}></WriterSider>
      <WriterEditor context={context} agent={agent}></WriterEditor>
    </>
  );
};

export default WriterWorkspace;
