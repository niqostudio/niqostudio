-- migrate:up

-- preamble: supabase 既定外の最小権限ロール（inquiry_writer/_reader）を冪等作成。
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'inquiry_writer') then create role inquiry_writer nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'inquiry_reader') then create role inquiry_reader nologin noinherit; end if;
end $$;
grant inquiry_writer to authenticator;
grant inquiry_reader to authenticator;





-- Name: core; Type: SCHEMA; Schema: -; Owner: -

CREATE SCHEMA IF NOT EXISTS core;


-- Name: enforce_project_status_transition(); Type: FUNCTION; Schema: core; Owner: -

CREATE FUNCTION core.enforce_project_status_transition() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.status is distinct from old.status
     and not exists (
       select 1 from core.project_status_transitions t
       where t.from_status = old.status and t.to_status = new.status
     ) then
    raise exception '不正な案件ステータス遷移: % -> %', old.status, new.status using errcode = 'check_violation';
  end if;
  return new;
end$$;


-- Name: log_project_status_event(); Type: FUNCTION; Schema: core; Owner: -

CREATE FUNCTION core.log_project_status_event() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if tg_op = 'INSERT' then
    insert into core.project_status_events (project_id, from_status, to_status) values (new.id, null, new.status);
  elsif new.status is distinct from old.status then
    insert into core.project_status_events (project_id, from_status, to_status) values (new.id, old.status, new.status);
  end if;
  return new;
end$$;


-- Name: set_updated_at(); Type: FUNCTION; Schema: core; Owner: -

CREATE FUNCTION core.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;




-- Name: clients; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    public_name text NOT NULL,
    real_name text,
    is_public_name_allowed boolean DEFAULT false NOT NULL,
    industry text NOT NULL,
    size text,
    description text,
    logo_url text,
    website_url text,
    first_contact_date date,
    internal_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


-- Name: deliverables; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.deliverables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    kind text NOT NULL,
    name text NOT NULL,
    description text,
    url text,
    image_urls text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    product_id uuid,
    CONSTRAINT deliverables_subject_check CHECK ((num_nonnulls(project_id, product_id) = 1))
);


-- Name: inquiries; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.inquiries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    company text,
    email text NOT NULL,
    subject text,
    message text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    converted_client_id uuid,
    internal_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    auto_reply_id text,
    delivery_status text DEFAULT 'pending'::text NOT NULL,
    CONSTRAINT inquiries_delivery_status_check CHECK ((delivery_status = ANY (ARRAY['pending'::text, 'delivered'::text, 'bounced'::text]))),
    CONSTRAINT inquiries_status_check CHECK ((status = ANY (ARRAY['new'::text, 'responded'::text, 'converted'::text, 'archived'::text])))
);


-- Name: metrics; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    deliverable_id uuid,
    label text NOT NULL,
    achieved text NOT NULL,
    previous text,
    goal text,
    unit text,
    kind text DEFAULT 'business'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    product_id uuid,
    CONSTRAINT metrics_kind_check CHECK ((kind = ANY (ARRAY['technical'::text, 'business'::text]))),
    CONSTRAINT metrics_subject_check CHECK ((num_nonnulls(project_id, product_id) = 1))
);


-- Name: ndas; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.ndas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    reference text,
    agreed_on date,
    status text DEFAULT 'draft'::text NOT NULL,
    notes text,
    publish_problems boolean DEFAULT false NOT NULL,
    publish_deliverables boolean DEFAULT false NOT NULL,
    publish_metrics boolean DEFAULT false NOT NULL,
    publish_testimonial boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ndas_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'agreed'::text])))
);


-- Name: problems; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.problems (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    problem text NOT NULL,
    solution text,
    outcome text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    product_id uuid,
    CONSTRAINT problems_subject_check CHECK ((num_nonnulls(project_id, product_id) = 1))
);


-- Name: products; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    summary text,
    status text DEFAULT 'active'::text NOT NULL,
    tech_stack text[] DEFAULT '{}'::text[] NOT NULL,
    launched_on date,
    internal_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT products_status_check CHECK ((status = ANY (ARRAY['active'::text, 'maintained'::text, 'sunset'::text])))
);


-- Name: profile; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.profile (
    id text DEFAULT 'singleton'::text NOT NULL,
    display_name text NOT NULL,
    handle text NOT NULL,
    bio text,
    skills text[] DEFAULT '{}'::text[] NOT NULL,
    operation_policy text,
    contact_email text,
    social_links jsonb DEFAULT '[]'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tagline text,
    logo_svg text,
    CONSTRAINT profile_singleton_check CHECK ((id = 'singleton'::text))
);


-- Name: project_decisions; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.project_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    topic text NOT NULL,
    decision text NOT NULL,
    rationale text,
    internal_notes text,
    status text DEFAULT 'accepted'::text NOT NULL,
    superseded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT project_decisions_status_check CHECK ((status = ANY (ARRAY['accepted'::text, 'superseded'::text])))
);


-- Name: project_status_events; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.project_status_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    from_status text,
    to_status text NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);


-- Name: projects; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    title text NOT NULL,
    status text DEFAULT 'consultation'::text NOT NULL,
    started_on date,
    ended_on date,
    internal_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    service_id uuid,
    tech_stack text[] DEFAULT '{}'::text[] NOT NULL,
    testimonial jsonb,
    product_id uuid,
    due_on date,
    CONSTRAINT projects_date_order_check CHECK (((ended_on IS NULL) OR (started_on IS NULL) OR (ended_on >= started_on)))
);


-- Name: project_outcomes; Type: VIEW; Schema: core; Owner: -

CREATE VIEW core.project_outcomes AS
 SELECT id AS project_id,
    status,
        CASE
            WHEN (status <> 'closed'::text) THEN NULL::text
            ELSE ( SELECT
                    CASE e.from_status
                        WHEN 'delivered'::text THEN 'completed'::text
                        WHEN 'active'::text THEN 'cancelled'::text
                        ELSE 'lost'::text
                    END AS "case"
               FROM core.project_status_events e
              WHERE ((e.project_id = p.id) AND (e.to_status = 'closed'::text))
              ORDER BY e.changed_at DESC
             LIMIT 1)
        END AS outcome
   FROM core.projects p;


-- Name: project_repositories; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.project_repositories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    url text NOT NULL,
    role text,
    visibility text DEFAULT 'private'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT project_repositories_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'private'::text])))
);


-- Name: project_status_transitions; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.project_status_transitions (
    from_status text NOT NULL,
    to_status text NOT NULL,
    CONSTRAINT project_status_transitions_no_self CHECK ((from_status <> to_status))
);


-- Name: project_statuses; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.project_statuses (
    code text NOT NULL,
    label text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_initial boolean DEFAULT false NOT NULL,
    is_terminal boolean DEFAULT false NOT NULL
);


-- Name: public_profile; Type: VIEW; Schema: core; Owner: -

CREATE VIEW core.public_profile AS
 SELECT id,
    display_name,
    handle,
    bio,
    skills,
    operation_policy,
    contact_email,
    social_links,
    updated_at,
    tagline,
    logo_svg
   FROM core.profile;


-- Name: services; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    name_ja text,
    headline text,
    summary text,
    target_pains text[] DEFAULT '{}'::text[] NOT NULL,
    coverage text[] DEFAULT '{}'::text[] NOT NULL,
    details text,
    deliverables text[] DEFAULT '{}'::text[] NOT NULL,
    followups text[] DEFAULT '{}'::text[] NOT NULL,
    exclusions text[] DEFAULT '{}'::text[] NOT NULL,
    pricing jsonb,
    price_min integer,
    currency text DEFAULT 'JPY'::text NOT NULL,
    duration text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    display_priority integer DEFAULT 0 NOT NULL
);


-- Name: public_services; Type: VIEW; Schema: core; Owner: -

CREATE VIEW core.public_services AS
 SELECT id,
    slug,
    name,
    name_ja,
    headline,
    summary,
    target_pains,
    coverage,
    details,
    deliverables,
    followups,
    exclusions,
    pricing,
    price_min,
    currency,
    duration,
    is_active,
    created_at,
    updated_at,
    display_priority
   FROM core.services
  WHERE (is_active = true);


-- Name: showcase_deliverables; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.showcase_deliverables (
    showcase_id uuid NOT NULL,
    deliverable_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    display_priority integer DEFAULT 0 NOT NULL
);


-- Name: showcase_entries; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.showcase_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    slug text NOT NULL,
    title text NOT NULL,
    summary text,
    thumbnail_url text,
    period text,
    client_display text DEFAULT 'anonymized'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    display_priority integer DEFAULT 0 NOT NULL,
    product_id uuid,
    CONSTRAINT showcase_entries_client_display_check CHECK ((client_display = ANY (ARRAY['named'::text, 'anonymized'::text, 'hidden'::text]))),
    CONSTRAINT showcase_entries_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))),
    CONSTRAINT showcase_entries_subject_check CHECK ((num_nonnulls(project_id, product_id) = 1))
);


-- Name: showcase_metrics; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.showcase_metrics (
    showcase_id uuid NOT NULL,
    metric_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    display_priority integer DEFAULT 0 NOT NULL
);


-- Name: showcase_problems; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.showcase_problems (
    showcase_id uuid NOT NULL,
    problem_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    display_priority integer DEFAULT 0 NOT NULL
);


-- Name: public_showcases; Type: VIEW; Schema: core; Owner: -

CREATE VIEW core.public_showcases AS
 SELECT s.slug,
    s.title,
    s.summary,
    s.thumbnail_url,
    s.period,
    s.display_priority,
    s.project_id,
    s.product_id,
        CASE
            WHEN (s.product_id IS NOT NULL) THEN 'product'::text
            ELSE 'project'::text
        END AS subject_kind,
    COALESCE(p.tech_stack, pr.tech_stack) AS tech_stack,
        CASE
            WHEN n.publish_testimonial THEN p.testimonial
            ELSE NULL::jsonb
        END AS testimonial,
        CASE
            WHEN ((s.product_id IS NULL) AND (s.client_display = 'named'::text) AND c.is_public_name_allowed) THEN c.public_name
            ELSE NULL::text
        END AS client_name,
        CASE
            WHEN ((s.product_id IS NULL) AND (s.client_display = ANY (ARRAY['named'::text, 'anonymized'::text]))) THEN c.industry
            ELSE NULL::text
        END AS client_industry,
        CASE
            WHEN ((s.product_id IS NOT NULL) OR n.publish_problems) THEN COALESCE(( SELECT jsonb_agg(jsonb_build_object('problem', pr2.problem, 'solution', pr2.solution, 'outcome', pr2.outcome) ORDER BY sp.display_priority DESC) AS jsonb_agg
               FROM (core.showcase_problems sp
                 JOIN core.problems pr2 ON ((pr2.id = sp.problem_id)))
              WHERE (sp.showcase_id = s.id)), '[]'::jsonb)
            ELSE '[]'::jsonb
        END AS problems,
        CASE
            WHEN ((s.product_id IS NOT NULL) OR n.publish_deliverables) THEN COALESCE(( SELECT jsonb_agg(jsonb_build_object('kind', d.kind, 'name', d.name, 'url', d.url, 'images', d.image_urls) ORDER BY sd.display_priority DESC) AS jsonb_agg
               FROM (core.showcase_deliverables sd
                 JOIN core.deliverables d ON ((d.id = sd.deliverable_id)))
              WHERE (sd.showcase_id = s.id)), '[]'::jsonb)
            ELSE '[]'::jsonb
        END AS deliverables,
        CASE
            WHEN ((s.product_id IS NOT NULL) OR n.publish_metrics) THEN COALESCE(( SELECT jsonb_agg(jsonb_build_object('label', m.label, 'achieved', m.achieved, 'previous', m.previous, 'unit', m.unit, 'kind', m.kind) ORDER BY sm.display_priority DESC) AS jsonb_agg
               FROM (core.showcase_metrics sm
                 JOIN core.metrics m ON ((m.id = sm.metric_id)))
              WHERE (sm.showcase_id = s.id)), '[]'::jsonb)
            ELSE '[]'::jsonb
        END AS metrics
   FROM ((((core.showcase_entries s
     LEFT JOIN core.projects p ON ((p.id = s.project_id)))
     LEFT JOIN core.products pr ON ((pr.id = s.product_id)))
     LEFT JOIN core.ndas n ON ((n.project_id = p.id)))
     LEFT JOIN core.clients c ON ((c.id = p.client_id)))
  WHERE (s.status = 'published'::text);


-- Name: requirements; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    content text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


-- Name: scope_items; Type: TABLE; Schema: core; Owner: -

CREATE TABLE core.scope_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    item text NOT NULL,
    included boolean NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


-- Name: clients clients_slug_key; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.clients
    ADD CONSTRAINT clients_slug_key UNIQUE (slug);


-- Name: deliverables deliverables_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.deliverables
    ADD CONSTRAINT deliverables_pkey PRIMARY KEY (id);


-- Name: inquiries inquiries_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.inquiries
    ADD CONSTRAINT inquiries_pkey PRIMARY KEY (id);


-- Name: metrics metrics_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.metrics
    ADD CONSTRAINT metrics_pkey PRIMARY KEY (id);


-- Name: ndas ndas_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.ndas
    ADD CONSTRAINT ndas_pkey PRIMARY KEY (id);


-- Name: ndas ndas_project_id_key; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.ndas
    ADD CONSTRAINT ndas_project_id_key UNIQUE (project_id);


-- Name: problems problems_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.problems
    ADD CONSTRAINT problems_pkey PRIMARY KEY (id);


-- Name: products products_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


-- Name: products products_slug_key; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


-- Name: profile profile_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.profile
    ADD CONSTRAINT profile_pkey PRIMARY KEY (id);


-- Name: project_decisions project_decisions_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.project_decisions
    ADD CONSTRAINT project_decisions_pkey PRIMARY KEY (id);


-- Name: project_repositories project_repositories_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.project_repositories
    ADD CONSTRAINT project_repositories_pkey PRIMARY KEY (id);


-- Name: project_status_events project_status_events_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.project_status_events
    ADD CONSTRAINT project_status_events_pkey PRIMARY KEY (id);


-- Name: project_status_transitions project_status_transitions_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.project_status_transitions
    ADD CONSTRAINT project_status_transitions_pkey PRIMARY KEY (from_status, to_status);


-- Name: project_statuses project_statuses_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.project_statuses
    ADD CONSTRAINT project_statuses_pkey PRIMARY KEY (code);


-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


-- Name: requirements requirements_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.requirements
    ADD CONSTRAINT requirements_pkey PRIMARY KEY (id);


-- Name: scope_items scope_items_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.scope_items
    ADD CONSTRAINT scope_items_pkey PRIMARY KEY (id);


-- Name: services services_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


-- Name: services services_slug_key; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.services
    ADD CONSTRAINT services_slug_key UNIQUE (slug);


-- Name: showcase_deliverables showcase_deliverables_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.showcase_deliverables
    ADD CONSTRAINT showcase_deliverables_pkey PRIMARY KEY (showcase_id, deliverable_id);


-- Name: showcase_entries showcase_entries_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.showcase_entries
    ADD CONSTRAINT showcase_entries_pkey PRIMARY KEY (id);


-- Name: showcase_entries showcase_entries_slug_key; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.showcase_entries
    ADD CONSTRAINT showcase_entries_slug_key UNIQUE (slug);


-- Name: showcase_metrics showcase_metrics_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.showcase_metrics
    ADD CONSTRAINT showcase_metrics_pkey PRIMARY KEY (showcase_id, metric_id);


-- Name: showcase_problems showcase_problems_pkey; Type: CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.showcase_problems
    ADD CONSTRAINT showcase_problems_pkey PRIMARY KEY (showcase_id, problem_id);


-- Name: idx_deliverables_product; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_deliverables_product ON core.deliverables USING btree (product_id);


-- Name: idx_deliverables_project; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_deliverables_project ON core.deliverables USING btree (project_id);


-- Name: idx_inquiries_converted_client; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_inquiries_converted_client ON core.inquiries USING btree (converted_client_id);


-- Name: idx_inquiries_status; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_inquiries_status ON core.inquiries USING btree (status);


-- Name: idx_metrics_deliverable; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_metrics_deliverable ON core.metrics USING btree (deliverable_id);


-- Name: idx_metrics_product; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_metrics_product ON core.metrics USING btree (product_id);


-- Name: idx_metrics_project; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_metrics_project ON core.metrics USING btree (project_id);


-- Name: idx_problems_product; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_problems_product ON core.problems USING btree (product_id);


-- Name: idx_problems_project; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_problems_project ON core.problems USING btree (project_id);


-- Name: idx_project_decisions_project; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_project_decisions_project ON core.project_decisions USING btree (project_id);


-- Name: idx_project_decisions_superseded_by; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_project_decisions_superseded_by ON core.project_decisions USING btree (superseded_by);


-- Name: idx_project_repositories_project; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_project_repositories_project ON core.project_repositories USING btree (project_id);


-- Name: idx_project_status_events_project; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_project_status_events_project ON core.project_status_events USING btree (project_id, changed_at);


-- Name: idx_projects_client; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_projects_client ON core.projects USING btree (client_id);


-- Name: idx_projects_product; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_projects_product ON core.projects USING btree (product_id);


-- Name: idx_projects_service; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_projects_service ON core.projects USING btree (service_id);


-- Name: idx_projects_status; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_projects_status ON core.projects USING btree (status);


-- Name: idx_requirements_project; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_requirements_project ON core.requirements USING btree (project_id);


-- Name: idx_scope_items_project; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_scope_items_project ON core.scope_items USING btree (project_id);


-- Name: idx_services_active; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_services_active ON core.services USING btree (is_active);


-- Name: idx_services_priority; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_services_priority ON core.services USING btree (display_priority DESC);


-- Name: idx_showcase_entries_priority; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_showcase_entries_priority ON core.showcase_entries USING btree (display_priority DESC);


-- Name: idx_showcase_entries_product; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_showcase_entries_product ON core.showcase_entries USING btree (product_id);


-- Name: idx_showcase_entries_project; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_showcase_entries_project ON core.showcase_entries USING btree (project_id);


-- Name: idx_showcase_entries_status; Type: INDEX; Schema: core; Owner: -

CREATE INDEX idx_showcase_entries_status ON core.showcase_entries USING btree (status);


-- Name: clients set_updated_at_clients; Type: TRIGGER; Schema: core; Owner: -

CREATE TRIGGER set_updated_at_clients BEFORE UPDATE ON core.clients FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


-- Name: deliverables set_updated_at_deliverables; Type: TRIGGER; Schema: core; Owner: -

CREATE TRIGGER set_updated_at_deliverables BEFORE UPDATE ON core.deliverables FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


-- Name: inquiries set_updated_at_inquiries; Type: TRIGGER; Schema: core; Owner: -

CREATE TRIGGER set_updated_at_inquiries BEFORE UPDATE ON core.inquiries FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


-- Name: metrics set_updated_at_metrics; Type: TRIGGER; Schema: core; Owner: -

CREATE TRIGGER set_updated_at_metrics BEFORE UPDATE ON core.metrics FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


-- Name: ndas set_updated_at_ndas; Type: TRIGGER; Schema: core; Owner: -

CREATE TRIGGER set_updated_at_ndas BEFORE UPDATE ON core.ndas FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


-- Name: problems set_updated_at_problems; Type: TRIGGER; Schema: core; Owner: -

CREATE TRIGGER set_updated_at_problems BEFORE UPDATE ON core.problems FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


-- Name: products set_updated_at_products; Type: TRIGGER; Schema: core; Owner: -

CREATE TRIGGER set_updated_at_products BEFORE UPDATE ON core.products FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


-- Name: profile set_updated_at_profile; Type: TRIGGER; Schema: core; Owner: -

CREATE TRIGGER set_updated_at_profile BEFORE UPDATE ON core.profile FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


-- Name: project_decisions set_updated_at_project_decisions; Type: TRIGGER; Schema: core; Owner: -

CREATE TRIGGER set_updated_at_project_decisions BEFORE UPDATE ON core.project_decisions FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


-- Name: project_repositories set_updated_at_project_repositories; Type: TRIGGER; Schema: core; Owner: -

CREATE TRIGGER set_updated_at_project_repositories BEFORE UPDATE ON core.project_repositories FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


-- Name: projects set_updated_at_projects; Type: TRIGGER; Schema: core; Owner: -

CREATE TRIGGER set_updated_at_projects BEFORE UPDATE ON core.projects FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


-- Name: requirements set_updated_at_requirements; Type: TRIGGER; Schema: core; Owner: -

CREATE TRIGGER set_updated_at_requirements BEFORE UPDATE ON core.requirements FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


-- Name: scope_items set_updated_at_scope_items; Type: TRIGGER; Schema: core; Owner: -

CREATE TRIGGER set_updated_at_scope_items BEFORE UPDATE ON core.scope_items FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


-- Name: services set_updated_at_services; Type: TRIGGER; Schema: core; Owner: -

CREATE TRIGGER set_updated_at_services BEFORE UPDATE ON core.services FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


-- Name: showcase_entries set_updated_at_showcase_entries; Type: TRIGGER; Schema: core; Owner: -

CREATE TRIGGER set_updated_at_showcase_entries BEFORE UPDATE ON core.showcase_entries FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


-- Name: projects trg_project_status_event; Type: TRIGGER; Schema: core; Owner: -

CREATE TRIGGER trg_project_status_event AFTER INSERT OR UPDATE OF status ON core.projects FOR EACH ROW EXECUTE FUNCTION core.log_project_status_event();


-- Name: projects trg_project_status_transition; Type: TRIGGER; Schema: core; Owner: -

CREATE TRIGGER trg_project_status_transition BEFORE UPDATE OF status ON core.projects FOR EACH ROW EXECUTE FUNCTION core.enforce_project_status_transition();


-- Name: deliverables deliverables_product_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.deliverables
    ADD CONSTRAINT deliverables_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.products(id) ON DELETE CASCADE;


-- Name: deliverables deliverables_project_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.deliverables
    ADD CONSTRAINT deliverables_project_id_fkey FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE;


-- Name: inquiries inquiries_converted_client_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.inquiries
    ADD CONSTRAINT inquiries_converted_client_id_fkey FOREIGN KEY (converted_client_id) REFERENCES core.clients(id) ON DELETE SET NULL;


-- Name: metrics metrics_deliverable_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.metrics
    ADD CONSTRAINT metrics_deliverable_id_fkey FOREIGN KEY (deliverable_id) REFERENCES core.deliverables(id) ON DELETE SET NULL;


-- Name: metrics metrics_product_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.metrics
    ADD CONSTRAINT metrics_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.products(id) ON DELETE CASCADE;


-- Name: metrics metrics_project_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.metrics
    ADD CONSTRAINT metrics_project_id_fkey FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE;


-- Name: ndas ndas_project_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.ndas
    ADD CONSTRAINT ndas_project_id_fkey FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE;


-- Name: problems problems_product_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.problems
    ADD CONSTRAINT problems_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.products(id) ON DELETE CASCADE;


-- Name: problems problems_project_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.problems
    ADD CONSTRAINT problems_project_id_fkey FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE;


-- Name: project_decisions project_decisions_project_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.project_decisions
    ADD CONSTRAINT project_decisions_project_id_fkey FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE;


-- Name: project_decisions project_decisions_superseded_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.project_decisions
    ADD CONSTRAINT project_decisions_superseded_by_fkey FOREIGN KEY (superseded_by) REFERENCES core.project_decisions(id) ON DELETE SET NULL;


-- Name: project_repositories project_repositories_project_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.project_repositories
    ADD CONSTRAINT project_repositories_project_id_fkey FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE;


-- Name: project_status_events project_status_events_from_status_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.project_status_events
    ADD CONSTRAINT project_status_events_from_status_fkey FOREIGN KEY (from_status) REFERENCES core.project_statuses(code);


-- Name: project_status_events project_status_events_project_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.project_status_events
    ADD CONSTRAINT project_status_events_project_id_fkey FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE;


-- Name: project_status_events project_status_events_to_status_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.project_status_events
    ADD CONSTRAINT project_status_events_to_status_fkey FOREIGN KEY (to_status) REFERENCES core.project_statuses(code);


-- Name: project_status_transitions project_status_transitions_from_status_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.project_status_transitions
    ADD CONSTRAINT project_status_transitions_from_status_fkey FOREIGN KEY (from_status) REFERENCES core.project_statuses(code) ON DELETE CASCADE;


-- Name: project_status_transitions project_status_transitions_to_status_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.project_status_transitions
    ADD CONSTRAINT project_status_transitions_to_status_fkey FOREIGN KEY (to_status) REFERENCES core.project_statuses(code) ON DELETE CASCADE;


-- Name: projects projects_client_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.projects
    ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES core.clients(id) ON DELETE SET NULL;


-- Name: projects projects_product_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.projects
    ADD CONSTRAINT projects_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.products(id) ON DELETE SET NULL;


-- Name: projects projects_service_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.projects
    ADD CONSTRAINT projects_service_id_fkey FOREIGN KEY (service_id) REFERENCES core.services(id) ON DELETE SET NULL;


-- Name: projects projects_status_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.projects
    ADD CONSTRAINT projects_status_fkey FOREIGN KEY (status) REFERENCES core.project_statuses(code);


-- Name: requirements requirements_project_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.requirements
    ADD CONSTRAINT requirements_project_id_fkey FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE;


-- Name: scope_items scope_items_project_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.scope_items
    ADD CONSTRAINT scope_items_project_id_fkey FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE;


-- Name: showcase_deliverables showcase_deliverables_deliverable_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.showcase_deliverables
    ADD CONSTRAINT showcase_deliverables_deliverable_id_fkey FOREIGN KEY (deliverable_id) REFERENCES core.deliverables(id) ON DELETE CASCADE;


-- Name: showcase_deliverables showcase_deliverables_showcase_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.showcase_deliverables
    ADD CONSTRAINT showcase_deliverables_showcase_id_fkey FOREIGN KEY (showcase_id) REFERENCES core.showcase_entries(id) ON DELETE CASCADE;


-- Name: showcase_entries showcase_entries_product_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.showcase_entries
    ADD CONSTRAINT showcase_entries_product_id_fkey FOREIGN KEY (product_id) REFERENCES core.products(id) ON DELETE CASCADE;


-- Name: showcase_entries showcase_entries_project_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.showcase_entries
    ADD CONSTRAINT showcase_entries_project_id_fkey FOREIGN KEY (project_id) REFERENCES core.projects(id) ON DELETE CASCADE;


-- Name: showcase_metrics showcase_metrics_metric_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.showcase_metrics
    ADD CONSTRAINT showcase_metrics_metric_id_fkey FOREIGN KEY (metric_id) REFERENCES core.metrics(id) ON DELETE CASCADE;


-- Name: showcase_metrics showcase_metrics_showcase_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.showcase_metrics
    ADD CONSTRAINT showcase_metrics_showcase_id_fkey FOREIGN KEY (showcase_id) REFERENCES core.showcase_entries(id) ON DELETE CASCADE;


-- Name: showcase_problems showcase_problems_problem_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.showcase_problems
    ADD CONSTRAINT showcase_problems_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES core.problems(id) ON DELETE CASCADE;


-- Name: showcase_problems showcase_problems_showcase_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -

ALTER TABLE ONLY core.showcase_problems
    ADD CONSTRAINT showcase_problems_showcase_id_fkey FOREIGN KEY (showcase_id) REFERENCES core.showcase_entries(id) ON DELETE CASCADE;


-- Name: clients; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.clients ENABLE ROW LEVEL SECURITY;

-- Name: deliverables; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.deliverables ENABLE ROW LEVEL SECURITY;

-- Name: inquiries; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.inquiries ENABLE ROW LEVEL SECURITY;

-- Name: inquiries inquiries_reader_select; Type: POLICY; Schema: core; Owner: -

CREATE POLICY inquiries_reader_select ON core.inquiries FOR SELECT TO inquiry_reader USING (true);


-- Name: inquiries inquiries_reader_update; Type: POLICY; Schema: core; Owner: -

CREATE POLICY inquiries_reader_update ON core.inquiries FOR UPDATE TO inquiry_reader USING (true) WITH CHECK ((delivery_status = ANY (ARRAY['pending'::text, 'delivered'::text, 'bounced'::text])));


-- Name: inquiries inquiries_writer_insert; Type: POLICY; Schema: core; Owner: -

CREATE POLICY inquiries_writer_insert ON core.inquiries FOR INSERT TO inquiry_writer WITH CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100) AND (char_length(email) <= 254) AND (POSITION(('@'::text) IN (email)) > 1) AND ((char_length(message) >= 1) AND (char_length(message) <= 5000)) AND ((company IS NULL) OR (char_length(company) <= 100)) AND ((subject IS NULL) OR (char_length(subject) <= 200))));


-- Name: metrics; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.metrics ENABLE ROW LEVEL SECURITY;

-- Name: ndas; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.ndas ENABLE ROW LEVEL SECURITY;

-- Name: problems; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.problems ENABLE ROW LEVEL SECURITY;

-- Name: products; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.products ENABLE ROW LEVEL SECURITY;

-- Name: profile; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.profile ENABLE ROW LEVEL SECURITY;

-- Name: profile profile_anon_select; Type: POLICY; Schema: core; Owner: -

CREATE POLICY profile_anon_select ON core.profile FOR SELECT TO anon USING (true);


-- Name: project_decisions; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.project_decisions ENABLE ROW LEVEL SECURITY;

-- Name: project_repositories; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.project_repositories ENABLE ROW LEVEL SECURITY;

-- Name: project_status_events; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.project_status_events ENABLE ROW LEVEL SECURITY;

-- Name: project_status_transitions; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.project_status_transitions ENABLE ROW LEVEL SECURITY;

-- Name: project_statuses; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.project_statuses ENABLE ROW LEVEL SECURITY;

-- Name: projects; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.projects ENABLE ROW LEVEL SECURITY;

-- Name: requirements; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.requirements ENABLE ROW LEVEL SECURITY;

-- Name: scope_items; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.scope_items ENABLE ROW LEVEL SECURITY;

-- Name: services; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.services ENABLE ROW LEVEL SECURITY;

-- Name: services services_anon_select; Type: POLICY; Schema: core; Owner: -

CREATE POLICY services_anon_select ON core.services FOR SELECT TO anon USING ((is_active = true));


-- Name: showcase_deliverables; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.showcase_deliverables ENABLE ROW LEVEL SECURITY;

-- Name: showcase_entries; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.showcase_entries ENABLE ROW LEVEL SECURITY;

-- Name: showcase_metrics; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.showcase_metrics ENABLE ROW LEVEL SECURITY;

-- Name: showcase_problems; Type: ROW SECURITY; Schema: core; Owner: -

ALTER TABLE core.showcase_problems ENABLE ROW LEVEL SECURITY;

-- Name: SCHEMA core; Type: ACL; Schema: -; Owner: -

GRANT USAGE ON SCHEMA core TO anon;
GRANT USAGE ON SCHEMA core TO authenticated;
GRANT USAGE ON SCHEMA core TO service_role;
GRANT USAGE ON SCHEMA core TO inquiry_writer;
GRANT USAGE ON SCHEMA core TO inquiry_reader;


-- Name: FUNCTION enforce_project_status_transition(); Type: ACL; Schema: core; Owner: -

GRANT ALL ON FUNCTION core.enforce_project_status_transition() TO anon;
GRANT ALL ON FUNCTION core.enforce_project_status_transition() TO authenticated;
GRANT ALL ON FUNCTION core.enforce_project_status_transition() TO service_role;


-- Name: FUNCTION log_project_status_event(); Type: ACL; Schema: core; Owner: -

GRANT ALL ON FUNCTION core.log_project_status_event() TO anon;
GRANT ALL ON FUNCTION core.log_project_status_event() TO authenticated;
GRANT ALL ON FUNCTION core.log_project_status_event() TO service_role;


-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: core; Owner: -

GRANT ALL ON FUNCTION core.set_updated_at() TO anon;
GRANT ALL ON FUNCTION core.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION core.set_updated_at() TO service_role;


-- Name: TABLE clients; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.clients TO service_role;


-- Name: TABLE deliverables; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.deliverables TO service_role;


-- Name: TABLE inquiries; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.inquiries TO service_role;


-- Name: COLUMN inquiries.id; Type: ACL; Schema: core; Owner: -

GRANT SELECT(id) ON TABLE core.inquiries TO inquiry_reader;


-- Name: COLUMN inquiries.name; Type: ACL; Schema: core; Owner: -

GRANT INSERT(name) ON TABLE core.inquiries TO inquiry_writer;
GRANT SELECT(name) ON TABLE core.inquiries TO inquiry_reader;


-- Name: COLUMN inquiries.company; Type: ACL; Schema: core; Owner: -

GRANT INSERT(company) ON TABLE core.inquiries TO inquiry_writer;
GRANT SELECT(company) ON TABLE core.inquiries TO inquiry_reader;


-- Name: COLUMN inquiries.email; Type: ACL; Schema: core; Owner: -

GRANT INSERT(email) ON TABLE core.inquiries TO inquiry_writer;
GRANT SELECT(email) ON TABLE core.inquiries TO inquiry_reader;


-- Name: COLUMN inquiries.subject; Type: ACL; Schema: core; Owner: -

GRANT INSERT(subject) ON TABLE core.inquiries TO inquiry_writer;
GRANT SELECT(subject) ON TABLE core.inquiries TO inquiry_reader;


-- Name: COLUMN inquiries.message; Type: ACL; Schema: core; Owner: -

GRANT INSERT(message) ON TABLE core.inquiries TO inquiry_writer;
GRANT SELECT(message) ON TABLE core.inquiries TO inquiry_reader;


-- Name: COLUMN inquiries.auto_reply_id; Type: ACL; Schema: core; Owner: -

GRANT INSERT(auto_reply_id) ON TABLE core.inquiries TO inquiry_writer;
GRANT SELECT(auto_reply_id) ON TABLE core.inquiries TO inquiry_reader;


-- Name: COLUMN inquiries.delivery_status; Type: ACL; Schema: core; Owner: -

GRANT SELECT(delivery_status),UPDATE(delivery_status) ON TABLE core.inquiries TO inquiry_reader;


-- Name: TABLE metrics; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.metrics TO service_role;


-- Name: TABLE ndas; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.ndas TO service_role;


-- Name: TABLE problems; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.problems TO service_role;


-- Name: TABLE products; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.products TO service_role;


-- Name: TABLE profile; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.profile TO service_role;


-- Name: TABLE project_decisions; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.project_decisions TO service_role;


-- Name: TABLE project_status_events; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.project_status_events TO service_role;


-- Name: TABLE projects; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.projects TO service_role;


-- Name: TABLE project_outcomes; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.project_outcomes TO service_role;


-- Name: TABLE project_repositories; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.project_repositories TO service_role;


-- Name: TABLE project_status_transitions; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.project_status_transitions TO service_role;


-- Name: TABLE project_statuses; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.project_statuses TO service_role;


-- Name: TABLE public_profile; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.public_profile TO service_role;
GRANT SELECT ON TABLE core.public_profile TO anon;


-- Name: TABLE services; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.services TO service_role;


-- Name: TABLE public_services; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.public_services TO service_role;
GRANT SELECT ON TABLE core.public_services TO anon;


-- Name: TABLE showcase_deliverables; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.showcase_deliverables TO service_role;


-- Name: TABLE showcase_entries; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.showcase_entries TO service_role;


-- Name: TABLE showcase_metrics; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.showcase_metrics TO service_role;


-- Name: TABLE showcase_problems; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.showcase_problems TO service_role;


-- Name: TABLE public_showcases; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.public_showcases TO service_role;
GRANT SELECT ON TABLE core.public_showcases TO anon;


-- Name: TABLE requirements; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.requirements TO service_role;


-- Name: TABLE scope_items; Type: ACL; Schema: core; Owner: -

GRANT ALL ON TABLE core.scope_items TO service_role;


-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: core; Owner: -

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA core GRANT ALL ON SEQUENCES TO service_role;


-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: core; Owner: -

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA core GRANT ALL ON TABLES TO service_role;





-- 参照データ（状態マスタ：projects.status の FK 先・状態機械の許容遷移）。schema-only dump 非収録のため明示。
insert into core.project_statuses (code, label, sort_order, is_initial, is_terminal) values
  ('consultation', '無料相談', 1, true,  false),
  ('discovery',    '事前設計', 2, false, false),
  ('active',       '進行中',   3, false, false),
  ('delivered',    '納品済',   4, false, false),
  ('closed',       'クローズ', 5, false, true);
insert into core.project_status_transitions (from_status, to_status) values
  ('consultation', 'discovery'),
  ('consultation', 'closed'),
  ('discovery',    'active'),
  ('discovery',    'closed'),
  ('active',       'delivered'),
  ('active',       'closed'),
  ('delivered',    'closed');

-- postamble: public スキーマの封鎖（global）。
revoke all on schema public from anon, authenticated;
revoke create on schema public from public;

-- migrate:down
