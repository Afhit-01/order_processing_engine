import bcrypt from "bcrypt";
import pool from "./client.js";
import dotenv from "dotenv";

dotenv.config();

const seedStaff = async () => {
  try {
    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    const saltRounds = 12;

    if (!adminPassword) {
      throw new Error("SEED_ADMIN_PASSWORD is not set");
    }

    const hashedPasswd = await bcrypt.hash(adminPassword, saltRounds);

    const queryStatement = `
    INSERT INTO staff (email, password_hash, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (email) DO NOTHING
    RETURNING id, email, role`;
    const result = await pool.query(queryStatement, [
      adminEmail,
      hashedPasswd,
      "admin",
    ]);

    if (result.rowCount === 0) {
      console.log("Admin already exits!");
    } else {
      console.log("Admin account seeded successfully!", result.rows[0]);
    }
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed staff account:", error);
    process.exit(1);
  }
};

seedStaff();
