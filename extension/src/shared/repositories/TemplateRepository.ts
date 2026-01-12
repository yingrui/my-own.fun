import LocalRepository from "@src/shared/repositories/LocalRepository";
import PromptTemplate from "@src/shared/agents/services/PromptTemplate";

class TemplateRepository extends LocalRepository<PromptTemplate> {
  constructor(storage: chrome.storage.StorageArea) {
    super(storage, PromptTemplate.prototype);
  }

  override toEntity(pojo: any): PromptTemplate {
    return new PromptTemplate(pojo);
  }
}

export default TemplateRepository;
