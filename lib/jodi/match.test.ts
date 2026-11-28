import { describe, expect, it } from "vitest";
import { jodiOfferMessage, pairKey, pickJodiOffers, type JodiCandidate } from "./match";

const p = (id: string, o: Partial<JodiCandidate> = {}): JodiCandidate => ({
  id,
  name: id.toUpperCase() + " Test",
  handle: id,
  city: "pune",
  cityName: "Pune",
  niches: ["fashion"],
  followers: 1000,
  connections: 0,
  joined: "2026-11-20T00:00:00Z",
  ...o,
});
const none = { busy: new Set<string>(), avoid: new Set<string>(), maxPairs: 10, perPerson: 5, maxShown: 4 };
const opts = (offers: ReturnType<typeof pickJodiOffers>, id: string) => offers.find((o) => o.to.id === id)?.options.map((x) => x.b.id);

describe("pickJodiOffers", () => {
  it("gives each member several options to choose from", () => {
    const offers = pickJodiOffers([p("a"), p("b"), p("c"), p("d")], none);
    expect(opts(offers, "a")).toHaveLength(3);
  });
  it("never tells the same two people about each other twice in one night", () => {
    const offers = pickJodiOffers([p("a"), p("b")], none);
    expect(offers).toHaveLength(1);
  });
  it("skips sizes more than 3x apart and unrelated niches", () => {
    expect(pickJodiOffers([p("a", { followers: 1000 }), p("b", { followers: 3500 })], none)).toEqual([]);
    expect(pickJodiOffers([p("a", { niches: ["fashion"] }), p("b", { niches: ["finance"] })], none)).toEqual([]);
    expect(pickJodiOffers([p("a", { niches: ["fashion"] }), p("b", { niches: ["beauty"] })], none)[0].options[0].related).toBe(true);
  });
  it("lists different cities first", () => {
    const offers = pickJodiOffers([p("a"), p("b", { connections: 2 }), p("c", { city: "kolkata", cityName: "Kolkata", connections: 2 })], none);
    expect(opts(offers, "a")).toEqual(["c", "b"]);
  });
  it("busy members don't get a list but can still be suggested", () => {
    const offers = pickJodiOffers([p("a"), p("b")], { ...none, busy: new Set(["b"]) });
    expect(offers.map((o) => o.to.id)).toEqual(["a"]);
    expect(opts(offers, "a")).toEqual(["b"]);
  });
  it("skips past pairs and people without a niche or followers", () => {
    expect(pickJodiOffers([p("a"), p("b")], { ...none, avoid: new Set([pairKey("b", "a")]) })).toEqual([]);
    expect(pickJodiOffers([p("a", { niches: [] }), p("b")], none)).toEqual([]);
    expect(pickJodiOffers([p("a", { followers: 0 }), p("b")], none)).toEqual([]);
  });
  it("caps options, members per night and how often one creator is shown", () => {
    const many = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => p(id));
    const offers = pickJodiOffers(many, { ...none, perPerson: 2, maxPairs: 3, maxShown: 1 });
    expect(offers).toHaveLength(3);
    expect(offers.every((o) => o.options.length <= 2)).toBe(true);
    const shown = offers.flatMap((o) => o.options.map((x) => x.b.id));
    expect(new Set(shown).size).toBe(shown.length);
  });
});

describe("jodiOfferMessage", () => {
  it("lists every option with a profile link and no Instagram ID", () => {
    const [offer] = pickJodiOffers(
      [
        p("uv", { name: "Official Uv 777", city: "ahmedabad", cityName: "Ahmedabad", niches: ["music", "comedy"], followers: 102000 }),
        p("shelly", { name: "Shelly", city: "bhagalpur", cityName: "Bhagalpur", niches: ["music"], followers: 102000, connections: 1 }),
        p("pak", { name: "Pakiza", city: "lucknow", cityName: "Lucknow", niches: ["dance"], followers: 40000, connections: 1 }),
      ],
      none,
    );
    const text = jodiOfferMessage(offer);
    expect(text).toContain("Hi Official, Peerpop here");
    expect(text).toContain("Aapke liye 2 collab Jodis!");
    expect(text).toContain("1. Shelly, Bhagalpur (music, 102K followers)\nwww.peerpop.in/shelly");
    expect(text).toContain("2. Pakiza, Lucknow (dance, 40K followers)\nwww.peerpop.in/pak");
    expect(text).toContain("www.peerpop.in/home");
  });
  it("reads naturally with one option", () => {
    const [offer] = pickJodiOffers([p("a"), p("b")], none);
    expect(jodiOfferMessage(offer)).toContain("Aapke liye ek collab Jodi!");
    expect(jodiOfferMessage(offer)).not.toContain("1. ");
  });
});
