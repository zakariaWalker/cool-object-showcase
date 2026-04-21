-- Add country & grade to profiles for full curriculum localization
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code text REFERENCES public.countries(code) ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS grade_code text;

CREATE INDEX IF NOT EXISTS idx_profiles_country_grade ON public.profiles(country_code, grade_code);

-- Backfill existing users with Algerian default (current platform default)
UPDATE public.profiles SET country_code = 'DZ' WHERE country_code IS NULL;