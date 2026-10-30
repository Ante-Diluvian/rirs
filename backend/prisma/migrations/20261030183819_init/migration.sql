-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "librarium";

-- CreateEnum
CREATE TYPE "librarium"."Role" AS ENUM ('READER', 'LIBRARIAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "librarium"."CopyStatus" AS ENUM ('AVAILABLE', 'ON_LOAN', 'RESERVED', 'LOST');

-- CreateEnum
CREATE TYPE "librarium"."LoanStatus" AS ENUM ('ACTIVE', 'OVERDUE', 'RETURNED');

-- CreateEnum
CREATE TYPE "librarium"."ReservationStatus" AS ENUM ('WAITING', 'READY', 'FULFILLED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "librarium"."member" (
    "id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "librarium"."Role" NOT NULL DEFAULT 'READER',
    "phone" VARCHAR(30),
    "city" VARCHAR(100),
    "joined_on" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "librarium"."author" (
    "id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "birth_date" DATE,
    "country" VARCHAR(100),
    "biography" TEXT,

    CONSTRAINT "author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "librarium"."book" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "isbn" CHAR(13) NOT NULL,
    "publication_year" INTEGER,
    "page_count" INTEGER,
    "genre" VARCHAR(100) NOT NULL,
    "language" VARCHAR(50),
    "description" TEXT,
    "price" DECIMAL(8,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "librarium"."book_author" (
    "book_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,

    CONSTRAINT "book_author_pkey" PRIMARY KEY ("book_id","author_id")
);

-- CreateTable
CREATE TABLE "librarium"."copy" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "inventory_number" VARCHAR(20) NOT NULL,
    "status" "librarium"."CopyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "purchased_on" DATE,
    "shelf" VARCHAR(50),

    CONSTRAINT "copy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "librarium"."loan" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "copy_id" UUID NOT NULL,
    "librarian_id" UUID NOT NULL,
    "loaned_on" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "returned_on" DATE,
    "extension_count" INTEGER NOT NULL DEFAULT 0,
    "status" "librarium"."LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "fine_amount" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "fine_paid" BOOLEAN NOT NULL DEFAULT false,
    "fine_waived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "librarium"."reservation" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "copy_id" UUID,
    "status" "librarium"."ReservationStatus" NOT NULL DEFAULT 'WAITING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ready_until" DATE,

    CONSTRAINT "reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "librarium"."setting" (
    "key" VARCHAR(50) NOT NULL,
    "value" VARCHAR(100) NOT NULL,

    CONSTRAINT "setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "member_email_key" ON "librarium"."member"("email");

-- CreateIndex
CREATE INDEX "member_last_name_first_name_idx" ON "librarium"."member"("last_name", "first_name");

-- CreateIndex
CREATE INDEX "author_last_name_first_name_idx" ON "librarium"."author"("last_name", "first_name");

-- CreateIndex
CREATE UNIQUE INDEX "book_isbn_key" ON "librarium"."book"("isbn");

-- CreateIndex
CREATE INDEX "book_title_idx" ON "librarium"."book"("title");

-- CreateIndex
CREATE INDEX "book_genre_idx" ON "librarium"."book"("genre");

-- CreateIndex
CREATE INDEX "book_author_author_id_idx" ON "librarium"."book_author"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "copy_inventory_number_key" ON "librarium"."copy"("inventory_number");

-- CreateIndex
CREATE INDEX "copy_book_id_status_idx" ON "librarium"."copy"("book_id", "status");

-- CreateIndex
CREATE INDEX "loan_member_id_status_idx" ON "librarium"."loan"("member_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "loan_one_open_per_copy" ON "librarium"."loan"("copy_id") WHERE (status <> 'RETURNED');

-- CreateIndex
CREATE INDEX "reservation_book_id_status_created_at_idx" ON "librarium"."reservation"("book_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reservation_one_active_per_member_book" ON "librarium"."reservation"("member_id", "book_id") WHERE (status = 'WAITING' OR status = 'READY');

-- AddForeignKey
ALTER TABLE "librarium"."book_author" ADD CONSTRAINT "book_author_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "librarium"."book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "librarium"."book_author" ADD CONSTRAINT "book_author_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "librarium"."author"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "librarium"."copy" ADD CONSTRAINT "copy_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "librarium"."book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "librarium"."loan" ADD CONSTRAINT "loan_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "librarium"."member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "librarium"."loan" ADD CONSTRAINT "loan_librarian_id_fkey" FOREIGN KEY ("librarian_id") REFERENCES "librarium"."member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "librarium"."loan" ADD CONSTRAINT "loan_copy_id_fkey" FOREIGN KEY ("copy_id") REFERENCES "librarium"."copy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "librarium"."reservation" ADD CONSTRAINT "reservation_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "librarium"."member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "librarium"."reservation" ADD CONSTRAINT "reservation_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "librarium"."book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "librarium"."reservation" ADD CONSTRAINT "reservation_copy_id_fkey" FOREIGN KEY ("copy_id") REFERENCES "librarium"."copy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

