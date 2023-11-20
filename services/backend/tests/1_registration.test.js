const request = require('supertest')
const { sendEmail } = require('../services/email_handler')
const { server } = require('../index')

// const { ObjectId } = require('mongodb')
const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')
const mongod = new MongoMemoryServer()

const { User } = require('../models/model_user')
const { Otp } = require('../models/model_otp')
const { ObjectId } = require('mongodb')

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
})

describe('User Registration', () => {
    let userSpy, otpSpy

    beforeEach(() => {
        userSpy = jest.spyOn(User, 'findOne').mockResolvedValue(null);
        otpSpy = jest.spyOn(Otp, 'findOne')
    }, 20000)

    afterEach(() => {
        userSpy.mockRestore()
        otpSpy.mockRestore()
    }, 20000)

    // Fake user data without email and password
    const badRegistrationBody = {
        fullName: 'John Doe',
        dateOfBirth: '1990-01-01',
        phoneNumber: '123-456-7890',
        // email: 'johndoe@example.com',
        // password: 'veryg00dpasswordandsecurepassword123',
        address_block: '123',
        address_street: 'Main St.',
        address_unit_floor: '5',
        address_unit_number: '501',
        address_postal: '12345',
        address_building: 'Doe Towers'
    }

    // Fake user data
    const registrationBody = {
        fullName: 'John Doe',
        dateOfBirth: '1990-01-01',
        phoneNumber: '123-456-7890',
        email: 'johndoe@example.com',
        password: 'veryg00dpasswordandsecurepassword123',
        address_block: '123',
        address_street: 'Main St.',
        address_unit_floor: '5',
        address_unit_number: '501',
        address_postal: '12345',
        address_building: 'Doe Towers'
    }

    it('should return status code 500 when registration is unsuccessful due to user not existing', async () => {
        User.findOne.mockResolvedValue(null)

        const res = await request(server).post('/api/users/register').send(badRegistrationBody)
        expect(res.statusCode).toEqual(400)
    }, 20000)

    // it('should register a user successfully and return status code 200', async () => {
    //     // Mocking Otp.findOne to return an object with _id and email fields
    //     otpSpy.mockImplementation(() => Promise.resolve({ _id: new ObjectId("60f67243e4b012345678abcd"), email: 'johndoe@example.com' }))

    //     const res = await request(server).post('/api/users/register').send(registrationBody)

    //     // Asserts
    //     expect(res.statusCode).toEqual(200)
    //     expect(res.body).toEqual('User successfully registered and bank account created.')
    // }, 20000)
})
