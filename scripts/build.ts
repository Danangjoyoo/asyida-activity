import { promises as fs } from "fs";
import path from "path";
import { build as esbuild } from "esbuild";

type TripData = {
  slug: string;
  title: string;
  aiFiles: string[];
  overviewHtml: string;
};

type TripManifestItem = Pick<TripData, "slug" | "title" | "aiFiles">;

const GENERATED_HTML_DIR = path.resolve("src/generated_html");
const DIST_DIR = path.resolve("dist");
const WEB_ENTRY = path.resolve("src/web/app.ts");
const TRIP_ENTRY = path.resolve("src/web/trip.ts");
const OVERVIEW_FILENAME = "overview.html";

const FALLBACK_OVERVIEW_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Overview not provided</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.15/dist/tailwind.min.css" />
  </head>
  <body class="min-h-screen bg-slate-950">
    <main class="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center text-slate-200">
      <h1 class="text-2xl font-semibold tracking-tight">Overview not provided</h1>
      <p class="text-sm text-slate-400">This trip does not include an <code>index.html</code> yet. Use the AI tabs or edit the overview file to add content.</p>
    </main>
  </body>
</html>`;

const AGENT_ORDER = ["claude", "gpt", "gemini", "grok"];

async function main(): Promise<void> {
  const trips = await discoverTrips();

  await resetDist();
  await copyTripContent(trips);
  await writeIndexHtml(trips);
  await bundleClient();
}

async function discoverTrips(): Promise<TripData[]> {
  const dirEntries = await fs.readdir(GENERATED_HTML_DIR, { withFileTypes: true });
  const tripFolders = dirEntries.filter((entry) => entry.isDirectory());

  const trips: TripData[] = [];

  for (const folder of tripFolders) {
    const slug = folder.name;
    const tripPath = path.join(GENERATED_HTML_DIR, slug);
    const files = await fs.readdir(tripPath);
    const htmlFiles = files.filter((file) => file.toLowerCase().endsWith(".html"));
    const aiFiles = sortAiFiles(
      htmlFiles.filter((file) => file.toLowerCase() !== "index.html" && file.toLowerCase() !== OVERVIEW_FILENAME)
    );

    const indexPath = path.join(tripPath, "index.html");
    let overviewHtml = FALLBACK_OVERVIEW_HTML;

    try {
      const raw = await fs.readFile(indexPath, "utf8");
      if (raw.trim().length > 0) {
        overviewHtml = raw;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    trips.push({
      slug,
      title: formatTripTitle(slug),
      aiFiles,
      overviewHtml,
    });
  }

  return trips.sort((a, b) => b.slug.localeCompare(a.slug));
}

async function resetDist(): Promise<void> {
  await fs.rm(DIST_DIR, { recursive: true, force: true });
  await fs.mkdir(DIST_DIR, { recursive: true });
}

async function copyTripContent(trips: TripData[]): Promise<void> {
  for (const trip of trips) {
    const source = path.join(GENERATED_HTML_DIR, trip.slug);
    const destination = path.join(DIST_DIR, trip.slug);
    await copyDirectory(source, destination);

    const overviewPath = path.join(destination, OVERVIEW_FILENAME);
    await fs.writeFile(overviewPath, trip.overviewHtml, "utf8");

    await writeTripPage(destination, trip);
  }
}

async function copyDirectory(source: string, destination: string): Promise<void> {
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else if (entry.isFile()) {
      if (entry.name.toLowerCase() === "index.html") {
        // Skip copying index.html because we will generate an interactive version.
        // The contents have already been persisted to the overview file.
        continue;
      }
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function writeTripPage(destination: string, trip: TripData): Promise<void> {
  const html = renderTripHtml(trip);
  const indexPath = path.join(destination, "index.html");
  await fs.writeFile(indexPath, html, "utf8");
}

async function writeIndexHtml(trips: TripData[]): Promise<void> {
  const html = renderIndexHtml(trips);
  const indexPath = path.join(DIST_DIR, "index.html");
  await fs.writeFile(indexPath, html, "utf8");
}

async function bundleClient(): Promise<void> {
  const assetsDir = path.join(DIST_DIR, "assets");
  await fs.mkdir(assetsDir, { recursive: true });

  await esbuild({
    entryPoints: {
      app: WEB_ENTRY,
      trip: TRIP_ENTRY,
    },
    bundle: true,
    format: "esm",
    sourcemap: true,
    minify: true,
    target: ["es2020"],
    outdir: assetsDir,
    entryNames: "[name]",
  });
}

function formatTripTitle(slug: string): string {
  const parts = slug.split("-");
  if (parts.length === 3) {
    const [yearStr, monthStr, dayStr] = parts;
    const year = Number.parseInt(yearStr, 10);
    const month = Number.parseInt(monthStr, 10);
    const day = Number.parseInt(dayStr, 10);

    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      const date = new Date(Date.UTC(year, month - 1, day));
      const formatter = new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      return formatter.format(date);
    }
  }

  return slug;
}

function renderIndexHtml(trips: TripData[]): string {
  if (trips.length === 0) {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Trip Explorer</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.15/dist/tailwind.min.css" />
    <style>
      body { background: radial-gradient(circle at top, #0f172a 0%, #020617 45%, #000 100%); color: #f8fafc; }
    </style>
  </head>
  <body class="min-h-screen flex items-center justify-center p-8">
    <div class="max-w-2xl text-center space-y-6">
      <h1 class="text-4xl font-semibold tracking-tight">No trips found</h1>
      <p class="text-slate-300 text-lg">Add trip folders with HTML files under <code>src/generated_html</code> and rerun <code>npm run build:static</code>.</p>
    </div>
  </body>
</html>`;
  }

  const manifest: TripManifestItem[] = trips.map(({ slug, title, aiFiles }) => ({ slug, title, aiFiles }));

  const tripLinks = manifest
    .map(
      (trip) => `
            <div class="trip-card">
              <h3>${escapeHtml(trip.title)}</h3>
              <p>${escapeHtml(trip.slug)}</p>
              <a href="./${encodeURI(trip.slug)}/" class="trip-link">View Trip</a>
            </div>`
    )
    .join("\n");

  const tripDataJson = serializeJson(manifest);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Asyida Trips</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
      :root {
        --primary-gradient: linear-gradient(135deg, #e8f4f8 0%, #d1e7dd 100%);
        --secondary-gradient: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        --accent-gradient: linear-gradient(135deg, #6c757d 0%, #495057 100%);
        --success-gradient: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
        --warning-gradient: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
        --dark-bg: #343a40;
        --card-bg: rgba(255, 255, 255, 0.98);
        --text-primary: #212529;
        --text-secondary: #6c757d;
        --border-radius: 12px;
        --shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        --shadow-hover: 0 8px 20px rgba(0, 0, 0, 0.12);
      }

      * { margin: 0; padding: 0; box-sizing: border-box; }

      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%);
        background-attachment: fixed;
        min-height: 100vh;
        color: var(--text-primary);
      }

      .App::before {
        content: '';
        position: fixed; inset: 0;
        background:
          radial-gradient(circle at 20% 80%, rgba(209,231,221,0.3) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(232,244,248,0.3) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(248,249,250,0.3) 0%, transparent 50%);
        pointer-events: none; z-index: 1;
      }

      .trip-list { position: relative; z-index: 2; padding: 3rem 2rem; max-width: 1200px; margin: 0 auto; }
      .trip-list h1 {
        font-size: 3rem; font-weight: 800; text-align: center; margin-bottom: 1rem;
        background: var(--primary-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        animation: fadeInUp 0.6s ease-out;
      }
      .trip-list h1::after { content: ''; display: block; width: 100px; height: 4px; background: var(--accent-gradient); margin: 1rem auto; border-radius: 2px; }

      .trips-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 2rem; margin-top: 2rem; animation: fadeInUp 0.6s ease-out 0.1s both; }
      .trip-card { background: var(--card-bg); border-radius: var(--border-radius); padding: 2rem; box-shadow: var(--shadow); transition: all 0.2s ease; position: relative; overflow: hidden; }
      .trip-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: var(--primary-gradient); transform: scaleX(0); transform-origin: left; transition: transform 0.25s ease; }
      .trip-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-hover); }
      .trip-card:hover::before { transform: scaleX(1); }
      .trip-card h3 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem; }
      .trip-card p { color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 1.25rem; opacity: 0.9; }
      .trip-link { display: inline-block; background: var(--accent-gradient); color: #fff; padding: 0.7rem 1.25rem; border-radius: 9999px; text-decoration: none; font-weight: 600; transition: transform 0.2s ease, box-shadow 0.2s ease; }
      .trip-link:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(73, 80, 87, 0.25); }

      @keyframes fadeInUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      ::-webkit-scrollbar { width: 10px; }
      ::-webkit-scrollbar-thumb { background: rgba(108, 117, 125, 0.35); border-radius: 9999px; }
      ::-webkit-scrollbar-track { background: transparent; }
      iframe { background-color: white; }
    </style>
  </head>
  <body>
    <div class="App">
      <div class="trip-list">
        <h1>Asyida Trips</h1>
        <div class="trips-grid">
          ${tripLinks}
        </div>
      </div>
    </div>

    <script id="trip-data" type="application/json">${tripDataJson}</script>
    <script type="module" src="./assets/app.js"></script>
  </body>
</html>`;
}

function renderTripHtml(trip: TripData): string {
  const fallbackList =
    trip.aiFiles.length > 0
      ? `<ul class="mt-3 space-y-2 text-sm text-emerald-200">
            ${trip.aiFiles
              .map(
                (file) => `<li><a class="underline decoration-emerald-400/60 underline-offset-4 transition hover:text-white" href="./${encodeURI(
                  file,
                )}">${escapeHtml(formatAgentLabel(file))}</a></li>`
              )
              .join("\n")}
          </ul>`
      : `<p class="text-sm text-slate-400">This trip doesn't include any AI suggestion files yet.</p>`;

  const tripDataJson = serializeJson({
    slug: trip.slug,
    title: trip.title,
    aiFiles: trip.aiFiles,
    overviewPath: `./${OVERVIEW_FILENAME}`,
  });

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(trip.title)} — Trip Hub</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.15/dist/tailwind.min.css" />
    <style>
      body { background: radial-gradient(circle at top, #020617 0%, #0f172a 45%, #000 100%); color: #e2e8f0; }
      iframe { background-color: white; }
    </style>
  </head>
  <body class="min-h-screen">
    <div class="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-10">
      <header class="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_45px_rgba(8,47,73,0.55)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-2">
          <p class="text-xs uppercase tracking-[0.4em] text-emerald-300">Trip Hub</p>
          <h1 class="text-3xl font-semibold text-white sm:text-4xl">${escapeHtml(trip.title)}</h1>
          <p class="text-sm text-slate-400">Folder: <span class="font-mono text-slate-100/90">${escapeHtml(trip.slug)}</span></p>
        </div>
        <div class="flex flex-wrap gap-3">
          <a class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-emerald-300/60 hover:text-emerald-200" href="../">⟵ Back to trips</a>
          <a class="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-300/60 hover:text-white" href="./${OVERVIEW_FILENAME}">Open static overview</a>
        </div>
      </header>

      <main class="grid gap-8 lg:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
        <section class="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_45px_rgba(8,47,73,0.55)] backdrop-blur">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-white">Trip overview</h2>
            <span data-overview-status class="text-xs uppercase tracking-wide text-slate-400">Loading enhanced view…</span>
          </div>
          <div class="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
            <iframe
              data-overview-frame
              src="./${OVERVIEW_FILENAME}"
              title="Trip overview"
              class="h-[520px] w-full rounded-2xl border-0"
            ></iframe>
          </div>
          <p class="mt-3 text-xs text-slate-500">The overview loads directly from the original <code>index.html</code> content.</p>
        </section>

        <section class="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_45px_rgba(8,47,73,0.55)] backdrop-blur">
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold text-white">AI suggestions</h2>
              <span data-ai-status class="text-xs uppercase tracking-wide text-slate-400">Choose an AI to preview</span>
            </div>
            <p class="text-sm text-slate-400">Switch between generated itineraries without leaving this page.</p>
          </div>
          <div data-ai-tabs class="flex flex-wrap gap-2"></div>
          <div class="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
            <iframe data-ai-frame title="AI suggestion" class="h-[520px] w-full rounded-2xl border-0"></iframe>
          </div>
          <div data-ai-fallback class="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-slate-200">
            <p class="text-sm">Need static versions? Use the direct links below:</p>
            ${fallbackList}
          </div>
        </section>
      </main>

      <footer class="flex flex-col items-center gap-2 border-t border-white/10 pt-6 text-center text-xs text-slate-500 sm:flex-row sm:justify-between">
        <p>Generated as part of the static build.</p>
        <p>Explore more trips on the main hub.</p>
      </footer>
    </div>

    <script id="trip-data" type="application/json">${tripDataJson}</script>
    <script type="module" src="../assets/trip.js"></script>
  </body>
</html>`;
}

function sortAiFiles(files: string[]): string[] {
  return [...files].sort((a, b) => {
    const [aBucket, aName] = getAgentSortKey(a);
    const [bBucket, bName] = getAgentSortKey(b);
    if (aBucket !== bBucket) {
      return aBucket - bBucket;
    }
    return aName.localeCompare(bName);
  });
}

function getAgentSortKey(filename: string): [number, string] {
  const base = filename.replace(/\.html$/i, "").toLowerCase();
  const bucketIndex = AGENT_ORDER.indexOf(base);
  return [bucketIndex === -1 ? AGENT_ORDER.length : bucketIndex, base];
}

function formatAgentLabel(filename: string): string {
  const base = filename.replace(/\.html$/i, "");
  return base
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

main().catch((error) => {
  console.error("Static build failed", error);
  process.exitCode = 1;
});
