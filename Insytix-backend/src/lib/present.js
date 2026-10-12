"use strict";

/** Public user shape (never expose the password hash). */
function presentUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

/** Public tenant shape (never expose the encrypted Shopify token). */
function presentTenant(t) {
  return {
    id: t.id,
    storeName: t.store_name,
    shopifyDomain: t.shopify_domain || null,
    shopifyConnected: !!t.shopify_token_enc,
    shopifyApiVersion: t.shopify_api_version || null,
  };
}

/** Public supplier shape (never expose the encrypted FTP password). */
function presentSupplier(s) {
  return {
    id: s.id,
    name: s.name,
    method: s.method,
    status: s.status,
    productCount: s.product_count ?? undefined,
    ftp: s.method === "ftp"
      ? {
          protocol: s.ftp_protocol,
          host: s.ftp_host,
          port: s.ftp_port,
          username: s.ftp_username,
          remotePath: s.ftp_remote_path,
          hasPassword: !!s.ftp_password_enc,
        }
      : null,
    lastIngestAt: s.last_ingest_at || null,
    createdAt: s.created_at,
  };
}

module.exports = { presentUser, presentTenant, presentSupplier };
