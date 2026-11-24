import { prisma, redis, logger } from '../packages/core/dist';

async function verifyCloudInfra() {
  console.log('Testing Neon PostgreSQL connection...');
  const tables: any[] = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;
  console.log('✅ Connected to Neon! Tables in public schema:');
  tables.forEach((t) => console.log(`   - ${t.table_name}`));

  console.log('\nTesting Upstash Redis connection...');
  const pong = await redis.ping();
  console.log(`✅ Connected to Upstash! Ping response: ${pong}`);

  // Test rate limit key write and expire
  const testKey = 'test:verify:' + Date.now();
  await redis.set(testKey, 'ok', 'EX', 60);
  const val = await redis.get(testKey);
  console.log(`✅ Redis write & read test: ${testKey} = ${val}`);
  await redis.del(testKey);

  console.log('\n🎉 Both Neon Postgres and Upstash Redis are 100% operational!');
  await prisma.$disconnect();
  await redis.quit();
}

verifyCloudInfra().catch((err) => {
  console.error('Cloud verification failed:', err);
  process.exit(1);
});
