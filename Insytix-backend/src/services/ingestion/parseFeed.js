"use strict";

const { parse } = require("csv-parse/sync");

/** Sniff the most likely delimiter from the header line. */
function sniffDelimiter(text) {
  const firstLine = text.split(/\r?\n/)[0] || "";
  const counts = {
    ",": (firstLine.match(/,/g) || []).length,
    "\t": (firstLine.match(/\t/g) || []).length,
    ";": (firstLine.match(/;/g) || []).length,
    "|": (firstLine.match(/\|/g) || []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] || ",";
}

/** Detect a spreadsheet binary by magic bytes: XLSX = ZIP ("PK"), legacy XLS = OLE. */
function isSpreadsheet(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4) return false;
  const pk = buf[0] === 0x50 && buf[1] === 0x4b; // "PK" (xlsx/zip)
  const ole = buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0; // legacy .xls
  return pk || ole;
}

/** Parse an .xlsx / .xls buffer (first worksheet) into row objects. */
function parseSpreadsheet(buf) {
  const XLSX = require("xlsx"); // lazy — only loaded for spreadsheet feeds
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
}

/** Parse CSV / TSV / semicolon / pipe delimited text into row objects. */
function parseText(input) {
  const text = Buffer.isBuffer(input) ? input.toString("utf8") : String(input);
  if (!text.trim()) return [];
  const delimiter = sniffDelimiter(text);
  return parse(text, {
    columns: (header) => header.map((h) => String(h || "").trim()),
    delimiter,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
    relax_quotes: true,
  });
}

/**
 * Parse a feed file (Buffer or String) into an array of plain row objects keyed by header.
 * Auto-detects spreadsheet (.xlsx/.xls) vs delimited text (CSV/TSV) — so the CSV-upload and
 * FTP paths both accept either format.
 */
function parseFeed(input) {
  if (isSpreadsheet(input)) return parseSpreadsheet(input);
  return parseText(input);
}

module.exports = { parseFeed };
