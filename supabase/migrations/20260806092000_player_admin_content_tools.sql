begin;

create or replace function public.plvip_admin_save_challenge(
  challenge_id uuid,
  challenge_slug text,
  challenge_title text,
  challenge_summary text,
  challenge_instructions text,
  challenge_points integer,
  challenge_status text,
  challenge_opens_at timestamptz default null,
  challenge_closes_at timestamptz default null,
  challenge_published boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_id uuid;
  cleaned_slug text := lower(trim(challenge_slug));
begin
  if not public.current_user_is_admin() then raise exception 'Not authorised'; end if;
  if cleaned_slug !~ '^[a-z0-9][a-z0-9-]{2,79}$' then raise exception 'Invalid challenge slug'; end if;
  if nullif(trim(challenge_title),'') is null then raise exception 'Challenge title required'; end if;
  if nullif(trim(challenge_summary),'') is null then raise exception 'Challenge summary required'; end if;
  if nullif(trim(challenge_instructions),'') is null then raise exception 'Challenge instructions required'; end if;
  if challenge_points < 0 or challenge_points > 100000 then raise exception 'Invalid challenge points'; end if;
  if challenge_status not in ('draft','open','closed','archived') then raise exception 'Invalid challenge status'; end if;
  if challenge_opens_at is not null and challenge_closes_at is not null and challenge_closes_at <= challenge_opens_at then
    raise exception 'Closing time must be after opening time';
  end if;

  if challenge_id is null then
    insert into public.plvip_challenges(
      slug,title,summary,instructions,points_reward,status,opens_at,closes_at,published,created_by
    ) values (
      cleaned_slug::citext,
      left(trim(challenge_title),160),
      left(trim(challenge_summary),600),
      left(trim(challenge_instructions),3000),
      challenge_points,
      challenge_status,
      challenge_opens_at,
      challenge_closes_at,
      challenge_published,
      auth.uid()
    ) returning id into saved_id;
  else
    update public.plvip_challenges set
      slug=cleaned_slug::citext,
      title=left(trim(challenge_title),160),
      summary=left(trim(challenge_summary),600),
      instructions=left(trim(challenge_instructions),3000),
      points_reward=challenge_points,
      status=challenge_status,
      opens_at=challenge_opens_at,
      closes_at=challenge_closes_at,
      published=challenge_published,
      updated_at=now()
    where id=challenge_id
    returning id into saved_id;
    if saved_id is null then raise exception 'Challenge not found'; end if;
  end if;
  return saved_id;
end;
$$;

create or replace function public.plvip_admin_publish_announcement(
  announcement_title text,
  announcement_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare saved_id uuid;
begin
  if not public.current_user_is_admin() then raise exception 'Not authorised'; end if;
  if nullif(trim(announcement_title),'') is null then raise exception 'Announcement title required'; end if;
  if nullif(trim(announcement_body),'') is null then raise exception 'Announcement body required'; end if;
  insert into public.plvip_announcements(title,body,status,published_at,created_by)
  values(left(trim(announcement_title),160),left(trim(announcement_body),2000),'published',now(),auth.uid())
  returning id into saved_id;
  return saved_id;
end;
$$;

create or replace function public.plvip_admin_archive_announcement(target_announcement uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then raise exception 'Not authorised'; end if;
  update public.plvip_announcements set status='archived' where id=target_announcement;
end;
$$;

grant execute on function public.plvip_admin_save_challenge(uuid,text,text,text,text,integer,text,timestamptz,timestamptz,boolean) to authenticated;
grant execute on function public.plvip_admin_publish_announcement(text,text) to authenticated;
grant execute on function public.plvip_admin_archive_announcement(uuid) to authenticated;

commit;
