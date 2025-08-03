import { QueryClient, useQuery } from "@tanstack/react-query";
import { httpClient } from "./httpclient";
import { useAuthContext } from "../context/AuthContext";

export const queryClient = new QueryClient();

export function useFeedPosts(ownFeed: boolean, page = 1, limit = 20) {
  const { jwt } = useAuthContext();
  return useQuery({
    queryKey: ["feedPosts", ownFeed, page, limit],
    queryFn: () =>
      httpClient("/feed", {
        method: "POST",
        query: { page, limit },
        body: { ownFeed },
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      }),
    enabled: !!jwt, // only run if JWT is available
    staleTime: 1000 * 30, // 30s
  });
}