import type { Request, RequestItem } from "@/interfaces/Request";

export interface IncomingPair {
  request: Request;
  item: RequestItem;
}

/** Flattens incoming requests into one (request, item) pair per part line. A request with no items contributes nothing. */
export function flattenIncoming(requests: Request[]): IncomingPair[] {
  return requests.flatMap((request) => (request.items ?? []).map((item) => ({ request, item })));
}
