const { validateEAN } = require('../lib/validateEAN');

describe('validateEAN', () => {
    describe('valid EAN-13 codes', () => {
        test('5900000000008 (typowy polski EAN)', () => {
            expect(validateEAN('5900000000008')).toBe(true);
        });

        test('5901234123457', () => {
            expect(validateEAN('5901234123457')).toBe(true);
        });

        test('4006381333931 (niemiecki EAN)', () => {
            expect(validateEAN('4006381333931')).toBe(true);
        });

        test('0799439112766', () => {
            expect(validateEAN('0799439112766')).toBe(true);
        });
    });

    describe('valid EAN-8 codes', () => {
        test('96385074', () => {
            expect(validateEAN('96385074')).toBe(true);
        });

        test('65833254', () => {
            expect(validateEAN('65833254')).toBe(true);
        });

        test('44000004', () => {
            expect(validateEAN('44000004')).toBe(true);
        });
    });

    describe('invalid codes', () => {
        test('wrong check digit (5900000000001)', () => {
            expect(validateEAN('5900000000001')).toBe(false);
        });

        test('wrong check digit for EAN-8 (96385070)', () => {
            expect(validateEAN('96385070')).toBe(false);
        });

        test('too short (12345)', () => {
            expect(validateEAN('12345')).toBe(false);
        });

        test('14-digit internal code (00461455550000)', () => {
            expect(validateEAN('00461455550000')).toBe(false);
        });

        test('valid EAN-13 with extra digit appended (59003977457800)', () => {
            expect(validateEAN('59003977457800')).toBe(false);
        });

        test('12 digits (590039774578)', () => {
            expect(validateEAN('590039774578')).toBe(false);
        });

        test('non-numeric string', () => {
            expect(validateEAN('abcdefghijklm')).toBe(false);
        });

        test('empty string', () => {
            expect(validateEAN('')).toBe(false);
        });

        test('letters mixed with digits', () => {
            expect(validateEAN('590000abc0008')).toBe(false);
        });

        test('string with spaces', () => {
            expect(validateEAN('590 000 000 0008')).toBe(false);
        });
    });
});
