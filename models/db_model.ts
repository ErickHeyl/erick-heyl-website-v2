import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL + "?sslmode=require",
});

export default pool;
