import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "client/src/index.css"), "utf8");
const page = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("CUSHION approved design contract", () => {
  it("keeps the implementation light-first with semantic surface tokens", () => {
    expect(css).toContain("--color-canvas: #f7f9fa");
    expect(css).toContain("--color-surface: #ffffff");
    expect(css).toContain("--color-ink: #18252d");
    expect(css).toContain("--color-protection: #1599b4");
    expect(css).toContain("--color-success: #1c9b64");
    expect(css).toContain("--color-risk: #c24c55");
    expect(css).toContain("--shadow-instrument");
    expect(css).toContain("@media (max-width: 560px)");
  });

  it("keeps the composer as the primary object and avoids prohibited visual language", () => {
    expect(page).toContain("What are you worried about?");
    expect(page).toContain("Illustrative preview");
    expect(page).toContain("aria-pressed={selected}");
    expect(css).not.toContain("#100904");
    expect(css).not.toContain("#dc5000");
    expect(css).not.toContain("background: var(--ink)");
  });
});
