class SensitiveTopicError extends Error {
  constructor(message: string = "sensitive content") {
    super(message);
    this.name = "SensitiveTopicError";
  }
}

export default SensitiveTopicError;
