import { describe, expect, it, vi } from 'vitest';
import { clearWifeSignInflightForTests, coalesceWifeSign } from '@/app/api/security/wifeSignInflight';

describe('wifeSignInflight', () => {
  it('merges concurrent identical sign operations', async () => {
    clearWifeSignInflightForTests();
    let calls = 0;
    const sign = vi.fn(async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 20));
      return { 'x-wife-nonce': `n-${calls}` };
    });

    const input = {
      subject: 'user-1',
      method: 'GET',
      url: 'http://localhost/api/forum/posts',
      body: '',
    };

    const [a, b] = await Promise.all([
      coalesceWifeSign(input, sign),
      coalesceWifeSign(input, sign),
    ]);

    expect(sign).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });
});
