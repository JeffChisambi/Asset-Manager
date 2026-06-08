/**
 * Standalone production server for Expo web + mobile builds.
 *
 * Routes:
 * - /api/*                              → proxied to API server on port 3000
 * - /manifest (expo-platform header)    → iOS/Android manifest JSON (for Expo Go)
 * - Static files from ./dist/           → Expo web export (SPA)
 * - Everything else                     → ./dist/index.html (SPA client-side routing)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST_ROOT = path.resolve(__dirname, "..", "dist");
const STATIC_BUILD = path.resolve(__dirname, "..", "static-build");
const API_PORT = parseInt(process.env.API_PORT || "3000", 10);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
};

function proxyToApi(req, res) {
  const options = {
    hostname: "localhost",
    port: API_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${API_PORT}` },
  };
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "application/json" });
    }
    res.end(JSON.stringify({ error: "API server unavailable" }));
  });
  req.pipe(proxyReq, { end: true });
}

function serveManifest(platform, res) {
  const manifestPath = path.join(STATIC_BUILD, platform, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: `Manifest not found for platform: ${platform}` }));
    return;
  }
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.writeHead(200, {
    "content-type": "application/json",
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
  });
  res.end(manifest);
}

function serveStaticOrSpa(urlPath, res) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(DIST_ROOT, safePath);

  if (!filePath.startsWith(DIST_ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  // Try exact file match
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { "content-type": contentType });
    res.end(content);
    return;
  }

  // SPA fallback — serve index.html for all unmatched routes
  const indexPath = path.join(DIST_ROOT, "index.html");
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath);
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(content);
    return;
  }

  res.writeHead(404);
  res.end("Not Found — web build missing. Run: pnpm --filter @workspace/doorstep-app run build:web");
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Proxy all /api/* requests to the API server
  if (pathname.startsWith("/api/")) {
    return proxyToApi(req, res);
  }

  // Expo Go manifest serving (iOS/Android)
  if (pathname === "/" || pathname === "/manifest") {
    const platform = req.headers["expo-platform"];
    if (platform === "ios" || platform === "android") {
      return serveManifest(platform, res);
    }
  }

  // Serve web app (SPA with fallback)
  serveStaticOrSpa(pathname, res);
});

const port = parseInt(process.env.PORT || "5000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`Serving Doorstep web app on port ${port}`);
  console.log(`Web build: ${fs.existsSync(DIST_ROOT) ? "found" : "MISSING — run build:web"}`);
});
