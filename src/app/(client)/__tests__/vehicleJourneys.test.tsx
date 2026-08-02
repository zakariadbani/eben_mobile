import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import i18n from "@/localization/i18n";
import { Role, useSession } from "@/context/AuthContext";
import { apiClient } from "@/api/client";
import * as vehicleApi from "@/api/resources/vehicles";
import type { ApiResponse, Paginated, PaginationMeta } from "@/api/types";
import type {
  CarBrand,
  CarModel,
  CarMotorization,
  CarYear,
  Vehicle,
} from "@/interfaces/Vehicle";
import ClientAddCarForm from "@/components/screens/client/parking/ClientAddCarForm";
import CarSelectionScreen from "../../(auth)/register/car-selection";
import AddCarScreen from "../search/add-car";
import ChangeCarScreen from "../search/change-car";
import MyGarageScreen from "../settings/parking";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockRouter = { push: mockPush, replace: mockReplace, back: mockBack };
let mockParams: Record<string, string | undefined> = {};
let mockFormValues = {
  brandId: 1 as number | null,
  modelId: 11 as number | null,
  year: 2022 as number | null,
  motorizationId: null as number | null,
};

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));
jest.mock("@/context/AuthContext", () => ({
  Role: { CLIENT: "client", PRESTATAIRE: "prestataire" },
  useSession: jest.fn(),
}));
jest.mock("formik", () => ({
  useFormikContext: () => ({ setFieldValue: jest.fn(), values: mockFormValues }),
}));
jest.mock("@/components/common/Button", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  const { useTranslation } = require("react-i18next");
  return function MockButton({ title, onPress, disabled, accessibilityLabel }: {
    title?: string;
    onPress?: () => void;
    disabled?: boolean;
    accessibilityLabel?: string;
  }) {
    const { t } = useTranslation();
    const label = accessibilityLabel ?? (title ? t(title) : "button");
    return React.createElement(
      View,
      {
        accessible: true,
        accessibilityRole: "button",
        accessibilityLabel: label,
        accessibilityState: { disabled },
        onPress: disabled ? undefined : onPress,
      },
      React.createElement(Text, null, label),
    );
  };
});
jest.mock("@/api/resources/vehicles", () => ({
  CLIENT_SELECTED_VEHICLE_ID_STORAGE_KEY: "selectedVehicleId",
  getBrands: jest.fn(),
  getBrandModels: jest.fn(),
  getCarYears: jest.fn(),
  getMotorizations: jest.fn(),
  getVehicles: jest.fn(),
  addVehicle: jest.fn(),
  deleteVehicle: jest.fn(),
}));
jest.mock("@/api", () => require("@/api/resources/vehicles"));
jest.mock("@/components/common/forms", () => {
  const React = require("react");
  const { Button, View } = require("react-native");
  return {
    Form: ({ children, onSubmit }: { children: React.ReactNode; onSubmit: (values: typeof mockFormValues) => void }) =>
      React.createElement(
        View,
        null,
        children,
        React.createElement(Button, { title: "submit-form", onPress: () => onSubmit(mockFormValues) }),
      ),
    FormPicker: ({ name, items, handleChange }: {
      name: string;
      items: { id: number; title: string }[];
      handleChange?: (item: { id: number; title: string }, name: string) => void;
    }) => React.createElement(View, {
      testID: `picker-${name}`,
      items,
      onValueChange: (item: { id: number; title: string }) => handleChange?.(item, name),
    }),
    FormSubmit: ({ disabled }: { disabled?: boolean }) =>
      React.createElement(View, {
        accessible: true,
        accessibilityRole: "button",
        accessibilityLabel: "validated-submit",
        accessibilityState: { disabled },
      }),
  };
});
jest.mock("@/components/common/ConfirmModal", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockConfirmModal({ visible, children, primaryButton, secondaryButton }: {
    visible: boolean;
    children: React.ReactNode;
    primaryButton?: { title: string; onPress: () => void };
    secondaryButton?: { title: string; onPress: () => void };
  }) {
    return visible ? React.createElement(
      View,
      null,
      children,
      primaryButton ? React.createElement(View, {
        accessible: true,
        accessibilityRole: "button",
        accessibilityLabel: primaryButton.title,
        onPress: primaryButton.onPress,
      }) : null,
      secondaryButton ? React.createElement(View, {
        accessible: true,
        accessibilityRole: "button",
        accessibilityLabel: secondaryButton.title,
        onPress: secondaryButton.onPress,
      }) : null,
    ) : null;
  };
});
jest.mock("@/components/screens/client/parking/ItemCarComponent", () => {
  const React = require("react");
  const { Button, Text, View } = require("react-native");
  return function MockItemCarComponent({ vehicle, onRemove }: {
    vehicle: Vehicle;
    onRemove: (vehicle: Vehicle) => void;
  }) {
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, vehicle.brandName, " ", vehicle.modelName),
      React.createElement(Button, { title: `remove-${vehicle.id}`, onPress: () => onRemove(vehicle) }),
    );
  };
});

const pagination = {
  currentPage: 1,
  lastPage: 1,
  perPage: 20,
  total: 1,
  from: 1,
  to: 1,
} satisfies PaginationMeta;
const bmwBrand = {
  id: 1,
  name: "BMW",
  nameAr: null,
  logo: null,
  status: true,
  sortOrder: 1,
} satisfies CarBrand;
const bmwModel = {
  id: 11,
  brandId: 1,
  name: "X5 LIVE",
  nameAr: null,
  yearFrom: null,
  yearTo: null,
  status: true,
  sortOrder: 1,
} satisfies CarModel;
const returnedVehicle = {
  id: 42,
  userId: 9,
  brandId: 1,
  modelId: 11,
  motorizationId: null,
  year: 2022,
  vin: null,
  licensePlate: null,
  nickname: null,
  imageUrl: null,
  isDefault: false,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  brandName: "BMW",
  modelName: "X5 LIVE",
  motorizationName: null,
} satisfies Vehicle;
const otherVehicle = {
  ...returnedVehicle,
  id: 77,
  brandId: 2,
  modelId: 22,
  year: 2021,
  brandName: "Audi",
  modelName: "A4 LIVE",
} satisfies Vehicle;

const mockedSecureStore = jest.mocked(SecureStore);
const mockedUseSession = jest.mocked(useSession);
const mockGetBrands = jest.mocked(vehicleApi.getBrands);
const mockGetBrandModels = jest.mocked(vehicleApi.getBrandModels);
const mockGetCarYears = jest.mocked(vehicleApi.getCarYears);
const mockGetMotorizations = jest.mocked(vehicleApi.getMotorizations);
const mockGetVehicles = jest.mocked(vehicleApi.getVehicles);
const mockAddVehicle = jest.mocked(vehicleApi.addVehicle);
const mockDeleteVehicle = jest.mocked(vehicleApi.deleteVehicle);

function catalogResponses() {
  mockGetBrands.mockResolvedValue({
    success: true,
    data: [bmwBrand],
    pagination,
  } satisfies Paginated<CarBrand>);
  mockGetCarYears.mockResolvedValue({
    success: true,
    data: [{ id: 2022, title: "2022" }],
  } satisfies ApiResponse<CarYear[]>);
  mockGetMotorizations.mockResolvedValue({
    success: true,
    data: [],
    pagination,
  } satisfies Paginated<CarMotorization>);
  mockGetBrandModels.mockResolvedValue({
    success: true,
    data: [bmwModel],
    pagination,
  } satisfies Paginated<CarModel>);
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockParams = {};
  mockFormValues = { brandId: 1, modelId: 11, year: 2022, motorizationId: null };
  mockedSecureStore.getItemAsync.mockResolvedValue(null);
  mockedSecureStore.setItemAsync.mockResolvedValue(undefined);
  mockedSecureStore.deleteItemAsync.mockResolvedValue(undefined);
  await i18n.changeLanguage("fr");
  mockedUseSession.mockReturnValue({ role: Role.CLIENT } as ReturnType<typeof useSession>);
  catalogResponses();
  mockGetVehicles.mockResolvedValue({
    success: true,
    data: [returnedVehicle],
    pagination,
  } satisfies Paginated<Vehicle>);
  mockAddVehicle.mockResolvedValue({
    success: true,
    data: returnedVehicle,
  } satisfies ApiResponse<Vehicle>);
  mockDeleteVehicle.mockResolvedValue({
    success: true,
    data: { deleted: true },
  } satisfies ApiResponse<{ deleted: boolean }>);
});

it("loads every brand page so brands after the default first 20 remain selectable", async () => {
  const allBrands = Array.from({ length: 30 }, (_, index) => ({
    ...bmwBrand,
    id: index + 1,
    name: `Brand ${index + 1}`,
    sortOrder: index + 1,
  } satisfies CarBrand));
  const firstPage = {
    success: true,
    data: allBrands.slice(0, 20),
    pagination: { currentPage: 1, lastPage: 2, perPage: 20, total: 30, from: 1, to: 20 },
  } satisfies Paginated<CarBrand>;
  const secondPage = {
    success: true,
    data: allBrands.slice(20),
    pagination: { currentPage: 2, lastPage: 2, perPage: 20, total: 30, from: 21, to: 30 },
  } satisfies Paginated<CarBrand>;
  const getSpy = jest.spyOn(apiClient, "get")
    .mockResolvedValueOnce(firstPage)
    .mockResolvedValueOnce(secondPage);

  try {
    const actualVehicleApi = jest.requireActual("@/api/resources/vehicles") as typeof vehicleApi;
    const response = await actualVehicleApi.getBrands();

    expect(getSpy).toHaveBeenNthCalledWith(1, "/brands");
    expect(getSpy).toHaveBeenNthCalledWith(2, "/brands?page=2&perPage=20");
    expect(response.data).toEqual(allBrands);
  } finally {
    getSpy.mockRestore();
  }
});

it("ignores a stale slower model response after a newer brand selection", async () => {
  const audiModel = {
    ...bmwModel,
    id: 22,
    brandId: 2,
    name: "A4 LIVE",
  } satisfies CarModel;
  const staleModel = { ...bmwModel, name: "X5 stale" } satisfies CarModel;
  let resolveFirst!: (value: Paginated<CarModel>) => void;
  let resolveSecond!: (value: Paginated<CarModel>) => void;
  mockGetBrandModels
    .mockReturnValueOnce(new Promise<Paginated<CarModel>>((resolve) => { resolveFirst = resolve; }))
    .mockReturnValueOnce(new Promise<Paginated<CarModel>>((resolve) => { resolveSecond = resolve; }));
  const screen = render(<ClientAddCarForm onSuccess={jest.fn()} />);
  await waitFor(() => expect(mockGetBrands).toHaveBeenCalled());

  fireEvent(screen.getByTestId("picker-brandId"), "valueChange", { id: 1, title: "BMW" });
  expect(screen.getByTestId("picker-modelId").props.items).toEqual([]);
  fireEvent(screen.getByTestId("picker-brandId"), "valueChange", { id: 2, title: "Audi" });
  await act(async () => resolveSecond({ success: true, data: [audiModel], pagination }));
  expect(screen.getByTestId("picker-modelId").props.items).toEqual([{ id: 22, title: "A4 LIVE" }]);

  await act(async () => resolveFirst({ success: true, data: [staleModel], pagination }));
  expect(screen.getByTestId("picker-modelId").props.items).toEqual([{ id: 22, title: "A4 LIVE" }]);
});

it("persists once and reconciles the exact returned Vehicle", async () => {
  let resolveAdd!: (value: ApiResponse<Vehicle>) => void;
  mockAddVehicle.mockReturnValueOnce(
    new Promise<ApiResponse<Vehicle>>((resolve) => { resolveAdd = resolve; }),
  );
  const onSuccess = jest.fn();
  const screen = render(<ClientAddCarForm onSuccess={onSuccess} />);
  const submit = await screen.findByRole("button", { name: "submit-form" });

  fireEvent.press(submit);
  fireEvent.press(submit);
  expect(mockAddVehicle).toHaveBeenCalledTimes(1);
  expect(mockAddVehicle).toHaveBeenCalledWith({ brandId: 1, modelId: 11, year: 2022, motorizationId: null });

  await act(async () => resolveAdd({ success: true, data: returnedVehicle }));
  expect(onSuccess).toHaveBeenCalledWith(returnedVehicle);
});

it("rejects non-positive required IDs and years before calling the API", async () => {
  mockFormValues = { brandId: 0, modelId: -1, year: Number.NaN, motorizationId: null };
  const screen = render(<ClientAddCarForm onSuccess={jest.fn()} />);

  expect((await screen.findByRole("button", { name: "validated-submit" })).props.accessibilityState.disabled).toBe(true);
  fireEvent.press(await screen.findByRole("button", { name: "submit-form" }));

  expect(mockAddVehicle).not.toHaveBeenCalled();
  expect(await screen.findByText(i18n.t("auth.error.generic"))).toBeTruthy();
});

it("shows catalog API errors and retries without falling back to fixtures", async () => {
  mockGetBrands.mockRejectedValueOnce(new Error("offline"));
  const screen = render(<ClientAddCarForm onSuccess={jest.fn()} />);

  expect(await screen.findByText(i18n.t("auth.error.generic"))).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: i18n.t("reviews.retry") }));

  expect(await screen.findByRole("button", { name: "submit-form" })).toBeTruthy();
  expect(mockGetBrands).toHaveBeenCalledTimes(2);
});

it("blocks registration vehicle creation without an active Client session and skip adds no route params", async () => {
  mockedUseSession.mockReturnValue({ role: "guest" } as ReturnType<typeof useSession>);
  const screen = render(<CarSelectionScreen />);
  fireEvent.press(await screen.findByRole("button", { name: "submit-form" }));
  expect(mockAddVehicle).not.toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/(auth)/ClientLoginScreen");

  fireEvent.press(screen.getByRole("button", { name: "Passer cette étape" }));
  expect(mockReplace).toHaveBeenCalledWith("/(client)");
  expect(JSON.stringify(mockReplace.mock.calls)).not.toContain("vehicleId");
  expect(JSON.stringify(mockReplace.mock.calls)).not.toContain("carLabel");
});

it("uses the exact backend Vehicle in the add-car success state", async () => {
  const screen = render(<AddCarScreen />);
  fireEvent.press(await screen.findByRole("button", { name: "submit-form" }));

  expect(await screen.findByText("BMW X5 LIVE 2022")).toBeTruthy();
  expect(mockAddVehicle).toHaveBeenCalledWith({ brandId: 1, modelId: 11, year: 2022, motorizationId: null });
});

it("persists a selected real change-car ID before returning and restores it", async () => {
  mockGetVehicles.mockResolvedValue({
    success: true,
    data: [returnedVehicle, otherVehicle],
    pagination: { ...pagination, total: 2, to: 2 },
  } satisfies Paginated<Vehicle>);
  let resolveStorageWrite!: () => void;
  mockedSecureStore.setItemAsync.mockReturnValueOnce(
    new Promise<void>((resolve) => { resolveStorageWrite = resolve; }),
  );
  const screen = render(<ChangeCarScreen />);
  const otherVehicleCard = await screen.findByRole("button", { name: "2021 Audi A4 LIVE" });

  fireEvent.press(otherVehicleCard);
  await waitFor(() => expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith("selectedVehicleId", "77"));
  expect(mockBack).not.toHaveBeenCalled();

  await act(async () => resolveStorageWrite());
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  screen.unmount();

  mockedSecureStore.getItemAsync.mockResolvedValueOnce("77");
  const restoredScreen = render(<ChangeCarScreen />);
  await waitFor(() => expect(
    restoredScreen.getByRole("button", { name: "2021 Audi A4 LIVE" }).props.accessibilityState.selected,
  ).toBe(true));
});

it("loads real change-car IDs and appends the exact returned Vehicle", async () => {
  const screen = render(<ChangeCarScreen />);
  expect(await screen.findByText("2022 BMW X5 LIVE")).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "submit-form" }));

  await waitFor(() => expect(mockAddVehicle).toHaveBeenCalledWith({
    brandId: 1,
    modelId: 11,
    year: 2022,
    motorizationId: null,
  }));
  expect(screen.getAllByText("2022 BMW X5 LIVE").length).toBeGreaterThan(0);
});

it("shows the live empty state when the garage response has no vehicles", async () => {
  mockGetVehicles.mockResolvedValueOnce({
    success: true,
    data: [],
    pagination: { ...pagination, total: 0, from: null, to: null },
  } satisfies Paginated<Vehicle>);

  const screen = render(<ChangeCarScreen />);

  expect(await screen.findByText(i18n.t("garage.empty"))).toBeTruthy();
  expect(screen.queryByText("2022 BMW X5 LIVE")).toBeNull();
});

it("keeps a garage row when backend deletion fails", async () => {
  mockDeleteVehicle.mockRejectedValueOnce(new Error("offline"));
  const screen = render(<MyGarageScreen />);
  await screen.findByText("BMW X5 LIVE");
  fireEvent.press(screen.getByRole("button", { name: "remove-42" }));
  fireEvent.press(screen.getByRole("button", { name: "garage.confirmRemove" }));

  expect(await screen.findByText(i18n.t("auth.error.generic"))).toBeTruthy();
  expect(screen.getByText("BMW X5 LIVE")).toBeTruthy();
});

it("deletes the exact garage ID and removes its row only after backend success", async () => {
  let resolveDelete!: (value: ApiResponse<{ deleted: boolean }>) => void;
  mockDeleteVehicle.mockReturnValueOnce(
    new Promise<ApiResponse<{ deleted: boolean }>>((resolve) => { resolveDelete = resolve; }),
  );
  const screen = render(<MyGarageScreen />);
  await screen.findByText("BMW X5 LIVE");
  fireEvent.press(screen.getByRole("button", { name: "remove-42" }));
  fireEvent.press(screen.getByRole("button", { name: "garage.confirmRemove" }));

  expect(mockDeleteVehicle).toHaveBeenCalledWith(42);
  expect(screen.getByText("BMW X5 LIVE")).toBeTruthy();

  await act(async () => resolveDelete({ success: true, data: { deleted: true } }));
  await waitFor(() => expect(screen.queryByText("BMW X5 LIVE")).toBeNull());
});
