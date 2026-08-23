import { type CSSProperties, type PointerEvent, type ReactNode, useRef, useState } from "react";

type Point = { x: number; y: number };

type SourceWindowProps = {
  id: string;
  title: string;
  initialPosition: Point;
  width: number;
  height: number;
  titleWidth: number;
  titleTextLeft?: number;
  titleTop?: number;
  assetRoot: string;
  zIndex: number;
  onActivate: (id: string) => void;
  children: ReactNode;
  minimizable?: boolean;
  closable?: boolean;
  dragHandleStyle?: CSSProperties;
  closeRight?: number;
  closeTop?: number;
  minimizeRight?: number;
  minimizeTop?: number;
  open?: boolean;
  onClose?: () => void;
};

export function SourceRaster({
  id,
  file,
  className = "",
  style,
}: {
  id: string;
  file?: string;
  className?: string;
  style: CSSProperties;
}) {
  return (
    <span
      className={`source-raster ${className}`}
      data-component-id={id}
      aria-hidden="true"
      style={{ ...style, backgroundImage: `url("${file ?? id}.png")` }}
    />
  );
}

export function SourceWindow({ id, title, initialPosition, width, height, titleWidth, titleTextLeft = 16, titleTop = 3, assetRoot, zIndex, onActivate, children, minimizable = true, closable = true, dragHandleStyle, closeRight = 1, closeTop = 2, minimizeRight = 15, minimizeTop = 2, open, onClose }: SourceWindowProps) {
  const [position, setPosition] = useState(initialPosition);
  const [minimized, setMinimized] = useState(false);
  const [locallyOpen, setLocallyOpen] = useState(true);
  const drag = useRef<{ pointer: Point; window: Point } | null>(null);
  const activeWidth = minimized ? 180 : width;
  const activeHeight = minimized ? 18 : height;

  if (!(open ?? locallyOpen)) return null;

  const move = (event: PointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    const bounds = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
    if (!bounds) return;
    const nextX = drag.current.window.x + event.clientX - drag.current.pointer.x;
    const nextY = drag.current.window.y + event.clientY - drag.current.pointer.y;
    setPosition({
      x: Math.max(0, Math.min(bounds.width - activeWidth, nextX)),
      y: Math.max(0, Math.min(bounds.height - activeHeight, nextY)),
    });
  };

  return (
    <section
      className={`source-window${minimized ? " source-window--minimized" : ""}`}
      data-window-id={id}
      data-clean-plate={`${assetRoot}/clean-plate.png`}
      aria-label={title}
      style={{
        left: position.x,
        top: position.y,
        width: activeWidth,
        height: activeHeight,
        zIndex,
        backgroundImage: `url("${assetRoot}/${minimized ? "minimized-plate" : "clean-plate"}.png")`,
        backgroundSize: minimized ? "180px 18px" : "100% 100%",
        "--source-clean-plate": `url("${assetRoot}/clean-plate.png")`,
      } as CSSProperties}
      onPointerDown={() => onActivate(id)}
    >
      <header
        className="source-window__title"
        data-drag-handle
        style={dragHandleStyle}
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
        <SourceRaster id={`${id}-title-icon`} file={`${assetRoot}/components/title-icon`} style={{ left: 3, top: titleTop, width: 13, height: 13 }} />
        <SourceRaster id={`${id}-title-text`} file={`${assetRoot}/components/title-text`} style={{ left: titleTextLeft, top: titleTop, width: titleWidth, height: 13 }} />
        {minimizable && <button type="button" className="source-window__button source-window__button--minimize" style={{ right: minimizeRight }} aria-label={`${title}を最小化`} aria-expanded={!minimized} data-minimize-endpoint={`${assetRoot}/minimized-plate.png`} onClick={() => setMinimized((value) => !value)}>
          <SourceRaster id={`${id}-minimize`} file={`${assetRoot}/components/minimize`} style={{ left: 0, top: minimizeTop, width: 14, height: 15 }} />
        </button>}
        {closable && <button type="button" className="source-window__button source-window__button--close" style={{ right: closeRight }} aria-label={`${title}を閉じる`} data-close-window={id} onClick={() => onClose ? onClose() : setLocallyOpen(false)}>
          <SourceRaster id={`${id}-close`} file={`${assetRoot}/components/close`} style={{ left: 0, top: closeTop, width: 13, height: 15 }} />
        </button>}
      </header>
      {!minimized && <div className="source-window__components">{children}</div>}
    </section>
  );
}
