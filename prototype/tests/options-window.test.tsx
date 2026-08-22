import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OptionsWindow } from "../src/OptionsWindow";

describe("Japanese Options window", () => {
  it("lets the user change BGM continuously through the public slider", () => {
    render(<OptionsWindow />);

    const bgm = screen.getByRole("slider", { name: "BGM" });
    fireEvent.change(bgm, { target: { value: "73" } });

    expect(bgm).toHaveValue("73");
    expect(screen.getByTestId("bgm-value")).toHaveTextContent("73");
  });

  it("lets the user change Effect independently through its public slider", () => {
    render(<OptionsWindow />);

    const effect = screen.getByRole("slider", { name: "Effect" });
    fireEvent.change(effect, { target: { value: "31" } });

    expect(effect).toHaveValue("31");
    expect(screen.getByTestId("effect-value")).toHaveTextContent("31");
    expect(screen.getByRole("slider", { name: "BGM" })).toHaveValue("62");
  });

  it("moves BGM one smooth step with its source-matched arrow buttons", () => {
    render(<OptionsWindow />);

    fireEvent.click(screen.getByRole("button", { name: "BGMを下げる" }));
    expect(screen.getByRole("slider", { name: "BGM" })).toHaveValue("61");

    fireEvent.click(screen.getByRole("button", { name: "BGMを上げる" }));
    expect(screen.getByRole("slider", { name: "BGM" })).toHaveValue("62");
  });

  it("moves Effect independently with its source-matched arrow buttons", () => {
    render(<OptionsWindow />);

    fireEvent.click(screen.getByRole("button", { name: "Effectを上げる" }));

    expect(screen.getByRole("slider", { name: "Effect" })).toHaveValue("44");
    expect(screen.getByRole("slider", { name: "BGM" })).toHaveValue("62");
  });

  it("preserves and toggles the independent BGM and Effect on states", () => {
    render(<OptionsWindow />);

    const bgmOn = screen.getByRole("checkbox", { name: "BGM on" });
    const effectOn = screen.getByRole("checkbox", { name: "Effect on" });
    expect(bgmOn).not.toBeChecked();
    expect(effectOn).toBeChecked();

    fireEvent.click(bgmOn);
    fireEvent.click(effectOn);
    expect(bgmOn).toBeChecked();
    expect(effectOn).not.toBeChecked();
  });

  it("opens the Skin control and selects a Japanese theme option", () => {
    render(<OptionsWindow />);

    const skin = screen.getByRole("combobox", { name: "Skin" });
    expect(skin).toHaveTextContent("");

    fireEvent.click(skin);
    fireEvent.click(screen.getByRole("option", { name: "ブルー" }));
    expect(skin).toHaveTextContent("ブルー");
  });

  it("preserves and toggles each visible footer checkbox", () => {
    render(<OptionsWindow />);

    const expected = [
      ["opaque", false],
      ["attack", true],
      ["skill", false],
      ["item", true],
    ] as const;

    for (const [name, checked] of expected) {
      const checkbox = screen.getByRole("checkbox", { name });
      expect(checkbox).toHaveProperty("checked", checked);
      fireEvent.click(checkbox);
      expect(checkbox).toHaveProperty("checked", !checked);
    }
  });

  it("switches between the option and info tabs", () => {
    render(<OptionsWindow />);

    const optionTab = screen.getByRole("tab", { name: "option" });
    const infoTab = screen.getByRole("tab", { name: "info" });
    expect(optionTab).toHaveAttribute("aria-selected", "true");
    expect(infoTab).toHaveAttribute("aria-selected", "false");

    fireEvent.click(infoTab);
    expect(optionTab).toHaveAttribute("aria-selected", "false");
    expect(infoTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("情報はありません");
  });

  it("preserves user selections when the user visits info and returns", () => {
    render(<OptionsWindow />);

    const skin = screen.getByRole("combobox", { name: "Skin" });
    const effectOn = screen.getByRole("checkbox", { name: "Effect on" });
    const skill = screen.getByRole("checkbox", { name: "skill" });
    fireEvent.click(skin);
    fireEvent.click(screen.getByRole("option", { name: "ブルー" }));
    fireEvent.click(effectOn);
    fireEvent.click(skill);

    fireEvent.click(screen.getByRole("tab", { name: "info" }));
    fireEvent.click(screen.getByRole("tab", { name: "option" }));

    expect(screen.getByRole("combobox", { name: "Skin" })).toHaveTextContent("ブルー");
    expect(screen.getByRole("checkbox", { name: "Effect on" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "skill" })).toBeChecked();
  });

  it("minimizes and restores the window from its title-bar button", () => {
    render(<OptionsWindow />);

    const windowPanel = screen.getByRole("region", { name: "オプション" });
    const minimize = screen.getByRole("button", { name: "最小化" });
    fireEvent.click(minimize);
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    fireEvent.transitionEnd(windowPanel, { propertyName: "height" });
    expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument();
    expect(minimize).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(minimize);
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    expect(minimize).toHaveAttribute("aria-expanded", "true");
  });

  it("preserves user selections while the window is minimized", () => {
    render(<OptionsWindow />);

    fireEvent.click(screen.getByRole("combobox", { name: "Skin" }));
    fireEvent.click(screen.getByRole("option", { name: "グレー" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Effect on" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "skill" }));

    const minimize = screen.getByRole("button", { name: "最小化" });
    fireEvent.click(minimize);
    fireEvent.click(minimize);

    expect(screen.getByRole("combobox", { name: "Skin" })).toHaveTextContent("グレー");
    expect(screen.getByRole("checkbox", { name: "Effect on" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "skill" })).toBeChecked();
  });

  it("closes the window from its title-bar button", () => {
    render(<OptionsWindow />);

    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));

    expect(screen.queryByRole("region", { name: "オプション" })).not.toBeInTheDocument();
  });

  it("moves the complete window when its title bar is dragged", () => {
    render(<OptionsWindow />);

    const windowPanel = screen.getByRole("region", { name: "オプション" });
    const titleBar = screen.getByRole("banner");
    fireEvent.pointerDown(titleBar, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(titleBar, { clientX: 60, clientY: 45 });
    fireEvent.pointerUp(titleBar);

    expect(windowPanel).toHaveStyle({ left: "50px", top: "35px" });
  });
});
