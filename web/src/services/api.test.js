import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSessions, getSessionById, uploadSession } from './api';

// Mock fetch globally
global.fetch = vi.fn();

describe('API Service', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    vi.clearAllMocks();
  });

  describe('getSessions', () => {
    it('should fetch and return sessions array', async () => {
      const mockSessions = [
        { sessionId: 's1', pitchCount: 10 },
        { sessionId: 's2', pitchCount: 15 }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: mockSessions })
      });

      const result = await getSessions();

      expect(global.fetch).toHaveBeenCalledWith('/api/sessions', {
        credentials: 'include'
      });
      expect(result).toEqual(mockSessions);
    });

    it('should return empty array if sessions field is missing', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      const result = await getSessions();
      expect(result).toEqual([]);
    });

    it('should throw error on failed request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      });

      await expect(getSessions()).rejects.toThrow('Internal server error');
    });

    it('should include generic error message if error field missing', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({})
      });

      await expect(getSessions()).rejects.toThrow('Request failed with status 404');
    });
  });

  describe('getSessionById', () => {
    it('should fetch and return session with pitches', async () => {
      const mockData = {
        session: { sessionId: 's1', pitchCount: 5 },
        pitches: [{ pitchId: 'p1' }, { pitchId: 'p2' }]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      const result = await getSessionById('s1');

      expect(global.fetch).toHaveBeenCalledWith('/api/sessions/s1', {
        credentials: 'include'
      });
      expect(result).toEqual(mockData);
    });

    it('should encode session ID in URL', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session: null, pitches: [] })
      });

      await getSessionById('session/with/slashes');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/sessions/session%2Fwith%2Fslashes',
        expect.any(Object)
      );
    });

    it('should return null session and empty pitches if fields missing', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      const result = await getSessionById('test');
      expect(result).toEqual({ session: null, pitches: [] });
    });

    it('should throw error on 404', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Session not found' })
      });

      await expect(getSessionById('missing')).rejects.toThrow('Session not found');
    });
  });

  describe('uploadSession', () => {
    it('should POST session payload and return result', async () => {
      const payload = {
        session_id: 'new-session',
        pitches: []
      };

      const mockResponse = {
        sessionId: 'new-session',
        pitchCount: 0
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await uploadSession(payload);

      expect(global.fetch).toHaveBeenCalledWith('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw validation error on 400', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Schema validation failed',
          details: [{ message: 'missing session_id' }]
        })
      });

      await expect(uploadSession({})).rejects.toThrow('Schema validation failed');
    });

    it('should throw rate limit error on 429', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: 'Too many requests',
          retryAfter: 60
        })
      });

      await expect(uploadSession({ session_id: 'test', pitches: [] }))
        .rejects.toThrow('Too many requests');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(getSessions()).rejects.toThrow('Network error');
    });

    it('should handle JSON parse errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      await expect(getSessions()).rejects.toThrow('Invalid JSON');
    });
  });
});
