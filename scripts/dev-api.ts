import http from "http";
import { promises as fs } from "fs";
import path from "path";
import url from "url";

const PORT = Number(process.env.PORT || 4000);
const ROOT = path.resolve(process.cwd(), "src/generated_html");

function formatTripTitle(slug: string): string {
  // Turn YYYY-MM-DD or folder-name into a nice title
  const cleaned = slug.replace(/[_-]+/g, " ").trim();
  return cleaned
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function listTrips() {
  const entries = await fs.readdir(ROOT, { withFileTypes: true });
  const trips = [] as Array<{ slug: string; title: string; aiFiles: string[] }>;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    const dir = path.join(ROOT, slug);
    const files = await fs.readdir(dir);
    const html = files.filter((f) => f.toLowerCase().endsWith(".html"));
    const aiFiles = html.filter((f) => f.toLowerCase() !== "index.html");
    trips.push({ slug, title: formatTripTitle(slug), aiFiles: aiFiles.sort() });
  }
  // Sort newest first if folders are date-like
  trips.sort((a, b) => b.slug.localeCompare(a.slug));
  return trips;
}

async function getTrip(slug: string) {
  const dir = path.join(ROOT, slug);
  const stat = await fs.stat(dir).catch(() => null);
  if (!stat || !stat.isDirectory()) return null;
  const files = await fs.readdir(dir);
  const html = files.filter((f) => f.toLowerCase().endsWith(".html"));
  const aiFiles = html.filter((f) => f.toLowerCase() !== "index.html").sort();
  return { slug, title: formatTripTitle(slug), aiFiles };
}

function sendJson(res: http.ServerResponse, obj: unknown, status = 200) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendText(res: http.ServerResponse, text: string, status = 200, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  res.end(text);
}

async function serveStatic(res: http.ServerResponse, filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType =
    ext === ".html" ? "text/html; charset=utf-8" :
    ext === ".css" ? "text/css; charset=utf-8" :
    ext === ".js" ? "text/javascript; charset=utf-8" :
    ext === ".json" ? "application/json; charset=utf-8" :
    ext === ".svg" ? "image/svg+xml" :
    ext === ".png" ? "image/png" :
    ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
    "application/octet-stream";

  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch (err: any) {
    if (err && err.code === "ENOENT") {
      sendText(res, "Not Found", 404);
    } else {
      sendText(res, "Internal Server Error", 500);
    }
  }
}

const server = http.createServer(async (req, res) => {
  if (!req.url) return sendText(res, "Bad Request", 400);
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || "/";

  // API routes
  if (pathname === "/api/trips" && req.method === "GET") {
    try {
      const trips = await listTrips();
      return sendJson(res, trips);
    } catch (e) {
      return sendText(res, "Failed to list trips", 500);
    }
  }

  const tripMatch = pathname.match(/^\/api\/trip\/([^/]+)$/);
  if (tripMatch && req.method === "GET") {
    try {
      const slug = decodeURIComponent(tripMatch[1]);
      const trip = await getTrip(slug);
      if (!trip) return sendText(res, "Trip Not Found", 404);
      return sendJson(res, trip);
    } catch (e) {
      return sendText(res, "Failed to get trip", 500);
    }
  }

  // Static under /generated_html/**
  if (pathname.startsWith("/generated_html/")) {
    const rel = pathname.replace(/^\/generated_html\//, "");
    const unsafe = path.join(ROOT, rel);
    const safe = path.normalize(unsafe);
    if (!safe.startsWith(ROOT)) {
      return sendText(res, "Forbidden", 403);
    }
    return serveStatic(res, safe);
  }

  // Health/info root
  if (pathname === "/") {
    return sendText(
      res,
      "Dev API running. Endpoints: GET /api/trips, GET /api/trip/:slug, static /generated_html/*"
    );
  }

  return sendText(res, "Not Found", 404);
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Dev API server listening on http://localhost:${PORT}`);
});
