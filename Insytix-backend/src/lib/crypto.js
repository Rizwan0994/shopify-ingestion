"use strict";

const crypto = require("crypto");
const config = require("../config/env");

// Derive a stable 32-byte key from the configured secret.
const KEY = crypto.createHash("sha256").update(String(config.encryptionKey)).digest();

/**
 * AES-256-GCM encrypt a string. Returns a compact "iv:tag:ciphertext" base64 bundle,
 * or null for empty input. Used to keep Shopify tokens / FTP passwords out of plaintext.
 */
function encrypt(plain) {
  if (plain === undefined || plain === null || plain === "") return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

/** Reverse of encrypt(). Returns null if input is empty/invalid. */
function decrypt(bundle) {
  if (!bundle) return null;
  try {
    const [ivB64, tagB64, dataB64] = String(bundle).split(":");
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

module.exports = { encrypt, decrypt };
