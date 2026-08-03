import React from 'react';
import { render } from '@testing-library/react-native';
import i18n from '@/localization/i18n';
import WhatsappBtn from '../WhatsappBtn';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn().mockResolvedValue(null) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

describe('WhatsappBtn', () => {
  beforeEach(async () => { await i18n.changeLanguage('ar'); });

  it('announces its localized support action instead of the icon name', () => {
    const screen = render(<WhatsappBtn />);

    expect(screen.getByRole('button', { name: i18n.t('accessibility.whatsapp') })).toBeTruthy();
  });
});
