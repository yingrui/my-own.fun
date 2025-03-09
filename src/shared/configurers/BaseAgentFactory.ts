import OpenAI from "openai";
import ThoughtAgent, {
  ThoughtAgentProps,
} from "@src/shared/agents/ThoughtAgent";
import Conversation from "@src/shared/agents/core/Conversation";
import Agent from "@src/shared/agents/core/Agent";
import ConversationRepository from "@src/shared/agents/ConversationRepository";
import TemplateEngine from "@src/shared/agents/services/TemplateEngine";
import intl from "react-intl-universal";
import ChatMessage from "@src/shared/agents/core/ChatMessage";
import { locale } from "@src/shared/utils/i18n";
import type { GluonConfigure } from "@src/shared/storages/gluonConfig";
import type { ModelProvider } from "@src/shared/agents/services/ModelService";
import ModelService from "@src/shared/agents/services/ModelService";
import DefaultModelService from "@src/shared/agents/services/DefaultModelService";
import GPTModelService from "@src/shared/agents/services/GPTModelService";
import ReflectionService from "@src/shared/agents/services/ReflectionService";
import PromptChainOfThoughtService from "@src/shared/agents/services/PromptChainOfThoughtService";
import DelegateAgent from "@src/shared/agents/DelegateAgent";
import LiquidTemplateEngine from "@src/shared/services/LiquidTemplateEngine";
import TemplateRepository from "@src/shared/repositories/TemplateRepository";
import OllamaModelService from "@src/shared/agents/services/OllamaModelService";

class BaseAgentFactory {
  private repository: ConversationRepository;
  private initMessages: ChatMessage[];

  thoughtAgentProps(config: GluonConfigure): ThoughtAgentProps {
    const modelService = this.createModelService(config);
    const language = intl.get(locale(config.language)).d("English");
    const enableChainOfThoughts = config.enableChainOfThoughts ?? false;
    const chainOfThoughtService =
      config.enableReflection || config.enableChainOfThoughts
        ? this.createReflectionService(
            modelService,
            language,
            enableChainOfThoughts,
          )
        : null;
    const templateEngine = new LiquidTemplateEngine(
      {},
      new TemplateRepository(chrome.storage.local),
    );
    return {
      language: language,
      conversation: new Conversation(),
      enableMultimodal: config.enableMultimodal ?? false,
      enableReflection: config.enableReflection ?? false,
      enableChainOfThoughts: enableChainOfThoughts,
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
    const toolsCallModel: string = config.toolsCallModel ?? null;
    const multimodalModel: string = config.multimodalModel ?? null;

    const modelProvider = this.getModelProvider(config.baseURL);
    switch (modelProvider) {
      case "openai.com":
        return new GPTModelService({
          client,
          modelName,
          toolsCallModel,
          multimodalModel,
        });
      case "ollama":
        return new OllamaModelService({
          client,
          modelName,
          toolsCallModel,
          multimodalModel,
        });
      default:
        return new DefaultModelService({
          client,
          modelName,
          toolsCallModel,
          multimodalModel,
        });
    }
  }

  postCreateAgent(agent: Agent): Agent {
    if (this.initMessages && this.initMessages.length > 0) {
      agent.getConversation().reset(this.initMessages);
    }

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

  public setInitMessages(initMessages: ChatMessage[]) {
    this.initMessages = initMessages;
  }

  private getModelProvider(baseURL: string): ModelProvider {
    if (baseURL.startsWith("https://api.openai.com/v1")) {
      return "openai.com";
    } else if (baseURL.startsWith("https://open.bigmodel.cn/api/paas/v4")) {
      return "zhipu.ai";
    } else if (baseURL.includes(":11434/v1")) {
      return "ollama";
    }
    return "custom";
  }

  private createReflectionService(
    modelService: ModelService,
    language: string,
    enableChainOfThoughts: boolean,
  ): PromptChainOfThoughtService {
    return new PromptChainOfThoughtService(
      modelService,
      language,
      enableChainOfThoughts,
    );
  }
}

export default BaseAgentFactory;
