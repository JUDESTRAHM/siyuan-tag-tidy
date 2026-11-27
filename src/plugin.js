const { Plugin, Dialog, showMessage, confirm, getFrontend } = require("siyuan");
const core = require("./core.js");
const { verifyLicense } = require("./license.js");
const PLUGIN_ID = "siyuan-tag-tidy";
// The paid tier stays hidden until the checkout rail accepts this plugin id. Flip to true to show it.
const PRO_ENABLED = true;
const CHECKOUT = "https://sd-start.judestrahm.workers.dev/gx/sy/checkout?plugin=" + PLUGIN_ID;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

async function api(path, body) {
	const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) });
	const j = await r.json();
	if (j.code !== 0) throw new Error(j.msg || "SiYuan API error " + j.code);
	return j.data;
}
function download(name, text, mime) {
	const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: mime || "text/csv;charset=utf-8" })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

module.exports = class TagTidy extends Plugin {
	async onload() {
		const d = (await this.loadData("settings.json")) || {};
		this.cfg = Object.assign({ license: "" }, d);
		this.licensed = PRO_ENABLED && !!verifyLicense(this.cfg.license, PLUGIN_ID);
		this.addTopBar({ icon: "iconTags", title: this.i18n.title, position: "right", callback: () => this.openDialog() });
		this.addCommand({ langKey: "open", hotkey: "", callback: () => this.openDialog() });
	}

	async scan() {
		const out = [];
		for (let off = 0; off < 500000; off += 5000) {
			const rows = (await api("/api/query/sql", { stmt: `SELECT content AS label, COUNT(*) AS count FROM spans WHERE type = 'textmark tag' GROUP BY content ORDER BY content LIMIT 5000 OFFSET ${off}` })) || [];
			out.push(...rows.map((r) => ({ label: String(r.label || "").trim(), count: Number(r.count) || 0 })).filter((r) => r.label));
			if (rows.length < 5000) break;
		}
		const groups = core.duplicateGroups(out);
		return { rows: out, groups, single: core.singletons(out) };
	}

	async merge(plan) { for (const m of plan) await api("/api/tag/renameTag", { oldLabel: m.from, newLabel: m.to }); }

	async openDialog() {
		const t = this.i18n;
		const d = new Dialog({ title: t.title, width: /mobile/.test(getFrontend()) ? "96vw" : "680px", content: `<div class="b3-dialog__content" id="tt-body" style="max-height:72vh;overflow:auto">${esc(t.scanning)}</div>` });
		const body = d.element.querySelector("#tt-body");
		try {
			const rep = await this.scan(); const s = core.summary(rep.rows, rep.groups);
			let h = `<div style="opacity:.8;margin-bottom:8px">${esc(t.summary.replace("{t}", s.tags).replace("{u}", s.uses).replace("{g}", s.duplicateGroups))}</div>`;
			h += `<h4>${esc(t.dups)} (${rep.groups.length})</h4><div style="opacity:.7;font-size:12px">${esc(t.dupsHelp)}</div>`;
			h += rep.groups.length ? rep.groups.map((g, i) => `<div class="b3-list-item" style="display:block;padding:6px 4px"><div>${g.variants.map((v) => `<code>#${esc(v.label)}#</code> <span style="opacity:.6">${v.count}</span>`).join(" &nbsp; ")}</div>` +
				`<div style="margin-top:4px"><span style="opacity:.7">${esc(t.mergeInto)}</span> <b>#${esc(g.canonical)}#</b> <button class="b3-button b3-button--small b3-button--outline" data-merge="${i}">${esc(t.merge)}</button></div></div>`).join("") : `<div style="opacity:.7">${esc(t.none)}</div>`;
			h += `<h4 style="margin-top:12px">${esc(t.singles)} (${rep.single.length})</h4><div style="opacity:.7;font-size:12px">${esc(t.singlesHelp)}</div><div style="word-break:break-all">${rep.single.slice(0, 300).map((l) => `<code>#${esc(l)}#</code>`).join(" ") || esc(t.none)}</div>`;
			h += `<h4 style="margin-top:12px">${esc(t.top)}</h4><div>${s.top.map((r) => `<code>#${esc(r.label)}#</code> <span style="opacity:.6">${r.count}</span>`).join(" &nbsp; ")}</div>`;
			h += `<div style="margin-top:12px"><button class="b3-button b3-button--outline" id="tt-copy">${esc(t.copy)}</button> <button class="b3-button b3-button--outline" id="tt-rescan">${esc(t.rescan)}</button></div>`;
			if (PRO_ENABLED) h += this.proHtml(t, rep);
			body.innerHTML = h;
			body.addEventListener("click", async (e) => {
				const b = e.target.closest && e.target.closest("[data-merge]"); if (!b) return;
				const g = rep.groups[Number(b.dataset.merge)]; if (!g) return;
				b.disabled = true;
				try { await this.merge(core.mergePlan(g)); showMessage(t.merged.replace("{c}", g.canonical)); d.destroy(); setTimeout(() => this.openDialog(), 1500); } catch (err) { b.disabled = false; showMessage(String(err.message || err), 6000, "error"); }
			});
			body.querySelector("#tt-copy").addEventListener("click", async () => {
				const md = core.toMarkdown(rep.rows, rep.groups, rep.single, { title: t.reportTitle, summary: t.summary, dups: t.dups, singles: t.singles, none: t.none });
				try { await navigator.clipboard.writeText(md); showMessage(t.copied); } catch (err) { showMessage(t.copyFail, 4000, "error"); }
			});
			body.querySelector("#tt-rescan").addEventListener("click", () => { d.destroy(); this.openDialog(); });
			if (PRO_ENABLED) this.proBind(d, body, t, rep);
		} catch (e) { body.textContent = String(e.message || e); }
	}

	proHtml(t, rep) {
		let h = `<hr><div><b>${esc(t.pro)}</b></div>`;
		if (this.licensed) h += `<div style="margin:6px 0"><button class="b3-button b3-button--outline" id="tt-all">${esc(t.mergeAll)}</button> <button class="b3-button b3-button--outline" id="tt-csv">${esc(t.csv)}</button></div><b>${esc(t.proActive)}</b>`;
		else h += `<div style="font-size:12px;opacity:.8;margin:4px 0">${esc(t.proList)} \u{1F512}</div>${esc(t.proOff)} <a href="${CHECKOUT}" target="_blank">${esc(t.buy)}</a>` +
			`<div style="display:flex;gap:6px;margin-top:6px"><input id="tt-lic" class="b3-text-field fn__flex-1" placeholder="${esc(t.licensePh)}" value="${esc(this.cfg.license || "")}"><button class="b3-button b3-button--text" id="tt-act">${esc(t.activate)}</button></div>`;
		return h;
	}
	proBind(d, body, t, rep) {
		const act = body.querySelector("#tt-act");
		if (act) act.addEventListener("click", async () => {
			const k = body.querySelector("#tt-lic").value.trim();
			if (!verifyLicense(k, PLUGIN_ID)) { showMessage(t.badKey, 6000, "error"); return; }
			this.cfg.license = k; this.licensed = true; await this.saveData("settings.json", this.cfg); showMessage(t.proActive); d.destroy(); this.openDialog();
		});
		if (!this.licensed) return;
		body.querySelector("#tt-csv").addEventListener("click", () => download("tags.csv", core.tagsCsv(rep.rows, rep.groups)));
		body.querySelector("#tt-all").addEventListener("click", () => {
			const plan = rep.groups.flatMap(core.mergePlan); if (!plan.length) { showMessage(t.none); return; }
			confirm(t.title, t.mergeAllConfirm.replace("{n}", plan.length), async () => {
				try { await this.merge(plan); showMessage(t.merged.replace("{c}", plan.length)); d.destroy(); setTimeout(() => this.openDialog(), 1500); } catch (err) { showMessage(String(err.message || err), 6000, "error"); }
			});
		});
	}
};
