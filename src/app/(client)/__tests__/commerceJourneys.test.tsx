import React from 'react';
import { act, fireEvent, render as rtlRender, waitFor, within } from '@testing-library/react-native';
import i18n from '@/localization/i18n';
import type { Basket } from '@/interfaces/Basket';
import type { Address } from '@/interfaces/Address';
import type { Order } from '@/interfaces/Order';
import { ApiClientError } from '@/api/types';
import type { ClientOfferItem } from '@/interfaces/Offer';
import type { Request } from '@/interfaces/Request';
import { addToBasket, addToWishlist, applyCoupon, getBasket, getOffers, getProduct, getRequest, getWishlist, postReview, removeBasketItem, removeWishlistItem, reportAbuse, updateBasketItem, updateBasketPremium } from '@/api';
import { addAddress, getAddresses } from '@/api/resources/addresses';
import { getOrder, placeOrder } from '@/api/resources/orders';
import { CartContext } from '@/context/CartContext';
import { RequestDraftProvider } from '@/context/RequestDraftContext';
import { WishlistProvider } from '@/context/WishlistContext';
import CartScreen from '../cart';
import CheckoutScreen from '../payment';
import OrderSuccessScreen from '../payment/success';
import LeaveReviewScreen from '../products/[productId]/review';
import ReportAbuseScreen from '../products/[productId]/report';
import ProductDetailScreen from '../products/[productId]';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string | undefined> = {};
let mockFocusCallback: (() => void | (() => void)) | null = null;
const mockShowNotification = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: () => void | (() => void)) => {
    mockFocusCallback = callback;
    const ReactModule = require('react') as typeof React;
    ReactModule.useEffect(callback, [callback]);
  },
}));
jest.mock('@/api', () => ({
  getBasket: jest.fn(), applyCoupon: jest.fn(), updateBasketItem: jest.fn(), removeBasketItem: jest.fn(), updateBasketPremium: jest.fn(),
  getRequest: jest.fn(), getOffers: jest.fn(),
  postReview: jest.fn(), reportAbuse: jest.fn(),
  getProduct: jest.fn(), addToBasket: jest.fn(), getWishlist: jest.fn(), addToWishlist: jest.fn(), removeWishlistItem: jest.fn(),
}));
jest.mock('@/context/AuthContext', () => ({
  Role: { CLIENT: 'client', PRESTATAIRE: 'prestataire' },
  useSession: () => ({ role: 'client' }),
}));
jest.mock('@/api/resources/basket', () => ({ getBasket: jest.fn() }));
jest.mock('@/api/resources/addresses', () => ({ addAddress: jest.fn(), getAddresses: jest.fn() }));
jest.mock('@/api/resources/orders', () => ({ getOrder: jest.fn(), placeOrder: jest.fn() }));
jest.mock('@/context/ConfirmationContext', () => ({
  useConfirmation: () => ({ showConfirmation: (_title: string, _message: string, confirm: () => void) => confirm() }),
}));
jest.mock('@/context/NotificationContext', () => ({
  useNotification: () => ({ showNotification: mockShowNotification }),
}));
jest.mock('@/components/common/Button', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return function MockButton({ title, onPress, disabled }: { title: string; onPress?: () => void; disabled?: boolean }) {
    return React.createElement(View, {
      accessible: true, accessibilityRole: 'button', accessibilityLabel: title,
      accessibilityState: { disabled }, onPress: disabled ? undefined : onPress,
    }, React.createElement(Text, null, title));
  };
});
jest.mock('@/components/common/TextInput', () => {
  const React = require('react');
  const { TextInput } = require('react-native');
  return function MockInput(props: object) { return React.createElement(TextInput, props); };
});
jest.mock('@/components/common/CustomModal', () => {
  const React = require('react');
  const { View } = require('react-native');
  const { Text } = require('react-native');
  return function MockModal({ visible, title, children, primaryButton, secondaryButton }: { visible: boolean; title?: string; children?: React.ReactNode; primaryButton?: { title: string; onPress: () => void }; secondaryButton?: { title: string; onPress: () => void } }) {
    const action = (button?: { title: string; onPress: () => void }) => button ? React.createElement(View, { accessible: true, accessibilityRole: 'button', accessibilityLabel: button.title, onPress: button.onPress }, React.createElement(Text, null, button.title)) : null;
    return visible ? React.createElement(View, null, title ? React.createElement(Text, null, title) : null, children, action(primaryButton), action(secondaryButton)) : null;
  };
});
jest.mock('@/components/screens/shared/app/EmptyListComponent', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockEmpty({ title }: { title: string }) { return React.createElement(Text, null, title); };
});
jest.mock('@/components/screens/client/checkout/ClientCheckoutForm', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return function MockCheckoutForm({ addresses, selectedAddressId, onSelectPaymentMethod, onSelectNewAddress, onCreateAddress }: {
    addresses: Address[];
    selectedAddressId: number | null;
    onSelectPaymentMethod: (value: string) => void;
    onSelectNewAddress: () => void;
    onCreateAddress: (payload: { addressLine1: string; city: string; region: string; country: string }) => Promise<void>;
  }) {
    return React.createElement(View, null,
      React.createElement(Text, { testID: 'visible-addresses' }, addresses.slice(0, 2).map((address) => address.id).join(',')),
      React.createElement(Text, { testID: 'selected-address' }, String(selectedAddressId)),
      React.createElement(View, {
        accessible: true,
        accessibilityRole: 'button',
        accessibilityLabel: 'create-inline-address',
        onPress: () => {
          onSelectNewAddress();
          void onCreateAddress({ addressLine1: '12 rue Atlas', city: 'Casablanca', region: 'Maarif', country: 'Morocco' });
        },
      }, React.createElement(Text, null, 'create-inline-address')),
      React.createElement(View, { accessible: true, accessibilityRole: 'button', accessibilityLabel: 'select-visa', onPress: () => onSelectPaymentMethod('visa') }, React.createElement(Text, null, 'visa')),
      React.createElement(View, { accessible: true, accessibilityRole: 'button', accessibilityLabel: 'select-cod', onPress: () => onSelectPaymentMethod('cod') }, React.createElement(Text, null, 'cod')));
  };
});
jest.mock('@/components/screens/shared/app/RatingStars', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return function MockRating({ onRate }: { onRate: (rating: 5) => void }) {
    return React.createElement(View, { accessible: true, accessibilityRole: 'button', accessibilityLabel: 'rate-5', onPress: () => onRate(5) }, React.createElement(Text, null, 'rate-5'));
  };
});

const apiGetBasket = getBasket as jest.MockedFunction<typeof getBasket>;
const apiGetRequest = getRequest as jest.MockedFunction<typeof getRequest>;
const apiGetOffers = getOffers as jest.MockedFunction<typeof getOffers>;
const apiUpdateBasketItem = updateBasketItem as jest.MockedFunction<typeof updateBasketItem>;
const apiRemoveBasketItem = removeBasketItem as jest.MockedFunction<typeof removeBasketItem>;
const apiApplyCoupon = applyCoupon as jest.MockedFunction<typeof applyCoupon>;
const apiUpdateBasketPremium = updateBasketPremium as jest.MockedFunction<typeof updateBasketPremium>;
const apiPostReview = postReview as jest.MockedFunction<typeof postReview>;
const apiReportAbuse = reportAbuse as jest.MockedFunction<typeof reportAbuse>;
const apiGetProduct = getProduct as jest.MockedFunction<typeof getProduct>;
const apiAddToBasket = addToBasket as jest.MockedFunction<typeof addToBasket>;
const apiGetWishlist = getWishlist as jest.MockedFunction<typeof getWishlist>;
const apiAddToWishlist = addToWishlist as jest.MockedFunction<typeof addToWishlist>;
const apiRemoveWishlistItem = removeWishlistItem as jest.MockedFunction<typeof removeWishlistItem>;
const checkoutGetBasket = jest.requireMock('@/api/resources/basket').getBasket as jest.Mock;
const mockAddAddress = addAddress as jest.MockedFunction<typeof addAddress>;
const mockGetAddresses = getAddresses as jest.MockedFunction<typeof getAddresses>;
const mockPlaceOrder = placeOrder as jest.MockedFunction<typeof placeOrder>;
const mockGetOrder = getOrder as jest.MockedFunction<typeof getOrder>;

// ProductDetailScreen now mounts AddToListSheet unconditionally (occasion
// vs en_stock is decided inside the sheet, toggling only CustomModal's
// `visible` prop) — shadow `render` so every call site below picks up
// useRequestDraft() without touching each test.
function render(ui: React.ReactElement) {
  return rtlRender(
    <RequestDraftProvider>
      <WishlistProvider>{ui}</WishlistProvider>
    </RequestDraftProvider>,
  );
}

// ponytail: CartScreen/CheckoutScreen call useCart() (throws outside a
// provider) — this is a lightweight stand-in for CartProvider, skipping the
// real provider's mount-time auto-refresh so it doesn't double the
// apiGetBasket call-count assertions below.
function CartTestProvider({ children }: { children: React.ReactNode }) {
  const [basket, setBasket] = React.useState<Basket | null>(null);
  const refresh = React.useCallback(async () => {
    try {
      const response = await getBasket();
      setBasket(response.data);
    } catch {
      // mirrors CartContext's own swallow-on-failure refresh
    }
  }, []);
  const itemCount = basket?.items?.reduce((n, i) => n + i.quantity, 0) ?? 0;
  return (
    <CartContext.Provider value={{ basket, setBasket, refresh, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}
function renderWithCart(ui: React.ReactElement) {
  return render(<CartTestProvider>{ui}</CartTestProvider>);
}

const item = { id: 501, basketId: 19, offerId: 71, categoryId: 12, quantity: 2, unitPrice: 50, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
const basket: Basket = { id: 19, userId: 5, requestId: null, premium: false, premiumFee: 0, subtotal: 101.11, discountAmount: 7.22, shippingFee: 13.33, taxAmount: 19.44, total: 126.66, createdAt: '2026-01-01', updatedAt: '2026-01-01', items: [item] };
const changedBasket: Basket = { ...basket, subtotal: 151.11, taxAmount: 29.44, total: 186.66, items: [{ ...item, quantity: 3 }] };
const address: Address = { id: 9, userId: 5, label: 'Maison', addressLine1: '1 rue', addressLine2: null, city: 'Rabat', postalCode: null, region: null, country: 'MA', latitude: null, longitude: null, isDefault: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
const order: Order = { id: 81, reference: 'ORD-81', userId: 5, addressId: 9, couponId: null, subtotal: 101.11, discountAmount: 7.22, shippingFee: 13.33, premiumFee: 0, taxAmount: 19.44, total: 126.66, returnedAmount: 0, status: 'pending', paymentMethod: 'cod', paymentStatus: 'pending', notes: null, confirmedBy: null, confirmedAt: null, createdAt: '2026-01-01', updatedAt: '2026-01-01', items: [] };
const product = { id: 71, title: 'Plaquettes live', titleAr: 'قطع', condition: 'en_stock' as const, articleNumber: 'PL-71', price: 50, promoPrice: null, images: ['https://example.test/part.jpg'], description: 'Description', descriptionAr: 'وصف', categoryId: 12, categoryName: 'Freins', categoryNameAr: 'فرامل', brand: 'Brembo', sellerName: 'Vendeur', sellerId: 8, rating: 4, reviewsCount: 2, stock: 9, warranty: null, warrantyAr: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
const pagination = { total: 0, perPage: 20, currentPage: 1, lastPage: 1, from: null, to: null };
const clientOffer = (overrides: Partial<ClientOfferItem> & Pick<ClientOfferItem, 'id' | 'requestItemId'>): ClientOfferItem => ({
  reference: `OFF-${overrides.id}`, requestId: 73, priceClient: 100, description: null, audioUrl: null,
  availability: 'available', status: 'validated', adminNotes: null, validatedAt: '2026-01-01', createdAt: '2026-01-01', updatedAt: '2026-01-01',
  ...overrides,
} as ClientOfferItem);

beforeEach(async () => {
  jest.clearAllMocks();
  mockParams = {};
  mockFocusCallback = null;
  await i18n.changeLanguage('fr');
  apiGetBasket.mockResolvedValue({ success: true, data: basket });
  apiGetRequest.mockResolvedValue({
    success: true,
    data: {
      id: 73, reference: 'REQ-73', userId: 5, vehicleId: 1, addressId: null, notes: null,
      status: 'validated', aiValidationTag: null, aiValidationReason: null, offersCount: 2,
      expiresAt: '2026-09-02T00:00:00.000Z', createdAt: '2026-01-01', updatedAt: '2026-01-01',
      items: [
        { id: 1, requestId: 73, categoryId: 12, quantity: 1, condition: 'occasion', notes: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
        { id: 2, requestId: 73, categoryId: 13, quantity: 1, condition: 'occasion', notes: null, createdAt: '2026-01-01', updatedAt: '2026-01-01', categoryTitle: 'Pare-chocs avant' },
      ],
    },
  });
  apiGetOffers.mockResolvedValue({ success: true, data: [clientOffer({ id: 70, requestItemId: 2 })], pagination });
  apiUpdateBasketItem.mockResolvedValue({ success: true, data: changedBasket });
  apiRemoveBasketItem.mockResolvedValue({ success: true, data: { ...basket, items: [] } });
  apiApplyCoupon.mockResolvedValue({ success: true, data: { valid: true, discountAmount: 7.22, code: 'LIVE' } });
  apiUpdateBasketPremium.mockResolvedValue({ success: true, data: { ...basket, premium: true, premiumFee: 55, total: 181.66 } });
  checkoutGetBasket.mockResolvedValue({ success: true, data: basket });
  mockGetAddresses.mockResolvedValue({ success: true, data: [address], pagination: { ...pagination, total: 1, from: 1, to: 1 } });
  mockAddAddress.mockResolvedValue({ success: true, data: { ...address, id: 44, isDefault: false, label: null } });
  mockPlaceOrder.mockResolvedValue({ success: true, data: order });
  mockGetOrder.mockResolvedValue({ success: true, data: order });
  apiPostReview.mockResolvedValue({ success: true, data: { id: 44, reviewerId: 5, reviewableType: 'product', reviewableId: 71, rating: 5, comment: 'Très bon', createdAt: '2026-01-01', updatedAt: '2026-01-01' } });
  apiReportAbuse.mockResolvedValue({ success: true, data: { reported: true, productId: 71 } });
  apiGetProduct.mockResolvedValue({ success: true, data: product });
  apiGetWishlist.mockResolvedValue({ success: true, data: [], pagination });
  apiAddToWishlist.mockResolvedValue({ success: true, data: { id: 91, userId: 5, categoryId: 12, pneumaticId: null, createdAt: '2026-01-01' } });
  apiRemoveWishlistItem.mockResolvedValue({ success: true, data: { id: 91 } });
  apiAddToBasket.mockResolvedValue({ success: true, data: basket });
});

it('renders server basket amounts and reconciles quantity/remove mutations from returned envelopes', async () => {
  const screen = renderWithCart(<CartScreen />);
  expect(await screen.findByText('126,66 Dhs')).toBeTruthy();
  expect(screen.getByText('101,11 Dhs')).toBeTruthy();
  expect(screen.getByText('−7,22 Dhs')).toBeTruthy();
  expect(screen.getByText('13,33 Dhs')).toBeTruthy();
  expect(screen.getByText('19,44 Dhs')).toBeTruthy();
  // Product lines keep the stepper and read "/ Unité".
  expect(screen.getByTestId('basket-line-price-501').props.children).toBe(i18n.t('commerce.cart.perUnit', { price: '50,00 Dhs' }));

  fireEvent.press(screen.getByRole('button', { name: i18n.t('Augmenter la quantité') }));
  await waitFor(() => expect(apiUpdateBasketItem).toHaveBeenCalledWith(501, 3));
  await waitFor(() => expect(screen.getByTestId('basket-line-qty-501').props.children).toBe('3'));
  expect(screen.getByText('186,66 Dhs')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: i18n.t('commerce.cart.removeA11y', { part: 'Article #71' }) }));
  expect(await screen.findByText('Votre panier est vide')).toBeTruthy();
  expect(apiRemoveBasketItem).toHaveBeenCalledWith(501);
  expect(mockShowNotification).toHaveBeenCalledWith(i18n.t('commerce.cart.removedToast', { part: 'Article #71' }), { target: 'cart' });
});

it('reconciles Premium and every total from the basket mutation response', async () => {
  const screen = renderWithCart(<CartScreen />);
  const premium = await screen.findByRole('checkbox', { name: i18n.t('commerce.cart.premium') });

  fireEvent.press(premium);

  await waitFor(() => expect(apiUpdateBasketPremium).toHaveBeenCalledWith(true));
  expect(screen.getByTestId('basket-premium-fee').props.children).toBe('+55,00 Dhs');
  expect(screen.getByTestId('basket-total').props.children).toBe('181,66 Dhs');
});

it('identifies offer lines by part, brand and offer reference with a fixed quantity and a live expiry', async () => {
  const expiresAt = new Date(Date.now() + (3 * 24 * 60 + 2 * 60) * 60_000 + 30_000).toISOString();
  const offerLine = (id: number, brandName: string, offerReference: string, unitPrice: number) => ({
    ...item, id, offerId: id, categoryId: 3, quantity: 1, unitPrice,
    categoryTitle: 'Plaquettes de frein avant', categoryTitleAr: 'بطانات الفرامل الأمامية',
    requestItemId: id - 100, brandName, brandNameAr: null, offerReference, expiresAt,
  });
  apiGetBasket.mockResolvedValueOnce({
    success: true,
    data: { ...basket, requestId: 73, discountAmount: 0, items: [offerLine(127, 'Bosch', 'OFF-TNWJWHLB', 265), offerLine(130, 'TRW', 'OFF-86DQ08IY', 402.8)] },
  });
  const screen = renderWithCart(<CartScreen />);

  expect(await screen.findByText(i18n.t('commerce.cart.brand', { value: 'Bosch' }))).toBeTruthy();
  expect(screen.getByText(i18n.t('commerce.cart.brand', { value: 'TRW' }))).toBeTruthy();
  expect(screen.getByText(i18n.t('commerce.cart.reference', { value: 'OFF-TNWJWHLB' }))).toBeTruthy();
  expect(screen.getByText(i18n.t('commerce.cart.reference', { value: 'OFF-86DQ08IY' }))).toBeTruthy();
  expect(screen.getByTestId('basket-line-price-127').props.children).toBe('265,00 Dhs');
  expect(screen.getByTestId('basket-line-price-130').props.children).toBe('402,80 Dhs');
  expect(screen.getByTestId('basket-line-qty-130').props.children).toBe(i18n.t('commerce.cart.quantity', { count: 1 }));
  expect(screen.getByTestId('basket-line-expiry-127').props.children).toBe(i18n.t('commerce.cart.expiresIn', { value: i18n.t('countdown.daysHours', { days: 3, hours: 2 }) }));
  expect(screen.queryByRole('button', { name: i18n.t('Augmenter la quantité') })).toBeNull();
  expect(screen.getByText("Veuillez remplir votre commande avant le délai d'expiration")).toBeTruthy();
  expect(screen.getByText(i18n.t('cart.voucher.claim'))).toBeTruthy();
  expect(screen.getByTestId('basket-shipping').props.children).toBe('13,33 Dhs');
});

it('shows an expired offer line and localizes the countdown units in Arabic', async () => {
  const line = { ...item, id: 140, offerId: 40, quantity: 1, unitPrice: 402.8, requestItemId: 9, brandName: 'TRW', brandNameAr: 'تي آر دبليو', offerReference: 'OFF-40' };
  apiGetBasket.mockResolvedValueOnce({
    success: true,
    data: { ...basket, items: [
      { ...line, expiresAt: new Date(Date.now() - 60_000).toISOString() },
      { ...line, id: 141, offerId: 41, expiresAt: new Date(Date.now() + (5 * 60 + 7) * 60_000 + 30_000).toISOString() },
    ] },
  });
  await i18n.changeLanguage('ar');
  const screen = renderWithCart(<CartScreen />);

  expect(await screen.findAllByText(i18n.t('commerce.cart.brand', { value: 'تي آر دبليو' }))).toHaveLength(2);
  expect(screen.getByTestId('basket-line-expiry-140').props.children).toBe(i18n.t('commerce.cart.expired'));
  // Mixed Arabic / digit text renders as script runs: match the whole label.
  expect(screen.getByText(i18n.t('commerce.cart.expiresIn', { value: i18n.t('countdown.hoursMinutes', { hours: 5, minutes: '07' }) }))).toBeTruthy();
  // Arabic prices use the partner "دم" label (script runs, so match the whole label).
  expect(within(screen.getByTestId('basket-line-price-141')).getByText('402,80 دم')).toBeTruthy();
  // "Réclamé": a voucher claim, not an exchange ("تم الاستبدال").
  expect(screen.getByText('تمت المطالبة')).toBeTruthy();
});

it('reloads the canonical basket when the cart regains focus', async () => {
  const emptyBasket = { ...basket, items: [] };
  apiGetBasket.mockResolvedValueOnce({ success: true, data: emptyBasket }).mockResolvedValueOnce({ success: true, data: basket });
  const screen = renderWithCart(<CartScreen />);
  expect(await screen.findByText('Votre panier est vide')).toBeTruthy();
  await act(async () => { mockFocusCallback?.(); });
  expect(await screen.findByText('126,66 Dhs')).toBeTruthy();
  expect(apiGetBasket).toHaveBeenCalledTimes(2);
});

it('renders the Figma empty basket: explore action, dashed summary and a disabled checkout', async () => {
  apiGetBasket.mockResolvedValueOnce({ success: true, data: { ...basket, items: [] } });
  const screen = renderWithCart(<CartScreen />);

  expect(await screen.findByText('Votre panier est vide')).toBeTruthy();
  expect(screen.getByTestId('basket-total').props.children).toBe('—');
  expect(screen.getByTestId('basket-tax').props.children).toBe('—');
  expect(screen.getByTestId('basket-shipping').props.children).toBe('—');
  expect(screen.getByRole('button', { name: 'Caisse de sortie' }).props.accessibilityState).toEqual({ disabled: true });
  expect(screen.queryByText("Veuillez remplir votre commande avant le délai d'expiration")).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Explorer les produits' }));
  expect(mockPush).toHaveBeenCalledWith('/(client)/categories');
  fireEvent.press(screen.getByRole('button', { name: 'Caisse de sortie' }));
  expect(apiGetRequest).not.toHaveBeenCalled();
});

const brakeRequest: Request = {
  id: 73, reference: 'REQ-73', userId: 5, vehicleId: 1, addressId: null, notes: null,
  status: 'validated', aiValidationTag: null, aiValidationReason: null, offersCount: 3,
  expiresAt: '2026-09-02T00:00:00.000Z', createdAt: '2026-01-01', updatedAt: '2026-01-01',
  items: [
    { id: 32, requestId: 73, categoryId: 3, quantity: 1, condition: 'occasion', notes: null, createdAt: '2026-01-01', updatedAt: '2026-01-01', categoryTitle: 'Plaquettes de frein avant', brandName: 'Bosch' },
    { id: 33, requestId: 73, categoryId: 3, quantity: 1, condition: 'occasion', notes: null, createdAt: '2026-01-01', updatedAt: '2026-01-01', categoryTitle: 'Plaquettes de frein avant', brandName: 'TRW' },
    { id: 34, requestId: 73, categoryId: 5, quantity: 1, condition: 'occasion', notes: null, createdAt: '2026-01-01', updatedAt: '2026-01-01', categoryTitle: 'Kit de distribution', brandName: 'RIDEX' },
  ],
};
const boschLine = { ...item, id: 20, offerId: 27, categoryId: 3, quantity: 1, unitPrice: 265, categoryTitle: 'Plaquettes de frein avant', requestItemId: 32, brandName: 'Bosch', brandNameAr: null, offerReference: 'OFF-27', expiresAt: null };

it('warns about a part of the same category left out of the basket and links to its offers', async () => {
  apiGetBasket.mockResolvedValueOnce({ success: true, data: { ...basket, requestId: 73, items: [boschLine] } });
  apiGetRequest.mockResolvedValue({ success: true, data: brakeRequest });
  apiGetOffers.mockResolvedValue({
    success: true,
    // TRW has an offer; the RIDEX kit has none, so it must not be listed.
    data: [clientOffer({ id: 27, requestItemId: 32, status: 'selected' }), clientOffer({ id: 29, requestItemId: 33 })],
    pagination,
  });
  const screen = renderWithCart(<CartScreen />);

  fireEvent.press(await screen.findByRole('button', { name: 'Caisse de sortie' }));

  expect(await screen.findByText(i18n.t('commerce.cart.remainingPartsTitle'))).toBeTruthy();
  expect(apiGetOffers).toHaveBeenCalledWith(73);
  expect(screen.getByText(i18n.t('commerce.cart.remainingPartsOffers'))).toBeTruthy();
  const trw = i18n.t('commerce.cart.remainingPartLabel', { part: 'Plaquettes de frein avant', brand: 'TRW' });
  expect(screen.getByText(trw)).toBeTruthy();
  expect(screen.queryByText(i18n.t('commerce.cart.remainingPartLabel', { part: 'Plaquettes de frein avant', brand: 'Bosch' }))).toBeNull();
  expect(screen.queryByText(/Kit de distribution/)).toBeNull();
  expect(mockPush).not.toHaveBeenCalledWith('/(client)/payment');

  fireEvent.press(screen.getByRole('link', { name: i18n.t('commerce.cart.remainingPartA11y', { part: trw }) }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/(client)/requests/[requestId]/offers',
    params: { requestId: '73', itemId: '33' },
  });
  expect(screen.queryByText(i18n.t('commerce.cart.remainingPartsTitle'))).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: 'Caisse de sortie' }));
  fireEvent.press(await screen.findByRole('button', { name: 'commerce.cart.continueShopping' }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/(client)/requests/[requestId]', params: { requestId: '73' } });

  fireEvent.press(screen.getByRole('button', { name: 'Caisse de sortie' }));
  fireEvent.press(await screen.findByRole('button', { name: 'commerce.cart.checkoutAnyway' }));
  expect(mockPush).toHaveBeenCalledWith('/(client)/payment');
});

it('goes straight to payment when every part with offers is in the basket, even for legacy lines without requestItemId', async () => {
  const trwLegacyLine = { ...item, id: 22, offerId: 30, categoryId: 3, quantity: 1, unitPrice: 402.8 };
  apiGetBasket.mockResolvedValueOnce({ success: true, data: { ...basket, requestId: 73, items: [boschLine, trwLegacyLine] } });
  apiGetRequest.mockResolvedValueOnce({ success: true, data: brakeRequest });
  apiGetOffers.mockResolvedValueOnce({
    success: true,
    data: [clientOffer({ id: 27, requestItemId: 32, status: 'selected' }), clientOffer({ id: 30, requestItemId: 33, status: 'selected' })],
    pagination,
  });
  const screen = renderWithCart(<CartScreen />);

  fireEvent.press(await screen.findByRole('button', { name: 'Caisse de sortie' }));

  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/(client)/payment'));
  expect(screen.queryByText(i18n.t('commerce.cart.remainingPartsTitle'))).toBeNull();
});

it('stacks the offers of one part together, in the order the part first appears', async () => {
  // Server order: Bosch (item 32), TRW (item 33), then a second Bosch offer added later.
  const trwLine = { ...boschLine, id: 22, offerId: 30, unitPrice: 402.8, requestItemId: 33, brandName: 'TRW', offerReference: 'OFF-30' };
  const secondBoschLine = { ...boschLine, id: 24, offerId: 31, unitPrice: 280, offerReference: 'OFF-31' };
  apiGetBasket.mockResolvedValueOnce({ success: true, data: { ...basket, requestId: 73, items: [boschLine, trwLine, secondBoschLine] } });
  const screen = renderWithCart(<CartScreen />);

  await screen.findByTestId('basket-line-24');
  expect(screen.getAllByTestId(/^basket-line-\d+$/).map((line) => line.props.testID))
    .toEqual(['basket-line-20', 'basket-line-24', 'basket-line-22']);
  // Display order never touches the server totals.
  expect(screen.getByText('126,66 Dhs')).toBeTruthy();
});

it('lists a remaining part that has offers even without a category title', async () => {
  apiGetBasket.mockResolvedValueOnce({ success: true, data: { ...basket, requestId: 73 } });
  apiGetOffers.mockResolvedValueOnce({ success: true, data: [clientOffer({ id: 70, requestItemId: 1 })], pagination });
  const screen = renderWithCart(<CartScreen />);

  fireEvent.press(await screen.findByRole('button', { name: 'Caisse de sortie' }));

  expect(await screen.findByText(i18n.t('commerce.cart.remainingPartsTitle'))).toBeTruthy();
  expect(screen.getByText(i18n.t('commerce.cart.itemFallback', { id: 1 }))).toBeTruthy();
  expect(screen.queryByText('Pare-chocs avant')).toBeNull();
  expect(mockPush).not.toHaveBeenCalledWith('/(client)/payment');
});

it('keeps the basket on a preflight failure', async () => {
  apiGetBasket.mockResolvedValueOnce({ success: true, data: { ...basket, requestId: 73 } });
  apiGetOffers.mockRejectedValueOnce(new Error('offline'));
  const screen = renderWithCart(<CartScreen />);

  fireEvent.press(await screen.findByRole('button', { name: 'Caisse de sortie' }));

  expect(await screen.findByText(i18n.t('commerce.cart.preflightError'))).toBeTruthy();
  expect(mockPush).not.toHaveBeenCalled();
});

it('claims a voucher from the promo row, reloads server totals and shows the coupon-added modal', async () => {
  const unclaimed: Basket = { ...basket, discountAmount: 0, total: 133.88 };
  apiGetBasket.mockResolvedValueOnce({ success: true, data: unclaimed }).mockResolvedValueOnce({ success: true, data: changedBasket });
  const screen = renderWithCart(<CartScreen />);
  await screen.findByTestId('basket-total');
  expect(screen.queryByPlaceholderText(i18n.t('Code promo'))).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: i18n.t('commerce.cart.claimA11y') }));
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('Code promo')), ' LIVE ');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('Appliquer') }));

  await waitFor(() => expect(apiApplyCoupon).toHaveBeenCalledWith('LIVE'));
  expect(apiGetBasket).toHaveBeenCalledTimes(2);
  expect(await screen.findByText('186,66 Dhs')).toBeTruthy();
  expect(screen.getByText('7,22 Dhs')).toBeTruthy();
  expect(screen.getByText(i18n.t('cart.voucher.claimed'))).toBeTruthy();
  expect(screen.queryByRole('button', { name: i18n.t('commerce.cart.claimA11y') })).toBeNull();
  fireEvent.press(screen.getByTestId('basket-coupon-added'));
  expect(screen.queryByText('7,22 Dhs')).toBeNull();
});

it('keeps the coupon entry open with an error for an invalid code', async () => {
  apiGetBasket.mockResolvedValueOnce({ success: true, data: { ...basket, discountAmount: 0 } });
  apiApplyCoupon.mockResolvedValueOnce({ success: true, data: { valid: false, discountAmount: 0, code: 'NOPE' } });
  const screen = renderWithCart(<CartScreen />);
  fireEvent.press(await screen.findByRole('button', { name: i18n.t('commerce.cart.claimA11y') }));
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('Code promo')), 'nope');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('Appliquer') }));

  expect(await screen.findByText(i18n.t('Code promo invalide ou expiré'))).toBeTruthy();
  expect(apiGetBasket).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId('basket-coupon-added')).toBeNull();
});

it('keeps the completed information step collapsed and opens the profile editor', async () => {
  const screen = renderWithCart(<CheckoutScreen />);

  const modify = await screen.findByRole('button', { name: i18n.t('settings.modify') });
  expect(screen.queryByText('Client Test')).toBeNull();
  expect(screen.queryByText('0612345678')).toBeNull();
  fireEvent.press(modify);
  expect(mockPush).toHaveBeenCalledWith('/(client)/settings/profile');
});
it('creates and selects a checkout address inline without leaving the checkout', async () => {
  const screen = renderWithCart(<CheckoutScreen />);
  await screen.findByText('126,66 Dhs');

  fireEvent.press(screen.getByRole('button', { name: 'create-inline-address' }));

  await waitFor(() => expect(mockAddAddress).toHaveBeenCalledWith({
    addressLine1: '12 rue Atlas',
    city: 'Casablanca',
    region: 'Maarif',
    country: 'Morocco',
  }));
  expect(screen.getByTestId('selected-address').props.children).toBe('44');
  expect(mockPush).not.toHaveBeenCalledWith('/(client)/settings/addresses');
});
it('submits COD once with a visible server-default address and routes only the order identity', async () => {
  const nonDefault = (id: number): Address => ({ ...address, id, isDefault: false, label: `Address ${id}` });
  mockGetAddresses.mockResolvedValueOnce({
    success: true,
    data: [nonDefault(7), nonDefault(8), address],
    pagination: { ...pagination, total: 3, from: 1, to: 3 },
  });
  const screen = renderWithCart(<CheckoutScreen />);
  expect(await screen.findByText('126,66 Dhs')).toBeTruthy();
  expect(screen.getByTestId('selected-address').props.children).toBe('9');
  expect(screen.getByTestId('visible-addresses').props.children).toContain('9');
  fireEvent.press(screen.getByRole('button', { name: 'select-visa' }));
  expect(mockPlaceOrder).not.toHaveBeenCalled();
  const submit = screen.getByRole('button', { name: i18n.t('Effectuer mon achat') });
  fireEvent.press(submit);
  fireEvent.press(submit);
  await waitFor(() => expect(mockPlaceOrder).toHaveBeenCalledTimes(1));
  expect(mockPlaceOrder).toHaveBeenCalledWith({ addressId: 9, paymentMethod: 'cod', notes: null });
  expect(mockReplace).toHaveBeenCalledWith({
    pathname: '/(client)/payment/success',
    params: { orderId: '81' },
  });
});

it('surfaces Laravel checkout validation errors and keeps the order retryable', async () => {
  mockPlaceOrder
    .mockRejectedValueOnce(new ApiClientError('Validation failed', 422, { addressId: ['Adresse invalide'] }))
    .mockResolvedValueOnce({ success: true, data: order });
  const screen = renderWithCart(<CheckoutScreen />);
  const submit = await screen.findByRole('button', { name: i18n.t('Effectuer mon achat') });
  fireEvent.press(submit);
  expect(await screen.findByText('Adresse invalide')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: i18n.t('Effectuer mon achat') }));
  await waitFor(() => expect(mockPlaceOrder).toHaveBeenCalledTimes(2));
});

it('requires an address and exposes a retry after live checkout loading fails', async () => {
  mockGetAddresses.mockResolvedValueOnce({ success: true, data: [], pagination });
  let screen = renderWithCart(<CheckoutScreen />);
  expect(await screen.findByRole('button', { name: 'create-inline-address' })).toBeTruthy();
  expect(screen.getByRole('button', { name: i18n.t('Effectuer mon achat') }).props.accessibilityState.disabled).toBe(true);
  screen.unmount();

  checkoutGetBasket.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ success: true, data: basket });
  screen = renderWithCart(<CheckoutScreen />);
  const retry = await screen.findByRole('button', { name: i18n.t('checkout.retry', 'Réessayer') });
  fireEvent.press(retry);
  expect(await screen.findByText('126,66 Dhs')).toBeTruthy();
});

it('posts a validated product review once with the backend product ID', async () => {
  mockParams = { productId: '71' };
  const screen = render(<LeaveReviewScreen />);
  const submit = screen.getByRole('button', { name: i18n.t('review.submitFigma') });
  fireEvent.press(submit);
  expect(screen.getByText(i18n.t('review.ratingRequired'))).toBeTruthy();
  expect(screen.getByText(i18n.t('review.titleRequired'))).toBeTruthy();
  expect(screen.getByText(i18n.t('review.commentRequired'))).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'rate-5' }));
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('review.titleFieldPlaceholder')), 'Freins');
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('review.commentPlaceholderFigma')), 'Très bon');
  fireEvent.press(submit);
  fireEvent.press(submit);
  await waitFor(() => expect(apiPostReview).toHaveBeenCalledTimes(1));
  expect(apiPostReview).toHaveBeenCalledWith(71, { rating: 5, title: 'Freins', comment: 'Très bon' });
});

it('posts a consented abuse report once and reconciles its confirmation envelope', async () => {
  mockParams = { productId: '71' };
  const screen = render(<ReportAbuseScreen />);
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('report.emailPlaceholder')), 'client@example.test');
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('report.raisonPlaceholder')), 'Annonce incorrecte');
  fireEvent.press(screen.getByRole('checkbox'));
  const submit = screen.getByRole('button', { name: i18n.t('report.submitFigma') });
  fireEvent.press(submit);
  fireEvent.press(submit);
  await waitFor(() => expect(apiReportAbuse).toHaveBeenCalledTimes(1));
  expect(apiReportAbuse).toHaveBeenCalledWith(71, 'other', 'Annonce incorrecte', 'client@example.test', true);
});

it('toggles the returned wishlist item ID and labels the returned basket total', async () => {
  mockParams = { productId: '71' };
  const screen = render(<ProductDetailScreen />);
  await screen.findByText('Plaquettes live');
  const wishlist = screen.getByLabelText(i18n.t('Ajouter à la liste de souhaits'));
  fireEvent.press(wishlist);
  await waitFor(() => expect(apiAddToWishlist).toHaveBeenCalledWith(71));
  fireEvent.press(wishlist);
  await waitFor(() => expect(apiRemoveWishlistItem).toHaveBeenCalledWith(91));

  fireEvent.press(screen.getByRole('button', { name: i18n.t('Ajouter au panier') }));
  fireEvent.press(screen.getByRole('button', { name: i18n.t('Acheter') }));
  await waitFor(() => expect(apiAddToBasket).toHaveBeenCalledWith(71, 1));
  expect(await screen.findByText(i18n.t('commerce.success.total', { price: '126,66 Dhs' }))).toBeTruthy();
});

it('uses Arabic success copy and routes to the live order detail', async () => {
  await i18n.changeLanguage('ar');
  mockParams = { orderId: '81' };
  mockGetOrder.mockResolvedValueOnce({
    success: true,
    data: {
      ...order,
      items: [{
        id: 1, orderId: 81, offerId: 88, categoryId: 12, quantity: 1, unitPrice: 101.11,
        totalPrice: 101.11, status: 'pending', createdAt: '2026-01-01', updatedAt: '2026-01-01',
        categoryTitle: 'Plaquettes', categoryTitleAr: 'وسادات',
        images: ['https://example.test/order-part.jpg'],
      }],
    },
  });
  const screen = render(<OrderSuccessScreen />);
  expect(await screen.findByText(i18n.t('commerce.success.confirmation'))).toBeTruthy();
  expect(screen.getAllByText(i18n.t('settings.orders.paymentMethod.cod')).length).toBeGreaterThan(0);
  expect(mockGetOrder).toHaveBeenCalledWith(81);
  const orders = screen.getByRole('button', { name: i18n.t('commerce.success.viewOrders') });
  fireEvent.press(orders);
  expect(mockReplace).toHaveBeenCalledWith({
    pathname: '/(client)/settings/orders/[orderId]',
    params: { orderId: '81' },
  });
  expect(screen.getByRole('button', { name: i18n.t('commerce.success.invoice') }).props.accessibilityState.disabled).toBe(true);
  expect(screen.getByText(i18n.t('commerce.success.item', { count: 1, title: 'وسادات' }))).toBeTruthy();
  expect(screen.queryByText(/Plaquettes/)).toBeNull();
});

it('uses the Figma success copy and opens the order that was just placed', async () => {
  mockParams = { orderId: '81' };
  const screen = render(<OrderSuccessScreen />);

  expect(await screen.findByText('Félicitations 🎉 ! Votre commande a été passée.')).toBeTruthy();
  const currentOrder = screen.getByRole('button', { name: 'Afficher ma commande' });
  fireEvent.press(currentOrder);
  expect(mockReplace).toHaveBeenCalledWith({
    pathname: '/(client)/settings/orders/[orderId]',
    params: { orderId: '81' },
  });
  expect(screen.getByRole('button', { name: 'Télécharger la facture' }).props.accessibilityState.disabled).toBe(true);
});

it('rejects a missing success order identity without rendering a false confirmation', async () => {
  mockParams = {};
  const screen = render(<OrderSuccessScreen />);
  expect(await screen.findByText(i18n.t('commerce.success.loadError'))).toBeTruthy();
  expect(screen.queryByText(i18n.t('commerce.success.confirmation'))).toBeNull();
  expect(mockGetOrder).not.toHaveBeenCalled();
});
