import express, { Request, Response } from 'express';
import multer from 'multer';
import { mkdir } from 'fs/promises';
import path from 'path';
import { db } from './db';
import { uploads } from './db/schema';
import { createZipArchive } from './utils/archive';

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    await mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only images are allowed'));
      return;
    }
    cb(null, true);
  }
});

export function registerRoutes(app: express.Application) {
  // File upload endpoint
  app.post(
    '/api/upload',
    upload.fields([
      { name: 'photo1', maxCount: 1 },
      { name: 'photo2', maxCount: 1 },
      { name: 'photo3', maxCount: 1 },
      { name: 'photo4', maxCount: 1 },
    ]),
    async (req: Request, res: Response) => {
      try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        if (!files || Object.keys(files).length !== 4) {
          return res.status(400).json({ error: 'Exactly 4 photos are required' });
        }

        const fileNames = Object.values(files).map(fileArr => fileArr[0].filename);
        const zipFileName = `archive-${Date.now()}.zip`;
        const zipPath = path.join(process.cwd(), 'uploads', zipFileName);

        await createZipArchive(fileNames, zipPath);

        // Save upload record to database
        const [uploadRecord] = await db.insert(uploads).values({
          status: 'completed',
          fileCount: fileNames.length,
          zipPath: zipPath,
        }).returning();

        // In development, use mock URL
        const falUrl = process.env.NODE_ENV === 'development'
          ? `http://localhost:5000/mock/fal-ai/upload/${zipFileName}`
          : `https://fal.ai/uploads/${zipFileName}`;

        res.json({
          success: true,
          uploadId: uploadRecord.id,
          falUrl,
        });
      } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to process upload' });
      }
    }
  );

  // Training endpoint
  app.post('/api/train', async (req: Request, res: Response) => {
    try {
      const { falUrl } = req.body;

      if (!falUrl) {
        return res.status(400).json({ error: 'FAL URL is required' });
      }

      let result;
      if (process.env.NODE_ENV === 'development') {
        // Use mock data in development
        const response = await fetch('http://localhost:5000/mock/fal-ai/flux-lora-fast-training', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: {
              steps: 1000,
              create_masks: true,
              images_data_url: falUrl,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Mock FAL.ai API request failed');
        }

        result = await response.json();
      } else {
        // Import fal only in production
        const { fal } = await import('@fal-ai/client');
        fal.config({
          credentials: process.env.FAL_AI_API_KEY,
        });

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
      }

      res.json(result.data);
    } catch (error) {
      console.error('Training error:', error);
      res.status(500).json({ error: 'Training failed' });
    }
  });
}