import { test } from "node:test";
import assert from "node:assert/strict";
import { isTransientFtpError, withFtpRetry } from "../scripts/ftp-retry.mjs";
const fin = () =>
  new Error("Server sent FIN packet unexpectedly, closing connection.");
test("FIN reconnects and retries only the failed file in order", async () => {
  const uploaded: string[] = [];
  let connections = 0;
  let closes = 0;
  let fail = true;
  const waits: number[] = [];
  const options = {
    reconnect: async () => {
      connections++;
    },
    close: () => {
      closes++;
    },
    wait: async (ms: number) => {
      waits.push(ms);
    },
  };
  for (const name of ["a", "b", "c"])
    await withFtpRetry(async () => {
      uploaded.push(name);
      if (name === "b" && fail) {
        fail = false;
        throw fin();
      }
    }, options);
  assert.deepEqual(uploaded, ["a", "b", "b", "c"]);
  assert.equal(connections, 4);
  assert.equal(closes, 1);
  assert.deepEqual(waits, [2000]);
});
test("permanent disconnect stops after four attempts", async () => {
  let calls = 0;
  await assert.rejects(
    withFtpRetry(
      async () => {
        calls++;
        throw fin();
      },
      { reconnect: async () => {}, close: () => {}, wait: async () => {} },
    ),
    /FIN/,
  );
  assert.equal(calls, 4);
});
test("certificate, credentials, folder and quota errors fail without retry", async () => {
  for (const code of ["ERR_TLS_CERT_ALTNAME_INVALID", 530, 550, 552]) {
    const error = Object.assign(new Error("permanent"), { code });
    assert.equal(isTransientFtpError(error), false);
    let attempts = 0;
    await assert.rejects(
      withFtpRetry(
        async () => {
          attempts++;
          throw error;
        },
        { reconnect: async () => {}, close: () => {}, wait: async () => {} },
      ),
    );
    assert.equal(attempts, 1);
  }
});
test("reconnection failure is retried; activation is replayable after a lost acknowledgment", async () => {
  let connects = 0;
  const files = new Map<string, string>();
  let first = true;
  await withFtpRetry(
    async () => {
      files.set("temp", "release-a");
      files.set("current", files.get("temp")!);
      files.delete("temp");
      if (first) {
        first = false;
        throw fin();
      }
    },
    {
      reconnect: async () => {
        connects++;
        if (connects === 1)
          throw Object.assign(new Error("reset"), { code: "ECONNRESET" });
      },
      close: () => {},
      wait: async () => {},
    },
  );
  assert.equal(files.get("current"), "release-a");
  assert.equal(files.has("temp"), false);
  assert.equal(connects, 3);
});
