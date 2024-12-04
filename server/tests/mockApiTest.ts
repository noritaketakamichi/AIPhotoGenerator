import request from "supertest";
import { mockFalApi } from "../mocks/falAiMock";

describe("Mock FAL.ai API", () => {
  test("Storage upload endpoint returns mock URL", async () => {
    const response = await request(mockFalApi)
      .post("/storage/upload")
      .send({});
    
    expect(response.status).toBe(200);
    expect(response.body).toMatch(/^https:\/\/mock-fal-storage\.dev\/.*\.zip$/);
  });

  test("Training endpoint returns mock training results", async () => {
    const response = await request(mockFalApi)
      .post("/subscribe/fal-ai/flux-lora-fast-training")
      .send({
        input: {
          images_data_url: "https://example.com/mock-images.zip",
          steps: 1000,
          create_masks: true
        }
      });
    
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty("diffusers_lora_file.url");
    expect(response.body.data).toHaveProperty("training_logs");
  });

  test("Health check endpoint returns healthy status", async () => {
    const response = await request(mockFalApi)
      .get("/health");
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "healthy" });
  });
});
