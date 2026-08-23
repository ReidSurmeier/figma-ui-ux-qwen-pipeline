import { useRef, useState } from "react";

const skinOptions = ["ブルー", "グレー", "クラシック"] as const;

type VolumeControlProps = {
  name: "BGM" | "Effect";
  value: number;
  onValueChange: (value: number) => void;
  isOn: boolean;
  onOnChange: (isOn: boolean) => void;
};

function VolumeControl({ name, value, onValueChange, isOn, onOnChange }: VolumeControlProps) {
  const id = `${name.toLowerCase()}-slider`;

  return (
    <div className={`volume-row volume-row--${name.toLowerCase()}`}>
      <span className="volume-label" aria-hidden="true">{name}</span>
      <button type="button" className="arrow arrow--left" aria-label={`${name}を下げる`} onClick={() => onValueChange(Math.max(0, value - 1))}>
        <span aria-hidden="true" />
      </button>
      <input
        id={id}
        className="volume-slider"
        aria-label={name}
        type="range"
        min="0"
        max="100"
        step="1"
        value={value}
        onChange={(event) => onValueChange(event.currentTarget.valueAsNumber)}
      />
      <span
        className="slider-thumb-visual"
        data-testid={`${name.toLowerCase()}-visual-thumb`}
        aria-hidden="true"
        style={{ left: 75.5 + value * 1.42 }}
      />
      <button type="button" className="arrow arrow--right" aria-label={`${name}を上げる`} onClick={() => onValueChange(Math.min(100, value + 1))}>
        <span aria-hidden="true" />
      </button>
      <output className="sr-only" data-testid={`${name.toLowerCase()}-value`} htmlFor={id}>{value}</output>
      <label className="on-toggle">
        <input type="checkbox" aria-label={`${name} on`} checked={isOn} onChange={(event) => onOnChange(event.currentTarget.checked)} />
        <span aria-hidden="true">on</span>
      </label>
    </div>
  );
}

function FooterCheckbox({ name, checked, onCheckedChange }: { name: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <label className={`footer-toggle footer-toggle--${name}`}>
      <input type="checkbox" aria-label={name} checked={checked} onChange={(event) => onCheckedChange(event.currentTarget.checked)} />
      <span aria-hidden="true">{name}</span>
    </label>
  );
}

type OptionsWindowProps = {
  initialPosition?: { x: number; y: number };
  zIndex?: number;
  onActivate?: () => void;
  open?: boolean;
  onClose?: () => void;
};

export function OptionsWindow({ initialPosition = { x: 0, y: 0 }, zIndex, onActivate, open, onClose }: OptionsWindowProps = {}) {
  const [bgm, setBgm] = useState(62);
  const [effect, setEffect] = useState(43);
  const [bgmOn, setBgmOn] = useState(false);
  const [effectOn, setEffectOn] = useState(true);
  const [skin, setSkin] = useState("");
  const [skinOpen, setSkinOpen] = useState(false);
  const [footerChecks, setFooterChecks] = useState({ opaque: false, attack: true, skill: false, item: true });
  const [activeTab, setActiveTab] = useState<"option" | "info">("option");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isBodyMounted, setIsBodyMounted] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [position, setPosition] = useState(initialPosition);
  const dragOrigin = useRef<{ pointerX: number; pointerY: number; panelX: number; panelY: number } | null>(null);

  if (!(open ?? isOpen)) return null;

  return (
    <section
      className={`options-window${isMinimized ? " options-window--minimized" : ""}${skinOpen ? " options-window--menu-open" : ""}`}
      data-window-id="options"
      aria-label="オプション"
      style={{ left: position.x, top: position.y, zIndex }}
      onPointerDown={onActivate}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && event.propertyName === "height" && isMinimized) {
          setIsBodyMounted(false);
        }
      }}
    >
      <header
        className="title-bar"
        data-drag-handle
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          event.currentTarget.setPointerCapture?.(event.pointerId);
          dragOrigin.current = { pointerX: event.clientX, pointerY: event.clientY, panelX: position.x, panelY: position.y };
        }}
        onPointerMove={(event) => {
          const origin = dragOrigin.current;
          if (!origin) return;
          const panel = event.currentTarget.parentElement;
          const host = panel?.parentElement;
          if (!panel || !host) return;
          const hostRect = host.getBoundingClientRect();
          const proposedX = origin.panelX + event.clientX - origin.pointerX;
          const proposedY = origin.panelY + event.clientY - origin.pointerY;
          const desktopHost = host.matches(".rpg-desktop");
          const minX = desktopHost ? 0 : -hostRect.left;
          const minY = desktopHost ? 0 : -hostRect.top;
          const maxX = desktopHost ? hostRect.width - panel.offsetWidth : window.innerWidth - hostRect.left - panel.offsetWidth;
          const maxY = desktopHost ? hostRect.height - panel.offsetHeight : window.innerHeight - hostRect.top - panel.offsetHeight;
          setPosition({
            x: Math.min(maxX, Math.max(minX, proposedX)),
            y: Math.min(maxY, Math.max(minY, proposedY)),
          });
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture?.(event.pointerId);
          dragOrigin.current = null;
        }}
      >
        <span className="title-icon" aria-hidden="true" />
        <h1>オプション</h1>
        <button
          type="button"
          className="window-button window-button--minimize"
          aria-label="最小化"
          aria-expanded={!isMinimized}
          onClick={() => {
            if (isMinimized) {
              setIsBodyMounted(true);
              setIsMinimized(false);
            } else {
              setSkinOpen(false);
              setIsMinimized(true);
            }
          }}
        >
          <span aria-hidden="true" />
        </button>
        <button type="button" className="window-button window-button--close" aria-label="閉じる" onClick={() => onClose ? onClose() : setIsOpen(false)}>
          <span aria-hidden="true" />
        </button>
      </header>

      {isBodyMounted && (
        <div className="window-body">
          <div className="vertical-tabs" role="tablist" aria-label="オプション表示">
            <button type="button" role="tab" aria-label="option" aria-selected={activeTab === "option"} onClick={() => setActiveTab("option")}><span aria-hidden="true">option</span></button>
            <button type="button" role="tab" aria-label="info" aria-selected={activeTab === "info"} onClick={() => setActiveTab("info")}><span aria-hidden="true">info</span></button>
          </div>

          <div className="option-panel" role="tabpanel">
            {activeTab === "option" ? (
              <>
                <div className="main-controls">
                  <VolumeControl name="BGM" value={bgm} onValueChange={setBgm} isOn={bgmOn} onOnChange={setBgmOn} />
                  <VolumeControl name="Effect" value={effect} onValueChange={setEffect} isOn={effectOn} onOnChange={setEffectOn} />
                  <div className="skin-row">
                    <span className="skin-label" aria-hidden="true">Skin</span>
                    <div
                      className="skin-combobox"
                      onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSkinOpen(false);
                      }}
                    >
                      <button
                        id="skin-select"
                        type="button"
                        className="skin-combobox-button"
                        role="combobox"
                        aria-label="Skin"
                        aria-expanded={skinOpen}
                        aria-controls="skin-options"
                        aria-haspopup="listbox"
                        onClick={() => setSkinOpen((open) => !open)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setSkinOpen(false);
                            return;
                          }
                          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
                          event.preventDefault();
                          const current = skinOptions.indexOf(skin as (typeof skinOptions)[number]);
                          const direction = event.key === "ArrowDown" ? 1 : -1;
                          const next = current < 0 ? (direction > 0 ? 0 : skinOptions.length - 1) : (current + direction + skinOptions.length) % skinOptions.length;
                          setSkin(skinOptions[next]);
                          setSkinOpen(true);
                        }}
                      >
                        {skin}
                      </button>
                      {skinOpen && (
                        <div id="skin-options" className="skin-listbox" role="listbox" aria-label="Skin">
                          {skinOptions.map((option) => (
                            <button
                              key={option}
                              type="button"
                              role="option"
                              aria-selected={skin === option}
                              onClick={() => {
                                setSkin(option);
                                setSkinOpen(false);
                              }}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="footer-controls" aria-label="表示オプション">
                  <FooterCheckbox name="opaque" checked={footerChecks.opaque} onCheckedChange={(checked) => setFooterChecks((state) => ({ ...state, opaque: checked }))} />
                  <span className="snap-label" aria-hidden="true">スナップ</span>
                  <FooterCheckbox name="attack" checked={footerChecks.attack} onCheckedChange={(checked) => setFooterChecks((state) => ({ ...state, attack: checked }))} />
                  <FooterCheckbox name="skill" checked={footerChecks.skill} onCheckedChange={(checked) => setFooterChecks((state) => ({ ...state, skill: checked }))} />
                  <FooterCheckbox name="item" checked={footerChecks.item} onCheckedChange={(checked) => setFooterChecks((state) => ({ ...state, item: checked }))} />
                </div>
              </>
            ) : (
              <p className="info-message">情報はありません</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
