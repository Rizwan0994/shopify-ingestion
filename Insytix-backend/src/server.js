"use strict";

require("./db"); // opens the SQLite database and applies the schema
const app = require("./app");
const config = require("./config/env");

app.listen(config.port, () => {
  console.log(`\n  Insytix backend running at http://localhost:${config.port}`);
  console.log(`  Health check:            http://localhost:${config.port}/health\n`);
});
