interface Config {
  falAiApiKey: string;
  falAiBaseUrl: string;
  aiTrainingApiEnv: string;
}

export const config: Config = {
  falAiApiKey: import.meta.env.VITE_FAL_AI_API_KEY || '',
  falAiBaseUrl: import.meta.env.VITE_AI_TRAINING_API_ENV === 'mock'
    ? 'http://localhost:5001'
    : 'https://fal.ai',
  aiTrainingApiEnv: import.meta.env.VITE_AI_TRAINING_API_ENV || 'production'
};

// Validate required environment variables
const requiredEnvVars = {
  'VITE_FAL_AI_API_KEY': config.falAiApiKey,
};

Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    console.error(`Missing required environment variable: ${key}`);
  }
});