import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "tracks_played" (
     "id" serial PRIMARY KEY NOT NULL,
     "playlist_event_id" varchar,
     "artist_name" varchar NOT NULL,
     "track_name" varchar NOT NULL,
     "album_name" varchar,
     "label_name" varchar,
     "album_art_url" varchar,
     "fallback_image_id" integer,
     "dj_name" varchar NOT NULL,
     "show_name" varchar,
     "is_local" boolean DEFAULT false,
     "played_at" timestamp(3) with time zone NOT NULL,
     "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
     "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
   );

   CREATE INDEX "idx_tracks_played_playlist_event_id" ON "tracks_played" USING btree ("playlist_event_id");
   CREATE INDEX "idx_tracks_played_artist_name" ON "tracks_played" USING btree ("artist_name");
   CREATE INDEX "idx_tracks_played_track_name" ON "tracks_played" USING btree ("track_name");
   CREATE INDEX "idx_tracks_played_dj_name" ON "tracks_played" USING btree ("dj_name");
   CREATE INDEX "idx_tracks_played_played_at" ON "tracks_played" USING btree ("played_at");
   CREATE INDEX "idx_tracks_played_fallback_image_id" ON "tracks_played" USING btree ("fallback_image_id");

   ALTER TABLE "tracks_played" ADD CONSTRAINT "tracks_played_fallback_image_id_player_fallback_images_id_fk" FOREIGN KEY ("fallback_image_id") REFERENCES "player_fallback_images"("id") ON DELETE set null ON UPDATE no action;
  `)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "tracks_played" CASCADE;
  `)
}
