import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Linking, Platform } from "react-native";
import { checkForUpdate } from "expo-in-app-updates";
import { useInAppUpdate } from "../useInAppUpdate";

jest.mock("expo-in-app-updates", () => ({ checkForUpdate: jest.fn() }));
jest.mock("expo-application", () => ({ applicationId: "com.eben.mobile" }));

const mockedCheck = checkForUpdate as jest.Mock;

describe("useInAppUpdate", () => {
  const originalOS = Platform.OS;
  const originalDev = (global as unknown as { __DEV__: boolean }).__DEV__;
  let openURLSpy: jest.SpyInstance;

  beforeEach(() => {
    mockedCheck.mockReset();
    openURLSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
  });

  afterEach(() => {
    Platform.OS = originalOS;
    (global as unknown as { __DEV__: boolean }).__DEV__ = originalDev;
    openURLSpy.mockRestore();
  });

  it("flags an available update from the Play check and clears it on dismiss", async () => {
    (global as unknown as { __DEV__: boolean }).__DEV__ = false;
    Platform.OS = "android";
    mockedCheck.mockResolvedValue({ updateAvailable: true });

    const { result } = renderHook(() => useInAppUpdate());
    await waitFor(() => expect(result.current.updateAvailable).toBe(true));

    act(() => result.current.dismiss());
    expect(result.current.updateAvailable).toBe(false);
  });

  it("openStore opens the Play market URL and clears the flag", async () => {
    (global as unknown as { __DEV__: boolean }).__DEV__ = false;
    Platform.OS = "android";
    mockedCheck.mockResolvedValue({ updateAvailable: true });

    const { result } = renderHook(() => useInAppUpdate());
    await waitFor(() => expect(result.current.updateAvailable).toBe(true));

    act(() => result.current.openStore());
    expect(openURLSpy).toHaveBeenCalledWith("market://details?id=com.eben.mobile");
    expect(result.current.updateAvailable).toBe(false);
  });

  it("falls back to the https Play Store URL when the market:// scheme fails", async () => {
    (global as unknown as { __DEV__: boolean }).__DEV__ = false;
    Platform.OS = "android";
    mockedCheck.mockResolvedValue({ updateAvailable: false });
    openURLSpy.mockRejectedValueOnce(new Error("no market app"));

    const { result } = renderHook(() => useInAppUpdate());

    act(() => result.current.openStore());
    await waitFor(() =>
      expect(openURLSpy).toHaveBeenCalledWith(
        "https://play.google.com/store/apps/details?id=com.eben.mobile"
      )
    );
  });

  it("skips the Play check entirely on iOS", () => {
    Platform.OS = "ios";
    const { result } = renderHook(() => useInAppUpdate());

    expect(mockedCheck).not.toHaveBeenCalled();
    expect(result.current.updateAvailable).toBe(false);
  });
});
