import PromptTemplate from "@src/shared/agents/services/PromptTemplate";

interface TemplateEngine {
  add(template: PromptTemplate): TemplateEngine;

  render(templateId: string, data: any): Promise<string>;
}

export default TemplateEngine;
