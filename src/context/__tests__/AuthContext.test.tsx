import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Role, SessionProvider, useSession } from "@/context/AuthContext";
import { setStorageItemAsync } from "@/context/useStorageState";

global.alert = jest.fn();

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

type LoginArgs = [string, string, Role?];
const originalNodeEnv = process.env.NODE_ENV;

const TestComponent = ({ credentials }: { credentials: LoginArgs }) => {
  const { session, login, logOut } = useSession();
  const [loginResult, setLoginResult] = React.useState<Role | null | "not-called">(
    "not-called"
  );
  return (
    <>
      <Text testID="session">{JSON.stringify(session)}</Text>
      <Text
        testID="login"
        onPress={() => setLoginResult(login(...credentials))}
      >
        Login
      </Text>
      <Text testID="result">{String(loginResult)}</Text>
      <Text testID="logout" onPress={logOut}>
        Logout
      </Text>
    </>
  );
};

const renderSession = (credentials: LoginArgs) =>
  render(
    <SessionProvider>
      <TestComponent credentials={credentials} />
    </SessionProvider>
  );

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it.each([
    ["client", "client", undefined, Role.CLIENT],
    ["prestataire", "prestataire", undefined, Role.PRESTATAIRE],
    [" x ", "1", Role.CLIENT, Role.CLIENT],
    [" user-9 ", "p", Role.PRESTATAIRE, Role.PRESTATAIRE],
  ] as const)(
    "logs %s into the expected role",
    async (username, password, roleHint, expectedRole) => {
      const { getByTestId } = renderSession([username, password, roleHint]);

      await waitFor(() => expect(getByTestId("session").props.children).toBe("null"));
      fireEvent.press(getByTestId("login"));

      await waitFor(() => {
        expect(JSON.parse(getByTestId("session").props.children)).toEqual({
          username: username.trim(),
          role: expectedRole,
        });
        expect(getByTestId("result").props.children).toBe(expectedRole);
      });
    }
  );

  it.each([
    ["   ", "password", Role.CLIENT],
    ["username", "   ", Role.PRESTATAIRE],
    ["arbitrary", "credentials", undefined],
  ] as const)(
    "rejects invalid development credentials for %s",
    async (username, password, roleHint) => {
      const { getByTestId } = renderSession([username, password, roleHint]);

      await waitFor(() => expect(getByTestId("session").props.children).toBe("null"));
      fireEvent.press(getByTestId("login"));

      expect(getByTestId("result").props.children).toBe("null");
      expect(getByTestId("session").props.children).toBe("null");
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["0612345678", "client", Role.CLIENT, Role.CLIENT],
    ["0677777777", "client", Role.PRESTATAIRE, Role.PRESTATAIRE],
    ["0677777777", "client", "invalid" as Role, null],
    ["client", "client", undefined, Role.CLIENT],
    ["0677777777", "client", Role.CLIENT, Role.CLIENT],
    ["0677777777", "prestataire", Role.PRESTATAIRE, Role.PRESTATAIRE],
  ] as const)(
    "accepts arbitrary non-empty mock credentials for %s",
    async (username, password, roleHint, expectedRole) => {
      process.env.NODE_ENV = "production";
      const { getByTestId } = renderSession([username, password, roleHint]);

      await waitFor(() => expect(getByTestId("session").props.children).toBe("null"));
      fireEvent.press(getByTestId("login"));

      await waitFor(() => {
        expect(getByTestId("result").props.children).toBe(String(expectedRole));
        if (expectedRole) {
          expect(JSON.parse(getByTestId("session").props.children)).toEqual({
            username: username.trim(),
            role: expectedRole,
          });
        } else {
          expect(getByTestId("session").props.children).toBe("null");
        }
      });
    }
  );
  it("logs out and clears the stored session", async () => {
    const { getByTestId } = renderSession(["client", "client"]);

    await waitFor(() => expect(getByTestId("session").props.children).toBe("null"));
    fireEvent.press(getByTestId("login"));
    await waitFor(() => expect(getByTestId("session").props.children).toContain("client"));
    fireEvent.press(getByTestId("logout"));

    await waitFor(() => expect(getByTestId("session").props.children).toBe("null"));
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("session");
  });

  it("serializes stored objects exactly once", async () => {
    const session = { username: "0677777777", role: Role.CLIENT };

    await setStorageItemAsync("session", session);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "session",
      JSON.stringify(session)
    );
  });
});