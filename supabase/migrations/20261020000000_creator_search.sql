-- Creator search (search spec 2.8): one row per listed profile with its
-- biggest audience and average views, and a function that filters them.
-- Also opens Peerpop to India's major cities, not just Pune.

insert into cities (slug, name) values
  ('agartala', 'Agartala'),
  ('agra', 'Agra'),
  ('ahmedabad', 'Ahmedabad'),
  ('ahmednagar', 'Ahmednagar'),
  ('aizawl', 'Aizawl'),
  ('ajmer', 'Ajmer'),
  ('akola', 'Akola'),
  ('alappuzha', 'Alappuzha'),
  ('aligarh', 'Aligarh'),
  ('alwar', 'Alwar'),
  ('ambala', 'Ambala'),
  ('amravati', 'Amravati'),
  ('amritsar', 'Amritsar'),
  ('anand', 'Anand'),
  ('anantapur', 'Anantapur'),
  ('asansol', 'Asansol'),
  ('ballari', 'Ballari'),
  ('bareilly', 'Bareilly'),
  ('bathinda', 'Bathinda'),
  ('belagavi', 'Belagavi'),
  ('bengaluru', 'Bengaluru'),
  ('berhampur', 'Berhampur'),
  ('bhagalpur', 'Bhagalpur'),
  ('bharatpur', 'Bharatpur'),
  ('bharuch', 'Bharuch'),
  ('bhavnagar', 'Bhavnagar'),
  ('bhilai', 'Bhilai'),
  ('bhilwara', 'Bhilwara'),
  ('bhiwandi', 'Bhiwandi'),
  ('bhopal', 'Bhopal'),
  ('bhubaneswar', 'Bhubaneswar'),
  ('bikaner', 'Bikaner'),
  ('bilaspur', 'Bilaspur'),
  ('bokaro', 'Bokaro'),
  ('chandigarh', 'Chandigarh'),
  ('chandrapur', 'Chandrapur'),
  ('chennai', 'Chennai'),
  ('chhatrapati', 'Chhatrapati'),
  ('coimbatore', 'Coimbatore'),
  ('cuddalore', 'Cuddalore'),
  ('cuttack', 'Cuttack'),
  ('daman', 'Daman'),
  ('darbhanga', 'Darbhanga'),
  ('davanagere', 'Davanagere'),
  ('dehradun', 'Dehradun'),
  ('delhi', 'Delhi'),
  ('dhanbad', 'Dhanbad'),
  ('dharwad', 'Dharwad'),
  ('dhule', 'Dhule'),
  ('dibrugarh', 'Dibrugarh'),
  ('dindigul', 'Dindigul'),
  ('durg', 'Durg'),
  ('durgapur', 'Durgapur'),
  ('erode', 'Erode'),
  ('faridabad', 'Faridabad'),
  ('firozabad', 'Firozabad'),
  ('gandhinagar', 'Gandhinagar'),
  ('gangtok', 'Gangtok'),
  ('gaya', 'Gaya'),
  ('ghaziabad', 'Ghaziabad'),
  ('gorakhpur', 'Gorakhpur'),
  ('guntur', 'Guntur'),
  ('gurugram', 'Gurugram'),
  ('guwahati', 'Guwahati'),
  ('gwalior', 'Gwalior'),
  ('haldwani', 'Haldwani'),
  ('hapur', 'Hapur'),
  ('haridwar', 'Haridwar'),
  ('hisar', 'Hisar'),
  ('hosur', 'Hosur'),
  ('howrah', 'Howrah'),
  ('hubballi', 'Hubballi'),
  ('hyderabad', 'Hyderabad'),
  ('imphal', 'Imphal'),
  ('indore', 'Indore'),
  ('itanagar', 'Itanagar'),
  ('jabalpur', 'Jabalpur'),
  ('jaipur', 'Jaipur'),
  ('jalandhar', 'Jalandhar'),
  ('jalgaon', 'Jalgaon'),
  ('jammu', 'Jammu'),
  ('jamnagar', 'Jamnagar'),
  ('jamshedpur', 'Jamshedpur'),
  ('jhansi', 'Jhansi'),
  ('jodhpur', 'Jodhpur'),
  ('junagadh', 'Junagadh'),
  ('kakinada', 'Kakinada'),
  ('kalaburagi', 'Kalaburagi'),
  ('kalyan', 'Kalyan'),
  ('kannur', 'Kannur'),
  ('kanpur', 'Kanpur'),
  ('karimnagar', 'Karimnagar'),
  ('karnal', 'Karnal'),
  ('kavaratti', 'Kavaratti'),
  ('kochi', 'Kochi'),
  ('kohima', 'Kohima'),
  ('kolhapur', 'Kolhapur'),
  ('kolkata', 'Kolkata'),
  ('kollam', 'Kollam'),
  ('korba', 'Korba'),
  ('kota', 'Kota'),
  ('kottayam', 'Kottayam'),
  ('kozhikode', 'Kozhikode'),
  ('kurnool', 'Kurnool'),
  ('latur', 'Latur'),
  ('leh', 'Leh'),
  ('lucknow', 'Lucknow'),
  ('ludhiana', 'Ludhiana'),
  ('madurai', 'Madurai'),
  ('malegaon', 'Malegaon'),
  ('mangaluru', 'Mangaluru'),
  ('mathura', 'Mathura'),
  ('meerut', 'Meerut'),
  ('mira-bhayandar', 'Mira-Bhayandar'),
  ('moradabad', 'Moradabad'),
  ('mumbai', 'Mumbai'),
  ('muzaffarnagar', 'Muzaffarnagar'),
  ('muzaffarpur', 'Muzaffarpur'),
  ('mysuru', 'Mysuru'),
  ('nagpur', 'Nagpur'),
  ('nanded', 'Nanded'),
  ('nashik', 'Nashik'),
  ('navi-mumbai', 'Navi Mumbai'),
  ('nellore', 'Nellore'),
  ('noida', 'Noida'),
  ('panaji', 'Panaji'),
  ('panipat', 'Panipat'),
  ('panvel', 'Panvel'),
  ('parbhani', 'Parbhani'),
  ('patiala', 'Patiala'),
  ('patna', 'Patna'),
  ('port-blair', 'Port Blair'),
  ('prayagraj', 'Prayagraj'),
  ('puducherry', 'Puducherry'),
  ('purnia', 'Purnia'),
  ('raipur', 'Raipur'),
  ('rajahmundry', 'Rajahmundry'),
  ('rajkot', 'Rajkot'),
  ('ranchi', 'Ranchi'),
  ('ratlam', 'Ratlam'),
  ('rewa', 'Rewa'),
  ('rohtak', 'Rohtak'),
  ('rourkela', 'Rourkela'),
  ('sagar', 'Sagar'),
  ('saharanpur', 'Saharanpur'),
  ('salem', 'Salem'),
  ('sambalpur', 'Sambalpur'),
  ('sambhajinagar', 'Sambhajinagar'),
  ('sangli', 'Sangli'),
  ('satara', 'Satara'),
  ('shillong', 'Shillong'),
  ('shimla', 'Shimla'),
  ('shivamogga', 'Shivamogga'),
  ('siliguri', 'Siliguri'),
  ('silvassa', 'Silvassa'),
  ('solapur', 'Solapur'),
  ('sonipat', 'Sonipat'),
  ('srinagar', 'Srinagar'),
  ('surat', 'Surat'),
  ('thane', 'Thane'),
  ('thanjavur', 'Thanjavur'),
  ('thiruvananthapuram', 'Thiruvananthapuram'),
  ('thoothukudi', 'Thoothukudi'),
  ('thrissur', 'Thrissur'),
  ('tiruchirappalli', 'Tiruchirappalli'),
  ('tirunelveli', 'Tirunelveli'),
  ('tirupati', 'Tirupati'),
  ('tiruppur', 'Tiruppur'),
  ('tumakuru', 'Tumakuru'),
  ('udaipur', 'Udaipur'),
  ('ujjain', 'Ujjain'),
  ('ulhasnagar', 'Ulhasnagar'),
  ('vadodara', 'Vadodara'),
  ('varanasi', 'Varanasi'),
  ('vasai-virar', 'Vasai-Virar'),
  ('vellore', 'Vellore'),
  ('vijayawada', 'Vijayawada'),
  ('visakhapatnam', 'Visakhapatnam'),
  ('warangal', 'Warangal'),
  ('yamunanagar', 'Yamunanagar')
on conflict (slug) do nothing;

-- Runs with the owner's rights so it can read every creator's platform rows,
-- but exposes only public numbers and applies the listing and block rules
-- itself, like public_platform_accounts.
create view creator_search_rows as
  select cp.user_id, cp.handle, cp.display_name, cp.photo_path, cp.city_slug,
         cp.niches, cp.skills, cp.languages, cp.open_to_collab, cp.created_at,
         audience.followers as max_followers,
         coalesce(audience.verified, false) as max_followers_verified,
         exists (
           select 1 from platform_accounts v
           where v.user_id = cp.user_id and v.source = 'verified' and v.ownership_verified_at is not null
         ) as has_verified,
         views.avg_views,
         coalesce(views.verified, false) as avg_views_verified
  from creator_profiles cp
  left join lateral (
    select n.followers, n.verified
    from (
      select case when pa.source = 'verified' then s.followers else pa.self_followers end as followers,
             pa.source = 'verified' as verified
      from platform_accounts pa
      left join account_stats s on s.account_id = pa.id
      where pa.user_id = cp.user_id
    ) n
    where n.followers is not null
    order by n.followers desc, n.verified desc
    limit 1
  ) audience on true
  left join lateral (
    -- A verified YouTube average wins; otherwise the self-reported one.
    select n.avg_views, n.verified
    from (
      select case when pa.source = 'verified' then s.avg_views_last10 else pa.self_avg_views end as avg_views,
             pa.source = 'verified' as verified,
             pa.platform
      from platform_accounts pa
      left join account_stats s on s.account_id = pa.id
      where pa.user_id = cp.user_id
    ) n
    where n.avg_views is not null
    order by (n.platform = 'youtube' and n.verified) desc, n.avg_views desc
    limit 1
  ) views on true
  where cp.is_listed
    and not is_blocked_between(cp.user_id, auth.uid());

create function search_creators(
  p_city text default null,
  p_niches niche[] default null,
  p_skills skill[] default null,
  p_langs lang[] default null,
  p_min bigint default null,
  p_max bigint default null,
  p_collab boolean default false,
  p_verified_only boolean default false,
  p_sort text default 'audience',
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  handle text,
  display_name text,
  photo_path text,
  city_slug text,
  niches niche[],
  open_to_collab boolean,
  max_followers bigint,
  max_followers_verified boolean,
  has_verified boolean,
  avg_views bigint,
  avg_views_verified boolean,
  total_count bigint
)
language sql stable set search_path = public as $$
  select r.user_id, r.handle, r.display_name, r.photo_path, r.city_slug, r.niches,
         r.open_to_collab, r.max_followers, r.max_followers_verified, r.has_verified,
         r.avg_views, r.avg_views_verified,
         count(*) over () as total_count
  from creator_search_rows r
  where (p_city is null or r.city_slug = p_city)
    and (coalesce(cardinality(p_niches), 0) = 0 or r.niches && p_niches)
    and (coalesce(cardinality(p_skills), 0) = 0 or r.skills && p_skills)
    and (coalesce(cardinality(p_langs), 0) = 0 or r.languages && p_langs)
    and (p_min is null or r.max_followers >= p_min)
    and (p_max is null or r.max_followers < p_max)
    and (not coalesce(p_collab, false) or r.open_to_collab)
    and (not coalesce(p_verified_only, false) or r.has_verified)
  order by
    case when p_sort = 'views' then r.avg_views end desc nulls last,
    r.has_verified desc,
    r.max_followers desc nulls last,
    r.created_at desc
  limit least(greatest(coalesce(p_limit, 24), 1), 48)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

grant select on creator_search_rows to anon, authenticated;
grant execute on function search_creators(text, niche[], skill[], lang[], bigint, bigint, boolean, boolean, text, integer, integer) to anon, authenticated;
