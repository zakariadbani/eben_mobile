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

  it('mirrors to the bottom-left in Arabic and stays bottom-right in French', async () => {
    const arabic = render(<WhatsappBtn />);
    expect(arabic.getByRole('button').props.style).toEqual(expect.objectContaining({ left: 16, bottom: 16 }));
    expect(arabic.getByRole('button').props.style.right).toBeUndefined();
    arabic.unmount();

    await i18n.changeLanguage('fr');
    const french = render(<WhatsappBtn />);
    expect(french.getByRole('button').props.style).toEqual(expect.objectContaining({ right: 16, bottom: 16 }));
    expect(french.getByRole('button').props.style.left).toBeUndefined();
  });
});
