"use strict";

const { ApiError } = require("../lib/http");

/** 404 for unmatched routes. */
function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

/** Final error handler — always returns { success:false, message }. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) {
    // Log server-side faults for debugging; client only sees a generic message.
    console.error("[error]", err);
  }
  const message = status >= 500 ? "Something went wrong on the server." : err.message;
  res.status(status).json({ success: false, message });
}

module.exports = { notFound, errorHandler };
