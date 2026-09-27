-- 001 ve 002'den sonra. E-posta ve görünen adı gerçek müdür hesabıyla değiştirin.
-- Önce Authentication > Users > Invite user ile bu hesabı oluşturun.
begin;
do $$
declare
  director_email text := 'MUDUR_EPOSTASINI_BURAYA_YAZIN';
  director_name text := 'Müdür';
  director_user uuid;
  org uuid;
begin
  select id into director_user from auth.users where lower(email)=lower(director_email);
  if director_user is null then raise exception 'Müdür hesabı Auth içinde bulunamadı. Önce personeli davet edin ve SQL içindeki e-postayı değiştirin.';end if;
  insert into public.organizations(slug,name,district_id) values('kozlu-gsb','Kozlu İlçe Gençlik ve Spor Müdürlüğü','zonguldak-kozlu') on conflict(slug) do update set name=excluded.name returning id into org;
  insert into public.memberships(organization_id,user_id,name,role) values(org,director_user,director_name,'director') on conflict(organization_id,user_id) do update set role='director',active=true;
end $$;
commit;
-- Tesis, faaliyet veya katılım için örnek veri eklenmez.
