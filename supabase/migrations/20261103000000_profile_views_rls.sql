ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_views_select_own_profile" ON public.profile_views;
CREATE POLICY "profile_views_select_own_profile"
ON public.profile_views
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "profile_views_insert_own_view" ON public.profile_views;
CREATE POLICY "profile_views_insert_own_view"
ON public.profile_views
FOR INSERT
TO authenticated
WITH CHECK (viewer_id = auth.uid() AND profile_id <> auth.uid());

DROP POLICY IF EXISTS "profile_views_update_own_view" ON public.profile_views;
CREATE POLICY "profile_views_update_own_view"
ON public.profile_views
FOR UPDATE
TO authenticated
USING (viewer_id = auth.uid())
WITH CHECK (viewer_id = auth.uid() AND profile_id <> auth.uid());
