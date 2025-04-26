import TemplateEngine from "@src/shared/agents/services/TemplateEngine";
import type { LiquidOptions } from "liquidjs";
import { Liquid } from "liquidjs";
import Template from "@src/shared/agents/services/Template";
import TemplateRepository from "@src/shared/repositories/TemplateRepository";
import { sha256 } from "@src/shared/utils/digest";
import _ from "lodash";

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
    if (this.repo) {
      this.repo.exists(template.id).then(async (exists) => {
        if (!exists) {
          if (!template.signature) {
            template.signature = await sha256(template.template);
          }
          // Template.template field cannot be modified
          // Set the modifiedTemplate to be the same as template, user can change this field.
          template.modifiedTemplate = template.template;

          this.repo.save(template).catch((e) => {
            console.error(`Failed to save template ${template.id}: ${e}`);
          });
        }
      });
    }
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
        const t = await this.repo.find(templateId, null);
        return _.isEmpty(t.modifiedTemplate) ? t.template : t.modifiedTemplate;
      }
    }
    return this.templates.get(templateId);
  }
}

export default LiquidTemplateEngine;
