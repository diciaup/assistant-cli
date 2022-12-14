#!/usr/bin/env node


const { spawnSync } = require("child_process");
const { resolve } = require("path");

const cmd = "node --no-warnings " + __dirname + "/../dist/app.js " + process.argv.join(' ');
spawnSync(cmd, { stdio: "inherit", shell: true, env: process.env });

