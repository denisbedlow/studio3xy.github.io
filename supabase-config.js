const SUPABASE_URL  = 'https://nnmkifxfhcysmhzveabp.supabase.co';   // e.g. https://abcdefgh.supabase.co
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubWtpZnhmaGN5c21oenZlYWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTM2MDQsImV4cCI6MjA4ODU2OTYwNH0.o4f9PH5X-gzbIatkUwnQ__ym6FQhfLKunGIs7FW7zh8';      // starts with eyJ...

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
