import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pool from "./client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
  try {
    const pathName = path.join(
      __dirname,
      "migrations",
      "001_initial_scheme_up.sql"
    );

    const file = fs.readFileSync(pathName, "utf-8");

    await pool.query(file);
    console.log("Migration was successfully run!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

runMigration();