class ToolNotFoundError extends Error {
  constructor(tool: string) {
    super(`Tool(${tool}) is not Found`);
    this.name = "ToolNotFoundError";
  }
}

class ToolParameterError extends Error {}

class RequiredParameterMissedError extends ToolParameterError {
  constructor(tool: string, parameter: string) {
    super(`Required parameter(${parameter}) of tool(${tool}) is missed`);
    this.name = "RequiredParameterMissedError";
  }
}

class ToolParameterTypeError extends ToolParameterError {
  constructor(
    tool: string,
    parameter: string,
    expectType: string,
    actualType: string,
  ) {
    super(
      `Parameter(${parameter}) type of tool(${tool}) is not matched, expected type is ${expectType}, actual is ${actualType}.`,
    );
    this.name = "ToolParameterTypeError";
  }
}

class InvalidToolParameterError extends ToolParameterError {
  constructor(tool: string, parameter: string) {
    super(`Parameter(${parameter}) is not valid for tool(${tool}).`);
    this.name = "InvalidToolParameterError";
  }
}

export {
  ToolParameterError,
  ToolNotFoundError,
  RequiredParameterMissedError,
  ToolParameterTypeError,
  InvalidToolParameterError,
};
