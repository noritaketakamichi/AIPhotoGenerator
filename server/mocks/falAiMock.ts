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
    },
    training_logs: [
      { timestamp: Date.now(), message: "Starting training process" },
      { timestamp: Date.now() + 500, message: "Loading dataset" },
      { timestamp: Date.now() + 1000, message: "Processing images" },
      { timestamp: Date.now() + 1500, message: "Training model" },
      { timestamp: Date.now() + 2000, message: "Training completed" }
    ]
  }
};

// Mock FAL.ai training endpoint with realistic behavior
router.post('/flux-lora-fast-training', (req: Request, res: Response) => {
  const { input } = req.body;
  
  // Validate input parameters
  if (!input || !input.images_data_url) {
    return res.status(400).json({
      error: 'Invalid input parameters',
      message: 'Missing required field: images_data_url'
    });
  }

  // Simulate processing delay and send progress updates
  let currentStep = 0;
  const totalSteps = mockResponses.trainingComplete.training_logs.length;
  
  const sendProgressUpdate = () => {
    if (currentStep < totalSteps) {
      const log = mockResponses.trainingComplete.training_logs[currentStep];
      res.write(`data: ${JSON.stringify({
        status: currentStep === totalSteps - 1 ? 'completed' : 'in_progress',
        progress: (currentStep + 1) / totalSteps * 100,
        log
      })}\n\n`);
      
      currentStep++;
      setTimeout(sendProgressUpdate, 500);
    } else {
      res.write(`data: ${JSON.stringify({
        status: 'completed',
        data: mockResponses.trainingComplete
      })}\n\n`);
      res.end();
    }
  };

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Start sending progress updates
  sendProgressUpdate();
});

// Mock FAL.ai file upload endpoint with validation
router.post('/upload', (req: Request, res: Response) => {
  const contentType = req.headers['content-type'];
  
  if (!contentType || !contentType.includes('multipart/form-data')) {
    return res.status(400).json({
      error: 'Invalid content type',
      message: 'Content-Type must be multipart/form-data'
    });
  }

  // Generate a realistic mock URL with timestamp and random identifier
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  const mockUrl = `https://mock.fal.ai/files/upload-${timestamp}-${randomId}.zip`;
  
  res.json({
    success: true,
    url: mockUrl,
    metadata: {
      content_type: 'application/zip',
      created_at: new Date().toISOString(),
      file_size: Math.floor(Math.random() * 1000000) + 500000 // Random file size between 500KB and 1.5MB
    }
  });
});

// Health check endpoint
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

export { router as falAiMockRouter };
