import { type CSSProperties, type PointerEvent, useRef, useState } from "react";

type BasicInfoWindowProps = { zIndex: number; onActivate: (id: string) => void };
type Point = { x: number; y: number };

const assetRoot = "/assets/japanese-rpg-v001/basic-info/components";

function Raster({ id, file, style, className = "" }: { id: string; file?: string; style: CSSProperties; className?: string }) {
  return <span className={`basic-raster ${className}`} data-component-id={id} aria-hidden="true" style={{ ...style, backgroundImage: `url("${assetRoot}/${file ?? id}.png")` }} />;
}

const pages = [
  ["status", 207, 22], ["option", 244, 22], ["items", 207, 47], ["equip", 244, 47],
  ["skill", 207, 72], ["map", 244, 72], ["chat", 207, 97], ["friend", 244, 97],
] as const;

export function BasicInfoWindow({ zIndex, onActivate }: BasicInfoWindowProps) {
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [minimized, setMinimized] = useState(false);
  const [hp, setHp] = useState(0);
  const [sp, setSp] = useState(0);
  const [page, setPage] = useState("status");
  const [status, setStatus] = useState("status を開きました");
  const drag = useRef<{ pointer: Point; window: Point } | null>(null);
  const width = minimized ? 180 : 280;
  const height = minimized ? 18 : 120;

  const move = (event: PointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    const host = event.currentTarget.parentElement?.parentElement;
    const bounds = host?.getBoundingClientRect();
    if (!bounds) return;
    const nextX = drag.current.window.x + event.clientX - drag.current.pointer.x;
    const nextY = drag.current.window.y + event.clientY - drag.current.pointer.y;
    setPosition({
      x: Math.max(0, Math.min(bounds.width - width, nextX)),
      y: Math.max(0, Math.min(bounds.height - height, nextY)),
    });
  };

  return (
    <section
      className={`basic-info-window${minimized ? " basic-info-window--minimized" : ""}`}
      data-window-id="basic-info"
      data-clean-plate="/assets/japanese-rpg-v001/basic-info/clean-plate.png"
      aria-label="基本情報"
      style={{ left: position.x, top: position.y, zIndex }}
      onPointerDown={() => onActivate("basic-info")}
    >
      <header
        className="basic-info-title"
        data-drag-handle
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          event.currentTarget.setPointerCapture?.(event.pointerId);
          drag.current = { pointer: { x: event.clientX, y: event.clientY }, window: position };
        }}
        onPointerMove={move}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture?.(event.pointerId);
          drag.current = null;
        }}
      >
        <Raster id="title-icon" style={{ left: 3, top: 3, width: 11, height: 11 }} />
        <Raster id="title-text" style={{ left: 15, top: 3, width: 40, height: 12 }} />
        <button type="button" className="basic-info-window-button" aria-label="基本情報を最小化" aria-expanded={!minimized} onClick={() => setMinimized((value) => !value)}>
          <Raster id="window-button" style={{ left: 0, top: 0, width: 10, height: 11 }} />
        </button>
      </header>

      {!minimized && (
        <div className="basic-info-components">
          <Raster id="player-name" style={{ left: 7, top: 22, width: 64, height: 11 }} />
          <Raster id="player-class" style={{ left: 7, top: 38, width: 43, height: 10 }} />
          <Raster id="hp-label" style={{ left: 95, top: 28, width: 16, height: 10 }} />
          <Raster id="sp-label" style={{ left: 95, top: 50, width: 16, height: 10 }} />
          <Raster id="hp-value" style={{ left: 125, top: 33, width: 71, height: 11 }} />
          <Raster id="sp-value" style={{ left: 125, top: 55, width: 71, height: 11 }} />
          <Raster id="hp-track" file="meter-track" style={{ left: 111, top: 22, width: 86, height: 11 }} />
          <Raster id="hp-thumb" style={{ left: 111 + (86 - 48) * hp / 100, top: 22, width: 48, height: 11 }} className="basic-info-thumb" />
          <input className="basic-info-slider" aria-label="HP" type="range" min="0" max="100" step="1" value={hp} onInput={(event) => setHp(event.currentTarget.valueAsNumber)} onChange={(event) => setHp(event.currentTarget.valueAsNumber)} />
          <Raster id="sp-track" file="meter-track" style={{ left: 111, top: 43, width: 86, height: 11 }} />
          <Raster id="sp-thumb" style={{ left: 111 + (86 - 34) * sp / 100, top: 43, width: 34, height: 11 }} className="basic-info-thumb" />
          <input className="basic-info-slider basic-info-slider--sp" aria-label="SP" type="range" min="0" max="100" step="1" value={sp} onInput={(event) => setSp(event.currentTarget.valueAsNumber)} onChange={(event) => setSp(event.currentTarget.valueAsNumber)} />
          {pages.map(([name, left, top]) => (
            <button
              key={name}
              type="button"
              className="basic-info-page"
              aria-label={name}
              aria-pressed={page === name}
              style={{ left, top, backgroundImage: `url("${assetRoot}/page-${name}.png")` }}
              onClick={() => { setPage(name); setStatus(`${name} を開きました`); }}
            ><span data-component-id={`page-${name}`} aria-hidden="true" /></button>
          ))}
          <Raster id="base-label" style={{ left: 17, top: 74, width: 58, height: 10 }} />
          <Raster id="base-progress" style={{ left: 86, top: 76, width: 104, height: 9 }} />
          <Raster id="job-label" style={{ left: 17, top: 86, width: 54, height: 10 }} />
          <Raster id="job-progress" style={{ left: 86, top: 88, width: 104, height: 9 }} />
          <Raster id="footer-text" style={{ left: 4, top: 104, width: 198, height: 12 }} />
          <output className="sr-only" role="status">{status}</output>
        </div>
      )}
    </section>
  );
}
