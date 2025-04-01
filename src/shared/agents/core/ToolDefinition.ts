import OpenAI from "openai";

class ToolDefinition {
  name: string;
  description: string;
  properties: any;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
    this.properties = {};
  }

  setStringParameter(name: string) {
    this.properties[name] = { type: "string" };
  }

  setEnumParameter(name: string, enumValues: string[]) {
    this.properties[name] = { type: "string", enum: enumValues };
  }

  getFunction(): OpenAI.Chat.Completions.ChatCompletionTool {
    if (Object.keys(this.properties).length > 0) {
      return {
        type: "function",
        function: {
          name: this.name,
          description: this.description,
          parameters: {
            type: "object",
            properties: this.properties,
          },
        },
      };
    }

    return {
      type: "function",
      function: {
        name: this.name,
        description: this.description,
      },
    };
  }
}

export default ToolDefinition;
