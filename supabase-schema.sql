-- Supabase schema for cookbook app
-- Run this in the Supabase SQL Editor to create all tables

create table recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  instructions text not null default '',
  prep_time int,
  cook_time int,
  image_url text,
  created_at timestamptz not null default now()
);

create table ingredients (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table seasons (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table recipe_ingredients (
  recipe_id uuid references recipes(id) on delete cascade,
  ingredient_id uuid references ingredients(id) on delete cascade,
  primary key (recipe_id, ingredient_id)
);

create table recipe_seasons (
  recipe_id uuid references recipes(id) on delete cascade,
  season_id uuid references seasons(id) on delete cascade,
  primary key (recipe_id, season_id)
);

create table recipe_tags (
  recipe_id uuid references recipes(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (recipe_id, tag_id)
);

create table plans (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  recipe_id uuid references recipes(id) on delete set null,
  notes text not null default '',
  created_at timestamptz not null default now()
);
