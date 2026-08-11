const CLIENT_ID_STORAGE_KEY = "golfstudio.embed.clientId";

const status = document.querySelector("#status");
const configurationRequired = document.querySelector("#configuration-required");
const embedMount = document.querySelector("#embed-mount");
const controls = document.querySelector("#controls");
const eventPanel = document.querySelector("#event-panel");
const eventLog = document.querySelector("#event-log");
const currentNode = document.querySelector("#current-node");
const clientId = sessionStorage.getItem(CLIENT_ID_STORAGE_KEY)?.trim();

if (!clientId) {
  status.textContent = "CONFIG_REQUIRED";
  configurationRequired.hidden = false;
} else {
  const embedUrl = new URL(
    "https://embed.figma.com/proto/LY8R5xSUKGJJ6UEEuCpzPJ/GolfStudio-v004",
  );
  embedUrl.search = new URLSearchParams({
    "node-id": "7-2",
    "starting-point-node-id": "7:2",
    "page-id": "5:3",
    "embed-host": "golfstudio-qa",
    "client-id": clientId,
    scaling: "contain",
    "content-scaling": "fixed",
  });

  const iframe = document.createElement("iframe");
  iframe.title = "GolfStudio v004 interactive prototype";
  iframe.src = embedUrl.toString();
  iframe.allowFullscreen = true;
  embedMount.append(iframe);
  controls.hidden = false;
  eventPanel.hidden = false;
  status.textContent = "WAITING_FOR_FIGMA";

  const events = [];
  window.__golfstudioEmbedQa = { events };

  for (const button of controls.querySelectorAll("button[data-message]")) {
    button.addEventListener("click", () => {
      iframe.contentWindow.postMessage({ type: button.dataset.message }, "https://www.figma.com");
    });
  }

  window.addEventListener("message", (event) => {
    if (event.origin !== "https://www.figma.com" || typeof event.data?.type !== "string") return;

    events.push({ type: event.data.type, data: event.data.data ?? null });
    const item = document.createElement("li");
    item.textContent = event.data.type;
    eventLog.append(item);

    if (event.data.type === "INITIAL_LOAD") {
      status.textContent = "READY";
      for (const button of controls.querySelectorAll("button")) button.disabled = false;
    }

    if (event.data.type === "LOGIN_SCREEN_SHOWN") {
      status.textContent = "AUTH_REQUIRED";
      for (const button of controls.querySelectorAll("button")) button.disabled = true;
    }

    if (event.data.type === "PRESENTED_NODE_CHANGED" && event.data.data?.presentedNodeId) {
      currentNode.textContent = `Current node: ${event.data.data.presentedNodeId}`;
    }
  });
}
