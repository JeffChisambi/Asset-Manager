import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    await pool.query('TRUNCATE TABLE merchants CASCADE;');
    console.log('Successfully truncated merchants table.');
  } catch (error) {
    console.error('Failed to truncate:', error);
  } finally {
    await pool.end();
  }
}

main();
