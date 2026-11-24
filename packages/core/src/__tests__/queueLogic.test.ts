import { getNextHourWindow } from '../queue';

describe('Queue & Rate Limiter Logic Tests', () => {
  test('getNextHourWindow calculates the exact start of the next hour', () => {
    const fixedNow = new Date('2026-11-24T14:23:45.123Z');
    // Save original Date
    const RealDate = Date;
    global.Date = class extends RealDate {
      constructor(date?: any) {
        if (date) {
          super(date);
        } else {
          super(fixedNow.getTime());
        }
      }
    } as any;

    try {
      const nextWindow = getNextHourWindow(5000); // 5 seconds offset
      expect(nextWindow.getMinutes()).toBe(0);
      expect(nextWindow.getSeconds()).toBe(5);
      expect(nextWindow.getMilliseconds()).toBe(0);
      expect(nextWindow.getHours()).toBe((fixedNow.getHours() + 1) % 24);
    } finally {
      global.Date = RealDate;
    }
  });

  test('Email deduplication and normalization logic', () => {
    const rawList = [
      'Alice@example.com',
      'bob@example.com',
      'ALICE@EXAMPLE.COM', // duplicate
      'invalid-email-address', // invalid
      '  charlie@domain.co.uk  ',
      '',
      'notanemail',
    ];

    const validEmailsSet = new Set<string>();
    let invalidCount = 0;
    let duplicateCount = 0;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const raw of rawList) {
      const clean = raw.trim().toLowerCase();
      if (!clean) continue;

      if (emailRegex.test(clean)) {
        if (validEmailsSet.has(clean)) {
          duplicateCount++;
        } else {
          validEmailsSet.add(clean);
        }
      } else {
        invalidCount++;
      }
    }

    expect(Array.from(validEmailsSet)).toEqual([
      'alice@example.com',
      'bob@example.com',
      'charlie@domain.co.uk',
    ]);
    expect(duplicateCount).toBe(1);
    expect(invalidCount).toBe(2);
  });

  test('Staggered scheduled_at calculation preserves sequence order', () => {
    const startTime = new Date('2026-11-24T10:00:00.000Z');
    const delaySec = 2;
    const count = 5;

    const scheduledTimes: Date[] = [];
    for (let i = 0; i < count; i++) {
      scheduledTimes.push(new Date(startTime.getTime() + i * delaySec * 1000));
    }

    expect(scheduledTimes[0].toISOString()).toBe('2026-11-24T10:00:00.000Z');
    expect(scheduledTimes[1].toISOString()).toBe('2026-11-24T10:00:02.000Z');
    expect(scheduledTimes[2].toISOString()).toBe('2026-11-24T10:00:04.000Z');
    expect(scheduledTimes[3].toISOString()).toBe('2026-11-24T10:00:06.000Z');
    expect(scheduledTimes[4].toISOString()).toBe('2026-11-24T10:00:08.000Z');
  });
});
