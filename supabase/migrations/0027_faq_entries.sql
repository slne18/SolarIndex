-- Questions FAQ soumises par les visiteurs et entrées publiées sur /faq

create table if not exists faq_entries (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  statut        text not null default 'soumission',
  -- soumission | publie | archive

  question_fr   text not null,
  answer_fr     text,
  question_en   text,
  answer_en     text,

  sender_email  text,
  sort_order    integer,
  published_at  timestamptz
);

create index if not exists faq_entries_statut_idx on faq_entries (statut);
create index if not exists faq_entries_published_sort_idx
  on faq_entries (sort_order asc nulls last, published_at asc)
  where statut = 'publie';

alter table faq_entries enable row level security;
