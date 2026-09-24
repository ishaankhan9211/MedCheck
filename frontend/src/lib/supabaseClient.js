import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
// Supabase's newer publishable key (sb_publishable_...), which replaces
// the older "anon" key. Safe to expose in the browser -- it only grants
// what your Row Level Security policies allow.
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || url === 'https://your-project-ref.supabase.co') {
  // Not throwing here so the app can still render a helpful message
  // instead of a blank white screen if setup isn't finished yet.
  console.warn(
    '[MedCheck] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are not set. ' +
    'Login/Signup will not work until you configure them in .env'
  )
}

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  publishableKey || 'placeholder'
)
