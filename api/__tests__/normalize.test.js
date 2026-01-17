const { extractSession, toTableKey } = require('../shared/normalize');

describe('Normalization', () => {
  describe('toTableKey', () => {
    it('should replace invalid characters with underscores', () => {
      expect(toTableKey('test/key')).toBe('test_key');
      expect(toTableKey('test\\key')).toBe('test_key');
      expect(toTableKey('test#key')).toBe('test_key');
      expect(toTableKey('test?key')).toBe('test_key');
    });

    it('should handle multiple invalid characters', () => {
      expect(toTableKey('test/\\#?key')).toBe('test____key');
    });

    it('should preserve valid characters', () => {
      expect(toTableKey('test-key_123')).toBe('test-key_123');
    });

    it('should convert numbers to strings', () => {
      expect(toTableKey(12345)).toBe('12345');
    });
  });

  describe('extractSession', () => {
    it('should extract session with all fields (snake_case)', () => {
      const payload = {
        session_id: 'test-session',
        session_name: 'Test Session',
        started_at: '2026-01-16T12:00:00Z',
        pitch_count: 10,
        strikes: 6,
        balls: 4,
        heatmap: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        pitches: [
          {
            pitch_id: 'pitch-1',
            speed_mph: 65.5,
            run_in: 2.3,
            rise_in: -1.5,
            zone_row: 2,
            zone_col: 2,
            is_strike: true
          }
        ]
      };

      const result = extractSession(payload);

      expect(result.sessionId).toBe('test-session');
      expect(result.sessionName).toBe('Test Session');
      expect(result.startedAt).toBe('2026-01-16T12:00:00Z');
      expect(result.pitchCount).toBe(10);
      expect(result.strikes).toBe(6);
      expect(result.balls).toBe(4);
      expect(result.heatmap).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
      expect(result.pitches).toHaveLength(1);
      expect(result.pitches[0].pitchId).toBe('pitch-1');
      expect(result.pitches[0].speed).toBe(65.5);
    });

    it('should extract session with camelCase fields', () => {
      const payload = {
        sessionId: 'test-session-2',
        sessionName: 'Test Session 2',
        pitches: []
      };

      const result = extractSession(payload);

      expect(result.sessionId).toBe('test-session-2');
      expect(result.sessionName).toBe('Test Session 2');
    });

    it('should generate session ID if missing', () => {
      const payload = { pitches: [] };
      const result = extractSession(payload);

      expect(result.sessionId).toMatch(/^session-\d+$/);
    });

    it('should derive pitch count from pitches array if not provided', () => {
      const payload = {
        session_id: 'test',
        pitches: [{}, {}, {}]
      };

      const result = extractSession(payload);
      expect(result.pitchCount).toBe(3);
    });

    it('should handle missing optional fields', () => {
      const payload = {
        session_id: 'test',
        pitches: []
      };

      const result = extractSession(payload);

      expect(result.sessionName).toBe(null);
      expect(result.startedAt).toBe(null);
      expect(result.strikes).toBe(null);
      expect(result.balls).toBe(null);
      expect(result.heatmap).toBe(null);
    });

    it('should normalize pitch data correctly', () => {
      const payload = {
        session_id: 'test',
        pitches: [
          {
            pitch_id: 'p1',
            speed_mph: 60.0,
            run_in: 1.0,
            rise_in: -2.0,
            zone_row: 1,
            zone_col: 1,
            is_strike: false
          },
          {
            // Missing zone_row/zone_col
            pitch_id: 'p2',
            speed_mph: 62.5
          }
        ]
      };

      const result = extractSession(payload);

      expect(result.pitches[0].pitchId).toBe('p1');
      expect(result.pitches[0].speed).toBe(60.0);
      expect(result.pitches[0].zone).toBe(1); // (1-1)*3 + 1
      expect(result.pitches[0].isStrike).toBe(false);

      expect(result.pitches[1].pitchId).toBe('p2');
      expect(result.pitches[1].speed).toBe(62.5);
      expect(result.pitches[1].zone).toBe(null);
    });

    it('should generate pitch IDs if missing', () => {
      const payload = {
        session_id: 'test',
        pitches: [{}, {}, {}]
      };

      const result = extractSession(payload);

      expect(result.pitches[0].pitchId).toBe('pitch-1');
      expect(result.pitches[1].pitchId).toBe('pitch-2');
      expect(result.pitches[2].pitchId).toBe('pitch-3');
    });

    it('should calculate zone from row and col (1-based)', () => {
      const payload = {
        session_id: 'test',
        pitches: [
          { zone_row: 1, zone_col: 1 }, // Zone 1
          { zone_row: 1, zone_col: 3 }, // Zone 3
          { zone_row: 3, zone_col: 1 }, // Zone 7
          { zone_row: 3, zone_col: 3 }  // Zone 9
        ]
      };

      const result = extractSession(payload);

      expect(result.pitches[0].zone).toBe(1);
      expect(result.pitches[1].zone).toBe(3);
      expect(result.pitches[2].zone).toBe(7);
      expect(result.pitches[3].zone).toBe(9);
    });

    it('should handle 0-based zone indexing', () => {
      const payload = {
        session_id: 'test',
        pitches: [
          { zone_row: 0, zone_col: 0 }, // Zone 1
          { zone_row: 2, zone_col: 2 }  // Zone 9
        ]
      };

      const result = extractSession(payload);

      expect(result.pitches[0].zone).toBe(1);
      expect(result.pitches[1].zone).toBe(9);
    });
  });
});
