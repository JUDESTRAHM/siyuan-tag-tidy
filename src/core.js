// Pure logic for Tag Tidy (no SiYuan/DOM).
// Segment key: case-insensitive, ignores spaces / hyphens / underscores, folds simple English plurals.
function segKey(s) {
	let k = String(s).toLowerCase().replace(/[\s\-_.]+/g, "");
	if (k.length > 3) {
		if (/[^aeiou]ies$/.test(k)) k = k.slice(0, -3) + "y";
		else if (/(ss|us|is)$/.test(k)) { /* keep: class, status, analysis */ }
		else if (/s$/.test(k)) k = k.slice(0, -1);
	}
	return k;
}
function tagKey(label) { return String(label).split("/").map(segKey).join("/"); }

function pickCanonical(variants) {
	return variants.slice().sort((a, b) => b.count - a.count || a.label.length - b.label.length || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0))[0].label;
}

// rows: [{label, count}] -> groups of 2+ distinct labels that normalise to the same key.
function duplicateGroups(rows) {
	const by = new Map();
	for (const r of rows) {
		if (!r.label) continue;
		const k = tagKey(r.label); if (!k) continue;
		if (!by.has(k)) by.set(k, []);
		by.get(k).push({ label: r.label, count: r.count });
	}
	const out = [];
	for (const [key, variants] of by) {
		if (variants.length < 2) continue;
		const canonical = pickCanonical(variants);
		out.push({ key, canonical, variants: variants.sort((a, b) => b.count - a.count || (a.label < b.label ? -1 : 1)), total: variants.reduce((s, v) => s + v.count, 0) });
	}
	return out.sort((a, b) => b.total - a.total || (a.key < b.key ? -1 : 1));
}

// Variants to rename into the canonical tag. A tag is never renamed into/out of its own parent path conflict.
function mergePlan(group) {
	return group.variants.filter((v) => v.label !== group.canonical).map((v) => ({ from: v.label, to: group.canonical, count: v.count }));
}

// Tags used exactly once that are not the parent of another tag.
function singletons(rows) {
	const labels = rows.map((r) => r.label);
	return rows.filter((r) => r.count === 1 && !labels.some((l) => l.startsWith(r.label + "/"))).map((r) => r.label).sort();
}

function summary(rows, groups) {
	const uses = rows.reduce((s, r) => s + r.count, 0);
	const top = rows.slice().sort((a, b) => b.count - a.count || (a.label < b.label ? -1 : 1)).slice(0, 10);
	return { tags: rows.length, uses, duplicateGroups: groups.length, mergeable: groups.reduce((s, g) => s + g.variants.length - 1, 0), top };
}

function toMarkdown(rows, groups, single, labels) {
	const s = summary(rows, groups);
	let md = `# ${labels.title}\n\n${labels.summary.replace("{t}", s.tags).replace("{u}", s.uses).replace("{g}", s.duplicateGroups)}\n\n## ${labels.dups}\n\n`;
	md += groups.length ? groups.map((g) => `- ${g.variants.map((v) => `#${v.label}# (${v.count})`).join(", ")} → #${g.canonical}#`).join("\n") : labels.none;
	md += `\n\n## ${labels.singles}\n\n` + (single.length ? single.map((l) => `- #${l}#`).join("\n") : labels.none) + "\n";
	return md;
}

function csvCell(v) {
	let s = v == null ? "" : String(v);
	if (typeof v !== "number" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
	return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function tagsCsv(rows, groups) {
	const canon = new Map(); for (const g of groups) for (const v of g.variants) canon.set(v.label, g.canonical);
	const lines = [["Tag", "Uses", "Suggested merge into"], ...rows.slice().sort((a, b) => b.count - a.count || (a.label < b.label ? -1 : 1)).map((r) => [r.label, r.count, canon.get(r.label) && canon.get(r.label) !== r.label ? canon.get(r.label) : ""])];
	return "﻿" + lines.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
module.exports = { segKey, tagKey, pickCanonical, duplicateGroups, mergePlan, singletons, summary, toMarkdown, csvCell, tagsCsv };
