import { Request, Response } from "express";

export function mockFalApiRoutes(app: Express) {
  // Mock endpoint for file upload
  app.post("/api/fal/upload", (req: Request, res: Response) => {
    const mockFileId = Math.random().toString(36).substring(7);
    res.json({
      url: `https://v3.fal.mock.ai/files/${mockFileId}`,
      file_name: `mock_${mockFileId}.zip`,
      content_type: "application/zip",
      file_size: 1024 * 1024 // 1MB mock size
    });
  });

  // Mock endpoint for training progress
  app.get("/api/fal/training/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    res.json({
      id,
      status: "completed",
      progress: 100,
      result: {
        model_url: `https://v3.fal.mock.ai/models/${id}`,
        config_url: `https://v3.fal.mock.ai/configs/${id}`
      }
    });
  });

  // Mock endpoint for image generation
  app.post("/api/fal/generate", (req: Request, res: Response) => {
    const { prompt, model_url } = req.body;
    const mockImageId = Math.random().toString(36).substring(7);
    res.json({
      images: [
        {
          url: `https://v3.fal.mock.ai/images/${mockImageId}.png`,
          file_name: `generated_${mockImageId}.png`
        }
      ]
    });
  });
}
