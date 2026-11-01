import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, tooManyAttempts } from "../src/lib/auth";

test("passwords are salted and verify only with the right password", async () => {
  const a = await hashPassword("chai-thandi-1");
  const b = await hashPassword("chai-thandi-1");
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("chai-thandi-1", a), true);
  assert.equal(await verifyPassword("chai-thandi-2", a), false);
  assert.equal(await verifyPassword("anything", "not-a-hash"), false);
});

test("login attempts are capped per key", () => {
  const key = `t-${Math.random()}`;
  for (let i = 0; i < 3; i++) assert.equal(tooManyAttempts(key, 3), false);
  assert.equal(tooManyAttempts(key, 3), true);
});
