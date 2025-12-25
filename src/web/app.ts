import {
  OVERVIEW_FILENAME,
  TripManifestItem,
  formatAiLabel,
  parseJsonScript,
  setTextContent,
} from "./shared";

type TripSelectionState = {
  trip: TripManifestItem;
  tabButtons: HTMLButtonElement[];
  tripButtons: HTMLButtonElement[];
};

const manifest = parseJsonScript<TripManifestItem[]>("trip-data");

if (manifest && manifest.length > 0) {
  bootstrap(manifest);
}

function bootstrap(trips: TripManifestItem[]): void {
  const listContainer = document.querySelector<HTMLUListElement>("[data-trip-list]");
  const interactivePanel = document.getElementById("interactive-panel");
  const fallbackSection = document.getElementById("fallback-list");
  const overviewFrame = document.querySelector<HTMLIFrameElement>("[data-overview-frame]");
  const overviewStatus = document.querySelector<HTMLElement>("[data-overview-status]");
  const aiTabs = document.querySelector<HTMLDivElement>("[data-ai-tabs]");
  const aiFrame = document.querySelector<HTMLIFrameElement>("[data-ai-frame]");
  const aiStatus = document.querySelector<HTMLElement>("[data-ai-status]");
  const tripTitle = document.querySelector<HTMLElement>("[data-trip-title]");
  const tripSlug = document.querySelector<HTMLElement>("[data-trip-slug]");
  const openOverviewLink = document.querySelector<HTMLAnchorElement>("[data-open-overview]");
  const openFolderLink = document.querySelector<HTMLAnchorElement>("[data-open-folder]");

  if (!listContainer || !interactivePanel || !aiTabs || !overviewFrame || !aiFrame) {
    console.warn("Trip explorer bootstrap aborted: required DOM elements missing.");
    return;
  }

  interactivePanel.classList.remove("hidden");
  fallbackSection?.classList.add("hidden");

  const tabButtonClass =
    "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-emerald-300/60 hover:text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";
  const tabButtonActiveClass = "bg-emerald-400/20 border-emerald-300 text-white";

  const state: TripSelectionState = {
    trip: trips[0],
    tabButtons: [],
    tripButtons: [],
  };

  listContainer.innerHTML = "";

  trips.forEach((trip, index) => {
    const item = document.createElement("li");
    item.className = "flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4";

    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "flex flex-col gap-1 text-left text-slate-200 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";
    button.dataset.slug = trip.slug;

    const title = document.createElement("span");
    title.className = "text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300";
    title.textContent = trip.title;

    const subtitle = document.createElement("span");
    subtitle.className = "text-base text-slate-300";
    subtitle.textContent = trip.slug;

    button.append(title, subtitle);

    button.addEventListener("click", () => {
      state.tripButtons.forEach((btn) => btn.classList.remove("ring-2", "ring-emerald-400/60"));
      button.classList.add("ring-2", "ring-emerald-400/60");
      selectTrip(trip, state, {
        overviewFrame,
        overviewStatus,
        aiTabs,
        aiFrame,
        aiStatus,
        tripTitle,
        tripSlug,
        openOverviewLink,
        openFolderLink,
        tabButtonClass,
        tabButtonActiveClass,
      });
    });

    if (index === 0) {
      button.classList.add("ring-2", "ring-emerald-400/60");
      queueMicrotask(() =>
        selectTrip(trip, state, {
          overviewFrame,
          overviewStatus,
          aiTabs,
          aiFrame,
          aiStatus,
          tripTitle,
          tripSlug,
          openOverviewLink,
          openFolderLink,
          tabButtonClass,
          tabButtonActiveClass,
        }),
      );
    }

    item.appendChild(button);
    listContainer.appendChild(item);
    state.tripButtons.push(button);
  });
}

function selectTrip(
  trip: TripManifestItem,
  state: TripSelectionState,
  elements: {
    overviewFrame: HTMLIFrameElement;
    overviewStatus: HTMLElement | null;
    aiTabs: HTMLDivElement;
    aiFrame: HTMLIFrameElement;
    aiStatus: HTMLElement | null;
    tripTitle: HTMLElement | null;
    tripSlug: HTMLElement | null;
    openOverviewLink: HTMLAnchorElement | null;
    openFolderLink: HTMLAnchorElement | null;
    tabButtonClass: string;
    tabButtonActiveClass: string;
  },
): void {
  const {
    overviewFrame,
    overviewStatus,
    aiTabs,
    aiFrame,
    aiStatus,
    tripTitle,
    tripSlug,
    openOverviewLink,
    openFolderLink,
    tabButtonClass,
    tabButtonActiveClass,
  } = elements;

  state.trip = trip;

  setTextContent(tripTitle, trip.title);
  setTextContent(tripSlug, trip.slug);

  if (openOverviewLink) {
    openOverviewLink.href = `./${encodeURIComponent(trip.slug)}/${OVERVIEW_FILENAME}`;
  }

  if (openFolderLink) {
    openFolderLink.href = `./${encodeURIComponent(trip.slug)}/`;
  }

  setTextContent(overviewStatus, "Loading overview…");
  overviewFrame.src = `./${encodeURIComponent(trip.slug)}/${OVERVIEW_FILENAME}`;
  overviewFrame.onload = () => setTextContent(overviewStatus, "Overview loaded");
  overviewFrame.onerror = () => setTextContent(overviewStatus, "Failed to load overview");

  renderAiTabs(trip, state, {
    aiTabs,
    aiFrame,
    aiStatus,
    tabButtonClass,
    tabButtonActiveClass,
  });
}

function renderAiTabs(
  trip: TripManifestItem,
  state: TripSelectionState,
  elements: {
    aiTabs: HTMLDivElement;
    aiFrame: HTMLIFrameElement;
    aiStatus: HTMLElement | null;
    tabButtonClass: string;
    tabButtonActiveClass: string;
  },
): void {
  const { aiTabs, aiFrame, aiStatus, tabButtonClass, tabButtonActiveClass } = elements;

  aiTabs.innerHTML = "";
  state.tabButtons.forEach((button) => button.remove());
  state.tabButtons = [];

  if (trip.aiFiles.length === 0) {
    aiFrame.removeAttribute("src");
    setTextContent(aiStatus, "No AI suggestions for this trip yet");
    aiTabs.classList.add("opacity-60");
    return;
  }

  aiTabs.classList.remove("opacity-60");

  trip.aiFiles.forEach((file, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `${tabButtonClass} ${index === 0 ? tabButtonActiveClass : ""}`.trim();
    button.dataset.aiFile = file;
    button.textContent = formatAiLabel(file);

    button.addEventListener("click", () => {
      const activeTokens = tabButtonActiveClass.split(" ");
      state.tabButtons.forEach((btn) => btn.classList.remove(...activeTokens));
      button.classList.add(...activeTokens);
      loadAiFrame(aiFrame, aiStatus, trip.slug, file);
    });

    if (index === 0) {
      button.classList.add(...tabButtonActiveClass.split(" "));
      loadAiFrame(aiFrame, aiStatus, trip.slug, file);
    }

    aiTabs.appendChild(button);
    state.tabButtons.push(button);
  });
}

function loadAiFrame(
  aiFrame: HTMLIFrameElement,
  aiStatus: HTMLElement | null,
  slug: string,
  file: string,
): void {
  setTextContent(aiStatus, `Loading ${formatAiLabel(file)}…`);
  aiFrame.src = `./${encodeURIComponent(slug)}/${encodeURIComponent(file)}`;
  aiFrame.onload = () => setTextContent(aiStatus, `${formatAiLabel(file)} ready`);
  aiFrame.onerror = () => setTextContent(aiStatus, `Failed to load ${formatAiLabel(file)}`);
}
