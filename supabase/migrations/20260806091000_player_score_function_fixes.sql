begin;

create or replace function public.plvip_public_players(search_text text default null, result_limit integer default 60)
returns table(
  username citext,
  display_name text,
  avatar_url text,
  country text,
  bio text,
  main_games text[],
  platforms text[],
  play_style text,
  social text,
  founding_player_number bigint,
  profile_completion smallint,
  badge_count bigint,
  total_points bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.username,
    p.display_name,
    p.avatar_url,
    p.country,
    p.bio,
    p.main_games,
    p.platforms,
    p.play_style,
    p.social,
    p.founding_player_number,
    p.profile_completion,
    coalesce(b.badge_count,0)::bigint,
    coalesce(s.total_points,0)::bigint
  from public.plvip_player_profiles p
  left join lateral (
    select count(*)::bigint as badge_count
    from public.plvip_player_badges pb
    join public.plvip_badges badge on badge.id=pb.badge_id and badge.active=true
    where pb.profile_id=p.id
  ) b on true
  left join lateral (
    select coalesce(sum(l.amount),0)::bigint as total_points
    from public.plvip_points_ledger l
    where l.profile_id=p.id
  ) s on true
  where p.is_public=true and p.moderation_status='approved'
    and (
      nullif(trim(search_text),'') is null
      or p.username::text ilike '%'||trim(search_text)||'%'
      or p.display_name ilike '%'||trim(search_text)||'%'
      or coalesce(p.country,'') ilike '%'||trim(search_text)||'%'
      or array_to_string(p.main_games,' ') ilike '%'||trim(search_text)||'%'
    )
  order by p.founding_player_number asc
  limit greatest(1,least(coalesce(result_limit,60),100));
$$;

create or replace function public.plvip_public_leaderboard(result_limit integer default 100)
returns table(
  rank bigint,
  username citext,
  display_name text,
  avatar_url text,
  country text,
  founding_player_number bigint,
  total_points bigint,
  badge_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with scores as (
    select
      p.username,
      p.display_name,
      p.avatar_url,
      p.country,
      p.founding_player_number,
      coalesce((select sum(l.amount) from public.plvip_points_ledger l where l.profile_id=p.id),0)::bigint as total_points,
      coalesce((
        select count(*)
        from public.plvip_player_badges pb
        join public.plvip_badges badge on badge.id=pb.badge_id and badge.active=true
        where pb.profile_id=p.id
      ),0)::bigint as badge_count
    from public.plvip_player_profiles p
    where p.is_public=true and p.moderation_status='approved'
  )
  select
    dense_rank() over(order by total_points desc,badge_count desc,founding_player_number asc),
    username,
    display_name,
    avatar_url,
    country,
    founding_player_number,
    total_points,
    badge_count
  from scores
  order by total_points desc,badge_count desc,founding_player_number asc
  limit greatest(1,least(coalesce(result_limit,100),100));
$$;

grant execute on function public.plvip_public_players(text,integer) to anon, authenticated;
grant execute on function public.plvip_public_leaderboard(integer) to anon, authenticated;

commit;
