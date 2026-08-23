import { useState } from "react";

import { SourceRaster, SourceWindow } from "./SourceWindow";

type WindowProps = { zIndex: number; onActivate: (id: string) => void };
const root = "/assets/japanese-rpg-v001";

export function CompactInfoSourceWindow({ zIndex, onActivate }: WindowProps) {
  const assetRoot = `${root}/compact-info`;
  return <SourceWindow id="compact-info" title="簡易情報" initialPosition={{ x: 568, y: 314 }} width={281} height={35} titleWidth={100} titleTop={4} assetRoot={assetRoot} zIndex={zIndex} onActivate={onActivate} minimizable={false} closable={false} dragHandleStyle={{ height: 16 }}>
    <SourceRaster id="compact-levels" file={`${assetRoot}/components/levels`} style={{ left: 116, top: 4, width: 164, height: 13 }} />
    <SourceRaster id="compact-hp" file={`${assetRoot}/components/hp`} style={{ left: 16, top: 20, width: 126, height: 15 }} />
    <SourceRaster id="compact-sp" file={`${assetRoot}/components/sp`} style={{ left: 142, top: 20, width: 138, height: 15 }} />
  </SourceWindow>;
}

export function BottomBarSourceWindow({ zIndex, onActivate }: WindowProps) {
  const [slot, setSlot] = useState(0);
  // The source resting thumb begins at x=98; keep 0 as the visual authority
  // while retaining the complete 0..100 continuous interaction range.
  const [position, setPosition] = useState(0);
  const assetRoot = `${root}/bottom-bar`;
  return <SourceWindow id="bottom-bar" title="クイックスロットバー" initialPosition={{ x: 0, y: 538 }} width={600} height={21} titleWidth={80} assetRoot={assetRoot} zIndex={zIndex} onActivate={onActivate} minimizable={false} closable={false} dragHandleStyle={{ left: 0, top: 0, width: 95, height: 21 }}>
    <SourceRaster id="bottom-bar-rail" file={`${assetRoot}/components/rail`} style={{ left: 0, top: 0, width: 580, height: 21 }} />
    <SourceRaster id="bottom-bar-thumb" className="bottom-bar-source-thumb" file={`${assetRoot}/components/thumb`} style={{ left: 98 + Math.round(position * 4.72), top: 2, width: 8, height: 17 }} />
    <input className="bottom-bar-source-slider" type="range" aria-label="クイックスロット位置" min="0" max="100" step="1" value={position} onInput={(event) => setPosition(event.currentTarget.valueAsNumber)} onChange={(event) => setPosition(event.currentTarget.valueAsNumber)} />
    <button type="button" className="bottom-bar-source-button bottom-bar-source-button--previous" aria-label="前のスロット" aria-pressed={slot < 0} onClick={() => setSlot((value) => value - 1)}><SourceRaster id="bottom-bar-previous" file={`${assetRoot}/components/previous`} style={{ inset: 0 }} /></button>
    <button type="button" className="bottom-bar-source-button bottom-bar-source-button--next" aria-label="次のスロット" aria-pressed={slot > 0} onClick={() => setSlot((value) => value + 1)}><SourceRaster id="bottom-bar-next" file={`${assetRoot}/components/next`} style={{ inset: 0 }} /></button>
    <output className="sr-only" role="status">slot {slot} position {position}</output>
  </SourceWindow>;
}

export function NotificationSourceWindow({ zIndex, onActivate }: WindowProps) {
  const [next, setNext] = useState(false);
  const assetRoot = `${root}/notification`;
  return <SourceWindow id="notification" title="通知" initialPosition={{ x: 604, y: 523 }} width={245} height={41} titleWidth={80} assetRoot={assetRoot} zIndex={zIndex} onActivate={onActivate} minimizable={false} closable={false} dragHandleStyle={{ left: 0, top: 0, width: 28, height: 10 }}>
    <button type="button" className="notification-source-button" aria-label="次の通知" aria-pressed={next} onClick={() => setNext((value) => !value)}>
      <SourceRaster id="notification-bubble" file={`${assetRoot}/components/bubble`} style={{ left: 0, top: 0, width: 143, height: 41 }} />
      <SourceRaster id="notification-upper" file={`${assetRoot}/components/upper`} style={{ left: 143, top: 0, width: 102, height: 20 }} />
      <SourceRaster id="notification-lower" file={`${assetRoot}/components/lower`} style={{ left: 143, top: 20, width: 102, height: 21 }} />
    </button>
    <output className="sr-only" role="status">notification {next ? 2 : 1}</output>
  </SourceWindow>;
}
