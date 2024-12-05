import express from "express";
import passport from "passport";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const [user] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        name,
      })
      .returning();

    // Auto-login after registration
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: "Error logging in after registration" });
      }
      return res.json({ user: { id: user.id, email: user.email, name: user.name } });
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
});

router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err: any, user: any, info: any) => {
    if (err) {
      return res.status(500).json({ error: "Authentication error" });
    }
    if (!user) {
      return res.status(401).json({ error: info.message });
    }
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: "Error logging in" });
      }
      return res.json({ user: { id: user.id, email: user.email, name: user.name } });
    });
  })(req, res, next);
});

router.post("/logout", (req, res) => {
  req.logout(() => {
    res.json({ message: "Logged out successfully" });
  });
});

router.get("/session", (req, res) => {
  if (req.user) {
    const user: any = req.user;
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

export default router;
