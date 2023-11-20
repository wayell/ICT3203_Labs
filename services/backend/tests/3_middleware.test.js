const request = require('supertest')

const { server } = require('../index')

const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')
const mongod = new MongoMemoryServer()

const crypto = require('crypto')
const forge = require('node-forge')
const secp256k1 = require('@noble/curves/secp256k1').secp256k1

const { User } = require('../models/model_user')
const { Otp } = require('../models/model_otp')

const { generateToken } = require('../services/jwt_handler')

const { hashPassword, createKeychain,
    generateTransactionKeypair, encryptMasterKey,
    encryptMasterKeyRecovery }
    = require('../services/user_handler')

beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close()
    }
    await mongod.start()
    const uri = mongod.getUri()
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
}, 30000)

afterAll(async () => {
    await mongoose.disconnect()
    await mongod.stop()
    server.close()
}, 30000)

afterEach(() => {
    jest.clearAllMocks()
}, 20000)

describe('JWT Validation Middleware', () => {
    let userSpy
    let testUser, testOtp

    const mockToken = generateToken({
        sub: "60f67243e4b012345678abcd",
        transactionKeypair: ["key1", "key2"],
        bankBalanceKey: "key",
    })

    const createTestOtp = async () => {
        const otp = new Otp({
            secret: "BADC24RFKNALLM3ORHW4MZPPM237LNC",
            createdAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 100)
        })

        await otp.save()

        return otp
    }

    const createTestUser = async (badJwt, frozen) => {
        const password = "P@ssw0rd123"

        // Hashing user password
        const salt = crypto.randomBytes(16).toString('hex')
        const hashedPassword = await hashPassword(password, salt) + salt

        // Generate AES256 Keys using PBKDF2 for user
        const pbkdfSalt = forge.random.getBytesSync(16)
        const symmetricKey = forge.pkcs5.pbkdf2(password, pbkdfSalt, 600000, 32)

        // Generate ECC (ECIES) Keypair/Secret for user
        const privateKey = secp256k1.utils.randomPrivateKey()
        const publicKey = secp256k1.getPublicKey(privateKey)

        // Generate and encrypt keychain using ECC (ECIES)
        const keychain = createKeychain(1)

        // Generate transactionKeypair
        const transactionKeypair = generateTransactionKeypair(privateKey)

        // Encrypt ECC (ECIES) Private Key with AES256
        const masterKey = encryptMasterKey(symmetricKey, privateKey)

        // Encrypt ECC (ECIES) Private Key with AES256 Recovery Key (For Reset Password)
        const [recoveryPrivateKey, recoveryUtil] = encryptMasterKeyRecovery(privateKey)

        const user = new User({
            fullName: "Test User",
            phoneNumber: "85891234",
            email: "johndoe@example.com",
            password: hashedPassword,
            address_street: "Test Strret",
            address_postal: "777123",
            freezeStatus: false,
            otp: testOtp._id,
            pbkdfSalt: forge.util.bytesToHex(pbkdfSalt),
            masterKey: masterKey,
            publicKey: forge.util.bytesToHex(publicKey),
            recoveryUtil: recoveryUtil,
            keychain: keychain,
            transactionKeypair: transactionKeypair,

        })
        if (badJwt)
            user.jwt = "badjwt"
        else
            user.jwt = mockToken

        if (frozen) {
            user.freezeStatus = true
            user.freezeExpiration = new Date(new Date().getTime() + 5 * 60 * 60 * 1000)
        }
        else
            user.freezeStatus = false

        await user.save()

        return user
    }

    beforeAll(async () => {
        testOtp = await createTestOtp()
        testUser = await createTestUser()
        badJwtTestUser = await createTestUser(true, false)
        frozenTestUser = await createTestUser(false, true)
    }, 20000)

    afterAll(async () => {
        // Cleanup after all tests are done.
        if (testUser) {
            await User.findByIdAndDelete(testUser._id)
        }
        if (testOtp) {
            await Otp.findByIdAndDelete(testOtp._id)
        }

        jest.restoreAllMocks() // Restores all mocks to their original value.
    }, 20000)

    describe('Verify User Login Details', () => {
        beforeEach(() => {
            userSpy = jest.spyOn(User, 'findOne').mockResolvedValue(testUser)
        }, 20000)

        it('should validate the token and proceed to next middleware', async () => {
            userSpy.mockImplementation(() => Promise.resolve(testUser))

            const response = await request(server)
                .post('/api/users/middleware-check')
                .set('Cookie', [`jwtToken=${mockToken}`]) // Set the mock token in the cookie

            // Assertions
            expect(response.status).toEqual(200)
            expect(response.body).toEqual('No errors')
        }, 20000)

        it('should invalidate authentication and return 401 user not found', async () => {
            userSpy.mockImplementation(() => Promise.resolve(null))

            const response = await request(server)
                .post('/api/users/middleware-check')
                .set('Cookie', [`jwtToken=${mockToken}`]) // Set the mock token in the cookie

            // Assertions
            expect(response.status).toEqual(401)
            expect(response.body.message).toEqual('User not found')
        }, 20000)

        it('should invalidate authentication and return 401 session expired', async () => {
            userSpy.mockImplementation(() => Promise.resolve(badJwtTestUser))

            const response = await request(server)
                .post('/api/users/middleware-check')
                .set('Cookie', [`jwtToken=${mockToken}`]) // Set the mock token in the cookie

            // Assertions
            expect(response.status).toEqual(401)
            expect(response.body.message).toEqual('Session expired. Please log in again')
        }, 20000)

        it(`should invalidate authentication and return 401 user's account is frozen`, async () => {
            userSpy.mockImplementation(() => Promise.resolve(frozenTestUser))

            const response = await request(server)
                .post('/api/users/middleware-check')
                .set('Cookie', [`jwtToken=${mockToken}`]) // Set the mock token in the cookie

            // Assertions
            expect(response.status).toEqual(401)
            expect(response.body.message).toEqual(`User's account is frozen`)
        }, 20000)
    })
})
