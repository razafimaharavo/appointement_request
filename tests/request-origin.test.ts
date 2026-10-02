import { test } from "node:test";
import assert from "node:assert/strict";
import { isSameOrigin } from "../lib/request-origin";
test("accepts the browser host when Next normalizes its URL to 0.0.0.0", () => {
  for (const host of ["localhost:3000", "127.0.0.1:3000", "192.168.1.20:3000"])
    assert.equal(
      isSameOrigin(
        `http://${host}`,
        host,
        "http://0.0.0.0:3000/api/send-date-response",
      ),
      true,
    );
});
test("rejects foreign origins, mismatched ports, schemes and malformed origins", () => {
  for (const origin of [
    "https://untrusted.example",
    "http://localhost:4000",
    "https://localhost:3000",
    "null",
    "garbage",
    "http://localhost:3000/path",
  ])
    assert.equal(
      isSameOrigin(
        origin,
        "localhost:3000",
        "http://0.0.0.0:3000/api/send-date-response",
      ),
      false,
    );
});
test("allows direct clients without an Origin header", () =>
  assert.equal(
    isSameOrigin(null, "localhost:3000", "http://0.0.0.0:3000"),
    true,
  ));
