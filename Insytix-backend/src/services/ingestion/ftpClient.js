"use strict";

const { Writable } = require("stream");
const path = require("path");
const ftp = require("basic-ftp");

/** Collect a Writable stream's chunks into a single Buffer. */
function bufferSink(chunks) {
  return new Writable({
    write(chunk, _enc, cb) {
      chunks.push(Buffer.from(chunk));
      cb();
    },
  });
}

async function fetchViaFtp(cfg, secure) {
  const client = new ftp.Client(20000);
  const chunks = [];
  try {
    await client.access({
      host: cfg.host,
      port: cfg.port || 21,
      user: cfg.username,
      password: cfg.password,
      secure, // false = FTP, true = FTPS
      secureOptions: { rejectUnauthorized: false },
    });
    await client.downloadTo(bufferSink(chunks), cfg.remotePath);
    return Buffer.concat(chunks);
  } finally {
    client.close();
  }
}

async function fetchViaSftp(cfg) {
  // Lazy require so the FTP path still works if the optional SFTP lib is unavailable.
  let SftpClient;
  try {
    SftpClient = require("ssh2-sftp-client");
  } catch {
    throw new Error("SFTP support is not installed on this server.");
  }
  const sftp = new SftpClient();
  try {
    await sftp.connect({
      host: cfg.host,
      port: cfg.port || 22,
      username: cfg.username,
      password: cfg.password,
      readyTimeout: 20000,
    });
    const data = await sftp.get(cfg.remotePath); // returns a Buffer
    return Buffer.isBuffer(data) ? data : Buffer.from(data);
  } finally {
    try { await sftp.end(); } catch { /* ignore */ }
  }
}

/**
 * Download the configured feed file and return it as a Buffer.
 * cfg = { protocol, host, port, username, password, remotePath }
 */
async function fetchFeedBuffer(cfg) {
  if (!cfg.host) throw new Error("FTP host is required.");
  if (!cfg.remotePath) throw new Error("Remote file path is required.");
  const protocol = String(cfg.protocol || "ftp").toLowerCase();
  if (protocol === "sftp") return fetchViaSftp(cfg);
  return fetchViaFtp(cfg, protocol === "ftps");
}

/** Lightweight connectivity check used by the "Test connection" button. */
async function testConnection(cfg) {
  const protocol = String(cfg.protocol || "ftp").toLowerCase();
  const dir = cfg.remotePath ? path.posix.dirname(cfg.remotePath) || "/" : "/";
  if (protocol === "sftp") {
    const SftpClient = require("ssh2-sftp-client");
    const sftp = new SftpClient();
    await sftp.connect({ host: cfg.host, port: cfg.port || 22, username: cfg.username, password: cfg.password, readyTimeout: 15000 });
    const list = await sftp.list(dir).catch(() => []);
    await sftp.end();
    return { ok: true, files: list.map((f) => f.name).slice(0, 25) };
  }
  const client = new ftp.Client(15000);
  try {
    await client.access({ host: cfg.host, port: cfg.port || 21, user: cfg.username, password: cfg.password, secure: protocol === "ftps", secureOptions: { rejectUnauthorized: false } });
    const list = await client.list(dir).catch(() => []);
    return { ok: true, files: list.map((f) => f.name).slice(0, 25) };
  } finally {
    client.close();
  }
}

module.exports = { fetchFeedBuffer, testConnection };
