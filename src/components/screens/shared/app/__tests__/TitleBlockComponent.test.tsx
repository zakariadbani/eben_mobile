import React from 'react';
import { render } from '@testing-library/react-native';
import i18n from '@/localization/i18n';
import TitleBlockComponent from '../TitleBlockComponent';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn().mockResolvedValue(null) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/components/common/CustomIcon', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return function MockIcon({ name }: { name: string }) {
    return React.createElement(Text, { testID: 'see-all-arrow' }, name);
  };
});

it('points the shared see-all arrow with the Arabic navigation direction', async () => {
  await i18n.changeLanguage('ar');
  const screen = render(
    <TitleBlockComponent titleBlock="catalog.categoriesTitle" seeAllNavigate="/(client)/categories" />,
  );

  expect(screen.getByTestId('see-all-arrow').props.children).toBe('arrow_left');
});
