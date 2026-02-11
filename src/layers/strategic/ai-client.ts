import { AIO } from 'aio-llm';
import type { Config } from '../../core/config';
import type { Message } from '../../types/index';
import type { ToolDefinition } from '../../tools/types';

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  responseFormat?: 
    | { type: 'json_object' }
    | { 
        type: 'json_schema';
        json_schema: {
          name: string;
          strict?: boolean;
          schema: Record<string, any>;
        };
      };
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
  private toolRouter: any; // ToolRouter instance for executing tools

  constructor(config: Config, logger: any, toolRouter?: any) {
    this.config = config.ai;
    this.logger = logger;
    this.toolRouter = toolRouter;

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
   * Chat with tool calling support (STREAMING MODE for stepfun-ai)
   */
  async chatWithTools(
    messages: Message[],
    tools: ToolDefinition[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    try {
      const formattedMessages = this.formatMessages(messages);
      const formattedTools = this.formatTools(tools);

      this.logger.debug('Sending STREAMING chat request with tools', {
        messageCount: formattedMessages.length,
        toolCount: formattedTools.length,
        model: this.config.model,
      });

      // Tool call results storage
      const toolCalls: ToolCall[] = [];
      let contentParts: string[] = [];

      // Tool handler that executes tools via ToolRouter
      const onToolCall = async (call: any) => {
        this.logger.info('🔧 Tool call detected:', call.name, call.params);

        const toolCallId = call.id || `call_${Date.now()}`;
        
        toolCalls.push({
          id: toolCallId,
          name: call.name,
          arguments: call.params,
        });

        // Execute tool if ToolRouter is available
        if (this.toolRouter) {
          try {
            const result = await this.toolRouter.executeTool({
              id: toolCallId,
              name: call.name,
              arguments: call.params,
            });

            this.logger.info('✅ Tool executed:', call.name, {
              success: result.success,
              message: result.message,
            });

            // Return result to aio-llm
            return result.data || result.message || { success: result.success };
          } catch (error: any) {
            this.logger.error('❌ Tool execution failed:', call.name, error);
            return { error: error.message || String(error) };
          }
        }

        // Fallback if no ToolRouter
        this.logger.warn('⚠️ No ToolRouter available, returning pending');
        return { pending: true };
      };

      // Use streaming mode for tool calling
      const stream = await this.aio.chatCompletionStream({
        provider: this.config.provider,
        model: this.config.model,
        messages: formattedMessages,
        tools: formattedTools,
        onToolCall: onToolCall,
        maxToolIterations: this.config.maxToolIterations, // Use config value
        temperature: options.temperature ?? this.config.temperature,
        max_tokens: options.maxTokens ?? this.config.maxTokens,
        top_p: this.config.topP,
      });

      // Process stream
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk: any) => {
          try {
            const chunkStr = chunk.toString();
            if (!chunkStr.startsWith('data: ')) return;

            const data = JSON.parse(chunkStr.slice(6));

            // Collect text content
            if (data.choices?.[0]?.delta?.content) {
              contentParts.push(data.choices[0].delta.content);
            }
          } catch (e: any) {
            // Skip invalid chunks
          }
        });

        stream.on('end', () => resolve());
        stream.on('error', (err: any) => reject(err));
      });

      const content = contentParts.join('');

      this.logger.debug('Received STREAMING chat response', {
        contentLength: content.length,
        toolCallCount: toolCalls.length,
      });

      // Note: Usage not available in streaming mode
      return {
        content,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
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
