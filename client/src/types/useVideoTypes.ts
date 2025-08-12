import type { Video } from "./graphql";

export type UseVideoReturn = {
  videos: Video[];
  loading: boolean;
  error: string | null;
};
