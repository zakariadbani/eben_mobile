import React from "react";
import { render } from "@testing-library/react-native";
import { Role } from "@/context/AuthContext";
import WithRole from "@/components/common/WithRole";
import { Text } from "react-native";

// Mock useSession
jest.mock("@/context/AuthContext", () => ({
  useSession: jest.fn(),
  Role: {
    CLIENT: "client",
    PRESTATAIRE: "prestataire",
  },
}));

const mockUseSession = require("@/context/AuthContext").useSession;

describe("WithRole Component", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing if session is still loading", () => {
    // Mock session as loading
    mockUseSession.mockReturnValue({
      session: null,
      role: "guest",
      isLoading: true,
    });

    const { queryByText } = render(
      <WithRole role={Role.CLIENT}>
        <Text>Client Content</Text>
      </WithRole>
    );

    // Assert that no content is rendered while loading
    expect(queryByText("Client Content")).toBeNull();
  });

  it("renders children if role matches", () => {
    // Mock session as loaded with the correct role
    mockUseSession.mockReturnValue({
      session: { user: { role: "client" } },
      role: Role.CLIENT,
      isLoading: false,
    });

    const { getByText } = render(
      <WithRole role={Role.CLIENT}>
        <Text>Client Content</Text>
      </WithRole>
    );

    // Assert that the content is rendered when the role matches
    expect(getByText("Client Content")).toBeTruthy();
  });

  it("does not render children if role does not match", () => {
    // Mock session as loaded with a different role
    mockUseSession.mockReturnValue({
      session: { user: { role: "ferrailleur" } },
      role: Role.PRESTATAIRE,
      isLoading: false,
    });

    const { queryByText } = render(
      <WithRole role={Role.CLIENT}>
        <Text>Client Content</Text>
      </WithRole>
    );

    // Assert that no content is rendered if the role does not match
    expect(queryByText("Client Content")).toBeNull();
  });
});
