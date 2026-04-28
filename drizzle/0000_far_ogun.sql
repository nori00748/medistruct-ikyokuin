CREATE TABLE "ikyokuin_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"target_duty_weekday" integer DEFAULT 0,
	"target_duty_weekend" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ikyokuin_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid NOT NULL,
	"token" text NOT NULL,
	"group_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ikyokuin_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "ikyokuin_medical_departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"university" text,
	"plan" text DEFAULT 'free' NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ikyokuin_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"group_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	CONSTRAINT "ikyokuin_memberships_user_id_department_id_unique" UNIQUE("user_id","department_id")
);
--> statement-breakpoint
CREATE TABLE "ikyokuin_shift_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"confirmed_by_user_id" uuid,
	"kibou_deadline" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ikyokuin_shift_periods_department_id_year_month_unique" UNIQUE("department_id","year","month")
);
--> statement-breakpoint
CREATE TABLE "ikyokuin_shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"date" date NOT NULL,
	"type" text NOT NULL,
	"label" text,
	"assigned_user_id" uuid,
	"start_time" time,
	"end_time" time,
	"is_split" boolean DEFAULT false NOT NULL,
	"split_role" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ikyokuin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ikyokuin_users_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "ikyokuin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ikyokuin_groups" ADD CONSTRAINT "ikyokuin_groups_department_id_ikyokuin_medical_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."ikyokuin_medical_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ikyokuin_invitations" ADD CONSTRAINT "ikyokuin_invitations_department_id_ikyokuin_medical_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."ikyokuin_medical_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ikyokuin_invitations" ADD CONSTRAINT "ikyokuin_invitations_group_id_ikyokuin_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."ikyokuin_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ikyokuin_invitations" ADD CONSTRAINT "ikyokuin_invitations_created_by_user_id_ikyokuin_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."ikyokuin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ikyokuin_medical_departments" ADD CONSTRAINT "ikyokuin_medical_departments_owner_user_id_ikyokuin_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."ikyokuin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ikyokuin_memberships" ADD CONSTRAINT "ikyokuin_memberships_user_id_ikyokuin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ikyokuin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ikyokuin_memberships" ADD CONSTRAINT "ikyokuin_memberships_department_id_ikyokuin_medical_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."ikyokuin_medical_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ikyokuin_memberships" ADD CONSTRAINT "ikyokuin_memberships_group_id_ikyokuin_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."ikyokuin_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ikyokuin_shift_periods" ADD CONSTRAINT "ikyokuin_shift_periods_department_id_ikyokuin_medical_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."ikyokuin_medical_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ikyokuin_shift_periods" ADD CONSTRAINT "ikyokuin_shift_periods_confirmed_by_user_id_ikyokuin_users_id_fk" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."ikyokuin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ikyokuin_shifts" ADD CONSTRAINT "ikyokuin_shifts_period_id_ikyokuin_shift_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."ikyokuin_shift_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ikyokuin_shifts" ADD CONSTRAINT "ikyokuin_shifts_assigned_user_id_ikyokuin_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."ikyokuin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ikyokuin_memberships_department_id_index" ON "ikyokuin_memberships" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "ikyokuin_memberships_user_id_index" ON "ikyokuin_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ikyokuin_shifts_period_id_date_index" ON "ikyokuin_shifts" USING btree ("period_id","date");--> statement-breakpoint
CREATE INDEX "ikyokuin_shifts_assigned_user_id_date_index" ON "ikyokuin_shifts" USING btree ("assigned_user_id","date");