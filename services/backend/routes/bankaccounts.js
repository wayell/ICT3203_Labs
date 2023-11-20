const express = require('express')
const router = express.Router()

// const forge = require('node-forge')
// const sha256 = require('sha256')

const { BankAccount } = require('../models/model_bankaccount')
// const { User } = require('../models/model_user')

const jwtValidationMiddleware = require('./middleware')
const { decryptAccountDetails } = require('../services/user_handler')

// http://localhost:8080/api/bankaccounts
// router.route('/').get(async (req, res) => {
//     try {
//         const bankaccounts = await BankAccount.find()
//             .populate({
//                 path: 'user'
//             });
//         res.json(bankaccounts);
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Server Error');
//     }
// });

/// http://localhost:8080/api/bankaccounts/account
router.route('/account').post(jwtValidationMiddleware, async (req, res) => {
    try {
        const bankAccount = await BankAccount.findOne({ user: req.user.sub })

        if (!bankAccount) {
            return res.status(404).json({ msg: 'Bank account not found' })
        }

        const bankBalanceKey = req.user.bankBalanceKey
        const accountDetails = bankAccount.accountDetails
        const bankAccountDetails = decryptAccountDetails(accountDetails, bankBalanceKey)

        const decryptedBankAccount = {
            accountNumber: bankAccount.accountNumber,
            amountSgd: bankAccountDetails.amountSgd,
            amountUsd: bankAccountDetails.amountUsd,
            amountMyr: bankAccountDetails.amountMyr
        }


        // const accountKey = bankAccount.accountKey;
        // console.log(users)

        // const decryptedAccountDetails = decryptAccountDetails(hashedAccountAmount);

        res.json(decryptedBankAccount)
    } catch (error) {
        console.error(error)
        res.status(500).json('Server Error')
    }
})

module.exports = router;