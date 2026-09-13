import React from 'react';
import { render } from '@testing-library/react-native';

import i18n from '@/localization/i18n';
import ReplaceBasketModal from '../ReplaceBasketModal';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

function renderBody(count: number, reference: string | null = 'REQ-IWWTQNFJ') {
  const pending = { count, reference } as React.ComponentProps<typeof ReplaceBasketModal>['pending'];
  return render(<ReplaceBasketModal pending={pending} onConfirm={jest.fn()} onCancel={jest.fn()} />);
}

afterEach(async () => {
  await i18n.changeLanguage('fr');
});

describe('ReplaceBasketModal piece count', () => {
  it('pluralises « pièce » in French', async () => {
    await i18n.changeLanguage('fr');
    expect(renderBody(1).getByText(
      'Votre panier contient 1 pièce de la demande REQ-IWWTQNFJ. Ajouter cette offre videra votre panier.',
    )).toBeTruthy();
    expect(renderBody(2).getByText(
      'Votre panier contient 2 pièces de la demande REQ-IWWTQNFJ. Ajouter cette offre videra votre panier.',
    )).toBeTruthy();
    expect(renderBody(3, null).getByText('Votre panier contient 3 pièces. Ajouter cette offre videra votre panier.')).toBeTruthy();
    expect(renderBody(1).queryByText(/pièce\(s\)/)).toBeNull();
  });

  it('uses the Arabic plural forms', async () => {
    await i18n.changeLanguage('ar');
    expect(renderBody(1).getByText(/على قطعة واحدة من الطلب REQ-IWWTQNFJ/)).toBeTruthy();
    expect(renderBody(2).getByText(/على قطعتين من الطلب REQ-IWWTQNFJ/)).toBeTruthy();
    expect(renderBody(3).getByText(/على 3 قطع من الطلب REQ-IWWTQNFJ/)).toBeTruthy();
    expect(renderBody(11, null).getByText(/على 11 قطعة\./)).toBeTruthy();
  });
});
