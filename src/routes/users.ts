import { Router, Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { dbrun, dbget, dball } from "../db";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Zod schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["VIEWER", "ANALYST", "ADMIN"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Login (Public)
router.post("/login", async (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success)
    return res.status(400).json({ errors: result.error.errors });

  const { email, password } = result.data;
  const user = (await dbget("SELECT * FROM users WHERE email = ?", [
    email,
  ])) as any;
  if (!user || user.status !== "ACTIVE")
    return res
      .status(401)
      .json({ error: "Invalid credentials or inactive user" });

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "1d" },
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

// Create User (Admin only)
router.post(
  "/",
  authenticate,
  authorize(["ADMIN"]),
  async (req: Request, res: Response) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success)
      return res.status(400).json({ errors: result.error.errors });

    const { email, password, role = "VIEWER" } = result.data;

    const existing = await dbget("SELECT id FROM users WHERE email = ?", [
      email,
    ]);
    if (existing)
      return res.status(400).json({ error: "Email already exists" });

    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();

    await dbrun(
      "INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)",
      [id, email, hash, role],
    );

    res.status(201).json({ id, email, role });
  },
);

// List Users (Admin only)
router.get(
  "/",
  authenticate,
  authorize(["ADMIN"]),
  async (req: Request, res: Response) => {
    const users = await dball(
      "SELECT id, email, role, status, createdAt FROM users",
    );
    res.json(users);
  },
);

// Update User (Admin only)
router.patch(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  async (req: Request, res: Response) => {
    const updateSchema = z.object({
      role: z.enum(["VIEWER", "ANALYST", "ADMIN"]).optional(),
      status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    });

    const result = updateSchema.safeParse(req.body);
    if (!result.success)
      return res.status(400).json({ errors: result.error.errors });

    const updates = [];
    const params: any[] = [];

    if (result.data.role) {
      updates.push("role = ?");
      params.push(result.data.role);
    }
    if (result.data.status) {
      updates.push("status = ?");
      params.push(result.data.status);
    }

    if (updates.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    params.push(req.params.id);
    await dbrun(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);

    res.json({ message: "User updated successfully" });
  },
);

// Delete User (Admin only)
router.delete(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  async (req: Request, res: Response) => {
    const existing = await dbget("SELECT id FROM users WHERE id = ?", [
      req.params.id,
    ]);
    if (!existing) return res.status(404).json({ error: "User not found" });

    // Optional: if deleting a user, you might want to also delete their records or leave them.
    // Here we'll delete the user along with their records to maintain referential integrity.
    await dbrun("DELETE FROM records WHERE userId = ?", [req.params.id]);
    await dbrun("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ message: "User deleted successfully" });
  },
);

export default router;
