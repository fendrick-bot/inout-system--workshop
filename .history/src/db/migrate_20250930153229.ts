import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { env } from '../config/env';

const runMigration = async () => {
  const sql = neon(env.DATABASE_URL);
  const db = drizzle(sql);

  console.log('⏳ Running migrations...');
  
  await migrate(db, { migrationsFolder: 'drizzle' });
  
  console.log('✅ Migrations completed!');
  process.exit(0);
};

runMigration().catch((err) => {
  console.error('❌ Migration failed!');
  console.error(err);
  process.exit(1);
});