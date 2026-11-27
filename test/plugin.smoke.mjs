import test from "node:test"; import assert from "node:assert/strict"; import Module from "node:module"; import path from "node:path";
const Orig = Module._load;
class Plugin { constructor(){ this.i18n={title:"t"}; this.bars=[]; } async loadData(){return {};} async saveData(){} addTopBar(o){ this.bars.push(o); } addCommand(){} }
test("plugin loads against mocked siyuan API and scans tags", async () => {
	Module._load = function (r, ...a) { return r === "siyuan" ? { Plugin, Dialog: class {}, showMessage() {}, confirm() {}, getFrontend: () => "desktop" } : Orig.call(this, r, ...a); };
	globalThis.fetch = async (p, o) => ({ json: async () => ({ code: 0, data: JSON.parse(o.body).stmt ? [{ label: "Todo", count: 1 }, { label: "todo", count: 3 }, { label: "x", count: 1 }] : null }) });
	const { createRequire } = await import("node:module"); const P = createRequire(import.meta.url)(path.resolve("index.js"));
	const p = new P(); await p.onload(); assert.equal(p.bars.length, 1); assert.equal(p.licensed, false);
	const r = await p.scan(); assert.equal(r.groups.length, 1); assert.equal(r.groups[0].canonical, "todo"); assert.deepEqual(r.single, ["Todo", "x"]);
	Module._load = Orig;
});
