/**
 * Unit Tests for backend/config/supabase.js
 * 
 * Tests cover:
 * - Fallback stub behaviour when @supabase/supabase-js is not installed
 * - Stub insert/select returns expected shape
 */

describe('Supabase Config', () => {
  let supabase;

  beforeEach(() => {
    // Clear module cache to get fresh require each time
    jest.resetModules();
  });

  test('exports a stub client when Supabase env vars are missing', () => {
    // Ensure env vars are unset
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    supabase = require('../../config/supabase');
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe('function');
  });

  test('stub .from().insert().select() resolves with data and no error', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    supabase = require('../../config/supabase');
    const records = [{ user_id: 'test', feedback: 'Great resume' }];
    const result = await supabase.from('resume_analyses').insert(records).select();

    expect(result).toBeDefined();
    expect(result.error).toBeNull();
    expect(result.data).toEqual(records);
  });

  test('stub handles any table name', async () => {
    delete process.env.SUPABASE_URL;
    supabase = require('../../config/supabase');

    const result = await supabase.from('random_table').insert([{ id: 1 }]).select();
    expect(result.error).toBeNull();
  });
});
