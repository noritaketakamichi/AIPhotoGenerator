ALTER TABLE "generated_photos" ADD CONSTRAINT "generated_photos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_photos" ADD CONSTRAINT "generated_photos_model_id_training_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."training_models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_models" ADD CONSTRAINT "training_models_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;