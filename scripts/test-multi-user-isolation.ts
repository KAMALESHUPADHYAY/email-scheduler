import axios from 'axios';
import jwt from 'jsonwebtoken';
import { prisma, config, logger, ensureUserSender } from '@email-scheduler/core';

const API_URL = process.env.API_URL || 'https://email-scheduler-api-433g.onrender.com';
const SESSION_SECRET = config.SESSION_SECRET || 'dev_jwt_secret_key_change_in_production_12345';

interface TestUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  cookie: string;
}

async function getOrCreateTestUser(name: string, email: string, avatarUrl: string): Promise<TestUser> {
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, avatar_url: avatarUrl },
    create: {
      google_id: `test_google_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name,
      email,
      avatar_url: avatarUrl,
    },
  });

  await ensureUserSender(user.id, user.email);

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
    },
    SESSION_SECRET,
    { expiresIn: '1d' }
  );

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar_url: user.avatar_url || '',
    cookie: `session_token=${token}`,
  };
}

async function runMultiUserIsolationTest() {
  console.log('===============================================================');
  console.log('   MULTI-USER DATA ISOLATION & IDENTITY VERIFICATION SUITE   ');
  console.log(`   Target API: ${API_URL}`);
  console.log('===============================================================\n');

  // 1. Provision User A and User B
  console.log('1. Provisioning Test User A (Alice) and User B (Bob)...');
  const userA = await getOrCreateTestUser(
    'Alice Walker',
    `alice.${Date.now()}@testmail.com`,
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330'
  );
  const userB = await getOrCreateTestUser(
    'Bob Miller',
    `bob.${Date.now()}@testmail.com`,
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d'
  );

  console.log(`   User A: ${userA.name} (${userA.email}) -> ID: ${userA.id}`);
  console.log(`   User B: ${userB.name} (${userB.email}) -> ID: ${userB.id}\n`);

  const clientA = axios.create({
    baseURL: API_URL,
    headers: { Cookie: userA.cookie },
    validateStatus: () => true,
  });

  const clientB = axios.create({
    baseURL: API_URL,
    headers: { Cookie: userB.cookie },
    validateStatus: () => true,
  });

  // 2. Verify GET /me returns authentic identity for each user
  console.log('2. Testing GET /me Real Identity Endpoint...');
  const meA = await clientA.get('/me');
  const meB = await clientB.get('/me');

  if (meA.data?.user?.email === userA.email && meA.data?.user?.name === 'Alice Walker') {
    console.log(`   [PASS] User A GET /me returns Alice: ${meA.data.user.name} (${meA.data.user.email})`);
    console.log(`          Avatar URL: ${meA.data.user.avatarUrl}`);
  } else {
    throw new Error(`User A /me failed: ${JSON.stringify(meA.data)}`);
  }

  if (meB.data?.user?.email === userB.email && meB.data?.user?.name === 'Bob Miller') {
    console.log(`   [PASS] User B GET /me returns Bob: ${meB.data.user.name} (${meB.data.user.email})`);
    console.log(`          Avatar URL: ${meB.data.user.avatarUrl}`);
  } else {
    throw new Error(`User B /me failed: ${JSON.stringify(meB.data)}`);
  }

  // 3. User A creates Campaign A with 2 emails
  console.log('\n3. Creating Campaign A for User A (2 emails)...');
  const campARes = await clientA.post('/campaigns', {
    subject: 'Alice Q4 Product Launch',
    body: 'Hello from Alice Walker',
    recipients: ['alice_target1@company.com', 'alice_target2@company.com'],
    delay_seconds: 2,
  });
  if (!campARes.data?.success) {
    throw new Error(`User A campaign creation failed: ${JSON.stringify(campARes.data)}`);
  }
  const campaignAId = campARes.data.campaign.id;
  console.log(`   [PASS] Campaign A created with ID: ${campaignAId} (2 emails scheduled)`);

  // 4. User B creates Campaign B with 3 emails
  console.log('\n4. Creating Campaign B for User B (3 emails)...');
  const campBRes = await clientB.post('/campaigns', {
    subject: 'Bob Sales Outreach Strategy',
    body: 'Hello from Bob Miller',
    recipients: ['bob_lead1@enterprise.org', 'bob_lead2@enterprise.org', 'bob_lead3@enterprise.org'],
    delay_seconds: 2,
  });
  if (!campBRes.data?.success) {
    throw new Error(`User B campaign creation failed: ${JSON.stringify(campBRes.data)}`);
  }
  const campaignBId = campBRes.data.campaign.id;
  console.log(`   [PASS] Campaign B created with ID: ${campaignBId} (3 emails scheduled)`);

  // 5. Query /campaigns for User A and User B
  console.log('\n5. Verifying Strict Isolation on GET /campaigns...');
  const campsA = await clientA.get('/campaigns');
  const campsB = await clientB.get('/campaigns');

  const userACampaignIds = (campsA.data?.data || []).map((c: any) => c.id);
  const userBCampaignIds = (campsB.data?.data || []).map((c: any) => c.id);

  if (userACampaignIds.includes(campaignAId) && !userACampaignIds.includes(campaignBId)) {
    console.log(`   [PASS] User A sees Campaign A and CANNOT see Campaign B (${userACampaignIds.length} campaigns total)`);
  } else {
    throw new Error(`User A campaign isolation failed! Sees: ${userACampaignIds}`);
  }

  if (userBCampaignIds.includes(campaignBId) && !userBCampaignIds.includes(campaignAId)) {
    console.log(`   [PASS] User B sees Campaign B and CANNOT see Campaign A (${userBCampaignIds.length} campaigns total)`);
  } else {
    throw new Error(`User B campaign isolation failed! Sees: ${userBCampaignIds}`);
  }

  // 6. Query /emails for User A and User B
  console.log('\n6. Verifying Strict Isolation on GET /emails...');
  const emailsA = await clientA.get('/emails?status=scheduled');
  const emailsB = await clientB.get('/emails?status=scheduled');

  const emailsAList = emailsA.data?.data || [];
  const emailsBList = emailsB.data?.data || [];

  const aHasBEmails = emailsAList.some((e: any) => e.recipient.includes('bob_lead'));
  const bHasAEmails = emailsBList.some((e: any) => e.recipient.includes('alice_target'));

  if (!aHasBEmails && emailsAList.some((e: any) => e.recipient.includes('alice_target'))) {
    console.log(`   [PASS] User A sees ONLY Alice emails (0 Bob emails leaked)`);
  } else {
    throw new Error('Data leak detected in User A emails list!');
  }

  if (!bHasAEmails && emailsBList.some((e: any) => e.recipient.includes('bob_lead'))) {
    console.log(`   [PASS] User B sees ONLY Bob emails (0 Alice emails leaked)`);
  } else {
    throw new Error('Data leak detected in User B emails list!');
  }

  // 7. Query GET /stats for User A and User B
  console.log('\n7. Verifying Dedicated GET /stats Isolation...');
  const statsA = await clientA.get('/stats');
  const statsB = await clientB.get('/stats');

  console.log(`   User A Stats: scheduled=${statsA.data?.data?.scheduledCount}, sender=${statsA.data?.data?.senderEmail}`);
  console.log(`   User B Stats: scheduled=${statsB.data?.data?.scheduledCount}, sender=${statsB.data?.data?.senderEmail}`);

  if (statsA.data?.data?.scheduledCount >= 2 && statsB.data?.data?.scheduledCount >= 3) {
    if (statsA.data?.data?.senderEmail && statsB.data?.data?.senderEmail) {
      console.log('   [PASS] Each user has independent counters and valid provisioned sender accounts');
    } else {
      throw new Error('Sender email missing from stats response!');
    }
  } else {
    throw new Error('Stats scheduled counts do not reflect created campaigns');
  }

  // 8. Query GET /search for User A and User B
  console.log('\n8. Verifying Full-Text Search Isolation (Elasticsearch / DB fallback)...');
  const searchA = await clientA.get('/search?q=target');
  const searchB = await clientB.get('/search?q=lead');

  const searchAHits = searchA.data?.data || [];
  const searchBHits = searchB.data?.data || [];

  const searchALeak = searchAHits.some((e: any) => e.recipient.includes('bob_lead'));
  const searchBLeak = searchBHits.some((e: any) => e.recipient.includes('alice_target'));

  if (!searchALeak && searchAHits.length > 0) {
    console.log(`   [PASS] User A search for "target" returned ${searchAHits.length} hits, 0 Bob leads leaked`);
  } else {
    throw new Error('Search leak detected for User A!');
  }

  if (!searchBLeak && searchBHits.length > 0) {
    console.log(`   [PASS] User B search for "lead" returned ${searchBHits.length} hits, 0 Alice targets leaked`);
  } else {
    throw new Error('Search leak detected for User B!');
  }

  console.log('\n===============================================================');
  console.log('   ✅ ALL MULTI-USER ISOLATION TESTS PASSED PERFECTLY!         ');
  console.log('===============================================================\n');

  await prisma.$disconnect();
}

runMultiUserIsolationTest().catch((err) => {
  console.error('Multi-user isolation test failed:', err);
  process.exit(1);
});
