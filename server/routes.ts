import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import express, { Request as ExpressRequest, Response, NextFunction } from "express";

interface User {
  id: number;
  email: string;
  credit: number;
}

interface Request extends Omit<ExpressRequest, 'user'> {
  rawBody?: Buffer;
  user?: User;
  files?: {
    [fieldname: string]: Express.Multer.File[];
  };
}

type RequestHandler<T extends Request = Request> = (
  req: T,
  res: Response,
  next?: NextFunction
) => void | Promise<void>;

type AuthenticatedRequestHandler = RequestHandler<AuthenticatedRequest>;
type StripeWebhookRequestHandler = RequestHandler<StripeWebhookRequest>;

interface StripeWebhookRequest extends Request {
  rawBody: Buffer;
}

interface AuthenticatedRequest extends Request {
  user: User;
}
import multer from "multer";
import { mkdir, readFile, unlink, readdir } from "fs/promises";
import { db } from "./db";
import { uploads, training_models, generated_photos, users } from "./db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { createZipArchive } from "./utils/archive";
import { fal } from "@fal-ai/client";
import passport from "./auth";
import session from "express-session";
import Stripe from 'stripe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia'
});

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
      secure: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    }
  }));

  // Initialize Passport and restore authentication state from session
  app.use(passport.initialize());
  app.use(passport.session());

  // Auth routes
  app.get('/auth/google', (req, res, next) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const callbackUrl = `${protocol}://${host}/auth/google/callback`;
    
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: true,
      session: true,
      callbackURL: callbackUrl as string
    } as any)(req, res, next);
  });

  app.get('/auth/google/callback', (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('google', (err: Error | null, user: User | undefined) => {
      if (err) {
        return res.redirect('/auth?error=' + encodeURIComponent(err.message));
      }
      
      if (!user) {
        return res.redirect('/auth?error=authentication_failed');
      }

      req.logIn(user, (err) => {
        if (err) {
          return res.redirect('/auth?error=' + encodeURIComponent(err.message));
        }
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

  // Stripe payment endpoint
  app.post('/api/create-checkout-session', async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { credits, amount } = req.body;
      
      if (!credits || !amount) {
        return res.status(400).json({ error: 'Credits and amount are required' });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${credits} Credits`,
                description: 'Credits for generating AI images',
              },
              unit_amount: amount * 100, // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin}/charge/success?session_id={CHECKOUT_SESSION_ID}&credits=${credits}`,
        cancel_url: `${req.headers.origin}/charge`,
        metadata: {
          userId: req.user.id,
          credits: credits,
        },
      });

      res.json({ id: session.id });
    } catch (error) {
      console.error('Stripe session creation error:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // Stripe webhook endpoint
  app.post('/api/stripe-webhook', async (req: StripeWebhookRequest, res: Response) => {
    console.log('=== Stripe Webhook Debug Logs ===');
    try {
      // Debug logging
      console.log('1. Request body type:', typeof req.body);
      console.log('2. Raw body available:', !!(req as any).rawBody);
      console.log('3. Headers:', JSON.stringify(req.headers, null, 2));
      
      const sig = req.headers['stripe-signature'];
      if (!sig) {
        console.error('4. Missing stripe signature');
        return res.status(400).json({ error: 'No Stripe signature found' });
      }
      console.log('5. Found stripe signature:', sig);

      // Verify webhook signature
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('6. Webhook secret is missing');
        return res.status(500).json({ error: 'Webhook secret is not configured' });
      }
      console.log('7. Webhook secret configured');

      if (!(req as any).rawBody) {
        console.error('8. Request raw body is missing');
        return res.status(400).json({ error: 'No raw body available' });
      }
      console.log('9. Raw body is available');

      const event = stripe.webhooks.constructEvent(
        (req as any).rawBody,
        sig,
        webhookSecret
      );

      console.log('10. Successfully constructed webhook event');
      console.log('11. Event type:', event.type);

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('12. Processing completed checkout session');
        
        const userId = session.metadata?.userId;
        const credits = parseInt(session.metadata?.credits || '0');

        if (!userId || !credits) {
          console.error('13. Missing userId or credits in session metadata');
          return res.status(400).json({ error: 'Invalid session metadata' });
        }

        console.log('14. Updating credits for user:', userId);

        // First get current user credits
        const [currentUser] = await db
          .select({ credit: users.credit })
          .from(users)
          .where(eq(users.id, parseInt(userId)));

        if (!currentUser) {
          console.error('15. User not found');
          return res.status(404).json({ error: 'User not found' });
        }

        const newCreditAmount = (currentUser.credit || 0) + credits;
        console.log('16. New credit amount:', newCreditAmount);

        // Update user credits
        await db
          .update(users)
          .set({ credit: newCreditAmount })
          .where(eq(users.id, parseInt(userId)));

        console.log('17. Credits updated successfully');
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook processing error:', {
        name: error.name,
        message: error.message,
        type: error.type,
        stack: error.stack
      });
      
      if (error.type === 'StripeSignatureVerificationError') {
        return res.status(400).json({ error: 'Webhook signature verification failed' });
      }
      
      return res.status(500).json({ error: 'Internal server error in webhook handler' });
    }
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
        const files = req.files;

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

        let falUrl: string;
        if (process.env.AI_TRAINING_API_ENV === "production") {
          fal.config({
            credentials: process.env.FAL_AI_API_KEY,
          });
          falUrl = await fal.storage.upload(file);
        } else {
          falUrl = `https://v3.fal.media/files/mock/${Buffer.from(Math.random().toString()).toString("hex").slice(0, 8)}_${Date.now()}.zip`;
        }

        // Delete uploaded files and ZIP
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

      // Check if user has enough credits
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id));

      if (!user || user.credit < 20) {
        return res.status(403).json({ 
          error: "Insufficient credits", 
          required: 20,
          available: user?.credit || 0 
        });
      }

      // Deduct credits
      await db
        .update(users)
        .set({ credit: user.credit - 20 })
        .where(eq(users.id, req.user.id));

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
      const { modelId, loraUrl, prompt } = req.body;
      console.log("Generate endpoint called with:", { 
        modelId,
        loraUrl,
        prompt,
        userId: req.user?.id 
      });

      if (!modelId || !loraUrl || !prompt) {
        return res
          .status(400)
          .json({ error: "Model ID, LoRA URL, and prompt are required" });
      }

      const { fal } = await import("@fal-ai/client");
      fal.config({
        credentials: process.env.FAL_AI_API_KEY,
      });

      if (!req.user?.id) {
          return res.status(401).json({ error: "Authentication required" });
        }

        // Check if user has enough credits
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, req.user.id));

        if (!user || user.credit < 1) {
          return res.status(403).json({ 
            error: "Insufficient credits", 
            required: 1,
            available: user?.credit || 0 
          });
        }

        // Deduct credits
        await db
          .update(users)
          .set({ credit: user.credit - 1 })
          .where(eq(users.id, req.user.id));

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

        // Verify that the model exists and belongs to the user
        const [modelData] = await db
          .select({ id: training_models.id })
          .from(training_models)
          .where(
            sql`${training_models.id} = ${modelId} AND ${training_models.user_id} = ${req.user.id}`
          )
          .limit(1);

        if (!modelData) {
          return res.status(400).json({ error: "Invalid model ID or unauthorized access" });
        }

        // Store the generated image in the database
        for (const image of result.data.images) {
          console.log("Attempting to insert generated image:", {
            user_id: req.user.id,
            model_id: modelData.id,
            prompt: prompt,
            image_url: image.url,
          });
          
          try {
            const [insertedPhoto] = await db.insert(generated_photos).values({
              user_id: req.user.id,
              model_id: parseInt(modelId),
              prompt: prompt,
              image_url: image.url,
            }).returning();
            
            console.log("Successfully inserted generated photo:", insertedPhoto);
          } catch (error) {
            console.error("Failed to insert generated photo:", error);
            throw error;
          }
        }

        res.json(result.data);
    } catch (error) {
      console.error("Generation error:", error);
      res.status(500).json({ error: "Image generation failed" });
    }
  });

  // Get user's generated photos endpoint
  app.get("/api/photos", async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const photos = await db
        .select({
          id: generated_photos.id,
          prompt: generated_photos.prompt,
          image_url: generated_photos.image_url,
          created_at: generated_photos.created_at,
          model_name: training_models.name,
        })
        .from(generated_photos)
        .leftJoin(
          training_models,
          eq(generated_photos.model_id, training_models.id)
        )
        .where(eq(generated_photos.user_id, req.user.id))
        .orderBy(desc(generated_photos.created_at));

      res.json(photos);
    } catch (error) {
      console.error("Error fetching photos:", error);
      res.status(500).json({ error: "Failed to fetch photos" });
    }
  });
}