import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFtpDirectory } from "../scripts/ftp-path.mjs";
test("FTP path trims surrounding copy/paste whitespace without changing the folder", () => {
  assert.equal(
    parseFtpDirectory("  /appointment.brunelcreative.com/\r\n"),
    "/appointment.brunelcreative.com/",
  );
  assert.equal(parseFtpDirectory("/"), "/");
  assert.equal(
    parseFtpDirectory("/home/sc4guji9720/appointment.brunelcreative.com"),
    "/home/sc4guji9720/appointment.brunelcreative.com",
  );
});
test("FTP path explains assignment, quotes and missing leading slash", () => {
  assert.throws(() => parseFtpDirectory("FTP_SERVER_DIR = /"), /affectation/);
  assert.throws(() => parseFtpDirectory('"/"'), /guillemets/);
  assert.throws(
    () => parseFtpDirectory("appointment.brunelcreative.com"),
    /commencer par/,
  );
});
test("FTP path rejects empty values, traversal and embedded control characters", () => {
  for (const value of [
    undefined,
    "",
    "  ",
    "/a/../b",
    "/a\nb",
    "/a\rb",
    "/a\x00b",
    "/a\\b",
  ])
    assert.throws(() => parseFtpDirectory(value));
});
