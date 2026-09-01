import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import i18n from '@/localization/i18n';
import AboutScreen from '../profile/about';
import CompanyScreen from '../profile/company';
import EditProfileScreen from '../profile/edit';
import NotificationsScreen from '../profile/notifications';
import OffersHistoryScreen from '../profile/offers-history';
import ProfileScreen from '../profile';

const mockPush = jest.fn();
const mockRefreshSessionProfile = jest.fn().mockResolvedValue(undefined);
const mockGetProfile = jest.fn();
const mockUpdateProfile = jest.fn();
const mockGetCompany = jest.fn();
const mockUpdateCompany = jest.fn();
const mockGetBrands = jest.fn();
const mockGetNotifications = jest.fn();
const mockMarkRead = jest.fn();
const mockMarkAllRead = jest.fn();
const mockGetHistory = jest.fn();
const mockUploadImages = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-router', () => ({
  Tabs: { Screen: () => null },
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useFocusEffect: (callback: () => void) => {
    const ReactModule = require('react') as typeof React;
    ReactModule.useEffect(callback, [callback]);
  },
}));

jest.mock('@/context/AuthContext', () => ({
  useSession: () => ({ username: 'Partner Session', logOut: jest.fn(), refreshSessionProfile: mockRefreshSessionProfile }),
}));

jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///partner-avatar.jpg' }] }),
}));

jest.mock('@/api/resources/uploads', () => ({ uploadLocalImages: (...args: unknown[]) => mockUploadImages(...args) }));

jest.mock('@/api', () => ({
  getPrestataireProfile: (...args: unknown[]) => mockGetProfile(...args),
  updatePrestataireProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  getPrestataireCompany: (...args: unknown[]) => mockGetCompany(...args),
  updatePrestataireCompany: (...args: unknown[]) => mockUpdateCompany(...args),
  getBrands: (...args: unknown[]) => mockGetBrands(...args),
}));

jest.mock('@/api/resources/prestataire', () => ({
  getPrestataireNotifications: (...args: unknown[]) => mockGetNotifications(...args),
  markPrestataireNotificationRead: (...args: unknown[]) => mockMarkRead(...args),
  markAllPrestataireNotificationsRead: (...args: unknown[]) => mockMarkAllRead(...args),
  getPrestataireOffersHistory: (...args: unknown[]) => mockGetHistory(...args),
}));

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
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
  images: [],
  categoryTitle: 'Moteur',
  categoryTitleAr: 'محرك',
  categoryImage: null,
  ferrailleurName: 'Partner Live',
};

beforeEach(async () => {
  jest.clearAllMocks();
  await i18n.changeLanguage('fr');
  mockGetProfile.mockResolvedValue({ success: true, data: profile });
  mockUpdateProfile.mockResolvedValue({ success: true, data: { ...profile, avatar: 'https://cdn.example/avatar.jpg' } });
  mockUploadImages.mockResolvedValue(['tmp/mobile/7/avatar.jpg']);
  mockGetCompany.mockResolvedValue({ success: true, data: company });
  mockGetBrands.mockResolvedValue({ success: true, data: [
    { id: 42, name: 'Marque existante', nameAr: 'ماركة قائمة', logo: null, status: true, sortOrder: 1 },
    { id: 77, name: 'Marque API live', nameAr: 'ماركة مباشرة', logo: null, status: true, sortOrder: 2 },
  ], pagination: { ...pagination, total: 2, to: 2 } });
  mockUpdateCompany.mockResolvedValue({ success: true, data: { ...company, specializations: [42, 77] } });
  mockGetNotifications.mockResolvedValue({ success: true, data: [notification], pagination });
  mockMarkRead.mockResolvedValue({ success: true, data: { ...notification, isRead: true } });
  mockMarkAllRead.mockResolvedValue({ success: true, data: { updated: 1 } });
  mockGetHistory.mockResolvedValue({ success: true, data: [offer], pagination });
});

it('adds a specialization using the live catalog brand id', async () => {
  const screen = render(<CompanyScreen />);
  await screen.findByText('Marque existante');
  fireEvent.press(screen.getByText(i18n.t('partner.company.addBrandCta')));
  fireEvent.press(await screen.findByText('Marque API live'));
  const addButtons = screen.getAllByRole('button', { name: i18n.t('partner.company.sheetCta') });
  fireEvent.press(addButtons[addButtons.length - 1]);
  await waitFor(() => expect(mockUpdateCompany).toHaveBeenCalledWith({ specializations: [42, 77] }));
});

it('shows the live profile identity without unsupported local privacy toggles', async () => {
  const screen = render(<ProfileScreen />);
  await screen.findByText(i18n.t('partner.profile.greeting', { name: 'Partner Live' }));
  expect(screen.queryByText(i18n.t('partner.profile.notifPush'))).toBeNull();
  expect(screen.getByRole('button', { name: i18n.t('partner.notifications.title') })).toBeTruthy();
  expect(screen.queryByText(i18n.t('partner.profile.doNotTrack'))).toBeNull();
  expect(screen.queryByText('EBEN Solutions SARL © 2022')).toBeNull();
  expect(screen.getByText(`EBEN Solutions SARL © ${new Date().getFullYear()}`)).toBeTruthy();
});

it('uploads an owned avatar path and refreshes the persisted session identity', async () => {
  const screen = render(<EditProfileScreen />);
  await screen.findAllByText('+212600000102');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('partner.editProfile.changeAvatar') }));
  await waitFor(() => expect(mockUploadImages).toHaveBeenCalledWith(['file:///partner-avatar.jpg']));
  expect(mockUpdateProfile).toHaveBeenCalledWith({ avatar: 'tmp/mobile/7/avatar.jpg' });
  expect(mockRefreshSessionProfile).toHaveBeenCalled();
});

it('marks every loaded Prestataire notification read from the reachable header action', async () => {
  const screen = render(<NotificationsScreen />);
  await screen.findByText('Paiement live');
  fireEvent.press(screen.getByRole('button', { name: i18n.t('partner.notifications.markAllRead') }));
  await waitFor(() => expect(mockMarkAllRead).toHaveBeenCalledTimes(1));
  expect(screen.queryByText(i18n.t('partner.notifications.cta.details'))).toBeNull();
});

it('marks one payment notification read and opens its referenced partner order', async () => {
  const screen = render(<NotificationsScreen />);
  await screen.findByText('Paiement live');
  fireEvent.press(screen.getByRole('button', { name: 'Paiement live' }));
  await waitFor(() => expect(mockMarkRead).toHaveBeenCalledWith(5));
  expect(mockPush).toHaveBeenCalledWith('/(prestataire)/orders/8');
});

it('renders live offer history in Arabic without prototype query overrides', async () => {
  await i18n.changeLanguage('ar');
  const screen = render(<OffersHistoryScreen />);
  await screen.findByText(/OFF-LIVE-9/);
  expect(mockGetHistory).toHaveBeenCalledTimes(1);
  expect(screen.getByText(i18n.t('partner.offer.statusPending'))).toBeTruthy();
  fireEvent.changeText(screen.getByPlaceholderText(i18n.t('partner.history.searchPlaceholder')), 'OFF');
  expect(screen.getByRole('button', { name: i18n.t('partner.search.clear') })).toBeTruthy();
  expect(screen.getByText(i18n.t('partner.offersHistory.prixNet'))).toBeTruthy();
});

it('localizes the full about journey in Arabic', async () => {
  await i18n.changeLanguage('ar');
  const screen = render(<AboutScreen />);
  expect(screen.getByText(i18n.t('partner.about.missionTitle'))).toBeTruthy();
  expect(screen.getByText(i18n.t('partner.about.missionBody'))).toBeTruthy();
  expect(screen.getByText(i18n.t('partner.about.contactTitle'))).toBeTruthy();
});
