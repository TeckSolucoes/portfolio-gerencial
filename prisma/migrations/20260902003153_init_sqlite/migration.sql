-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "fronts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary_html" TEXT NOT NULL,
    "status_mode" TEXT NOT NULL DEFAULT 'manual',
    "status_manual" TEXT,
    "progress_mode" TEXT NOT NULL DEFAULT 'manual',
    "progress_manual" INTEGER,
    "owner_name" TEXT NOT NULL,
    "owner_initials" TEXT NOT NULL,
    "next_milestone" TEXT,
    "next_date" DATETIME,
    "prioritized" BOOLEAN NOT NULL DEFAULT false,
    "jql" TEXT,
    "epic_keys" TEXT NOT NULL DEFAULT '[]',
    "sort_order" INTEGER NOT NULL,
    "archived_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "fronts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "front_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "front_id" TEXT NOT NULL,
    "jira_issue_key" TEXT,
    "title_override" TEXT,
    "status_override" TEXT,
    "note" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "front_items_front_id_fkey" FOREIGN KEY ("front_id") REFERENCES "fronts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "jira_status_mappings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jira_status_name" TEXT NOT NULL,
    "mapped_status" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "jira_sync_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" DATETIME,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "triggered_by" TEXT
);

-- CreateTable
CREATE TABLE "jira_issue_cache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jira_issue_key" TEXT NOT NULL,
    "jira_issue_type" TEXT,
    "parent_epic_key" TEXT,
    "summary" TEXT,
    "jira_status_name" TEXT,
    "due_date" DATETIME,
    "updated_at_jira" DATETIME,
    "raw_json" JSONB NOT NULL,
    "last_synced_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'visualizador',
    "display_name" TEXT NOT NULL,
    "display_title" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "fronts_company_id_slug_key" ON "fronts"("company_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "front_items_front_id_jira_issue_key_key" ON "front_items"("front_id", "jira_issue_key");

-- CreateIndex
CREATE UNIQUE INDEX "jira_status_mappings_jira_status_name_key" ON "jira_status_mappings"("jira_status_name");

-- CreateIndex
CREATE UNIQUE INDEX "jira_issue_cache_jira_issue_key_key" ON "jira_issue_cache"("jira_issue_key");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
