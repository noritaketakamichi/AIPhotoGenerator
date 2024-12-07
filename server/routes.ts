import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import express, { Request, Response } from "express";
import multer from "multer";
import { mkdir, readFile, unlink, readdir } from "fs/promises";
import { db } from "./db";
import { uploads, training_models, generated_photos } from "./db/schema";
import { eq, desc } from "drizzle-orm";
import { createZipArchive } from "./utils/archive";
import { fal } from "@fal-ai/client";
import passport from "./auth";
import session from "express-session";

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
  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'development-secret-key-do-not-use-in-production-9812734',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: true, // Always use secure cookies
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Log all incoming requests for debugging
  app.use((req, res, next) => {
    console.log('\n=== Incoming Request ===');
    console.log('URL:', req.url);
    console.log('Headers:', {
      'x-forwarded-proto': req.get('x-forwarded-proto'),
      'x-forwarded-host': req.get('x-forwarded-host'),
      'host': req.get('host')
    });
    console.log('=====================\n');
    next();
  });

  // Initialize Passport and restore authentication state from session
  app.use(passport.initialize());
  app.use(passport.session());

  // Auth routes
  app.get('/auth/google', (req, res, next) => {
    console.log('\n=== Google Auth Request ===');
    console.log('Auth Request Headers:', req.headers);
    console.log('Current Environment:', process.env.NODE_ENV);
    
    // Get the callback URL that will be used
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const callbackUrl = `${protocol}://${host}/auth/google/callback`;
    console.log('Using Callback URL:', callbackUrl);
    console.log('========================\n');
    
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      callbackURL: callbackUrl
    })(req, res, next);
  });

  app.get('/auth/google/callback', (req, res, next) => {
    console.log('\n=== Google Auth Callback ===');
    console.log('Callback Headers:', req.headers);
    console.log('Callback Query:', req.query);
    console.log('Callback URL:', 'https://466108c8-ed88-4061-af7f-61e53df5b8eb-00-mkii563l5bz7.sisko.replit.dev/auth/google/callback');
    console.log('Current URL:', `${req.protocol}://${req.get('host')}${req.originalUrl}`);
    console.log('========================\n');

    passport.authenticate('google', (err, user) => {
      if (err) {
        console.error('Authentication Error:', err);
        return res.redirect('/auth?error=' + encodeURIComponent(err.message));
      }
      
      if (!user) {
        console.error('Authentication failed: No user returned');
        return res.redirect('/auth?error=authentication_failed');
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error('Login Error:', err);
          return res.redirect('/auth?error=' + encodeURIComponent(err.message));
        }
        
        // Successful authentication, redirect home
        res.redirect('/');
      });
    })(req, res, next);
  });

  app.get('/api/auth/user', (req, res) => {
    if (req.user) {
      res.json(req.user);
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });
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
            file_count: fileNames.length,
            zip_path: zipPath,
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
          falUrl = await fal.storage.upload(file);
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

      if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get the next model number for this user
      const [lastModel] = await db
        .select({ name: training_models.name })
        .from(training_models)
        .where(eq(training_models.user_id, req.user.id))
        .orderBy(desc(training_models.name))
        .limit(1);

      const nextModelNumber = lastModel 
        ? parseInt(lastModel.name.replace('model', '')) + 1 
        : 1;
      const modelName = `model${nextModelNumber}`;

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

      // Save training history
      await db.insert(training_models).values({
        user_id: req.user.id,
        name: modelName,
        training_data_url: result.data.diffusers_lora_file.url,
        config_url: result.data.config_file.url,
      });
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

  // Get user's training models endpoint
  app.get("/api/models", async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const models = await db
        .select({
          id: training_models.id,
          name: training_models.name,
          trainingDataUrl: training_models.training_data_url,
          configUrl: training_models.config_url,
          createdAt: training_models.created_at,
        })
        .from(training_models)
        .where(eq(training_models.user_id, req.user.id))
        .orderBy(desc(training_models.created_at));

      res.json(models);
    } catch (error) {
      console.error("Error fetching models:", error);
      res.status(500).json({ error: "Failed to fetch models" });
    }
  });

  // Generate image endpoint
  app.post("/api/generate", async (req: Request, res: Response) => {
    try {
      console.log("Generate endpoint called with:", { body: req.body, user: req.user });
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

      if (!req.user?.id) {
          return res.status(401).json({ error: "Authentication required" });
        }

        let result;
        if (process.env.AI_GENERATION_API_ENV === "production") {
          result = await fal.subscribe("fal-ai/flux-lora", {
            input: {
              loras: [
                {
                  path: loraUrl,
                  scale: 1,
                },
              ],
              prompt: prompt,
              embeddings: [],
              image_size: "square_hd",
              model_name: null,
              enable_safety_checker: true,
            },
            logs: true,
            onQueueUpdate: (update) => {
              if (update.status === "IN_PROGRESS") {
                update.logs.map((log) => log.message).forEach(console.log);
              }
            },
          });
        } else {
          // Mock response for development
          result = {
            data: {
              images: [
                {
                  url: "https://v3.fal.media/files/mock/generated_image.png",
                  file_name: "generated_image.png",
                },
              ],
            },
          };
        }

        // Extract model ID from the LoRA URL
        // Example URL: https://v3.fal.media/files/penguin/MfKRMr7gp6TqNfttnWt84_pytorch_lora_weights.safetensors
        const [modelData] = await db
          .select({ id: training_models.id })
          .from(training_models)
          .where(eq(training_models.training_data_url, loraUrl))
          .limit(1);

        if (!modelData) {
          return res.status(400).json({ error: "Invalid model URL" });
        }

        // Store the generated image in the database
        for (const image of result.data.images) {
          await db.insert(generated_photos).values({
            user_id: req.user.id,
            model_id: modelData.id,
            prompt: prompt,
            image_url: image.url,
          });
        }

        res.json(result.data);
    } catch (error) {
      console.error("Generation error:", error);
      res.status(500).json({ error: "Image generation failed" });
    }
  });
}
