"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const bcrypt_1 = __importDefault(require("bcrypt"));
const uuid_1 = require("uuid");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Zod schemas
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    role: zod_1.z.enum(["VIEWER", "ANALYST", "ADMIN"]).optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
// Login (Public)
router.post("/login", async (req, res) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ errors: result.error.errors });
    const { email, password } = result.data;
    const user = (await (0, db_1.dbget)("SELECT * FROM users WHERE email = ?", [
        email,
    ]));
    if (!user || user.status !== "ACTIVE")
        return res
            .status(401)
            .json({ error: "Invalid credentials or inactive user" });
    const isValid = await bcrypt_1.default.compare(password, user.password);
    if (!isValid)
        return res.status(401).json({ error: "Invalid credentials" });
    const jwtSecret = (0, auth_1.getJwtSecret)();
    if (!jwtSecret) {
        return res
            .status(500)
            .json({ error: "Server misconfigured: JWT secret is not set" });
    }
    const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, jwtSecret, {
        expiresIn: "1d",
    });
    res.json({
        token,
        user: { id: user.id, email: user.email, role: user.role },
    });
});
// Create User (Admin only)
router.post("/", auth_1.authenticate, (0, auth_1.authorize)(["ADMIN"]), async (req, res) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ errors: result.error.errors });
    const { email, password, role = "VIEWER" } = result.data;
    const existing = await (0, db_1.dbget)("SELECT id FROM users WHERE email = ?", [
        email,
    ]);
    if (existing)
        return res.status(400).json({ error: "Email already exists" });
    const hash = await bcrypt_1.default.hash(password, 10);
    const id = (0, uuid_1.v4)();
    await (0, db_1.dbrun)("INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)", [id, email, hash, role]);
    res.status(201).json({ id, email, role });
});
// List Users (Admin only)
router.get("/", auth_1.authenticate, (0, auth_1.authorize)(["ADMIN"]), async (req, res) => {
    const users = await (0, db_1.dball)("SELECT id, email, role, status, createdAt FROM users");
    res.json(users);
});
// Update User (Admin only)
router.patch("/:id", auth_1.authenticate, (0, auth_1.authorize)(["ADMIN"]), async (req, res) => {
    const updateSchema = zod_1.z.object({
        role: zod_1.z.enum(["VIEWER", "ANALYST", "ADMIN"]).optional(),
        status: zod_1.z.enum(["ACTIVE", "INACTIVE"]).optional(),
    });
    const result = updateSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ errors: result.error.errors });
    const updates = [];
    const params = [];
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
    await (0, db_1.dbrun)(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
    res.json({ message: "User updated successfully" });
});
// Delete User (Admin only)
router.delete("/:id", auth_1.authenticate, (0, auth_1.authorize)(["ADMIN"]), async (req, res) => {
    const existing = await (0, db_1.dbget)("SELECT id FROM users WHERE id = ?", [
        req.params.id,
    ]);
    if (!existing)
        return res.status(404).json({ error: "User not found" });
    // Optional: if deleting a user, you might want to also delete their records or leave them.
    // Here we'll delete the user along with their records to maintain referential integrity.
    await (0, db_1.dbrun)("DELETE FROM records WHERE userId = ?", [req.params.id]);
    await (0, db_1.dbrun)("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ message: "User deleted successfully" });
});
exports.default = router;
