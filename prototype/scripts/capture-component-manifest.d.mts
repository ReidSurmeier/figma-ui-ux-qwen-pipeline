import type { Page } from "playwright";

export interface RuntimeGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RuntimeComponentManifest {
  schemaVersion: string;
  canvas: { width: number; height: number };
  windows: Array<{
    id: string;
    ariaLabel: string | null;
    geometry: RuntimeGeometry;
    cleanPlate?: string;
    components: Array<{ id?: string; assetPath: string; geometry: RuntimeGeometry }>;
    controls: Array<{ id: string; role: string; geometry: RuntimeGeometry }>;
  }>;
}

export function captureRuntimeComponentManifest(page: Page): Promise<RuntimeComponentManifest>;
