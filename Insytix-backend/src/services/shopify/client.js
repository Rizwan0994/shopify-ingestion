"use strict";

const axios = require("axios");

/** Extract a readable message from a GraphQL transport error or userErrors list. */
function shopifyErrorMessage(err) {
  if (err?.response?.data?.errors) {
    const e = err.response.data.errors;
    if (typeof e === "string") return e;
    if (Array.isArray(e)) return e.map((x) => x.message).join("; ");
    try { return JSON.stringify(e); } catch { /* ignore */ }
  }
  if (err?.response?.status === 401 || err?.response?.status === 403) return "invalid access token or insufficient scopes";
  return err?.message || "Unknown Shopify error";
}

/**
 * Thin GraphQL Admin API client bound to one store.
 * The GraphQL Admin API is Shopify's current, supported API (the REST product
 * endpoints are legacy as of 2024-10), so all catalog writes go through here.
 * cfg = { shop, token, apiVersion }
 */
function createClient({ shop, token, apiVersion }) {
  const http = axios.create({
    baseURL: `https://${shop}/admin/api/${apiVersion}`,
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
    timeout: 30000,
  });

  async function graphql(query, variables = {}) {
    const { data } = await http.post("/graphql.json", { query, variables });
    // GraphQL returns HTTP 200 even for query-level errors (auth, throttling, bad fields).
    if (data.errors && data.errors.length) {
      throw new Error(data.errors.map((e) => e.message).join("; "));
    }
    return data.data;
  }

  return {
    graphql,

    // Used by "Test connection".
    async shopInfo() {
      const data = await graphql(`{ shop { name email myshopifyDomain } }`);
      return data.shop;
    },

    // First active location (needed to set inventory).
    async primaryLocationId() {
      const data = await graphql(`{ locations(first: 10) { nodes { id name } } }`);
      const nodes = data.locations?.nodes || [];
      return nodes[0]?.id || null;
    },
  };
}

module.exports = { createClient, shopifyErrorMessage };
