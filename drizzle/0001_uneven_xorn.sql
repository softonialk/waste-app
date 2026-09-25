CREATE TABLE `submission_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`window_start` integer NOT NULL,
	`attempts` integer DEFAULT 1 NOT NULL
);
