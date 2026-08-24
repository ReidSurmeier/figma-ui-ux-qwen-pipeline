import { type KeyboardEvent, useState } from "react";

import { SourceRaster, SourceWindow } from "./SourceWindow";

type WindowProps = { zIndex: number; onActivate: (id: string) => void; open?: boolean; onClose?: () => void };
const root = "/assets/japanese-rpg-v001";

export function CardSourceWindow({ zIndex, onActivate }: WindowProps) {
  const [rotated, setRotated] = useState(false);
  const [scroll, setScroll] = useState(0);
  const assetRoot = `${root}/card`;
  return (
    <SourceWindow id="card" title="ソルジャースケルトンカード" initialPosition={{ x: 285, y: 0 }} width={280} height={150} titleWidth={160} titleTextLeft={86} assetRoot={assetRoot} zIndex={zIndex} onActivate={onActivate} minimizable={false}>
      <div className="card-source-art-viewport">
        <button className="card-source-art" type="button" aria-label="カードを回転" aria-pressed={rotated} data-visual-component="card-art" onClick={() => setRotated((value) => !value)}>
          <SourceRaster id="card-art" file={`${assetRoot}/components/art`} style={{ inset: 0 }} />
        </button>
      </div>
      <div className="card-source-copy-viewport">
        <div className="card-source-copy" style={{ transform: `translateY(${-Math.round(scroll * 0.18)}px)` }}>
          {[0, 1, 2, 3].map((row) => <SourceRaster key={row} id={`card-copy-${row}`} file={`${assetRoot}/components/copy-${row}`} style={{ left: 0, top: row * 19, width: 155, height: 19 }} />)}
          <SourceRaster id="card-copy-4" file={`${assetRoot}/components/copy-4`} style={{ left: 0, top: 74, width: 67, height: 18 }} />
        </div>
      </div>
      <SourceRaster id="card-scrollbar-track" file={`${assetRoot}/components/scrollbar-track`} style={{ left: 248, top: 34, width: 29, height: 80 }} />
      <SourceRaster id="card-scrollbar-thumb" className="card-source-thumb" file={`${assetRoot}/components/scrollbar-thumb`} style={{ left: 248, top: 44 + Math.round(scroll * 0.27), width: 29, height: 32 }} />
      <input id="card-info-scroll" className="card-source-scroll" type="range" aria-label="カード情報スクロール" data-visual-component="card-scrollbar-thumb" min="0" max="100" step="1" value={scroll} onInput={(event) => setScroll(event.currentTarget.valueAsNumber)} onChange={(event) => setScroll(event.currentTarget.valueAsNumber)} />
      <SourceRaster id="card-bottom-icon" file={`${assetRoot}/components/bottom-icon`} style={{ left: 5, top: 122, width: 25, height: 22 }} />
      <button className="card-source-slot" type="button" aria-label="カードスロット" aria-controls="card-info-scroll" aria-pressed={scroll > 50} onClick={() => setScroll((value) => value > 50 ? 30 : 70)}>
        <SourceRaster id="card-bottom-slot" file={`${assetRoot}/components/bottom-slot`} style={{ inset: 0 }} />
      </button>
      <output className="sr-only" role="status">card scroll {scroll}</output>
    </SourceWindow>
  );
}

const skillNames = ["ディバインプロテクション", "ワープポータル", "ニューマ", "ヒール", "エンジェラス", "ブレッシング", "速度増加", "ルアフ"];
const skillLevels = [5, 4, 4, 9, 5, 10, 10, 1];
export function SkillsSourceWindow({ zIndex, onActivate, open, onClose }: WindowProps) {
  const [selected, setSelected] = useState(0);
  const [scroll, setScroll] = useState(34);
  const [status, setStatus] = useState("");
  const [upgraded, setUpgraded] = useState<boolean[]>(skillNames.map(() => false));
  const assetRoot = `${root}/skills`;
  const listOffset = Math.round(Math.max(0, (scroll - 34) / 66) * 144);
  const pageTwoVisible = scroll > 67;
  const setScrollPosition = (value: number) => {
    setScroll(value);
    if (value > 67 && selected < 4) setSelected(4);
    if (value <= 67 && selected >= 4) setSelected(0);
  };
  const selectFromKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    let next = selected;
    if (event.key === "ArrowDown") next = (selected + 1) % skillNames.length;
    else if (event.key === "ArrowUp") next = (selected - 1 + skillNames.length) % skillNames.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = skillNames.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    setScroll(next < 4 ? 34 : 100);
  };
  return (
    <SourceWindow id="skills" title="スキルリスト" initialPosition={{ x: 568, y: 0 }} width={281} height={184} titleWidth={96} assetRoot={assetRoot} zIndex={zIndex} onActivate={onActivate} minimizable={false} open={open} onClose={onClose}>
      <div className="skills-source-viewport" role="listbox" aria-label="スキル" aria-activedescendant={`skill-option-${selected}`} tabIndex={0} onKeyDown={selectFromKeyboard}>
        <div className="skills-source-list" style={{ transform: `translateY(${-listOffset}px)` }}>
          {skillNames.map((name, row) => {
            const pageTwoRow = row - 4;
            const iconFile = row < 4 ? `${assetRoot}/components/icon-${row}` : `${assetRoot}/components/page-2-icon-${pageTwoRow}`;
            const copyFile = row < 4 ? `${assetRoot}/components/copy-${row}` : `${assetRoot}/components/page-2-copy-${pageTwoRow}`;
            return <button key={name} id={`skill-option-${row}`} className="skill-source-row" type="button" role="option" tabIndex={-1} disabled={pageTwoVisible !== (row >= 4)} aria-label={`${name} Lv ${skillLevels[row]}`} aria-selected={selected === row} data-source-selected={row === 0 || row === 4 || row === 7} style={{ top: row * 36 }} onClick={() => setSelected(row)}>
              <SourceRaster id={`skill-icon-${row}`} file={iconFile} style={{ left: 39, top: 2, width: 34, height: 34 }} />
              <SourceRaster id={`skill-copy-${row}`} file={copyFile} style={{ left: 102, top: 0, width: 141, height: 36 }} />
            </button>;
          })}
          {skillNames.map((name, row) => {
            const levelFile = row < 4 ? `${assetRoot}/components/level-${row}` : `${assetRoot}/components/page-2-level-${row - 4}`;
            return <button key={name} type="button" className="skill-source-level" disabled={pageTwoVisible !== (row >= 4)} aria-label={`${name}をレベルアップ`} aria-pressed={upgraded[row]} style={{ left: 73, top: 2 + row * 36 }} onClick={() => { setUpgraded((values) => values.map((value, index) => index === row ? !value : value)); setStatus(`${name} Lv+1`); }}>
              <SourceRaster id={`skill-level-${row}`} file={levelFile} style={{ inset: 0 }} />
            </button>;
          })}
        </div>
      </div>
      <SourceRaster id="skills-scrollbar-track" file={`${assetRoot}/components/scrollbar-track`} style={{ left: 263, top: 18, width: 17, height: 144 }} />
      <SourceRaster id="skills-scrollbar-thumb" className="skills-source-thumb" file={`${assetRoot}/components/scrollbar-thumb`} style={{ left: 263, top: 28 + Math.round(scroll * 0.79), width: 17, height: 38 }} />
      <input className="skills-source-scroll" type="range" aria-label="スキルスクロール" data-visual-component="skills-scrollbar-thumb" min="0" max="100" step="1" value={scroll} onInput={(event) => setScrollPosition(event.currentTarget.valueAsNumber)} onChange={(event) => setScrollPosition(event.currentTarget.valueAsNumber)} />
      <SourceRaster id="skills-points" file={`${assetRoot}/components/points`} style={{ left: 2, top: 163, width: 173, height: 20 }} />
      <button type="button" className="skills-source-action skills-source-action--use" aria-label="use" aria-pressed={status.startsWith("use")} onClick={() => setStatus(`use ${skillNames[selected]}`)}><SourceRaster id="skills-use" file={`${assetRoot}/components/use`} style={{ inset: 0 }} /></button>
      <button type="button" className="skills-source-action skills-source-action--close" aria-label="close" data-close-window="skills" onClick={() => { setStatus("close"); onClose?.(); }}><SourceRaster id="skills-close-action" file={`${assetRoot}/components/close-action`} style={{ inset: 0 }} /></button>
      <SourceRaster id="skills-resize" file={`${assetRoot}/components/resize-grip`} style={{ left: 263, top: 162, width: 17, height: 22 }} />
      <output className="sr-only" role="status">{status}</output>
    </SourceWindow>
  );
}

export function EquipmentSourceWindow({ zIndex, onActivate, open, onClose }: WindowProps) {
  const [selected, setSelected] = useState("");
  const assetRoot = `${root}/equipment`;
  return (
    <SourceWindow id="equipment" title="装備アイテム" initialPosition={{ x: 0, y: 385 }} width={280} height={152} titleWidth={110} assetRoot={assetRoot} zIndex={zIndex} onActivate={onActivate} open={open} onClose={onClose}>
      {["left", "right"].flatMap((side) => [0, 1, 2, 3, 4].map((row) => <button key={`${side}-${row}`} type="button" className="equipment-source-row" aria-label={`${side === "left" ? "左" : "右"}装備 ${row + 1}`} aria-pressed={selected === `${side}-${row}`} data-visual-component={`equipment-${side}-${row}`} style={{ left: side === "left" ? 4 : 170, width: side === "left" ? 105 : 106, top: row === 4 ? 134 : 18 + row * 29, height: row === 4 ? 18 : 29 }} onClick={() => setSelected(`${side}-${row}`)}><SourceRaster id={`equipment-${side}-${row}`} file={`${assetRoot}/components/${side}-${row}`} style={{ inset: 0 }} /></button>))}
      <SourceRaster id="equipment-avatar" className="equipment-source-avatar" file={`${assetRoot}/components/avatar`} style={{ left: 109, top: 18, width: 61, height: 134 }} />
      <output className="sr-only" role="status">{selected}</output>
    </SourceWindow>
  );
}

export function ChatSourceWindow({ zIndex, onActivate }: WindowProps) {
  const [topic, setTopic] = useState("");
  const [room, setRoom] = useState("チャットルーム");
  const [roomOpen, setRoomOpen] = useState(false);
  const [privacy, setPrivacy] = useState("公開");
  const [status, setStatus] = useState("");
  const assetRoot = `${root}/chat`;
  return (
    <SourceWindow id="chat" title="チャットルーム" initialPosition={{ x: 285, y: 279 }} width={280} height={120} titleWidth={45} assetRoot={assetRoot} zIndex={zIndex} onActivate={onActivate} minimizable={false} closable={false} dragHandleStyle={{ width: 60 }}>
      <div>
        <SourceRaster id="chat-topic-label" file={`${assetRoot}/components/topic-label`} style={{ left: 3, top: 26, width: 41, height: 19 }} /><SourceRaster id="chat-topic-field" file={`${assetRoot}/components/topic-field`} style={{ left: 44, top: 26, width: 232, height: 19 }} />
        <SourceRaster id="chat-people" file={`${assetRoot}/components/people`} style={{ left: 3, top: 45, width: 133, height: 20 }} /><SourceRaster id="chat-room-label" file={`${assetRoot}/components/room-label`} style={{ left: 136, top: 45, width: 45, height: 20 }} />
        <SourceRaster id="chat-security" file={`${assetRoot}/components/security`} style={{ left: 3, top: 65, width: 131, height: 20 }} />
        <SourceRaster id="chat-privacy-public" file={`${assetRoot}/components/privacy-${privacy === "公開" ? "on" : "off"}`} style={{ left: 43, top: 66, width: 16, height: 18 }} />
        <SourceRaster id="chat-privacy-private" file={`${assetRoot}/components/privacy-${privacy === "非公開" ? "on" : "off"}`} style={{ left: 82, top: 66, width: 16, height: 18 }} />
        <SourceRaster id="chat-password" file={`${assetRoot}/components/password`} style={{ left: 135, top: 65, width: 141, height: 20 }} />
        <input className="chat-source-topic" aria-label="トピック" data-visual-component="chat-topic-field" value={topic} onChange={(event) => setTopic(event.currentTarget.value)} />
        <div className="chat-source-room-control" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setRoomOpen(false); }}>
          <button type="button" className="chat-source-room-button" role="combobox" aria-label="ルーム" aria-expanded={roomOpen} aria-controls="chat-room-options" aria-haspopup="listbox" onClick={() => setRoomOpen((value) => !value)}>
            <SourceRaster id="chat-room-select" file={`${assetRoot}/components/room-select`} style={{ inset: 0 }} />
            <span className={room === "チャットルーム" ? "sr-only" : "chat-source-room-value"}>{room}</span>
          </button>
          {roomOpen && <div id="chat-room-options" className="chat-source-room-listbox" role="listbox" aria-label="ルーム">
            {["チャットルーム", "パーティー"].map((option) => <button key={option} type="button" role="option" aria-selected={room === option} onClick={() => { setRoom(option); setRoomOpen(false); }}>{option}</button>)}
          </div>}
        </div>
        <input className="chat-source-privacy chat-source-privacy--public" type="radio" name="privacy" aria-label="公開" data-visual-component="chat-privacy-public" checked={privacy === "公開"} onChange={() => setPrivacy("公開")} />
        <input className="chat-source-privacy chat-source-privacy--private" type="radio" name="privacy" aria-label="非公開" data-visual-component="chat-privacy-private" checked={privacy === "非公開"} onChange={() => setPrivacy("非公開")} />
        <button className="chat-source-ok" type="button" aria-label="OK" data-visual-component="chat-ok" onClick={() => setStatus(`${privacy} ${room}「${topic}」を作成しました`)}><SourceRaster id="chat-ok" file={`${assetRoot}/components/ok`} style={{ inset: 0 }} /></button>
        <button className="chat-source-cancel" type="button" aria-label="cancel" data-visual-component="chat-cancel" onClick={() => { setTopic(""); setRoom("チャットルーム"); setRoomOpen(false); setPrivacy("公開"); setStatus("キャンセルしました"); }}><SourceRaster id="chat-cancel" file={`${assetRoot}/components/cancel`} style={{ inset: 0 }} /></button>
      </div>
      <output className="chat-source-status" role="status">{status}</output>
    </SourceWindow>
  );
}

export function ExchangeSourceWindow({ zIndex, onActivate }: WindowProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState("");
  const assetRoot = `${root}/exchange`;
  return (
    <SourceWindow id="exchange" title="交換ウィンドウ: ANRI" initialPosition={{ x: 285, y: 399 }} width={280} height={120} titleWidth={140} assetRoot={assetRoot} zIndex={zIndex} onActivate={onActivate} minimizable={false} closable={false}>
      {Array.from({ length: 16 }, (_, index) => { const row = Math.floor(index / 8); const column = index % 8; return <button key={index} type="button" className="exchange-source-item" aria-label={`交換アイテム ${index + 1}`} aria-pressed={selected === index} data-visual-component={`exchange-item-${row}-${column}`} style={{ left: 5 + column * 34, top: 19 + row * 34 }} onClick={() => { setSelected(index); setAccepted(false); setStatus(`交換アイテム ${index + 1} を選択`); }}><SourceRaster id={`exchange-item-${row}-${column}`} file={`${assetRoot}/components/item-${row}-${column}`} style={{ inset: 0 }} /></button>; })}
      <SourceRaster id="exchange-summary" file={`${assetRoot}/components/summary`} style={{ left: 4, top: 87, width: 272, height: 14 }} />
      <button className="exchange-source-ok" type="button" aria-label="OK" aria-pressed={accepted} data-visual-component="exchange-ok" disabled={selected === null} onClick={() => { setAccepted(true); setStatus("交換内容を確認しました"); }}><SourceRaster id="exchange-ok" file={`${assetRoot}/components/ok`} style={{ inset: 0 }} /></button>
      <button className="exchange-source-trade" type="button" aria-label="trade" data-visual-component="exchange-trade" disabled={!accepted} onClick={() => { setAccepted(false); setSelected(null); setStatus("交換しました"); }}><SourceRaster id="exchange-trade" file={`${assetRoot}/components/trade`} style={{ inset: 0 }} /></button>
      <button className="exchange-source-cancel" type="button" aria-label="cancel" aria-pressed={status === "交換をキャンセルしました"} data-visual-component="exchange-cancel" onClick={() => { setAccepted(false); setSelected(null); setStatus("交換をキャンセルしました"); }}><SourceRaster id="exchange-cancel" file={`${assetRoot}/components/cancel`} style={{ inset: 0 }} /></button>
      <output className="sr-only" role="status">{status}</output>
    </SourceWindow>
  );
}

export function GameMenuSourceWindow({ zIndex, onActivate }: WindowProps) {
  const [selected, setSelected] = useState(-1);
  const labels = ["Return to last save point", "Character Select", "Exit to Windows", "Return to game"];
  const assetRoot = `${root}/game-menu`;
  return <SourceWindow id="game-menu" title="ゲームメニュー" initialPosition={{ x: 626, y: 182 }} width={222} height={133} titleWidth={128} assetRoot={assetRoot} zIndex={zIndex} onActivate={onActivate} minimizable={false} closable={false}>{labels.map((label, row) => <button key={label} type="button" className="game-menu-source-action" aria-pressed={selected === row} aria-label={label} data-visual-component={`game-menu-action-${row}`} style={{ top: 29 + row * 25 }} onClick={() => setSelected((current) => current === row ? -1 : row)}><SourceRaster id={`game-menu-action-${row}`} file={`${assetRoot}/components/action-${row}`} style={{ inset: 0 }} /></button>)}<output className="sr-only" role="status">{selected >= 0 ? labels[selected] : "menu ready"}</output></SourceWindow>;
}

export function PartySourceWindow({ zIndex, onActivate, open, onClose, tab, onTabChange }: WindowProps & { tab: "friends" | "party"; onTabChange: (tab: "friends" | "party") => void }) {
  const [member, setMember] = useState<number | null>(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const names = ["SakumaRiri", "Sebas'", "ANRI(砂漠の都市モロク)", "Show_A", "Ayanalshizuka"];
  const assetRoot = `${root}/party`;
  const moveMember = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = member ?? 0;
    const next = event.key === "Home" ? 0 : event.key === "End" ? names.length - 1 : event.key === "ArrowDown" ? (current + 1) % names.length : (current - 1 + names.length) % names.length;
    setMember(next);
    setStatus(`${names[next]} を選択`);
  };
  return <>
    <SourceWindow id="party" title="パーティー (Riri-Soft)" initialPosition={{ x: 568, y: 349 }} width={160} height={175} titleWidth={125} titleTop={5} assetRoot={assetRoot} zIndex={zIndex} onActivate={onActivate} minimizable={false} closeRight={1} closeTop={4} open={open} onClose={onClose}>
      <div id="party-member-list" className="party-source-member-list" role="listbox" aria-label="パーティーメンバー" aria-activedescendant={member === null ? undefined : `party-member-option-${member}`} tabIndex={0} onKeyDown={moveMember}>{names.map((name, row) => {
        const selected = member === row;
        const rowFile = row === 0 && !selected
          ? `${assetRoot}/components/member-row-0-unselected`
          : row !== 0 && selected
            ? `${assetRoot}/components/member-row-${row}-selected`
            : `${assetRoot}/components/member-${row}`;
        return <button key={name} id={`party-member-option-${row}`} type="button" role="option" tabIndex={-1} className="party-source-member" aria-label={name} aria-selected={selected} data-visual-component={`party-member-${row}`} style={{ top: 20 + row * 19 }} onClick={() => { const next = selected ? null : row; setMember(next); setStatus(next === null ? `${name} の選択を解除` : `${name} を選択`); }}>
          <SourceRaster id={`party-member-${row}`} file={rowFile} style={{ inset: 0 }} />
        </button>;
      })}</div>
      {[0, 1, 2, 3, 4].map((column) => <button key={column} type="button" className="party-source-tool" aria-label={`パーティーツール ${column + 1}`} aria-pressed={status === `tool ${column + 1}`} data-visual-component={`party-tool-${column}`} style={{ left: 4 + column * 29 }} onClick={() => setStatus((current) => current === `tool ${column + 1}` ? "" : `tool ${column + 1}`)}><SourceRaster id={`party-tool-${column}`} file={`${assetRoot}/components/tool-${column}`} style={{ inset: 0 }} /></button>)}
      <div className="party-source-tabs" role="tablist" aria-label="パーティービュー">
        <button type="button" role="tab" className="party-source-tab party-source-tab--friends" aria-label="友達" aria-selected={tab === "friends"} aria-controls="party-member-list" data-visual-component="party-friends" onClick={() => onTabChange("friends")} onKeyDown={(event) => { if (event.key === "ArrowRight") { event.preventDefault(); onTabChange("party"); } }}><SourceRaster id="party-friends" file={`${assetRoot}/components/friends`} style={{ inset: 0 }} /></button>
        <button type="button" role="tab" className="party-source-tab party-source-tab--party" aria-label="パーティー" aria-selected={tab === "party"} aria-controls="party-member-list" data-visual-component="party-party-tab" onClick={() => onTabChange("party")} onKeyDown={(event) => { if (event.key === "ArrowLeft") { event.preventDefault(); onTabChange("friends"); } }}><SourceRaster id="party-party-tab" file={`${assetRoot}/components/party-tab`} style={{ inset: 0 }} /></button>
      </div>
      <output className="sr-only" role="status">{status || `${page + 1}/2`}</output>
    </SourceWindow>
    {open !== false && <div className="party-source-external-actions" role="group" aria-label="パーティー外部操作" data-control-owner="party" style={{ zIndex }}>
      {["back", "next", "sell"].map((label, row) => <button key={label} type="button" className="party-source-action" aria-label={label} aria-pressed={status.startsWith(label)} data-visual-component={`party-action-${row}`} style={{ top: row * 23 }} onClick={() => { if (label === "back") setPage(0); if (label === "next") setPage(1); setStatus(`${label} ${label === "sell" ? (member === null ? "選択なし" : names[member]) : `${label === "next" ? 2 : 1}/2`}`); }}><SourceRaster id={`party-action-${row}`} file={`${assetRoot}/components/action-${row}`} style={{ inset: 0 }} /></button>)}
    </div>}
  </>;
}

export function QuickbarSourceWindow({ zIndex, onActivate }: WindowProps) {
  const [active, setActive] = useState(-1);
  const assetRoot = `${root}/quickbar`;
  const geometry = [{ left: 2, top: 2, width: 42, height: 42 }, { left: 44, top: 1, width: 42, height: 43 }, { left: 2, top: 50, width: 76, height: 42 }];
  return <SourceWindow id="quickbar" title="クイックスロット" initialPosition={{ x: 736, y: 430 }} width={112} height={94} titleWidth={80} assetRoot={assetRoot} zIndex={zIndex} onActivate={onActivate} minimizable={false} closable={false} dragHandleStyle={{ left: 87, top: 0, width: 25, height: 94 }}>{geometry.map((style, index) => <button key={index} type="button" className="quickbar-source-slot" aria-label={`クイックスロット ${index + 1}`} aria-pressed={active === index} data-visual-component={`quickbar-slot-${index}`} style={style} onClick={() => setActive((current) => current === index ? -1 : index)}><SourceRaster id={`quickbar-slot-${index}`} file={`${assetRoot}/components/slot-${index}`} style={{ inset: 0 }} /></button>)}<output className="sr-only" role="status">{active < 0 ? "slot ready" : `slot ${active + 1}`}</output></SourceWindow>;
}
