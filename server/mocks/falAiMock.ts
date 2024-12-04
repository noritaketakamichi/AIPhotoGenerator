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
      { timestamp: Date.now(), message: "Starting training process", level: "info" },
      { timestamp: Date.now() + 500, message: "Loading dataset", level: "info" },
      { timestamp: Date.now() + 1000, message: "Processing images", level: "info" },
      { timestamp: Date.now() + 1500, message: "Training model", level: "info" },
      { timestamp: Date.now() + 2000, message: "Training completed", level: "success" }
    ]
  },
  errors: {
    invalidInput: {
      error: 'Invalid input parameters',
      code: 'INVALID_INPUT',
      status: 400,
      message: 'The input parameters provided are invalid'
    },
    unauthorized: {
      error: 'Unauthorized request',
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Missing or invalid API key'
    },
    rateLimited: {
      error: 'Rate limit exceeded',
      code: 'RATE_LIMITED',
      status: 429,
      message: 'Too many requests, please try again later'
    },
    serverError: {
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      status: 500,
      message: 'An unexpected error occurred'
    }
  }
};

// Rate limiting simulation
const requestCounts = new Map<string, number>();
const RATE_LIMIT = 10; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

function checkRateLimit(apiKey: string): boolean {
  const now = Date.now();
  const count = requestCounts.get(apiKey) || 0;
  
  if (count >= RATE_LIMIT) {
    return false;
  }
  
  requestCounts.set(apiKey, count + 1);
  setTimeout(() => {
    const currentCount = requestCounts.get(apiKey) || 0;
    requestCounts.set(apiKey, Math.max(0, currentCount - 1));
  }, RATE_LIMIT_WINDOW);
  
  return true;
}

// Simulate random errors (10% chance)
const shouldSimulateError = () => Math.random() < 0.1;

// Get random error from errors object
const getRandomError = () => {
  const errors = Object.values(mockResponses.errors);
  return errors[Math.floor(Math.random() * errors.length)];
};

// Mock FAL.ai training endpoint with realistic behavior and SSE
router.post('/flux-lora-fast-training', (req: Request, res: Response) => {
  // Check for API key in headers
  const apiKey = req.headers['authorization'];
  if (!apiKey || !apiKey.startsWith('Bearer ')) {
    return res.status(401).json(mockResponses.errors.unauthorized);
  }

  // Check rate limit
  if (!checkRateLimit(apiKey)) {
    return res.status(429).json(mockResponses.errors.rateLimited);
  }

  const { input } = req.body;
  
  // Enhanced input validation
  if (!input || !input.images_data_url) {
    return res.status(400).json({
      ...mockResponses.errors.invalidInput,
      message: 'Missing required field: images_data_url'
    });
  }

  // Validate required training parameters
  if (!input.steps || input.steps < 100 || input.steps > 2000) {
    return res.status(400).json({
      ...mockResponses.errors.invalidInput,
      message: 'Steps must be between 100 and 2000'
    });
  }

  // Simulate random errors
  if (shouldSimulateError()) {
    const error = getRandomError();
    return res.status(error.status).json(error);
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Simulate training progress with SSE
  let progress = 0;
  const totalSteps = input.steps;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 5) + 1;
    
    if (progress >= totalSteps) {
      // Send completion event
      res.write(`data: ${JSON.stringify({
        status: 'completed',
        progress: 100,
        result: mockResponses.trainingComplete
      })}\n\n`);
      
      clearInterval(interval);
      res.end();
    } else {
      // Send progress event
      res.write(`data: ${JSON.stringify({
        status: 'in_progress',
        progress: Math.min(100, (progress / totalSteps) * 100),
        message: `Training progress: ${progress}/${totalSteps} steps`
      })}\n\n`);
    }
  }, 500);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});

// Mock FAL.ai file upload endpoint
router.post('/upload/:filename', (req: Request, res: Response) => {
  const apiKey = req.headers['authorization'];
  if (!apiKey || !apiKey.startsWith('Bearer ')) {
    return res.status(401).json(mockResponses.errors.unauthorized);
  }

  const { filename } = req.params;
  const mockUrl = `https://mock.fal.ai/files/${filename}`;
  
  res.json({
    success: true,
    url: mockUrl,
    metadata: {
      content_type: 'application/zip',
      created_at: new Date().toISOString(),
      file_size: Math.floor(Math.random() * 1000000) + 500000
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
