import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import express, { Request, Response } from "express";
import multer from "multer";
import { mkdir, readFile, unlink, readdir } from "fs/promises";
import { db } from "./db";
import { uploads } from "./db/schema";
import { createZipArchive } from "./utils/archive";
import { fal } from "@fal-ai/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), "uploads");
    await mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only images are allowed"));
      return;
    }
    cb(null, true);
  },
});

export function registerRoutes(app: express.Application) {
  // File upload endpoint
  app.post(
    "/api/upload",
    upload.fields([
      { name: "photo1", maxCount: 1 },
      { name: "photo2", maxCount: 1 },
      { name: "photo3", maxCount: 1 },
      { name: "photo4", maxCount: 1 },
    ]),
    async (req: Request, res: Response) => {
      try {
        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };

        console.log("files", files);

        if (!files || Object.keys(files).length !== 4) {
          return res
            .status(400)
            .json({ error: "Exactly 4 photos are required" });
        }

        const fileNames = Object.values(files).map(
          (fileArr) => fileArr[0].filename,
        );
        const zipFileName = `archive-${Date.now()}.zip`;
        const zipPath = path.join(process.cwd(), "uploads", zipFileName);

        console.log("createZipArchive will be called");

        await createZipArchive(fileNames, zipPath);

        // Save upload record to database
        const [uploadRecord] = await db
          .insert(uploads)
          .values({
            status: "completed",
            zip_path: zipPath,
            created_at: new Date(),
            // Note: user_id will be added when authentication is implemented
          })
          .returning();

        const zipFile = await readFile(zipPath);
        const file = new Blob([zipFile], { type: "application/zip" });

        console.log("file was created");

        let falUrl: string;
        // Initialize fal client and handle upload based on environment
        if (process.env.AI_TRAINING_API_ENV === "production") {
          fal.config({
            credentials: process.env.FAL_AI_API_KEY,
          });
          falUrl = process.env.NODE_ENV === 'development' 
            ? `https://v3.fal.mock.ai/files/${Buffer.from(Math.random().toString()).toString("hex").slice(0, 8)}_${Date.now()}.zip`
            : await fal.storage.upload(file);
        } else {
          // Mock URL for development environment
          falUrl = `https://v3.fal.media/files/mock/${Buffer.from(Math.random().toString()).toString("hex").slice(0, 8)}_${Date.now()}.zip`;
        }

        // Delete all uploaded files and the ZIP file
        await Promise.all([
          ...fileNames.map(fileName => 
            unlink(path.join(process.cwd(), "uploads", fileName))
              .catch(err => console.error(`Failed to delete file ${fileName}:`, err))
          ),
          unlink(zipPath)
            .catch(err => console.error(`Failed to delete ZIP file:`, err))
        ]);

        res.json({
          success: true,
          uploadId: uploadRecord.id,
          falUrl,
        });
      } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: "Failed to process upload" });
      }
    },
  );

  // Training endpoint
  app.post("/api/train", async (req: Request, res: Response) => {
    try {
      console.log("Training API Environment:", process.env.AI_TRAINING_API_ENV);

      const { falUrl } = req.body;

      console.log(falUrl);

      if (!falUrl) {
        return res.status(400).json({ error: "FAL URL is required" });
      }

      let result;
      const { fal } = await import("@fal-ai/client");
      fal.config({
        credentials: process.env.FAL_AI_API_KEY,
      });

      if (process.env.AI_TRAINING_API_ENV === "production") {
        result = await fal.subscribe("fal-ai/flux-lora-fast-training", {
          input: {
            steps: 1000,
            create_masks: true,
            images_data_url: falUrl,
          },
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === "IN_PROGRESS") {
              update.logs.map((log) => log.message).forEach(console.log);
            }
          },
        });
      } else {
        // Mock response for development environment
        result = {
          data: {
            diffusers_lora_file: {
              url: "https://v3.fal.media/files/penguin/MfKRMr7gp6TqNfttnWt84_pytorch_lora_weights.safetensors",
              content_type: "application/octet-stream",
              file_name: "pytorch_lora_weights.safetensors",
              file_size: 89745224,
            },
            config_file: {
              url: "https://v3.fal.media/files/lion/1_jzXYliDKoqpnsl2ZUap_config.json",
              content_type: "application/octet-stream",
              file_name: "config.json",
              file_size: 452,
            },
          },
        };
      }
      console.log(result);

      // Delete all remaining files in the uploads directory
      try {
        const uploadDir = path.join(process.cwd(), "uploads");
        const files = await readdir(uploadDir);
        
        // Log files before deletion
        console.log("Files to be deleted:", files);
        
        // Delete files one by one and wait for each deletion
        for (const file of files) {
          const filePath = path.join(uploadDir, file);
          try {
            await unlink(filePath);
            console.log(`Successfully deleted: ${file}`);
          } catch (err) {
            console.error(`Failed to delete file ${file}:`, err);
          }
        }
        
        // Verify deletion
        const remainingFiles = await readdir(uploadDir);
        console.log("Remaining files after deletion:", remainingFiles);
        
      } catch (err) {
        console.error("Error while cleaning uploads directory:", err);
      }

      res.json(result.data);
    } catch (error) {
      console.error("Training error:", error);
      res.status(500).json({ error: "Training failed" });
    }
  });

  // Generate image endpoint
  app.post("/api/generate", async (req: Request, res: Response) => {
    try {
      const { loraUrl, prompt } = req.body;

      if (!loraUrl || !prompt) {
        return res
          .status(400)
          .json({ error: "LoRA URL and prompt are required" });
      }

      const { fal } = await import("@fal-ai/client");
      fal.config({
        credentials: process.env.FAL_AI_API_KEY,
      });

      if (process.env.AI_GENERATION_API_ENV === "production") {
        const result = await fal.subscribe("fal-ai/flux-lora", {
          input: {
            loras: [
              {
                path: loraUrl,
                scale: 1,
              },
            ],
            prompt: prompt,
            // embeddings property removed as it's not part of FluxLoraInput type
            image_size: "square_hd",
            enable_safety_checker: true,
          },
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === "IN_PROGRESS") {
              update.logs.map((log) => log.message).forEach(console.log);
            }
          },
        });
        res.json(result.data);
      } else {
        // Mock response for development
        res.json({
          images: [
            {
              url: "https://v3.fal.media/files/mock/generated_image.png",
              file_name: "generated_image.png",
            },
          ],
        });
      }
    } catch (error) {
      console.error("Generation error:", error);
      res.status(500).json({ error: "Image generation failed" });
    }
  });
}
