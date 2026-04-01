"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = exports.dball = exports.dbget = exports.dbrun = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const uuid_1 = require("uuid");
// Keep the database file anchored at the project root so it works in both dev and build output.
const dbPath = path_1.default.resolve(process.cwd(), "database.sqlite");
const db = new sqlite3_1.default.Database(dbPath);
const dbrun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
};
exports.dbrun = dbrun;
const dbget = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
};
exports.dbget = dbget;
const dball = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.dball = dball;
const initDb = async () => {
    await (0, exports.dbrun)("PRAGMA foreign_keys = ON");
    await (0, exports.dbrun)(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'VIEWER',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    await (0, exports.dbrun)(`
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      date DATETIME NOT NULL,
      notes TEXT,
      userId TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users (id)
    )
  `);
    // Insert a default admin if none exists
    const admin = await (0, exports.dbget)(`SELECT id FROM users WHERE email = ?`, [
        "admin@finance.com",
    ]);
    if (!admin) {
        const hash = await bcrypt_1.default.hash("admin123", 10);
        await (0, exports.dbrun)(`INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)`, [(0, uuid_1.v4)(), "admin@finance.com", hash, "ADMIN"]);
    }
};
exports.initDb = initDb;
