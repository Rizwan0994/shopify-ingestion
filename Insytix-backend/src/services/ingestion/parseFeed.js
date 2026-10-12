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

/**
 * Parse a feed file Buffer/String into an array of plain row objects keyed by header.
 * Handles CSV / TSV / semicolon / pipe delimited text, BOM, ragged rows and quotes.
 */
function parseFeed(input) {
  const text = Buffer.isBuffer(input) ? input.toString("utf8") : String(input);
  if (!text.trim()) return [];
  const delimiter = sniffDelimiter(text);
  const rows = parse(text, {
    columns: (header) => header.map((h) => String(h || "").trim()),
    delimiter,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
    relax_quotes: true,
  });
  return rows;
}

module.exports = { parseFeed };
