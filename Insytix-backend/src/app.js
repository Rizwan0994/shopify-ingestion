"use strict";

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const config = require("./config/env");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();

app.use(
  cors({
    origin(origin, cb) {
      // Allow same-origin / tools with no Origin header, and any configured frontend origin.
      if (!origin || config.frontendOrigins.includes(origin)) return cb(null, true);
      return cb(null, true); // demo: permissive; tighten for production
    },
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ success: true, data: { status: "ok", service: "insytix-backend" } }));

app.use("/api", require("./routes"));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
