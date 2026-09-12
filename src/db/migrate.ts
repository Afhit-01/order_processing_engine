import fs from "fs";
import path from "path";
import pool from "./client.js"; 

const runMigration = async () => {
  try {
    const pathName = path.join(
      __dirname,
      "migrations",
      "001_initial_schema_up.sql" 
    );

    const file = fs.readFileSync(pathName, "utf-8");

    await pool.query(file);
    console.log("Migration was successfully run!");
    process.exit(0);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

runMigration();