import test from "node:test"; import assert from "node:assert/strict"; import { createRequire } from "node:module";
const c = createRequire(import.meta.url)("../src/core.js");
const rows = [{ label: "Project", count: 1 }, { label: "project", count: 3 }, { label: "my-tag", count: 1 }, { label: "my_tag", count: 2 }, { label: "todo", count: 1 }, { label: "todos", count: 1 }, { label: "work/Alpha", count: 1 }, { label: "Work/alpha", count: 4 }, { label: "lonely", count: 1 }, { label: "status", count: 2 }, { label: "stat", count: 1 }, { label: "work", count: 1 }];
test("tagKey folds case, separators, plurals, per segment", () => {
	assert.equal(c.tagKey("My Tag"), c.tagKey("my-tag")); assert.equal(c.tagKey("my_tag"), "mytag");
	assert.equal(c.tagKey("todos"), "todo"); assert.equal(c.tagKey("Companies"), "company"); assert.equal(c.tagKey("work/Alphas"), "work/alpha");
	assert.notEqual(c.tagKey("status"), c.tagKey("stat")); assert.equal(c.tagKey("class"), "class"); assert.equal(c.tagKey("ies"), "ies"); assert.equal(c.tagKey("bus"), "bus");
});
test("duplicateGroups: finds groups, canonical = most used, sorted by total", () => {
	const g = c.duplicateGroups(rows);
	assert.deepEqual(g.map((x) => [x.canonical, x.total]), [["Work/alpha", 5], ["project", 4], ["my_tag", 3], ["todo", 2]]);
	assert.deepEqual(c.mergePlan(g[1]), [{ from: "Project", to: "project", count: 1 }]);
	assert.equal(g.find((x) => x.key === "status"), undefined);
});
test("canonical tie -> shorter then alphabetical", () => { assert.equal(c.pickCanonical([{ label: "ab-c", count: 1 }, { label: "abc", count: 1 }]), "abc"); assert.equal(c.pickCanonical([{ label: "B", count: 1 }, { label: "A", count: 1 }]), "A"); });
test("singletons excludes parents and multi-use tags", () => {
	const s = c.singletons(rows); assert.ok(s.includes("lonely")); assert.ok(!s.includes("work")); assert.ok(!s.includes("project")); assert.ok(s.includes("todos"));
});
test("summary + markdown + csv (BOM, injection guard, merge column)", () => {
	const g = c.duplicateGroups(rows); const s = c.summary(rows, g);
	assert.equal(s.tags, 12); assert.equal(s.uses, 19); assert.equal(s.duplicateGroups, 4); assert.equal(s.mergeable, 4); assert.equal(s.top[0].label, "Work/alpha");
	const md = c.toMarkdown(rows, g, c.singletons(rows), { title: "T", summary: "{t} tags {u} uses {g} groups", dups: "D", singles: "S", none: "none" });
	assert.match(md, /^# T\n\n12 tags 19 uses 4 groups/); assert.match(md, /#Project# \(1\)/); assert.match(md, /→ #project#/);
	const csv = c.tagsCsv([{ label: "=cmd", count: 1 }, { label: "a,b", count: 2 }, { label: "Project", count: 1 }, { label: "project", count: 3 }], c.duplicateGroups([{ label: "Project", count: 1 }, { label: "project", count: 3 }]));
	assert.ok(csv.startsWith("﻿Tag,Uses,Suggested merge into\r\n")); assert.ok(csv.includes("'=cmd,1,")); assert.ok(csv.includes('"a,b",2')); assert.ok(csv.includes("Project,1,project")); assert.ok(csv.includes("project,3,\r\n"));
});
test("empty input is safe", () => { assert.deepEqual(c.duplicateGroups([]), []); assert.deepEqual(c.singletons([]), []); assert.equal(c.summary([], []).uses, 0); });
