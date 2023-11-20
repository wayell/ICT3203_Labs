const express = require('express')
const router = express.Router()

const crypto = require('crypto')
const sha2561 = require('js-sha256');
const forge = require('node-forge')
const secp256k1 = require('@noble/curves/secp256k1').secp256k1

const { User } = require('../models/model_user')
const { Token } = require('../models/model_token')
const { Otp } = require('../models/model_otp')
const { BankAccount } = require('../models/model_bankaccount')

const { addLog } = require('../services/log_handler')
const { sendEmail } = require('../services/email_handler')
const { generateSecret, generateOtp, verifyOtp } = require('../services/otp_handler')
const { generateToken } = require('../services/jwt_handler')
const { createLog } = require('../services/database_handler')

const jwtValidationMiddleware = require('./middleware')

const socketHandler = require("../services/socket_handler")
const { isSeniorCitizen, inSpanOfOneMinute, isPasswordBreached,
    encryptAccountAmount, hashPassword, createKeychain, encryptKeychain,
    generateTransactionKeypair, encryptMasterKey, decryptMasterKey,
    decryptKeychainEntry, decryptTransactionKeypair, encryptMasterKeyRecovery,
    decryptMasterKeyRecovery, decryptAccountDetails } = require('../services/user_handler')
const { Transaction } = require('../models/model_transaction')


/*
    http://localhost:8080/api/users/

    200: Users sent back to client
    500: Server Error
*/
// router.route('/').get(jwtValidationMiddleware, async (req, res) => {
//     try {
//         const users = await User.find()
//         return res.status(200).json(users)
//     } catch (error) {
//         console.error(error)
//         return res.status(500).json('Server Error')
//     }
// })

//   http://localhost:8080/api/users/user-data-transfer
router.route('/user-data-transfer').get(jwtValidationMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.sub).select('email')
        return res.status(200).json(user)
    } catch (error) {
        console.error(error)
        res.status(500).json('Server Error')
    }
})

//   http://localhost:8080/api/users/user-data-profile
router.route('/user-data-profile').get(jwtValidationMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.sub).select('fullName dateOfBirth email phoneNumber address_block address_street address_building address_postal address_unit_floor address_unit_number')
        return res.status(200).json(user)
    } catch (error) {
        console.error(error)
        res.status(500).json('Server Error')
    }
})

// http://localhost:8080/api/users/update
router.route('/update').patch(jwtValidationMiddleware, async (req, res) => {
    const userAgent = req.headers['user-agent'];

    const forwarded = req.headers['x-forwarded-for'];
    const clientIP = forwarded ? forwarded.split(/, /)[0] : req.socket.remoteAddress;

    try {
        const userId = req.user.sub;
        const user = await User.findById(req.user.sub)
        const {
            fullName,
            phoneNumber,
            email,
            address_block,
            address_street,
            address_unit_floor,
            address_unit_number,
            address_postal,
            address_building,
        } = req.body;

        const newUserInfo = {
            fullName,
            phoneNumber,
            email,
            address_block,
            address_street,
            address_unit_floor,
            address_unit_number,
            address_postal,
            address_building,
        }
        const updatedUser = await User.findByIdAndUpdate(userId, newUserInfo, { new: true })

        const log = await createLog(user._id, `Update User Profile ${clientIP} ${userAgent}`)
        await log.save()

        await addLog(log)

        res.json(updatedUser)
    }
    catch (error) {
        console.error(error)
        res.status(500).json('Server Error')
    }

})

// http://localhost:8080/api/users/change-password
router.route('/change-password').patch(jwtValidationMiddleware, async (req, res) => {
    const userAgent = req.headers['user-agent'];

    const forwarded = req.headers['x-forwarded-for'];
    const clientIP = forwarded ? forwarded.split(/, /)[0] : req.socket.remoteAddress;

    try {
        const userId = req.user.sub;
        const user = await User.findById(req.user.sub)

        const { password, confirmNewPassword, currentPassword } = req.body;

        const dbHashedPassword = user.password.slice(0, -32)
        const dbHashedPasswordSalt = user.password.slice(-32)

        const currentPasswordHash = await hashPassword(currentPassword, dbHashedPasswordSalt)

        if (currentPasswordHash != dbHashedPassword)
            return res.status(400).json('Wrong password')
        if (password != confirmNewPassword)
            return res.status(400).json('Passwords do not match')
        if (isPasswordBreached(confirmNewPassword)) {
            return res.status(403).json('Password is not secure!')
        }
        else {

            // Decrypt masterKey with current password
            const masterKey = decryptMasterKey(currentPassword, user.pbkdfSalt, user.masterKey)

            // Encrypt masterKey with new password and salt
            const newPbkdfSalt = forge.random.getBytesSync(16)
            const newSymmetricKey = forge.pkcs5.pbkdf2(password, newPbkdfSalt, 600000, 32)
            const encryptedMasterKey = encryptMasterKey(newSymmetricKey, forge.util.hexToBytes(masterKey))

            // Get new password hash
            const newSalt = crypto.randomBytes(16).toString('hex')
            const newPasswordHash = await hashPassword(password, newSalt) + newSalt

            user.password = newPasswordHash
            user.pbkdfSalt = forge.util.bytesToHex(newPbkdfSalt)
            user.masterKey = encryptedMasterKey

            await user.save()

            const log = await createLog(user._id, `Change Password ${clientIP} ${userAgent}`)
            await log.save()

            await addLog(log)

            res.status(200).json('Password has been changed!')
        }

    } catch (error) {
        console.error(error)
        res.status(500).json("Server error")
    }
})
//http://localhost:8080/api/usersf/2fa-usage
router.route('/2fa-usage').post(jwtValidationMiddleware, async (req, res) => {
    try {
        const { email } = req.query
        const user = await User.findOne({ email: email })

        if (!user) {
            return res.status(400).json('User is not found')
        }
        else {
            // console.log(user)
            // find the otp based on the user id
            let otpDocument = await Otp.findOne({ _id: user.otp })

            if (!otpDocument) {
                return res.status(400).json('OTP does not exist??')
            }
            else {
                // it OTP presents, get the otp secret
                secret = otpDocument.secret
            }
            const currentOtp = generateOtp(secret)

            const emailSent = await sendEmail({
                to: email,
                subject: "DB-SEIS-OTP",
                text: `This is your OTP ${currentOtp}`
            })
            if (emailSent) {
                return res.status(200).json("Email sent, and secret generated")
            }
            else
                res.status(400).json('Unable to send verification email')

        }

    } catch (error) {
        console.error(error)
        res.status(500).json('Server Error')
    }
})
// http://localhost:8080/api/users/verifyOtpSent
router.route('/verifyOtpSent').post(jwtValidationMiddleware, async (req, res) => {
    try {
        console.log('verifying otps')
        const { email, userOtp } = req.body
        const user = await User.findOne({ email: email })
        if (!user) {
            return res.status(400).json("User not found")
        }

        let otpDocument = await Otp.findOne({ _id: user.otp })

        if (!otpDocument) {
            return res.status(400).json("OTP not found")
        }
        else {
            const secret = otpDocument.secret
            const isValid = verifyOtp(userOtp, secret)
            if (isValid) {
                return res.status(200).json("OTP verified successfully")
            }
            else {
                return res.status(400).json("OTP verification failed")
            }
        }

    } catch (error) {
        console.error(error)
        res.status(500).json('Server Error')
    }
})

/*
    http://localhost:8080/api/users/middleware-check

    200: No errors
    500: Server Error
*/
router.route('/middleware-check').post(jwtValidationMiddleware, async (req, res) => {
    try {
        return res.status(200).json('No errors')
    } catch (error) {
        res.clearCookie('jwtToken', {
            expires: new Date(0)
        })

        console.error(error)
        return res.status(500).json('Server Error')
    }
})

/*
    http://localhost:8080/api/users/send-email-verification

    200: Verification email sent
    400: Various errors
    500: Server Error
*/
router.route('/send-email-verification').post(async (req, res) => {
    try {
        const { email } = req.body

        const user = await User.findOne({ email })

        if (user)
            return res.status(400).json("User already exists!")

        // Check if a token already exists for the given email
        const tokenExists = await Token.findOne({ email: email })

        if (tokenExists) {
            // If the token for an email address already exists (or otherwise pending verification)
            return res.status(400).json("A verification email is already pending for this email address")
        }

        // Create a verification token
        const value = crypto.randomBytes(16).toString('hex')

        const newToken = new Token({
            email: email,
            value: value
        })

        const token = await newToken.save()

        if (!token)
            return res.status(400).json("Unable to generate email verification token")

        else {
            const verificationLink = `${process.env.BASE_URL}/api/users/verify-email?token=${value}`

            const emailSent = await sendEmail({
                to: email,
                subject: "DB-SEIS Email Verification",
                text: `Please click the following link to verify your email: ${verificationLink}`
            })

            if (emailSent)
                return res.status(200).json({ message: 'Verification email sent' })
            else {
                // If the email failed to send, remove the token from the database
                await Token.findByIdAndDelete(token._id)
                return res.status(400).json('Unable to send verification email')
            }
        }

    } catch (error) {
        console.error(error)
        return res.status(500).json('Server Error')
    }
})

/*
    http://localhost:8080/api/users/verify-email

    303: Email verified successfully / unsuccessfully => redirects clients
    500: Server Error
*/
router.route('/verify-email').get(async (req, res) => {
    try {
        const { token } = req.query

        // Find the verification token in the database
        const foundToken = await Token.findOne({ value: token })

        if (!foundToken) {
            res.status(303).redirect(`${process.env.FRONTEND_URL}/email-verification-result?result=false`)
            return
        }

        await Token.findByIdAndDelete(foundToken._id)

        // Emit a 'email-verified' event to the corresponding email's socket room
        const io = socketHandler.getIo()
        io.to(foundToken.email).emit('email-verified', { email: foundToken.email })

        res.status(303).redirect(`${process.env.FRONTEND_URL}/email-verification-result?result=true`)
        return
        // res.status(200).json('Email verified successfully')
    } catch (error) {
        console.error(error)
        return res.status(500).json('Server Error')
    }
})

/*
    http://localhost:8080/api/users/validate-details

    200: Users' details are validated
    400: User with that phone number already exists
    401: Password breached before
    500: Server Error
*/
router.route('/validate-details').post(async (req, res) => {
    try {
        const { password, phoneNumber } = req.body; // Destructure phoneNumber from the request body

        // check password against list of breached passwords
        if (isPasswordBreached(password))
            return res.status(401).json('Password is not secure!')

        // Check if a user with that phone number already exists
        const userExists = await User.findOne({ phoneNumber: phoneNumber });

        if (userExists) {
            // If a user with that phone number exists, return a 400 status code
            return res.status(400).json('User with that phone number already exists');
        }

        // Password not breached before and phone number does not exist in DB
        return res.status(200).json(`Users' details are validated`);

    } catch (error) {
        console.error(error);
        return res.status(500).json('Server Error');
    }
});

/*
    http://localhost:8080/api/users/2fa-setup

    200: Email sent and secret generated for user
    400: Various errors
    500: Server Error
*/
router.route('/2fa-setup').get(async (req, res) => {
    const { email } = req.query

    try {
        let otpDocument = await Otp.findOne({ email: email })

        let secret
        if (!otpDocument) {
            // If no OTP exists, generate a new secret and save it
            secret = generateSecret()

            const newOtp = new Otp({
                email: email,
                secret: secret
            })

            otpDocument = await newOtp.save()

            if (!otpDocument) {
                return res.status(400).json('Secret generation was unsuccessful')
            }
        } else {
            // If OTP already exists, retrieve the secret
            secret = otpDocument.secret
        }

        // Generate OTP using the stored secret
        const currentOtp = generateOtp(secret)

        // --------------------------------------------------------------- Revert after debugging!!! Uncomment the lines and remove the console.log
        const emailSent = await sendEmail({
            to: email,
            subject: "DB-SEIS OTP",
            text: `This is your OTP: ${currentOtp}`
        })
        console.log(`This is your OTP: ${currentOtp}`)

        // return res.status(200).json('Email sent and secret generated for user')

        if (emailSent)
            return res.status(200).json('Email sent and secret generated for user')
        else {
            if (!otpDocument._id) {
                // If the email failed to send and this was a new token, remove the token from the database
                await Otp.findByIdAndDelete(otpDocument._id)
            }
            return res.status(400).json('Unable to send verification email')
        }

    } catch (error) {
        console.error(error)
        return res.status(500).json('Server Error')
    }
})


/*
    http://localhost:8080/api/users/2fa-verify

    200: OTP verification successful
    400: Various errors
    500: Server Error
*/
router.route('/2fa-verify').post(async (req, res) => {
    const { email, userOtp } = req.body

    try {
        // Fetch the secret associated with the user's email from the database
        const otpDocument = await Otp.findOne({ email: email })

        if (!otpDocument)
            return res.status(400).json('OTP document not found')

        const secret = otpDocument.secret

        // Verify the generated OTP against the user's OTP
        const isValid = verifyOtp(userOtp, secret)

        if (isValid) {
            return res.status(200).json('OTP verification successful')
        } else {
            return res.status(400).json('OTP verification failed')
        }
    } catch (error) {
        console.error(error)
        return res.status(500).json('Server Error')
    }
})

/*  
    http://localhost:8080/api/users/register
 
    200: User successfully registered
    400: Various errors
    500: Server Error
    To create new user and bank account
*/
router.route('/register').post(async (req, res) => {
    // Generate random number for account number, should be unique for each user (not implemented yet)
    function generateAccNumber() {
        const randomArray = new Uint32Array(1);
        crypto.getRandomValues(randomArray);
        const randomNum = randomArray[0] % 1000000;
        const randomString = randomNum.toString().padStart(6, '0');
        const accNumber = '231' + randomString
        return accNumber;
    }

    try {
        const {
            fullName,
            dateOfBirth,
            phoneNumber,
            email,
            password,
            address_block,
            address_street,
            address_unit_floor,
            address_unit_number,
            address_postal,
            address_building
        } = req.body;

        // Check if user with the given email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json('Email already registered');
        }

        // Find the OTP document with the same email
        const otpDocument = await Otp.findOne({ email })
        if (!otpDocument) {
            return res.status(400).json('OTP not found for the given email')
        }

        if (isPasswordBreached(password))
            return res.status(400).json('Password is not secure')

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

        // create accountAmount variable with money balance objects
        const accountAmount = {
            amountMyr: 100000,
            amountSgd: 100000,
            amountUsd: 100000,
            transferLimitMyr: 1000,
            transferLimitSgd: 1000,
            transferLimitUsd: 1000
        }

        // Encrypt bank account with the keychain
        const bankEncryptionKey = keychain[0][1]
        const encryptedAccountAmount = encryptAccountAmount(bankEncryptionKey, accountAmount)

        // Encrypt the keychain using the masterKey
        encryptKeychain(privateKey, keychain)

        // Generate transactionKeypair
        const transactionKeypair = generateTransactionKeypair(privateKey)

        // Encrypt ECC (ECIES) Private Key with AES256
        const masterKey = encryptMasterKey(symmetricKey, privateKey)

        // Encrypt ECC (ECIES) Private Key with AES256 Recovery Key (For Reset Password)
        const [recoveryPrivateKey, recoveryUtil] = encryptMasterKeyRecovery(privateKey)

        // Generate symmetric key for user account details
        // const randomKeyGen = secp256k1.utils.randomPrivateKey()
        // const accSymmetricKey = forge.util.hexToBytes(sha256(randomKeyGen))
        const randomKeyGen = crypto.randomBytes(32);

        // Insert accSymmetricKey_HEX into keychain array 
        // console.log(accSymmetricKey_HEX)

        // Create a new user with the ObjectId of the found OTP document
        const newUser = new User({
            fullName,
            dateOfBirth,
            isSeniorCitizen: isSeniorCitizen(dateOfBirth),
            phoneNumber,
            email,
            password: hashedPassword,
            address_block,
            address_street,
            address_unit_floor,
            address_unit_number,
            address_postal,
            address_building,
            otp: otpDocument._id, // Use the _id of the OTP document
            pbkdfSalt: forge.util.bytesToHex(pbkdfSalt),
            masterKey,
            publicKey: forge.util.bytesToHex(publicKey),
            recoveryUtil,
            keychain,
            transactionKeypair,
            // accountKey: accSymmetricKey_HEX
        })

        // Update the isVerified field and set the createdAt to a distant future date
        const distantFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 100)  // e.g., 100 years from now
        await Otp.updateOne({ email: email },
            {
                $set: { isVerified: true, createdAt: distantFuture },
                $unset: { email: "" }
            }
        )

        // await newUser.save();

        //Create a new bank account for the newly registered user
        const accNumber = generateAccNumber();
        const newBankAccount = new BankAccount({
            accountNumber: accNumber,
            accountDetails: encryptedAccountAmount, // Encrypted value of accountAmount variable
            user: newUser._id, // Assign the new user's _id to the bank account's user field
            transactions: []
        });

        // Send email containing private key to the user.
        const emailSent = await sendEmail({
            to: email,
            subject: "DB-SEIS Registration",
            text: `Thank you for registering for an account with us. This is your private recovery key: ${recoveryPrivateKey}`
        })

        await newUser.save();

        // Save the bank account
        const savedBankAccount = await newBankAccount.save()

        // Send a success response
        res.status(200).json('User successfully registered and bank account created.');
        console.log('User successfully registered and bank account created.');
    } catch (error) {
        console.error(error)
        return res.status(500).json('Server Error')
    }
})

/*
    http://localhost:8080/api/users/verify-login-details
 
    200: User details successfully verified => sends otp email
    400: Various errors
    401: User's account frozen
    500: Server Error
*/
router.route('/verify-login-details').post(async (req, res) => {
    try {
        const { email, password } = req.body

        const user = await User.findOne({ email: email })

        if (!user)
            return res.status(400).json('User does not exist')

        else {
            // if freeze status is true and expiration has not past
            if (user.freezeStatus && user.freezeExpiration >= new Date()) {
                return res.status(401).json({ message: `User's account is frozen` })
            }

            // if freeze status is true but expiration already past
            else if (user.freezeStatus && user.freezeExpiration < new Date()) {
                user.freezeStatus = false
                user.freezeExpiration = null
                await user.save()
            }

            // Hash user password and check it against the database
            const dbPassword = user.password.slice(0, -32)
            const salt = user.password.slice(-32)
            const hashedPassword = await hashPassword(password, salt);
            if (hashedPassword !== dbPassword)
                return res.status(400).json('Wrong user details')

            // console.log(user)
            // First, check if an OTP for the given email already exists
            // let otpDocument = await Otp.findOne({ email: email })

            let otpDocument = await Otp.findOne({ _id: user.otp })

            // console.log(otpDocument)

            let secret
            if (!otpDocument) {
                return res.status(400).json('OTP does not exist for user for some weird reason')

            } else {
                // If OTP already exists, retrieve the secret
                secret = otpDocument.secret
            }

            // Generate OTP using the stored secret
            const currentOtp = generateOtp(secret)

            // --------------------------------------------------------------- Revert after debugging!!! Uncomment the lines and remove the console.log and emailSent
            // send an email with otp here
            const emailSent = await sendEmail({
                to: email,
                subject: "DB-SEIS OTP",
                text: `This is your OTP: ${currentOtp}`
            })
            console.log("Login OTP: " + currentOtp)
            // const emailSent = true

            if (emailSent)
                return res.status(200).json('Email sent')
            else
                return res.status(400).json('Unable to send verification email')

        }
    } catch (error) {
        console.error(error)
        return res.status(500).json('Server Error')
    }
})

/*
    http://localhost:8080/api/users/login-2fa-verify
 
    200: OTP verification successful => sends JWT back
    400: Various errors
    500: Server Error
*/
router.route('/login-2fa-verify').post(async (req, res) => {
    const { email, userOtp, password } = req.body

    const userAgent = req.headers['user-agent'];

    const forwarded = req.headers['x-forwarded-for'];
    const clientIP = forwarded ? forwarded.split(/, /)[0] : req.socket.remoteAddress;

    // console.log("User agent: ", userAgent)
    // console.log("Client IP: ", clientIP)

    try {
        const user = await User.findOne({ email: email })

        if (!user)
            return res.status(400).json('User does not exist')

        // Fetch the secret associated with the user's email from the database
        const otpDocument = await Otp.findOne({ _id: user.otp })

        if (!otpDocument)
            return res.status(400).json('User not found')

        // console.log(otpDocument)

        const secret = otpDocument.secret

        // Verify the generated OTP against the user's OTP
        const isValid = verifyOtp(userOtp, secret)

        if (isValid) {

            // -------------------------------- Testing Only: Decrypting the master key, and use the master key to decrypt the keychain
            var masterKey = decryptMasterKey(password, user.pbkdfSalt, user.masterKey)
            const transactionKeypair = decryptTransactionKeypair(user.transactionKeypair, masterKey)
            const bankBalanceKey = decryptKeychainEntry(user.keychain, 0, masterKey)
            console.log("Keychain 0 Key: " + bankBalanceKey)

            const jwtToken = generateToken({
                sub: user._id,
                transactionKeypair: transactionKeypair,
                bankBalanceKey: bankBalanceKey,
            })

            // To retrieve the bank account details encrypted value
            const bankAccount = await BankAccount.findOne({ user: user._id });
            const encryptedAccountDetails = bankAccount.accountDetails;

            const bankAccountDetails = decryptAccountDetails(encryptedAccountDetails, bankBalanceKey);
            let accountBlanceSGD = Number(bankAccountDetails.amountSgd)
            let accountBlanceUSD = Number(bankAccountDetails.amountUsd)
            let accountBlanceMYR = Number(bankAccountDetails.amountMyr)

            const transactionQueue = user.transactionQueueIds

            //Decryption Starts here
            const userPrivateKey = Uint8Array.from(Buffer.from(transactionKeypair[0], 'hex'))

            //logged in user public key to use to verify senders package
            const userPublicKey = Uint8Array.from(Buffer.from(transactionKeypair[1], 'hex'))

            for (let t = 0; t < transactionQueue.length; t++) {

                const transaction = await Transaction.findById(transactionQueue[t]).populate('transactionParty', 'transactionKeypair')
                const transactionAmt = await Transaction.findById(transactionQueue[t])

                // Access the populated transactionParty field
                const senderPublicKey = Uint8Array.from(Buffer.from(transaction.transactionParty.transactionKeypair[1], 'hex'));

                const sessionKey = secp256k1.getSharedSecret(userPrivateKey, senderPublicKey);
                const sessionKeyHash = crypto.createHash('sha256').update(sessionKey.toString('hex')).digest();
                const cashDigitalSig = transactionAmt.cashDigitalSignature;

                //Retrieve IV
                const iv = transactionAmt.IV
                const IV = Buffer.from(iv, 'hex')
                console.log("iv:", IV)

                // Amount + Digital signature
                const amtDigitalSig = cashDigitalSig.slice(0, -32);
                // console.log(userPrivateKey)
                // console.log(amtDigitalSig)

                //Auth Tag
                const authTagHex = cashDigitalSig.slice(-32);
                const authTag = Buffer.from(authTagHex, 'hex');
                console.log(authTag)

                //Decrypt the encrypted dateTime, amount and currency
                const decipher = crypto.createDecipheriv('aes-256-gcm', sessionKeyHash, IV);
                decipher.setAuthTag(authTag)
                let decrypt = decipher.update(amtDigitalSig, 'hex', 'utf8');
                decrypt += decipher.final('utf8');

                //amtObject has dateTime, amount, currency (deserialisation)
                const amtObject = JSON.parse(decrypt.split('_')[0]);
                //digitalSignature has digital signature (deserialisation)
                const digitalSignature = JSON.parse(decrypt.split('_')[1]);
                digitalSignature.r = BigInt(digitalSignature.r);
                digitalSignature.s = BigInt(digitalSignature.s);

                //Reforming structure of signature to check Authenticity
                const message = amtObject.dateTime.toString() + amtObject.amount.toString() + amtObject.currency.toString();
                const msgHash = sha2561.create();
                msgHash.update(amtObject.toString());
                msgHash.hex();

                //integrity check using the digital signature True: allow, False: deny (means altered)
                const isValidReceiver = secp256k1.verify(digitalSignature, msgHash.toString('hex'), senderPublicKey)

                const amount = Number(amtObject.amount);
                const currency = amtObject.currency;

                if (isValidReceiver == true) {

                    if (currency == "SGD") {

                        accountBlanceSGD += amount;

                    } else if (currency == "USD") {

                        accountBlanceUSD += amount;

                    } else if (currency == "MYR") {

                        accountBlanceMYR += amount;

                    } else {
                        console.log("currency doesnt exist");
                    }

                    
                    //AFTER ADD VALUES THAN EXECUTE THIS
                    (async () => {
                        try {
                            // Find the document by ID
                            const doc = await User.findById(user._id);

                            if (!doc) {
                                console.log('Document not found.');
                                return;
                            }

                            // Use the $pull operator to remove the item from the array
                            doc.transactionQueueIds.pull({ _id: transactionQueue[t] }); // Assuming 'arrayField' is your array field

                            // Save the updated document
                            await doc.save();
                            console.log('Item deleted from the array.');
                        } catch (error) {
                            console.error('Error:', error);
                        }
                    })();

                    //AFTER ADDING

                    // console.log(amount)
                }

                // const ivHex = transactions[i].IV;
                // const IV = Buffer.from(ivHex, 'hex')

                //Decryption starts here
            }


            bankAccountDetails.amountSgd = accountBlanceSGD
            bankAccountDetails.amountUsd = accountBlanceUSD
            bankAccountDetails.amountMyr = accountBlanceMYR

            const hashedAccountAmount = encryptAccountAmount(bankBalanceKey, bankAccountDetails)
            bankAccount.accountDetails = hashedAccountAmount
            await bankAccount.save()

            // store the jwt as sort of like a "session"
            user.jwt = jwtToken
            await user.save()

            await sendEmail({
                to: email,
                subject: "DB-SEIS Login",
                text: `You have logged in on ${new Date(Date.now()).toLocaleString()} from the following IP ${clientIP}`
            })

            const log = await createLog(user._id, `Login ${clientIP} ${userAgent}`)
            await log.save()

            await addLog(log)

            res.cookie('jwtToken', jwtToken, {
                httpOnly: true, // Makes the cookie inaccessible to JavaScript
                secure: true, // HTTPS
                maxAge: 15 * 60 * 1000,
                sameSite: 'strict' // Provides CSRF protection
            });

            return res.status(200).json("Authentication successful")
        } else {
            return res.status(400).json('OTP verification failed')
        }
    } catch (error) {
        console.error(error)
        return res.status(500).json('Server Error')
    }
})

/*
    http://localhost:8080/api/users/send-email-forget-password
 
    200: Sends email with link to reset password
    400: Various errors
    500: Server Error
*/
router.route('/send-email-forget-password').post(async (req, res) => {
    try {
        const { email } = req.body

        const user = await User.findOne({ email: email })

        if (!user)
            return res.status(400).json("User with this email address does not exist")

        // Check if a token already exists for the given email
        const tokenExists = await Token.findOne({ email: email })

        if (tokenExists) {
            // If the forget password token for an email address already exists (or otherwise pending verification)
            return res.status(400).json("A forget password email is already pending for this email address")
        }

        // Create a verification token
        const value = crypto.randomBytes(16).toString('hex')

        const newToken = new Token({
            email: email,
            value: value
        })

        const token = await newToken.save()

        if (!token)
            return res.status(400).json("Unable to generate forget password email token")

        else {
            const currentDate = new Date()

            // Add the current date at the beginning of the array
            user.passwordResetWindow.unshift(currentDate);

            // Ensure the array doesn't exceed a length of 3
            if (user.passwordResetWindow.length > 3)
                user.passwordResetWindow.length = 3; // This will keep the first three elements and remove the rest

            await user.save()

            // if 3 password resets in the span of a minute, freeze account for 30 mins
            if (inSpanOfOneMinute(user.passwordResetWindow)) {
                user.freezeStatus = true
                // user.freezeExpiration = new Date(Date.now() + 30 * 60 * 1000)
                await user.save()

                return res.status(400).json('You have tried to reset your password too many times')
            }


            const forgetPasswordLink = `${process.env.BASE_URL}/api/users/verify-forget-password?token=${value}`

            // -------------------------------- Revert after debugging!!! Uncomment the lines and remove the console.log and emailSent
            const emailSent = await sendEmail({
                to: email,
                subject: "DB-SEIS Forget Password",
                text: `Please click the following link to reset your password: ${forgetPasswordLink}`
            })
            console.log("Forget Password Link: " + forgetPasswordLink)
            // const emailSent = true

            if (emailSent)
                return res.status(200).json({ message: 'Forget password email sent' })
            else {
                // If the email failed to send, remove the token from the database
                await Token.findByIdAndDelete(token._id)
                return res.status(400).json('Unable to send forget password email')
            }
        }
    } catch (error) {
        console.error(error)
        return res.status(500).json('Server Error')
    }
})


/*
    http://localhost:8080/api/users/forget-password-send-2fa
 
    200: Token verified
    400: Various errors
    500: Server Error
*/
router.route('/forget-password-send-2fa').post(async (req, res) => {
    try {
        const { email } = req.body

        const user = await User.findOne({ email: email })

        if (!user)
            return res.status(400).json('User does not exist')

        else {
            let otpDocument = await Otp.findOne({ _id: user.otp })

            let secret
            if (!otpDocument) {
                return res.status(400).json('OTP does not exist for user for some weird reason')

            } else {
                // If OTP already exists, retrieve the secret
                secret = otpDocument.secret
            }

            // Generate OTP using the stored secret
            const currentOtp = generateOtp(secret)

            // -------------------------------- Revert after debugging!!! Uncomment the lines and remove the console.log and emailSent
            // send an email with otp here
            const emailSent = await sendEmail({
                to: email,
                subject: "DB-SEIS OTP",
                text: `This is your OTP: ${currentOtp}`
            })
            console.log("Forget Password OTP: " + currentOtp)
            // const emailSent = true

            if (emailSent)
                return res.status(200).json('Email sent')
            else
                return res.status(400).json('Unable to send verification email')
        }
    } catch (error) {
        console.error(error)
        return res.status(500).json('Server Error')
    }
})

/*
    http://localhost:8080/api/users/verify-forget-password
 
    303: Forget password email verified => redirects client
    500: Server Error
*/
router.route('/verify-forget-password').get(async (req, res) => {
    try {
        const { token } = req.query

        // Find the forget password token in the database
        const foundToken = await Token.findOne({ value: token })

        if (!foundToken) {
            res.status(303).redirect(`${process.env.FRONTEND_URL}/forget-password-email-verification-result?result=false`)
            return
        }

        await Token.findByIdAndDelete(foundToken._id)

        // Emit a 'forget-password-verified' event to the corresponding email's socket room
        const io = socketHandler.getIo()
        io.to(`forget-password-${foundToken.email}`).emit('forget-password-email-verified', { email: foundToken.email })

        res.status(303).redirect(`${process.env.FRONTEND_URL}/forget-password-email-verification-result?result=true`)
        return
    } catch (error) {
        console.error(error)
        return res.status(500).json('Server Error')
    }
})

/*
    http://localhost:8080/api/users/forget-password-2fa-verify
 
    200: OTP verification successful
    400: Various errors
    500: Server Error
*/
router.route('/forget-password-2fa-verify').post(async (req, res) => {
    const { email, userOtp } = req.body

    try {
        const user = await User.findOne({ email: email })

        if (!user)
            return res.status(400).json('User does not exist')

        // Fetch the secret associated with the user's email from the database
        const otpDocument = await Otp.findOne({ _id: user.otp })

        if (!otpDocument)
            return res.status(400).json('User not found')

        const secret = otpDocument.secret

        // Verify the generated OTP against the user's OTP
        const isValid = verifyOtp(userOtp, secret)

        if (isValid) {
            return res.status(200).json('OTP is valid')
        } else {
            return res.status(400).json('OTP verification failed')
        }
    } catch (error) {
        console.error(error)
        return res.status(500).json('Server Error')
    }
})

/*
    http://localhost:8080/api/users/reset-password
 
    200: User's password is successfully reset
    400: Various errors
    500: Server Error
*/
router.route('/reset-password').post(async (req, res) => {
    const { email, password, confirmPassword, privateRecoveryKey } = req.body

    const userAgent = req.headers['user-agent'];

    const forwarded = req.headers['x-forwarded-for'];
    const clientIP = forwarded ? forwarded.split(/, /)[0] : req.socket.remoteAddress;

    // privateRecoveryKey = user's recovery key inputted in the reset password form

    try {
        const user = await User.findOne({ email: email })

        if (!user)
            return res.status(400).json('User does not exist')

        // password stuff here
        if (password !== confirmPassword)
            return res.status(400).json('Passwords do not match')

        if (isPasswordBreached(password))
            return res.status(400).json('Password is not secure!')

        // Generate new IV for security and hash the new password
        const newSalt = crypto.randomBytes(16).toString('hex')
        const newHashedPassword = await hashPassword(password, newSalt) + newSalt

        // Generate new AES256 Keys using PBKDF2 for user
        const pbkdfSalt = forge.random.getBytesSync(16)
        const symmetricKey = forge.pkcs5.pbkdf2(password, pbkdfSalt, 600000, 32)

        // Decrypt the master key using recovery key, and re-encrypt it using the new password
        const masterKey = decryptMasterKeyRecovery(privateRecoveryKey, user.recoveryUtil[0], user.recoveryUtil[1])
        const encryptedMasterKey = encryptMasterKey(symmetricKey, forge.util.hexToBytes(masterKey))

        // Generate new recovery private and public keys for the user
        const [recoveryPrivateKey, recoveryUtil] = encryptMasterKeyRecovery(forge.util.hexToBytes(masterKey))

        user.password = newHashedPassword
        user.pbkdfSalt = forge.util.bytesToHex(pbkdfSalt)
        user.masterKey = encryptedMasterKey
        user.recoveryUtil = recoveryUtil

        const emailSent = await sendEmail({
            to: email,
            subject: "DB-SEIS Reset Password",
            text: `You have just reset your password. This is your new private recovery key: ${recoveryPrivateKey}`
        })

        await user.save()

        const log = await createLog(user._id, `Password Reset ${clientIP} ${userAgent}`)
        await log.save()

        await addLog(log)

        return res.status(200).json('Password has been reset!')

    } catch (error) {
        console.error(error)
        return res.status(500).json('Password reset failed. Please try again later.')
    }
})

/*
    http://localhost:8080/api/users/freeze-account
 
    200: User's account frozen
    500: Server Error
*/
router.route('/freeze-account').post(async (req, res) => {
    const { email } = req.body

    try {
        const user = await User.findOne({ email })

        if (!user) {
            return res.status(400).json('User not found')
        }

        user.freezeStatus = true
        user.freezeExpiration = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
        await user.save()

        return res.status(200).json("User's account froze")
    } catch (error) {
        console.error(error)
        res.status(500).json('Server Error')
    }
})

/*
    http://localhost:8080/api/users/logout
 
    200: User log out and clears cookie
    500: Server Error
*/
router.route('/logout').post(jwtValidationMiddleware, async (req, res) => {
    const userId = req.user.sub

    try {
        const user = await User.findOne({ _id: userId })

        if (!user) {
            return res.status(400).json('User not found')
        }

        user.jwt = ""
        await user.save()

        res.clearCookie('jwtToken', {
            expires: new Date(0)
        })

        return res.status(200).json("User logged out")
    } catch (error) {
        console.error(error)
        res.status(500).json('Server Error')
    }
})

module.exports = router