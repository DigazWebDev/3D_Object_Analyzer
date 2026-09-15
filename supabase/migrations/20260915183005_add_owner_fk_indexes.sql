drop index public.analyses_user_photo_idx;
create index analyses_photo_user_idx on public.analyses (photo_id, user_id);

drop index public.components_user_analysis_idx;
create index components_analysis_user_idx on public.components (analysis_id, user_id);
