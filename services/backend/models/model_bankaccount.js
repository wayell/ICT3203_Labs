// import mongoose library
const mongoose = require('mongoose')

// define the bank account schema
// objectId is to link the bank account to the user

const BankAccountSchema = new mongoose.Schema({
    accountNumber: Number,
    accountDetails: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }]
})


// const BankAccountSchema = new mongoose.Schema({
//     accountNumber: Number,
//     amountUsd: Number,
//     amountMyr: Number,
//     amountSgd: Number,
//     transferLimitUsd: Number,
//     transferLimitMyr: Number,
//     transferLimitSgd: Number,
//     user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
//     transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }]
// })

// create the bank account  model, with the schema named BankAccountSchema, and collection named bankaccounts in db
const BankAccount = mongoose.model('BankAccount', BankAccountSchema, 'bankaccounts')
module.exports = { BankAccountSchema, BankAccount }

