import type { Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import archiver from "archiver";
import sharp from "sharp";
import { db } from "../db";
import { uploads } from "@db/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_, file, cb) => {
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
    upload.array('photos', 4),
    async (req, res) => {
      try {
        if (!req.files || !Array.isArray(req.files) || req.files.length !== 4) {
          return res.status(400).json({ error: 'Exactly 4 photos required' });
        }

        await ensureUploadDir();
        
        // Process images
        const processedFiles = await Promise.all(
          req.files.map(async (file, index) => {
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
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.pipe(output);

        processedFiles.forEach((filepath, index) => {
          archive.file(filepath, { name: `photo${index + 1}.webp` });
        });

        await archive.finalize();

        // Save to database
        const [upload] = await db.insert(uploads)
          .values({
            zipPath: zipPath,
            status: 'completed'
          })
          .returning();

        // Cleanup processed files
        await Promise.all(
          processedFiles.map(filepath => fs.unlink(filepath))
        );

        res.json({
          success: true,
          uploadId: upload.id
        });

      } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
      }
    }
  );
}
