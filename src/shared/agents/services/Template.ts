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
  agent: string;
  name: string;
  template: string;
  parameters: Parameter[];

  constructor(pojo: any) {
    this.name = pojo.name;
    this.id = `${Template.prototype["_from"]}${this.name}`;

    this.agent = pojo.agent;
    this.template = pojo.template;
    this.parameters = pojo.parameters;
  }
}

export default Template;
export { Parameter };
