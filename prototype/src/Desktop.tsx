import { useState } from "react";

import { BasicInfoWindow } from "./BasicInfoWindow";
import { BottomBarSourceWindow, CompactInfoSourceWindow, NotificationSourceWindow } from "./AdditionalSourceWindows";
import { CardSourceWindow, ChatSourceWindow, EquipmentSourceWindow, ExchangeSourceWindow, GameMenuSourceWindow, PartySourceWindow, QuickbarSourceWindow, SkillsSourceWindow } from "./RemainingSourceWindows";
import { InventorySourceWindow } from "./InventorySourceWindow";
import { MapSourceWindow } from "./MapSourceWindow";
import { OptionsWindow } from "./OptionsWindow";
import { StatusSourceWindow } from "./StatusSourceWindow";

export function Desktop({ onlyWindowId }: { onlyWindowId?: string } = {}) {
  const [order, setOrder] = useState(["basic-info", "card", "skills", "status", "inventory", "equipment", "chat", "exchange", "game-menu", "compact-info", "party", "quickbar", "bottom-bar", "notification", "options"]);
  const [partyTab, setPartyTab] = useState<"friends" | "party">("party");
  const [visible, setVisible] = useState<Record<string, boolean>>({
    status: true,
    options: true,
    inventory: true,
    equipment: true,
    skills: true,
    party: true,
    map: onlyWindowId === "map",
  });
  const activate = (id: string) => setOrder((current) => [...current.filter((item) => item !== id), id]);
  const navigate = (id: string, view?: string) => {
    if (id === "party" && view === "friends") setPartyTab("friends");
    setVisible((current) => ({ ...current, [id]: true }));
    activate(id);
  };
  const close = (id: string) => setVisible((current) => ({ ...current, [id]: false }));
  const zIndex = (id: string) => 10 + order.indexOf(id);
  const show = (id: string) => !onlyWindowId || onlyWindowId === id;

  return (
    <main className={`rpg-desktop${onlyWindowId ? " rpg-desktop--isolated" : ""}`} role="application" aria-label={onlyWindowId ? `Isolated ${onlyWindowId} window` : "Japanese RPG desktop"} data-isolated-window={onlyWindowId}>
      {show("basic-info") && <BasicInfoWindow zIndex={zIndex("basic-info")} onActivate={activate} onNavigate={navigate} />}
      {show("card") && <CardSourceWindow zIndex={zIndex("card")} onActivate={activate} />}
      {show("skills") && <SkillsSourceWindow zIndex={zIndex("skills")} onActivate={activate} open={visible.skills} onClose={() => close("skills")} />}
      {show("status") && <StatusSourceWindow zIndex={zIndex("status")} onActivate={activate} open={visible.status} onClose={() => close("status")} />}
      {show("inventory") && <InventorySourceWindow zIndex={zIndex("inventory")} onActivate={activate} open={visible.inventory} onClose={() => close("inventory")} />}
      {show("equipment") && <EquipmentSourceWindow zIndex={zIndex("equipment")} onActivate={activate} open={visible.equipment} onClose={() => close("equipment")} />}
      {show("chat") && <ChatSourceWindow zIndex={zIndex("chat")} onActivate={activate} />}
      {show("exchange") && <ExchangeSourceWindow zIndex={zIndex("exchange")} onActivate={activate} />}
      {show("game-menu") && <GameMenuSourceWindow zIndex={zIndex("game-menu")} onActivate={activate} />}
      {show("party") && <PartySourceWindow zIndex={zIndex("party")} onActivate={activate} open={visible.party} onClose={() => close("party")} tab={partyTab} onTabChange={setPartyTab} />}
      {show("quickbar") && <QuickbarSourceWindow zIndex={zIndex("quickbar")} onActivate={activate} />}
      {show("compact-info") && <CompactInfoSourceWindow zIndex={zIndex("compact-info")} onActivate={activate} />}
      {show("bottom-bar") && <BottomBarSourceWindow zIndex={zIndex("bottom-bar")} onActivate={activate} />}
      {show("notification") && <NotificationSourceWindow zIndex={zIndex("notification")} onActivate={activate} />}
      {show("map") && <MapSourceWindow open={visible.map} zIndex={zIndex("map")} onActivate={activate} onClose={() => close("map")} />}
      {show("options") && <OptionsWindow initialPosition={{ x: 345, y: 182 }} zIndex={zIndex("options")} onActivate={() => activate("options")} open={visible.options} onClose={() => close("options")} />}
    </main>
  );
}
