import sqlite3 from "sqlite3";
import { promisify } from "util";
import path from "path";

// Use an in-memory or persisted database
const dbPath = path.resolve(__dirname, "../database.sqlite");
const db = new sqlite3.Database(dbPath);

export const dbrun = (sql: string, params: any[] = []): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
};

export const dbget = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dball = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const initDb = async () => {
  await dbrun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'VIEWER',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbrun(`
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
  const admin = await dbget(`SELECT id FROM users WHERE email = ?`, [
    "admin@finance.com",
  ]);
  if (!admin) {
    const bcrypt = require("bcryptjs");
    const { v4: uuidv4 } = require("uuid");
    const hash = await bcrypt.hash("admin123", 10);
    await dbrun(
      `INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)`,
      [uuidv4(), "admin@finance.com", hash, "ADMIN"],
    );
  }
};
