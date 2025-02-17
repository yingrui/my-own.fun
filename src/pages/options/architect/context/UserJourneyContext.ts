import { GluonConfigure } from "@src/shared/storages/gluonConfig";
import ArchitectAgentFactory from "@pages/options/architect/agents/ArchitectAgentFactory";
import UserJourneyAgent from "@pages/options/architect/agents/UserJourneyAgent";
import { UserJourneyRecord } from "@pages/options/architect/entities/UserJourneyRecord";
import LocalRepository from "@src/shared/repositories/LocalRepository";

class UserJourneyContext {
  private config: GluonConfigure;
  private storage: LocalRepository<UserJourneyRecord>;
  private readonly agent: UserJourneyAgent;
  private readonly userJourneyStorageId = "userJourney";

  constructor(config: GluonConfigure) {
    this.config = config;
    this.storage = new LocalRepository(chrome.storage.local);
    this.agent = new ArchitectAgentFactory().createUserJourneyAgent(config);
  }

  async load(): Promise<UserJourneyRecord> {
    return await this.storage.find(this.userJourneyStorageId);
  }

  async save(userJourney: UserJourneyRecord): Promise<void> {
    userJourney.id = this.userJourneyStorageId;
    await this.storage.save(userJourney);
  }

  getAgent(): UserJourneyAgent {
    return this.agent;
  }
}

export default UserJourneyContext;
