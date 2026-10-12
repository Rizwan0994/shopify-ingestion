"use strict";

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const config = require("../config/env");

// Ensure the data directory exists before opening the file.
const dir = path.dirname(config.dbFile);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(config.dbFile);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Apply the schema (idempotent — CREATE TABLE IF NOT EXISTS).
const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

module.exports = db;
