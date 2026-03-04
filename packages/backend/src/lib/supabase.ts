import { createClient } from '@supabase/supabase-js';
import { getRequiredEnvVar } from '../config/env';

const supabaseUrl = getRequiredEnvVar('SUPABASE_URL');
const supabaseServiceRoleKey = getRequiredEnvVar('SUPABASE_SERVICE_ROLE_KEY');

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
