/**
 * DeepSeek thinking mode + tool-calls compatibility.
 * See https://api-docs.deepseek.com/guides/thinking_mode#tool-calls
 *
 * When using thinking mode with tool calls, the API requires:
 * 1. Sending back reasoning_content in each assistant message in the request.
 * 2. Enabling thinking via extra_body: { thinking: { type: "enabled" } }.
 *
 * This subclass injects reasoning_content into request messages and captures
 * reasoning_content from streaming deltas into message additional_kwargs.
 */

import {
  ChatOpenAI,
  _convertMessagesToOpenAIParams,
  messageToOpenAIRole,
} from "@langchain/openai";
import type { BaseMessage } from "@langchain/core/messages";
import { AIMessageChunk } from "@langchain/core/messages";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import type { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";

type OpenAIParam = Record<string, unknown>;

/**
 * Convert messages to OpenAI params and inject reasoning_content for assistant
 * messages so DeepSeek API receives it in tool-call sub-requests.
 */
function convertMessagesWithReasoningContent(
  messages: BaseMessage[],
  model?: string
): OpenAIParam[] {
  const mapped = _convertMessagesToOpenAIParams(messages, model) as unknown as OpenAIParam[];
  let paramIndex = 0;
  for (const message of messages) {
    const role = messageToOpenAIRole(message);
    const msg = message as { additional_kwargs?: { reasoning_content?: string; audio?: unknown } };
    const numParams =
      role === "assistant" && msg.additional_kwargs?.audio != null ? 2 : 1;
    if (role === "assistant") {
      const rc = msg.additional_kwargs?.reasoning_content;
      if (rc != null && rc !== "") {
        const param = mapped[paramIndex];
        if (param?.role === "assistant") {
          param.reasoning_content = rc;
        }
      }
    }
    paramIndex += numParams;
  }
  return mapped;
}

function isDeepSeekModel(model: string): boolean {
  return /deepseek/i.test(model);
}

export type DeepSeekChatModelFields = ConstructorParameters<typeof ChatOpenAI>[0] & {
  /** If true, enable DeepSeek thinking mode (extra_body). Default: inferred from model name. */
  enableDeepSeekThinking?: boolean;
};

/**
 * ChatOpenAI subclass that adds reasoning_content to request messages and
 * captures reasoning_content from streaming for DeepSeek thinking + tool-calls.
 */
export class DeepSeekCompatibleChatOpenAI extends ChatOpenAI {
  private enableDeepSeekThinking: boolean;

  constructor(fields?: DeepSeekChatModelFields) {
    super(fields);
    const model = fields?.model ?? this.model;
    this.enableDeepSeekThinking =
      fields?.enableDeepSeekThinking ?? isDeepSeekModel(model);
    if (this.enableDeepSeekThinking) {
      this.modelKwargs = {
        ...this.modelKwargs,
        extra_body: { thinking: { type: "enabled" } },
      };
    }
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk> {
    const messagesMapped = this.enableDeepSeekThinking
      ? convertMessagesWithReasoningContent(messages, this.model)
      : (_convertMessagesToOpenAIParams(messages, this.model) as unknown as OpenAIParam[]);

    const params = {
      ...this.invocationParams(options, { streaming: true }),
      messages: messagesMapped,
      stream: true,
    };

    let defaultRole: string | undefined;
    const rawStream = await this.completionWithRetry(
      params as unknown as Parameters<ChatOpenAI["completionWithRetry"]>[0],
      options
    );
    type StreamChunk = {
      choices?: Array<{ index?: number; delta?: Record<string, unknown> & { logprobs?: unknown }; finish_reason?: string }>;
      usage?: Record<string, unknown>;
      system_fingerprint?: string;
      model?: string;
      id?: string;
    };
    const streamIterable = rawStream as unknown as AsyncIterable<StreamChunk>;
    let usage: Record<string, unknown> | undefined;
    let accumulatedReasoning = "";

    for await (const data of streamIterable) {
      const choice = data?.choices?.[0];
      if (data.usage) {
        usage = data.usage;
      }
      if (!choice) continue;
      const { delta } = choice;
      if (!delta) continue;

      const role = (delta.role ?? defaultRole) as string;
      defaultRole = role ?? defaultRole;
      const content = (delta.content ?? "") as string;
      const reasoningDelta = (delta.reasoning_content ?? "") as string;
      if (reasoningDelta) {
        accumulatedReasoning += reasoningDelta;
      }

      let additional_kwargs: Record<string, unknown> = {};
      if (delta.function_call) {
        additional_kwargs.function_call = delta.function_call;
      }
      if (delta.tool_calls) {
        additional_kwargs.tool_calls = delta.tool_calls;
      }
      if (this.__includeRawResponse) {
        additional_kwargs.__raw_response = data;
      }
      if (accumulatedReasoning) {
        additional_kwargs.reasoning_content = accumulatedReasoning;
      }

      const toolCallChunks: Array<{ name?: string; args?: string; id?: string; index?: number; type: "tool_call_chunk" }> = [];
      if (Array.isArray(delta.tool_calls)) {
        for (const raw of delta.tool_calls as Array<{ function?: { name?: string; arguments?: string }; id?: string; index?: number }>) {
          toolCallChunks.push({
            name: raw.function?.name,
            args: raw.function?.arguments,
            id: raw.id,
            index: raw.index,
            type: "tool_call_chunk",
          });
        }
      }

      const chunk = new AIMessageChunk({
        content,
        tool_call_chunks: toolCallChunks.length > 0 ? toolCallChunks : undefined,
        additional_kwargs: Object.keys(additional_kwargs).length > 0 ? additional_kwargs : undefined,
        id: (data as { id?: string }).id,
        response_metadata: {},
      });

      const newTokenIndices = {
        prompt: options.promptIndex ?? 0,
        completion: choice.index ?? 0,
      };
      if (typeof chunk.content !== "string") {
        continue;
      }
      const generationInfo: Record<string, unknown> = { ...newTokenIndices };
      if (choice.finish_reason != null) {
        generationInfo.finish_reason = choice.finish_reason;
        generationInfo.system_fingerprint = data.system_fingerprint;
        generationInfo.model_name = data.model;
      }
      if (this.logprobs && (choice as { logprobs?: unknown }).logprobs) {
        generationInfo.logprobs = (choice as { logprobs?: unknown }).logprobs;
      }

      const generationChunk = new ChatGenerationChunk({
        message: chunk,
        text: chunk.content,
        generationInfo,
      });
      yield generationChunk;
      await runManager?.handleLLMNewToken?.(
        generationChunk.text ?? "",
        newTokenIndices,
        undefined,
        undefined,
        undefined,
        { chunk: generationChunk }
      );
    }

    if (usage) {
      const inputTokenDetails: Record<string, unknown> = {};
      const outputTokenDetails: Record<string, unknown> = {};
      const usageAny = usage as { prompt_tokens_details?: Record<string, unknown>; completion_tokens_details?: Record<string, unknown>; prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      if (usageAny.prompt_tokens_details?.audio_tokens != null) {
        inputTokenDetails.audio = usageAny.prompt_tokens_details.audio_tokens;
      }
      if (usageAny.prompt_tokens_details?.cached_tokens != null) {
        inputTokenDetails.cache_read = usageAny.prompt_tokens_details.cached_tokens;
      }
      if (usageAny.completion_tokens_details?.audio_tokens != null) {
        outputTokenDetails.audio = usageAny.completion_tokens_details.audio_tokens;
      }
      if (usageAny.completion_tokens_details?.reasoning_tokens != null) {
        outputTokenDetails.reasoning = usageAny.completion_tokens_details.reasoning_tokens;
      }
      const usageChunk = new AIMessageChunk({
        content: "",
        response_metadata: { usage: { ...usage } },
        usage_metadata: {
          input_tokens: usageAny.prompt_tokens,
          output_tokens: usageAny.completion_tokens,
          total_tokens: usageAny.total_tokens,
          ...(Object.keys(inputTokenDetails).length > 0 && { input_token_details: inputTokenDetails }),
          ...(Object.keys(outputTokenDetails).length > 0 && { output_token_details: outputTokenDetails }),
        },
      });
      yield new ChatGenerationChunk({ message: usageChunk, text: "" });
    }

    if (options.signal?.aborted) {
      throw new Error("AbortError");
    }
  }
}
