import ToolDefinition from "@src/shared/agents/core/ToolDefinition";

function getToolList(target): ToolDefinition[] {
  let methods = target["__tool_methods"];
  if (!methods) {
    methods = [];
    target["__tool_methods"] = methods;
  }
  return methods;
}

interface ToolDecoratorMeta {
  description: string;
  required?: string[];
  properties?: any;
}

function Tool({ description, required, properties }: ToolDecoratorMeta) {
  return function (target: any, key: string, descriptor: PropertyDescriptor) {
    const methods = getToolList(target);

    const method = new ToolDefinition({
      name: key,
      required,
      description,
      properties,
    });
    methods.push(method);
  };
}

export { Tool };
