const fs = require('fs');
const path = require('path');

const forge = require('node-forge')

//cryptographic libraries
const sha256 = require('js-sha256');
const secp256k1 = require('@noble/curves/secp256k1').secp256k1;
const crypto = require('crypto');

const isSeniorCitizen = (dateString) => {
    // Parse the input date
    const inputDate = new Date(dateString)

    // Get the current date
    const currentDate = new Date()

    // Calculate the difference in years
    let yearDifference = currentDate.getFullYear() - inputDate.getFullYear()

    // Check the months to make the comparison more accurate
    const monthDifference = currentDate.getMonth() - inputDate.getMonth()

    // If the current month is before the birth month, subtract one year from the age
    if (monthDifference < 0 || (monthDifference === 0 && currentDate.getDate() < inputDate.getDate())) {
        yearDifference--
    }

    // Calculate the total months difference
    const totalMonthsDifference = (yearDifference * 12) + monthDifference

    // Check if the total months difference is greater than or equal to 59 years and 11 months (719 months)
    return totalMonthsDifference >= 719
}

const inSpanOfOneMinute = (array) => {
    const firstDate = array[0]
    const lastDate = array[2]

    if (firstDate && lastDate) {
        const differenceInMillis = firstDate - lastDate
        const differenceInMinutes = differenceInMillis / (1000 * 60)

        // Check if the first date is greater than the last date
        // and if the difference in minutes is less than or equal to one
        if (differenceInMinutes >= 0 && differenceInMinutes <= 1) {
            return true
        }
    }

    return false
}

const isPasswordBreached = (password) => {
    try {
        // Define the path to the file
        const filePath = path.join(__dirname, '..', 'breached_passwords.txt');

        // Read the file content
        const fileContent = fs.readFileSync(filePath, 'utf-8')

        // Split the content by lines
        const passwords = fileContent.split('\n').map(line => line.trim());

        // Check if the password exists in the array of passwords
        return passwords.includes(password)

    } catch (error) {
        console.error(error)
        return false
    }
}

// Function to encrypt bank account
function encryptAccountAmount(key, bankAccount) {

    const accountAmountString = JSON.stringify(bankAccount)
    const iv = forge.random.getBytesSync(12)

    // Encrypt accountAmount with AES256
    let cipher = forge.cipher.createCipher('AES-GCM', forge.util.hexToBytes(key))
    cipher.start({
        iv: iv,
        tagLength: 128
    });
    cipher.update(forge.util.createBuffer(accountAmountString));
    cipher.finish();
    const hashedAccountAmount = cipher.output.toHex() + cipher.mode.tag.toHex() + forge.util.bytesToHex(iv)

    return hashedAccountAmount
}

// Function to hash password using Scrypt
async function hashPassword(password, salt) {
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, 32, (err, derivedKey) => {
            if (err) {
                reject(err);
            } else {
                resolve(derivedKey.toString('hex'))
            }
        })
    })
}

// Function to generate keychain for the user
function createKeychain(numOfKeys) {
    let keychain = []
    for (let i = 0; i < numOfKeys; i++) {

        // IV used to encrypt the Key
        const keyEncryptionIV = forge.util.bytesToHex(forge.random.getBytesSync(16))

        // The AES256 encryption key
        const key = forge.util.bytesToHex(forge.random.getBytesSync(16))
        keychain.push(new Array(keyEncryptionIV, key))
    }
    return keychain
}

// Function to encrypt the Key-IV pair of each entry within the keychain
function encryptKeychain(privateKey, keychain) {

    let i = 0
    while (i < keychain.length) {

        const ephemeralPublicKey = secp256k1.getPublicKey(secp256k1.utils.randomPrivateKey())
        const sharedSecret = forge.util.hexToBytes(sha256(secp256k1.getSharedSecret(privateKey, ephemeralPublicKey)))

        let cipher = forge.cipher.createCipher('AES-GCM', sharedSecret)
        cipher.start({
            iv: forge.util.hexToBytes(keychain[i][0]),
            tagLength: 128
        })
        cipher.update(forge.util.createBuffer(keychain[i][1]))
        cipher.finish()
        keychain[i][1] = cipher.output.toHex() + cipher.mode.tag.toHex() + forge.util.bytesToHex(ephemeralPublicKey)
        i++
    }
}

// Function to generate transaction keypair and encrypt them using the Master Key
function generateTransactionKeypair(privateKey) {

    const ephemeralPublicKey = secp256k1.getPublicKey(secp256k1.utils.randomPrivateKey())
    const sharedSecret = forge.util.hexToBytes(sha256(secp256k1.getSharedSecret(privateKey, ephemeralPublicKey)))

    const priv = secp256k1.utils.randomPrivateKey()
    const pub = forge.util.bytesToHex(secp256k1.getPublicKey(priv))
    const iv = forge.random.getBytesSync(12)

    let cipher = forge.cipher.createCipher('AES-GCM', sharedSecret)

    cipher.start({
        iv: iv,
        tagLength: 128
    })
    cipher.update(forge.util.createBuffer(priv))
    cipher.finish()
    const encryptedPriv = cipher.output.toHex() + cipher.mode.tag.toHex() + forge.util.bytesToHex(iv) + forge.util.bytesToHex(ephemeralPublicKey)

    const transactionKeypair = new Array(encryptedPriv, pub)
    return transactionKeypair
}

// Function encrypt the master key for the user
function encryptMasterKey(symmetricKey, privateKey) {

    const masterIV = forge.random.getBytesSync(12)
    cipher = forge.cipher.createCipher('AES-GCM', symmetricKey)
    cipher.start({
        iv: masterIV,
        tagLength: 128
    });
    cipher.update(forge.util.createBuffer(privateKey));
    cipher.finish();
    const masterKey = cipher.output.toHex() + cipher.mode.tag.toHex() + forge.util.bytesToHex(masterIV)
    return masterKey
}

// Function to decrypt the master key for the user
function decryptMasterKey(password, pbkdfSalt, masterKey) {

    pbkdfSalt = forge.util.hexToBytes(pbkdfSalt)
    const symmetricKey = forge.pkcs5.pbkdf2(password, pbkdfSalt, 600000, 32)
    const masterIV = forge.util.hexToBytes(masterKey.slice(-24))
    const tag = forge.util.hexToBytes(masterKey.slice(-56, -24))
    const content = forge.util.hexToBytes(masterKey.slice(0, -56))

    let decipher = forge.cipher.createDecipher('AES-GCM', symmetricKey)
    decipher.start({
        iv: masterIV,
        tagLength: 128,
        tag: tag
    })
    decipher.update(forge.util.createBuffer(content))
    const pass = decipher.finish()

    // pass is false if there was a failure (eg: authentication tag didn't match)
    if (pass) {
        return decipher.output.toHex()
    }
    else {
        console.log("Master Key Decryption Failed")
    }
}

// Function to decrypt an entry in the keychain
function decryptKeychainEntry(keychain, entryNum, masterKey) {

    masterKey = Uint8Array.from(Buffer.from(masterKey, 'hex'))
    const content = forge.util.hexToBytes(keychain[entryNum][1].slice(0, -98))
    const tag = forge.util.hexToBytes(keychain[entryNum][1].slice(-98, -66))
    const iv = forge.util.hexToBytes(keychain[entryNum][0])
    const ephemeralPublicKey = Uint8Array.from(Buffer.from(keychain[entryNum][1].slice(-66), 'hex'))

    const sharedSecret = forge.util.hexToBytes(sha256(secp256k1.getSharedSecret(masterKey, ephemeralPublicKey)))

    let decipher = forge.cipher.createDecipher('AES-GCM', sharedSecret)
    decipher.start({
        iv: iv,
        tagLength: 128,
        tag: tag
    })
    decipher.update(forge.util.createBuffer(content))
    const pass = decipher.finish()

    // pass is false if there was a failure (eg: authentication tag didn't match)
    if (pass) {
        return decipher.output.toString()
    }
    else {
        console.log("Key Chain Decryption Failed")
    }
}

function decryptTransactionKeypair(keypair, masterKey) {

    masterKey = Uint8Array.from(Buffer.from(masterKey, 'hex'))

    const content = forge.util.hexToBytes(keypair[0].slice(0, -122))
    const tag = forge.util.hexToBytes(keypair[0].slice(-122, -90))
    const iv = forge.util.hexToBytes(keypair[0].slice(-90, -66))
    const ephemeralPublicKey = Uint8Array.from(Buffer.from(keypair[0].slice(-66), 'hex'))

    const sharedSecret = forge.util.hexToBytes(sha256(secp256k1.getSharedSecret(masterKey, ephemeralPublicKey)))

    let decipher = forge.cipher.createDecipher('AES-GCM', sharedSecret)
    decipher.start({
        iv: iv,
        tagLength: 128,
        tag: tag
    })
    decipher.update(forge.util.createBuffer(content))
    const pass = decipher.finish()

    // pass is false if there was a failure (eg: authentication tag didn't match)
    if (pass) {
        return [decipher.output.toHex(), keypair[1]]
    }
    else {
        console.log("Transaction Keypair Decryption Failed")
    }
}
// Encrypt ECC (ECIES) Private Key with AES256 Recovery Key (For Reset Password)
function encryptMasterKeyRecovery(masterKey) {

    const recoveryPublicKey = secp256k1.getPublicKey(secp256k1.utils.randomPrivateKey())
    const recoveryPrivateKey = secp256k1.utils.randomPrivateKey()
    const tempAESKey = forge.util.hexToBytes(sha256(secp256k1.getSharedSecret(recoveryPrivateKey, recoveryPublicKey)))
    const tempAESIV = forge.random.getBytesSync(12)
    cipher = forge.cipher.createCipher('AES-GCM', tempAESKey)
    cipher.start({
        iv: tempAESIV,
        tagLength: 128
    });
    cipher.update(forge.util.createBuffer(masterKey));
    cipher.finish();
    const recoveryMasterKey = cipher.output.toHex() + cipher.mode.tag.toHex() + forge.util.bytesToHex(tempAESIV)

    return [forge.util.bytesToHex(recoveryPrivateKey), [forge.util.bytesToHex(recoveryPublicKey), recoveryMasterKey]]
}

// Function to decrypt the masterKey using the recovery key sent to the user upon registration
function decryptMasterKeyRecovery(privateKey, publicKey, masterKey) {

    const encryptedMasterKeyContent = forge.util.hexToBytes(masterKey.slice(0, -56))
    const encryptedMasterKeyTag = forge.util.hexToBytes(masterKey.slice(-56, -24))
    const encryptedMasterKeyIV = forge.util.hexToBytes(masterKey.slice(-24))

    privateKey = Uint8Array.from(Buffer.from(privateKey, 'hex'))
    publicKey = Uint8Array.from(Buffer.from(publicKey, 'hex'))

    const tempAESKey = forge.util.hexToBytes(sha256(secp256k1.getSharedSecret(privateKey, publicKey)))
    let decipher = forge.cipher.createDecipher('AES-GCM', tempAESKey)
    decipher.start({
        iv: encryptedMasterKeyIV,
        tagLength: 128,
        tag: encryptedMasterKeyTag
    });
    decipher.update(forge.util.createBuffer(encryptedMasterKeyContent))
    const pass = decipher.finish()

    if (pass)
        return decipher.output.toHex()
    else
        throw new Error("Decryption of recovery master key failed")
}

function decryptAccountDetails(encryptedAccountAmount, symmetricKey) {

    const accSymmetricKey_BYTES = forge.util.hexToBytes(symmetricKey)
  
    // Decrypt accountAmount with AES256
    const encryptedDetailTag_HEX = encryptedAccountAmount.slice(-56, -24)
    const encryptedData_Hex = encryptedAccountAmount.slice(0, -56)
    const encryptedDataIV_Hex = encryptedAccountAmount.slice(-24)
  
    const encryptedDetailTag_BYTES = forge.util.hexToBytes(encryptedDetailTag_HEX)
    const encryptedData_BYTES = forge.util.hexToBytes(encryptedData_Hex)
    const encryptedDataIV_BYTES = forge.util.hexToBytes(encryptedDataIV_Hex)
  
    let decipher = forge.cipher.createDecipher('AES-GCM', accSymmetricKey_BYTES)
    decipher.start({
      iv: encryptedDataIV_BYTES,
      tagLength: 128,
      tag: encryptedDetailTag_BYTES
    })
    decipher.update(forge.util.createBuffer(encryptedData_BYTES))
    const pass = decipher.finish()
  
    // pass is false if there was a failure (eg: authentication tag didn't match)
    if (pass) {
      const decryptedAccountAmount = JSON.parse(decipher.output.toString())
      return decryptedAccountAmount
    }
    else {
      console.log("Bank Account Details Encryption Failed")
    }
  }
  
  // Decrypt bank account, update bank account values, and re-encrypt
  function updateBankAccount(encryptedAccountAmount, symmetricKey, currency, sendValue) {
  
    try {
      const accSymmetricKey_BYTES = forge.util.hexToBytes(symmetricKey)
      const accSymmetricIV_BYTES = forge.random.getBytesSync(12)
  
      // Decrypt accountAmount with AES256
      const decryptedAccountAmount = decryptAccountDetails(encryptedAccountAmount, symmetricKey)
  
      // Update accountAmount
      // Avoid floating point error, convert dollars to cents
      const amountInCents = Math.round(sendValue * 100)
      const sendBalanceInCents = Math.round(decryptedAccountAmount[currency] * 100)
      const updatedSenderAmount = sendBalanceInCents - amountInCents
      decryptedAccountAmount[currency] = updatedSenderAmount / 100
  
      const accountAmountString = JSON.stringify(decryptedAccountAmount)
  
      // Re-encrypt accountAmount with AES256
      let cipher = forge.cipher.createCipher('AES-GCM', accSymmetricKey_BYTES)
      cipher.start({
        iv: accSymmetricIV_BYTES,
        tagLength: 128
      });
      cipher.update(forge.util.createBuffer(accountAmountString));
      cipher.finish();
      const newEncryptedAccountAmount = cipher.output.toHex() + cipher.mode.tag.toHex() + forge.util.bytesToHex(accSymmetricIV_BYTES)
  
      return newEncryptedAccountAmount
  
    }
    catch (error) {
      console.error(error)
    }
  }
  
  // Decrypt bank account, update bank account limit, and re-encrypt
  function updateBankAccountLimit(encryptedAccountAmount, symmetricKey, newSgd, newMyr, newUsd) {
  
    try {
  
      const accSymmetricKey_BYTES = forge.util.hexToBytes(symmetricKey)
      const accSymmetricIV_BYTES = forge.random.getBytesSync(12)
  
      // Decrypt accountAmount with AES256
      const decryptedAccountAmount = decryptAccountDetails(encryptedAccountAmount, symmetricKey)
  
      // Update accountAmount
      // Avoid floating point error, convert dollars to cents
      decryptedAccountAmount.transferLimitSgd = newSgd
      decryptedAccountAmount.transferLimitMyr = newMyr
      decryptedAccountAmount.transferLimitUsd = newUsd
  
      const accountAmountString = JSON.stringify(decryptedAccountAmount)
  
      // Re-encrypt accountAmount with AES256
      let cipher = forge.cipher.createCipher('AES-GCM', accSymmetricKey_BYTES)
      cipher.start({
        iv: accSymmetricIV_BYTES,
        tagLength: 128
      });
      cipher.update(forge.util.createBuffer(accountAmountString));
      cipher.finish();
      const newEncryptedAccountAmount = cipher.output.toHex() + cipher.mode.tag.toHex() + forge.util.bytesToHex(accSymmetricIV_BYTES)
  
      return newEncryptedAccountAmount
  
    }
    catch (error) {
      console.error(error)
    }
  }

module.exports = { isSeniorCitizen, inSpanOfOneMinute, isPasswordBreached, 
    encryptAccountAmount, hashPassword, createKeychain, encryptKeychain, 
    generateTransactionKeypair, encryptMasterKey, decryptMasterKey, 
    decryptKeychainEntry, decryptTransactionKeypair, encryptMasterKeyRecovery, 
    decryptMasterKeyRecovery, decryptAccountDetails, updateBankAccount, 
    updateBankAccountLimit }