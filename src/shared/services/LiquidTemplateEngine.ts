import TemplateEngine from "@src/shared/agents/services/TemplateEngine";
import { Liquid, LiquidOptions } from "liquidjs";
import Template from "@src/shared/agents/services/Template";
import TemplateRepository from "@src/shared/repositories/TemplateRepository";

/**
 * Liquid template engine implementation based on liquidjs
 */
class LiquidTemplateEngine implements TemplateEngine {
  private templates: Map<string, string> = new Map<string, string>();
  private engine: Liquid;
  private repo: TemplateRepository;

  constructor(options: LiquidOptions, repo: TemplateRepository = null) {
    this.engine = new Liquid(options);
    this.repo = repo;
  }

  add(template: Template): TemplateEngine {
    this.templates.set(template.id, template.template);
    return this;
  }

  async render(templateId: string, data: any): Promise<string> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    return await this.engine.parseAndRender(template, data);
  }

  private async getTemplate(templateId: string): Promise<string> {
    if (this.repo) {
      if (await this.repo.find(templateId)) {
        return (await this.repo.find(templateId, null)).template;
      }
    }
    return this.templates.get(templateId);
  }
}

export default LiquidTemplateEngine;
