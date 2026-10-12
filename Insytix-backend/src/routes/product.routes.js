"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/product.controller");

router.get("/", ctrl.list);
router.get("/meta/filters", ctrl.filters); // before /:id so "meta" isn't read as an id
router.get("/:id", ctrl.detail);
router.post("/:id/sync", ctrl.sync);

module.exports = router;
