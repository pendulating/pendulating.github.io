export type BlogCollectionName = "blog" | "meBlog";
export type ProjectCollectionName = "projects" | "meProjects";
export type AlbumCollectionName = "albums" | "meAlbums";
export type SnipCollectionName = "snips" | "meSnips";
export type PlaylistCollectionName = "playlists" | "mePlaylists";

export type FlairId = "academic" | "me";

export interface FlairConfig {
  id: FlairId;
  basePath: "/" | "/me";
  label: string;
  homeTitle: string;
  blogCollection: BlogCollectionName;
  projectsCollection: ProjectCollectionName;
  albumsCollection: AlbumCollectionName;
  snipsCollection: SnipCollectionName;
  playlistsCollection: PlaylistCollectionName;
}

export const FLAIRS: Record<FlairId, FlairConfig> = {
  academic: {
    id: "academic",
    basePath: "/",
    label: "Academic",
    homeTitle: "Academic",
    blogCollection: "blog",
    projectsCollection: "projects",
    albumsCollection: "albums",
    snipsCollection: "snips",
    playlistsCollection: "playlists",
  },
  me: {
    id: "me",
    basePath: "/me",
    label: "Me",
    homeTitle: "Me",
    blogCollection: "meBlog",
    projectsCollection: "meProjects",
    albumsCollection: "meAlbums",
    snipsCollection: "meSnips",
    playlistsCollection: "mePlaylists",
  },
};

export const toFlairPath = (basePath: "/" | "/me", route: string) => {
  const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
  if (basePath === "/") return normalizedRoute;
  return `${basePath}${normalizedRoute}`;
};
