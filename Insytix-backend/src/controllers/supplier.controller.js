"use strict";

const { ApiError, asyncHandler, ok } = require("../lib/http");
const { presentSupplier } = require("../lib/present");
const { encrypt } = require("../lib/crypto");
const supplierRepo = require("../models/supplier.repo");
const ingestionRunRepo = require("../models/ingestionRun.repo");
const { ingestUpload, ingestFromFtp } = require("../services/ingestion/ingest");
const { testConnection } = require("../services/ingestion/ftpClient");
const { decrypt } = require("../lib/crypto");

// GET /api/suppliers
const list = asyncHandler(async (req, res) => {
  const rows = supplierRepo.listWithCounts(req.tenantId);
  return ok(res, rows.map(presentSupplier));
});

// GET /api/suppliers/:id
const getOne = asyncHandler(async (req, res) => {
  const s = supplierRepo.findById(req.tenantId, req.params.id);
  if (!s) throw new ApiError(404, "Supplier not found.");
  return ok(res, presentSupplier(s));
});

// POST /api/suppliers
const create = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const method = String(req.body.method || "").trim();
  if (!name) throw new ApiError(400, "Supplier name is required.");
  if (!["csv", "ftp"].includes(method)) throw new ApiError(400, "Method must be 'csv' or 'ftp'.");

  const data = { name, method, column_map: req.body.columnMap || null };

  if (method === "ftp") {
    const protocol = String(req.body.protocol || "ftp").toLowerCase();
    if (!["ftp", "ftps", "sftp"].includes(protocol)) throw new ApiError(400, "Protocol must be ftp, ftps or sftp.");
    if (!req.body.host) throw new ApiError(400, "FTP host is required.");
    if (!req.body.remotePath) throw new ApiError(400, "Remote file path is required.");
    data.ftp_protocol = protocol;
    data.ftp_host = String(req.body.host).trim();
    data.ftp_port = req.body.port ? Number(req.body.port) : protocol === "sftp" ? 22 : 21;
    data.ftp_username = req.body.username ? String(req.body.username).trim() : null;
    data.ftp_password_enc = req.body.password ? encrypt(String(req.body.password)) : null;
    data.ftp_remote_path = String(req.body.remotePath).trim();
  }

  const supplier = supplierRepo.create(req.tenantId, data);
  return ok(res, presentSupplier(supplier));
});

// DELETE /api/suppliers/:id
const remove = asyncHandler(async (req, res) => {
  const s = supplierRepo.findById(req.tenantId, req.params.id);
  if (!s) throw new ApiError(404, "Supplier not found.");
  supplierRepo.remove(req.tenantId, req.params.id);
  return ok(res, { deleted: true });
});

// PATCH /api/suppliers/:id/status  { status }
const setStatus = asyncHandler(async (req, res) => {
  const s = supplierRepo.findById(req.tenantId, req.params.id);
  if (!s) throw new ApiError(404, "Supplier not found.");
  const status = req.body.status === "paused" ? "paused" : "active";
  return ok(res, presentSupplier(supplierRepo.setStatus(req.tenantId, req.params.id, status)));
});

// POST /api/suppliers/:id/upload  (multipart: file)
const upload = asyncHandler(async (req, res) => {
  const supplier = supplierRepo.findById(req.tenantId, req.params.id);
  if (!supplier) throw new ApiError(404, "Supplier not found.");
  if (!req.file || !req.file.buffer) throw new ApiError(400, "No file uploaded. Attach a CSV file.");

  const result = ingestUpload({ tenant: req.tenant, supplier, buffer: req.file.buffer, filename: req.file.originalname });
  if (result.error) throw new ApiError(422, result.error);
  return ok(res, { run: result.run, summary: result.summary });
});

// POST /api/suppliers/:id/fetch  (pull from FTP/SFTP)
const fetch = asyncHandler(async (req, res) => {
  const supplier = supplierRepo.findById(req.tenantId, req.params.id);
  if (!supplier) throw new ApiError(404, "Supplier not found.");
  if (supplier.method !== "ftp") throw new ApiError(400, "This supplier is not configured for FTP.");

  try {
    const result = await ingestFromFtp({ tenant: req.tenant, supplier });
    if (result.error) throw new ApiError(422, result.error);
    return ok(res, { run: result.run, summary: result.summary });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    ingestionRunRepo.record(req.tenantId, supplier.id, {
      method: "ftp", source: supplier.ftp_remote_path, status: "failed", message: err.message,
    });
    throw new ApiError(422, `FTP fetch failed: ${err.message}`);
  }
});

// POST /api/suppliers/test-connection  (test FTP details before saving a supplier)
const testConfig = asyncHandler(async (req, res) => {
  const protocol = String(req.body.protocol || "ftp").toLowerCase();
  if (!req.body.host) throw new ApiError(400, "FTP host is required.");
  try {
    const result = await testConnection({
      protocol,
      host: String(req.body.host).trim(),
      port: req.body.port ? Number(req.body.port) : protocol === "sftp" ? 22 : 21,
      username: req.body.username || null,
      password: req.body.password || null,
      remotePath: req.body.remotePath || "/",
    });
    return ok(res, result);
  } catch (err) {
    throw new ApiError(422, `Connection failed: ${err.message}`);
  }
});

// POST /api/suppliers/:id/test  (test FTP connection)
const test = asyncHandler(async (req, res) => {
  const supplier = supplierRepo.findById(req.tenantId, req.params.id);
  if (!supplier) throw new ApiError(404, "Supplier not found.");
  if (supplier.method !== "ftp") throw new ApiError(400, "This supplier is not configured for FTP.");
  try {
    const result = await testConnection({
      protocol: supplier.ftp_protocol,
      host: supplier.ftp_host,
      port: supplier.ftp_port,
      username: supplier.ftp_username,
      password: decrypt(supplier.ftp_password_enc),
      remotePath: supplier.ftp_remote_path,
    });
    return ok(res, result);
  } catch (err) {
    throw new ApiError(422, `Connection failed: ${err.message}`);
  }
});

// GET /api/suppliers/:id/runs
const runs = asyncHandler(async (req, res) => {
  const supplier = supplierRepo.findById(req.tenantId, req.params.id);
  if (!supplier) throw new ApiError(404, "Supplier not found.");
  return ok(res, ingestionRunRepo.listForSupplier(req.tenantId, req.params.id, 15));
});

module.exports = { list, getOne, create, remove, setStatus, upload, fetch, test, testConfig, runs };
