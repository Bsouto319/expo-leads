-- ExpoLeads — Migration inicial
-- Tabelas: el_eventos, el_leads

create table if not exists el_eventos (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  nome_evento      text not null,
  nome_expositor   text not null,
  cor_primaria     text default '#6366f1',
  whatsapp_expositor text,
  data_evento      date,
  local_evento     text,
  mensagem_auto    text,
  logo_url         text,
  webhook_url      text,   -- URL do n8n para disparo automático de WhatsApp
  ativo            boolean default true,
  created_at       timestamptz default now()
);

create table if not exists el_leads (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid references el_eventos(id) on delete cascade,
  nome        text not null,
  whatsapp    text not null,
  email       text,
  empresa     text,
  interesse   text,
  status      text default 'novo',
  notas       text,
  created_at  timestamptz default now()
);

-- RLS
alter table el_eventos enable row level security;
alter table el_leads   enable row level security;

-- el_eventos: leitura pública (form precisa), escrita anon ok para MVP
create policy "public_read_eventos"   on el_eventos for select using (true);
create policy "public_insert_eventos" on el_eventos for insert with check (true);
create policy "public_update_eventos" on el_eventos for update using (true);

-- el_leads: leitura/escrita pública — slug funciona como "senha" no CRM
create policy "public_read_leads"   on el_leads for select using (true);
create policy "public_insert_leads" on el_leads for insert with check (true);
create policy "public_update_leads" on el_leads for update using (true);

-- Índices
create index if not exists el_leads_evento_id_idx   on el_leads(evento_id);
create index if not exists el_leads_created_at_idx  on el_leads(created_at desc);
create index if not exists el_eventos_slug_idx       on el_eventos(slug);
