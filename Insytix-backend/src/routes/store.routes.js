"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/store.controller");

router.get("/", ctrl.get);
router.put("/", ctrl.save);
router.post("/test", ctrl.test);
router.delete("/", ctrl.disconnect);

module.exports = router;
