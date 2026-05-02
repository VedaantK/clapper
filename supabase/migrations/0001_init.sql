-- Enums
create type media_type as enum ('movie', 'tv');
create type tier_type as enum ('loved', 'liked', 'disliked');
create type comparison_result as enum ('new_wins', 'opponent_wins', 'too_tough');

-- Users (mirrors auth.users)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Movies cache
create table movies (
  id uuid primary key default gen_random_uuid(),
  tmdb_id int unique not null,
  title text not null,
  original_title text,
  release_year int,
  poster_path text,
  backdrop_path text,
  overview text,
  runtime_minutes int,
  media_type media_type not null default 'movie',
  created_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now()
);
create index movies_tmdb_id_idx on movies(tmdb_id);

-- Genres (TMDB standard)
create table genres (
  id int primary key,
  name text not null
);

-- Movie-genre join
create table movie_genres (
  movie_id uuid not null references movies(id) on delete cascade,
  genre_id int not null references genres(id) on delete cascade,
  primary key (movie_id, genre_id)
);

-- Ratings
create table ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  movie_id uuid not null references movies(id) on delete cascade,
  tier tier_type not null,
  position int not null,
  score decimal(3,1) not null,
  note text,
  tags text[] default '{}',
  rated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, movie_id)
);
create index ratings_user_tier_position_idx on ratings(user_id, tier, position);

-- Comparisons log
create table comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  session_id uuid not null,
  new_movie_id uuid not null references movies(id) on delete cascade,
  opponent_movie_id uuid not null references movies(id) on delete cascade,
  result comparison_result not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table users enable row level security;
alter table movies enable row level security;
alter table genres enable row level security;
alter table movie_genres enable row level security;
alter table ratings enable row level security;
alter table comparisons enable row level security;

-- users policies
create policy "Users are viewable by authenticated users"
  on users for select to authenticated using (true);

create policy "Users can insert their own profile"
  on users for insert to authenticated with check (auth.uid() = id);

create policy "Users can update their own profile"
  on users for update to authenticated using (auth.uid() = id);

-- movies policies (readable by all authenticated, writable by service role only)
create policy "Movies are viewable by authenticated users"
  on movies for select to authenticated using (true);

create policy "Service role can manage movies"
  on movies for all to service_role using (true);

-- genres policies
create policy "Genres are viewable by authenticated users"
  on genres for select to authenticated using (true);

create policy "Service role can manage genres"
  on genres for all to service_role using (true);

-- movie_genres policies
create policy "Movie genres are viewable by authenticated users"
  on movie_genres for select to authenticated using (true);

create policy "Service role can manage movie genres"
  on movie_genres for all to service_role using (true);

-- ratings policies
create policy "Users can view their own ratings"
  on ratings for select to authenticated using (auth.uid() = user_id);

create policy "Users can insert their own ratings"
  on ratings for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can update their own ratings"
  on ratings for update to authenticated using (auth.uid() = user_id);

create policy "Users can delete their own ratings"
  on ratings for delete to authenticated using (auth.uid() = user_id);

-- comparisons policies
create policy "Users can view their own comparisons"
  on comparisons for select to authenticated using (auth.uid() = user_id);

create policy "Users can insert their own comparisons"
  on comparisons for insert to authenticated with check (auth.uid() = user_id);

-- Trigger to auto-update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_users_updated_at
  before update on users
  for each row execute function update_updated_at_column();

create trigger update_ratings_updated_at
  before update on ratings
  for each row execute function update_updated_at_column();

-- Seed genres (TMDB standard genre list)
insert into genres (id, name) values
  (28, 'Action'),
  (12, 'Adventure'),
  (16, 'Animation'),
  (35, 'Comedy'),
  (80, 'Crime'),
  (99, 'Documentary'),
  (18, 'Drama'),
  (10751, 'Family'),
  (14, 'Fantasy'),
  (36, 'History'),
  (27, 'Horror'),
  (10402, 'Music'),
  (9648, 'Mystery'),
  (10749, 'Romance'),
  (878, 'Science Fiction'),
  (10770, 'TV Movie'),
  (53, 'Thriller'),
  (10752, 'War'),
  (37, 'Western');
