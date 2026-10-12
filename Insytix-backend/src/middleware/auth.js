"use strict";

const jwtLib = require("../lib/jwt");
const { ApiError } = require("../lib/http");
const userRepo = require("../models/user.repo");
const tenantRepo = require("../models/tenant.repo");

function readToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  if (req.headers["x-access-token"]) return String(req.headers["x-access-token"]).trim();
  return null;
}

/** Verify the JWT, load the user + tenant, and attach them to the request. */
function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return next(new ApiError(401, "Authentication required."));

  let payload;
  try {
    payload = jwtLib.verify(token);
  } catch {
    return next(new ApiError(401, "Session expired or invalid. Please sign in again."));
  }

  const user = userRepo.findById(payload.id);
  if (!user || !user.is_active) return next(new ApiError(401, "Account not found or disabled."));

  const tenant = tenantRepo.findById(user.tenant_id);
  if (!tenant) return next(new ApiError(401, "Workspace not found."));

  req.user = user;
  req.tenant = tenant;
  req.tenantId = tenant.id;
  next();
}

module.exports = { requireAuth };
