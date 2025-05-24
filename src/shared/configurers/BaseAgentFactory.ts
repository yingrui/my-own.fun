import ConversationRepository from "@src/shared/agents/ConversationRepository";
import DelegateAgent from "@src/shared/agents/DelegateAgent";
import ThoughtAgent, {
  ThoughtAgentProps,
} from "@src/shared/agents/ThoughtAgent";
import Agent from "@src/shared/agents/core/Agent";
import Conversation from "@src/shared/agents/core/Conversation";
import DeepSeekModelService from "@src/shared/agents/services/DeepSeekModelService";
import DefaultModelService from "@src/shared/agents/services/DefaultModelService";
import GPTModelService from "@src/shared/agents/services/GPTModelService";
import type { ModelProvider } from "@src/shared/agents/services/ModelService";
import ModelService from "@src/shared/agents/services/ModelService";
import OllamaModelService from "@src/shared/agents/services/OllamaModelService";
import PromptChainOfThoughtService from "@src/shared/agents/services/PromptChainOfThoughtService";
import TemplateRepository from "@src/shared/repositories/TemplateRepository";
import LiquidTemplateEngine from "@src/shared/services/LiquidTemplateEngine";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import { locale } from "@src/shared/utils/i18n";
import OpenAI from "openai";
import intl from "react-intl-universal";
import TemplateEngine from "../agents/services/TemplateEngine";

class BaseAgentFactory {
  private repository: ConversationRepository;

  thoughtAgentProps(config: GluonConfigure): ThoughtAgentProps {
    const templateRepository = new TemplateRepository(chrome.storage.local);
    const templateEngine = new LiquidTemplateEngine({}, templateRepository);
    const modelService = this.createModelService(config);
    const language = intl.get(locale(config.language)).d("English");
    const contextLength = config.contextLength ?? 5;
    const chainOfThoughtService =
      config.enableReflection || config.enableChainOfThoughts
        ? this.createReflectionService(
            modelService,
            language,
            templateEngine,
            contextLength,
          )
        : null;
    return {
      language: language,
      conversation: new Conversation(),
      enableMultimodal: config.enableMultimodal ?? false,
      enableReflection: config.enableReflection ?? false,
      enableChainOfThoughts: config.enableChainOfThoughts ?? false,
      contextLength: contextLength,
      modelService: modelService,
      reflectionService: chainOfThoughtService,
      thoughtService: chainOfThoughtService,
      templateEngine: templateEngine,
    };
  }

  private createModelService(config: GluonConfigure) {
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      organization: config.organization,
      dangerouslyAllowBrowser: true,
    });

    const modelName: string = config.defaultModel ?? "glm-4-plus";
    const reasoningModel: string = config.reasoningModel ?? null;
    const toolsCallModel: string = config.toolsCallModel ?? null;
    const multimodalModel: string = config.multimodalModel ?? null;

    const modelProvider = this.getModelProvider(config.baseURL);
    const modelServiceProps = {
      client,
      modelName,
      reasoningModel,
      toolsCallModel,
      multimodalModel,
    };
    switch (modelProvider) {
      case "openai.com":
        return new GPTModelService(modelServiceProps);
      case "ollama":
        return new OllamaModelService(modelServiceProps);
      case "deepseek":
        return new DeepSeekModelService(modelServiceProps);
      default:
        return new DefaultModelService(modelServiceProps);
    }
  }

  postCreateAgent(agent: Agent): Agent {
    if (
      this.repository &&
      (agent instanceof DelegateAgent || agent instanceof ThoughtAgent)
    ) {
      agent.setConversationRepository(this.repository);
    }
    return agent;
  }

  public setConversationRepository(repository: ConversationRepository) {
    this.repository = repository;
  }

  private getModelProvider(baseURL: string): ModelProvider {
    if (baseURL.startsWith("https://api.openai.com/v1")) {
      return "openai.com";
    } else if (baseURL.startsWith("https://open.bigmodel.cn/api/paas/v4")) {
      return "zhipu.ai";
    } else if (baseURL.includes(":11434/v1")) {
      return "ollama";
    } else if (baseURL.includes("api.deepseek.com")) {
      return "deepseek";
    }
    return "custom";
  }

  private createReflectionService(
    modelService: ModelService,
    language: string,
    templateEngine: TemplateEngine,
    contextLength: number,
  ): PromptChainOfThoughtService {
    return new PromptChainOfThoughtService(
      modelService,
      language,
      templateEngine,
      contextLength,
    );
  }
}

export default BaseAgentFactory;
