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
            <li class="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-emerald-400/60">
              <div class="flex flex-col gap-1">
                <span class="text-xs font-semibold uppercase tracking-wide text-emerald-300">${escapeHtml(
                  trip.title,
                )}</span>
                <span class="text-base text-slate-300">${escapeHtml(trip.slug)}</span>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <a class="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:border-emerald-400/60 hover:text-emerald-200" href="./${encodeURI(
                  trip.slug,
                )}/">Open trip hub</a>
                <a class="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:border-emerald-400/60 hover:text-emerald-200" href="./${encodeURI(
                  trip.slug,
                )}/${OVERVIEW_FILENAME}">Static overview</a>
              </div>
            </li>`
    )
    .join("\n");

  const tripDataJson = serializeJson(manifest);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Trip Explorer</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.15/dist/tailwind.min.css" />
    <style>
      body { background: radial-gradient(circle at top, #0f172a 0%, #020617 45%, #000 100%); color: #f8fafc; }
      ::-webkit-scrollbar { width: 10px; }
      ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.4); border-radius: 9999px; }
      ::-webkit-scrollbar-track { background: transparent; }
      iframe { background-color: white; }
    </style>
  </head>
  <body class="min-h-screen">
    <div class="mx-auto flex min-h-screen max-w-7xl flex-col gap-10 px-6 py-10">
      <header class="space-y-4 text-center">
        <p class="text-sm uppercase tracking-[0.3em] text-emerald-300">Trip Console</p>
        <h1 class="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Plan, compare, and launch your adventures</h1>
        <p class="mx-auto max-w-2xl text-base text-slate-300 sm:text-lg">
          Browse automatically discovered itineraries, preview their overviews, and switch between AI-generated activity sets without leaving this page.
        </p>
      </header>

      <div class="grid flex-1 gap-6 lg:grid-cols-[320px,1fr]">
        <aside class="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_10px_40px_rgba(15,23,42,0.45)]">
          <div class="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 class="text-xl font-semibold text-white">Trips</h2>
              <p class="text-sm text-slate-400">${trips.length} available</p>
            </div>
            <span class="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">Auto</span>
          </div>
          <ul class="mt-4 flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1" data-trip-list></ul>
        </aside>

        <section id="interactive-panel" class="hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_45px_rgba(8,47,73,0.55)] backdrop-blur">
          <div class="flex flex-col gap-8">
            <div class="space-y-2">
              <span class="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-300">Preview</span>
              <h2 data-trip-title class="text-3xl font-semibold text-white sm:text-4xl">Select a trip</h2>
              <p class="text-sm text-slate-400">Folder: <span data-trip-slug class="font-mono text-slate-200">—</span></p>
              <div class="mt-4 flex flex-wrap gap-3">
                <a data-open-overview class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:border-emerald-300/60 hover:text-white" href="#">Overview page</a>
                <a data-open-folder class="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-300/60 hover:text-white" href="#">Trip directory</a>
              </div>
            </div>

            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold text-white">Overview snapshot</h3>
                <span data-overview-status class="text-xs uppercase tracking-wide text-slate-400">Select a trip to load the overview</span>
              </div>
              <div class="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
                <iframe data-overview-frame title="Trip overview" class="h-[520px] w-full rounded-2xl border-0"></iframe>
              </div>
            </div>

            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold text-white">AI suggestions</h3>
                <span data-ai-status class="text-xs uppercase tracking-wide text-slate-400">Select a trip to preview suggestions</span>
              </div>
              <div data-ai-tabs class="flex flex-wrap gap-2"></div>
              <div class="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
                <iframe data-ai-frame title="AI suggestion" class="h-[520px] w-full rounded-2xl border-0"></iframe>
              </div>
            </div>
          </div>
        </section>

        <section id="fallback-list" class="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_45px_rgba(8,47,73,0.55)] backdrop-blur">
          <div class="space-y-3">
            <h2 class="text-xl font-semibold text-white">Trips</h2>
            <p class="text-sm text-slate-300">JavaScript is disabled. Use the quick links below to open each trip.</p>
          </div>
          <ul class="mt-4 grid gap-4" role="list">
            ${tripLinks}
          </ul>
        </section>
      </div>

      <footer class="flex flex-col items-center gap-2 border-t border-white/10 pt-6 text-center text-xs text-slate-500 sm:flex-row sm:justify-between">
        <p>Static output generated by <code>npm run build:static</code>.</p>
        <p class="flex items-center gap-2">Hosted on <span class="font-semibold text-white">Vercel</span></p>
      </footer>
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
