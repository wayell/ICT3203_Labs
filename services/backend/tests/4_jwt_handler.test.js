require('dotenv').config()
const { generateToken, verifyToken } = require('../services/jwt_handler')

describe('JWT Token Service', () => {
    beforeAll(() => {
        jest.useFakeTimers()
    })

    afterAll(() => {
        jest.useRealTimers()
    })

    const mockPayload = {
        sub: "60f67243e4b012345678abcd",
        transactionKeypair: ["key1", "key2"],
        bankBalanceKey: "key",
    }
    let token

    beforeEach(() => {
        // Generate a new token for each test to ensure they are independent
        token = generateToken(mockPayload)
    }, 20000)

    describe('generateToken Function', () => {
        it('should generate a valid JWT token', () => {
            expect(token).toBeDefined()
            expect(typeof token).toBe('string')
        })
    }, 20000)

    describe('verifyToken Function', () => {
        it('should verify a token and return the payload', () => {
            const decodedPayload = verifyToken(token)
            expect(decodedPayload).toBeDefined()
            expect(decodedPayload.sub).toBe(mockPayload.sub)
            expect(decodedPayload.transactionKeypair).toStrictEqual(mockPayload.transactionKeypair)
            expect(decodedPayload.bankBalanceKey).toBe(mockPayload.bankBalanceKey)
        })

        it('should return 0 for an expired token', async () => {
            const token = generateToken({ data: 'test' })

            jest.advanceTimersByTime((15 * 60 + 1) * 1000)

            const result = verifyToken(token)
            expect(result).toBe(0)
        })
    }, 20000)
}, 20000)
