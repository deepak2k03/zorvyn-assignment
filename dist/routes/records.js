"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const auth_1 = require("../middleware/auth");
const db_1 = require("../db");
const router = (0, express_1.Router)();
const recordSchema = zod_1.z
    .object({
    amount: zod_1.z.number().positive(),
    type: zod_1.z.enum(["INCOME", "EXPENSE"]),
    category: zod_1.z.string().min(1),
    date: zod_1.z.string().datetime(),
    notes: zod_1.z.string().max(1000).optional(),
})
    .strict();
const listRecordsQuerySchema = zod_1.z
    .object({
    type: zod_1.z.enum(["INCOME", "EXPENSE"]).optional(),
    category: zod_1.z.string().min(1).optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
})
    .strict();
const getQueryValue = (value) => {
    if (typeof value === "string") {
        return value;
    }
    return undefined;
};
const isAuthorized = (0, auth_1.authorize)(["ANALYST", "ADMIN"]);
const canManage = (0, auth_1.authorize)(["ADMIN"]);
// List Records (Analyst & Admin)
router.get("/", auth_1.authenticate, isAuthorized, async (req, res) => {
    const result = listRecordsQuerySchema.safeParse({
        type: getQueryValue(req.query.type),
        category: getQueryValue(req.query.category),
        startDate: getQueryValue(req.query.startDate),
        endDate: getQueryValue(req.query.endDate),
    });
    if (!result.success) {
        return res.status(400).json({ errors: result.error.errors });
    }
    const { type, category, startDate, endDate } = result.data;
    let query = "SELECT * FROM records WHERE 1=1";
    const params = [];
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
    const records = await (0, db_1.dball)(query, params);
    res.json(records);
});
// Create Record (Admin only)
router.post("/", auth_1.authenticate, canManage, async (req, res) => {
    const result = recordSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ errors: result.error.errors });
    const { amount, type, category, date, notes } = result.data;
    const id = (0, uuid_1.v4)();
    await (0, db_1.dbrun)("INSERT INTO records (id, amount, type, category, date, notes, userId) VALUES (?, ?, ?, ?, ?, ?, ?)", [id, amount, type, category, date, notes || null, req.user.id]);
    res.status(201).json({ id, amount, type, category, date, notes });
});
// Update Record (Admin only)
router.put("/:id", auth_1.authenticate, canManage, async (req, res) => {
    const result = recordSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ errors: result.error.errors });
    const { amount, type, category, date, notes } = result.data;
    const existing = await (0, db_1.dbget)("SELECT id FROM records WHERE id = ?", [
        req.params.id,
    ]);
    if (!existing)
        return res.status(404).json({ error: "Record not found" });
    await (0, db_1.dbrun)("UPDATE records SET amount = ?, type = ?, category = ?, date = ?, notes = ? WHERE id = ?", [amount, type, category, date, notes || null, req.params.id]);
    res.json({ message: "Record updated successfully" });
});
// Delete Record (Admin only)
router.delete("/:id", auth_1.authenticate, canManage, async (req, res) => {
    const existing = await (0, db_1.dbget)("SELECT id FROM records WHERE id = ?", [
        req.params.id,
    ]);
    if (!existing)
        return res.status(404).json({ error: "Record not found" });
    await (0, db_1.dbrun)("DELETE FROM records WHERE id = ?", [req.params.id]);
    res.json({ message: "Record deleted successfully" });
});
exports.default = router;
