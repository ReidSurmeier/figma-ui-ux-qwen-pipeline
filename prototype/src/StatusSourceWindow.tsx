import { useState } from "react";

import { SourceRaster, SourceWindow } from "./SourceWindow";

type StatusWindowProps = { zIndex: number; onActivate: (id: string) => void; open?: boolean; onClose?: () => void };

const assetRoot = "/assets/japanese-rpg-v001/status";
const statNames = ["Str", "Agi", "Vit", "Int", "Dex", "Luk"];

export function StatusSourceWindow({ zIndex, onActivate, open, onClose }: StatusWindowProps) {
  const [increments, setIncrements] = useState<Record<string, number>>({});

  return (
    <SourceWindow
      id="status"
      title="ステータス"
      initialPosition={{ x: 0, y: 120 }}
      width={280}
      height={126}
      titleWidth={56}
      assetRoot={assetRoot}
      zIndex={zIndex}
      onActivate={onActivate}
      open={open}
      onClose={onClose}
    >
      <SourceRaster id="status-side-tabs" file={`${assetRoot}/components/side-tabs`} style={{ left: 3, top: 18, width: 17, height: 108 }} />
      {statNames.map((name, index) => {
        const changed = (increments[name] ?? 0) > 0;
        const top = 18 + index * 18;
        return (
          <div key={name} className={`status-source-row${changed ? " status-source-row--changed" : ""}`} style={{ top }}>
            <SourceRaster id={`status-primary-row-${index}`} file={`${assetRoot}/components/primary-row-${index}`} style={{ left: 20, top: 0, width: 90, height: 18 }} />
            <SourceRaster id={`status-derived-row-${index}`} file={`${assetRoot}/components/derived-row-${index}`} style={{ left: 100, top: 0, width: 180, height: 18 }} />
            {changed && index !== 3 && (
              <output
                className="status-source-value-patch"
                aria-label={`${name} 2`}
                style={{ backgroundPosition: `-54px -${26 + index * 18}px` }}
              >
                <span aria-hidden="true" />
              </output>
            )}
            {index !== 3 && <button type="button" aria-label={`${name}を上げる`} aria-pressed={changed} onClick={() => setIncrements((current) => ({ ...current, [name]: 1 }))} />}
          </div>
        );
      })}
      <output className="sr-only" role="status">{Object.entries(increments).map(([name, value]) => `${name}+${value}`).join(" ")}</output>
    </SourceWindow>
  );
}
