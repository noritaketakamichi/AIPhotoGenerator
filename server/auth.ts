import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";

// 環境変数読み込み
dotenv.config();

declare module 'express-session' {
  interface SessionData {
    passport: { user: number }
  }
}

declare module 'express' {
  interface User {
    id: number;
    email: string;
    credit: number;
    created_at: Date;
  }
  interface Request {
    user?: User;
    logIn(user: User, done: (err: any) => void): void;
    logIn(user: User, options: any, done: (err: any) => void): void;
    logout(options: Record<string, any>, done: (err?: any) => void): void;
    logout(done: (err?: any) => void): void;
  }
}

// .envからBASE_URLを読み込む
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // .envから取得したBASE_URLを使ってcallbackURLを構築
      callbackURL: `${BASE_URL}/auth/google/callback`,
      proxy: true,
    },
    async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      console.log('\n=== Google Auth Details ===');
      console.log('Auth Environment:', process.env.NODE_ENV);
      console.log('Profile:', {
        id: profile.id,
        displayName: profile.displayName,
        emails: profile.emails
      });
      console.log('========================\n');
      console.log('Auth Configuration:', {
        callbackURL: `${BASE_URL}/auth/google/callback`,
        environment: process.env.NODE_ENV
      });

      try {
        const email = profile.emails?.[0]?.value;
        
        if (!email) {
          return done(new Error("No email found in Google profile"));
        }

        // Check if user exists
        const existingUser = await db.select().from(users).where(eq(users.email, email));
        
        if (existingUser.length > 0) {
          return done(null, existingUser[0]);
        }

        // Create new user if doesn't exist
        const [newUser] = await db.insert(users).values({
          email: email,
          credit: 25, // Initial credit for new users
        }).returning();

        return done(null, newUser);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  console.log("serializeUser:", user);
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    console.log("deserializeUser called with id:", id);
    const user = await db.select().from(users).where(eq(users.id, id));
    console.log("User found:", user);
    done(null, user[0]);
  } catch (error) {
    done(error);
  }
});

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};

export default passport;