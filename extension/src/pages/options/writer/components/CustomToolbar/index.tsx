import { message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { commands, TextAreaTextApi } from "@uiw/react-md-editor";
import type { ICommand, TextState } from "@uiw/react-md-editor";
import WriterContext from "@pages/options/writer/context/WriterContext";
import DocumentRepository from "@pages/options/writer/repositories/DocumentRepository";
import intl from "react-intl-universal";

function toolbarCommands(context: WriterContext): ICommand[] {
  const save: ICommand = {
    name: "save",
    keyCommand: "save",
    buttonProps: { "aria-label": "Save", title: "Save document" },
    icon: <SaveOutlined />,
    execute: (state: TextState, api: TextAreaTextApi) => {
      const repository = new DocumentRepository();
      repository.save(context.getTitle(), context.getContent()).then(() => {
        message.success(
          intl
            .get("options_app_writer_save_document")
            .d("Document saved successfully!"),
          3,
        );
      });
    },
  };

  return [save, commands.divider, ...commands.getCommands()];
}

export default toolbarCommands;
