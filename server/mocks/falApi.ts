// Mock implementation of FAL.ai API responses
import { randomUUID } from 'crypto';

export interface MockFalResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export const mockFalApi = {
  storage: {
    upload: async (file: Blob): Promise<string> => {
      const timestamp = Date.now();
      const randomId = randomUUID().split('-')[0];
      // Generate a consistent mock URL pattern
      return `https://v3.fal.media/files/mock/${randomId}_${timestamp}.zip`;
    }
  },

  subscribe: async (modelId: string, options: any): Promise<{ data: any }> => {
    // Simulate a successful training response
    return {
      data: {
        diffusers_lora_file: {
          url: "https://v3.fal.media/files/mock/lora_weights.safetensors",
          content_type: "application/octet-stream",
          file_name: "pytorch_lora_weights.safetensors",
          file_size: 89745224,
        },
        config_file: {
          url: "https://v3.fal.media/files/mock/config.json",
          content_type: "application/json",
          file_name: "config.json",
          file_size: 452,
        }
      }
    };
  }
};
