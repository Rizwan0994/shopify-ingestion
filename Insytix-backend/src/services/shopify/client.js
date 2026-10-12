"use strict";

const axios = require("axios");

/** Pull a human-readable message out of a Shopify error response. */
function shopifyErrorMessage(err) {
  const data = err.response?.data;
  if (data?.errors) {
    if (typeof data.errors === "string") return data.errors;
    try { return JSON.stringify(data.errors); } catch { /* ignore */ }
  }
  return err.message || "Unknown Shopify error";
}

/**
 * Build a thin REST Admin API client bound to one store.
 * cfg = { shop, token, apiVersion }
 */
function createClient({ shop, token, apiVersion }) {
  const http = axios.create({
    baseURL: `https://${shop}/admin/api/${apiVersion}`,
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
    timeout: 30000,
  });

  return {
    async shopInfo() {
      const { data } = await http.get("/shop.json");
      return data.shop;
    },
    async locations() {
      const { data } = await http.get("/locations.json");
      return data.locations || [];
    },
    async getProduct(id) {
      const { data } = await http.get(`/products/${id}.json`);
      return data.product;
    },
    async createProduct(product) {
      const { data } = await http.post("/products.json", { product });
      return data.product;
    },
    async updateProduct(id, product) {
      const { data } = await http.put(`/products/${id}.json`, { product: { id, ...product } });
      return data.product;
    },
    async listImages(productId) {
      const { data } = await http.get(`/products/${productId}/images.json`);
      return data.images || [];
    },
    async deleteImage(productId, imageId) {
      await http.delete(`/products/${productId}/images/${imageId}.json`);
    },
    async addImage(productId, src) {
      const { data } = await http.post(`/products/${productId}/images.json`, { image: { src } });
      return data.image;
    },
    async setInventory({ locationId, inventoryItemId, available }) {
      const { data } = await http.post("/inventory_levels/set.json", {
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available: Math.max(0, Math.floor(available || 0)),
      });
      return data.inventory_level;
    },
  };
}

module.exports = { createClient, shopifyErrorMessage };
