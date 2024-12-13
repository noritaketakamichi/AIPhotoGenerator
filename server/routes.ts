import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import express, {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";
import multer from "multer";
import { mkdir, readFile, unlink } from "fs/promises";
import { db } from "./db";
import { training_models, generated_photos, users } from "./db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { createZipArchive } from "./utils/archive";
import { fal } from "@fal-ai/client";
import passport from "./auth";
import session from "express-session";
import Stripe from "stripe";
import { Strategy } from "passport-google-oauth20";
import { EventEmitter } from 'events';
import cors from "cors";
import nodemailer from "nodemailer";

const trainingEmitter = new EventEmitter();

interface User {
  id: number;
  email: string;
  credit: number;
  created_at: Date;
}

interface CustomRequest<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
> extends express.Request<P, ResBody, ReqBody, ReqQuery> {
  rawBody?: Buffer;
  files?:
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] };
  user?: User;
  logIn(user: any, done: (err: any) => void): void;
  logIn(user: any, options: any, done: (err: any) => void): void;
  logout(done: (err?: any) => void): void;
  logout(options: Record<string, any>, done: (err?: any) => void): void;
}

interface AuthenticatedRequest<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
> extends CustomRequest<P, ResBody, ReqBody, ReqQuery> {
  user: User;
}

// Type guard
function isAuthenticatedRequest(
  req: CustomRequest,
): req is AuthenticatedRequest {
  return req.user !== undefined;
}

// Async handler
type AsyncHandler = (
  fn: (
    req: CustomRequest<ParamsDictionary, any, any, ParsedQs>,
    res: Response,
    next: NextFunction,
  ) => Promise<void>,
) => RequestHandler<ParamsDictionary, any, any, ParsedQs>;

const asyncHandler: AsyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req as CustomRequest, res, next)).catch(next);
};

// Auth middleware
const requireAuth: RequestHandler = (req, res, next) => {
  const customReq = req as CustomRequest;
  console.log("Checking auth:", {
    user: customReq.user,
    session: (req as any).session,
    cookies: req.headers.cookie,
  });
  if (!customReq.user) {
    console.log("No user found in req.user");
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
};

interface GoogleAuthOptions {
  scope?: string[];
  callbackURL?: string;
  successRedirect?: string;
  failureRedirect?: string;
}

const authenticateGoogle = (options: GoogleAuthOptions) => {
  return passport.authenticate("google", options as any);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const isProduction = process.env.NODE_ENV === "production";
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only images are allowed"));
      return;
    }
    cb(null, true);
  },
});

export function registerRoutes(app: express.Application) {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "development-secret-key",
      resave: false,
      saveUninitialized: false,
      proxy: true,
      cookie: {
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  app.get("/", (req: Request, res: Response) => {
    res.sendFile(path.join(process.cwd(), "dist", "public", "index.html"));
  });

  app.get("/auth/google", (req: Request, res: Response, next: NextFunction) => {
    const callbackUrl = isProduction
      ? `${BASE_URL}/auth/google/callback`
      : "http://localhost:3000/auth/google/callback";
  
    const successRedirect = isProduction
      ? `${FRONTEND_URL}/`
      : "http://localhost:5173/";
  
    const failureRedirect = isProduction
      ? `${FRONTEND_URL}/auth?error=authentication_failed`
      : "http://localhost:5173/auth?error=authentication_failed";
  
    console.log("callback url:", callbackUrl)
    console.log("successRedirect url:", successRedirect)

    authenticateGoogle({
      scope: ["profile", "email"],
      callbackURL: callbackUrl,
      successRedirect: successRedirect,
      failureRedirect: failureRedirect,
    })(req, res, next);
  });

  app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/auth?error=authentication_failed" }),
    (req: Request, res: Response) => {
      console.log("User logged in:", req.user);
      res.redirect(isProduction ? FRONTEND_URL : "http://localhost:5173/");
    }
  );

  app.get(
    "/api/auth/user",
    asyncHandler(async (req, res) => {
      const customReq = req as CustomRequest;
      if (customReq.user) {
        res.json(customReq.user);
      } else {
        res.status(401).json({ error: "Not authenticated" });
      }
    }),
  );

  app.post(
    "/api/auth/logout",
    asyncHandler(async (req, res) => {
      const customReq = req as CustomRequest;
      customReq.logout((err) => {
        if (err) throw err;
        res.json({ success: true });
      });
    }),
  );

  app.post(
    "/api/create-checkout-session",
    requireAuth,
    asyncHandler(async (req, res) => {
      const customReq = req as CustomRequest;
      if (!isAuthenticatedRequest(customReq)) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { credits, amount } = customReq.body;
      if (!credits || !amount) {
        res.status(400).json({ error: "Credits and amount are required" });
        return;
      }

      const origin = customReq.headers.origin as string | undefined;
      if (!origin) {
        res.status(400).json({ error: "Missing origin header" });
        return;
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${credits} Credits`,
                description: "Credits for generating AI images",
              },
              unit_amount: amount * 100,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/charge/success?session_id={CHECKOUT_SESSION_ID}&credits=${credits}`,
        cancel_url: `${origin}/charge`,
        metadata: {
          userId: customReq.user.id.toString(),
          credits: credits.toString(),
        },
      });

      res.json({ id: session.id });
    }),
  );

  app.get("/api/public-config", (req, res) => {
    const publicKey = process.env.STRIPE_PUBLIC_KEY || "";
    res.json({ stripePublicKey: publicKey });
  });

  app.post("/api/stripe-webhook", express.raw({type: 'application/json'}), (req, res) => {
    const sig = req.headers["stripe-signature"];
    console.log("stripe webhook section")
    if (!sig) {
      return res.status(400).json({error: "No Stripe signature found"});
    }
  
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(500).json({error: "Webhook secret is not configured"});
    }
  
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error("⚠️  Webhook signature verification failed.", err.message);
      return res.sendStatus(400);
    }
  
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      console.log("adding credit in DB")
  
      const userId = Number(session.metadata?.userId);
      const credits = Number(session.metadata?.credits);
  
      if (userId && credits) {
        db.update(users)
          .set({ credit: sql`${users.credit} + ${credits}` })
          .where(eq(users.id, userId))
          .then(() => {
            console.log(`User ${userId} credited with ${credits} credits.`);
          })
          .catch(err => console.error("Failed to update credits:", err));
      } else {
        console.error("Missing userId or credits in metadata.");
      }
    }
  
    res.json({received: true});
  });

  app.post(
    "/api/upload",
    upload.fields([
      { name: "photo1", maxCount: 1 },
      { name: "photo2", maxCount: 1 },
      { name: "photo3", maxCount: 1 },
      { name: "photo4", maxCount: 1 },
    ]),
    asyncHandler(async (req, res) => {
      const customReq = req as CustomRequest;
      console.log("/api/upload is called")
      try {
        const files = customReq.files as {
          [fieldname: string]: Express.Multer.File[];
        };
        if (!files || Object.keys(files).length !== 4) {
          res.status(400).json({ error: "Exactly 4 photos are required" });
          return;
        }

        const fileNames = Object.values(files).map(
          (fileArr) => fileArr[0].filename,
        );
        const zipFileName = `archive-${Date.now()}.zip`;
        const zipPath = path.join(process.cwd(), "uploads", zipFileName);

        console.log(zipPath)

        await createZipArchive(fileNames, zipPath);

        const zipFile = await readFile(zipPath);
        const file = new Blob([zipFile], { type: "application/zip" });

        let falUrl: string;

        console.log(file)

        if (process.env.AI_TRAINING_API_ENV === "production") {
          fal.config({ credentials: process.env.FAL_AI_API_KEY });
          falUrl = await fal.storage.upload(file);
          console.log("training in prod")
        } else {
          falUrl = `https://v3.fal.media/files/mock/${Buffer.from(Math.random().toString()).toString("hex").slice(0, 8)}_${Date.now()}.zip`;
          console.log("training in mock")
        }

        console.log("falUrl:",falUrl)

        await Promise.all([
          ...fileNames.map((fileName) =>
            unlink(path.join(process.cwd(), "uploads", fileName)).catch((err) =>
              console.error(`Failed to delete file ${fileName}:`, err),
            ),
          ),
          unlink(zipPath).catch((err) =>
            console.error(`Failed to delete ZIP file:`, err),
          ),
        ]);

        console.log("file deleted")

        res.json({
          success: true,
          falUrl,
        });
      } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: "Failed to process upload" });
      }
    }),
  );

  app.post(
    "/api/train",
    requireAuth,
    asyncHandler(async (req, res) => {
      const customReq = req as CustomRequest;
      if (!isAuthenticatedRequest(customReq)) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
  
      const { falUrl } = customReq.body;
      if (!falUrl) {
        res.status(400).json({ error: "FAL URL is required" });
        return;
      }
  
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, customReq.user.id));
  
      if (!user || user.credit < 20) {
        res.status(403).json({
          error: "Insufficient credits",
          required: 20,
          available: user?.credit || 0,
        });
        return;
      }
  
      await db
        .update(users)
        .set({ credit: user.credit - 20 })
        .where(eq(users.id, customReq.user.id));
  
      const [lastModel] = await db
        .select({ name: training_models.name })
        .from(training_models)
        .where(eq(training_models.user_id, customReq.user.id))
        .orderBy(desc(training_models.name))
        .limit(1);
  
      const nextModelNumber = lastModel
        ? parseInt(lastModel.name.replace("model", "")) + 1
        : 1;
      const modelName = `model${nextModelNumber}`;
  
      const userEmail = user.email;
  
      async function startTrainingJob(userId: number, userEmail: string, falUrl: string, modelName: string) {
        let result: any;
        let lastLogTime = 0;
  
        if (process.env.AI_TRAINING_API_ENV === "production") {
          const { fal } = await import("@fal-ai/client");
          fal.config({ credentials: process.env.FAL_AI_API_KEY });
  
          result = await fal.subscribe("fal-ai/flux-lora-fast-training", {
            input: {
              steps: 1000,
              create_masks: true,
              images_data_url: falUrl,
            },
            logs: true,
            onQueueUpdate: (update) => {
              if (update.status === "IN_PROGRESS") {
                const now = Date.now();
                if (now - lastLogTime > 3000 && update.logs.length > 0) {
                  const lastLog = update.logs[update.logs.length - 1].message;
                  const percentMatch = lastLog.match(/(\d+)%/);
                  if (percentMatch) {
                    const percent = parseInt(percentMatch[1], 10);
                    if (!isNaN(percent)) {
                      trainingEmitter.emit("progressUpdate", percent);
                    }
                  }
                  lastLogTime = now;
                }
              }
            },
          });
        } else {
          // Mock環境
          result = {
            data: {
              diffusers_lora_file: {
                url: "https://v3.fal.media/files/mock/mock_lora_weights.safetensors",
                content_type: "application/octet-stream",
                file_name: "pytorch_lora_weights.safetensors",
                file_size: 89745224,
              },
              config_file: {
                url: "https://v3.fal.media/files/mock/mock_config.json",
                content_type: "application/octet-stream",
                file_name: "config.json",
                file_size: 452,
              },
            },
          };
  
          // 擬似的に進捗送信
          for (let p = 0; p <= 100; p += 20) {
            trainingEmitter.emit("progressUpdate", p);
            await new Promise(r => setTimeout(r, 1000));
          }
        }
  
        await db.insert(training_models).values({
          user_id: userId,
          name: modelName,
          training_data_url: result.data.diffusers_lora_file.url,
          config_url: result.data.config_file.url,
        });
  
        // 最終完了通知
        trainingEmitter.emit("progressUpdate", 100);
  
        // SMTP設定
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: 465,
          secure: true,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        console.log("SMTP_USER:", process.env.SMTP_USER)
        console.log("SMTP_PASS:", process.env.SMTP_PASS)
        // メール送信
        try {
          await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: userEmail,
            subject: 'Your training job is complete!',
            text: 'Your custom LoRA model training has finished successfully. You can now use your new model!\n\nPlease access the following URL:\nhttps://ai-sokkuri-photo-generator-2e54ad8fece0.herokuapp.com/',
          });
          console.log('Training completion email sent.');
        } catch (error) {
          console.error('Failed to send training completion email:', error);
        }
      }
  
      startTrainingJob(customReq.user.id, userEmail, falUrl, modelName).catch((err) =>
        console.error("Error in training job:", err)
      );
  
      res.json({ message: "Training started. Check progress via SSE." });
    }),
  );

  app.get(
    "/api/models",
    requireAuth,
    asyncHandler(async (req, res) => {
      const customReq = req as CustomRequest;
      if (!isAuthenticatedRequest(customReq)) {
        res.status(401).json({ error: "Authentication required" });
        return;
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
        .where(eq(training_models.user_id, customReq.user.id))
        .orderBy(desc(training_models.created_at));

      res.json(models);
    }),
  );

  app.post(
    "/api/generate",
    requireAuth,
    asyncHandler(async (req, res) => {
      const customReq = req as CustomRequest;
      if (!isAuthenticatedRequest(customReq)) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      const { modelId, loraUrl, prompt } = customReq.body;
      if (!modelId || !loraUrl || !prompt) {
        res
          .status(400)
          .json({ error: "Model ID, LoRA URL, and prompt are required" });
        return;
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, customReq.user.id));
      if (!user || user.credit < 1) {
        res.status(403).json({
          error: "Insufficient credits",
          required: 1,
          available: user?.credit || 0,
        });
        return;
      }

      await db
        .update(users)
        .set({ credit: user.credit - 1 })
        .where(eq(users.id, customReq.user.id));

      let result;
      if (process.env.AI_GENERATION_API_ENV === "production") {
        const { fal } = await import("@fal-ai/client");
        fal.config({ credentials: process.env.FAL_AI_API_KEY });

        result = await fal.subscribe("fal-ai/flux-lora", {
          input: {
            loras: [{ path: loraUrl, scale: 1 }],
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

      const [modelData] = await db
        .select({ id: training_models.id })
        .from(training_models)
        .where(
          sql`${training_models.id} = ${modelId} AND ${training_models.user_id} = ${customReq.user.id}`,
        )
        .limit(1);

      if (!modelData) {
        res
          .status(400)
          .json({ error: "Invalid model ID or unauthorized access" });
        return;
      }

      for (const image of result.data.images) {
        await db.insert(generated_photos).values({
          user_id: customReq.user.id,
          model_id: parseInt(modelId),
          prompt: prompt,
          image_url: image.url,
        });
      }

      res.json(result.data);
    }),
  );

  app.get(
    "/api/photos",
    requireAuth,
    asyncHandler(async (req, res) => {
      const customReq = req as CustomRequest;
      if (!isAuthenticatedRequest(customReq)) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      console.log("/api/photos is called")

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
          eq(generated_photos.model_id, training_models.id),
        )
        .where(eq(generated_photos.user_id, customReq.user.id))
        .orderBy(desc(generated_photos.created_at));

      res.json(photos);
    }),
  );
}

export function registerSSEEndpoint(app: any) {
  app.get("/api/training-progress", (req: Request, res: Response) => {
    console.log("[SSE] /api/training-progress endpoint hit");
    console.log("[SSE] Setting headers for SSE");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Content-Encoding", "identity");

    if (typeof (res as any).flushHeaders === 'function') {
      console.log("[SSE] flushHeaders available, calling flushHeaders()");
      (res as any).flushHeaders();
    } else {
      console.log("[SSE] flushHeaders not available");
    }

    console.log("[SSE] Setting up keepalive interval");
    const keepAliveInterval = setInterval(() => {
      res.write(':keepalive\n\n');
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
      console.log("[SSE] Sent keepalive");
    }, 15000);

    const onProgress = (percent: number) => {
      console.log(`[SSE] Emitting progress update: ${percent}%`);
      res.write(`event: message\n`);
      res.write(`data: ${percent}\n\n`);
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    };

    console.log("[SSE] Registering onProgress listener");
    trainingEmitter.on('progressUpdate', onProgress);

    req.on('close', () => {
      console.log("[SSE] Connection closed by client");
      trainingEmitter.off('progressUpdate', onProgress);
      clearInterval(keepAliveInterval);
    });

    console.log("[SSE] SSE setup complete, waiting for events...");
  });
}