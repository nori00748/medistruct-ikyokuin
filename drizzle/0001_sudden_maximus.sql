CREATE TABLE "ikyokuin_kibou_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kibou_request_id" uuid NOT NULL,
	"date" date NOT NULL,
	"priority" integer NOT NULL,
	CONSTRAINT "ikyokuin_kibou_dates_kibou_request_id_date_unique" UNIQUE("kibou_request_id","date")
);
--> statement-breakpoint
CREATE TABLE "ikyokuin_kibou_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"memo" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ikyokuin_kibou_requests_period_id_user_id_unique" UNIQUE("period_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "ikyokuin_kibou_dates" ADD CONSTRAINT "ikyokuin_kibou_dates_kibou_request_id_ikyokuin_kibou_requests_id_fk" FOREIGN KEY ("kibou_request_id") REFERENCES "public"."ikyokuin_kibou_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ikyokuin_kibou_requests" ADD CONSTRAINT "ikyokuin_kibou_requests_period_id_ikyokuin_shift_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."ikyokuin_shift_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ikyokuin_kibou_requests" ADD CONSTRAINT "ikyokuin_kibou_requests_user_id_ikyokuin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ikyokuin_users"("id") ON DELETE cascade ON UPDATE no action;