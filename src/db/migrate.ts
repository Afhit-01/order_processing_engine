import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pool from "./client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
  const direction = process.argv[2];

  if (direction !== "up" && direction !== "down") {
    console.error("Please specify migration direction: 'up' or 'down'");
    console.error("Usage: ts-node migrate.ts up | ts-node migrate.ts down");
    process.exit(1);
  }

  const fileName = `001_initial_scheme_${direction}.sql`;

  try {
    const pathName = path.join(__dirname, "migrations", fileName);
    const sqlFile = fs.readFileSync(pathName, "utf-8");

    console.log(`Running migration: ${fileName}...`);
    await pool.query(sqlFile);
    console.log(`Migration ${direction} was successfully run!`);
    
    process.exit(0);
  } catch (error) {
    console.error(`Migration ${direction} failed:`, error);
    process.exit(1);
  }
};

runMigration();