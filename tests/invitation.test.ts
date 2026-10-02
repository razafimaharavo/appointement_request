import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appointmentTimestamp,
  responseSchema,
  formatDate,
} from "../lib/invitation";
import { escapeHtml, sendDateResponse } from "../lib/mail";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
const response = {
  id: randomUUID(),
  accepted: true as const,
  date: "2030-10-10",
  time: "18:30",
  food: "Pizza",
  timezoneOffset: -180,
};
test("validates a complete answer and rejects invalid dates, times, food and acceptance", () => {
  assert.equal(responseSchema.safeParse(response).success, true);
  for (const change of [
    { date: "2030-02-30" },
    { time: "25:30" },
    { food: "unknown" },
    { accepted: false },
    { id: "invalid" },
    { timezoneOffset: 9999 },
    { food: "Autre", otherFood: "   " },
  ])
    assert.equal(
      responseSchema.safeParse({ ...response, ...change }).success,
      false,
    );
  assert.equal(
    responseSchema.safeParse({
      ...response,
      food: "Autre",
      otherFood: "Un pique-nique",
    }).success,
    true,
  );
});
test("interprets the selected timezone and formats French date", () => {
  assert.equal(
    appointmentTimestamp(response),
    Date.parse("2030-10-10T15:30:00Z"),
  );
  assert.match(formatDate(response.date), /10 octobre 2030/);
});
test("escapes untrusted email content", () => {
  assert.equal(
    escapeHtml('<img src="x">&\''),
    "&lt;img src=&quot;x&quot;&gt;&amp;&#39;",
  );
});
test("persistent sent ledger suppresses an email without contacting Resend", async () => {
  const id = randomUUID();
  const v = { ...response, id };
  const { id: _, ...answers } = v;
  void _;
  const dir = ".data/responses";
  const file = `${dir}/${id}.json`;
  await mkdir(dir, { recursive: true });
  await writeFile(
    file,
    JSON.stringify({
      digest: createHash("sha256")
        .update(JSON.stringify(answers))
        .digest("hex"),
      sent: true,
      started: Date.now(),
    }),
  );
  try {
    await sendDateResponse(v);
    await assert.rejects(
      sendDateResponse({ ...v, food: "Sushi" }),
      /finalisée/,
    );
  } finally {
    await rm(file, { force: true });
  }
});
test("an in-flight lock rejects a concurrent request", async () => {
  const v = { ...response, id: randomUUID() };
  const lock = `.data/responses/${v.id}.json.lock`;
  await mkdir(lock, { recursive: true });
  try {
    await assert.rejects(sendDateResponse(v), /cours/);
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
});
