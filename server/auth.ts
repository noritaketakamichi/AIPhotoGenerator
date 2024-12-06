import { Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

// Augment express-session with our user type
declare module 'express-session' {
  interface SessionData {
    passport: { user: number }
  }
}

// Augment express Request with our user type
declare module 'express' {
  interface User {
    id: number;
    email: string;
    credit: number;
    created_at: Date;
  }
}

// Configure Passport's Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "/auth/google/callback",
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
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
          credit: 0,
        }).returning();

        return done(null, newUser);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Serialize user for the session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await db.select().from(users).where(eq(users.id, id));
    done(null, user[0]);
  } catch (error) {
    done(error);
  }
});

// Auth middleware to check if user is authenticated
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};

export default passport;