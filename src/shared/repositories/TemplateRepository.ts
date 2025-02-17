import LocalRepository from "@src/shared/repositories/LocalRepository";
import Template from "@src/shared/agents/services/Template";

class TemplateRepository extends LocalRepository<Template> {
  constructor(storage: chrome.storage.StorageArea) {
    super(storage, Template.prototype);
  }

  override toEntity(pojo: any): Template {
    return new Template(pojo);
  }
}

export default TemplateRepository;
