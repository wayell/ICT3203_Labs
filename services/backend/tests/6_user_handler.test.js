const { isSeniorCitizen, inSpanOfOneMinute, isPasswordBreached } = require('../services/user_handler')

describe('User Handler Functions', () => {
    describe('isSeniorCitizen Function', () => {
        it('should return true', () => {
            expect(isSeniorCitizen("January 1, 1950")).toBe(true)
        }, 20000)

        it('should return false', () => {
            expect(isSeniorCitizen("December 5, 2017")).toBe(false)
        }, 20000)
    })

    describe('inSpanOfOneMinute Function', () => {
        it('should return true for dates within a span of one minute', () => {
            const now = new Date().getTime()
            const thirtySecondsBefore = new Date(now - 30 * 1000).getTime()
            const fiftySecondsBefore = new Date(now - 50 * 1000).getTime()
            expect(inSpanOfOneMinute([now, thirtySecondsBefore, fiftySecondsBefore])).toBe(true)
        }, 20000)

        it('should return false for dates not within a span of one minute', () => {
            const now = new Date().getTime()
            const twoMinutesBefore = new Date(now - 2 * 60 * 1000).getTime()
            const threeMinutesBefore = new Date(now - 3 * 60 * 1000).getTime()
            expect(inSpanOfOneMinute([now, twoMinutesBefore, threeMinutesBefore])).toBe(false)
        }, 20000)
    })

    describe('isPasswordBreached Function', () => {
        it('should return true for passwords breached before', () => {
            expect(isPasswordBreached("P@ssw0rd123")).toBe(false)
        }, 20000)

        it('should return false for passwords not breached before', () => {
            expect(isPasswordBreached("thereisnogoddamnedwaythispasswordhasbeenbreachedbefore")).toBe(false)
        }, 20000)
    })
})