"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
const db_1 = require("./db");
const users_1 = __importDefault(require("./routes/users"));
const records_1 = __importDefault(require("./routes/records"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Main Routes
app.get("/", (req, res) => {
    res.send("<h1>Welcome to the Finance Dashboard Backend API</h1><p>API is running successfully!</p>");
});
app.use("/users", users_1.default);
app.use("/records", records_1.default);
app.use("/dashboard", dashboard_1.default);
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});
// Global Error Handler
app.use((err, req, res, next) => {
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({ errors: err.errors });
    }
    const statusCode = typeof err === "object" && err !== null && "statusCode" in err &&
        typeof err.statusCode === "number"
        ? err.statusCode
        : 500;
    if (err instanceof Error) {
        console.error(err.stack);
    }
    else {
        console.error(err);
    }
    res.status(statusCode).json({
        error: statusCode === 500
            ? "An unexpected database or server error occurred"
            : "Request failed",
    });
});
// Init DB & Start Express
(0, db_1.initDb)()
    .then(() => {
    console.log("Database initialized");
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
})
    .catch((err) => {
    console.error("Failed to initialize database", err);
    process.exit(1);
});
