import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Zod schema for validation
const ConfigSchema = z.object({
  // Minecraft server
  minecraft: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(25565),
    username: z.string().default('SpeedrunBot'),
    version: z.string().optional(),
  }),
  
  // AI/LLM settings
  ai: z.object({
    provider: z.string().default('nvidia'),
    model: z.string().default('stepfun-ai/step-3.5-flash'),
    apiKey: z.string(),
    temperature: z.number().default(0.7),
    topP: z.number().default(0.9),
    maxTokens: z.number().default(16384),
    maxToolIterations: z.number().default(9999),
  }),
  
  // Bot behavior
  bot: z.object({
    autoEat: z.boolean().default(true),
    autoArmor: z.boolean().default(true),
    viewerPort: z.number().default(3000),
    dashboardPort: z.number().default(3001),
  }),
  
  // Database
  database: z.object({
    path: z.string().default('./data/bot-memory.db'),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

// Load and validate config
export const loadConfig = (): Config => {
  const config = ConfigSchema.parse({
    minecraft: {
      host: process.env.MC_HOST || 'localhost',
      port: parseInt(process.env.MC_PORT || '25565'),
      username: process.env.MC_USERNAME || 'SpeedrunBot',
      version: process.env.MC_VERSION,
    },
    ai: {
      provider: process.env.AI_PROVIDER || 'nvidia',
      model: process.env.AI_MODEL || 'stepfun-ai/step-3.5-flash',
      apiKey: process.env.NVIDIA_API_KEY || '',
      temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
      topP: parseFloat(process.env.AI_TOP_P || '0.9'),
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || '16384'),
      maxToolIterations: parseInt(process.env.AI_MAX_TOOL_ITERATIONS || '9999'),
    },
    bot: {
      autoEat: process.env.BOT_AUTO_EAT !== 'false',
      autoArmor: process.env.BOT_AUTO_ARMOR !== 'false',
      viewerPort: parseInt(process.env.VIEWER_PORT || '3000'),
      dashboardPort: parseInt(process.env.DASHBOARD_PORT || '3001'),
    },
    database: {
      path: process.env.DB_PATH || './data/bot-memory.db',
    },
  });
  
  return config;
};

export default loadConfig;
