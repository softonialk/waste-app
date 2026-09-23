CREATE TABLE `collection_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`household_name` text NOT NULL,
	`phone` text NOT NULL,
	`address` text NOT NULL,
	`waste_type` text NOT NULL,
	`quantity` text NOT NULL,
	`pickup_date` text NOT NULL,
	`pickup_time` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`collector_id` text,
	`collector_name` text,
	`recorded_weight` real,
	`coins_awarded` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `collectors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`service_area` text NOT NULL,
	`organization` text DEFAULT 'Independent Collector' NOT NULL,
	`verification_status` text DEFAULT 'Verification Pending' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`collector_id` text NOT NULL,
	`reward_name` text NOT NULL,
	`points` integer NOT NULL,
	`reference` text NOT NULL,
	`created_at` text NOT NULL
);
