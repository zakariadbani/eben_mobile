import type { UserNotificationPreferences } from '@/interfaces/Notification';
import { mockRegistry } from '../registry';

it('persists notification preferences in mock mode', () => {
  const get = mockRegistry['GET:/notifications/preferences']!;
  const put = mockRegistry['PUT:/notifications/preferences']!;
  const initial = get().data as UserNotificationPreferences;

  put({ channelPreferences: { push: !initial.channelPreferences.push } });

  expect((get().data as UserNotificationPreferences).channelPreferences.push)
    .toBe(!initial.channelPreferences.push);
});