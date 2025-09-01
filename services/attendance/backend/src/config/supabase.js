const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Test connection
supabase
  .from('employees')
  .select('count')
  .limit(1)
  .then(({ error }) => {
    if (error) {
      console.error('Failed to connect to Supabase:', error.message);
      if (process.env.NODE_ENV !== 'test') {
        console.error('Please check your Supabase configuration.');
      }
    } else {
      console.log('Successfully connected to Supabase');
    }
  })
  .catch(err => {
    console.error('Supabase connection error:', err);
  });

module.exports = supabase;