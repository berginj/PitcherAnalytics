const { validateSessionSummary } = require('../shared/schema');

describe('Schema Validation', () => {
  it('should validate a complete valid session summary', () => {
    const payload = {
      session_id: 'test-session',
      session_name: 'Test Session',
      pitch_count: 2,
      strikes: 1,
      balls: 1,
      pitches: [
        {
          pitch_id: 'p1',
          speed_mph: 65.5,
          run_in: 2.3,
          rise_in: -1.5,
          zone_row: 2,
          zone_col: 2,
          is_strike: true
        },
        {
          pitch_id: 'p2',
          speed_mph: 63.0,
          is_strike: false
        }
      ]
    };

    const result = validateSessionSummary(payload);
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should validate minimal valid payload', () => {
    const payload = {
      session_id: 'minimal-session',
      pitches: []
    };

    const result = validateSessionSummary(payload);
    expect(result.ok).toBe(true);
  });

  it('should reject payload without session_id', () => {
    const payload = {
      pitches: []
    };

    const result = validateSessionSummary(payload);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('validation failed');
  });

  it('should reject payload without pitches array', () => {
    const payload = {
      session_id: 'test'
    };

    const result = validateSessionSummary(payload);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('validation failed');
  });

  it('should provide detailed error information', () => {
    const payload = {
      session_id: 123, // Should be string
      pitches: 'not-an-array'
    };

    const result = validateSessionSummary(payload);
    expect(result.ok).toBe(false);
    expect(result.details).toBeDefined();
    expect(Array.isArray(result.details)).toBe(true);
  });

  it('should validate session with heatmap', () => {
    const payload = {
      session_id: 'heatmap-session',
      heatmap: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ],
      pitches: []
    };

    const result = validateSessionSummary(payload);
    expect(result.ok).toBe(true);
  });

  it('should validate session with all optional fields', () => {
    const payload = {
      session_id: 'complete-session',
      session_name: 'Complete Test',
      started_at: '2026-01-16T12:00:00Z',
      pitch_count: 0,
      strikes: 0,
      balls: 0,
      heatmap: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
      pitches: []
    };

    const result = validateSessionSummary(payload);
    expect(result.ok).toBe(true);
  });
});
