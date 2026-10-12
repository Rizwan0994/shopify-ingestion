"use strict";

const norm = (h) => String(h || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Ordered candidate header names (normalised) for each logical field.
const CANDIDATES = {
  sku: ["sku", "variantsku", "itemsku", "itemnumber", "itemno", "itemcode", "partnumber", "partno", "productcode", "productid", "item", "part", "model", "modelnumber"],
  groupKey: ["groupkey", "group", "parentsku", "parent", "series", "collection", "family", "styleno", "style"],
  title: ["title", "name", "productname", "itemname", "longdescription", "producttitle", "description"],
  description: ["description", "longdescription", "details", "productdescription", "body", "copy"],
  category: ["category", "categories", "producttype", "type", "department", "productcategory", "class"],
  vendor: ["vendor", "brand", "manufacturer", "make", "supplier"],
  price: ["price", "cost", "wholesale", "wholesalecost", "dealercost", "unitprice", "netprice", "wsp"],
  compareAtPrice: ["compareatprice", "msrp", "map", "retail", "listprice", "rrp", "retailprice"],
  quantity: ["quantity", "qty", "stock", "onhand", "inventory", "available", "availableqty", "instock", "oh"],
  image: ["imageurl", "image", "images", "imageurls", "photo", "picture", "imagelink", "mainimage"],
  barcode: ["barcode", "upc", "gtin", "ean"],
  type: ["type", "producttype", "kind", "itemtype"],
  components: ["components", "bundlecomponents", "kititems", "setcomponents", "bom", "includes"],
};

// Option columns: explicit (option1_name/value) or the common color/size convention.
const OPTION_BY_HEADER = {
  color: "Color",
  colour: "Color",
  finish: "Finish",
  size: "Size",
  dimension: "Size",
  dimensions: "Size",
  material: "Material",
};

function pick(headers, candidates, used) {
  const normed = headers.map((raw) => ({ raw, n: norm(raw) }));
  for (const c of candidates) {
    const hit = normed.find((h) => h.n === c && !used.has(h.raw));
    if (hit) { used.add(hit.raw); return hit.raw; }
  }
  for (const c of candidates) {
    const hit = normed.find((h) => h.n.includes(c) && !used.has(h.raw));
    if (hit) { used.add(hit.raw); return hit.raw; }
  }
  return null;
}

/**
 * Resolve a feed's headers to logical fields. `overrides` (from supplier.column_map)
 * is a map of logicalField -> exact header name and always wins.
 * Returns { fields: {sku, title, ...}, options: [{name, header}], hasExplicitOptions }.
 */
function resolveColumns(headers, overrides = {}) {
  const used = new Set();
  const fields = {};

  // Honour explicit overrides first so they are never stolen by heuristics.
  for (const [logical, header] of Object.entries(overrides || {})) {
    if (header && headers.includes(header)) {
      fields[logical] = header;
      used.add(header);
    }
  }

  const order = ["sku", "groupKey", "title", "description", "category", "vendor", "price", "compareAtPrice", "quantity", "image", "barcode", "type", "components"];
  for (const logical of order) {
    if (fields[logical]) continue;
    fields[logical] = pick(headers, CANDIDATES[logical], used);
  }

  // Options: explicit option{N}_name/option{N}_value columns take priority.
  const options = [];
  let hasExplicitOptions = false;
  for (let i = 1; i <= 3; i++) {
    const nameCol = headers.find((h) => norm(h) === `option${i}name`);
    const valueCol = headers.find((h) => norm(h) === `option${i}value`);
    if (nameCol && valueCol) {
      options.push({ nameColumn: nameCol, header: valueCol });
      hasExplicitOptions = true;
    }
  }
  if (!hasExplicitOptions) {
    // Fall back to color/size/finish style option columns.
    for (const h of headers) {
      const label = OPTION_BY_HEADER[norm(h)];
      if (label && !used.has(h) && options.length < 3) {
        options.push({ name: label, header: h });
        used.add(h);
      }
    }
  }

  return { fields, options, hasExplicitOptions };
}

module.exports = { resolveColumns, norm };
