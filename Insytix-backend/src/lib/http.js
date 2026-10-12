"use strict";

/** Custom error carrying an HTTP status code. Thrown anywhere, caught by the error middleware. */
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Wrap an async route handler so thrown/rejected errors reach the error middleware. */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/** Standard success envelope: { success: true, data }. */
function ok(res, data = null) {
  return res.json({ success: true, data });
}

module.exports = { ApiError, asyncHandler, ok };
