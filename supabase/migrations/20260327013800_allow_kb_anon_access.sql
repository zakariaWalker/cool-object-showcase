-- Allow anonymous access to KB tables as they are protected by a frontend PIN gate

-- KB Exercises
DROP POLICY IF EXISTS "KB exercises viewable by all" ON public.kb_exercises;
DROP POLICY IF EXISTS "Authenticated can insert kb_exercises" ON public.kb_exercises;
DROP POLICY IF EXISTS "Authenticated can update kb_exercises" ON public.kb_exercises;
DROP POLICY IF EXISTS "Authenticated can delete kb_exercises" ON public.kb_exercises;

CREATE POLICY "KB exercises viewable by all" ON public.kb_exercises FOR SELECT USING (true);
CREATE POLICY "Anyone can insert kb_exercises" ON public.kb_exercises FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update kb_exercises" ON public.kb_exercises FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete kb_exercises" ON public.kb_exercises FOR DELETE USING (true);

-- KB Patterns
DROP POLICY IF EXISTS "KB patterns viewable by all" ON public.kb_patterns;
DROP POLICY IF EXISTS "Authenticated can insert kb_patterns" ON public.kb_patterns;
DROP POLICY IF EXISTS "Authenticated can update kb_patterns" ON public.kb_patterns;
DROP POLICY IF EXISTS "Authenticated can delete kb_patterns" ON public.kb_patterns;

CREATE POLICY "KB patterns viewable by all" ON public.kb_patterns FOR SELECT USING (true);
CREATE POLICY "Anyone can insert kb_patterns" ON public.kb_patterns FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update kb_patterns" ON public.kb_patterns FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete kb_patterns" ON public.kb_patterns FOR DELETE USING (true);

-- KB Deconstructions
DROP POLICY IF EXISTS "KB deconstructions viewable by all" ON public.kb_deconstructions;
DROP POLICY IF EXISTS "Authenticated can insert kb_deconstructions" ON public.kb_deconstructions;
DROP POLICY IF EXISTS "Authenticated can update kb_deconstructions" ON public.kb_deconstructions;
DROP POLICY IF EXISTS "Authenticated can delete kb_deconstructions" ON public.kb_deconstructions;

CREATE POLICY "KB deconstructions viewable by all" ON public.kb_deconstructions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert kb_deconstructions" ON public.kb_deconstructions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update kb_deconstructions" ON public.kb_deconstructions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete kb_deconstructions" ON public.kb_deconstructions FOR DELETE USING (true);
