import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    # Groq deprecates/retires model IDs periodically (it already happened
    # once to this project -- llama-3.3-70b-versatile and
    # llama-4-scout-17b-16e-instruct were both retired in mid-2026). Rather
    # than hardcoding model names in the routers, they're configurable here
    # so a future deprecation is a one-line .env change, not a code change.
    # Check https://console.groq.com/docs/models (text) and
    # https://console.groq.com/docs/vision (vision) for current options.
    GROQ_TEXT_MODEL: str = os.getenv("GROQ_TEXT_MODEL", "openai/gpt-oss-120b")
    GROQ_VISION_MODEL: str = os.getenv("GROQ_VISION_MODEL", "qwen/qwen3.8-27b")

    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    # Supabase's new secret key (starts with sb_secret_...), which replaces
    # the older service_role JWT. Server-side only -- never send this to
    # the browser. Get it from Settings -> API Keys -> "Publishable and
    # secret API keys" in your Supabase dashboard.
    SUPABASE_SECRET_KEY: str = os.getenv("SUPABASE_SECRET_KEY", "")
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")


settings = Settings()
