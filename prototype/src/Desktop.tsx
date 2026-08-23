import { useState } from "react";

import { BasicInfoWindow } from "./BasicInfoWindow";
import { BottomBarSourceWindow, CompactInfoSourceWindow, NotificationSourceWindow } from "./AdditionalSourceWindows";
import { CardSourceWindow, ChatSourceWindow, EquipmentSourceWindow, ExchangeSourceWindow, GameMenuSourceWindow, PartySourceWindow, QuickbarSourceWindow, SkillsSourceWindow } from "./RemainingSourceWindows";
import { InventorySourceWindow } from "./InventorySourceWindow";
import { MapSourceWindow } from "./MapSourceWindow";
import { OptionsWindow } from "./OptionsWindow";
import { StatusSourceWindow } from "./StatusSourceWindow";

export function Desktop() {
  const [order, setOrder] = useState(["basic-info", "card", "skills", "status", "inventory", "equipment", "chat", "exchange", "game-menu", "compact-info", "party", "quickbar", "bottom-bar", "notification", "options"]);
  const [partyTab, setPartyTab] = useState<"friends" | "party">("party");
  const [mapOpen, setMapOpen] = useState(false);
  const activate = (id: string) => setOrder((current) => [...current.filter((item) => item !== id), id]);
  const navigate = (id: string, view?: string) => {
    if (id === "party" && view === "friends") setPartyTab("friends");
    if (id === "map") setMapOpen(true);
    activate(id);
  };
  const zIndex = (id: string) => 10 + order.indexOf(id);

  return (
    <main className="rpg-desktop" role="application" aria-label="Japanese RPG desktop">
      <BasicInfoWindow zIndex={zIndex("basic-info")} onActivate={activate} onNavigate={navigate} />
      <CardSourceWindow zIndex={zIndex("card")} onActivate={activate} />
      <SkillsSourceWindow zIndex={zIndex("skills")} onActivate={activate} />
      <StatusSourceWindow zIndex={zIndex("status")} onActivate={activate} />
      <InventorySourceWindow zIndex={zIndex("inventory")} onActivate={activate} />
      <EquipmentSourceWindow zIndex={zIndex("equipment")} onActivate={activate} />
      <ChatSourceWindow zIndex={zIndex("chat")} onActivate={activate} />
      <ExchangeSourceWindow zIndex={zIndex("exchange")} onActivate={activate} />
      <GameMenuSourceWindow zIndex={zIndex("game-menu")} onActivate={activate} />
      <PartySourceWindow zIndex={zIndex("party")} onActivate={activate} tab={partyTab} onTabChange={setPartyTab} />
      <QuickbarSourceWindow zIndex={zIndex("quickbar")} onActivate={activate} />
      <CompactInfoSourceWindow zIndex={zIndex("compact-info")} onActivate={activate} />
      <BottomBarSourceWindow zIndex={zIndex("bottom-bar")} onActivate={activate} />
      <NotificationSourceWindow zIndex={zIndex("notification")} onActivate={activate} />
      <MapSourceWindow open={mapOpen} zIndex={zIndex("map")} onActivate={activate} onClose={() => setMapOpen(false)} />
      <OptionsWindow initialPosition={{ x: 345, y: 182 }} zIndex={zIndex("options")} onActivate={() => activate("options")} />
    </main>
  );
}
