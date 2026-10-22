import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import "./ledger.js";

const L = globalThis.Ledger;

const sample = [
  { id: "a", date: "2026-03-02", amount: 150000, payee: "Ali Traders", category: "cement", method: "bank", reference: "TRX1", notes: "200 bags", created: 1 },
  { id: "b", date: "2026-03-15", amount: 0.1, payee: "ali traders ", category: "cement", method: "cash", reference: "", notes: "", created: 2 },
  { id: "c", date: "2026-04-01", amount: 0.2, payee: "Khan Steel", category: "steel", method: "cheque", reference: "", notes: "Rebar, \"12mm\"", created: 3 },
  { id: "d", date: "2026-04-01", amount: 500000, payee: "Contractor", category: "labour", method: "bank", reference: "", notes: "", created: 4 },
];

Deno.test("total sums in cents without float drift", () => {
  assertEquals(L.total(sample), 650000.3);
  assertEquals(L.total([{ amount: 0.1 }, { amount: 0.2 }]), 0.3);
  assertEquals(L.total([]), 0);
});

Deno.test("parseAmount handles grouping, symbols and junk", () => {
  assertEquals(L.parseAmount("150000"), 150000);
  assertEquals(L.parseAmount("1,50,000"), 150000);
  assertEquals(L.parseAmount("Rs 2,500.50"), 2500.5);
  assertEquals(L.parseAmount("₨ 75 000"), 75000);
  assertEquals(L.parseAmount(".5"), 0.5);
  assertEquals(L.parseAmount("12.345"), 12.35);
  assertEquals(Number.isNaN(L.parseAmount("")), true);
  assertEquals(Number.isNaN(L.parseAmount("0")), true);
  assertEquals(Number.isNaN(L.parseAmount("-50")), true);
  assertEquals(Number.isNaN(L.parseAmount("12abc")), true);
  assertEquals(Number.isNaN(L.parseAmount("1.2.3")), true);
});

Deno.test("isISODate rejects impossible dates", () => {
  assertEquals(L.isISODate("2026-02-28"), true);
  assertEquals(L.isISODate("2026-02-30"), false);
  assertEquals(L.isISODate("2026-2-3"), false);
  assertEquals(L.isISODate(undefined), false);
});

Deno.test("sortPayments puts newest date first, then newest entry", () => {
  assertEquals(L.sortPayments(sample).map((p) => p.id), ["d", "c", "b", "a"]);
});

Deno.test("filterPayments combines filters", () => {
  const ids = (list) => list.map((p) => p.id).sort();
  assertEquals(ids(L.filterPayments(sample, { category: "cement" })), ["a", "b"]);
  assertEquals(ids(L.filterPayments(sample, { method: "bank" })), ["a", "d"]);
  assertEquals(ids(L.filterPayments(sample, { from: "2026-03-10", to: "2026-04-01" })), ["b", "c", "d"]);
  assertEquals(ids(L.filterPayments(sample, { query: "ALI" })), ["a", "b"]);
  assertEquals(ids(L.filterPayments(sample, { query: "bags" })), ["a"]);
  assertEquals(ids(L.filterPayments(sample, { query: "steel" })), ["c"]);
  assertEquals(ids(L.filterPayments(sample, {})), ["a", "b", "c", "d"]);
});

Deno.test("byPayee merges names case- and space-insensitively", () => {
  const rows = L.byPayee(sample);
  assertEquals(rows[0], { key: "contractor", label: "Contractor", total: 500000, count: 1 });
  assertEquals(rows[1], { key: "ali traders", label: "Ali Traders", total: 150000.1, count: 2 });
});

Deno.test("byCategory and byMonth group and order correctly", () => {
  assertEquals(L.byCategory(sample).map((r) => [r.key, r.total]), [
    ["labour", 500000],
    ["cement", 150000.1],
    ["steel", 0.2],
  ]);
  assertEquals(L.byMonth(sample).map((r) => [r.key, r.total, r.count]), [
    ["2026-04", 500000.2, 2],
    ["2026-03", 150000.1, 2],
  ]);
});

Deno.test("unknown category falls back to Other", () => {
  assertEquals(L.category("nope").id, "other");
});

Deno.test("toCSV escapes quotes and commas", () => {
  const lines = L.toCSV(sample).trim().split("\r\n");
  assertEquals(lines[0], "Date,Paid to,Category,Method,Reference,Amount,Notes");
  assertEquals(lines.length, 5);
  assertEquals(lines[2], '2026-04-01,Khan Steel,Steel & Iron,Cheque,,0.20,"Rebar, ""12mm"""');
});

Deno.test("backup round-trips and drops invalid rows", () => {
  const settings = { projectName: "Plot 14", budget: 25000000, currency: "PKR" };
  const text = L.makeBackup(sample, settings);
  const back = L.parseBackup(text);
  // Names are trimmed on import; everything else survives unchanged.
  assertEquals(back.payments, sample.map((p) => ({ ...p, payee: p.payee.trim() })));
  assertEquals(back.settings, settings);
  assertEquals(back.skipped, 0);

  const messy = JSON.stringify({
    payments: [
      { date: "2026-01-01", amount: "1,000", category: "zzz", method: "pigeon" },
      { date: "bad", amount: 10 },
      { date: "2026-01-02", amount: -5 },
    ],
  });
  const r = L.parseBackup(messy);
  assertEquals(r.skipped, 2);
  assertEquals(r.payments.length, 1);
  assertEquals(r.payments[0].amount, 1000);
  assertEquals(r.payments[0].category, "other");
  assertEquals(r.payments[0].method, "other");
});

Deno.test("parseBackup rejects non-backups with readable errors", () => {
  assertThrows(() => L.parseBackup("not json"), Error, "valid JSON");
  assertThrows(() => L.parseBackup('{"foo":1}'), Error, "No payments");
});

Deno.test("imported ids with unsafe characters are replaced", () => {
  const ok = L.normalizePayment({ id: "abc-123", date: "2026-01-01", amount: 5 });
  assertEquals(ok.id, "abc-123");
  const bad = L.normalizePayment({ id: "a/b", date: "2026-01-01", amount: 5 });
  assertEquals(bad.id === "a/b", false);
  assertEquals(/^[a-z0-9]+$/.test(bad.id), true);
  const dots = L.normalizePayment({ id: "..", date: "2026-01-01", amount: 5 });
  assertEquals(dots.id === "..", false);
});
