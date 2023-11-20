const { generateSecret, generateOtp, verifyOtp } = require('../services/otp_handler')

describe('Otp Handler Functions', () => {
    let secret, otp;
  
    beforeEach(() => {
        secret = generateSecret();
        otp = generateOtp(secret);
    });

    describe('generateSecret Function', () => {
        it('should return a secret of length 32', () => {
            expect(secret.length).toBe(32);
        });
    });

    describe('generateOtp Function', () => {
        it('should return a 6 digit otp based on the given secret', () => {
            expect(otp).toMatch(/^\d{6}$/);
        });
    });

    describe('verifyOtp Function', () => {
        it('should return true for matching otps', () => {
            expect(verifyOtp(otp, secret)).toBe(true);
        });

        it('should return false for non matching otps', () => {
            const wrongOtp = '123456'; // An intentionally incorrect OTP
            expect(verifyOtp(wrongOtp, secret)).toBe(false);
        });
    });
});
