jest.mock("@/api/config", () => ({ API_MODE: "mock" }));

import { getMockAuthSession } from "../mockAuth";

it.each([
  ["client", "client", 1],
  ["prestataire", "ferrailleur", 10],
] as const)(
  "builds a valid %s simulator session",
  (requestedRole, serverRole, userId) => {
    const session = getMockAuthSession(requestedRole);

    expect(session).toMatchObject({
      source: "mock",
      user: { id: userId, role: serverRole, status: "active" },
    });
    expect(session?.token).toBe(session?.user.token);
  },
);
