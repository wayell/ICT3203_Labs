const mongoose = require('mongoose')

const TransactionSchema = new mongoose.Schema({
    //cashDigitalSignature: contains amount sent + currency & digital signature
   // IV: stores the initialisation vector of the AES GCM
    dateTime: Date,
    transactionParty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' 
      },
    type: String,
    cashDigitalSignature: String,
    IV: String
    //transaction: String
    
})

const Transaction = mongoose.model('Transaction', TransactionSchema, 'transactions')

module.exports = { TransactionSchema, Transaction }