import React from 'react';
import { Alert, Switch, TextInput as NativeTextInput } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import i18n from '@/localization/i18n';
import Colors from '@/constants/Colors';
import Icon from '@/components/common/Icon';
import { ApiClientError } from '@/api/types';
import { resetPartnerBadges, setPartnerHasUnreadNotifications } from '@/hooks/usePartnerBadges';
import AboutScreen from '../profile/about';
import CompanyScreen from '../profile/company';
import EditProfileScreen from '../profile/edit';
import NotificationsScreen from '../profile/notifications';
import OffersHistoryScreen from '../profile/offers-history';
import ProfileScreen from '../profile';
import VerifyChangedPartnerPhoneScreen from '../profile/verify-phone';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRefreshSessionProfile = jest.fn().mockResolvedValue(undefined);
const mockStartPhoneChangeVerification = jest.fn().mockResolvedValue(undefined);
const mockResendPhoneChangeOtp = jest.fn().mockResolvedValue(undefined);
const mockVerifyPhoneChange = jest.fn().mockResolvedValue(undefined);
let mockPendingPhoneChangeVerificationPhone: string | null = null;
const mockGetProfile = jest.fn();
const mockUpdateProfile = jest.fn();
const mockChangePassword = jest.fn();
const mockGetCompany = jest.fn();
const mockUpdateCompany = jest.fn();
const mockGetBrands = jest.fn();
const mockGetCategoryTree = jest.fn();
const mockGetNotifications = jest.fn();
const mockMarkRead = jest.fn();
const mockMarkAllRead = jest.fn();
const mockGetHistory = jest.fn();
const mockUploadImages = jest.fn();
const mockLogOut = jest.fn().mockResolvedValue(undefined);

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-router', () => ({
  Tabs: { Screen: () => null },
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useFocusEffect: (callback: () => void) => {
    const ReactModule = require('react') as typeof React;
    ReactModule.useEffect(callback, [callback]);
  },
}));

jest.mock('@/context/AuthContext', () => ({
  useSession: () => ({
    username: 'Partner Session',
    logOut: (...args: unknown[]) => mockLogOut(...args),
    refreshSessionProfile: mockRefreshSessionProfile,
    startPhoneChangeVerification: (...args: unknown[]) => mockStartPhoneChangeVerification(...args),
    resendPhoneChangeOtp: (...args: unknown[]) => mockResendPhoneChangeOtp(...args),
    verifyPhoneChange: (...args: unknown[]) => mockVerifyPhoneChange(...args),
    pendingPhoneChangeVerificationPhone: mockPendingPhoneChangeVerificationPhone,
  }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///partner-avatar.jpg' }] }),
}));

jest.mock('@/api/resources/uploads', () => ({ uploadLocalImages: (...args: unknown[]) => mockUploadImages(...args) }));

jest.mock('@/api', () => ({
  getPrestataireProfile: (...args: unknown[]) => mockGetProfile(...args),
  updatePrestataireProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  changePrestatairePassword: (...args: unknown[]) => mockChangePassword(...args),
  getPrestataireCompany: (...args: unknown[]) => mockGetCompany(...args),
  updatePrestataireCompany: (...args: unknown[]) => mockUpdateCompany(...args),
  getBrands: (...args: unknown[]) => mockGetBrands(...args),
  getCategoryTree: (...args: unknown[]) => mockGetCategoryTree(...args),
}));

jest.mock('@/api/resources/prestataire', () => ({
  getPrestataireNotifications: (...args: unknown[]) => mockGetNotifications(...args),
  markPrestataireNotificationRead: (...args: unknown[]) => mockMarkRead(...args),
  markAllPrestataireNotificationsRead: (...args: unknown[]) => mockMarkAllRead(...args),
  getPrestataireOffersHistory: (...args: unknown[]) => mockGetHistory(...args),
}));

const mockGetSecureItem = SecureStore.getItemAsync as jest.MockedFunction<typeof SecureStore.getItemAsync>;
const mockSetSecureItem = SecureStore.setItemAsync as jest.MockedFunction<typeof SecureStore.setItemAsync>;

const pagination = { total: 1, perPage: 20, currentPage: 1, lastPage: 1, from: 1, to: 1 };
const profile = {
  id: 7,
  name: 'Partner Live',
  firstName: 'Partner',
  lastName: 'Live',
  email: 'partner@example.test',
  phone: '+212600000102',
  avatar: null,
  status: 'active' as const,
  ferrailleurRating: 4.5,
  ferrailleurStatus: 'certified' as const,
  specializations: [42],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};
const company = {
  id: 3,
  userId: 7,
  legalName: 'Partner Company',
  legalForm: 'SARL AU',
  ice: '001234567890123',
  rc: 'RC-1',
  taxId: 'IF-1',
  addressLine1: 'Rue Live',
  addressLine2: null,
  city: 'Rabat',
  postalCode: null,
  region: 'Rabat-Salé-Kénitra',
  country: 'MA',
  phone: null,
  email: null,
  specializations: [42],
  bank: { ibanMasked: '********************1234', holder: 'Partner Company', bankName: 'Bank Live' },
  brandGroups: [{ group: 'mecanique' as const, brands: [{ id: 42, name: 'Marque existante', nameAr: 'ماركة قائمة', logo: null, relatedParts: [{ id: 10, title: 'Mécanique', titleAr: 'ميكانيك' }] }] }],
  status: 'active' as const,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};
const notification = {
  id: 5,
  userId: 7,
  type: 'payment' as const,
  channel: 'database',
  title: 'Paiement live',
  titleAr: 'دفع مباشر',
  message: 'Message live',
  messageAr: 'رسالة مباشرة',
  data: { orderId: 8 },
  isRead: false,
  readAt: null,
  expiresAt: null,
  createdAt: new Date().toISOString(),
};
const offer = {
  id: 9,
  reference: 'OFF-LIVE-9',
  requestId: 4,
  requestItemId: 6,
  condition: 'occasion' as const,
  quantity: 2,
  priceFerrailleur: 800,
  description: 'Moteur live',
  audioUrl: null,
  availability: 'available' as const,
  status: 'pending' as const,
  adminNotes: null,
  validatedAt: null,
  createdAt: '2026-08-15T12:00:00Z',
  updatedAt: '2026-08-15T12:00:00Z',
  images: [],
  categoryTitle: 'Moteur',
  categoryTitleAr: 'محرك',
  categoryImage: null,
  brandName: 'Dacia',
  brandNameAr: 'داسيا',
  ferrailleurName: 'Partner Live',
  shippingEligible: false,
  paymentStatus: null,
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockPendingPhoneChangeVerificationPhone = null;
  resetPartnerBadges();
  await i18n.changeLanguage('fr');
  mockGetSecureItem.mockResolvedValue(null);
  mockSetSecureItem.mockResolvedValue(undefined);
  mockGetProfile.mockResolvedValue({ success: true, data: profile });
  mockUpdateProfile.mockResolvedValue({ success: true, data: { ...profile, avatar: 'https://cdn.example/avatar.jpg' } });
  mockChangePassword.mockResolvedValue({ success: true, data: { changed: true } });
  mockUploadImages.mockResolvedValue(['tmp/mobile/7/avatar.jpg']);
  mockGetCompany.mockResolvedValue({ success: true, data: company });
  mockGetBrands.mockResolvedValue({ success: true, data: [
    { id: 42, name: 'Marque existante', nameAr: 'ماركة قائمة', logo: null, status: true, sortOrder: 1 },
    { id: 77, name: 'Marque API live', nameAr: 'ماركة مباشرة', logo: null, status: true, sortOrder: 2 },
  ], pagination: { ...pagination, total: 2, to: 2 } });
  mockGetCategoryTree.mockResolvedValue({ success: true, data: [{ id: 10, title: 'Mécanique', titleAr: 'ميكانيك' }] });
  mockUpdateCompany.mockResolvedValue({ success: true, data: company });
  mockGetNotifications.mockResolvedValue({ success: true, data: [notification], pagination });
  mockMarkRead.mockResolvedValue({ success: true, data: { ...notification, isRead: true } });
  mockMarkAllRead.mockResolvedValue({ success: true, data: { updated: 1 } });
  mockGetHistory.mockResolvedValue({ success: true, data: [offer], pagination });
});

it('adds a contracted brand group with its related part families', async () => {
  const screen = render(<CompanyScreen />);
  await screen.findByText('Marque existante');
  expect(screen.getByText(i18n.t('partner.company.dataLine', { label: i18n.t('partner.company.street'), value: 'Rue Live' }))).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: i18n.t('partner.company.addBrandCta') }));
  fireEvent.press(screen.getByRole('button', { name: i18n.t('partner.company.sheetBrandLabel') }));
  fireEvent.press(await screen.findByRole('button', { name: 'Marque API live' }));
  fireEvent.press(screen.getByRole('checkbox', { name: 'Mécanique' }));
  // The header "Ajouter" link and the sheet CTA share their copy; the sticky CTA renders last.
  const addButtons = screen.getAllByRole('button', { name: i18n.t('partner.company.sheetCta') });
  fireEvent.press(addButtons[addButtons.length - 1]!);
  await waitFor(() => expect(mockUpdateCompany).toHaveBeenCalledWith({ brandGroups: [{
    group: 'mecanique',
    brands: [
      { id: 42, relatedPartIds: [10] },
      { id: 77, relatedPartIds: [10] },
    ],
  }] }));
});

it('shows the Figma hub: greeting, unread bell, legal section and persisted preference toggles', async () => {
  setPartnerHasUnreadNotifications(true);
  const screen = render(<ProfileScreen />);
  await screen.findByText(i18n.t('partner.profile.greeting', { name: 'Partner Live' }));
  expect(screen.getByTestId('header-bell-unread')).toBeTruthy();
  expect(screen.getByText(`EBEN Solutions SARL © ${new Date().getFullYear()}`)).toBeTruthy();
  expect(screen.queryByText(i18n.t('partner.profile.logoutTitle'))).toBeNull();
  expect(screen.getByRole('button', { name: i18n.t('partner.profile.logoutTitle') })).toBeTruthy();

  const [push, doNotTrack] = screen.UNSAFE_getAllByType(Switch);
  await waitFor(() => expect(push!.props.disabled).toBe(false));
  expect(push!.props.value).toBe(true);
  expect(doNotTrack!.props.value).toBe(false);
  await act(async () => { doNotTrack!.props.onValueChange(true); });
  await waitFor(() => expect(mockSetSecureItem).toHaveBeenCalledWith('eben.partner.doNotTrack', 'true'));
  expect(screen.UNSAFE_getAllByType(Switch)[1]!.props.value).toBe(true);

  fireEvent.press(screen.getByRole('button', { name: i18n.t('partner.profile.privacy') }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/(prestataire)/profile/legal', params: { section: 'privacy' } });
});

it('confirms logout in the same bottom sheet and copy as the client Profil', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  try {
    const screen = render(<ProfileScreen />);
    await screen.findByText(i18n.t('partner.profile.greeting', { name: 'Partner Live' }));

    fireEvent.press(screen.getByRole('button', { name: i18n.t('partner.profile.logoutTitle') }));
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockLogOut).not.toHaveBeenCalled();
    expect(screen.getByText(i18n.t('settings.logoutConfirm'))).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('Annuler') }));
    expect(screen.queryByText(i18n.t('settings.logoutConfirm'))).toBeNull();
    expect(mockLogOut).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: i18n.t('partner.profile.logoutTitle') }));
    fireEvent.press(screen.getByRole('button', { name: i18n.t('settings.logout') }));
    await waitFor(() => expect(mockLogOut).toHaveBeenCalledTimes(1));
    expect(alertSpy).not.toHaveBeenCalled();
  } finally {
    alertSpy.mockRestore();
  }
});

it('restores stored preference toggles', async () => {
  mockGetSecureItem.mockImplementation(async (key: string) => (key === 'eben.partner.pushNotifications' ? 'false' : null));
  const screen = render(<ProfileScreen />);
  await waitFor(() => expect(screen.UNSAFE_getAllByType(Switch)[0]!.props.value).toBe(false));
});

it('uploads an owned avatar path and refreshes the persisted session identity', async () => {
  const screen = render(<EditProfileScreen />);
  await screen.findAllByText('+212600000102');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('partner.editProfile.changeAvatar') }));
  await waitFor(() => expect(mockUploadImages).toHaveBeenCalledWith(['file:///partner-avatar.jpg']));
  expect(mockUpdateProfile).toHaveBeenCalledWith({ avatar: 'tmp/mobile/7/avatar.jpg' });
  expect(mockRefreshSessionProfile).toHaveBeenCalled();
});

it('edits the name inline and confirms it through the profile endpoint', async () => {
  mockUpdateProfile.mockResolvedValueOnce({ success: true, data: { ...profile, firstName: 'Zak', lastName: 'Laktir', name: 'Zak Laktir' } });
  const screen = render(<EditProfileScreen />);
  await screen.findAllByText('Partner Live');
  const nameField = i18n.t('partner.editProfile.nameField');
  fireEvent.press(screen.getByRole('button', { name: `${i18n.t('partner.editProfile.modify')} ${nameField}` }));
  fireEvent.changeText(screen.getByLabelText(i18n.t('auth.fields.firstName')), ' Zak ');
  fireEvent.changeText(screen.getByLabelText(i18n.t('auth.fields.lastName')), 'Laktir');
  fireEvent.press(screen.getByRole('button', { name: `${i18n.t('partner.editProfile.confirm')} ${nameField}` }));
  await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith({ firstName: 'Zak', lastName: 'Laktir' }));
  expect((await screen.findAllByText('Zak Laktir')).length).toBeGreaterThan(0);
  expect(mockRefreshSessionProfile).toHaveBeenCalled();
});

it('requires the current password before changing the email and localizes a rejected password', async () => {
  mockUpdateProfile.mockRejectedValueOnce(new ApiClientError('The password is incorrect.', 422, { currentPassword: ['The password is incorrect.'] }));
  const screen = render(<EditProfileScreen />);
  await screen.findAllByText('Partner Live');
  const emailField = i18n.t('auth.fields.email');
  fireEvent.press(screen.getByRole('button', { name: `${i18n.t('partner.editProfile.modify')} ${emailField}` }));
  fireEvent.changeText(screen.getByLabelText(emailField), 'new@example.test');
  fireEvent.press(screen.getByRole('button', { name: `${i18n.t('partner.editProfile.confirm')} ${emailField}` }));
  expect(screen.getByText(i18n.t('partner.editProfile.currentPasswordRequired'))).toBeTruthy();
  expect(mockUpdateProfile).not.toHaveBeenCalled();

  fireEvent.changeText(screen.getByLabelText(i18n.t('partner.editProfile.currentPassword')), 'secret-pass');
  fireEvent.press(screen.getByRole('button', { name: `${i18n.t('partner.editProfile.confirm')} ${emailField}` }));
  await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith({ email: 'new@example.test', currentPassword: 'secret-pass' }));
  expect(await screen.findByText(i18n.t('partner.editProfile.currentPasswordInvalid'))).toBeTruthy();
  expect(screen.queryByText('The password is incorrect.')).toBeNull();
});

it('changes the phone with the current password and enters the role-owned OTP continuation', async () => {
  const changed = { ...profile, phone: '+212600000109' };
  mockUpdateProfile.mockResolvedValueOnce({ success: true, data: changed });
  const screen = render(<EditProfileScreen />);
  await screen.findAllByText('Partner Live');

  const modify = i18n.t('partner.editProfile.modify');
  const phoneField = i18n.t('auth.fields.phone');
  fireEvent.press(screen.getByRole('button', { name: `${modify} ${phoneField}` }));
  fireEvent.changeText(screen.getByLabelText(phoneField), '06 00 00 01 09');
  fireEvent.changeText(screen.getByLabelText(i18n.t('partner.editProfile.currentPassword')), 'current-secret');
  fireEvent.press(screen.getByRole('button', { name: `${i18n.t('partner.editProfile.confirm')} ${phoneField}` }));

  await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith({
    phone: '+212600000109',
    currentPassword: 'current-secret',
  }));
  expect(mockStartPhoneChangeVerification).toHaveBeenCalledWith(changed);
  expect(mockReplace).toHaveBeenCalledWith('/(prestataire)/profile/verify-phone');
});

it('changes the password inline through the dedicated protected endpoint', async () => {
  const screen = render(<EditProfileScreen />);
  await screen.findAllByText('Partner Live');

  const passwordField = i18n.t('auth.fields.password');
  fireEvent.press(screen.getByRole('button', { name: `${i18n.t('partner.editProfile.modify')} ${passwordField}` }));
  fireEvent.changeText(screen.getByLabelText(i18n.t('partner.editProfile.currentPassword')), 'current-secret');
  fireEvent.changeText(screen.getByLabelText(i18n.t('partner.editProfile.newPassword')), 'new-secret-123');
  fireEvent.changeText(screen.getByLabelText(i18n.t('partner.editProfile.passwordConfirmation')), 'new-secret-123');
  fireEvent.press(screen.getByRole('button', { name: `${i18n.t('partner.editProfile.confirm')} ${passwordField}` }));

  await waitFor(() => expect(mockChangePassword).toHaveBeenCalledWith({
    currentPassword: 'current-secret',
    password: 'new-secret-123',
    passwordConfirmation: 'new-secret-123',
  }));
  expect(screen.queryByLabelText(i18n.t('partner.editProfile.newPassword'))).toBeNull();
});

it('verifies a changed phone through the durable Prestataire OTP route', async () => {
  mockPendingPhoneChangeVerificationPhone = '+212600000109';
  const screen = render(<VerifyChangedPartnerPhoneScreen />);

  fireEvent.changeText(screen.UNSAFE_getByType(NativeTextInput), '123456');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('auth.otp.verify') }));

  await waitFor(() => expect(mockVerifyPhoneChange).toHaveBeenCalledWith('123456'));
  expect(mockReplace).toHaveBeenCalledWith('/(prestataire)/profile/edit');
});

it('shows an empty state in the head-office card when the company has no address', async () => {
  mockGetCompany.mockResolvedValueOnce({
    success: true,
    data: { ...company, addressLine1: null, addressLine2: null, city: null, region: null },
  });
  const screen = render(<CompanyScreen />);
  expect(await screen.findByText(i18n.t('partner.company.addressEmpty'))).toBeTruthy();
});

it('marks every loaded Prestataire notification read from the row menu and shows the contextual CTA', async () => {
  const screen = render(<NotificationsScreen />);
  await screen.findByText('Message live');
  expect(screen.queryByRole('button', { name: i18n.t('partner.notifications.markAllRead') })).toBeNull();
  expect(screen.getByText(i18n.t('partner.notifications.unreadCount', { count: 1 }))).toBeTruthy();
  expect(screen.getByRole('button', { name: i18n.t('partner.notifications.cta.details') })).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: i18n.t('partner.notifications.menu', { title: 'Paiement live' }) }));
  fireEvent.press(screen.getByRole('button', { name: i18n.t('partner.notifications.markAllRead') }));
  await waitFor(() => expect(mockMarkAllRead).toHaveBeenCalledTimes(1));
  expect(screen.queryByText(i18n.t('partner.notifications.unreadCount', { count: 1 }))).toBeNull();
});

it('marks one payment notification read and opens its referenced partner order', async () => {
  const screen = render(<NotificationsScreen />);
  await screen.findByText('Message live');
  fireEvent.press(screen.getByRole('button', { name: 'Paiement live' }));
  await waitFor(() => expect(mockMarkRead).toHaveBeenCalledWith(5));
  expect(mockPush).toHaveBeenCalledWith('/(prestataire)/orders/8');
});

it('highlights references in the notification body in black', async () => {
  mockGetNotifications.mockResolvedValueOnce({
    success: true,
    data: [{ ...notification, message: 'Votre offre OFF-12 est acceptée' }],
    pagination,
  });
  const screen = render(<NotificationsScreen />);
  const reference = await screen.findByText('OFF-12');
  expect(reference.props.style).toEqual(expect.arrayContaining([{ color: Colors.brand }]));
  expect(screen.getByText('Votre offre ').props.style).toEqual(expect.arrayContaining([{ color: Colors.gray }]));
});

it('pluralises the relative notification time', async () => {
  mockGetNotifications.mockResolvedValueOnce({
    success: true,
    data: [{ ...notification, createdAt: new Date(Date.now() - 5 * 3_600_000 - 60_000).toISOString() }],
    pagination,
  });
  const screen = render(<NotificationsScreen />);
  expect(await screen.findByText('il y a 5 heures')).toBeTruthy();
  expect(screen.queryByText(/heure\(s\)/)).toBeNull();
});

it('picks the Figma icon of each notification type and labels the payment bag MAD', async () => {
  const types = ['list_received', 'payment', 'list_sent', 'delivered', 'shipped'] as const;
  mockGetNotifications.mockResolvedValueOnce({
    success: true,
    data: types.map((type, index) => ({ ...notification, id: 50 + index, type, title: `Titre ${type}`, message: `Corps ${type}` })),
    pagination,
  });
  const screen = render(<NotificationsScreen />);
  await screen.findByText('Corps shipped');

  const rowIcons = screen.UNSAFE_getAllByType(Icon)
    .map((node) => node.props.name as string)
    .filter((name) => !['arrow-left', 'dots-vertical', 'filter'].includes(name));
  expect(rowIcons).toEqual([
    'file-clock-outline',
    'sack-outline',
    'file-document-check-outline',
    'package-variant-closed',
    'truck-fast-outline',
  ]);
  expect(screen.getAllByText(i18n.t('partner.dashboard.currencyCode'))).toHaveLength(1);
});

it('shows the partner ID under the name on the edit profile screen', async () => {
  const screen = render(<EditProfileScreen />);
  await screen.findAllByText('Partner Live');
  expect(screen.getByText(String(profile.id))).toBeTruthy();
  expect(screen.getAllByText('+212600000102')).toHaveLength(1);
});

it('renders live offer history cards in Arabic without prototype query overrides', async () => {
  await i18n.changeLanguage('ar');
  const screen = render(<OffersHistoryScreen />);
  await screen.findByText(/OFF-LIVE-9/);
  expect(mockGetHistory).toHaveBeenCalledTimes(1);
  expect(screen.getByText(i18n.t('partner.history.statusLine', { status: i18n.t('partner.sent.enAttente') }))).toBeTruthy();
  // The brand is its own line, not a title prefix.
  expect(screen.getByText('محرك')).toBeTruthy();
  expect(screen.queryByText('داسيا محرك')).toBeNull();
  expect(screen.getByText(i18n.t('requestList.brand', { value: 'داسيا' }))).toBeTruthy();
  expect(screen.getByText(i18n.t('partner.history.qty', { count: 2 }))).toBeTruthy();
  expect(screen.getByText('(1)')).toBeTruthy();
  expect(screen.queryByText(i18n.t('partner.offersHistory.prixNet'))).toBeNull();
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('partner.history.dotsPlaceholder')), 'NOPE');
  expect(await screen.findByText(i18n.t('partner.offersHistory.noResults'))).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: i18n.t('partner.search.clear') }));
  expect(await screen.findByText(/OFF-LIVE-9/)).toBeTruthy();
});

it('filters offer history by status from the toolbar funnel', async () => {
  mockGetHistory.mockResolvedValueOnce({
    success: true,
    data: [offer, { ...offer, id: 10, reference: 'OFF-MISSED-10', status: 'expired' as const }],
    pagination: { ...pagination, total: 2, to: 2 },
  });
  const screen = render(<OffersHistoryScreen />);
  await screen.findByText(/OFF-MISSED-10/);
  fireEvent.press(screen.getByRole('button', { name: i18n.t('partner.history.filter') }));
  fireEvent.press(screen.getByRole('button', { name: i18n.t('partner.sent.offerManquee') }));
  await waitFor(() => expect(screen.queryByText(/OFF-LIVE-9/)).toBeNull());
  expect(screen.getByText(/OFF-MISSED-10/)).toBeTruthy();
});

it('localizes the full about journey in Arabic', async () => {
  await i18n.changeLanguage('ar');
  const screen = render(<AboutScreen />);
  expect(screen.getByText(i18n.t('partner.about.missionTitle'))).toBeTruthy();
  expect(screen.getByText(i18n.t('partner.about.missionBody'))).toBeTruthy();
  expect(screen.getByText(i18n.t('partner.about.contactTitle'))).toBeTruthy();
});
