// Tool types - shared across all tools (AIO-LLM format)

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, ParameterDefinition>;
}

export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  enum?: string[];
  items?: ParameterDefinition;
  minimum?: number;
  maximum?: number;
  default?: any;
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface ToolContext {
  bot: any; // Mineflayer Bot instance
  logger: any; // Winston logger
}

export type ToolHandler = (
  params: Record<string, any>,
  context: ToolContext
) => Promise<ToolResult>;
