import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Google OAuth credentials are required");
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.googleId, profile.id));

        if (existingUser) {
          return done(null, existingUser);
        }

        // Create new user
        const [newUser] = await db
          .insert(users)
          .values({
            email: profile.emails?.[0]?.value ?? "",
            name: profile.displayName,
            googleId: profile.id,
            picture: profile.photos?.[0]?.value,
            isVerified: true,
          })
          .returning();

        return done(null, newUser);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    done(null, user);
  } catch (error) {
    done(error);
  }
});
