import { Database } from "bun:sqlite";
import * as path from "node:path";

import * as appRoot from "app-root-path";
import { SQL, SQLStatement } from "sql-template-strings";

export { SQL };

const DB_FILE = Bun.file(path.join(appRoot.path, "tab.db"));
if (!(await DB_FILE.exists())) {
  throw new Error(`Database file (${DB_FILE.name}) not found.`);
}

const db = new Database(DB_FILE.name);

export function exec(stmt: SQLStatement): void {
  const query = db.query(stmt.sql);
  query.run(...stmt.values);
}

export function selectOne<T>(stmt: SQLStatement): T | null {
  const query = db.query<T, any[]>(stmt.sql);
  return query.get(...stmt.values);
}

export function selectMany<T>(stmt: SQLStatement): T[] {
  const query = db.query<T, any[]>(stmt.sql);
  return query.all(...stmt.values);
}

export namespace Tables {
  export interface Users {
    id: number;
    discord_id: string;
    created_at: string; // YYYY-MM-DD hh:mm:ss
  }

  export interface Transactions {
    id: number;
    user_from: Users["id"];
    user_to: Users["id"];
    amount: number;
    reason: string;
    created_at: string;
  }
}

export function getOrCreateUserId(discordId: Tables.Users["discord_id"]): Tables.Users["id"] {
  const existing = selectOne<Tables.Users>(SQL`
    SELECT *
    FROM Users
    WHERE discord_id = ${discordId}
  `);

  if (existing) {
    return existing.id;
  }

  const newRecord = selectOne<Tables.Users>(SQL`
    INSERT INTO Users
    (discord_id)
    VALUES
    (${discordId})
    RETURNING *
  `);

  if (!newRecord)
    throw new Error("Failed to insert new Users record.")

  return newRecord.id;
}

export function createTransaction(
  values: Pick<Tables.Transactions, "user_from" | "user_to" | "amount" | "reason">
): Tables.Transactions["id"] {
  const newRow = selectOne<Tables.Transactions>(SQL`
    INSERT INTO Transactions
    (user_from, user_to, amount, reason)
    VALUES
    (${values.user_from}, ${values.user_to}, ${values.amount}, ${values.reason})
    RETURNING *
  `);

  if (!newRow) throw new Error(`Failed to insert row!`);

  return newRow.id;
}

export interface Balance {
  from: number;
  to: number;
}

export function getBalance(userFromId: Tables.Users["id"], userToId: Tables.Users["id"]): Balance {
  const from =
    selectOne<{ sum: number }>(SQL`
    SELECT SUM(amount) AS sum
    FROM Transactions
    WHERE user_from = ${userFromId}
      AND user_to = ${userToId}
  `)?.sum ?? 0;

  const to =
    selectOne<{ sum: number }>(SQL`
    SELECT SUM(amount) AS sum
    FROM Transactions
    WHERE user_from = ${userToId}
      AND user_to = ${userFromId}
  `)?.sum ?? 0;

  return { from: to - from, to: from - to };
}

export function getTotalBalance(userId: Tables.Users["id"]): number {
  const debits = selectOne<{ sum: number }>(SQL`
    SELECT SUM(amount) AS sum
    FROM Transactions
    WHERE user_from = ${userId}
  `)?.sum;

  const credits = selectOne<{ sum: number }>(SQL`
    SELECT SUM(amount) AS sum
    FROM Transactions
    WHERE user_to = ${userId}
  `)?.sum;

  return (credits ?? 0) - (debits ?? 0);
}
