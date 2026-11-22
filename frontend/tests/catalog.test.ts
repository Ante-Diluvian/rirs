import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { isManualStatus } from "../src/features/catalog/copy-status.ts";
import { authorName, authorNames } from "../src/features/catalog/format.ts";
import { MIN_QUERY_LENGTH, searchQuery } from "../src/features/catalog/search.ts";

describe("searchQuery", () => {
  it(`niz, krajši od ${MIN_QUERY_LENGTH} znakov, se ne pošlje`, () => {
    assert.equal(searchQuery(""), "");
    assert.equal(searchQuery("ab"), "");
  });

  it(`niz z vsaj ${MIN_QUERY_LENGTH} znaki ostane nespremenjen`, () => {
    assert.equal(searchQuery("abc"), "abc");
    assert.equal(searchQuery("Prešeren"), "Prešeren");
  });
});

describe("authorName", () => {
  it("združi ime in priimek", () => {
    assert.equal(
      authorName({ id: "1", firstName: "France", lastName: "Prešeren" }),
      "France Prešeren",
    );
  });

  it("brez imena ne pusti presledka na začetku", () => {
    assert.equal(authorName({ id: "1", firstName: "", lastName: "Homer" }), "Homer");
  });

  it("več avtorjev loči z vejico", () => {
    assert.equal(
      authorNames([
        { id: "1", firstName: "Ivan", lastName: "Cankar" },
        { id: "2", firstName: "Srečko", lastName: "Kosovel" },
      ]),
      "Ivan Cankar, Srečko Kosovel",
    );
  });

  it("prazen seznam vrne prazen niz", () => {
    assert.equal(authorNames([]), "");
  });
});

describe("isManualStatus", () => {
  it("prost in izgubljen izvod lahko knjižničar nastavi ročno", () => {
    assert.equal(isManualStatus("AVAILABLE"), true);
    assert.equal(isManualStatus("LOST"), true);
  });

  it("izposojenega in rezerviranega izvoda ne more", () => {
    assert.equal(isManualStatus("ON_LOAN"), false);
    assert.equal(isManualStatus("RESERVED"), false);
  });
});