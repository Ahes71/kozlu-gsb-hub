begin;
create or replace function public.insights(p_org uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$ declare output jsonb;begin
if not has_role(p_org,array['director','manager']) then raise exception 'Yetki yok';end if;
with ev as(select e.*,coalesce(s.actual_attendance,s.qr_count,0) attendance from events e join event_statistics s on s.event_id=e.id where e.organization_id=p_org and e.status='completed' and e.starts_at<=now()),
weeks as(select facility_id,category,date_trunc('week',starts_at at time zone 'Europe/Istanbul') week_start,100.0*sum(attendance)/nullif(sum(capacity),0) occupancy from ev where starts_at>=((date_trunc('week',now() at time zone 'Europe/Istanbul')-interval '4 weeks') at time zone 'Europe/Istanbul') and starts_at<(date_trunc('week',now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul') group by 1,2,3),
high_demand as(select facility_id,category,round(avg(occupancy),1) occupancy from weeks group by facility_id,category having count(*)=4 and bool_and(occupancy>=90)),
ranked as(select *,row_number() over(partition by facility_id,lower(trim(name)) order by starts_at desc) rn from ev),
low_demand as(select facility_id,name,round(100.0*sum(attendance)/nullif(sum(capacity),0),1) occupancy from ranked where rn<=3 group by facility_id,name having count(*)=3 and bool_and(attendance::numeric/capacity<0.35))
select jsonb_build_object(
'capacity',coalesce((select jsonb_agg(x) from(select category,count(*) events,round(100.0*sum(attendance)/nullif(sum(capacity),0),1) occupancy from ev where starts_at>now()-interval '28 days' group by category)x),'[]'::jsonb),
'high_demand',coalesce((select jsonb_agg(jsonb_build_object('facility',f.name,'category',h.category,'occupancy',h.occupancy)) from high_demand h join facilities f on f.id=h.facility_id),'[]'::jsonb),
'low_demand',coalesce((select jsonb_agg(jsonb_build_object('facility',f.name,'name',l.name,'occupancy',l.occupancy)) from low_demand l join facilities f on f.id=l.facility_id),'[]'::jsonb),
'age_groups',coalesce((select jsonb_agg(x) from(select age_group,sum(attendance) attendance from ev where starts_at>now()-interval '30 days' group by age_group order by sum(attendance) desc)x),'[]'::jsonb),
'ideas',coalesce((select jsonb_agg(x order by x.recent desc) from(select category,count(*) filter(where created_at>now()-interval '30 days') recent,count(*) filter(where created_at<=now()-interval '30 days') previous from anonymous_ideas where organization_id=p_org and created_at>now()-interval '60 days' group by category)x),'[]'::jsonb),
'busy_times',coalesce((select jsonb_agg(x) from(select extract(isodow from starts_at at time zone 'Europe/Istanbul') as day_number,extract(hour from starts_at at time zone 'Europe/Istanbul') as hour_number,count(*) events from ev where starts_at>now()-interval '30 days' group by 1,2 order by count(*) desc limit 5)x),'[]'::jsonb),
'satisfaction',(select round(avg(rating),1) from anonymous_feedback where organization_id=p_org and created_at>now()-interval '30 days')) into output;return output;end $$;
commit;
