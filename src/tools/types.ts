// Tool types - shared across all tools

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ParameterDefinition>;
    required: string[];
  };
}

export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: ParameterDefinition;
  minimum?: number;
  maximum?: number;
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
