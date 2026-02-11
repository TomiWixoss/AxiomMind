import { AIO } from 'aio-llm';
import type { Config } from '../../core/config';
import type { Message } from '../../types/index';
import type { ToolDefinition } from '../../tools/types';

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  responseFormat?: { type: 'json_object' };
}

export interface ChatResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export class AIClient {
  private aio: any;
  private config: Config['ai'];
  private logger: any;

  constructor(config: Config, logger: any) {
    this.config = config.ai;
    this.logger = logger;

    // Validate API key
    if (!this.config.apiKey) {
      throw new Error('AI API key is required');
    }

    // Initialize AIO client
    this.aio = new AIO({
      providers: [{
        provider: this.config.provider as any,
        apiKeys: [{ key: this.config.apiKey }],
        models: [{ modelId: this.config.model }],
      }],
    });

    this.logger.info('AIClient initialized', {
      provider: this.config.provider,
      model: this.config.model,
    });
  }

  /**
   * Get current config
   */
  getConfig(): Config['ai'] {
    return { ...this.config };
  }

  /**
   * Format messages for API
   */
  formatMessages(messages: Message[]): Message[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Simple chat without tools
   */
  async chat(
    messages: Message[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    try {
      const formattedMessages = this.formatMessages(messages);

      this.logger.debug('Sending chat request', {
        messageCount: formattedMessages.length,
        model: this.config.model,
        responseFormat: options.responseFormat,
      });

      const response = await this.aio.chatCompletion({
        provider: this.config.provider,
        model: this.config.model,
        messages: formattedMessages,
        temperature: options.temperature ?? this.config.temperature,
        max_tokens: options.maxTokens ?? this.config.maxTokens,
        top_p: this.config.topP,
        response_format: options.responseFormat,
      });

      this.logger.debug('Received chat response', {
        usage: response.usage,
      });

      return {
        content: response.choices[0].message.content,
        usage: response.usage,
      };
    } catch (error) {
      this.logger.error('Error in chat', error);
      throw error;
    }
  }

  /**
   * Chat with tool calling support
   */
  async chatWithTools(
    messages: Message[],
    tools: ToolDefinition[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    try {
      const formattedMessages = this.formatMessages(messages);
      const formattedTools = this.formatTools(tools);

      this.logger.debug('Sending chat request with tools', {
        messageCount: formattedMessages.length,
        toolCount: formattedTools.length,
        model: this.config.model,
      });

      const response = await this.aio.chatCompletion({
        provider: this.config.provider,
        model: this.config.model,
        messages: formattedMessages,
        tools: formattedTools,
        temperature: options.temperature ?? this.config.temperature,
        max_tokens: options.maxTokens ?? this.config.maxTokens,
        top_p: this.config.topP,
      });

      const message = response.choices[0].message;

      // Check for tool calls
      const toolCalls = message.tool_calls?.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      }));

      this.logger.debug('Received chat response', {
        usage: response.usage,
        hasToolCalls: !!toolCalls,
        toolCallCount: toolCalls?.length || 0,
      });

      return {
        content: message.content || '',
        usage: response.usage,
        toolCalls,
      };
    } catch (error) {
      this.logger.error('Error in chatWithTools', error);
      throw error;
    }
  }

  /**
   * Format tools for API (already in aio-llm format)
   */
  private formatTools(tools: ToolDefinition[]): any[] {
    return tools;
  }

  /**
   * Stream chat response
   */
  async *streamChat(
    messages: Message[],
    options: ChatOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    try {
      const formattedMessages = this.formatMessages(messages);

      this.logger.debug('Starting chat stream', {
        messageCount: formattedMessages.length,
      });

      const stream = await this.aio.chatCompletionStream({
        provider: this.config.provider,
        model: this.config.model,
        messages: formattedMessages,
        temperature: options.temperature ?? this.config.temperature,
        max_tokens: options.maxTokens ?? this.config.maxTokens,
        top_p: this.config.topP,
      });

      for await (const chunk of stream) {
        const chunkStr = chunk.toString();
        if (chunkStr.startsWith('data: ')) {
          const data = JSON.parse(chunkStr.slice(6));
          const content = data.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        }
      }
    } catch (error) {
      this.logger.error('Error in streamChat', error);
      throw error;
    }
  }
}

export default AIClient;
