"use strict";

const router = require("express").Router();
const multer = require("multer");
const ctrl = require("../controllers/supplier.controller");

// Feed files are held in memory and streamed straight into the parser (max 50 MB).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.post("/test-connection", ctrl.testConfig); // stateless FTP test (before saving)
router.get("/:id", ctrl.getOne);
router.delete("/:id", ctrl.remove);
router.patch("/:id/status", ctrl.setStatus);
router.post("/:id/upload", upload.single("file"), ctrl.upload);
router.post("/:id/fetch", ctrl.fetch);
router.post("/:id/test", ctrl.test);
router.get("/:id/runs", ctrl.runs);

module.exports = router;
