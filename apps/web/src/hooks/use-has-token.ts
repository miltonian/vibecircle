import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface TokenCheckResponse {
  hasToken: boolean
}

/**
 * Poll /api/settings/token/check to detect when the plugin is connected.
 * @param poll - if true, refreshes every 3 seconds (for setup page waiting state)
 */
export function useHasToken(poll = false) {
  return useSWR<TokenCheckResponse>(
    "/api/settings/token/check",
    fetcher,
    {
      refreshInterval: poll ? 3000 : 0,
      revalidateOnFocus: true,
    }
  )
}
