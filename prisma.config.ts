import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 dropped the separate datasource.directUrl, so there is a single
// connection URL for both the app's PrismaClient (see src/prisma/prisma.service.ts)
// and the CLI (migrate/studio/seed). We use the unpooled Neon connection here
// because migrations need a direct connection, not the PgBouncer pooler.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL_UNPOOLED'),
  },
});
