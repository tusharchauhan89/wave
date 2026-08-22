export interface Playlist {
  id: string;
  name: string;
  description?: string;
  is_public?: boolean;
  user_id?: string;
  created_at?: string;
  songs?: any[];
  cover?: string;
}