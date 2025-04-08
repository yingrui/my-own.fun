import ToolDefinition from "@src/shared/agents/core/ToolDefinition";
import {
  ToolNotFoundError,
  RequiredParameterMissedError,
  ToolParameterTypeError,
  InvalidToolParameterError,
} from "@src/shared/agents/core/errors/ToolErrors";

function getToolsFromClass(prototype: any): ToolDefinition[] {
  let methods = prototype["__tool_methods"];
  if (!methods) {
    methods = [];
    prototype["__tool_methods"] = methods;
  }
  return methods;
}

// private method for internal use
// get tool from class
function getTool(object: any, action: string): ToolDefinition {
  const prototype = object.constructor.prototype;
  const methods = getToolsFromClass(prototype);
  const tool = methods.find((a) => a.name === action);
  if (!tool) {
    throw new ToolNotFoundError(action);
  }
  return tool;
}

function invokeTool(object: any, action: string, args: object): any {
  const prototype = object.constructor.prototype;
  const tool = getTool(object, action);
  const members = Object.getOwnPropertyNames(prototype);
  for (const member of members) {
    if (member === action && typeof object[member] === "function") {
      const argumentList = checkArgs(tool, args);
      return object[member](...argumentList);
    }
  }
  throw new ToolNotFoundError(action);
}

function checkArgs(tool: ToolDefinition, args: any): any[] {
  // check if arguments are in tool definition
  const checkedArgs = [];
  const argumentNames = tool.getParameterNames();
  const receivedArgs = Object.keys(args);

  for (const requiredParam of tool.required) {
    if (!receivedArgs.includes(requiredParam)) {
      throw new RequiredParameterMissedError(tool.name, requiredParam);
    }
  }

  for (const param of receivedArgs) {
    // The parameters in arguments should be defined in tool definition
    // Throw error when tool's properties are not empty and the parameter is not in the white list, eg: "messages".
    const whitelist = ["messages"];
    if (
      !argumentNames.includes(param) &&
      tool.getParameterNames().length > 0 &&
      !whitelist.includes(param)
    ) {
      throw new InvalidToolParameterError(tool.name, param);
    }
  }

  for (const param of argumentNames) {
    const value = args[param];
    if (receivedArgs.includes(param)) {
      // TODO: check type of parameter
      const parameterType = tool.getParameterType(param);
      if (parameterType === "string") {
        if (!(typeof value === parameterType)) {
          throw new ToolParameterTypeError(
            tool.name,
            param,
            parameterType,
            typeof value,
          );
        }
      }
    }
    checkedArgs.push(value);
  }

  return checkedArgs;
}

interface ToolDecoratorMeta {
  description: string;
  required?: string[];
  properties?: any;
}

// Decorator for tool
function Tool({ description, required, properties }: ToolDecoratorMeta) {
  return function (target: any, key: string, descriptor: PropertyDescriptor) {
    const methods = getToolsFromClass(target);

    const method = new ToolDefinition({
      name: key,
      required,
      description,
      properties, // TODO: Need to check if properties are valid
    });
    methods.push(method);
  };
}

export { Tool, getToolsFromClass, invokeTool };
