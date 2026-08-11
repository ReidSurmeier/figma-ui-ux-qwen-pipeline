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
    const message =
      typeof event.data === "string"
        ? { type: event.data, data: null }
        : event.data;
    if (event.origin !== "https://www.figma.com" || typeof message?.type !== "string") return;

    events.push({ type: message.type, data: message.data ?? null });
    const item = document.createElement("li");
    item.textContent = message.type;
    eventLog.append(item);

    if (message.type === "INITIAL_LOAD") {
      status.textContent = "READY";
      for (const button of controls.querySelectorAll("button")) button.disabled = false;
    }

    if (message.type === "LOGIN_SCREEN_SHOWN") {
      status.textContent = "AUTH_REQUIRED";
      for (const button of controls.querySelectorAll("button")) button.disabled = true;
    }

    if (message.type === "PRESENTED_NODE_CHANGED" && message.data?.presentedNodeId) {
      currentNode.textContent = `Current node: ${message.data.presentedNodeId}`;
    }
  });
}
