import { isCompleteOtp } from '../PhoneVerificationComponent';

describe('isCompleteOtp', () => {
  it.each(['0000', '1234', '9876'])('accepts complete four-digit OTP %s', (value) => {
    expect(isCompleteOtp(value)).toBe(true);
  });

  it.each(['', '123', '12345', '12a4'])('rejects incomplete or invalid OTP %s', (value) => {
    expect(isCompleteOtp(value)).toBe(false);
  });
});
