import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

config();

const drizzleConfig: Config = {
  schema: ['./src/db/schema.ts'],
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
};

export default drizzleConfig;