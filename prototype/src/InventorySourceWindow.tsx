import { useState } from "react";

import { SourceRaster, SourceWindow } from "./SourceWindow";

type InventoryWindowProps = { zIndex: number; onActivate: (id: string) => void };
const assetRoot = "/assets/japanese-rpg-v001/inventory";
const tabs = ["item", "equip", "etc"] as const;

export function InventorySourceWindow({ zIndex, onActivate }: InventoryWindowProps) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("item");
  const [selected, setSelected] = useState(0);
  const [scroll, setScroll] = useState(0);
  const visibleCount = tab === "item" ? 21 : tab === "equip" ? 14 : 7;

  return (
    <SourceWindow id="inventory" title="所持アイテム" initialPosition={{ x: 0, y: 247 }} width={280} height={137} titleWidth={120} assetRoot={assetRoot} zIndex={zIndex} onActivate={onActivate}>
      {tabs.map((name, index) => (
        <button key={name} type="button" className="inventory-source-tab" aria-label={name} aria-pressed={tab === name} data-source-selected={index === 0} style={{ left: 5, top: 18 + index * 35 }} onClick={() => { setTab(name); setSelected(0); }}>
          <SourceRaster id={`inventory-tab-${name}`} file={`${assetRoot}/components/tab-${name}`} style={{ inset: 0 }} />
        </button>
      ))}
      <div className="inventory-source-viewport">
        <div className="inventory-source-grid" style={{ transform: `translateY(${-Math.round(scroll * 0.12)}px)` }}>
          {Array.from({ length: visibleCount }, (_, index) => {
            const row = Math.floor(index / 7);
            const column = index % 7;
            return (
              <button key={`${tab}-${index}`} type="button" className="inventory-source-cell" aria-label={`${tab} item ${index + 1}`} aria-pressed={selected === index} style={{ left: column * 34, top: row * 34 }} onClick={() => setSelected(index)}>
                <SourceRaster id={`inventory-cell-${row}-${column}`} file={`${assetRoot}/components/cell-${row}-${column}`} style={{ inset: 0 }} />
              </button>
            );
          })}
        </div>
      </div>
      <SourceRaster id="inventory-scroll-up" file={`${assetRoot}/components/scroll-up`} style={{ left: 263, top: 18, width: 17, height: 17 }} />
      <SourceRaster id="inventory-scroll-track" file={`${assetRoot}/components/scroll-track`} style={{ left: 263, top: 35, width: 17, height: 66 }} />
      <SourceRaster id="inventory-scroll-thumb" className="inventory-source-thumb" file={`${assetRoot}/components/scroll-thumb`} style={{ left: 263, top: 31 + Math.round(scroll * 0.19), width: 17, height: 51 }} />
      <SourceRaster id="inventory-scroll-down" file={`${assetRoot}/components/scroll-down`} style={{ left: 263, top: 101, width: 17, height: 18 }} />
      <input className="inventory-source-scroll" aria-label="所持品スクロール" type="range" min="0" max="100" step="1" value={scroll} onInput={(event) => setScroll(event.currentTarget.valueAsNumber)} onChange={(event) => setScroll(event.currentTarget.valueAsNumber)} />
      <SourceRaster id="inventory-resize-grip" file={`${assetRoot}/components/resize-grip`} style={{ left: 263, top: 119, width: 17, height: 18 }} />
      <output className="sr-only" role="status">{tab} item {selected + 1} scroll {scroll}</output>
    </SourceWindow>
  );
}
