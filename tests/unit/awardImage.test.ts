import { describe, expect, it } from 'vitest';
import { awardImagePath } from '@/lib/awardImage';

describe('awardImagePath', () => {
  it('keeps known extensions and defaults to .jpg', () => {
    expect(awardImagePath('SilverStar.png')).toBe('/SilverStar.png');
    expect(awardImagePath('Photo.JPEG')).toBe('/Photo.JPEG');
    expect(awardImagePath('MoHArmy')).toBe('/MoHArmy.jpg');
  });
});
