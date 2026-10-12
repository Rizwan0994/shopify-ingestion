"use strict";

const bcrypt = require("bcryptjs");
const db = require("../db");
const jwtLib = require("../lib/jwt");
const { ApiError, asyncHandler, ok } = require("../lib/http");
const { presentUser, presentTenant } = require("../lib/present");
const userRepo = require("../models/user.repo");
const tenantRepo = require("../models/tenant.repo");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function issue(res, user, tenant) {
  const token = jwtLib.sign({ id: user.id, tenantId: tenant.id });
  return ok(res, { token, user: presentUser(user), tenant: presentTenant(tenant) });
}

// POST /api/auth/signup  { storeName, name?, email, password }
const signup = asyncHandler(async (req, res) => {
  const storeName = String(req.body.storeName || "").trim();
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!storeName) throw new ApiError(400, "Store name is required.");
  if (!EMAIL_RE.test(email)) throw new ApiError(400, "A valid email is required.");
  if (password.length < 8) throw new ApiError(400, "Password must be at least 8 characters.");
  if (userRepo.findByEmail(email)) throw new ApiError(409, "An account with this email already exists.");

  const run = db.transaction(() => {
    const tenant = tenantRepo.create({ storeName });
    const passwordHash = bcrypt.hashSync(password, 10);
    const user = userRepo.create({ tenantId: tenant.id, name: name || storeName, email, passwordHash, role: "owner" });
    return { tenant, user };
  });
  const { tenant, user } = run();
  return issue(res, user, tenant);
});

// POST /api/auth/login  { email, password }
const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  const user = userRepo.findByEmail(email);
  if (!user || !user.is_active) throw new ApiError(401, "Invalid email or password.");
  if (!bcrypt.compareSync(password, user.password_hash)) throw new ApiError(401, "Invalid email or password.");

  const tenant = tenantRepo.findById(user.tenant_id);
  if (!tenant) throw new ApiError(401, "Workspace not found.");
  return issue(res, user, tenant);
});

// GET /api/auth/me  (requireAuth)
const me = asyncHandler(async (req, res) => {
  return ok(res, { user: presentUser(req.user), tenant: presentTenant(req.tenant) });
});

module.exports = { signup, login, me };
