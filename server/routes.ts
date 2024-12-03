import type { Express, Request } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import archiver from "archiver";
import sharp from "sharp";
import { db } from "../db";
import { uploads } from "@db/schema";
import { fal } from "@fal-ai/client";

// Configure FAL client with API key
fal.config({
  credentials: process.env.FAL_AI_API_KEY
});

interface MulterRequest extends Omit<Request, 'files'> {
  files?: {
    [fieldname: string]: Express.Multer.File[];
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('Invalid file type'));
      return;
    }
    cb(null, true);
  },
});

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export function registerRoutes(app: Express) {
  app.post(
    '/api/upload',
    upload.fields([
      { name: 'photo1', maxCount: 1 },
      { name: 'photo2', maxCount: 1 },
      { name: 'photo3', maxCount: 1 },
      { name: 'photo4', maxCount: 1 }
    ]),
    async (req: MulterRequest, res) => {
      try {
        const files = req.files;
        
        if (!files || !files.photo1?.[0] || !files.photo2?.[0] || !files.photo3?.[0] || !files.photo4?.[0]) {
          return res.status(400).json({ error: 'Exactly 4 photos required' });
        }

        await ensureUploadDir();
        
        // Process images
        const photoFiles = [
          files.photo1[0],
          files.photo2[0],
          files.photo3[0],
          files.photo4[0]
        ];

        const processedFiles: string[] = await Promise.all(
          photoFiles.map(async (file, index) => {
            const filename = `${Date.now()}-${index}.webp`;
            const filepath = path.join(UPLOAD_DIR, filename);
            
            await sharp(file.buffer)
              .resize(1200, 1200, { fit: 'inside' })
              .webp({ quality: 80 })
              .toFile(filepath);
            
            return filepath;
          })
        );

        // Create ZIP
        const zipFilename = `${Date.now()}.zip`;
        const zipPath = path.join(UPLOAD_DIR, zipFilename);
        const output = createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.pipe(output);

        processedFiles.forEach((filepath, index) => {
          archive.file(filepath, { name: `photo${index + 1}.webp` });
        });

        await archive.finalize();

        // Convert ZIP to File object and upload to FAL
        const zipBuffer = await fs.readFile(zipPath);
        const zipFile = new File([zipBuffer], zipFilename, { type: 'application/zip' });
        const falUrl = await fal.storage.upload(zipFile);

        // Save to database
        const [upload] = await db.insert(uploads)
          .values({
            zipPath: zipPath,
            falUrl: falUrl,
            status: 'completed'
          })
          .returning();

        // Cleanup processed files
        await Promise.all(
          processedFiles.map((filepath: string) => fs.unlink(filepath))
        );

        res.json({
          success: true,
          uploadId: upload.id,
          falUrl: falUrl
        });

      } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
      }
    }
  );
}
