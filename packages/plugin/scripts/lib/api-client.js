#!/usr/bin/env node
"use strict";

const { getConfig, isConfigured } = require("./config");

/**
 * Simple HTTP client for the Vibecircle API.
 * Uses native fetch (Node 18+).
 * All methods: read apiUrl and authToken from config.
 * Error handling: log to stderr, return null on failure.
 * Exit 0 always (never block Claude Code).
 */

/** Build headers with Bearer token auth */
function buildHeaders(extra) {
  const config = getConfig();
  const headers = {
    "Content-Type": "application/json",
    ...(config.authToken ? { Authorization: `Bearer ${config.authToken}` } : {}),
    ...extra,
  };
  return headers;
}

/** Get the base API URL from config */
function getBaseUrl() {
  const config = getConfig();
  return (config.apiUrl || "").replace(/\/+$/, "");
}

/**
 * POST with JSON body + Bearer token
 * @param {string} urlPath - API path (e.g., "/api/presence")
 * @param {object} body - JSON body
 * @returns {Promise<object|null>} parsed response or null on failure
 */
async function post(urlPath, body) {
  if (!isConfigured()) return null;

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${urlPath}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      process.stderr.write(
        `[vibecircle] POST ${urlPath} failed: ${res.status} ${text}\n`
      );
      return null;
    }
    return await res.json();
  } catch (err) {
    process.stderr.write(`[vibecircle] POST ${urlPath} error: ${err.message}\n`);
    return null;
  }
}

/**
 * PUT with JSON body + Bearer token
 * @param {string} urlPath - API path
 * @param {object} body - JSON body
 * @returns {Promise<object|null>}
 */
async function put(urlPath, body) {
  if (!isConfigured()) return null;

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${urlPath}`;

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      process.stderr.write(
        `[vibecircle] PUT ${urlPath} failed: ${res.status} ${text}\n`
      );
      return null;
    }
    return await res.json();
  } catch (err) {
    process.stderr.write(`[vibecircle] PUT ${urlPath} error: ${err.message}\n`);
    return null;
  }
}

/**
 * GET with Bearer token
 * @param {string} urlPath - API path
 * @returns {Promise<object|null>}
 */
async function get(urlPath) {
  if (!isConfigured()) return null;

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${urlPath}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: buildHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      process.stderr.write(
        `[vibecircle] GET ${urlPath} failed: ${res.status} ${text}\n`
      );
      return null;
    }
    return await res.json();
  } catch (err) {
    process.stderr.write(`[vibecircle] GET ${urlPath} error: ${err.message}\n`);
    return null;
  }
}

/**
 * Upload a file via multipart form data
 * @param {string} urlPath - API path (e.g., "/api/upload")
 * @param {string} filePath - local file path
 * @returns {Promise<object|null>} { url, type, size } or null
 */
async function uploadFile(urlPath, filePath) {
  if (!isConfigured()) return null;

  const fs = require("fs");
  const path = require("path");

  if (!fs.existsSync(filePath)) {
    process.stderr.write(`[vibecircle] Upload file not found: ${filePath}\n`);
    return null;
  }

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${urlPath}`;
  const config = getConfig();

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();

    // Determine content type
    const mimeTypes = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".mp4": "video/mp4",
    };
    const contentType = mimeTypes[ext] || "image/png";

    const blob = new Blob([fileBuffer], { type: contentType });
    const formData = new FormData();
    formData.append("file", blob, fileName);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...(config.authToken
          ? { Authorization: `Bearer ${config.authToken}` }
          : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      process.stderr.write(
        `[vibecircle] Upload ${urlPath} failed: ${res.status} ${text}\n`
      );
      return null;
    }
    return await res.json();
  } catch (err) {
    process.stderr.write(`[vibecircle] Upload error: ${err.message}\n`);
    return null;
  }
}

module.exports = { post, put, get, uploadFile };
