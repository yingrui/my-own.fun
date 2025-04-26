import { Id, Entity } from "@src/shared/agents/decorators/entity";

interface Parameter {
  name: string;
  type: string;
  defaultValue: string;
}

@Entity("__template_")
class Template {
  @Id
  id: string;
  class: string;
  name: string;
  template: string;
  modifiedTemplate: string;
  signature: string;
  parameters: Parameter[];

  constructor(pojo: any) {
    this.name = pojo.name;
    this.id = `${Template.prototype["_from"]}${this.name}`;

    this.class = pojo.class;
    this.template = pojo.template;
    this.modifiedTemplate = pojo.modifiedTemplate;
    this.parameters = pojo.parameters;
    this.signature = pojo.signature;
  }
}

export default Template;
export { Parameter };
