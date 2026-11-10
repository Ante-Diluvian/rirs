ALTER TABLE "librarium"."loan" ADD CONSTRAINT "loan_extension_count_range" CHECK ("extension_count" BETWEEN 0 AND 2);
ALTER TABLE "librarium"."loan" ADD CONSTRAINT "loan_due_after_loaned" CHECK ("due_date" >= "loaned_on");
