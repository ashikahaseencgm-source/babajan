/**
 * Local development database.
 *
 * Runs a real PostgreSQL server (via the `embedded-postgres` npm package) so
 * contributors do not need to install Postgres or Docker. Data persists in
 * `.data/postgres`. Never use this for production — point DATABASE_URL at a
 * managed PostgreSQL instance instead.
 *
 *   npm run db:local          # start and keep running (Ctrl+C to stop)
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const port = Number(process.env.LOCAL_PG_PORT ?? 5433);
const databaseDir = path.resolve(".data/postgres");
const databases = ["babajan", "babajan_test"];

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir,
    user: "babajan",
    password: "babajan-local-dev",
    port,
    persistent: true,
    onLog: () => {},
  });

  const fresh = !existsSync(path.join(databaseDir, "PG_VERSION"));
  if (fresh) {
    console.log("Initialising local PostgreSQL cluster in .data/postgres …");
    await pg.initialise();
  }
  await pg.start();

  for (const name of databases) {
    try {
      await pg.createDatabase(name);
      console.log(`Created database "${name}"`);
    } catch {
      // Already exists.
    }
  }

  console.log(`Local PostgreSQL ready on port ${port} (databases: ${databases.join(", ")}).`);
  console.log("Press Ctrl+C to stop.");

  const shutdown = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  // Keep the process alive.
  setInterval(() => {}, 1 << 30);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
