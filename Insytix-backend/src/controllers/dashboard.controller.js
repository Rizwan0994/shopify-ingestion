"use strict";

const { asyncHandler, ok } = require("../lib/http");
const productRepo = require("../models/product.repo");
const supplierRepo = require("../models/supplier.repo");
const ingestionRunRepo = require("../models/ingestionRun.repo");
const { presentSupplier } = require("../lib/present");

// GET /api/dashboard/stats
const stats = asyncHandler(async (req, res) => {
  return ok(res, {
    counts: productRepo.counts(req.tenantId),
    suppliers: supplierRepo.listWithCounts(req.tenantId).map(presentSupplier),
    recentRuns: ingestionRunRepo.listRecent(req.tenantId, 8),
    byCategory: productRepo.breakdownByCategory(req.tenantId),
    bySupplier: productRepo.breakdownBySupplier(req.tenantId),
    shopify: {
      connected: !!req.tenant.shopify_token_enc,
      domain: req.tenant.shopify_domain || null,
    },
  });
});

module.exports = { stats };
