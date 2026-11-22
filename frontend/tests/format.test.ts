import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { formatDate, formatMoney, plural } from "../src/lib/format.ts";

const zadetki: [string, string, string, string] = [
  "zadetek",
  "zadetka",
  "zadetki",
  "zadetkov",
];

describe("plural", () => {
  it("1 in 101 uporabita ednino", () => {
    assert.equal(plural(1, zadetki), "zadetek");
    assert.equal(plural(101, zadetki), "zadetek");
  });

  it("2 uporabi dvojino", () => {
    assert.equal(plural(2, zadetki), "zadetka");
  });

  it("3 in 4 uporabita množino", () => {
    assert.equal(plural(3, zadetki), "zadetki");
    assert.equal(plural(4, zadetki), "zadetki");
  });

  it("0, 5 in 11 uporabijo rodilnik množine", () => {
    assert.equal(plural(0, zadetki), "zadetkov");
    assert.equal(plural(5, zadetki), "zadetkov");
    assert.equal(plural(11, zadetki), "zadetkov");
  });
});

describe("formatDate", () => {
  it("ISO datum pretvori v slovensko obliko", () => {
    assert.equal(formatDate("2026-11-02"), "2. 11. 2026");
  });

  it("odstrani vodilne ničle", () => {
    assert.equal(formatDate("2026-01-09"), "9. 1. 2026");
  });
});

describe("formatMoney", () => {
  // Intl med številko in € vstavi nedeljiv presledek, zato ga zamenjamo z navadnim
  const normalize = (s: string) => s.replace(/\s/g, " ");

  it("zapiše znesek z decimalno vejico in znakom €", () => {
    assert.equal(normalize(formatMoney("0.50")), "0,50 €");
  });

  it("zaokroži na dve decimalki", () => {
    assert.equal(normalize(formatMoney("12.345")), "12,35 €");
  });
});