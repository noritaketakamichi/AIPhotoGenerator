import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import express, {
  Request as ExpressRequest,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";
import multer from "multer";
import { mkdir, readFile, unlink } from "fs/promises";
import { db } from "./db";
import { uploads, training_models, generated_photos, users } from "./db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { createZipArchive } from "./utils/archive";
import { fal } from "@fal-ai/client";
import passport from "./auth";
import session from "express-session";
import Stripe from "stripe";
import { Strategy } from "passport-google-oauth20";
import { Blob } from "buffer";

// Base interfaces
interface User {
  id: number;
  email: string;
  credit: number;
  created_at: Date;
}

// Custom request type with proper Multer and Session typing
type CustomRequest<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
> = Omit<ExpressRequest<P, ResBody, ReqBody, ReqQuery>, 'files'> & {
  rawBody?: Buffer;
  files?: { [fieldname: string]: Express.Multer.File[] };
  user?: User;
  isAuthenticated(): this is AuthenticatedRequest<P, ResBody, ReqBody, ReqQuery>;
  logIn(user: any, done: (err: any) => void): void;
  logIn(user: any, options: any, done: (err: any) => void): void;
  logout(options: Record<string, any>, done: (err: any) => void): void;
  logout(done: (err: any) => void): void;
};

type AuthenticatedRequest<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
> = CustomRequest<P, ResBody, ReqBody, ReqQuery> & {
  user: User;
};

// Type guard for authenticated requests
function isAuthenticatedRequest(
  req: CustomRequest
): req is AuthenticatedRequest {
  return req.user !== undefined;
}

// Type for async route handlers
type AsyncHandler = <
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs
>(
  fn: (
    req: CustomRequest<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction
  ) => Promise<void | Response<ResBody>>
) => RequestHandler<P, ResBody, ReqBody, ReqQuery>;

// AsyncHandler implementation
const asyncHandler: AsyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req as CustomRequest, res, next)).catch(next);
};

// Auth middleware
const requireAuth: RequestHandler = (req, res, next) => {
  const customReq = req as CustomRequest;
  if (!customReq.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
};

// Google authentication options type
interface GoogleAuthOptions {
  scope?: string[];
  callbackURL?: string;
  successRedirect?: string;
  failureRedirect?: string;
}

// Helper function for Google authentication
const authenticateGoogle = (options: GoogleAuthOptions) => {
  return passport.authenticate("google", options as any);
};

// Initialize environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
});

// Configure multer
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
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "development-secret-key",
      resave: false,
      saveUninitialized: false,
      proxy: true,
      cookie: {
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000,
      },
    }),
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Auth routes
  app.get("/auth/google", (req: Request, res: Response, next: NextFunction) => {
    const customReq = req as CustomRequest;
    const protocol = (req.headers["x-forwarded-proto"] ||
      req.protocol) as string;
    const host = (req.headers["x-forwarded-host"] || req.get("host")) as string;
    const callbackUrl = `${protocol}://${host}/auth/google/callback`;

    authenticateGoogle({
      scope: ["profile", "email"],
      callbackURL: callbackUrl,
    })(req, res, next);
  });

  app.get(
    "/auth/google/callback",
    (req: Request, res: Response, next: NextFunction) => {
      const customReq = req as CustomRequest;
      authenticateGoogle({
        failureRedirect: "/auth?error=authentication_failed",
        successRedirect: "/",
      })(req, res, next);
    },
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
        if (err) {
          throw err;
        }
        res.json({ success: true });
      });
    }),
  );

  // Stripe payment endpoint
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

  // Stripe webhook endpoint
  app.post(
    "/api/stripe-webhook",
    asyncHandler(async (req, res) => {
      const customReq = req as CustomRequest;
      const sig = customReq.headers["stripe-signature"];
      if (!sig) {
        res.status(400).json({ error: "No Stripe signature found" });
        return;
      }

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        res.status(500).json({ error: "Webhook secret is not configured" });
        return;
      }

      const rawBody = customReq.rawBody;
      if (!rawBody) {
        res.status(400).json({ error: "No raw body available" });
        return;
      }

      const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

      // TODO: handle event.type
      res.json({ received: true });
    }),
  );

  // File upload endpoint
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
      try {
        const files = customReq.files as {
          [fieldname: string]: express.Multer.File[];
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

        await createZipArchive(fileNames, zipPath);

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
          fal.config({ credentials: process.env.FAL_AI_API_KEY });
          falUrl = await fal.storage.upload(file);
        } else {
          falUrl = `https://v3.fal.media/files/mock/${Buffer.from(
            Math.random().toString(),
          )
            .toString("hex")
            .slice(0, 8)}_${Date.now()}.zip`;
        }

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

        res.json({
          success: true,
          uploadId: uploadRecord.id,
          falUrl,
        });
      } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: "Failed to process upload" });
      }
    }),
  );

  // Training endpoint
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

      let result;
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
              update.logs.map((log) => log.message).forEach(console.log);
            }
          },
        });
      } else {
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
      }

      await db.insert(training_models).values({
        user_id: customReq.user.id,
        name: modelName,
        training_data_url: result.data.diffusers_lora_file.url,
        config_url: result.data.config_file.url,
      });

      res.json(result.data);
    }),
  );

  // Get user's training models endpoint
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

  // Generate image endpoint
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

  // Get user's generated photos endpoint
  app.get(
    "/api/photos",
    requireAuth,
    asyncHandler(async (req, res) => {
      const customReq = req as CustomRequest;
      if (!isAuthenticatedRequest(customReq)) {
        res.status(401).json({ error: "Authentication required" });
        return;
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
          eq(generated_photos.model_id, training_models.id),
        )
        .where(eq(generated_photos.user_id, customReq.user.id))
        .orderBy(desc(generated_photos.created_at));

      res.json(photos);
    }),
  );
}