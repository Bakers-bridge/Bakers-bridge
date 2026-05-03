// Bakers Bridge - Supabase Configuration
const SUPABASE_URL = "https://sibxliqoninvmumhccuy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYnhsaXFvbmludm11bWhjY3V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0ODYwNDMsImV4cCI6MjA5MzA2MjA0M30.KNXUzAD-TiIEnsDPyX3s8pRzwQZdF7OnrLe37zvLCNk";

// Use 'window.db' to provide a consistent global client
window.db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
