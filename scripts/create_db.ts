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

function splitSQLStatements(sql: string): string[] {
  const results: string[] = [];

  const enum State {
    DEFAULT,
    IN_STRING,
    IN_SINGLE_LINE_COMMENT,
    IN_MULTI_LINE_COMMENT,
  }

  let currentStatement = "";
  let state: State;

  let i = 0;
  state = State.DEFAULT;

  while (i < sql.length) {
    const char = sql[i];
    const la = sql.slice(i, i + 2);

    switch (state) {
      case State.DEFAULT:
        if (char == "'") state = State.IN_STRING;
        else if (la == "--") state = State.IN_SINGLE_LINE_COMMENT;
        else if (la == "/*") state = State.IN_MULTI_LINE_COMMENT;
        else if (char == ";") results.push(currentStatement.trim()), (currentStatement = "");
        else if (/[\s\n]{2}/m.test(la) || (/[\s\n]/m.test(char) && /[\s\n]/m.test(currentStatement.at(-1) ?? "")))
          break; // remove back-to-back whitespace
        else if (/[\s\n]/m.test(char)) currentStatement += " ";
        else currentStatement += char;
        break;
      case State.IN_STRING:
        if (char == "'" && la != "''") state = State.DEFAULT;
        currentStatement += char;
        break;
      case State.IN_SINGLE_LINE_COMMENT:
        if (char == "\n") state = State.DEFAULT;
        break;
      case State.IN_MULTI_LINE_COMMENT:
        if (la == "*/") (state = State.DEFAULT), i++;
        break;
    }

    i++;
  }

  if (currentStatement.trim()) results.push(currentStatement.trim());

  return results;
}

const statements = splitSQLStatements(schema);

for (const stmt of statements) {
  console.log(stmt);
  db.run(stmt);
}

db.close();

console.log("Created new database file:", dbFile.name);
