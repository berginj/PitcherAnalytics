import { describe, it, expect } from 'vitest';
import { zoneIndexFromRowCol, getZoneRowCol, isInZone } from './zoneUtils';

describe('zoneUtils', () => {
  describe('zoneIndexFromRowCol', () => {
    it('should return correct zone index for valid 1-based coordinates', () => {
      expect(zoneIndexFromRowCol(1, 1)).toBe(1);
      expect(zoneIndexFromRowCol(1, 2)).toBe(2);
      expect(zoneIndexFromRowCol(1, 3)).toBe(3);
      expect(zoneIndexFromRowCol(2, 1)).toBe(4);
      expect(zoneIndexFromRowCol(2, 2)).toBe(5);
      expect(zoneIndexFromRowCol(2, 3)).toBe(6);
      expect(zoneIndexFromRowCol(3, 1)).toBe(7);
      expect(zoneIndexFromRowCol(3, 2)).toBe(8);
      expect(zoneIndexFromRowCol(3, 3)).toBe(9);
    });

    it('should return null for invalid coordinates', () => {
      expect(zoneIndexFromRowCol(0, 0)).toBe(null);
      expect(zoneIndexFromRowCol(4, 1)).toBe(null);
      expect(zoneIndexFromRowCol(1, 4)).toBe(null);
      expect(zoneIndexFromRowCol(-1, 1)).toBe(null);
    });

    it('should return null for non-numeric values', () => {
      expect(zoneIndexFromRowCol('1', 1)).toBe(null);
      expect(zoneIndexFromRowCol(1, '1')).toBe(null);
      expect(zoneIndexFromRowCol(null, 1)).toBe(null);
      expect(zoneIndexFromRowCol(1, undefined)).toBe(null);
    });
  });

  describe('getZoneRowCol', () => {
    it('should extract row and col from pitch object', () => {
      const pitch = { zoneRow: 2, zoneCol: 3 };
      const result = getZoneRowCol(pitch);
      expect(result).toEqual({ row: 2, col: 3 });
    });

    it('should handle snake_case field names', () => {
      const pitch = { zone_row: 1, zone_col: 2 };
      const result = getZoneRowCol(pitch);
      expect(result).toEqual({ row: 1, col: 2 });
    });

    it('should derive row/col from zone index', () => {
      const pitch1 = { zone: 1 };
      expect(getZoneRowCol(pitch1)).toEqual({ row: 1, col: 1 });

      const pitch2 = { zone: 5 };
      expect(getZoneRowCol(pitch2)).toEqual({ row: 2, col: 2 });

      const pitch3 = { zone: 9 };
      expect(getZoneRowCol(pitch3)).toEqual({ row: 3, col: 3 });
    });

    it('should prioritize explicit row/col over zone index', () => {
      const pitch = { zone: 5, zoneRow: 1, zoneCol: 1 };
      const result = getZoneRowCol(pitch);
      expect(result).toEqual({ row: 1, col: 1 });
    });

    it('should return null for missing zone data', () => {
      const pitch = {};
      const result = getZoneRowCol(pitch);
      expect(result).toEqual({ row: null, col: null });
    });

    it('should return null for invalid zone index', () => {
      const pitch = { zone: 0 };
      expect(getZoneRowCol(pitch)).toEqual({ row: null, col: null });

      const pitch2 = { zone: 10 };
      expect(getZoneRowCol(pitch2)).toEqual({ row: null, col: null });
    });
  });

  describe('isInZone', () => {
    it('should return true for pitches in the strike zone', () => {
      expect(isInZone({ zoneRow: 1, zoneCol: 1 })).toBe(true);
      expect(isInZone({ zoneRow: 2, zoneCol: 2 })).toBe(true);
      expect(isInZone({ zoneRow: 3, zoneCol: 3 })).toBe(true);
      expect(isInZone({ zone: 5 })).toBe(true);
    });

    it('should return false for pitches outside the zone', () => {
      expect(isInZone({ zoneRow: 0, zoneCol: 1 })).toBe(false);
      expect(isInZone({ zoneRow: 4, zoneCol: 2 })).toBe(false);
      expect(isInZone({ zoneRow: 1, zoneCol: 4 })).toBe(false);
      expect(isInZone({})).toBe(false);
    });

    it('should handle zone index correctly', () => {
      expect(isInZone({ zone: 1 })).toBe(true);
      expect(isInZone({ zone: 9 })).toBe(true);
      expect(isInZone({ zone: 0 })).toBe(false);
      expect(isInZone({ zone: 10 })).toBe(false);
    });
  });
});
