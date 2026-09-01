import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import i18n from '@/localization/i18n';
import type { Basket } from '@/interfaces/Basket';
import type { Address } from '@/interfaces/Address';
import type { ClientProfile } from '@/interfaces/User';
import type { Order } from '@/interfaces/Order';
import { ApiClientError } from '@/api/types';
import { addToBasket, addToWishlist, applyCoupon, getBasket, getProduct, getRequest, getWishlist, postReview, removeBasketItem, removeWishlistItem, reportAbuse, updateBasketItem } from '@/api';
import { getAddresses } from '@/api/resources/addresses';
import { getOrder, placeOrder } from '@/api/resources/orders';
import { getProfile } from '@/api/resources/users';
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
  getBasket: jest.fn(), applyCoupon: jest.fn(), updateBasketItem: jest.fn(), removeBasketItem: jest.fn(),
  getRequest: jest.fn(),
  postReview: jest.fn(), reportAbuse: jest.fn(),
  getProduct: jest.fn(), addToBasket: jest.fn(), getWishlist: jest.fn(), addToWishlist: jest.fn(), removeWishlistItem: jest.fn(),
}));
jest.mock('@/context/AuthContext', () => ({
  Role: { CLIENT: 'client', PRESTATAIRE: 'prestataire' },
  useSession: () => ({ role: 'client' }),
}));
jest.mock('@/api/resources/basket', () => ({ getBasket: jest.fn() }));
jest.mock('@/api/resources/addresses', () => ({ getAddresses: jest.fn() }));
jest.mock('@/api/resources/orders', () => ({ getOrder: jest.fn(), placeOrder: jest.fn() }));
jest.mock('@/api/resources/users', () => ({ getProfile: jest.fn() }));
jest.mock('@/context/ConfirmationContext', () => ({
  useConfirmation: () => ({ showConfirmation: (_title: string, _message: string, confirm: () => void) => confirm() }),
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
jest.mock('@/components/screens/shared/app/ItemBasketComponent', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return function MockItem({ item, onIncrement, onDecrement, onRemove }: {
    item: { id: number; quantity: number }; onIncrement: () => void; onDecrement: () => void; onRemove: () => void;
  }) {
    const button = (name: string, action: () => void) => React.createElement(View, {
      key: name, accessible: true, accessibilityRole: 'button', accessibilityLabel: name, onPress: action,
    }, React.createElement(Text, null, name));
    return React.createElement(View, null,
      React.createElement(Text, { testID: `quantity-${item.id}` }, String(item.quantity)),
      button(`increment-${item.id}`, onIncrement), button(`decrement-${item.id}`, onDecrement), button(`remove-${item.id}`, onRemove));
  };
});
jest.mock('@/components/screens/client/checkout/ClientCheckoutForm', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return function MockCheckoutForm({ addresses, selectedAddressId, onSelectPaymentMethod }: { addresses: Address[]; selectedAddressId: number | null; onSelectPaymentMethod: (value: string) => void }) {
    return React.createElement(View, null,
      React.createElement(Text, { testID: 'visible-addresses' }, addresses.slice(0, 2).map((address) => address.id).join(',')),
      React.createElement(Text, { testID: 'selected-address' }, String(selectedAddressId)),
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
const apiUpdateBasketItem = updateBasketItem as jest.MockedFunction<typeof updateBasketItem>;
const apiRemoveBasketItem = removeBasketItem as jest.MockedFunction<typeof removeBasketItem>;
const apiApplyCoupon = applyCoupon as jest.MockedFunction<typeof applyCoupon>;
const apiPostReview = postReview as jest.MockedFunction<typeof postReview>;
const apiReportAbuse = reportAbuse as jest.MockedFunction<typeof reportAbuse>;
const apiGetProduct = getProduct as jest.MockedFunction<typeof getProduct>;
const apiAddToBasket = addToBasket as jest.MockedFunction<typeof addToBasket>;
const apiGetWishlist = getWishlist as jest.MockedFunction<typeof getWishlist>;
const apiAddToWishlist = addToWishlist as jest.MockedFunction<typeof addToWishlist>;
const apiRemoveWishlistItem = removeWishlistItem as jest.MockedFunction<typeof removeWishlistItem>;
const checkoutGetBasket = jest.requireMock('@/api/resources/basket').getBasket as jest.Mock;
const mockGetAddresses = getAddresses as jest.MockedFunction<typeof getAddresses>;
const mockGetProfile = getProfile as jest.MockedFunction<typeof getProfile>;
const mockPlaceOrder = placeOrder as jest.MockedFunction<typeof placeOrder>;
const mockGetOrder = getOrder as jest.MockedFunction<typeof getOrder>;

const item = { id: 501, basketId: 19, offerId: 71, categoryId: 12, quantity: 2, unitPrice: 50, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
const basket: Basket = { id: 19, userId: 5, requestId: null, subtotal: 101.11, discountAmount: 7.22, shippingFee: 13.33, taxAmount: 19.44, total: 126.66, createdAt: '2026-01-01', updatedAt: '2026-01-01', items: [item] };
const changedBasket: Basket = { ...basket, subtotal: 151.11, taxAmount: 29.44, total: 186.66, items: [{ ...item, quantity: 3 }] };
const address: Address = { id: 9, userId: 5, label: 'Maison', addressLine1: '1 rue', addressLine2: null, city: 'Rabat', postalCode: null, region: null, country: 'MA', latitude: null, longitude: null, isDefault: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
const profile: ClientProfile = { id: 5, name: 'Client Test', firstName: 'Client', lastName: 'Test', email: null, phone: '0612345678', avatar: null, status: 'active', createdAt: '2026-01-01', updatedAt: '2026-01-01' };
const order: Order = { id: 81, reference: 'ORD-81', userId: 5, addressId: 9, couponId: null, subtotal: 101.11, discountAmount: 7.22, shippingFee: 13.33, taxAmount: 19.44, total: 126.66, status: 'pending', paymentMethod: 'cod', paymentStatus: 'pending', notes: null, confirmedBy: null, confirmedAt: null, createdAt: '2026-01-01', updatedAt: '2026-01-01', items: [] };
const product = { id: 71, title: 'Plaquettes live', titleAr: 'قطع', condition: 'en_stock' as const, articleNumber: 'PL-71', price: 50, promoPrice: null, images: ['https://example.test/part.jpg'], description: 'Description', descriptionAr: 'وصف', categoryId: 12, categoryName: 'Freins', categoryNameAr: 'فرامل', brand: 'Brembo', sellerName: 'Vendeur', sellerId: 8, rating: 4, reviewsCount: 2, stock: 9, warranty: null, warrantyAr: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
const pagination = { total: 0, perPage: 20, currentPage: 1, lastPage: 1, from: null, to: null };

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
        { id: 2, requestId: 73, categoryId: 13, quantity: 1, condition: 'occasion', notes: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      ],
    },
  });
  apiUpdateBasketItem.mockResolvedValue({ success: true, data: changedBasket });
  apiRemoveBasketItem.mockResolvedValue({ success: true, data: { ...basket, items: [] } });
  apiApplyCoupon.mockResolvedValue({ success: true, data: { valid: true, discountAmount: 7.22, code: 'LIVE' } });
  checkoutGetBasket.mockResolvedValue({ success: true, data: basket });
  mockGetAddresses.mockResolvedValue({ success: true, data: [address], pagination: { ...pagination, total: 1, from: 1, to: 1 } });
  mockGetProfile.mockResolvedValue({ success: true, data: profile });
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
  const screen = render(<CartScreen />);
  expect(await screen.findByText('126,66 Dhs')).toBeTruthy();
  expect(screen.getByText('101,11 Dhs')).toBeTruthy();
  expect(screen.getByText('−7,22 Dhs')).toBeTruthy();
  expect(screen.getByText('13,33 Dhs')).toBeTruthy();
  expect(screen.getByText('19,44 Dhs')).toBeTruthy();

  fireEvent.press(screen.getByRole('button', { name: 'increment-501' }));
  await waitFor(() => expect(apiUpdateBasketItem).toHaveBeenCalledWith(501, 3));
  expect(await screen.findByText('3')).toBeTruthy();
  expect(screen.getByText('186,66 Dhs')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'remove-501' }));
  expect(await screen.findByText('Votre panier est vide')).toBeTruthy();
});

it('reloads the canonical basket when the cart regains focus', async () => {
  const emptyBasket = { ...basket, items: [] };
  apiGetBasket.mockResolvedValueOnce({ success: true, data: emptyBasket }).mockResolvedValueOnce({ success: true, data: basket });
  const screen = render(<CartScreen />);
  expect(await screen.findByText('Votre panier est vide')).toBeTruthy();
  await act(async () => { mockFocusCallback?.(); });
  expect(await screen.findByText('126,66 Dhs')).toBeTruthy();
  expect(apiGetBasket).toHaveBeenCalledTimes(2);
});

it('shows only the recovery action when the basket is empty', async () => {
  apiGetBasket.mockResolvedValueOnce({ success: true, data: { ...basket, items: [] } });
  const screen = render(<CartScreen />);

  expect(await screen.findByText('Votre panier est vide')).toBeTruthy();
  expect(screen.queryByTestId('basket-total')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Caisse de sortie' })).toBeNull();
});

it('warns before checking out a request basket with unselected parts', async () => {
  apiGetBasket.mockResolvedValueOnce({ success: true, data: { ...basket, requestId: 73 } });
  const screen = render(<CartScreen />);
  const checkout = await screen.findByRole('button', { name: 'Caisse de sortie' });

  fireEvent.press(checkout);

  expect(await screen.findByText(i18n.t('commerce.cart.remainingPartsTitle'))).toBeTruthy();
  expect(screen.getByText(i18n.t('commerce.cart.remainingPartsBody', { count: 1 }))).toBeTruthy();
  expect(mockPush).not.toHaveBeenCalledWith('/(client)/payment');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('commerce.cart.continueShopping') }));
  expect(mockPush).toHaveBeenCalledWith(expect.objectContaining({
    pathname: '/(client)/requests/[requestId]',
    params: { requestId: '73' },
  }));
});


it('reloads the canonical basket after a valid coupon instead of deriving totals locally', async () => {
  apiGetBasket.mockResolvedValueOnce({ success: true, data: basket }).mockResolvedValueOnce({ success: true, data: changedBasket });
  const screen = render(<CartScreen />);
  await screen.findByTestId('basket-total');
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('Code promo')), ' LIVE ');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('Appliquer') }));
  await waitFor(() => expect(apiApplyCoupon).toHaveBeenCalledWith('LIVE'));
  expect(apiGetBasket).toHaveBeenCalledTimes(2);
  expect(await screen.findByText('186,66 Dhs')).toBeTruthy();
});

it('shows the checkout profile summary and opens the profile editor', async () => {
  const screen = render(<CheckoutScreen />);

  expect(await screen.findByText('Client Test')).toBeTruthy();
  expect(screen.getByText('0612345678')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: i18n.t('settings.modify') }));
  expect(mockPush).toHaveBeenCalledWith('/(client)/settings/profile');
});
it('submits COD once with a visible server-default address and routes only the order identity', async () => {
  const nonDefault = (id: number): Address => ({ ...address, id, isDefault: false, label: `Address ${id}` });
  mockGetAddresses.mockResolvedValueOnce({
    success: true,
    data: [nonDefault(7), nonDefault(8), address],
    pagination: { ...pagination, total: 3, from: 1, to: 3 },
  });
  const screen = render(<CheckoutScreen />);
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
  const screen = render(<CheckoutScreen />);
  const submit = await screen.findByRole('button', { name: i18n.t('Effectuer mon achat') });
  fireEvent.press(submit);
  expect(await screen.findByText('Adresse invalide')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: i18n.t('Effectuer mon achat') }));
  await waitFor(() => expect(mockPlaceOrder).toHaveBeenCalledTimes(2));
});

it('requires an address and exposes a retry after live checkout loading fails', async () => {
  mockGetAddresses.mockResolvedValueOnce({ success: true, data: [], pagination });
  let screen = render(<CheckoutScreen />);
  expect(await screen.findByText(i18n.t('addresses.empty'))).toBeTruthy();
  expect(screen.getByRole('button', { name: i18n.t('Effectuer mon achat') }).props.accessibilityState.disabled).toBe(true);
  screen.unmount();

  checkoutGetBasket.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ success: true, data: basket });
  screen = render(<CheckoutScreen />);
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
  const wishlist = screen.getByLabelText(i18n.t('Ajouter à la liste'));
  fireEvent.press(wishlist);
  await waitFor(() => expect(apiAddToWishlist).toHaveBeenCalledWith(71));
  fireEvent.press(wishlist);
  await waitFor(() => expect(apiRemoveWishlistItem).toHaveBeenCalledWith(91));

  fireEvent.press(screen.getByRole('button', { name: i18n.t('Ajouter au panier') }));
  fireEvent.press(screen.getByRole('button', { name: i18n.t('Confirm') }));
  await waitFor(() => expect(apiAddToBasket).toHaveBeenCalledWith(71, 1));
  expect(await screen.findByText(i18n.t('commerce.success.total', { value: '126,66' }))).toBeTruthy();
});

it('uses Arabic success copy and routes order history to the live settings collection', async () => {
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
      }],
    },
  });
  const screen = render(<OrderSuccessScreen />);
  expect(await screen.findByText(i18n.t('commerce.success.confirmation'))).toBeTruthy();
  expect(screen.getAllByText(i18n.t('commerce.success.payment.cod')).length).toBeGreaterThan(0);
  expect(mockGetOrder).toHaveBeenCalledWith(81);
  const orders = screen.getByRole('button', { name: i18n.t('commerce.success.viewOrders') });
  fireEvent.press(orders);
  expect(mockReplace).toHaveBeenCalledWith('/(client)/settings/orders');
  expect(screen.getByRole('button', { name: i18n.t('commerce.success.invoice') }).props.accessibilityState.disabled).toBe(true);
  expect(screen.getByText(i18n.t('commerce.success.item', { count: 1, title: 'وسادات' }))).toBeTruthy();
  expect(screen.queryByText(/Plaquettes/)).toBeNull();
});

it('rejects a missing success order identity without rendering a false confirmation', async () => {
  mockParams = {};
  const screen = render(<OrderSuccessScreen />);
  expect(await screen.findByText(i18n.t('commerce.success.loadError'))).toBeTruthy();
  expect(screen.queryByText(i18n.t('commerce.success.confirmation'))).toBeNull();
  expect(mockGetOrder).not.toHaveBeenCalled();
});
