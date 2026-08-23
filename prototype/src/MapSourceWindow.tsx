import { SourceRaster, SourceWindow } from "./SourceWindow";

type MapSourceWindowProps = {
  open: boolean;
  zIndex: number;
  onActivate: (id: string) => void;
  onClose: () => void;
};

const assetRoot = "/assets/japanese-rpg-v001/map";

export function MapSourceWindow({ open, zIndex, onActivate, onClose }: MapSourceWindowProps) {
  return (
    <SourceWindow
      id="map"
      title="マップ"
      initialPosition={{ x: 285, y: 150 }}
      width={280}
      height={150}
      titleWidth={57}
      titleTextLeft={23}
      assetRoot={assetRoot}
      zIndex={zIndex}
      onActivate={onActivate}
      minimizable={false}
      open={open}
      onClose={onClose}
    >
      <SourceRaster id="map-body" file={`${assetRoot}/components/map-body`} style={{ left: 16, top: 29, width: 248, height: 113 }} />
    </SourceWindow>
  );
}
