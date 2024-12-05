import express, { Request, Response } from "express";

export function mockFalApiRoutes(app: express.Application) {
  const mockError = (res: Response, status: number, message: string) => {
    res.status(status).json({ error: message });
  };

  // Mock endpoint for file upload
  app.post("/api/fal/upload", (req: Request, res: Response) => {
    try {
      const mockFileId = Math.random().toString(36).substring(7);
      res.json({
        url: `https://v3.fal.mock.ai/files/${mockFileId}`,
        file_name: `mock_${mockFileId}.zip`,
        content_type: "application/zip",
        file_size: 1024 * 1024 // 1MB mock size
      });
    } catch (error) {
      mockError(res, 500, "Failed to process file upload");
    }
  });

  // Mock endpoint for training progress
  app.get("/api/fal/training/:id", (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return mockError(res, 400, "Training ID is required");
      }

      res.json({
        id,
        status: "completed",
        progress: 100,
        result: {
          diffusers_lora_file: {
            url: `https://v3.fal.mock.ai/models/${id}/pytorch_lora_weights.safetensors`,
            content_type: "application/octet-stream",
            file_name: "pytorch_lora_weights.safetensors",
            file_size: 89745224,
          },
          config_file: {
            url: `https://v3.fal.mock.ai/models/${id}/config.json`,
            content_type: "application/json",
            file_name: "config.json",
            file_size: 452,
          }
        }
      });
    } catch (error) {
      mockError(res, 500, "Failed to fetch training status");
    }
  });

  // Mock endpoint for image generation
  app.post("/api/fal/generate", (req: Request, res: Response) => {
    try {
      const { prompt, loras } = req.body;

      if (!prompt) {
        return mockError(res, 400, "Prompt is required");
      }

      if (!loras || !Array.isArray(loras) || loras.length === 0) {
        return mockError(res, 400, "At least one LoRA model is required");
      }

      const mockImageId = Math.random().toString(36).substring(7);
      res.json({
        images: [
          {
            url: `https://v3.fal.mock.ai/images/${mockImageId}.png`,
            file_name: `generated_${mockImageId}.png`
          }
        ]
      });
    } catch (error) {
      mockError(res, 500, "Failed to generate image");
    }
  });
}
