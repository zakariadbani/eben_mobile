import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import i18n from '@/localization/i18n';
import AudioRecorderInput from '../AudioRecorderInput';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const mockPrepareToRecordAsync = jest.fn().mockResolvedValue(undefined);
const mockRecord = jest.fn();
const mockStop = jest.fn().mockResolvedValue(undefined);
const mockRequestPermission = jest.fn();
const mockSetAudioMode = jest.fn().mockResolvedValue(undefined);

let mockRecorderState = { isRecording: false, durationMillis: 0, url: null as string | null };
const mockRecorder = {
  prepareToRecordAsync: mockPrepareToRecordAsync,
  record: mockRecord,
  stop: mockStop,
  get uri() { return mockRecorderState.url; },
};

jest.mock('expo-audio', () => ({
  RecordingPresets: { HIGH_QUALITY: {} },
  requestRecordingPermissionsAsync: (...args: unknown[]) => mockRequestPermission(...args),
  setAudioModeAsync: (...args: unknown[]) => mockSetAudioMode(...args),
  useAudioRecorder: () => mockRecorder,
  useAudioRecorderState: () => mockRecorderState,
}));

jest.mock('../AudioPlayer', () => {
  const ReactModule = require('react');
  const { Text } = require('react-native');
  return function MockAudioPlayer({ uri }: { uri: string }) {
    return ReactModule.createElement(Text, { accessibilityLabel: `audio:${uri}` }, uri);
  };
});

beforeEach(async () => {
  jest.clearAllMocks();
  mockRecorderState = { isRecording: false, durationMillis: 0, url: null };
  mockRecord.mockImplementation(() => {
    mockRecorderState = { ...mockRecorderState, isRecording: true };
  });
  mockRequestPermission.mockResolvedValue({ granted: true });
  await i18n.changeLanguage('fr');
});

it('records a voice note with permission and returns the local M4A URI', async () => {
  const onChange = jest.fn();
  mockRecorderState.url = 'file:///cache/offer-note.m4a';
  const view = render(<AudioRecorderInput value={null} onChange={onChange} />);

  fireEvent.press(view.getByRole('button', { name: i18n.t('partner.fill.audioRecord') }));
  await waitFor(() => expect(mockRecord).toHaveBeenCalledWith({ forDuration: 180 }));
  view.rerender(<AudioRecorderInput value={null} onChange={onChange} />);

  fireEvent.press(view.getByRole('button', { name: i18n.t('partner.fill.audioStop') }));
  await waitFor(() => expect(onChange).toHaveBeenCalledWith('file:///cache/offer-note.m4a'));
});

it('shows localized permission feedback without starting a recording', async () => {
  mockRequestPermission.mockResolvedValueOnce({ granted: false });
  const view = render(<AudioRecorderInput value={null} onChange={jest.fn()} />);

  fireEvent.press(view.getByRole('button', { name: i18n.t('partner.fill.audioRecord') }));

  expect((await view.findByRole('alert')).props.children).toBe(i18n.t('partner.fill.audioPermissionDenied'));
  expect(mockRecord).not.toHaveBeenCalled();
});
