// Run against a headless SiYuan kernel on :6806 with the test docs described in the research note. Usage: node test/realkernel.mjs
import Module from "node:module"; import path from "node:path"; import assert from "node:assert/strict";
const Orig = Module._load;
class Plugin { constructor(){ this.i18n={}; } async loadData(){return {};} addTopBar(){} addCommand(){} }
Module._load = function (r, ...a) { return r === "siyuan" ? { Plugin, Dialog: class {}, showMessage() {}, confirm() {}, getFrontend: () => "desktop" } : Orig.call(this, r, ...a); };
const f = globalThis.fetch; globalThis.fetch = (p, o) => f("http://127.0.0.1:6806" + p, o);
const { createRequire } = await import("node:module"); const P = createRequire(import.meta.url)(path.resolve("index.js"));
const core = createRequire(import.meta.url)(path.resolve("src/core.js"));
const p = new P(); await p.onload();
let r = await p.scan(); console.log(JSON.stringify(r.groups.map((g) => [g.canonical, g.variants.map((v) => v.label + ":" + v.count)])), r.single);
const g = r.groups.find((x) => x.key === "project"); assert.ok(g); assert.equal(g.canonical, "project");
await p.merge(core.mergePlan(g)); await new Promise((s) => setTimeout(s, 2500));
r = await p.scan(); assert.ok(!r.groups.find((x) => x.key === "project")); assert.equal(r.rows.find((x) => x.label === "project").count, 5);
console.log("real kernel OK");
