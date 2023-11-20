const mongoose = require("mongoose");

function arrayLimit(val) {
  return val.length <= 3;
}

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  dateOfBirth: { type: Date },
  isSeniorCitizen: { type: Boolean },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  passwordResetWindow: {
    type: [{ type: Date }],
    validate: [arrayLimit, '{PATH} exceeds the limit of 3 entries'],
    default: [null, null, null]
  },
  address_block: String,
  address_street: { type: String, required: true },
  address_unit_floor: String,
  address_unit_number: String,
  address_postal: { type: String, required: true },
  address_building: String,
  freezeStatus: { type: Boolean, default: false },
  freezeExpiration: { type: Date },
  dateOfCreation: { type: Date, default: Date.now },
  otp: { type: mongoose.Schema.Types.ObjectId, ref: 'Otp', required: true },
  pbkdfSalt: { type: String, required: true },
  masterKey: { type: String, required: true },
  publicKey: { type: String, required: true },
  recoveryUtil: { type: Array, required: true },
  keychain: { type: Array, required: true },
  transactionKeypair: { type: Array, required: true },
  transactionIds: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  ], // Adding reference to transactions
  transactionQueueIds: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  ],
  jwt: { type: String }
})

const User = mongoose.model("User", UserSchema, "users");

module.exports = { UserSchema, User };
