-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "company" TEXT,
    "cnpj" TEXT,
    "activity" TEXT,
    "mei_since" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'active',
    "subscription_plan" TEXT NOT NULL DEFAULT 'free',
    "subscription_expires_at" TIMESTAMP(3),
    "das_multa_pct" DECIMAL(5,2) NOT NULL DEFAULT 2.00,
    "das_juros_pct" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "last_seen_at" TIMESTAMP(3),
    "lifecycle_notified" JSONB NOT NULL DEFAULT '{}',
    "is_trial" BOOLEAN NOT NULL DEFAULT false,
    "trial_activated_at" TIMESTAMP(3),
    "email_confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Outros',
    "value" DECIMAL(10,2) NOT NULL,
    "date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#7C3AED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "das_payments" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "competencia" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "das_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "status" TEXT NOT NULL DEFAULT 'novo',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_notes" (
    "id" BIGSERIAL NOT NULL,
    "contact_id" UUID NOT NULL,
    "contact_type" TEXT NOT NULL DEFAULT 'lead',
    "content" TEXT NOT NULL,
    "interaction_type" TEXT NOT NULL DEFAULT 'note',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "map_leads" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "business_name" TEXT NOT NULL,
    "phone" TEXT,
    "phone2" TEXT,
    "email" TEXT,
    "website" TEXT,
    "rating" DECIMAL(2,1),
    "reviews_count" INTEGER NOT NULL DEFAULT 0,
    "google_maps_url" TEXT,
    "place_id" TEXT,
    "estado" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "cidade" TEXT,
    "bairro" TEXT,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "nicho" TEXT NOT NULL,
    "categoria" TEXT,
    "subcategoria" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'novo',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "notes" TEXT,
    "ultimo_contato" TIMESTAMP(3),
    "proximo_contato" TIMESTAMP(3),
    "fonte" TEXT NOT NULL DEFAULT 'google_maps',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "map_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "map_lead_nichos" (
    "id" SERIAL NOT NULL,
    "nicho" TEXT NOT NULL,
    "categorias" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emoji" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 99,

    CONSTRAINT "map_lead_nichos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "terms_version" TEXT NOT NULL,
    "privacy_version" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "before_data" JSONB,
    "after_data" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lgpd_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "lgpd_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activations" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,

    CONSTRAINT "activations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elet_activations" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "activated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,

    CONSTRAINT "elet_activations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_date_idx" ON "transactions"("user_id", "date");

-- CreateIndex
CREATE INDEX "transactions_user_id_type_date_idx" ON "transactions"("user_id", "type", "date");

-- CreateIndex
CREATE INDEX "transactions_user_id_status_date_idx" ON "transactions"("user_id", "status", "date");

-- CreateIndex
CREATE INDEX "categories_user_id_idx" ON "categories"("user_id");

-- CreateIndex
CREATE INDEX "das_payments_user_id_idx" ON "das_payments"("user_id");

-- CreateIndex
CREATE INDEX "das_payments_user_id_competencia_idx" ON "das_payments"("user_id", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "leads_email_key" ON "leads"("email");

-- CreateIndex
CREATE INDEX "crm_notes_contact_id_idx" ON "crm_notes"("contact_id");

-- CreateIndex
CREATE INDEX "map_leads_user_id_idx" ON "map_leads"("user_id");

-- CreateIndex
CREATE INDEX "map_leads_user_id_status_idx" ON "map_leads"("user_id", "status");

-- CreateIndex
CREATE INDEX "map_leads_user_id_nicho_idx" ON "map_leads"("user_id", "nicho");

-- CreateIndex
CREATE INDEX "map_leads_place_id_idx" ON "map_leads"("place_id");

-- CreateIndex
CREATE UNIQUE INDEX "map_lead_nichos_nicho_key" ON "map_lead_nichos"("nicho");

-- CreateIndex
CREATE INDEX "consents_user_id_idx" ON "consents"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "lgpd_requests_user_id_idx" ON "lgpd_requests"("user_id");

-- CreateIndex
CREATE INDEX "activations_email_idx" ON "activations"("email");

-- CreateIndex
CREATE INDEX "elet_activations_email_idx" ON "elet_activations"("email");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "das_payments" ADD CONSTRAINT "das_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "map_leads" ADD CONSTRAINT "map_leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lgpd_requests" ADD CONSTRAINT "lgpd_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
