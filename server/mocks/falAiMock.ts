import express from 'express';
import type { Request, Response } from 'express';

const router = express.Router();

// Mock data for FAL.ai responses
const mockResponses = {
  trainingComplete: {
    diffusers_lora_file: {
      url: "https://mock.fal.ai/files/mock-lora-weights.safetensors",
      content_type: "application/octet-stream",
      file_name: "mock_lora_weights.safetensors",
      file_size: 89745224
    },
    config_file: {
      url: "https://mock.fal.ai/files/mock-config.json",
      content_type: "application/json",
      file_name: "config.json",
      file_size: 452
    }
  }
};

// Mock FAL.ai training endpoint
router.post('/flux-lora-fast-training', (req: Request, res: Response) => {
  // Simulate processing delay
  setTimeout(() => {
    res.json({
      status: 'completed',
      data: mockResponses.trainingComplete,
      logs: [
        { message: 'Mock training started' },
        { message: 'Processing images' },
        { message: 'Training completed successfully' }
      ]
    });
  }, 2000);
});

// Mock FAL.ai file upload endpoint
router.post('/upload', (req: Request, res: Response) => {
  // Generate a mock URL for the uploaded file
  const mockUrl = `https://mock.fal.ai/files/upload-${Date.now()}.zip`;
  res.json({ url: mockUrl });
});

export { router as falAiMockRouter };
