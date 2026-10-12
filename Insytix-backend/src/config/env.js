"use strict";

const path = require("path");
require("dotenv").config();

const root = path.resolve(__dirname, "..", "..");

function resolveFromRoot(p, fallback) {
  const value = p || fallback;
  return path.isAbsolute(value) ? value : path.join(root, value);
}

const config = {
  root,
  port: Number(process.env.PORT) || 8080,
  dbFile: resolveFromRoot(process.env.DB_FILE, "./data/insytix.db"),
  uploadsDir: path.join(root, "uploads"),
  sampleDataDir: path.join(root, "src", "sample-data"),

  jwtSecret: process.env.JWT_SECRET || "insytix-dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  encryptionKey: process.env.ENCRYPTION_KEY || "insytix-dev-encryption-key-change-me",

  frontendOrigins: (process.env.FRONTEND_ORIGIN ||
    "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  shopifyApiVersion: process.env.SHOPIFY_API_VERSION || "2026-10",

  ftpDemo: {
    port: Number(process.env.FTP_DEMO_PORT) || 2121,
    user: process.env.FTP_DEMO_USER || "insytix",
    password: process.env.FTP_DEMO_PASSWORD || "insytix123",
  },
};

module.exports = config;
