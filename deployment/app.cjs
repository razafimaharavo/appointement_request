// Stable Passenger entry point. Application root must be outside public_html.
const fs = require("node:fs");
const path = require("node:path");
const { release } = JSON.parse(
  fs.readFileSync(path.join(__dirname, "current.json"), "utf8"),
);
if (!/^[a-f0-9]{40}-\d+-\d+$/.test(release))
  throw new Error("Invalid release identifier");
process.env.NODE_ENV = "production";
process.env.HOSTNAME = "0.0.0.0";
process.env.INVITATION_DATA_DIR = path.join(__dirname, ".data");
require(path.join(__dirname, "releases", release, "server.js"));
