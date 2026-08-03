-- ============================================================
--  THE WEALTHY WOMAN — database schema
--  Paste this whole file into Supabase → SQL Editor → Run
-- ============================================================

-- ---- TABLES ----
create table if not exists ww_profiles (
  id uuid primary key references auth.users on delete cascade,
  seeded boolean default false,
  pay_yourself_target numeric default 125,
  created_at timestamptz default now()
);

create table if not exists ww_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  amount numeric not null default 0,
  grp text default '🛒 Everyday',
  due_day int default 1,
  month text,               -- 'YYYY-MM' this instance belongs to
  status text default 'unpaid', -- unpaid | partial | paid
  paid_amount numeric default 0,
  running boolean default false,
  autopay boolean default false,
  archived boolean default false,
  sort int default 0,
  created_at timestamptz default now()
);

create table if not exists ww_spend (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  place text,
  category text,
  emoji text,
  color text,
  amount numeric not null default 0,
  date date not null,
  bill_id uuid references ww_bills(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists ww_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  date date not null,
  gross numeric default 0,
  tax numeric default 0,
  ded numeric default 0,
  net numeric default 0,
  saved numeric default 0,
  created_at timestamptz default now()
);

create table if not exists ww_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  sort int default 0
);

create table if not exists ww_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  account_id uuid references ww_accounts(id) on delete cascade,
  name text not null,
  emoji text default '✨',
  target numeric default 0,
  saved numeric default 0,
  target_date date,
  sort int default 0
);

create table if not exists ww_deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  goal_id uuid references ww_goals(id) on delete cascade,
  amount numeric not null,
  source text default 'manual',   -- manual | paycheck
  note text,
  date date default now(),
  created_at timestamptz default now()
);

create table if not exists ww_debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  balance numeric not null default 0,
  apr numeric,
  min_payment numeric default 0,
  sort int default 0
);

create table if not exists ww_debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  debt_id uuid references ww_debts(id) on delete cascade,
  amount numeric not null,          -- negative = payment, positive = charge
  note text,
  date date default now()
);

create table if not exists ww_violations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  ref text,
  state text default 'NY',          -- NY | NJ
  vdate date,
  toll numeric default 0,
  due numeric default 0,
  status text default 'pending'     -- paid | pending | collections
);

create table if not exists ww_credit_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  bureau text not null,
  score int not null,
  updated_at timestamptz default now()
);

create table if not exists ww_saved_tips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  text text not null,
  source text,
  topic text,
  created_at timestamptz default now()
);

-- ---- ROW LEVEL SECURITY ----
alter table ww_profiles       enable row level security;
alter table ww_bills          enable row level security;
alter table ww_spend          enable row level security;
alter table ww_checks         enable row level security;
alter table ww_accounts       enable row level security;
alter table ww_goals          enable row level security;
alter table ww_deposits       enable row level security;
alter table ww_debts          enable row level security;
alter table ww_debt_payments  enable row level security;
alter table ww_violations     enable row level security;
alter table ww_credit_scores  enable row level security;
alter table ww_saved_tips     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['ww_profiles','ww_bills','ww_spend','ww_checks','ww_accounts','ww_goals','ww_deposits','ww_debts','ww_debt_payments','ww_violations','ww_credit_scores','ww_saved_tips']
  loop
    execute format('drop policy if exists "own rows" on %I;', t);
    if t = 'ww_profiles' then
      execute format('create policy "own rows" on %I for all using (auth.uid() = id) with check (auth.uid() = id);', t);
    else
      execute format('create policy "own rows" on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
    end if;
  end loop;
end $$;

-- ============================================================
--  SEED FUNCTION — loads the real 2026 data for a new user.
--  Called automatically by the app on first login.
-- ============================================================
create or replace function seed_wealthy_woman()
returns void
language plpgsql
security definer
as $$
declare
  uid uuid := auth.uid();
  ally uuid;
  g_car uuid;
  g_emerg uuid;
  cur_month text := to_char(now(),'YYYY-MM');
begin
  if uid is null then return; end if;
  -- only seed once
  if exists (select 1 from ww_profiles where id = uid and seeded) then return; end if;

  insert into ww_profiles (id, seeded) values (uid, true)
    on conflict (id) do update set seeded = true;

  -- ---- BILLS (current month instance) ----
  insert into ww_bills (user_id,name,amount,grp,due_day,month,status,running,autopay,sort) values
    (uid,'Rent',300,'🏠 Housing',1,cur_month,'unpaid',true,false,1),
    (uid,'Patreon',5,'🎬 Subscriptions',2,cur_month,'unpaid',false,false,2),
    (uid,'VPN',12.99,'🎬 Subscriptions',6,cur_month,'unpaid',false,false,3),
    (uid,'Amazon',7,'🎬 Subscriptions',7,cur_month,'unpaid',false,false,4),
    (uid,'Tidal Music',13.99,'🎬 Subscriptions',9,cur_month,'unpaid',false,true,5),
    (uid,'Wow+',5.99,'🎬 Subscriptions',9,cur_month,'unpaid',false,false,6),
    (uid,'iCloud',2.99,'🎬 Subscriptions',11,cur_month,'unpaid',false,true,7),
    (uid,'Capital One Credit Card',50,'💳 Cards',10,cur_month,'unpaid',false,false,8),
    (uid,'Discover Credit Card',100,'💳 Cards',15,cur_month,'unpaid',false,false,9),
    (uid,'Car Insurance',215,'🚗 Auto',20,cur_month,'unpaid',false,false,10),
    (uid,'Transportation',120,'🚗 Auto',1,cur_month,'unpaid',false,false,11),
    (uid,'T-Mobile Phone',114,'⚡ Utilities',27,cur_month,'unpaid',false,true,12),
    (uid,'Verizon Wifi',50,'⚡ Utilities',27,cur_month,'unpaid',false,false,13),
    (uid,'Utilities',60,'⚡ Utilities',1,cur_month,'unpaid',false,false,14),
    (uid,'Groceries',180,'🛒 Everyday',1,cur_month,'unpaid',false,false,15),
    (uid,'Dog Food',100,'🛒 Everyday',1,cur_month,'unpaid',false,false,16);

  -- ---- CHECKS (Jan–Jun 2026, real paychecks) ----
  insert into ww_checks (user_id,date,gross,tax,ded,net) values
    (uid,'2026-01-02',957,162.04,100.2,694),
    (uid,'2026-01-09',979,173.01,71.93,734),
    (uid,'2026-01-16',880,147.03,69.95,663.02),
    (uid,'2026-01-23',704,102.62,66.43,534.95),
    (uid,'2026-01-30',715,105.27,66.65,543.08),
    (uid,'2026-02-06',869,144.14,69.73,655.13),
    (uid,'2026-02-13',825,132.63,68.85,623.52),
    (uid,'2026-02-20',880,147.02,69.95,663.03),
    (uid,'2026-02-27',880,147.03,69.95,663.02),
    (uid,'2026-03-06',880,147.03,69.95,663.02),
    (uid,'2026-03-13',704,102.63,66.43,534.94),
    (uid,'2026-03-20',825,132.61,132.61,623.54),
    (uid,'2026-03-27',858,141.27,69.51,674.22),
    (uid,'2026-04-10',1617,256.57,136.68,1223.4),
    (uid,'2026-04-24',1716,282.54,138.66,1294.45),
    (uid,'2026-05-08',2189,406.62,148.12,1633.91),
    (uid,'2026-05-22',792,76.23,120,595.24),
    (uid,'2026-05-22',1050.5,190.01,21.01,839.48),
    (uid,'2026-05-29',819.5,127.96,68.74,622.8),
    (uid,'2026-06-05',1095.6,190.08,74.26,831.26),
    (uid,'2026-06-12',841.5,132.85,69.18,639.47),
    (uid,'2026-06-18',885.5,142.62,70.06,672.82),
    (uid,'2026-06-26',863.5,137.73,69.62,656.15);

  -- ---- SAVINGS ----
  insert into ww_accounts (user_id,name,sort) values (uid,'Ally Savings',1) returning id into ally;
  insert into ww_goals (user_id,account_id,name,emoji,target,saved,target_date,sort)
    values (uid,ally,'Car Fund','🚗',7000,0,'2026-12-31',1) returning id into g_car;
  insert into ww_goals (user_id,account_id,name,emoji,target,saved,target_date,sort)
    values (uid,ally,'Emergency Fund','🛟',2000,0,'2026-12-31',2) returning id into g_emerg;

  -- ---- DEBTS ----
  insert into ww_debts (user_id,name,balance,apr,min_payment,sort) values
    (uid,'Capital One',425.77,26.9,30,1),
    (uid,'Discover',1380,24.9,45,2),
    (uid,'Affirm',916.55,15,92,3),
    (uid,'Collections',463,null,25,4),
    (uid,'Student Loans',32939,5.8,310,5);

  -- ---- CREDIT ----
  insert into ww_credit_scores (user_id,bureau,score) values
    (uid,'Experian',565),(uid,'TransUnion',565),(uid,'Equifax',566);

  -- ---- EZ-PASS VIOLATIONS ----
  -- NY
  insert into ww_violations (user_id,ref,state,vdate,toll,due,status) values
    (uid,'T318154588483-1','NY','2024-06-28',17.63,67.63,'paid'),
    (uid,'T218154588483-2','NY','2024-06-29',11.19,61.19,'paid'),
    (uid,'T218154588483-3','NY','2024-06-29',11.19,61.19,'paid'),
    (uid,'T218154588483-1','NY','2024-06-29',11.19,61.19,'paid'),
    (uid,'T318180709706-1','NY','2024-08-30',17.63,67.63,'paid'),
    (uid,'T318224798839-1','NY','2024-11-16',17.63,67.63,'paid'),
    (uid,'T218224798839-1','NY','2024-11-16',11.19,61.19,'paid'),
    (uid,'T318273819123-2','NY','2025-04-01',18.31,68.31,'paid'),
    (uid,'T318273819123-1','NY','2025-03-23',18.31,68.31,'paid'),
    (uid,'T218273819123-5','NY','2025-04-19',3.3,53.3,'paid'),
    (uid,'T218273819123-3','NY','2025-03-28',13.5,63.5,'paid'),
    (uid,'T218273819123-2','NY','2025-03-23',13.5,63.5,'paid'),
    (uid,'T218273819123-1','NY','2025-03-15',3.3,53.3,'paid'),
    (uid,'T218273819123-9','NY','2025-06-21',13.5,63.5,'collections'),
    (uid,'T218273819123-8','NY','2025-06-16',3.3,53.3,'collections'),
    (uid,'T218273819123-7','NY','2025-05-24',3.3,53.3,'collections'),
    (uid,'T218273819123-6','NY','2025-05-23',3.3,53.3,'collections'),
    (uid,'T218273819123-4','NY','2025-04-01',13.5,63.5,'collections'),
    (uid,'T220005510603-4','NY','2025-08-24',13.5,63.5,'pending'),
    (uid,'T220005510603-3','NY','2025-08-08',3.3,53.3,'pending'),
    (uid,'T220005510603-2','NY','2025-07-10',3.3,53.3,'pending'),
    (uid,'T220005510603-1','NY','2025-06-27',3.3,53.3,'pending'),
    (uid,'T320005510603-2','NY','2025-08-08',22.38,72.38,'pending'),
    (uid,'T320005510603-1','NY','2025-06-27',18.31,68.31,'pending'),
    (uid,'T320027118399-2','NY','2025-08-29',22.38,72.38,'pending'),
    (uid,'T320027118399-1','NY','2025-06-21',18.31,68.31,'pending');
  -- NJ
  insert into ww_violations (user_id,ref,state,vdate,toll,due,status) values
    (uid,'T132416087936','NJ','2024-01-11',4.9,104.9,'paid'),
    (uid,'T132417202203','NJ','2024-02-06',8.8,108.8,'pending'),
    (uid,'T132418751528','NJ','2024-03-07',3.9,103.9,'paid'),
    (uid,'T132422257107','NJ','2024-05-10',3.5,103.5,'paid'),
    (uid,'T132422257114','NJ','2024-05-11',7.75,57.75,'pending'),
    (uid,'T132422621379','NJ','2024-05-18',14.2,164.2,'pending'),
    (uid,'T132425399142','NJ','2024-06-28',3.8,53.8,'pending'),
    (uid,'T122428405937','NJ','2024-08-08',3,53,'pending'),
    (uid,'T122429068028','NJ','2024-08-21',3,53,'pending'),
    (uid,'T122429438177','NJ','2024-08-29',2.2,52.2,'pending'),
    (uid,'T122433572759','NJ','2024-11-02',2.2,52.2,'pending'),
    (uid,'T122434328500','NJ','2024-11-13',2.2,52.2,'pending'),
    (uid,'T122434328502','NJ','2024-11-15',0.8,50.8,'pending'),
    (uid,'T122436304370','NJ','2024-12-15',0.8,50.8,'pending'),
    (uid,'T132542051904','NJ','2025-03-20',2.65,52.65,'pending'),
    (uid,'T132547041491','NJ','2025-05-26',10.25,60.25,'pending'),
    (uid,'T122547044227','NJ','2025-05-31',2.3,52.3,'pending'),
    (uid,'T122548465009','NJ','2025-06-15',3.15,53.15,'pending'),
    (uid,'T132548453402','NJ','2025-06-15',5.3,105.3,'pending'),
    (uid,'T132548453404','NJ','2025-06-16',10.25,60.25,'pending'),
    (uid,'T122548701210','NJ','2025-06-17',2.3,52.3,'pending'),
    (uid,'T132548705619','NJ','2025-06-17',17.45,117.45,'pending'),
    (uid,'T132549080704','NJ','2025-06-21',16.4,116.4,'pending'),
    (uid,'T122549053451','NJ','2025-06-21',2.3,52.3,'pending');
end $$;

-- ============================================================
--  ANONYMOUS AUTH UPDATE
--  Run this in Supabase SQL Editor to enable no-login access
-- ============================================================

-- Allow anonymous users to use the seed function
grant execute on function seed_wealthy_woman() to anon, authenticated;

-- Update RLS policies to allow anonymous users (auth.uid() works for anon sessions too)
-- No changes needed to existing policies — Supabase anon sessions have a real uid
-- Just make sure anonymous sign-ins are enabled in your Supabase dashboard:
-- Authentication -> Providers -> Anonymous -> Enable
