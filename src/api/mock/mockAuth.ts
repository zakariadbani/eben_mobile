import { API_MODE } from "../config";
import type { AuthSession } from "../resources/auth";
import { mockProfile } from "./mockOrders";
import { mockPrestataireProfile } from "./mockPrestataire";

type MockRole = "client" | "prestataire";

export function getMockAuthSession(role?: MockRole): AuthSession | null {
  if (API_MODE !== "mock" || !role) return null;

  const profile =
    role === "client" ? mockProfile : mockPrestataireProfile;
  const token = `mock-${role}-token`;

  return {
    source: "mock",
    token,
    user: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      avatar: profile.avatar,
      role: role === "client" ? "client" : "ferrailleur",
      status: profile.status,
      token,
    },
  };
}
