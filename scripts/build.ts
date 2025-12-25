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
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      :root {
        --primary-gradient: linear-gradient(135deg, #e8f4f8 0%, #d1e7dd 100%);
        --secondary-gradient: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        --accent-gradient: linear-gradient(135deg, #6c757d 0%, #495057 100%);
        --card-bg: rgba(255, 255, 255, 0.98);
        --text-primary: #212529;
        --text-secondary: #6c757d;
        --muted: #adb5bd;
        --radius: 12px;
        --shadow: 0 4px 12px rgba(0,0,0,0.08);
        --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
      }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: linear-gradient(135deg,#f8f9fa 0%,#e9ecef 50%,#dee2e6 100%); color: var(--text-primary); }
      .container { max-width: 1200px; margin: 0 auto; padding: 32px 20px; }
      header { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between; background: var(--card-bg); border-radius: var(--radius); box-shadow: var(--shadow); padding: 20px; }
      header h1 { margin: 0; font-size: 28px; font-weight: 700; }
      header p { margin: 0; color: var(--text-secondary); font-size: 14px; }
      .btns { display: flex; gap: 10px; }
      .btn { display: inline-block; padding: 10px 14px; border-radius: 999px; text-decoration: none; font-weight: 600; background: var(--secondary-gradient); color: #343a40; box-shadow: var(--shadow); }
      .btn.secondary { background: var(--primary-gradient); color: #212529; }
      main { display: grid; grid-template-columns: 1fr; gap: 20px; margin-top: 20px; }
      section { background: var(--card-bg); border-radius: var(--radius); box-shadow: var(--shadow); padding: 18px; }
      section h2 { margin: 0 0 8px; font-size: 18px; }
      .status { font-size: 12px; color: var(--muted); }
      .frame-wrap { margin-top: 12px; border-radius: 10px; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.06); overflow: hidden; background: white; }
      iframe { width: 100%; height: 520px; border: 0; background: white; }
      .tabs { display: flex; flex-wrap: wrap; gap: 8px; }
      .ai-tab { cursor: pointer; padding: 8px 14px; border-radius: 999px; border: 1px solid rgba(0,0,0,0.08); background: rgba(0,0,0,0.02); color: var(--text-primary); font-size: 14px; font-weight: 600; transition: all .2s ease; }
      .ai-tab:hover { transform: translateY(-1px); box-shadow: var(--shadow); }
      .ai-tab--active { background: var(--primary-gradient); border-color: rgba(0,0,0,0.06); color: #212529; }
      .fallback { margin-top: 12px; border-radius: 10px; padding: 12px; background: rgba(108,117,125,0.08); box-shadow: inset 0 0 0 1px rgba(108,117,125,0.25); }
      .fallback p { margin: 0 0 6px; font-size: 13px; color: var(--text-secondary); }
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <div>
          <h1>${escapeHtml(trip.title)}</h1>
          <p>Folder: <span>${escapeHtml(trip.slug)}</span></p>
        </div>
        <div class="btns">
          <a class="btn" href="../">⟵ Back to trips</a>
          <a class="btn secondary" href="./${OVERVIEW_FILENAME}">Open static overview</a>
        </div>
      </header>

      <main>
        <section>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <h2>AI suggestions</h2>
            <span data-ai-status class="status">Choose an AI to preview</span>
          </div>
          <div data-ai-tabs class="tabs"></div>
          <div class="frame-wrap">
            <iframe data-ai-frame title="AI suggestion"></iframe>
          </div>
          <div data-ai-fallback class="fallback">
            <p>Need static versions? Use the direct links below:</p>
            ${fallbackList}
          </div>
        </section>
      </main>
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
