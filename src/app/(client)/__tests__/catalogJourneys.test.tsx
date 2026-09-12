import React from "react";
import { ActivityIndicator, Modal } from "react-native";
import { act, fireEvent, render as rtlRender, waitFor } from "@testing-library/react-native";
import {
  addToBasket,
  addToWishlist,
  createRequest,
  getCategories,
  getCategoryBrands,
  getCategoryTree,
  getProduct,
  getProducts,
  getProductsByCategory,
  getRequests,
  getReviews,
  getWishlist,
  removeWishlistItem,
  searchAllPneumatics,
} from "@/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Role, useSession } from "@/context/AuthContext";
import { RequestDraftProvider } from "@/context/RequestDraftContext";
import { WishlistProvider } from "@/context/WishlistContext";
import i18n from "@/localization/i18n";
import HomeScreen from "@/components/screens/client/HomeScreen";
import CategoriesListScreen from "../categories";
import CategoryDrillScreen from "../categories/[categoryId]";
import CategoryBrandsScreen from "../categories/[categoryId]/brands";
import CategoryResultsScreen from "../categories/results";
import ProductDetailScreen from "../products/[productId]";
import ReviewsScreen from "../products/[productId]/reviews";
import WhatsappBtn from "@/components/common/WhatsappBtn";
import ItemCategoryComponent from "@/components/screens/shared/app/ItemCategoryComponent";
import ItemBasketComponent from "@/components/screens/shared/app/ItemBasketComponent";
import ClientCheckoutForm from "@/components/screens/client/checkout/ClientCheckoutForm";
import { mockAddresses } from "@/api/mock/mockOrders";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => children ?? null,
}));
const mockShowNotification = jest.fn();
jest.mock("@/context/NotificationContext", () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));

// Every screen in this suite now sits under the client (client)/_layout.tsx
// RequestDraftProvider (occasion catalog rows + product detail mount the
// "add to list" sheet unconditionally, toggling only its `visible` prop —
// see CustomModal.tsx). Shadowing `render` keeps every existing call site
// below working unchanged.
function render(ui: React.ReactElement) {
  return rtlRender(
    <RequestDraftProvider>
      <WishlistProvider>{ui}</WishlistProvider>
    </RequestDraftProvider>,
  );
}

/**
 * ItemSubCategoryComponent's row TouchableOpacity now also carries
 * accessibilityRole="button" whenever it has its own onPress (a11y fix).
 * RNTL's byRole `name` match checks whether the queried text/label exists
 * *anywhere inside* a candidate's subtree, not whether the candidate itself
 * is named that — so a plain getByRole/findByRole lookup for an action
 * button's label also matches the row wrapping it. Action buttons
 * (Button.tsx) always set accessibilityLabel explicitly; the row never
 * does — filter on that to grab the actual button, not its row.
 */
function getActionButton(container: ReturnType<typeof rtlRender>, name: string) {
  const button = container.getAllByRole("button", { name }).find((el) => el.props.accessibilityLabel === name);
  if (!button) throw new Error(`No action button found for role button, name: ${name}`);
  return button;
}
async function findActionButton(container: ReturnType<typeof rtlRender>, name: string) {
  await container.findAllByRole("button", { name });
  return getActionButton(container, name);
}

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockRouter = { push: mockPush, replace: mockReplace, back: mockBack };
let mockParams: Record<string, string | undefined> = {};

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: () => void) => {
    const ReactModule = require("react") as typeof React;
    ReactModule.useEffect(callback, [callback]);
  },
}));
jest.mock("@/api", () => ({
  addToBasket: jest.fn(),
  addToWishlist: jest.fn(),
  createRequest: jest.fn(),
  getCategories: jest.fn(),
  getCategoryBrands: jest.fn(),
  getCategoryTree: jest.fn(),
  getProduct: jest.fn(),
  getProducts: jest.fn(),
  getProductsByCategory: jest.fn(),
  getRequests: jest.fn(),
  getReviews: jest.fn(),
  getWishlist: jest.fn(),
  removeWishlistItem: jest.fn(),
  searchAllPneumatics: jest.fn(),
}));
jest.mock("@/context/AuthContext", () => ({
  Role: { CLIENT: "client", PRESTATAIRE: "prestataire" },
  useSession: jest.fn(),
}));

const mockedUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockGetCategories = getCategories as jest.MockedFunction<typeof getCategories>;
const mockGetCategoryBrands = getCategoryBrands as jest.MockedFunction<typeof getCategoryBrands>;
const mockGetCategoryTree = getCategoryTree as jest.MockedFunction<typeof getCategoryTree>;
const mockGetProducts = getProducts as jest.MockedFunction<typeof getProducts>;
const mockGetProductsByCategory = getProductsByCategory as jest.MockedFunction<typeof getProductsByCategory>;
const mockGetProduct = getProduct as jest.MockedFunction<typeof getProduct>;
const mockGetReviews = getReviews as jest.MockedFunction<typeof getReviews>;
const mockSearchAllPneumatics = searchAllPneumatics as jest.MockedFunction<typeof searchAllPneumatics>;
const mockGetRequests = getRequests as jest.MockedFunction<typeof getRequests>;
const mockGetWishlist = getWishlist as jest.MockedFunction<typeof getWishlist>;
const mockAddToWishlist = addToWishlist as jest.MockedFunction<typeof addToWishlist>;
const mockRemoveWishlistItem = removeWishlistItem as jest.MockedFunction<typeof removeWishlistItem>;

const rootCategory = {
  id: 10,
  parentId: null,
  level: 1 as const,
  title: "Freins",
  titleAr: "الفرامل",
  slug: "freins",
  sortOrder: 1,
  status: true,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};
const leafCategory = {
  ...rootCategory,
  id: 12,
  parentId: 10,
  level: 3 as const,
  title: "Plaquettes",
  titleAr: "وسادات",
  slug: "plaquettes",
};
const categoryTree = [{ ...rootCategory, children: [{ ...rootCategory, id: 11, parentId: 10, level: 2 as const, children: [leafCategory] }] }];
// A level-3 category sitting at the top level of the tree response, not
// nested under any parent's `children` — simulates a stale/broken parent
// chain: flattenCategories() still finds it (top-level entries count),
// but findParent() cannot, since no node's `children` array contains it.
const orphanLeafCategory = {
  ...rootCategory,
  id: 13,
  parentId: 999,
  level: 3 as const,
  title: "Pièce orpheline",
  titleAr: "قطعة يتيمة",
  slug: "piece-orpheline",
};
const product = {
  id: 91,
  title: "Plaquettes live",
  titleAr: "وسادات حية",
  condition: "en_stock" as const,
  articleNumber: "LIVE-91",
  price: 299,
  images: [],
  description: "Description live",
  descriptionAr: "وصف حي",
  categoryId: 12,
  categoryName: "Plaquettes",
  categoryNameAr: "وسادات",
  reviewsCount: 0,
  stock: 4,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};
const ridexBrand = { id: 1, name: "RIDEX", nameAr: "ريدكس", logo: null, status: true, sortOrder: 1 };
const boschBrand = { id: 2, name: "Bosch", nameAr: "بوش", logo: null, status: true, sortOrder: 2 };
const partBrands = [ridexBrand, boschBrand];
const pagination = { currentPage: 1, lastPage: 1, perPage: 20, total: 1, from: 1, to: 1 };

beforeEach(async () => {
  jest.clearAllMocks();
  mockParams = {};
  await i18n.changeLanguage("fr");
  mockedUseSession.mockReturnValue({ role: "guest" } as ReturnType<typeof useSession>);
  mockGetCategories.mockResolvedValue({ success: true, data: [rootCategory], pagination });
  mockGetCategoryTree.mockResolvedValue({ success: true, data: categoryTree });
  mockGetCategoryBrands.mockResolvedValue({ success: true, data: partBrands });
  mockGetProducts.mockResolvedValue({ success: true, data: [product], pagination });
  mockGetProductsByCategory.mockResolvedValue({ success: true, data: [product], pagination });
  mockGetProduct.mockResolvedValue({ success: true, data: product });
  mockGetReviews.mockResolvedValue({ success: true, data: [], pagination });
  mockSearchAllPneumatics.mockResolvedValue({ success: true, data: [], pagination });
  mockGetRequests.mockResolvedValue({ success: true, data: [], pagination });
  mockGetWishlist.mockResolvedValue({ success: true, data: [], pagination });
});

it("loads public home catalog data without requesting private Client summaries for a guest", async () => {
  const screen = render(<HomeScreen />);
  expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();

  expect((await screen.findAllByText("Plaquettes live")).length).toBe(2);
  expect(mockGetCategories).toHaveBeenCalledTimes(1);
  expect(mockGetCategoryTree).toHaveBeenCalledTimes(1);
  expect(mockGetProducts).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 12, featured: true }));
  expect(getRequests).not.toHaveBeenCalled();
});

it("preserves the original Home sections while binding Client data", async () => {
  mockedUseSession.mockReturnValue({ role: Role.CLIENT } as ReturnType<typeof useSession>);
  mockGetRequests.mockResolvedValueOnce({
    success: true,
    data: [{
      id: 7,
      reference: "REQ-LIVE-7",
      status: "validated",
      expiresDisplay: "2h",
      createdAt: "2026-01-01",
    }],
    pagination,
  });
  const screen = render(<HomeScreen />);

  expect(await screen.findByText(i18n.t("home.reference", { value: "REQ-LIVE-7" }))).toBeTruthy();
  expect(screen.getByText(i18n.t("home.orderNotice"))).toBeTruthy();
  expect(screen.getAllByText(i18n.t("home.category", { value: "Plaquettes" }))).toHaveLength(2);
  expect(screen.getByText(i18n.t("home.list"))).toBeTruthy();
  expect(screen.getByText(i18n.t("home.learnMore"))).toBeTruthy();
  expect(screen.getByText(i18n.t("home.limitedOffers"))).toBeTruthy();
  expect(screen.getAllByText(i18n.t("home.viewDemo"))).toHaveLength(2);
  expect(screen.getByText(i18n.t("home.startExperience"))).toBeTruthy();
  expect(screen.getByText(i18n.t("home.checkPrices"))).toBeTruthy();
});

it("does not advertise moderated offers to the Client before validation", async () => {
  mockedUseSession.mockReturnValue({ role: Role.CLIENT } as ReturnType<typeof useSession>);
  mockGetRequests.mockResolvedValueOnce({
    success: true,
    data: [{
      id: 8,
      reference: "REQ-PENDING-REVIEW",
      status: "offers_received",
      expiresDisplay: "2h",
      createdAt: "2026-01-01",
    }],
    pagination,
  });

  const screen = render(<HomeScreen />);

  expect(await screen.findByText(i18n.t("home.reference", { value: "REQ-PENDING-REVIEW" }))).toBeTruthy();
  expect(screen.queryByText(i18n.t("home.checkPrices"))).toBeNull();
  expect(screen.getByText(i18n.t("home.details"))).toBeTruthy();
});

it("keeps terminal requests out of the active Home carousel", async () => {
  mockedUseSession.mockReturnValue({ role: Role.CLIENT } as ReturnType<typeof useSession>);
  mockGetRequests.mockResolvedValueOnce({
    success: true,
    data: [
      { id: 8, reference: "REQ-ACTIVE", status: "pending", expiresDisplay: "45min", createdAt: "2026-01-01" },
      { id: 9, reference: "REQ-ORDERED", status: "ordered", expiresDisplay: null, createdAt: "2026-01-01" },
      { id: 10, reference: "REQ-EXPIRED", status: "expired", expiresDisplay: null, createdAt: "2026-01-01" },
    ],
    pagination: { ...pagination, total: 3 },
  });

  const screen = render(<HomeScreen />);

  expect(await screen.findByText(i18n.t("home.reference", { value: "REQ-ACTIVE" }))).toBeTruthy();
  expect(screen.queryByText(i18n.t("home.reference", { value: "REQ-ORDERED" }))).toBeNull();
  expect(screen.queryByText(i18n.t("home.reference", { value: "REQ-EXPIRED" }))).toBeNull();
});

it("shows a promo badge with the struck original price and only fills the tapped heart's own card", async () => {
  mockedUseSession.mockReturnValue({ role: Role.CLIENT } as ReturnType<typeof useSession>);
  const productB = { ...product, id: 92, title: "Disques live", titleAr: "أقراص حية" };
  mockGetProducts.mockResolvedValueOnce({
    success: true,
    data: [{ ...product, price: 100, promoPrice: 75 }, productB],
    pagination,
  });
  mockAddToWishlist.mockResolvedValueOnce({
    success: true,
    data: { id: 501, userId: 1, categoryId: 12, pneumaticId: null, createdAt: "2026-01-01" },
  });
  mockRemoveWishlistItem.mockResolvedValueOnce({ success: true, data: { id: 501 } });

  const screen = render(<HomeScreen />);
  await screen.findAllByText("Plaquettes live");

  expect(screen.getByText("-25%")).toBeTruthy();
  expect(screen.getByText("100,00 Dhs")).toBeTruthy();

  const hearts = screen.getAllByLabelText(i18n.t("Ajouter à la liste de souhaits"));
  expect(hearts).toHaveLength(2);
  fireEvent.press(hearts[0]);
  await waitFor(() => expect(mockAddToWishlist).toHaveBeenCalledTimes(1));
  expect(mockAddToWishlist).toHaveBeenCalledWith(91);

  // Both cards share categoryId 12, but hearts are now keyed by product.id
  // (device-local) — only the tapped card (product 91) flips, product 92
  // stays untouched.
  expect(await screen.findAllByLabelText(i18n.t("Retirer de la liste de souhaits"))).toHaveLength(1);
  expect(screen.queryAllByLabelText(i18n.t("Ajouter à la liste de souhaits"))).toHaveLength(1);

  fireEvent.press(screen.getByLabelText(i18n.t("Retirer de la liste de souhaits")));
  await waitFor(() => expect(mockRemoveWishlistItem).toHaveBeenCalledWith(501));
  expect(await screen.findAllByLabelText(i18n.t("Ajouter à la liste de souhaits"))).toHaveLength(2);
  expect(screen.queryAllByLabelText(i18n.t("Retirer de la liste de souhaits"))).toHaveLength(0);
});

it("undoes an orphaned backend wishlist item when the user removes it again before the add resolves", async () => {
  mockedUseSession.mockReturnValue({ role: Role.CLIENT } as ReturnType<typeof useSession>);

  let resolveAdd: (value: Awaited<ReturnType<typeof addToWishlist>>) => void;
  mockAddToWishlist.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveAdd = resolve;
    }),
  );
  mockRemoveWishlistItem.mockResolvedValueOnce({ success: true, data: { id: 501 } });

  const screen = render(<HomeScreen />);
  await screen.findAllByText("Plaquettes live");

  fireEvent.press(screen.getByLabelText(i18n.t("Ajouter à la liste de souhaits")));
  await waitFor(() => expect(mockAddToWishlist).toHaveBeenCalledTimes(1));

  // Double-tap before the add resolves: the map already holds productId ->
  // null, so this second tap takes the remove branch and deletes locally
  // (storedId is null, so no backend remove call yet).
  expect(await screen.findByLabelText(i18n.t("Retirer de la liste de souhaits"))).toBeTruthy();
  fireEvent.press(screen.getByLabelText(i18n.t("Retirer de la liste de souhaits")));
  expect(await screen.findByLabelText(i18n.t("Ajouter à la liste de souhaits"))).toBeTruthy();

  // The in-flight add now resolves with a freshly created backend item.
  resolveAdd!({
    success: true,
    data: { id: 501, userId: 1, categoryId: 12, pneumaticId: null, createdAt: "2026-01-01" },
  });

  // The orphaned backend item must be undone, and the heart must not be
  // resurrected — it stays empty since the user removed it mid-flight.
  await waitFor(() => expect(mockRemoveWishlistItem).toHaveBeenCalledWith(501));
  expect(screen.getByLabelText(i18n.t("Ajouter à la liste de souhaits"))).toBeTruthy();
  expect(screen.queryByLabelText(i18n.t("Retirer de la liste de souhaits"))).toBeNull();
});

it("renders the regular price when promoPrice is zero instead of a false discount", async () => {
  mockedUseSession.mockReturnValue({ role: Role.CLIENT } as ReturnType<typeof useSession>);
  mockGetProducts.mockResolvedValueOnce({
    success: true,
    data: [{ ...product, price: 100, promoPrice: 0 }],
    pagination,
  });

  const screen = render(<HomeScreen />);

  expect(await screen.findByText(i18n.t("home.price", { value: "100,00" }))).toBeTruthy();
  expect(screen.queryByText(i18n.t("home.price", { value: "0,00" }))).toBeNull();
});

it("renders category loading, live data, and retry after a failed read", async () => {
  mockGetCategories.mockRejectedValueOnce(new Error("offline"));
  const screen = render(<CategoriesListScreen />);

  expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  const retry = await screen.findByRole("button", { name: i18n.t("reviews.retry") });
  mockGetCategories.mockResolvedValueOnce({ success: true, data: [rootCategory], pagination });
  fireEvent.press(retry);
  expect(await screen.findByText("Freins")).toBeTruthy();
  expect(mockGetCategories).toHaveBeenCalledTimes(2);
});

it.each([
  ["category list", () => <CategoriesListScreen />],
  ["category drill-down", () => {
    mockParams = { categoryId: "10", condition: "occasion" };
    return <CategoryDrillScreen />;
  }],
  ["category results", () => {
    mockParams = { categoryId: "12", condition: "occasion" };
    return <CategoryResultsScreen />;
  }],
  ["product detail", () => {
    mockParams = { productId: "91" };
    return <ProductDetailScreen />;
  }],
])("keeps floating support off the %s primary action area", async (_name, screenFactory) => {
  const screen = render(screenFactory());
  await screen.findAllByText(/Freins|Plaquettes live/);

  expect(screen.UNSAFE_queryAllByType(WhatsappBtn)).toHaveLength(0);
});

it("shows every saved address by its saved label", () => {
  const screen = render(
    <ClientCheckoutForm
      addresses={mockAddresses}
      selectedAddressId={mockAddresses[0]!.id}
      onSelectAddress={jest.fn()}
      onAddAddress={jest.fn()}
      selectedPaymentMethod="cod"
      onSelectPaymentMethod={jest.fn()}
    />,
  );

  for (const address of mockAddresses) {
    expect(screen.getByText(address.label!)).toBeTruthy();
  }
});

it("shows only payment methods users can currently select", () => {
  const screen = render(
    <ClientCheckoutForm
      addresses={[]}
      selectedAddressId={null}
      onSelectAddress={jest.fn()}
      onAddAddress={jest.fn()}
      selectedPaymentMethod="cod"
      onSelectPaymentMethod={jest.fn()}
    />,
  );

  expect(screen.getByText(i18n.t("Paiement à la livraison"))).toBeTruthy();
  expect(screen.queryByText(i18n.t("Payer avec Cash Plus"))).toBeNull();
  expect(screen.queryByText(i18n.t("Virement bancaire"))).toBeNull();
  expect(screen.queryByText(i18n.t("checkout.paymentDetails"))).toBeNull();
});
it("localizes basket category labels and price units", () => {
  const screen = render(
    <ItemBasketComponent
      item={{
        id: 1,
        title: "Plaquettes",
        categoryLabel: "Freins",
        unitPrice: 99.5,
        quantity: 1,
      }}
      onIncrement={jest.fn()}
      onDecrement={jest.fn()}
      onRemove={jest.fn()}
    />,
  );

  expect(screen.getByText(i18n.t("home.category", { value: "Freins" }))).toBeTruthy();
  expect(screen.getByText("99,5 Dhs")).toBeTruthy();
});
it("keeps long category labels readable within two lines", () => {
  const screen = render(<ItemCategoryComponent item={{
    id: 99,
    title: "TRANSMISSION",
    title_ar: "TRANSMISSION AR",
  }} />);

  expect(screen.getByText("TRANSMISSION").props.numberOfLines).toBe(2);
});

it("uses localized formal copy for the request promo", async () => {
  const screen = render(<CategoriesListScreen />);

  expect(await screen.findByText(i18n.t("catalog.requestPromo.title"), { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByText(i18n.t("catalog.requestPromo.body"), { includeHiddenElements: true })).toBeTruthy();
});
it.each([
  ["category list", () => {
    mockParams = {};
    return <CategoriesListScreen />;
  }],
  ["category drill-down", () => {
    mockParams = { categoryId: "10", condition: "occasion" };
    return <CategoryDrillScreen />;
  }],
  ["category results", () => {
    mockParams = { categoryId: "12", condition: "occasion" };
    return <CategoryResultsScreen />;
  }],
])("pushes the %s guest request banner straight to CreateRequestScreen without a login redirect", async (_name, screenFactory) => {
  const screen = render(screenFactory());
  const nestedSharedAction = await screen.findByText(
    i18n.t("Placer une demande"),
    { includeHiddenElements: true },
  );

  fireEvent.press(nestedSharedAction);

  expect(mockPush).toHaveBeenCalledWith("/(client)/requests/CreateRequestScreen");
  expect(mockPush).toHaveBeenCalledTimes(1);
  expect(createRequest).not.toHaveBeenCalled();
});

it("rejects an invalid category route id before loading the category tree", async () => {
  mockParams = { categoryId: "12x", condition: "occasion" };
  const screen = render(<CategoryDrillScreen />);

  expect(await screen.findByText(i18n.t("auth.error.generic"))).toBeTruthy();
  expect(mockGetCategoryTree).not.toHaveBeenCalled();
});

it("labels results with the selected category instead of the first product", async () => {
  mockParams = { categoryId: "12", condition: "en_stock" };
  const screen = render(<CategoryResultsScreen />);

  expect(await screen.findByText("Plaquettes")).toBeTruthy();
  expect(mockGetCategoryTree).toHaveBeenCalledTimes(1);
});
it("opens product details when the result card is pressed", async () => {
  mockParams = { categoryId: "12", condition: "en_stock" };
  const screen = render(<CategoryResultsScreen />);

  fireEvent.press(await screen.findByText("Plaquettes live"));

  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(client)/products/[productId]",
    params: { productId: "91" },
  });
});
it("loads category results from the centralized products resource", async () => {
  mockParams = { categoryId: "12", condition: "en_stock", searchQuery: "plaquettes" };
  const screen = render(<CategoryResultsScreen />);

  expect(await screen.findByText("Plaquettes live")).toBeTruthy();
  expect(mockGetProductsByCategory).toHaveBeenCalledWith(12, "en_stock", "plaquettes");
  expect(screen.queryByText("Jeu de plaquettes de frein")).toBeNull();
});

it("maps validated tyre query filters to the live pneumatic search", async () => {
  await i18n.changeLanguage("ar");
  mockSearchAllPneumatics.mockResolvedValueOnce({
    success: true,
    data: [{ id: 1, brand: "Michelin", model: "Primacy 4", width: 205, aspectRatio: 55, diameter: 16, loadIndex: 91, speedRating: "H", season: "summer", vehicleType: "4x4", price: 980, stockQuantity: 8, image: null, status: true }],
    pagination,
  });
  mockParams = {
    type: "pneumatiques",
    largeurId: "205",
    hauteurId: "55",
    diametreId: "16",
    saisonId: "1",
    fabricantId: "1",
    indiceVitesseId: "1",
    vehicleType: "4x4",
  };
  const screen = render(<CategoryResultsScreen />);

  await waitFor(() => expect(mockSearchAllPneumatics).toHaveBeenCalledWith({
    width: 205,
    aspectRatio: 55,
    diameter: 16,
    season: "summer",
    brand: "Michelin",
    speedRating: "H",
    vehicleType: "4x4",
  }));
  expect(mockGetProductsByCategory).not.toHaveBeenCalled();
  expect(await screen.findByText("\u0631\u0642\u0645 \u0627\u0644\u0642\u0637\u0639\u0629: 205/55 R16")).toBeTruthy();
});

it("rejects invalid result query ids before making a public request", async () => {
  mockParams = { categoryId: "-4", condition: "occasion" };
  const screen = render(<CategoryResultsScreen />);

  expect(await screen.findByText(i18n.t("auth.error.generic"))).toBeTruthy();
  expect(mockGetProductsByCategory).not.toHaveBeenCalled();
  expect(mockSearchAllPneumatics).not.toHaveBeenCalled();
});

it("does not fetch an invalid product id and retries a failed valid detail read", async () => {
  mockParams = { productId: "bad" };
  const invalid = render(<ProductDetailScreen />);
  expect(await invalid.findByText(i18n.t("auth.error.generic"))).toBeTruthy();
  expect(mockGetProduct).not.toHaveBeenCalled();
  invalid.unmount();

  mockParams = { productId: "91" };
  mockGetProduct.mockRejectedValueOnce(new Error("offline"));
  const valid = render(<ProductDetailScreen />);
  const retry = await valid.findByRole("button", { name: i18n.t("reviews.retry") });
  fireEvent.press(retry);
  expect(await valid.findByText("Plaquettes live")).toBeTruthy();
  expect(mockGetProduct).toHaveBeenCalledTimes(2);
});

it("uses a supported icon for half-star ratings", async () => {
  mockParams = { productId: "91" };
  mockGetProduct.mockResolvedValueOnce({
    success: true,
    data: { ...product, rating: 3.5, reviewsCount: 2 },
  });
  const screen = render(<ProductDetailScreen />);

  await screen.findByText("Plaquettes live");
  expect(screen.queryByText("⯨")).toBeNull();
});
it("uses list-add language for occasion products instead of a basket purchase", async () => {
  mockParams = { productId: "91" };
  mockGetProduct.mockResolvedValueOnce({
    success: true,
    data: { ...product, condition: "occasion" },
  });
  const screen = render(<ProductDetailScreen />);

  expect(await screen.findByRole("button", { name: i18n.t("Ajoutez à la liste") })).toBeTruthy();
  expect(screen.queryByRole("button", { name: i18n.t("Ajouter au panier") })).toBeNull();
  expect(screen.queryByText(`${product.price.toLocaleString("fr-MA")} Dhs TTC`)).toBeNull();
});
it("shows an honest empty-media state without photo-specific occasion guidance", async () => {
  mockParams = { productId: "91", state: "extra-info" };
  mockGetProduct.mockResolvedValueOnce({
    success: true,
    data: { ...product, condition: "occasion", images: [] },
  });
  const screen = render(<ProductDetailScreen />);

  expect(await screen.findByText(i18n.t("requestFlow.noPhoto"))).toBeTruthy();
  expect(screen.queryByText("1/1")).toBeNull();
  expect(screen.queryByText(i18n.t("Pièce d'occasion — état conforme à la photo"))).toBeNull();
  expect(screen.queryByText(i18n.t("Vérifiez les photos avant de confirmer votre achat."))).toBeNull();
});
it("slides through multiple gallery photos via the shared image slider", async () => {
  mockParams = { productId: "91" };
  mockGetProduct.mockResolvedValueOnce({
    success: true,
    data: {
      ...product,
      images: ["https://cdn.example.test/1.jpg", "https://cdn.example.test/2.jpg"],
    },
  });
  const screen = render(<ProductDetailScreen />);

  expect(await screen.findByTestId("image-slider")).toBeTruthy();
  expect(screen.getByTestId("image-slide-1")).toBeTruthy();
});
it("routes guest basket and wishlist actions to Client login without protected calls", async () => {
  mockParams = { productId: "91" };
  const screen = render(<ProductDetailScreen />);
  await screen.findByText("Plaquettes live");

  fireEvent.press(screen.getByLabelText("Ajouter à la liste"));
  fireEvent.press(screen.getByRole("button", { name: i18n.t("Ajouter au panier") }));

  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(auth)/ClientLoginScreen",
    params: { returnTo: "/(client)/products/91" },
  });
  expect(addToWishlist).not.toHaveBeenCalled();
  expect(addToBasket).not.toHaveBeenCalled();
});

it("validates review ids and gates leave-review for guests", async () => {
  mockParams = { productId: "0" };
  const invalid = render(<ReviewsScreen />);
  expect(await invalid.findByText(i18n.t("auth.error.generic"))).toBeTruthy();
  expect(mockGetReviews).not.toHaveBeenCalled();
  invalid.unmount();

  mockParams = { productId: "91" };
  const valid = render(<ReviewsScreen />);
  const leaveReviewButtons = await valid.findAllByRole("button", { name: i18n.t("reviews.leaveReview") });
  fireEvent.press(leaveReviewButtons[0]);
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(auth)/ClientLoginScreen",
    params: { returnTo: "/(client)/products/91/reviews" },
  });
});

it("allows a Client detail mutation to call the protected resource", async () => {
  mockedUseSession.mockReturnValue({ role: Role.CLIENT } as ReturnType<typeof useSession>);
  mockParams = { productId: "91" };
  const screen = render(<ProductDetailScreen />);
  await screen.findByText("Plaquettes live");

  fireEvent.press(screen.getByLabelText("Ajouter à la liste"));
  await waitFor(() => expect(addToWishlist).toHaveBeenCalledWith(91));
});

it("splits level-3 rows by condition instead of always jumping straight to results", async () => {
  mockParams = { categoryId: "11", condition: "occasion" };
  const occasionScreen = render(<CategoryDrillScreen />);
  fireEvent.press(await findActionButton(occasionScreen, i18n.t("Ajoutez à la liste")));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(client)/categories/[categoryId]/brands",
    params: { categoryId: "12" },
  });
  expect(mockGetProductsByCategory).not.toHaveBeenCalled();
  occasionScreen.unmount();

  mockParams = { categoryId: "11", condition: "en_stock" };
  const stockScreen = render(<CategoryDrillScreen />);
  fireEvent.press(await findActionButton(stockScreen, "arrow-right"));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(client)/categories/results",
    params: { categoryId: "12", condition: "en_stock" },
  });
});

it("routes both the occasion level-3 row body and its CTA to the same Brands screen", async () => {
  mockParams = { categoryId: "11", condition: "occasion" };
  const screen = render(<CategoryDrillScreen />);

  fireEvent.press(await screen.findByText("Plaquettes"));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(client)/categories/[categoryId]/brands",
    params: { categoryId: "12" },
  });

  mockPush.mockClear();
  fireEvent.press(getActionButton(screen, i18n.t("Ajoutez à la liste")));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(client)/categories/[categoryId]/brands",
    params: { categoryId: "12" },
  });
  expect(screen.queryByRole("button", { name: i18n.t("Ajouter à la liste") })).toBeNull();
});

it("lists an occasion product's category from product detail instead of adding to the basket", async () => {
  mockParams = { productId: "91" };
  mockGetProduct.mockResolvedValueOnce({ success: true, data: { ...product, condition: "occasion" } });
  const screen = render(<ProductDetailScreen />);

  fireEvent.press(await screen.findByRole("button", { name: i18n.t("Ajoutez à la liste") }));
  // Two "Ajouter à la liste" buttons now coexist here: the page's wishlist
  // heart (shares this exact label, unrelated to this flow) and the sheet's
  // confirm button opened above — the sheet's is the one rendered last.
  const addToListButtons = await screen.findAllByRole("button", { name: i18n.t("Ajouter à la liste") });
  fireEvent.press(addToListButtons[addToListButtons.length - 1]);

  await waitFor(() => expect(mockShowNotification).toHaveBeenCalledWith(i18n.t("Ajouté à la liste !")));
  expect(addToBasket).not.toHaveBeenCalled();
});

it("carries the occasion condition from Home category cards", async () => {
  mockedUseSession.mockReturnValue({ role: Role.CLIENT } as ReturnType<typeof useSession>);
  const screen = render(<HomeScreen />);
  await screen.findAllByText("Plaquettes live");

  fireEvent.press(screen.getByText("Freins"));

  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(client)/categories/[categoryId]",
    params: { categoryId: "10", condition: "occasion" },
  });
});

it("does not redirect an occasion level-3 deep load to the priced results screen", async () => {
  mockParams = { categoryId: "12", condition: "occasion" };
  const screen = render(<CategoryDrillScreen />);

  expect(await findActionButton(screen, i18n.t("Ajoutez à la liste"))).toBeTruthy();
  expect(mockPush).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
});

it("renders the leaf itself as an add-to-list row when its parent is absent from the tree", async () => {
  mockGetCategoryTree.mockResolvedValueOnce({ success: true, data: [...categoryTree, orphanLeafCategory] });
  mockParams = { categoryId: "13", condition: "occasion" };
  const screen = render(<CategoryDrillScreen />);

  expect(await findActionButton(screen, i18n.t("Ajoutez à la liste"))).toBeTruthy();
  expect(screen.queryByText(i18n.t("Aucune catégorie disponible"))).toBeNull();
  expect(mockPush).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
});

it("renders level-2 children as list rows instead of a grid, and drills deeper on press", async () => {
  mockParams = { categoryId: "10", condition: "occasion" };
  const screen = render(<CategoryDrillScreen />);

  // A grid cell (ItemCategoryComponent) never renders an "arrow-right"
  // action button — finding one here proves level-2 now renders as a list
  // row (ItemSubCategoryComponent), not the old 2-column grid.
  const arrow = await findActionButton(screen, "arrow-right");
  fireEvent.press(arrow);

  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/(client)/categories/[categoryId]",
    params: { categoryId: "11", condition: "occasion" },
  });
});

it.each(["fr", "ar"])("turns a brand row into a demande draft line and back via Liste/trash in %s", async (language) => {
  await i18n.changeLanguage(language);
  mockParams = { categoryId: "12" };
  const screen = render(<CategoryBrandsScreen />);
  await screen.findByText(i18n.language === "ar" ? "ريدكس" : "RIDEX");

  fireEvent.press(await findActionButton(screen, i18n.t("Liste")));
  expect(screen.queryByText(i18n.t("Condition"))).toBeNull();
  expect(mockShowNotification).not.toHaveBeenCalled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText(i18n.t("Augmenter la quantité")));
  const popup = screen.UNSAFE_getAllByType(Modal).find((modal) => modal.props.visible);
  expect(popup).toBeDefined();
  fireEvent(popup!, "requestClose");
  await waitFor(() => expect(screen.queryByText(i18n.t("Quantité"))).toBeNull());
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  fireEvent.press(await findActionButton(screen, i18n.t("Liste")));
  expect(await screen.findByText("1")).toBeTruthy();
  fireEvent.press(screen.getByLabelText(i18n.t("Augmenter la quantité")));
  fireEvent.press(await findActionButton(screen, i18n.t("Ajouter à la liste")));

  expect(mockShowNotification).toHaveBeenCalledWith(i18n.t("Ajouté à la liste !"));
  expect(await findActionButton(screen, i18n.t("Ajouté"))).toBeTruthy();
  // Draft line is keyed by the leaf category (the demande carries no SKU) —
  // quantity 2, occasion condition, title = the LEAF name, plus the chosen
  // brand id/name.
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    "requestDraft",
    JSON.stringify([{ categoryId: 12, title: "Plaquettes", titleAr: "وسادات", quantity: 2, condition: "occasion", brandId: 1, brandName: "RIDEX", brandNameAr: "ريدكس" }]),
  ));

  fireEvent.press(getActionButton(screen, i18n.t("Ajouté")));
  expect(await screen.findByText("2")).toBeTruthy();
  fireEvent.press(screen.getByLabelText(i18n.t("Augmenter la quantité")));
  fireEvent.press(getActionButton(screen, i18n.t("Ajouter à la liste")));
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(
    "requestDraft",
    JSON.stringify([{ categoryId: 12, title: "Plaquettes", titleAr: "وسادات", quantity: 3, condition: "occasion", brandId: 1, brandName: "RIDEX", brandNameAr: "ريدكس" }]),
  ));

  const trash = getActionButton(screen, i18n.t("Retirer de la liste"));
  fireEvent.press(trash);

  expect(mockShowNotification).toHaveBeenCalledWith(i18n.t("Retiré de la liste"));
  expect(await findActionButton(screen, i18n.t("Liste"))).toBeTruthy();
  expect(screen.queryByRole("button", { name: i18n.t("Ajouté") })).toBeNull();
  expect(AsyncStorage.setItem).toHaveBeenCalledWith("requestDraft", JSON.stringify([]));
  // Guests can add/remove the draft line — no auth redirect anywhere in the flow.
  expect(mockPush).not.toHaveBeenCalled();
});

it("appends exactly one draft line when Liste is pressed twice in the same frame", async () => {
  mockParams = { categoryId: "12" };
  const screen = render(<CategoryBrandsScreen />);
  await screen.findByText(i18n.language === "ar" ? "ريدكس" : "RIDEX");

  const listButton = await findActionButton(screen, i18n.t("Liste"));
  act(() => {
    fireEvent.press(listButton);
    fireEvent.press(listButton);
  });

  const confirmButton = await findActionButton(screen, i18n.t("Ajouter à la liste"));
  act(() => {
    fireEvent.press(confirmButton);
    fireEvent.press(confirmButton);
  });
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalled());
  const setItemMock = AsyncStorage.setItem as jest.Mock;
  const lastPersisted = JSON.parse(setItemMock.mock.calls[setItemMock.mock.calls.length - 1][1] as string);
  expect(lastPersisted).toHaveLength(1);
  expect(lastPersisted[0].categoryId).toBe(12);
  expect(lastPersisted[0].brandId).toBe(1);
});

it("adds two brands of the same leaf as two draft lines and removes only one via trash", async () => {
  mockParams = { categoryId: "12" };
  const screen = render(<CategoryBrandsScreen />);
  await screen.findByText(i18n.language === "ar" ? "ريدكس" : "RIDEX");
  await screen.findByText("Bosch");

  fireEvent.press(await findActionButton(screen, i18n.t("Liste")));
  fireEvent.press(screen.getByLabelText(i18n.t("Augmenter la quantité")));
  fireEvent.press(await findActionButton(screen, i18n.t("Ajouter à la liste")));
  await waitFor(() => expect(screen.getAllByRole("button", { name: i18n.t("Liste") })).toHaveLength(1));
  fireEvent.press(getActionButton(screen, i18n.t("Liste")));
  fireEvent.press(await findActionButton(screen, i18n.t("Ajouter à la liste")));

  const setItemMock = AsyncStorage.setItem as jest.Mock;
  await waitFor(() => {
    const lastPersisted = JSON.parse(setItemMock.mock.calls[setItemMock.mock.calls.length - 1][1] as string);
    expect(lastPersisted).toHaveLength(2);
  });
  const bothAdded = JSON.parse(setItemMock.mock.calls[setItemMock.mock.calls.length - 1][1] as string) as { brandId: number | null; quantity: number }[];
  expect(bothAdded.map((entry) => entry.brandId).sort()).toEqual([1, 2]);
  expect(bothAdded.map((entry) => entry.quantity)).toEqual([2, 1]);

  const trashButtons = screen.getAllByRole("button", { name: i18n.t("Retirer de la liste") });
  expect(trashButtons).toHaveLength(2);
  fireEvent.press(trashButtons[0]);

  await waitFor(() => {
    const lastPersisted = JSON.parse(setItemMock.mock.calls[setItemMock.mock.calls.length - 1][1] as string);
    expect(lastPersisted).toHaveLength(1);
  });
});

it("renders a single brandless add-to-list row when the leaf has no linked brands", async () => {
  mockGetCategoryBrands.mockResolvedValueOnce({ success: true, data: [] });
  mockParams = { categoryId: "12" };
  const screen = render(<CategoryBrandsScreen />);

  const listButton = await findActionButton(screen, i18n.t("Liste"));
  expect(screen.getAllByRole("button", { name: i18n.t("Liste") })).toHaveLength(1);
  fireEvent.press(listButton);
  fireEvent.press(await findActionButton(screen, i18n.t("Ajouter à la liste")));

  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    "requestDraft",
    JSON.stringify([{ categoryId: 12, title: "Plaquettes", titleAr: "وسادات", quantity: 1, condition: "occasion", brandId: null, brandName: null, brandNameAr: null }]),
  ));
});

it("shows the leaf sublabel and the brand title in both French and Arabic", async () => {
  mockParams = { categoryId: "12" };
  const screen = render(<CategoryBrandsScreen />);

  expect(await screen.findByText("RIDEX")).toBeTruthy();
  expect(screen.getAllByText(i18n.t("home.category", { value: "Plaquettes" })).length).toBeGreaterThan(0);
  screen.unmount();

  await i18n.changeLanguage("ar");
  mockParams = { categoryId: "12" };
  const arScreen = render(<CategoryBrandsScreen />);

  expect(await arScreen.findByText("ريدكس")).toBeTruthy();
  expect(arScreen.getAllByText(i18n.t("home.category", { value: "وسادات" })).length).toBeGreaterThan(0);
});

it("lets a signed-in client add a brand without a login redirect", async () => {
  mockedUseSession.mockReturnValue({ role: Role.CLIENT } as ReturnType<typeof useSession>);
  mockParams = { categoryId: "12" };
  const screen = render(<CategoryBrandsScreen />);
  await screen.findByText(i18n.language === "ar" ? "ريدكس" : "RIDEX");

  fireEvent.press(await findActionButton(screen, i18n.t("Liste")));
  fireEvent.press(await findActionButton(screen, i18n.t("Ajouter à la liste")));

  expect(mockShowNotification).toHaveBeenCalledWith(i18n.t("Ajouté à la liste !"));
  expect(await findActionButton(screen, i18n.t("Ajouté"))).toBeTruthy();
  expect(mockPush).not.toHaveBeenCalled();
});

it("rejects an invalid brands route id before loading the category tree or brands", async () => {
  mockParams = { categoryId: "12x" };
  const screen = render(<CategoryBrandsScreen />);

  expect(await screen.findByText(i18n.t("auth.error.generic"))).toBeTruthy();
  expect(mockGetCategoryTree).not.toHaveBeenCalled();
  expect(mockGetCategoryBrands).not.toHaveBeenCalled();
});

it("renders the generic error and never persists a draft line for a level-1 or level-2 brands route id", async () => {
  mockParams = { categoryId: "10" };
  const l1Screen = render(<CategoryBrandsScreen />);
  expect(await l1Screen.findByText(i18n.t("auth.error.generic"))).toBeTruthy();
  l1Screen.unmount();

  mockParams = { categoryId: "11" };
  const l2Screen = render(<CategoryBrandsScreen />);
  expect(await l2Screen.findByText(i18n.t("auth.error.generic"))).toBeTruthy();

  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it("always shows price and the wishlist heart, and never renders a Liste button for occasion products", async () => {
  mockParams = { categoryId: "12", condition: "en_stock" };
  const stockScreen = render(<CategoryResultsScreen />);
  await stockScreen.findByText("Plaquettes live");

  expect(stockScreen.getByText(i18n.t("home.category", { value: "Plaquettes" }))).toBeTruthy();
  expect(stockScreen.getByText("299 dhs")).toBeTruthy();
  expect(stockScreen.getByLabelText(i18n.t("Ajouter à la liste de souhaits"))).toBeTruthy();
  stockScreen.unmount();

  mockParams = { categoryId: "12", condition: "occasion" };
  const occasionScreen = render(<CategoryResultsScreen />);
  await occasionScreen.findByText("Plaquettes live");

  expect(occasionScreen.getByText("299 dhs")).toBeTruthy();
  expect(occasionScreen.getByLabelText(i18n.t("Ajouter à la liste de souhaits"))).toBeTruthy();
  expect(occasionScreen.queryByRole("button", { name: i18n.t("Liste") })).toBeNull();
  expect(occasionScreen.queryByRole("button", { name: i18n.t("Retirer de la liste") })).toBeNull();
});
