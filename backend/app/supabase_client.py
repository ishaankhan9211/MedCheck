from supabase import create_client, Client

from .config import settings

# Built with the secret key, which grants full admin access (bypasses Row
# Level Security) -- that's why every query in the routers manually
# filters by `user_id` rather than relying on RLS alone.
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY)
