const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

const supabaseUrl = 'https://uuizijhznsbuugxyjcwo.supabase.co';

// Read credentials from environment variables
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.DATABASE_URL;

async function deleteWithServiceRole(key) {
  console.log("Connecting to Supabase using Service Role Key...");
  const supabase = createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log("Fetching list of all auth users...");
  const { data, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  const users = data.users || [];
  console.log(`Found ${users.length} user(s). Deleting...`);
  for (const user of users) {
    console.log(`Deleting user: ${user.email} (${user.id})`);
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error(`Failed to delete user ${user.id}:`, deleteError.message);
    } else {
      console.log(`Successfully deleted user ${user.id}`);
    }
  }
  console.log("Done deleting all auth users via Admin API.");
}

async function deleteWithPostgres(url) {
  console.log("Connecting to PostgreSQL database...");
  const client = new Client({
    connectionString: url,
    ssl: {
      rejectUnauthorized: false
    }
  });

  await client.connect();
  console.log("Connected. Truncating auth.users table...");
  
  // Truncating auth.users with CASCADE will delete all users and cascade to any dependent tables like profiles
  await client.query('TRUNCATE auth.users CASCADE;');
  console.log("Truncate query completed successfully. All accounts have been deleted.");
  await client.end();
}

async function main() {
  if (serviceRoleKey) {
    await deleteWithServiceRole(serviceRoleKey);
  } else if (dbUrl) {
    await deleteWithPostgres(dbUrl);
  } else {
    console.error(`
Error: No credentials provided!

To delete all the accounts in the database, please provide one of the following environment variables:
1. SUPABASE_SERVICE_ROLE_KEY: The Secret service_role key from your Supabase Dashboard -> Project Settings -> API.
2. DATABASE_URL: The direct Postgres connection string (starts with postgresql://...) from your Supabase Dashboard -> Project Settings -> Database.

Usage examples:
  Windows (PowerShell):
    $env:SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"; node delete-accounts.js
  or:
    $env:DATABASE_URL="postgresql://postgres:..."; node delete-accounts.js

  Linux/macOS:
    SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here" node delete-accounts.js
  or:
    DATABASE_URL="postgresql://postgres:..." node delete-accounts.js
`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Operation failed:", err.message);
  process.exit(1);
});
