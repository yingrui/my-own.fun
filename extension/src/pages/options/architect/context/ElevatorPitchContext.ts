import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import ElevatorPitchAgent from "@pages/options/architect/agents/ElevatorPitchAgent";
import ArchitectAgentFactory from "@pages/options/architect/agents/ArchitectAgentFactory";
import type {
  ElevatorPitchRecord,
  ElevatorPitchWithDetails,
} from "../entities/ElevatorPitchRecord";
import ElevatorPitchRepository from "@pages/options/architect/repositories/ElevatorPitchRepository";

class ElevatorPitchContext {
  config: GluonConfigure;
  private readonly agentFactory: ArchitectAgentFactory;
  private elevatorPitch: ElevatorPitchWithDetails;
  private elevatorPitchAgent: ElevatorPitchAgent;
  private elevatorPitchRepository: ElevatorPitchRepository;

  constructor(config: GluonConfigure) {
    this.config = config;
    this.agentFactory = new ArchitectAgentFactory();
    this.elevatorPitchRepository = new ElevatorPitchRepository();
  }

  async load() {
    this.elevatorPitch = await this.elevatorPitchRepository.load();
  }

  getElevatorPitch() {
    return this.elevatorPitch;
  }

  getElevatorPitchRecord() {
    return this.elevatorPitch?.record;
  }

  getElevatorPitchAgent() {
    if (!this.elevatorPitchAgent) {
      this.elevatorPitchAgent = this.agentFactory.createElevatorPitchAgent(
        this.config,
      );
    }
    return this.elevatorPitchAgent;
  }

  async saveElevatorPitch(
    details: string,
    boardUrl: string,
    feedback: string,
    generatedElevatorPitch: string,
  ) {
    const record: ElevatorPitchWithDetails = {
      record: this.elevatorPitch.record,
      details: details,
      boardUrl: boardUrl,
      feedback: feedback,
      generatedElevatorPitch: generatedElevatorPitch,
    };

    await this.elevatorPitchRepository.save(record);
  }

  updateElevatorPitch(record: ElevatorPitchRecord) {
    this.elevatorPitch.record = record;
  }

  async save() {
    await this.elevatorPitchRepository.save(this.elevatorPitch);
  }
}

export default ElevatorPitchContext;
export type { ElevatorPitchRecord };
