import { Router, Response } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { dbrun, dbget, dball } from "../db";

const router = Router();

const recordSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().min(1),
  date: z.string().datetime(),
  notes: z.string().optional(),
});

const isAuthorized = authorize(["ANALYST", "ADMIN"]);
const canManage = authorize(["ADMIN"]);

// List Records (Analyst & Admin)
router.get(
  "/",
  authenticate,
  isAuthorized,
  async (req: AuthRequest, res: Response) => {
    const { type, category, startDate, endDate } = req.query;

    let query = "SELECT * FROM records WHERE 1=1";
    const params: any[] = [];

    if (type) {
      query += " AND type = ?";
      params.push(type);
    }
    if (category) {
      query += " AND category = ?";
      params.push(category);
    }
    if (startDate) {
      query += " AND date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND date <= ?";
      params.push(endDate);
    }

    query += " ORDER BY date DESC";

    const records = await dball(query, params);
    res.json(records);
  },
);

// Create Record (Admin only)
router.post(
  "/",
  authenticate,
  canManage,
  async (req: AuthRequest, res: Response) => {
    const result = recordSchema.safeParse(req.body);
    if (!result.success)
      return res.status(400).json({ errors: result.error.errors });

    const { amount, type, category, date, notes } = result.data;
    const id = uuidv4();

    await dbrun(
      "INSERT INTO records (id, amount, type, category, date, notes, userId) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, amount, type, category, date, notes || null, req.user!.id],
    );

    res.status(201).json({ id, amount, type, category, date, notes });
  },
);

// Update Record (Admin only)
router.put(
  "/:id",
  authenticate,
  canManage,
  async (req: AuthRequest, res: Response) => {
    const result = recordSchema.safeParse(req.body);
    if (!result.success)
      return res.status(400).json({ errors: result.error.errors });

    const { amount, type, category, date, notes } = result.data;

    const existing = await dbget("SELECT id FROM records WHERE id = ?", [
      req.params.id,
    ]);
    if (!existing) return res.status(404).json({ error: "Record not found" });

    await dbrun(
      "UPDATE records SET amount = ?, type = ?, category = ?, date = ?, notes = ? WHERE id = ?",
      [amount, type, category, date, notes || null, req.params.id],
    );

    res.json({ message: "Record updated successfully" });
  },
);

// Delete Record (Admin only)
router.delete(
  "/:id",
  authenticate,
  canManage,
  async (req: AuthRequest, res: Response) => {
    const existing = await dbget("SELECT id FROM records WHERE id = ?", [
      req.params.id,
    ]);
    if (!existing) return res.status(404).json({ error: "Record not found" });

    await dbrun("DELETE FROM records WHERE id = ?", [req.params.id]);
    res.json({ message: "Record deleted successfully" });
  },
);

export default router;
