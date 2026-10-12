"use strict";

/**
 * Bundled demo FTP server.
 *
 * Serves src/sample-data over FTP on localhost so the "FTP supplier" method can be
 * demonstrated end-to-end with no external server. Run it in a second terminal:
 *
 *     npm run ftp-demo
 *
 * Then add an FTP supplier in the app with:
 *     protocol = ftp,  host = 127.0.0.1,  port = 2121,
 *     username = insytix,  password = insytix123,
 *     remote path = /furniture-feed.csv
 */

const FtpSrv = require("ftp-srv");
const config = require("../config/env");

const url = `ftp://0.0.0.0:${config.ftpDemo.port}`;
const server = new FtpSrv({ url, anonymous: false, pasv_url: "127.0.0.1" });

server.on("login", ({ username, password }, resolve, reject) => {
  if (username === config.ftpDemo.user && password === config.ftpDemo.password) {
    return resolve({ root: config.sampleDataDir });
  }
  return reject(new Error("Invalid FTP credentials"));
});

server
  .listen()
  .then(() => {
    console.log(`\n  Insytix demo FTP server running on port ${config.ftpDemo.port}`);
    console.log(`  Serving: ${config.sampleDataDir}`);
    console.log(`  Login:   user='${config.ftpDemo.user}'  password='${config.ftpDemo.password}'`);
    console.log(`  Feed:    /furniture-feed.csv\n`);
  })
  .catch((err) => {
    console.error("Failed to start demo FTP server:", err.message);
    process.exit(1);
  });
