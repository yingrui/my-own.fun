import { ModelProvider, ModelServiceProps } from "./ModelService";
import DefaultModelService from "@src/shared/agents/services/DefaultModelService";

/**
 * GPT Model Service
 * NOTE: It's hard to maintain this, due to "Country, region, or territory not supported" error
 * @implements {ModelService}
 * @class
 */
class GPTModelService extends DefaultModelService {
  override modelProviders: ModelProvider[] = ["openai.com", "custom"];
  override supportedModels: string[] = ["gpt-4-turbo", "gpt-4o-mini"];
  maxTokens: number = 4096;

  constructor(props: ModelServiceProps) {
    super(props);
  }

  override isMultimodalModel(modelName: string): boolean {
    return modelName === "glm-4v-plus" || modelName === "gpt-4o-mini";
  }
}

export default GPTModelService;
