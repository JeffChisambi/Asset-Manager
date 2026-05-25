import pg from 'pg';
const { Client } = pg;

const urls = [
  'postgresql://postgres@localhost:5432/postgres',
  'postgresql://postgres:postgres@localhost:5432/postgres',
  'postgresql://postgres:password@localhost:5432/postgres',
  'postgresql://postgres:admin@localhost:5432/postgres',
  'postgresql://localhost:5432/postgres'
];

async function test() {
  for (const url of urls) {
    console.log(`Testing: ${url}`);
    const client = new Client({ connectionString: url });
    try {
      await client.connect();
      console.log(`SUCCESS! Connected to ${url}`);
      const res = await client.query('SELECT version()');
      console.log('Version:', res.rows[0].version);
      await client.end();
      return url;
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }
  console.log('No connection succeeded.');
  return null;
}

test();
