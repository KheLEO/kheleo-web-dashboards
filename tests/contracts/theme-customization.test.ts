import { expect, it } from "vitest";
import {
  parseOverrides,
  hexChannels,
  channelsHex,
  contrastRatio,
  variableEntries,
  themeCss,
} from "@/lib/theme/customization";
it("validates stored palette values and prevents arbitrary CSS properties", () => {
  expect(parseOverrides('{"primary":"#123456"}')).toEqual({ primary: "#123456" });
  expect(parseOverrides('{"primary":"url(bad)"}')).toEqual({});
  expect(parseOverrides('{"unknown":"#123456"}')).toEqual({});
  expect(parseOverrides("broken JSON")).toEqual({});
});
it("maps custom colors to both semantic RGB channels and named hex aliases", () => {
  expect(hexChannels("#123456")).toEqual([18, 52, 86]);
  expect(channelsHex("18 52 86")).toBe("#123456");
  expect(channelsHex("999 0 0")).toBeNull();
  expect(variableEntries({ primary: "#123456" })).toEqual([
    ["--kheleo-gold-primary", "#123456"],
    ["--kheleo-gold-rgb", "18 52 86"],
  ]);
});
it("computes contrast and exports only the reviewed palette variable list", () => {
  expect(contrastRatio("#000000", "#ffffff")).toBe(21);
  expect(contrastRatio("#ffffff", "#ffffff")).toBe(1);
  const css = themeCss(
    [
      ["--kheleo-gold-primary", "#123456"],
      ["--unapproved-setting", "value"],
    ],
    "light",
  );
  expect(css).toContain("color-scheme: light");
  expect(css).toContain("--kheleo-gold-primary: #123456");
  expect(css).not.toContain("unapproved");
});
