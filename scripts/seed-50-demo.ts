/**
 * Seed / Demo Script: Creates a campaign with 50 sample recipients
 * Demonstrates:
 * 1. Immediate staggered scheduling
 * 2. Rate-limit detection & automatic rescheduling to the next hour
 * 3. Order preservation & DB scheduled_at updates
 */

import {
  prisma,
  ensureUserSender,
  scheduleEmailJob,
  indexEmailDocument,
  config,
  logger,
} from '../packages/core/dist';

async function seedDemoCampaign() {
  console.log('🚀 Running 50-Recipient Demo Seed Script...');

  // 1. Find or create demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo.recruiter@reachinbox.test' },
    update: {},
    create: {
      google_id: 'google_demo_recruiter_123',
      name: 'Placement Interviewer',
      email: 'demo.recruiter@reachinbox.test',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    },
  });

  console.log(`👤 User: ${user.name} (${user.email})`);

  // 2. Ensure sender exists with an hourly limit of 10 to demonstrate rate limiting
  let sender = await prisma.sender.findFirst({ where: { user_id: user.id } });
  if (!sender) {
    sender = await ensureUserSender(user.id, user.email);
  }

  // Set sender limit to 10 for demonstration of rate-limiting
  sender = await prisma.sender.update({
    where: { id: sender.id },
    data: { hourly_limit: 10 },
  });

  console.log(`✉️ Sender: ${sender.email} with hourly_limit = ${sender.hourly_limit}`);

  // 3. Generate 50 unique recipients
  const recipients: string[] = [];
  for (let i = 1; i <= 50; i++) {
    recipients.push(`candidate.test.${i}@placement.example.com`);
  }

  const startTime = new Date();
  const delaySeconds = 2; // 2 seconds between emails

  console.log(`📦 Generating 50 emails inside one database transaction...`);

  const { campaign, emails } = await prisma.$transaction(async (tx) => {
    const newCampaign = await tx.campaign.create({
      data: {
        user_id: user.id,
        sender_id: sender.id,
        subject: 'Placement Interview Demo: Staggered Delivery & Rate Limit Rescheduler',
        body: 'Hello!\nThis email is part of the 50-email demonstration of the Email Scheduler engine.\nIt tests BullMQ delayed queues, Redis atomic rate limits, and restart safety.',
        start_time: startTime,
        delay_seconds: delaySeconds,
        hourly_limit: 10,
      },
    });

    const emailRecords = recipients.map((recipient, idx) => ({
      campaign_id: newCampaign.id,
      sender_id: sender.id,
      recipient,
      subject: `Placement Demo #${idx + 1}: High-Volume Email Queue`,
      body: `Hello ${recipient},\n\nYour placement review test email #${idx + 1} has been processed via BullMQ.`,
      scheduled_at: new Date(startTime.getTime() + idx * delaySeconds * 1000),
      status: 'scheduled' as const,
    }));

    await tx.email.createMany({ data: emailRecords });

    const createdEmails = await tx.email.findMany({
      where: { campaign_id: newCampaign.id },
      orderBy: { scheduled_at: 'asc' },
    });

    return { campaign: newCampaign, emails: createdEmails };
  });

  console.log(`✅ Campaign created: ${campaign.id}`);
  console.log(`⏱️ Adding 50 BullMQ DELAYED jobs (jobId = email.id)...`);

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

    indexEmailDocument(email).catch(() => {});
  }

  console.log('\n🎉 Demonstration seed complete!');
  console.log(`📊 Summary:`);
  console.log(`   - 50 emails scheduled in BullMQ`);
  console.log(`   - First 10 emails will be delivered in the current hour window`);
  console.log(`   - Emails 11-50 will exceed the hourly limit of 10 and automatically move to the start of the next hour`);
  console.log(`   - DB 'scheduled_at' timestamp will be updated dynamically in PostgreSQL and ES`);
  console.log(`   - If Slack OAuth is connected, a Slack alert will be sent ONCE this hour.\n`);
}

seedDemoCampaign()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
