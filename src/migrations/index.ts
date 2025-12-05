import * as migration_20251118_152735_initial from './20251118_152735_initial';
import * as migration_20251205_023400_add_tracks_played from './20251205_023400_add_tracks_played';

export const migrations = [
  {
    up: migration_20251118_152735_initial.up,
    down: migration_20251118_152735_initial.down,
    name: '20251118_152735_initial'
  },
  {
    up: migration_20251205_023400_add_tracks_played.up,
    down: migration_20251205_023400_add_tracks_played.down,
    name: '20251205_023400_add_tracks_played'
  },
];
