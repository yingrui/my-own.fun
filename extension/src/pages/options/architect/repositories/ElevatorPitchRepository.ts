import type { ElevatorPitchWithDetails } from "@pages/options/architect/entities/ElevatorPitchRecord";

class ElevatorPitchRepository {
  private storage: chrome.storage.StorageArea;
  private readonly key = "elevator_pitch_key";

  constructor() {
    this.storage = chrome.storage.local;
  }

  async save(elevatorPitch: ElevatorPitchWithDetails): Promise<string> {
    await this.storage.set({ [this.key]: elevatorPitch });
    return this.key;
  }

  async load(): Promise<ElevatorPitchWithDetails> {
    const value = await this.storage.get([this.key]);
    const obj = value[this.key];
    if (obj) {
      return obj;
    }
    return {
      record: {
        customer: "",
        problem: "",
        productName: "",
        productType: "",
        functionality: "",
        competitors: "",
        differentiation: "",
      },
      details: "",
      boardUrl: "",
      feedback: "",
      generatedElevatorPitch: "",
    };
  }
}

export default ElevatorPitchRepository;
