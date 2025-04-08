import OpenAI from "openai";

interface ToolProps {
  name: string;
  description: string;
  required?: string[];
  properties?: any;
}

class ToolDefinition {
  name: string;
  description: string;
  required: string[];
  properties: any;

  constructor({ name, required, description, properties }: ToolProps) {
    this.name = name;
    this.description = description ?? "";
    this.properties = properties ?? {};
    this.required = required ?? [];
  }

  getParameterNames(): string[] {
    // return all parameter names
    return Object.keys(this.properties);
  }

  getParameterType(parameter: string): string {
    return this.properties[parameter].type;
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
          parameters: this.getParameters(),
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

  private getParameters() {
    if (this.required.length > 0) {
      return {
        type: "object",
        properties: this.properties,
        required: this.required,
      };
    }
    return {
      type: "object",
      properties: this.properties,
    };
  }
}

export default ToolDefinition;
export type { ToolProps };
