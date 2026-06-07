-- migrate:up





-- Name: studio; Type: SCHEMA; Schema: -; Owner: -

CREATE SCHEMA IF NOT EXISTS studio;


-- Name: set_updated_at(); Type: FUNCTION; Schema: studio; Owner: -

CREATE FUNCTION studio.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;




-- Name: command_runs; Type: TABLE; Schema: studio; Owner: -

CREATE TABLE studio.command_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    command text NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    output text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    CONSTRAINT command_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'ok'::text, 'error'::text])))
);


-- Name: extractions; Type: TABLE; Schema: studio; Owner: -

CREATE TABLE studio.extractions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    project_id text NOT NULL,
    graph jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


-- Name: record_versions; Type: TABLE; Schema: studio; Owner: -

CREATE TABLE studio.record_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    collection text NOT NULL,
    record_id text NOT NULL,
    fields jsonb NOT NULL,
    origin text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


-- Name: records; Type: TABLE; Schema: studio; Owner: -

CREATE TABLE studio.records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    collection text NOT NULL,
    source_id uuid,
    fields jsonb NOT NULL,
    draft_state text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT records_draft_state_check CHECK ((draft_state = ANY (ARRAY['draft'::text, 'published'::text])))
);


-- Name: command_runs command_runs_pkey; Type: CONSTRAINT; Schema: studio; Owner: -

ALTER TABLE ONLY studio.command_runs
    ADD CONSTRAINT command_runs_pkey PRIMARY KEY (id);


-- Name: extractions extractions_pkey; Type: CONSTRAINT; Schema: studio; Owner: -

ALTER TABLE ONLY studio.extractions
    ADD CONSTRAINT extractions_pkey PRIMARY KEY (id);


-- Name: record_versions record_versions_pkey; Type: CONSTRAINT; Schema: studio; Owner: -

ALTER TABLE ONLY studio.record_versions
    ADD CONSTRAINT record_versions_pkey PRIMARY KEY (id);


-- Name: records records_pkey; Type: CONSTRAINT; Schema: studio; Owner: -

ALTER TABLE ONLY studio.records
    ADD CONSTRAINT records_pkey PRIMARY KEY (id);


-- Name: idx_command_runs_tenant; Type: INDEX; Schema: studio; Owner: -

CREATE INDEX idx_command_runs_tenant ON studio.command_runs USING btree (tenant_id, created_at DESC);


-- Name: idx_extractions_tenant; Type: INDEX; Schema: studio; Owner: -

CREATE INDEX idx_extractions_tenant ON studio.extractions USING btree (tenant_id, created_at DESC);


-- Name: idx_record_versions_record; Type: INDEX; Schema: studio; Owner: -

CREATE INDEX idx_record_versions_record ON studio.record_versions USING btree (tenant_id, collection, record_id, created_at DESC);


-- Name: idx_records_tenant_collection; Type: INDEX; Schema: studio; Owner: -

CREATE INDEX idx_records_tenant_collection ON studio.records USING btree (tenant_id, collection);


-- Name: records set_updated_at_records; Type: TRIGGER; Schema: studio; Owner: -

CREATE TRIGGER set_updated_at_records BEFORE UPDATE ON studio.records FOR EACH ROW EXECUTE FUNCTION studio.set_updated_at();


-- Name: command_runs; Type: ROW SECURITY; Schema: studio; Owner: -

ALTER TABLE studio.command_runs ENABLE ROW LEVEL SECURITY;

-- Name: extractions; Type: ROW SECURITY; Schema: studio; Owner: -

ALTER TABLE studio.extractions ENABLE ROW LEVEL SECURITY;

-- Name: record_versions; Type: ROW SECURITY; Schema: studio; Owner: -

ALTER TABLE studio.record_versions ENABLE ROW LEVEL SECURITY;

-- Name: records; Type: ROW SECURITY; Schema: studio; Owner: -

ALTER TABLE studio.records ENABLE ROW LEVEL SECURITY;

-- Name: SCHEMA studio; Type: ACL; Schema: -; Owner: -

GRANT USAGE ON SCHEMA studio TO service_role;


-- Name: TABLE command_runs; Type: ACL; Schema: studio; Owner: -

GRANT ALL ON TABLE studio.command_runs TO service_role;


-- Name: TABLE extractions; Type: ACL; Schema: studio; Owner: -

GRANT ALL ON TABLE studio.extractions TO service_role;


-- Name: TABLE record_versions; Type: ACL; Schema: studio; Owner: -

GRANT ALL ON TABLE studio.record_versions TO service_role;


-- Name: TABLE records; Type: ACL; Schema: studio; Owner: -

GRANT ALL ON TABLE studio.records TO service_role;


-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: studio; Owner: -

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA studio GRANT ALL ON TABLES TO service_role;





-- migrate:down
