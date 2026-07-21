CREATE TABLE "bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"question_id" text NOT NULL,
	"exam_id" integer NOT NULL,
	"exam_name" text NOT NULL,
	"question_text" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_answer" text NOT NULL,
	"date" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"exam_name" text NOT NULL,
	"department" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"exam_date" text NOT NULL,
	"official_link" text,
	"expected_vacancies" integer,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"exam_id" integer NOT NULL,
	"score" integer NOT NULL,
	"answers" jsonb NOT NULL,
	"date" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"duration" integer NOT NULL,
	"total_questions" integer NOT NULL,
	"type" text NOT NULL,
	"questions" jsonb NOT NULL,
	"answer_key_uploaded" boolean DEFAULT false,
	"subject" text,
	"difficulty" text,
	"total_vacancies" text,
	"exam_date" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leaderboard_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "leaderboard_summary_type_unique" UNIQUE("type")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"type" text NOT NULL,
	"link" text,
	"date" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"thumbnail" text,
	"meta_title" text,
	"meta_desc" text,
	"slug" text,
	"views" integer DEFAULT 0,
	"date" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"focus_keyword" text,
	"tags" text,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"endpoint" text NOT NULL,
	"auth" text NOT NULL,
	"p256dh" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text,
	"phone" text,
	"password" text,
	"name" text,
	"category" text,
	"dob" text,
	"address" text,
	"role" text DEFAULT 'user',
	"is_blocked" boolean DEFAULT false,
	"subscription_plan" text DEFAULT 'free',
	"subscription_expiry" timestamp,
	"allowed_exams" integer DEFAULT 3,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "wishlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"exam_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;