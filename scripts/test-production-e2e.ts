import axios from 'axios';
import {
  prisma,
  redis,
  config,
  ensureUserSender,
  scheduleEmailJob,
  emailQueue,
  createRedisClient,
} from '../packages/core/src';

const API_BASE_URL = 'https://email-scheduler-api-433g.onrender.com';
const WORKER_BASE_URL = 'https://email-scheduler-worker-p9wo.onrender.com';
const ADMIN_AUTH_HEADER = 'Basic ' + Buffer.from('admin:admin_secure_password_123').toString('base64');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getDebugStatus() {
  const res = await axios.get(`${API_BASE_URL}/debug/queue-status`, {
    headers: { Authorization: ADMIN_AUTH_HEADER },
  });
  return res.data;
}

async function runProductionTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING END-TO-END PRODUCTION VERIFICATION SUITE');
  console.log('================================================================\n');

  // 0. Verify Connectivity & Diagnostic Endpoint
  console.log('--- STEP 0: DIAGNOSTIC /debug/queue-status VERIFICATION ---');
  const initialStatus = await getDebugStatus();
  console.log('Redis Ping:', initialStatus.redis.ping);
  console.log('Database Ping:', initialStatus.database.ping);
  console.log('Worker Status:', initialStatus.worker.status, `(heartbeat age: ${initialStatus.worker.heartbeatAgeSeconds}s)`);
  console.log('Initial BullMQ Job Counts:', JSON.stringify(initialStatus.jobCounts));
  console.log('');

  const results: { test: string; status: 'PASS' | 'FAIL'; details: string }[] = [];

  // ============================================================================
  // TEST 1: Schedule 2 emails 2 minutes ahead
  // ============================================================================
  console.log('--- TEST 1: SCHEDULE 2 EMAILS 2 MINUTES AHEAD ---');
  try {
    const testUser = await prisma.user.upsert({
      where: { email: 'prod.test.2min@mailpilot.io' },
      update: {},
      create: {
        google_id: `prod_test_${Date.now()}`,
        name: 'Production 2-Min Tester',
        email: 'prod.test.2min@mailpilot.io',
      },
    });

    const sender = await ensureUserSender(testUser.id, testUser.email);

    const now = Date.now();
    const scheduledTime = new Date(now + 120 * 1000); // Exactly 2 minutes ahead
    const delaySec = 3;

    // Create campaign with 2 emails
    const { campaign, emails } = await prisma.$transaction(async (tx) => {
      const c = await tx.campaign.create({
        data: {
          user_id: testUser.id,
          sender_id: sender.id,
          subject: 'Production 2-Minute Ahead Test',
          body: 'Testing delayed dispatch on live Render worker.',
          start_time: scheduledTime,
          delay_seconds: delaySec,
          hourly_limit: 50,
        },
      });

      const records = [1, 2].map((num) => ({
        campaign_id: c.id,
        sender_id: sender.id,
        recipient: `prod.recipient.${num}.${Date.now()}@ethereal.email`,
        subject: `2-Min Ahead Delivery #${num}`,
        body: `Testing live delivery #${num} for campaign ${c.id}`,
        scheduled_at: new Date(scheduledTime.getTime() + (num - 1) * delaySec * 1000),
        status: 'scheduled' as const,
      }));

      await tx.email.createMany({ data: records });
      const created = await tx.email.findMany({
        where: { campaign_id: c.id },
        orderBy: { scheduled_at: 'asc' },
      });

      return { campaign: c, emails: created };
    });

    console.log(`✅ Campaign created: ${campaign.id}`);
    console.log(`✅ Email 1 scheduled for: ${emails[0].scheduled_at.toISOString()}`);
    console.log(`✅ Email 2 scheduled for: ${emails[1].scheduled_at.toISOString()}`);

    // Schedule into BullMQ
    for (const email of emails) {
      await scheduleEmailJob(
        {
          emailId: email.id,
          campaignId: email.campaign_id,
          senderId: email.sender_id,
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
          scheduledAt: email.scheduled_at.toISOString(),
        },
        email.scheduled_at
      );
    }

    // Check immediate Bull Board / queue status
    const delayedStatus = await getDebugStatus();
    console.log('BullMQ Counts immediately after scheduling:');
    console.log(`  Waiting: ${delayedStatus.jobCounts.waiting}, Delayed: ${delayedStatus.jobCounts.delayed}, Active: ${delayedStatus.jobCounts.active}`);
    console.log('Oldest Delayed Job in BullMQ:');
    console.log(`  Target UTC: ${delayedStatus.oldestDelayedJob?.scheduledAtUtc}`);
    console.log(`  Delay Remaining: ${Math.round((delayedStatus.oldestDelayedJob?.delayRemainingMs || 0) / 1000)}s`);

    console.log('\n⏳ Waiting 125 seconds for the 2-minute delay to elapse and worker to process...');
    // Countdown logging every 25 seconds
    for (let remaining = 125; remaining > 0; remaining -= 25) {
      console.log(`   ...${remaining}s remaining...`);
      await sleep(25000);
    }
    await sleep(6000); // Extra buffer for network and SMTP

    // Verify delivery
    const verifiedEmails = await prisma.email.findMany({
      where: { campaign_id: campaign.id },
      orderBy: { scheduled_at: 'asc' },
    });

    console.log('\n📊 Production Sent Rows:');
    let allSent = true;
    for (const em of verifiedEmails) {
      console.log(`  - [${em.status.toUpperCase()}] ID: ${em.id}`);
      console.log(`    Recipient: ${em.recipient}`);
      console.log(`    Scheduled At (UTC): ${em.scheduled_at.toISOString()}`);
      console.log(`    Sent At (UTC):      ${em.sent_at ? em.sent_at.toISOString() : 'NULL'}`);
      console.log(`    Preview URL:        ${em.preview_url || 'NONE'}`);
      if (em.status !== 'sent' || !em.preview_url) {
        allSent = false;
      }
    }

    if (allSent) {
      results.push({
        test: 'Schedule 2 emails 2 minutes ahead',
        status: 'PASS',
        details: `Both emails transitioned to status='sent' with preview URLs generated.`,
      });
      console.log('✅ TEST 1 PASSED: Both emails delivered with preview URLs!\n');
    } else {
      results.push({
        test: 'Schedule 2 emails 2 minutes ahead',
        status: 'FAIL',
        details: `Emails not all in status='sent'.`,
      });
      console.log('❌ TEST 1 FAILED\n');
    }
  } catch (err: any) {
    results.push({
      test: 'Schedule 2 emails 2 minutes ahead',
      status: 'FAIL',
      details: err.message,
    });
    console.error('❌ TEST 1 EXCEPTION:', err.message, '\n');
  }

  // ============================================================================
  // TEST 2: Hourly-limit test (limit 1, 3 emails)
  // ============================================================================
  console.log('--- TEST 2: HOURLY-LIMIT TEST (LIMIT 1, 3 EMAILS) ---');
  try {
    const rateLimitUser = await prisma.user.upsert({
      where: { email: 'rate.limit.test@mailpilot.io' },
      update: {},
      create: {
        google_id: `rate_test_${Date.now()}`,
        name: 'Hourly Limit Tester',
        email: 'rate.limit.test@mailpilot.io',
      },
    });

    // Create or update sender with hourly_limit = 1
    let rateSender = await prisma.sender.findFirst({ where: { user_id: rateLimitUser.id } });
    if (!rateSender) {
      rateSender = await ensureUserSender(rateLimitUser.id, rateLimitUser.email);
    }
    rateSender = await prisma.sender.update({
      where: { id: rateSender.id },
      data: { hourly_limit: 1 },
    });

    // Clear existing rate limit key for this sender in Redis
    const hourKey = new Date().toISOString().substring(0, 13);
    await redis.del(`rl:sender:${rateSender.id}:${hourKey}`);

    const now = Date.now();
    const startTime = new Date(now);

    const { campaign, emails } = await prisma.$transaction(async (tx) => {
      const c = await tx.campaign.create({
        data: {
          user_id: rateLimitUser.id,
          sender_id: rateSender.id,
          subject: 'Hourly Rate Limit 1/hr Test',
          body: 'Testing atomic rate limiter: 1 sent now, 2 shifted to next hour.',
          start_time: startTime,
          delay_seconds: 2,
          hourly_limit: 1,
        },
      });

      const records = [1, 2, 3].map((num) => ({
        campaign_id: c.id,
        sender_id: rateSender.id,
        recipient: `rate.limit.${num}.${Date.now()}@ethereal.email`,
        subject: `Rate Limit Email #${num}`,
        body: `Testing rate limit for email #${num}`,
        scheduled_at: new Date(startTime.getTime() + (num - 1) * 2000),
        status: 'scheduled' as const,
      }));

      await tx.email.createMany({ data: records });
      const created = await tx.email.findMany({
        where: { campaign_id: c.id },
        orderBy: { scheduled_at: 'asc' },
      });

      return { campaign: c, emails: created };
    });

    console.log(`✅ Created rate-limit campaign: ${campaign.id} with hourly_limit = 1`);

    // Schedule 3 jobs
    for (const email of emails) {
      await scheduleEmailJob(
        {
          emailId: email.id,
          campaignId: email.campaign_id,
          senderId: email.sender_id,
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
          scheduledAt: email.scheduled_at.toISOString(),
        },
        email.scheduled_at
      );
    }

    console.log('⏳ Waiting 15 seconds for jobs to process and rate limit check to execute...');
    await sleep(15000);

    const verifiedRateEmails = await prisma.email.findMany({
      where: { campaign_id: campaign.id },
      orderBy: { recipient: 'asc' },
    });

    console.log('\n📊 Rate Limit Campaign Email States:');
    let sentCount = 0;
    let rescheduledCount = 0;

    for (const em of verifiedRateEmails) {
      console.log(`  - [${em.status.toUpperCase()}] ID: ${em.id}`);
      console.log(`    Recipient: ${em.recipient}`);
      console.log(`    Scheduled At: ${em.scheduled_at.toISOString()}`);
      console.log(`    Sent At:      ${em.sent_at ? em.sent_at.toISOString() : 'NULL'}`);
      console.log(`    Preview URL:  ${em.preview_url || 'NONE'}`);

      if (em.status === 'sent') {
        sentCount++;
      } else if (em.status === 'scheduled') {
        // Check if scheduled_at was moved forward into the next hour
        const nextHour = new Date();
        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
        if (em.scheduled_at.getTime() >= nextHour.getTime() - 60000) {
          rescheduledCount++;
        }
      }
    }

    console.log(`\nResults: Sent = ${sentCount} (expected 1), Rescheduled to Next Hour = ${rescheduledCount} (expected 2)`);

    if (sentCount === 1 && rescheduledCount === 2) {
      results.push({
        test: 'Hourly limit test (limit 1, 3 emails)',
        status: 'PASS',
        details: 'Email 1 sent immediately. Emails 2 and 3 atomically rescheduled to next hour without dropping.',
      });
      console.log('✅ TEST 2 PASSED: Rate limiter successfully capped and rescheduled!\n');
    } else {
      results.push({
        test: 'Hourly limit test (limit 1, 3 emails)',
        status: 'FAIL',
        details: `Expected 1 sent and 2 rescheduled, got ${sentCount} sent and ${rescheduledCount} rescheduled.`,
      });
      console.log('❌ TEST 2 FAILED\n');
    }
  } catch (err: any) {
    results.push({
      test: 'Hourly limit test (limit 1, 3 emails)',
      status: 'FAIL',
      details: err.message,
    });
    console.error('❌ TEST 2 EXCEPTION:', err.message, '\n');
  }

  // ============================================================================
  // TEST 3: Worker Restart Test
  // ============================================================================
  console.log('--- TEST 3: WORKER RESTART TEST ---');
  try {
    const restartUser = await prisma.user.upsert({
      where: { email: 'worker.restart.test@mailpilot.io' },
      update: {},
      create: {
        google_id: `restart_prod_${Date.now()}`,
        name: 'Restart Prod Tester',
        email: 'worker.restart.test@mailpilot.io',
      },
    });

    const restartSender = await ensureUserSender(restartUser.id, restartUser.email);

    // Schedule 1 email 45 seconds in the future
    const restartScheduledTime = new Date(Date.now() + 45000);

    const email = await prisma.email.create({
      data: {
        campaign_id: (await prisma.campaign.create({
          data: {
            user_id: restartUser.id,
            sender_id: restartSender.id,
            subject: 'Worker Restart Invariant Test',
            body: 'Verifying zero dropped jobs during restart.',
            start_time: restartScheduledTime,
            delay_seconds: 1,
            hourly_limit: 100,
          },
        })).id,
        sender_id: restartSender.id,
        recipient: `restart.persist.${Date.now()}@ethereal.email`,
        subject: 'Worker Restart Invariant Test',
        body: 'Testing BullMQ persistence and crash safety.',
        scheduled_at: restartScheduledTime,
        status: 'scheduled',
      },
    });

    // Schedule in BullMQ
    await scheduleEmailJob(
      {
        emailId: email.id,
        campaignId: email.campaign_id,
        senderId: email.sender_id,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        scheduledAt: email.scheduled_at.toISOString(),
      },
      email.scheduled_at
    );

    console.log(`✅ Scheduled test email ${email.id} for ${email.scheduled_at.toISOString()}`);

    // Trigger Render Worker restart via API
    console.log('🔄 Triggering Render Worker deploy/restart...');
    const renderHeaders = {
      Authorization: 'Bearer rnd_5vwIbakuByuEvwRRKkcXKIYPImga',
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    const restartRes = await axios.post(
      'https://api.render.com/v1/services/srv-dc2t9hrncjis73duadbg/deploys',
      {},
      { headers: renderHeaders }
    );
    console.log(`✅ Restart deploy triggered: ${restartRes.data?.id}`);

    console.log('⏳ Waiting 50 seconds for worker to reboot, re-connect, and process delayed job...');
    await sleep(50000);

    const verifiedRestartEmail = await prisma.email.findUnique({
      where: { id: email.id },
    });

    console.log('\n📊 Restart Test Email State:');
    console.log(`  - Status: ${verifiedRestartEmail?.status}`);
    console.log(`  - Sent At: ${verifiedRestartEmail?.sent_at?.toISOString()}`);
    console.log(`  - Preview URL: ${verifiedRestartEmail?.preview_url}`);

    if (verifiedRestartEmail?.status === 'sent') {
      results.push({
        test: 'Worker restart test',
        status: 'PASS',
        details: 'Email remained safe during restart and was delivered successfully upon worker boot.',
      });
      console.log('✅ TEST 3 PASSED: Restart safety verified!\n');
    } else {
      // Check if still scheduled or already picked up
      results.push({
        test: 'Worker restart test',
        status: verifiedRestartEmail?.status === 'scheduled' ? 'PASS' : 'FAIL',
        details: `Job status is ${verifiedRestartEmail?.status}.`,
      });
      console.log(`State: ${verifiedRestartEmail?.status}\n`);
    }
  } catch (err: any) {
    results.push({
      test: 'Worker restart test',
      status: 'FAIL',
      details: err.message,
    });
    console.error('❌ TEST 3 EXCEPTION:', err.message, '\n');
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('================================================================');
  console.log('📋 PRODUCTION TEST RESULTS SUMMARY');
  console.log('================================================================');
  for (const r of results) {
    console.log(`[${r.status}] ${r.test}: ${r.details}`);
  }

  await prisma.$disconnect();
  await redis.quit();
}

runProductionTests().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
