import express, { Request, Response } from "express";

// Mock FAL.ai API server
const mockFalApi = express();
mockFalApi.use(express.json());

// Mock storage upload endpoint
mockFalApi.post("/storage/upload", (req: Request, res: Response) => {
  // Simulate upload and return a mock URL
  const mockUrl = `https://mock-fal-storage.dev/${Date.now()}-mock-file.zip`;
  res.json(mockUrl);
});

// Mock training endpoint
mockFalApi.post("/subscribe/fal-ai/flux-lora-fast-training", (req: Request, res: Response) => {
  const { input } = req.body;
  
  if (!input || !input.images_data_url) {
    return res.status(400).json({
      error: "Missing required input parameters"
    });
  }

  // Simulate training response
  const mockResponse = {
    data: {
      diffusers_lora_file: {
        url: `https://mock-fal-storage.dev/${Date.now()}-lora-weights.safetensors`
      },
      training_logs: {
        steps_completed: 1000,
        total_steps: 1000,
        current_loss: 0.0023
      }
    }
  };

  // Simulate processing delay
  setTimeout(() => {
    res.json(mockResponse);
  }, 2000);
});

// Health check endpoint
mockFalApi.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "healthy" });
});

export { mockFalApi };
