import assert from "node:assert/strict";
import test from "node:test";
import { readRawBody } from "../api/webhook.ts";

test("readRawBody preserves the original request bytes", async () => {
  const expected = Buffer.from('{"unicode":"ação","amount":9900}', "utf8");

  async function* request(): AsyncGenerator<Uint8Array> {
    yield expected.subarray(0, 11);
    yield expected.subarray(11);
  }

  assert.deepEqual(await readRawBody(request()), expected);
});
