#!/usr/bin/env node
"use strict";

/**
 * Capture a screenshot of the current dev server or Vercel preview.
 * 1. Check common dev server ports (3000, 3001, 5173, 5174, 8080)
 * 2. If found, use Playwright (or Puppeteer) to screenshot
 * 3. If no dev server, try the latest Vercel preview URL
 * 4. Output the screenshot file path to stdout (or empty string)
 * Always exits 0 — never blocks Claude Code.
 */

const { execFileSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

const PORTS = [3000, 3001, 5173, 5174, 8080];

/** Check if a local port is responding */
async function checkPort(port) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`http://localhost:${port}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

/** Find the first responding local dev server */
async function findDevServer() {
  for (const port of PORTS) {
    if (await checkPort(port)) {
      return `http://localhost:${port}`;
    }
  }
  return null;
}

/** Try to get the latest Vercel preview URL */
function getVercelPreviewUrl() {
  try {
    const output = execFileSync("vercel", ["ls", "--json"], {
      encoding: "utf-8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const data = JSON.parse(output);
    // vercel ls --json returns an array of deployments
    if (Array.isArray(data) && data.length > 0) {
      const latest = data[0];
      if (latest.url) {
        return latest.url.startsWith("http")
          ? latest.url
          : `https://${latest.url}`;
      }
    }
  } catch {
    // vercel CLI not available or not linked
  }
  return null;
}

/** Take a screenshot using Playwright */
async function screenshotWithPlaywright(url, outputPath) {
  let playwright;
  try {
    playwright = require("playwright");
  } catch {
    return false;
  }

  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
    await page.screenshot({ path: outputPath, type: "png" });
    return true;
  } catch (err) {
    process.stderr.write(`[vibecircle] Playwright screenshot error: ${err.message}\n`);
    return false;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/** Take a screenshot using Puppeteer */
async function screenshotWithPuppeteer(url, outputPath) {
  let puppeteer;
  try {
    puppeteer = require("puppeteer");
  } catch {
    return false;
  }

  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 15000 });
    await page.screenshot({ path: outputPath, type: "png" });
    return true;
  } catch (err) {
    process.stderr.write(`[vibecircle] Puppeteer screenshot error: ${err.message}\n`);
    return false;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

async function main() {
  // Find a URL to screenshot
  let url = await findDevServer();

  if (!url) {
    url = getVercelPreviewUrl();
  }

  if (!url) {
    // No dev server or preview URL found — output empty and exit
    process.stdout.write("");
    process.exit(0);
  }

  // Prepare output path
  const outputPath = path.join(
    os.tmpdir(),
    `vibecircle-screenshot-${Date.now()}.png`
  );

  // Try Playwright first, then Puppeteer
  let captured = await screenshotWithPlaywright(url, outputPath);

  if (!captured) {
    captured = await screenshotWithPuppeteer(url, outputPath);
  }

  if (captured && fs.existsSync(outputPath)) {
    process.stdout.write(outputPath);
  } else {
    // Could not capture — output empty
    process.stdout.write("");
  }

  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`[vibecircle] capture-screenshot error: ${err.message}\n`);
  process.stdout.write("");
  process.exit(0);
});
