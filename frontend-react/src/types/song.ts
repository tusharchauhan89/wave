export interface ArtistImage {
  quality: string;
  url: string;
}

export interface Artist {
  id: string;
  name: string;
  role: string;
  image: ArtistImage[];
  type: string;
  url: string;
}

export interface Album {
  id: string;
  name: string;
  url: string;
}

export interface SongImage {
  quality: string;
  url: string;
}

export interface Song {
  id: string;
  name: string;
  type: string;
  year: string;
  duration: number;
  language: string;
  playCount: number;
  url: string;

  image: SongImage[];

  album: Album;

  artists: {
    primary: Artist[];
    featured: Artist[];
    all: Artist[];
  };
}