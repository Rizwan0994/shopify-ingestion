"use strict";

const crypto = require("crypto");

/** RFC4122 v4 id (Node 22 built-in — no external uuid dependency). */
function newId() {
  return crypto.randomUUID();
}

/** Current timestamp as ISO string (how all *_at columns are stored). */
function now() {
  return new Date().toISOString();
}

/** Coerce a loose value to a finite number or null. */
function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  // Strip currency symbols, thousands separators and stray spaces.
  const cleaned = String(value).replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Coerce to a non-negative integer (for stock quantities). */
function toQuantity(value) {
  const n = toNumber(value);
  if (n === null) return 0;
  return Math.max(0, Math.floor(n));
}

module.exports = { newId, now, toNumber, toQuantity };
