-- GESTOR OBRA V3 - FINAL - wybgqdreqylrojdxijey
-- RODA UMA VEZ NO SQL EDITOR
create table if not exists clientes (id uuid default gen_random_uuid() primary key, nome text not null, telefone text, endereco text, cnpj text, email text, created_at timestamptz default now());
create table if not exists servicos_catalogo (id uuid default gen_random_uuid() primary key, nome text not null, especialidade text, tipo_servico text, unidade text default 'm²', preco_mao_obra numeric default 0, preco_material numeric default 0, tipo_material text, created_at timestamptz default now());
create table if not exists orcamentos (id uuid default gen_random_uuid() primary key, cliente_nome text, cliente_telefone text, cliente_endereco text, cliente_cnpj text, especialidade text, tipo_servico text, prazo text, forma_pagamento text, itens jsonb default '[]'::jsonb, total numeric default 0, observacoes text, anexos jsonb default '[]'::jsonb, codigo_govbr text, link_nfse text, link_app text, header_config jsonb default '{}'::jsonb, status text default 'rascunho', created_at timestamptz default now());
create table if not exists ordens_servico (id uuid default gen_random_uuid() primary key, orcamento_id uuid references orcamentos(id), cliente_nome text, obra_endereco text, escopo text, data_inicio date, prazo text, equipe text, valor numeric, anexos jsonb default '[]'::jsonb, codigo_govbr text, header_config jsonb default '{}'::jsonb, created_at timestamptz default now());
create table if not exists termos_entrega (id uuid default gen_random_uuid() primary key, os_id uuid references ordens_servico(id), cliente_nome text, obra_endereco text, checklist jsonb default '[]'::jsonb, observacoes text, data_entrega date, codigo_govbr text, anexos jsonb default '[]'::jsonb, header_config jsonb default '{}'::jsonb, created_at timestamptz default now());
alter table clientes enable row level security; alter table servicos_catalogo enable row level security; alter table orcamentos enable row level security; alter table ordens_servico enable row level security; alter table termos_entrega enable row level security;
drop policy if exists "libera tudo" on clientes; drop policy if exists "libera tudo" on servicos_catalogo; drop policy if exists "libera tudo" on orcamentos; drop policy if exists "libera tudo" on ordens_servico; drop policy if exists "libera tudo" on termos_entrega;
create policy "libera tudo" on clientes for all using (true) with check (true);
create policy "libera tudo" on servicos_catalogo for all using (true) with check (true);
create policy "libera tudo" on orcamentos for all using (true) with check (true);
create policy "libera tudo" on ordens_servico for all using (true) with check (true);
create policy "libera tudo" on termos_entrega for all using (true) with check (true);
insert into servicos_catalogo (nome, especialidade, tipo_servico, unidade, preco_mao_obra, preco_material, tipo_material) values 
('Reboco interno','Alvenaria','Revestimento','m²',25,18,'Argamassa'),
('Chapisco','Alvenaria','Preparo','m²',12,8,'Cimento'),
('Pintura PVA 2 demaos','Pintura','Acabamento','m²',18,15,'Tinta PVA'),
('Ponto eletrica','Elétrica','Instalação','un',85,45,'Fio 2.5mm'),
('Ponto hidraulico','Hidráulica','Instalação','un',95,60,'Tubo soldavel'),
('Porcelanato 60x60','Acabamento','Revestimento','m²',45,65,'Porcelanato + AC3')
on conflict do nothing;
