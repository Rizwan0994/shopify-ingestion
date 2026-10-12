"use strict";

const { ApiError, asyncHandler, ok } = require("../lib/http");
const productRepo = require("../models/product.repo");
const supplierRepo = require("../models/supplier.repo");
const { syncProductToShopify } = require("../services/shopify/syncProduct");

// GET /api/products?search=&supplierId=&category=&status=&syncStatus=&type=&page=&pageSize=
const list = asyncHandler(async (req, res) => {
  const result = productRepo.list(req.tenantId, {
    search: req.query.search,
    supplierId: req.query.supplierId,
    category: req.query.category,
    status: req.query.status,
    syncStatus: req.query.syncStatus,
    type: req.query.type,
    page: req.query.page,
    pageSize: req.query.pageSize,
  });
  return ok(res, result);
});

// GET /api/products/meta/filters
const filters = asyncHandler(async (req, res) => {
  return ok(res, {
    categories: productRepo.distinctCategories(req.tenantId),
    suppliers: supplierRepo.list(req.tenantId).map((s) => ({ id: s.id, name: s.name })),
    statuses: ["active", "draft"],
    syncStatuses: ["unsynced", "synced", "error"],
    types: ["simple", "variant", "bundle"],
  });
});

// GET /api/products/:id
const detail = asyncHandler(async (req, res) => {
  const product = productRepo.getDetail(req.tenantId, req.params.id);
  if (!product) throw new ApiError(404, "Product not found.");
  return ok(res, product);
});

// POST /api/products/:id/sync  → push a single product to Shopify
const sync = asyncHandler(async (req, res) => {
  const result = await syncProductToShopify(req.tenant, req.params.id);
  return ok(res, result);
});

module.exports = { list, filters, detail, sync };
