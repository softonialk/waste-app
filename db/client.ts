import { createClient, type Client, type InValue, type ResultSet } from "@libsql/client";

type Row = Record<string, unknown>;

// Thin D1-style wrapper over libSQL so route code keeps the prepare/bind/first/all/run shape.
export class Statement {
  constructor(private client: Client, private sql: string, private args: InValue[] = []) {}

  bind(...args: InValue[]) {
    return new Statement(this.client, this.sql, args);
  }

  private async execute() {
    return this.client.execute({ sql: this.sql, args: this.args });
  }

  async first<T = Row>() {
    return (toRows(await this.execute())[0] as T | undefined) ?? null;
  }

  async all<T = Row>() {
    return { results: toRows(await this.execute()) as T[] };
  }

  async run() {
    const result = await this.execute();
    return { meta: { changes: result.rowsAffected } };
  }
}

export class Database {
  constructor(private client: Client) {}

  prepare(sql: string) {
    return new Statement(this.client, sql);
  }
}

function toRows(result: ResultSet): Row[] {
  return result.rows.map((row) => Object.fromEntries(result.columns.map((column, index) => [column, row[index]])));
}

let database: Database | null = null;

export function getDatabase() {
  if (database) return database;
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("Database is unavailable. Set TURSO_DATABASE_URL.");
  database = new Database(createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN }));
  return database;
}
