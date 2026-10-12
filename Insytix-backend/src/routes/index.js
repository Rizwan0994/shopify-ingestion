"use strict";

const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");

// Public
router.use("/auth", require("./auth.routes"));

// Protected (everything below requires a valid tenant session)
router.use("/dashboard", requireAuth, require("./dashboard.routes"));
router.use("/suppliers", requireAuth, require("./supplier.routes"));
router.use("/products", requireAuth, require("./product.routes"));
router.use("/store", requireAuth, require("./store.routes"));

module.exports = router;
