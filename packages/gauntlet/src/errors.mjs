export class SetupError extends Error {
  constructor(message) {
    super(message);
    this.name = "SetupError";
  }
}
