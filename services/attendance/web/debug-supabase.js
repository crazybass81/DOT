const { supabase } = require('./dist/lib/supabase-config');

console.log('Supabase client type:', typeof supabase);
console.log('Supabase client:', supabase);
console.log('Has from method:', typeof supabase?.from);

if (supabase && supabase.from) {
  try {
    const query = supabase.from('unified_identities');
    console.log('Query type:', typeof query);
    console.log('Query object:', query);
    console.log('Has select method:', typeof query?.select);
  } catch (error) {
    console.log('Error creating query:', error.message);
  }
}