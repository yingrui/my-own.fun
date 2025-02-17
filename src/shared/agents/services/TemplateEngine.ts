import Template from "@src/shared/agents/services/Template";

interface TemplateEngine {
  add(template: Template): TemplateEngine;

  render(templateId: string, data: any): Promise<string>;
}

export default TemplateEngine;
