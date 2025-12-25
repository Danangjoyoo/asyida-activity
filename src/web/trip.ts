import {
  TripHydratedData,
  formatAiLabel,
  parseJsonScript,
  setTextContent,
} from "./shared";

type TripPageElements = {
  aiTabs: HTMLDivElement | null;
  aiFrame: HTMLIFrameElement | null;
  aiStatus: HTMLElement | null;
  overviewFrame: HTMLIFrameElement | null;
  overviewStatus: HTMLElement | null;
  fallbackContainer: HTMLElement | null;
};

document.addEventListener("DOMContentLoaded", () => {
  const data = parseJsonScript<TripHydratedData>("trip-data");
  if (!data) {
    console.warn("Trip page bootstrap aborted: missing trip data payload.");
    return;
  }

  const elements: TripPageElements = {
    aiTabs: document.querySelector<HTMLDivElement>("[data-ai-tabs]"),
    aiFrame: document.querySelector<HTMLIFrameElement>("[data-ai-frame]"),
    aiStatus: document.querySelector<HTMLElement>("[data-ai-status]"),
    overviewFrame: document.querySelector<HTMLIFrameElement>("[data-overview-frame]"),
    overviewStatus: document.querySelector<HTMLElement>("[data-overview-status]"),
    fallbackContainer: document.querySelector<HTMLElement>("[data-ai-fallback]"),
  };

  hydrateOverview(elements, data);
  hydrateAiTabs(elements, data);
});

function hydrateOverview(elements: TripPageElements, data: TripHydratedData): void {
  const { overviewFrame, overviewStatus } = elements;
  if (!overviewFrame) {
    return;
  }

  setTextContent(overviewStatus, "Loading overview…");
  overviewFrame.src = data.overviewPath;
  overviewFrame.onload = () => setTextContent(overviewStatus, "Overview loaded");
  overviewFrame.onerror = () => setTextContent(overviewStatus, "Failed to load overview");
}

function hydrateAiTabs(elements: TripPageElements, data: TripHydratedData): void {
  const { aiTabs, aiFrame, aiStatus, fallbackContainer } = elements;

  if (!aiTabs || !aiFrame) {
    return;
  }

  aiTabs.innerHTML = "";

  if (!data.aiFiles || data.aiFiles.length === 0) {
    aiFrame.removeAttribute("src");
    setTextContent(aiStatus, "No AI suggestions available.");
    setTabsDisabled(aiTabs, true);
    if (fallbackContainer) {
      fallbackContainer.classList.add("border-emerald-400/40");
    }
    return;
  }

  setTabsDisabled(aiTabs, false);

  const activeClassTokens = "bg-emerald-400/20 border-emerald-300 text-white".split(" ");

  data.aiFiles.forEach((file, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-emerald-300/60 hover:text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";
    button.dataset.aiFile = file;
    button.textContent = formatAiLabel(file);

    button.addEventListener("click", () => {
      document
        .querySelectorAll<HTMLButtonElement>("[data-ai-file]")
        .forEach((btn) => btn.classList.remove(...activeClassTokens));
      button.classList.add(...activeClassTokens);
      loadAiFrame(aiFrame, aiStatus, data.slug, file);
    });

    if (index === 0) {
      button.classList.add(...activeClassTokens);
      loadAiFrame(aiFrame, aiStatus, data.slug, file);
    }

    aiTabs.appendChild(button);
  });
}

function loadAiFrame(
  frame: HTMLIFrameElement,
  status: HTMLElement | null,
  slug: string,
  file: string,
): void {
  setTextContent(status, `Loading ${formatAiLabel(file)}…`);
  frame.src = `./${encodeURIComponent(file)}`;
  frame.onload = () => setTextContent(status, `${formatAiLabel(file)} ready`);
  frame.onerror = () => setTextContent(status, `Failed to load ${formatAiLabel(file)}`);
}

function setTabsDisabled(container: HTMLElement, disabled: boolean): void {
  container.classList.toggle("opacity-60", disabled);
}
