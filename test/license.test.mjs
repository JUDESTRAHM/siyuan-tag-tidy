import test from "node:test"; import assert from "node:assert/strict";
import { createRequire } from "node:module"; import { execFileSync } from "node:child_process"; import fs from "node:fs"; import os from "node:os"; import { fileURLToPath } from "node:url";
const { verifyLicense } = createRequire(import.meta.url)("../src/license.js");
test("garbage keys rejected", () => { assert.equal(verifyLicense("", "siyuan-tag-tidy"), null); assert.equal(verifyLicense("BR1.x.y", "siyuan-tag-tidy"), null); assert.equal(verifyLicense(null, "siyuan-tag-tidy"), null); });
test("real signer key accepted only for tag-tidy", { skip: !fs.existsSync(os.homedir() + "/.config/strahm/ob-license.json") }, () => {
	const sign = fileURLToPath(new URL("../../siyuan-db-reports/tools/sign.mjs", import.meta.url));
	const key = execFileSync(process.execPath, [sign, "siyuan-tag-tidy", "test@example.org", "cs_test_selfcheck00"]).toString().trim();
	assert.equal(verifyLicense(key, "siyuan-tag-tidy").p, "siyuan-tag-tidy"); assert.equal(verifyLicense(key, "siyuan-doc-stats"), null);
});
