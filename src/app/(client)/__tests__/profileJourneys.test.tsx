import React from 'react';
import { TextInput as NativeTextInput } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import i18n from '@/localization/i18n';
import { apiClient } from '@/api/client';
import type { Address } from '@/interfaces/Address';
import type { ClientProfile } from '@/interfaces/User';
import type { Notification } from '@/interfaces/Notification';
import type { PaymentMethod } from '@/interfaces/Payment';
import SettingsScreen from '../settings';
import EditProfileScreen from '../settings/profile';
import VerifyChangedPhoneScreen from '../settings/profile/verify-phone';
import AddressesScreen from '../settings/addresses';
import NotificationsScreen from '../settings/notifications';
import WishlistScreen from '../settings/wishlist';
import PaymentScreen from '../settings/payment';
import OrderDetailScreen from '../settings/orders/[orderId]';
import OrdersListScreen from '../settings/orders';
import { getAddresses } from '@/api/resources/addresses';
import { getNotifications } from '@/api/resources/notifications';
import { getOrders } from '@/api/resources/orders';
import { getWishlist } from '@/api/resources/wishlist';
import { uploadLocalImages } from '@/api/resources/uploads';
import { ApiClientError } from '@/api/types';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockLogOut = jest.fn().mockResolvedValue(undefined);
const mockRefreshSessionProfile = jest.fn().mockResolvedValue(undefined);
const mockStartPhoneChangeVerification = jest.fn().mockResolvedValue(undefined);
const mockResendPhoneChangeOtp = jest.fn().mockResolvedValue(undefined);
const mockVerifyPhoneChange = jest.fn().mockResolvedValue(undefined);
let mockPendingPhoneChangeVerificationPhone: string | null = null;
let mockParams: Record<string, string | undefined> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: () => void) => {
    const ReactModule = require('react') as typeof React;
    ReactModule.useEffect(callback, [callback]);
  },
}));

jest.mock('@/context/AuthContext', () => ({
  useSession: () => ({
    logOut: mockLogOut,
    refreshSessionProfile: mockRefreshSessionProfile,
    startPhoneChangeVerification: mockStartPhoneChangeVerification,
    resendPhoneChangeOtp: mockResendPhoneChangeOtp,
    verifyPhoneChange: mockVerifyPhoneChange,
    pendingPhoneChangeVerificationPhone: mockPendingPhoneChangeVerificationPhone,
    role: 'client',
  }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///avatar.jpg' }] }),
}));

jest.mock('@/api/resources/uploads', () => ({ uploadLocalImages: jest.fn() }));

jest.mock('@/api/client', () => ({
  ...jest.requireActual('@/api/client'),
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('@/components/common/Button', () => {
  const ReactModule = require('react') as typeof React;
  const { Text, TouchableOpacity } = require('react-native') as typeof import('react-native');
  return function MockButton({ title, onPress, disabled, accessibilityLabel }: { title?: string; onPress?: () => void; disabled?: boolean; accessibilityLabel?: string }) {
    const label = accessibilityLabel ?? title ?? 'button';
    return ReactModule.createElement(TouchableOpacity, {
      accessible: true,
      accessibilityRole: 'button',
      accessibilityLabel: label,
      accessibilityState: { disabled },
      onPress: disabled ? undefined : onPress,
    }, ReactModule.createElement(Text, null, title));
  };
});

jest.mock('@/components/screens/shared/app/ItemMenuComponent', () => {
  const ReactModule = require('react') as typeof React;
  const { Text, TouchableOpacity } = require('react-native') as typeof import('react-native');
  return function MockItemMenu({ title, onPress, isToggle, onToggle, toggleValue, toggleDisabled }: { title: string; onPress?: () => void; isToggle?: boolean; onToggle?: (value: boolean) => void; toggleValue?: boolean; toggleDisabled?: boolean }) {
    return ReactModule.createElement(TouchableOpacity, { accessible: true, accessibilityRole: isToggle ? 'switch' : 'button', accessibilityLabel: title, accessibilityState: isToggle ? { checked: toggleValue, disabled: toggleDisabled } : undefined, onPress: toggleDisabled ? undefined : isToggle ? () => onToggle?.(!toggleValue) : onPress }, ReactModule.createElement(Text, null, title));
  };
});

jest.mock('@/components/screens/client/addresses/ItemAddressComponent', () => {
  const ReactModule = require('react') as typeof React;
  const { Text, TouchableOpacity, View } = require('react-native') as typeof import('react-native');
  return function MockAddress({ address, onSetDefault }: { address: Address; onSetDefault?: (value: Address) => void }) {
    return ReactModule.createElement(View, null,
      ReactModule.createElement(Text, { testID: `address-${address.id}` }, `${address.id}:${String(address.isDefault)}`),
      onSetDefault ? ReactModule.createElement(TouchableOpacity, { accessible: true, accessibilityRole: 'button', accessibilityLabel: `default-${address.id}`, onPress: () => onSetDefault(address) }) : null,
    );
  };
});

jest.mock('@/components/screens/shared/app/ItemSubCategoryComponent', () => {
  const ReactModule = require('react') as typeof React;
  const { Text, TouchableOpacity, View } = require('react-native') as typeof import('react-native');
  return function MockWishlistItem({ item, actionButtonTwo }: { item: { id: number; title: string }; actionButtonTwo?: { onPress?: () => void } }) {
    return ReactModule.createElement(View, null,
      ReactModule.createElement(Text, null, item.title),
      ReactModule.createElement(TouchableOpacity, { accessible: true, accessibilityRole: 'button', accessibilityLabel: `remove-${item.id}`, onPress: actionButtonTwo?.onPress }),
    );
  };
});

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockPut = apiClient.put as jest.Mock;
const mockDel = apiClient.del as jest.Mock;
const mockUploadLocalImages = uploadLocalImages as jest.MockedFunction<typeof uploadLocalImages>;

const pagination = { total: 1, perPage: 20, currentPage: 1, lastPage: 1, from: 1, to: 1 };
const profile: ClientProfile = {
  id: 5,
  name: 'Profile Name',
  firstName: null,
  lastName: null,
  email: null,
  phone: '',
  avatar: null,
  status: 'active',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};
const defaultAddress: Address = { id: 9, userId: 5, label: 'Maison', addressLine1: 'Rue 1', addressLine2: null, city: 'Rabat', postalCode: null, region: null, country: 'MA', latitude: null, longitude: null, isDefault: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
const secondAddress: Address = { ...defaultAddress, id: 10, label: 'Bureau', isDefault: false };
const notification: Notification = { id: 31, userId: 5, type: 'shipped', channel: 'database', title: 'Commande expédiée', titleAr: 'تم الشحن', message: 'Votre commande est partie', messageAr: 'تم إرسال طلبك', data: null, isRead: false, readAt: null, expiresAt: null, createdAt: '2026-01-01' };
const paymentMethod: PaymentMethod = { id: 41, userId: 5, type: 'visa', label: 'Carte principale', lastFour: '4242', expiryMonth: 12, expiryYear: 2030, isDefault: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
const preferences = { id: 61, userId: 5, channelPreferences: { email: true, sms: true, push: true, whatsapp: true }, notificationTypes: {}, createdAt: '2026-01-01', updatedAt: '2026-01-01' };

beforeEach(async () => {
  jest.clearAllMocks();
  mockGet.mockReset();
  mockPost.mockReset();
  mockPut.mockReset();
  mockDel.mockReset();
  mockParams = {};
  mockPendingPhoneChangeVerificationPhone = null;
  await i18n.changeLanguage('fr');
  mockUploadLocalImages.mockResolvedValue(['mobile-uploads/5/avatar.jpg']);
  mockGet.mockImplementation((path: string) => {
    if (path === '/profile') return Promise.resolve({ success: true, data: profile });
    if (path === '/addresses') return Promise.resolve({ success: true, data: [defaultAddress, secondAddress], pagination: { ...pagination, total: 2, to: 2 } });
    if (path === '/notifications') return Promise.resolve({ success: true, data: [notification], pagination });
    if (path === '/wishlist') return Promise.resolve({ success: true, data: [{ id: 51, userId: 5, categoryId: 71, pneumaticId: null, categoryTitle: 'Freins', categoryTitleAr: 'فرامل', createdAt: '2026-01-01' }], pagination });
    if (path === '/payment-methods') return Promise.resolve({ success: true, data: [paymentMethod] });
    if (path === '/notifications/preferences') return Promise.resolve({ success: true, data: preferences });
    return Promise.reject(new Error(`Unexpected GET ${path}`));
  });
});

it('verifies a changed phone through the durable Client OTP route', async () => {
  mockPendingPhoneChangeVerificationPhone = '+212600000109';
  const screen = render(<VerifyChangedPhoneScreen />);

  fireEvent.changeText(screen.UNSAFE_getByType(NativeTextInput), '123456');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('auth.otp.verify') }));

  await waitFor(() => expect(mockVerifyPhoneChange).toHaveBeenCalledWith('123456'));
  expect(mockReplace).toHaveBeenCalledWith('/(client)/settings/profile');
});

it('cancels an owned pending order only after confirmation and renders the returned status', async () => {
  mockParams = { orderId: '81' };
  const pendingOrder = {
    id: 81, reference: 'ORD-81', userId: 5, addressId: 9, couponId: null,
    subtotal: 100, discountAmount: 0, shippingFee: 10, taxAmount: 20, total: 130,
    status: 'pending', paymentMethod: 'cod', paymentStatus: 'pending', notes: null,
    confirmedBy: null, confirmedAt: null, createdAt: '2026-01-01', updatedAt: '2026-01-01', items: [],
  } as const;
  mockGet.mockResolvedValueOnce({ success: true, data: pendingOrder });
  mockPost.mockResolvedValueOnce({ success: true, data: { ...pendingOrder, status: 'cancelled' as const } });
  const screen = render(<OrderDetailScreen />);
  const cancel = await screen.findByRole('button', { name: i18n.t('settings.orders.cancel') });
  expect(screen.getByText(i18n.t('settings.orders.step.cod'))).toBeTruthy();
  expect(screen.queryByText(i18n.t('settings.orders.step.paid'))).toBeNull();
  fireEvent.press(cancel);
  expect(mockPost).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: i18n.t('settings.orders.cancelConfirm') }));
  await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/orders/81/cancel', {}));
  expect(screen.queryByRole('button', { name: i18n.t('settings.orders.cancel') })).toBeNull();
  screen.unmount();

  await i18n.changeLanguage('ar');
  mockGet.mockResolvedValueOnce({ success: true, data: pendingOrder });
  const arabicScreen = render(<OrderDetailScreen />);
  expect(await arabicScreen.findByText(i18n.t('settings.orders.step.cod'))).toBeTruthy();
  expect(arabicScreen.queryByText(i18n.t('settings.orders.step.paid'))).toBeNull();
});

it('renders order status copy through the shared i18n namespace in French and Arabic', async () => {
  const deliveredOrder = {
    id: 91, reference: 'ORD-91', userId: 5, addressId: 9, couponId: null,
    subtotal: 100, discountAmount: 0, shippingFee: 10, taxAmount: 20, total: 130,
    status: 'delivered', paymentMethod: 'cod', paymentStatus: 'completed', notes: null,
    confirmedBy: null, confirmedAt: null, createdAt: '2026-01-01', updatedAt: '2026-01-01', items: [],
  } as const;
  mockGet.mockResolvedValueOnce({ success: true, data: [deliveredOrder], pagination });
  const screen = render(<OrdersListScreen />);
  expect(await screen.findByText(i18n.t('settings.orders.status.delivered.label'))).toBeTruthy();
  screen.unmount();

  await i18n.changeLanguage('ar');
  mockGet.mockResolvedValueOnce({ success: true, data: [deliveredOrder], pagination });
  const arabicScreen = render(<OrdersListScreen />);
  expect(await arabicScreen.findByText(i18n.t('settings.orders.status.delivered.label'))).toBeTruthy();
});

it('keeps the settings.orders.* namespace in parity between French and Arabic', () => {
  const frTranslations = require('@/localization/fr.json') as Record<string, unknown>;
  const arTranslations = require('@/localization/ar.json') as Record<string, unknown>;
  const ordersKeys = (json: Record<string, unknown>) =>
    Object.keys(json).filter((key) => key.startsWith('settings.orders.')).sort();
  expect(ordersKeys(frTranslations)).toEqual(ordersKeys(arTranslations));
});

it('renders the Arabic settings journey from canonical profile data and localized row labels', async () => {
  await i18n.changeLanguage('ar');
  const screen = render(<SettingsScreen />);
  expect(await screen.findByText(i18n.t('settings.greeting', { name: 'Profile Name' }))).toBeTruthy();
  expect(screen.getByRole('button', { name: i18n.t('settings.orders') })).toBeTruthy();
  expect(screen.getAllByRole('button', { name: i18n.t('settings.notifications') }).length).toBeGreaterThan(0);
  expect(screen.queryByText('Hey')).toBeNull();
});

it('edits profile identity with current password, uploads an owned avatar path, and opens password recovery', async () => {
  mockPut.mockResolvedValueOnce({ success: true, data: { ...profile, name: 'Canonical Name' } });
  const profileScreen = render(<EditProfileScreen />);
  await profileScreen.findByText('Profile Name');
  fireEvent.press(profileScreen.getByRole('button', { name: i18n.t('settings.profile.modifyName') }));
  fireEvent.changeText(profileScreen.getByLabelText(i18n.t('settings.profile.name')), 'Canonical Name');
  fireEvent.press(profileScreen.getByRole('button', { name: i18n.t('settings.profile.confirmName') }));
  expect(await profileScreen.findByText('Canonical Name')).toBeTruthy();
  expect(mockPut).toHaveBeenCalledWith('/profile', { name: 'Canonical Name' });
  expect(mockRefreshSessionProfile).toHaveBeenCalledTimes(1);

  mockPut.mockResolvedValueOnce({ success: true, data: { ...profile, name: 'Canonical Name', email: 'updated@example.test' } });
  fireEvent.press(profileScreen.getByRole('button', { name: i18n.t('settings.profile.modifyEmail') }));
  fireEvent.changeText(profileScreen.getByLabelText(i18n.t('settings.profile.email')), 'updated@example.test');
  fireEvent.changeText(profileScreen.getAllByLabelText(i18n.t('settings.profile.currentPassword'))[0], 'current-secret');
  fireEvent.press(profileScreen.getByRole('button', { name: i18n.t('settings.profile.confirmEmail') }));
  await waitFor(() => expect(mockPut).toHaveBeenCalledWith('/profile', { email: 'updated@example.test', currentPassword: 'current-secret' }));

  mockPut.mockResolvedValueOnce({ success: true, data: { ...profile, name: 'Canonical Name', email: 'updated@example.test', phone: '0612345678' } });
  fireEvent.press(profileScreen.getByRole('button', { name: i18n.t('settings.profile.modifyPhone') }));
  fireEvent.changeText(profileScreen.getByLabelText(i18n.t('settings.profile.phone')), '0612345678');
  fireEvent.changeText(profileScreen.getAllByLabelText(i18n.t('settings.profile.currentPassword'))[0], 'current-secret');
  fireEvent.press(profileScreen.getByRole('button', { name: i18n.t('settings.profile.confirmPhone') }));
  await waitFor(() => expect(mockPut).toHaveBeenCalledWith('/profile', { phone: '0612345678', currentPassword: 'current-secret' }));
  expect(mockStartPhoneChangeVerification).toHaveBeenCalledWith(expect.objectContaining({ phone: '0612345678' }));
  expect(mockReplace).toHaveBeenCalledWith('/(client)/settings/profile/verify-phone');

  mockPut.mockResolvedValueOnce({ success: true, data: { ...profile, name: 'Canonical Name', email: 'updated@example.test', avatar: '/storage/avatars/avatar.jpg' } });
  fireEvent.press(profileScreen.getByRole('button', { name: i18n.t('settings.profile.changeAvatar') }));
  await waitFor(() => expect(mockUploadLocalImages).toHaveBeenCalledWith(['file:///avatar.jpg']));
  expect(mockPut).toHaveBeenCalledWith('/profile', { avatar: 'mobile-uploads/5/avatar.jpg' });

  fireEvent.press(profileScreen.getByRole('button', { name: i18n.t('settings.profile.changePassword') }));
  expect(mockPush).toHaveBeenCalledWith('/(auth)/ForgotPasswordScreen');
  profileScreen.unmount();
});

it('blocks duplicate identity submissions and surfaces the Laravel field error', async () => {
  let rejectUpdate: ((reason: unknown) => void) | undefined;
  mockPut.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectUpdate = reject; }));
  const screen = render(<EditProfileScreen />);
  await screen.findByText('Profile Name');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('settings.profile.modifyEmail') }));
  fireEvent.changeText(screen.getByLabelText(i18n.t('settings.profile.email')), 'updated@example.test');
  fireEvent.changeText(screen.getAllByLabelText(i18n.t('settings.profile.currentPassword'))[0], 'wrong');
  const confirm = screen.getByRole('button', { name: i18n.t('settings.profile.confirmEmail') });
  fireEvent.press(confirm);
  fireEvent.press(confirm);
  expect(mockPut).toHaveBeenCalledTimes(1);
  await act(async () => {
    rejectUpdate?.(new ApiClientError('Validation failed', 422, { currentPassword: ['Mot de passe incorrect'] }));
  });
  expect(await screen.findByText('Mot de passe incorrect')).toBeTruthy();
});

it('reconciles address default changes from returned server records', async () => {
  mockPost.mockResolvedValueOnce({ success: true, data: { ...secondAddress, isDefault: true } });
  const addressScreen = render(<AddressesScreen />);
  await addressScreen.findByTestId('address-10');
  fireEvent.press(addressScreen.getByRole('button', { name: 'default-10' }));
  await waitFor(() => expect(addressScreen.getByTestId('address-10').props.children).toBe('10:true'));
  expect(addressScreen.getByTestId('address-9').props.children).toBe('9:false');
  expect(mockPost).toHaveBeenCalledWith('/addresses/10/default', {});
});

it('persists push notification preferences once and waits for the returned envelope', async () => {
  let resolvePreference: ((value: unknown) => void) | undefined;
  mockPut.mockImplementationOnce(() => new Promise((resolve) => { resolvePreference = resolve; }));
  const screen = render(<SettingsScreen />);
  const toggle = await screen.findByRole('switch', { name: i18n.t('settings.pushNotifications') });
  expect(toggle.props.accessibilityState.checked).toBe(true);
  fireEvent.press(toggle);
  fireEvent.press(toggle);
  expect(mockPut).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('switch', { name: i18n.t('settings.pushNotifications') }).props.accessibilityState.checked).toBe(true);
  await act(async () => {
    resolvePreference?.({ success: true, data: { ...preferences, channelPreferences: { ...preferences.channelPreferences, push: false } } });
  });
  await waitFor(() => expect(screen.getByRole('switch', { name: i18n.t('settings.pushNotifications') }).props.accessibilityState.checked).toBe(false));
  expect(screen.queryByText(i18n.t('settings.doNotTrack'))).toBeNull();
});

it('keeps the server push value and shows a retryable error when preference persistence fails', async () => {
  mockPut.mockRejectedValueOnce(new Error('offline'));
  const screen = render(<SettingsScreen />);
  const toggle = await screen.findByRole('switch', { name: i18n.t('settings.pushNotifications') });
  fireEvent.press(toggle);
  expect(await screen.findByText(i18n.t('settings.preferencesSaveError'))).toBeTruthy();
  expect(screen.getByRole('switch', { name: i18n.t('settings.pushNotifications') }).props.accessibilityState.checked).toBe(true);
  expect(screen.getByRole('button', { name: i18n.t('settings.retry') })).toBeTruthy();
});

it('aggregates every backend page for settings collections without changing loader signatures', async () => {
  const loaders: { path: string; load: () => Promise<{ data: { id: number }[] }> }[] = [
    { path: '/orders', load: getOrders },
    { path: '/addresses', load: getAddresses },
    { path: '/notifications', load: getNotifications },
    { path: '/wishlist', load: getWishlist },
  ];

  for (const { path, load } of loaders) {
    mockGet.mockReset();
    mockGet
      .mockResolvedValueOnce({ success: true, data: [{ id: 1 }], pagination: { ...pagination, currentPage: 1, lastPage: 2, total: 2, to: 1 } })
      .mockResolvedValueOnce({ success: true, data: [{ id: 2 }], pagination: { ...pagination, currentPage: 2, lastPage: 2, total: 2, from: 2, to: 2 } });
    const result = await load();
    expect(result.data.map((item) => item.id)).toEqual([1, 2]);
    expect(mockGet).toHaveBeenNthCalledWith(1, path);
    expect(mockGet).toHaveBeenNthCalledWith(2, `${path}?page=2&perPage=20`);
  }
});

it('awaits notification and wishlist mutation envelopes before reconciling the collections', async () => {
  mockPost.mockResolvedValueOnce({ success: true, data: { ...notification, isRead: true, readAt: '2026-01-02' } });
  const notificationScreen = render(<NotificationsScreen />);
  const markRead = await notificationScreen.findByLabelText(i18n.t('Marquer comme lu'));
  fireEvent.press(markRead);
  await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/notifications/31/read', {}));
  expect(notificationScreen.queryByLabelText(i18n.t('Marquer comme lu'))).toBeNull();
  notificationScreen.unmount();

  mockDel.mockResolvedValueOnce({ success: true, data: { id: 51 } });
  const wishlistScreen = render(<WishlistScreen />);
  await wishlistScreen.findByText('Freins');
  fireEvent.press(wishlistScreen.getByRole('button', { name: 'remove-51' }));
  expect(await wishlistScreen.findByText(i18n.t('settings.wishlist.empty'))).toBeTruthy();
  expect(mockDel).toHaveBeenCalledWith('/wishlist/items/51');
});

it('does not invent a wishlist condition or price when the API omits them', async () => {
  const screen = render(<WishlistScreen />);

  await screen.findByText('Freins');
  expect(screen.queryByText(/Occasion/)).toBeNull();
  expect(screen.queryByText('2,999 dhs')).toBeNull();
});

it('opens a notification target even after marking the row read', async () => {
  const orderNotification = {
    ...notification,
    data: { orderId: 44 },
  };
  mockGet.mockImplementation((path: string) => {
    if (path === '/notifications') return Promise.resolve({ success: true, data: [orderNotification], pagination });
    return Promise.reject(new Error(`Unexpected GET ${path}`));
  });
  mockPost.mockResolvedValueOnce({ success: true, data: { ...orderNotification, isRead: true, readAt: '2026-01-02' } });
  const screen = render(<NotificationsScreen />);

  fireEvent.press(await screen.findByRole('button', { name: 'Commande expédiée' }));

  await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/notifications/31/read', {}));
  expect(mockPush).toHaveBeenCalledWith('/(client)/settings/orders/44');
});

it('loads typed read-only payment methods and addresses without exposing an edit CTA', async () => {
  const screen = render(<PaymentScreen />);
  expect(await screen.findByText('Carte principale')).toBeTruthy();
  expect(screen.getByText(/4242$/)).toBeTruthy();
  expect(mockGet).toHaveBeenCalledWith('/payment-methods');
  expect(mockGet).toHaveBeenCalledWith('/addresses');
  expect(screen.queryByText(/ajouter une carte/i)).toBeNull();
});
