#!/usr/bin/env bun

import { Database } from "bun:sqlite";
import * as path from "node:path";

import * as appRoot from "app-root-path";

const dbFile = Bun.file(path.join(appRoot.path, "tab.db"));
const schemaFile = Bun.file(path.join(appRoot.path, "schema.sql"));

if (await dbFile.exists()) {
  console.error(`Database file (${dbFile.name}) exists. Exiting.`);
  process.exit(1);
}

if (!(await schemaFile.exists())) {
  console.error(`Schema file (${schemaFile.name}) could not be found. Exiting.`);
  process.exit(1);
}

const db = new Database(dbFile.name!, { create: true });
const schema = await schemaFile.text();

const statements = schema.split(/(?<!['"])((?:'[^']*'|[^';])*)(?:--.*)?;/g);

for (const stmt of statements) {
  if (!stmt.trim()) continue;
  db.run(stmt);
}

db.close();

console.log("Created new database file:", dbFile.name);
