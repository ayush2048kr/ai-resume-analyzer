let supabase;

try {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
} catch (e) {
  // @supabase/supabase-js not installed yet or loading fallback
}

if (!supabase) {
  supabase = {
    from: (table) => ({
      insert: (records) => ({
        select: async () => ({ data: records, error: null })
      })
    })
  };
}

module.exports = supabase;
