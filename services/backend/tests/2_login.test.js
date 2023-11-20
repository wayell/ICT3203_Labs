const request = require('supertest')
const { sendEmail } = require('../services/email_handler')
const { server } = require('../index')

const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')
const mongod = new MongoMemoryServer()

const { User } = require('../models/model_user')
const { Otp } = require('../models/model_otp')

const crypto = require('crypto')
const forge = require('node-forge')
const secp256k1 = require('@noble/curves/secp256k1').secp256k1

const { hashPassword, createKeychain,
    generateTransactionKeypair, encryptMasterKey,
    encryptMasterKeyRecovery }
    = require('../services/user_handler')

jest.mock('../services/email_handler')

jest.mock('node-mailjet', () => {
    return {
        apiConnect: jest.fn(() => ({
            post: jest.fn().mockReturnThis(),
            request: jest.fn().mockResolvedValue({ body: { Messages: [{ Status: 'success' }] } })
        }))
    }
})

sendEmail.mockImplementation(jest.fn(() => Promise.resolve({ message: 'Email sent' })))

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

describe('User Authentication Endpoints', () => {
    let userSpy
    let testUser, testOtp

    const loginDetailsBody = {
        email: "johndoe@example.com",
        password: "P@ssw0rd123"
    }

    const createTestOtp = async () => {
        const otp = new Otp({
            secret: "BADC24RFKNALLM3ORHW4MZPPM237LNC",
            createdAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 100)
        })

        await otp.save()

        return otp
    }

    const createTestUser = async (badEmail, badPassword) => {
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
            email: "johndoe@example.com",
            phoneNumber: "85891234",
            address_street: "Test Street",
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

        if (badPassword)
            user.password = "badpassword"
        else
            user.password = hashedPassword

        await user.save()

        return user
    }

    beforeAll(async () => {
        testOtp = await createTestOtp()
        testUser = await createTestUser()
        badPasswordTestUser = await createTestUser(false, true)
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

        it(`should authenticate a user successfully and return status code 200 email sent`, async () => {
            userSpy.mockImplementation(() => Promise.resolve(testUser))

            const res = await request(server).post('/api/users/verify-login-details').send(loginDetailsBody)

            // Asserts
            expect(res.statusCode).toEqual(200)
            expect(res.body).toEqual('Email sent')
        }, 20000)

        it(`should not authenticate a user and return status code 400 wrong user details`, async () => {
            userSpy.mockImplementation(() => Promise.resolve(badPasswordTestUser))

            const res = await request(server).post('/api/users/verify-login-details').send(loginDetailsBody)

            // Asserts
            expect(res.statusCode).toEqual(400)
            expect(res.body).toEqual('Wrong user details')
        }, 20000)
    })
})