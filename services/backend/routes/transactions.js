//1 Document per transaction, but array of transaction ObjectIds in the USER document (Change user model and add transaction array to it)
const express = require("express");
const router = express.Router();
const jwtValidationMiddleware = require("./middleware");

const sha256 = require('js-sha256')
const secp256k1 = require('@noble/curves/secp256k1').secp256k1
const crypto = require('crypto');

const { Transaction } = require("../models/model_transaction");
const { User } = require("../models/model_user");
const { BankAccount } = require("../models/model_bankaccount");

const { createLog } = require('../services/database_handler')
const { sendEmail } = require('../services/email_handler')

const { encryptAccountAmount, decryptAccountDetails, updateBankAccount,
  updateBankAccountLimit } = require('../services/user_handler')

const { addLog } = require('../services/log_handler')

// Update receiver's balance
// http://localhost:8080/api/transactions/update-receiver-balance
router
  .route("/update-receiver-balance")
  .post(jwtValidationMiddleware, async (req, res) => {
    try {
      const userId = req.user.sub; // get user ID from the token
      const bankBalanceKey = req.user.bankBalanceKey
      const transactionKeypair = req.user.transactionKeypair

      // Find the user and get their transaction IDs
      const user = await User.findById(userId);

      // To retrieve the bank account details encrypted value
      const bankAccount = await BankAccount.findOne({ user: user._id });
      const encryptedAccountDetails = bankAccount.accountDetails;

      const bankAccountDetails = decryptAccountDetails(encryptedAccountDetails, bankBalanceKey);
      let accountBlanceSGD = bankAccountDetails.amountSgd
      let accountBlanceUSD = bankAccountDetails.amountUsd
      let accountBlanceMYR = bankAccountDetails.amountMyr

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
        const msgHash = sha256.create();
        msgHash.update(amtObject.toString());
        msgHash.hex();

        //integrity check using the digital signature True: allow, False: deny (means altered)
        const isValidReceiver = secp256k1.verify(digitalSignature, msgHash.toString('hex'), senderPublicKey)

        const amount = amtObject.amount;
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

      res.json("Balance updated");

    } catch (error) {
      console.error(error);
      res.status(500).send("Server Error");
    }
  });


// Get specific period of transactions
//http://localhost:8080/api/transactions/by-date-range?startDate=2023-9-1&endDate=2023-9-31
router
  .route("/by-date-range")
  .post(jwtValidationMiddleware, async (req, res) => {
    const { startDate, endDate } = req.query;
    try {


      const userId = req.user.sub; // get user ID from the token
      const transactionKeypair = req.user.transactionKeypair

      // Find the user and get their transaction IDs
      const user = await User.findById(userId);
      const transactionIds = user.transactionIds;

      let transactionName = null
      for (let x = 0; x < transactionIds.length; x++) {

        const transactionpartyID = await Transaction.findById(transactionIds[x])




      }


      const endDateObject = new Date(endDate);
      endDateObject.setHours(23, 59, 59, 999);
      // Find transactions that match the IDs and are within the date range
      const transactions = await Transaction.find({
        _id: { $in: transactionIds },
        dateTime: {
          $gte: new Date(startDate),
          $lte: endDateObject,
        },
      }).populate('transactionParty', 'fullName');


      let transactionsToReturn = []


      //logged in user private key
      const userPrivateKey = Uint8Array.from(Buffer.from(transactionKeypair[0], 'hex'))
      //logged in user public key to use to verify senders package
      const userPublicKey = Uint8Array.from(Buffer.from(transactionKeypair[1], 'hex'))



      for (let i = 0; i < transactions.length; i++) {
        //Retrieving other parties public key
        const sendersAccount = await User.findById(transactions[i].transactionParty);
        const senderPublic = Uint8Array.from(Buffer.from(sendersAccount.transactionKeypair[1], 'hex'))


        //logged in user public key to use to verify senders package
        const userPublicKey = Uint8Array.from(Buffer.from(transactionKeypair[1], 'hex'))

        //preshared key between 2 parties using ECCDH
        const sessionKey = secp256k1.getSharedSecret(userPrivateKey, senderPublic);
        const sessionKeyHash = crypto.createHash('sha256').update(sessionKey.toString('hex')).digest();

        //Retrieve IV
        const ivHex = transactions[i].IV;
        const IV = Buffer.from(ivHex, 'hex')

        //Retrieve amount concatenated with the digital signature and concatenated Auth Tag
        const amtAuth = transactions[i].cashDigitalSignature;

        //Digital signature
        const amtDigitalSig = amtAuth.slice(0, -32);

        //Auth Tag
        const authTagHex = amtAuth.slice(-32);
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
        const msgHash = sha256.create();
        msgHash.update(amtObject.toString());
        msgHash.hex();

        //integrity check using the digital signature True: allow, False: deny (means altered)
        const isValidReceiver = secp256k1.verify(digitalSignature, msgHash.toString('hex'), senderPublic)




        //logged in user who sent the package digital signature
        const isValidUser = secp256k1.verify(digitalSignature, msgHash.toString('hex'), userPublicKey)
        const amount = amtObject.amount;
        const currency = amtObject.currency;
        const transactionType = transactions[i].type



        if (isValidReceiver == true && transactionType === "receive") {
          // const dateTime = amtObject.dateTime;
          // const amount = amtObject.amount;
          // const currency = amtObject.currency;

          // console.log(dateTime, amount, currency);

          transactionsToReturn.push({
            dateTime: transactions[i].dateTime,
            transactionParty: transactions[i].transactionParty.fullName,
            type: transactions[i].type,
            amount: amount,
            currency: currency
          })
        }


        else if (isValidUser == true && transactionType === "send") {

          transactionsToReturn.push({
            dateTime: transactions[i].dateTime,
            transactionParty: transactions[i].transactionParty.fullName,
            type: transactions[i].type,
            amount: amount,
            currency: currency
          })


        }

        else if (isValidReceiver == false && transactionType === "receive" || isValidUser == false && transactionType === "send") {

          console.log("File has been tampered");

        }



      }

      res.json(transactionsToReturn);
      //Sender Decryption
      // for (let i = 0; i < transactions.length; i++) {

      //   //logged in user private key
      //   const stringSenderprivateKey = user.transaction_privateKey;
      //   const listSenderPrivateKey = stringSenderprivateKey.split(',').map(Number);
      //   const senderPrivateKey = new Uint8Array(listSenderPrivateKey);

      //   //logged in user public key
      //   const stringSenderPublicKey = user.transaction_publicKey;
      //   const listSenderPublicKey = stringSenderPublicKey.split(',').map(Number);
      //   const senderPublicKey = new Uint8Array(listSenderPublicKey);


      //   //Person receiving the amount public key
      //   const receiverAccount = await User.findById(transactions[i].transactionParty);
      //   const receiverpublicKey = receiverAccount.transaction_publicKey
      //   const listReceiverPublic = receiverpublicKey.split(',').map(Number);
      //   const receiverPublic = new Uint8Array(listReceiverPublic);

      //   const sessionKey = secp256k1.getSharedSecret(senderPrivateKey, receiverPublic);
      //   const sessionKeyHash = crypto.createHash('sha256').update(sessionKey.toString('hex')).digest();

      //   const ivHex = transactions[i].IV;
      //   const IV = Buffer.from(ivHex, 'hex')
      //   const amtAuth = transactions[i].cashDigitalSignature;
      //   const amtDigitalSig = amtAuth.slice(0, -32);
      //   const authTagHex = amtAuth.slice(-32);
      //   const authTag = Buffer.from(authTagHex, 'hex');


      //   const decipherSender = crypto.createDecipheriv('aes-256-gcm', sessionKeyHash, IV);
      //   decipherSender.setAuthTag(authTag)
      //   let decrypt = decipherSender.update(amtDigitalSig, 'hex', 'utf8');
      //   decrypt += decipherSender.final('utf8');

      //   //amtObject has dateTime, amount, currency
      //   const amtObject = JSON.parse(decrypt.split('_')[0]);
      //   //digitalSignature has digital signature
      //   const digitalSignature = JSON.parse(decrypt.split('_')[1]);
      //   digitalSignature.r = BigInt(digitalSignature.r);
      //   digitalSignature.s = BigInt(digitalSignature.s);
      //   const message = amtObject.dateTime.toString() + amtObject.amount.toString() + amtObject.currency.toString();
      //   const msgHash = sha256.create();
      //   msgHash.update(amtObject.toString());
      //   msgHash.hex();

      //   const isValid = secp256k1.verify(digitalSignature, msgHash.toString('hex'), senderPublicKey)

      //   const amount = amtObject.amount;
      //   const currency = amtObject.currency;

      //   console.log(isValid, amount, currency)


      //   if(isValid == true && transactions[i].type === "send") {


      //       transactionsToReturn.push({
      //         dateTime: transactions[i].dateTime,
      //         transactionParty: transactions[i].transactionParty.fullName,
      //         type: transactions[i].type,
      //         amount: amount,
      //         currency: currency
      //       })
      //     }



      //   res.json(transactionsToReturn);
      // }






      //jump to here if data has been tampered
      // else if (isValid == false) {
      //   //tampered statement will be shown
      //   const tampered = "The amount has been Tampered";
      //   console.log(tampered);

      //   // res.status(303).redirect(`${process.env.FRONTEND_URL}`)
      // }
      // var hash = sha256.create();
      // hash.update(message);
      // hash.hex();






    } catch (error) {
      console.error(error);
      res.status(500).send("Server Error");
    }
  });

// Get transfer limit of user
//http://localhost:8080/api/transactions/get-limit
router.route("/get-limit").get(jwtValidationMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const bankBalanceKey = req.user.bankBalanceKey
    const BankAcc = await BankAccount.findOne({ user: userId });
    const accountDetails = decryptAccountDetails(BankAcc.accountDetails, bankBalanceKey)
    limits = {
      SGD: accountDetails.transferLimitSgd,
      MYR: accountDetails.transferLimitMyr,
      USD: accountDetails.transferLimitUsd,
    };
    res.json(limits);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
})

// Change limit of user
//http://localhost:8080/api/transactions/change-limit
router
  .route("/change-limit")
  .patch(jwtValidationMiddleware, async (req, res) => {
    try {
      const userAgent = req.headers['user-agent'];

      const forwarded = req.headers['x-forwarded-for'];
      const clientIP = forwarded ? forwarded.split(/, /)[0] : req.socket.remoteAddress;

      const userId = req.user.sub; // Extract userId from the token
      const { newSgd, newMyr, newUsd } = req.body; // Extract new limits from the request body
      const bankBalanceKey = req.user.bankBalanceKey

      // Find the user's bank account and update the limits
      const BankAcc = await BankAccount.findOne({ user: userId });
      const accountDetails = updateBankAccountLimit(BankAcc.accountDetails, bankBalanceKey, newSgd, newMyr, newUsd)
      const bankAccount = await BankAccount.findOneAndUpdate(
        { user: userId },
        {
          $set: { accountDetails: accountDetails },
        }
      );
      if (!bankAccount) {
        return res.status(404).json({ msg: "Bank account not found" });
      }

      const log = await createLog(userId, `Changed Transfer Limit ${clientIP} ${userAgent}`)
      await log.save()

      await addLog(log)

      res.json(bankAccount); // Send the updated bank account as a response
    } catch (error) {
      console.error(error);
      res.status(500).send("Server Error");
    }
  })

// POST request to add a new transaction
// http://localhost:8080/api/transactions/add-transaction
router
  .route("/add-transaction")
  .post(jwtValidationMiddleware, async (req, res) => {
    // Extract the transaction data from the request body
    const { amount, currency, dateTime, phoneNumber } = req.body;

    console.log("amount: ", amount)
    console.log("currency: ", currency)
    console.log("dateTime: ", dateTime)
    console.log("phoneNumber: ", phoneNumber)

    const userAgent = req.headers['user-agent'];

    const forwarded = req.headers['x-forwarded-for'];
    const clientIP = forwarded ? forwarded.split(/, /)[0] : req.socket.remoteAddress;

    try {
      //Get user's name from their id
      const userId = req.user.sub; // Extract userId from the token
      const transactionKeypair = req.user.transactionKeypair
      const bankBalanceKey = req.user.bankBalanceKey
      
      // console.log("transaction kp: ", transactionKeypair)
      // console.log("bank balance key: ", bankBalanceKey)

      const user = await User.findById(userId); // Find user by userId
      if (!user) {
        return res.status(404).json({ msg: "User not found" });
      }
      //check if amount exceeds balance, lower or equal to 0 or exceeds Limit
      const bankAccount = await BankAccount.findOne({ user: userId });
      // console.log(currency)
      const currencyMapping = {
        USD: { amount: "amountUsd", limit: "transferLimitUsd" },
        SGD: { amount: "amountSgd", limit: "transferLimitSgd" },
        MYR: { amount: "amountMyr", limit: "transferLimitMyr" },
      };
      const { amount: currencyAmount, limit: currencyLimit } = currencyMapping[currency];

      // Check if amount entered is more than their balance or limit, or if the amount is less than or equal to 0
      if (
        amount > bankAccount[currencyAmount] ||
        amount <= 0 ||
        amount > bankAccount[currencyLimit]
      ) {
        return res.status(400).json({ msg: "Transfer amount invalid!" });
      }

      // Find recUser by phoneNumber, will use to get name and id
      const recUser = await User.findOne({ phoneNumber });
      if (!recUser) {
        return res.status(404).json({ msg: "Recipient not found" });
      }

      // Prevent user from transferring money to themselves
      if (recUser._id.toString() === user._id.toString()) {
        return res
          .status(401)
          .json({ msg: "Transferring to yourself is not allowed" });
      }

      // update value in bank account on user side
      const accountDetails = updateBankAccount(bankAccount.accountDetails, bankBalanceKey, currencyAmount, amount)
      const senderAcc = await BankAccount.findByIdAndUpdate(bankAccount._id, {
        $set: { accountDetails: accountDetails },
      });
      if (!senderAcc) {
        return res.status(404).json({ msg: "User cannot update" });
      }



      // //update value on recipient side
      // const recBankAcc = await BankAccount.findOne({ user: recUser._id });
      // const recBalanceInCents = Math.round(recBankAcc[currencyAmount] * 100);
      // //console.log(recBalanceInCents + " " + amountInCents);
      // const updatedRecipientAmount = recBalanceInCents + amountInCents;
      // const recAcc = await BankAccount.findByIdAndUpdate(recBankAcc._id, {
      //   $set: { [currencyAmount]: updatedRecipientAmount / 100 },
      // });
      // if (!recAcc) {
      //   return res.status(404).json({ msg: "Recipient cannot update" });
      // }

      // Create a new transaction instance for sender and recipient
      //Send this newSendTransaction to DB


      const newSendAmount = { dateTime, amount, currency };

      //Send the encryptedSendAmount to DB
      const sendAmount = JSON.stringify(newSendAmount);


      //Use the recieving users name
      const message = dateTime.toString() + amount.toString() + currency.toString();

      console.log(transactionKeypair[0])
      //Encryption for sender starts from here (Digital signature)
      const userPrivateKey = Uint8Array.from(Buffer.from(transactionKeypair[0], 'hex'))

      var hash = sha256.create();
      hash.update(newSendAmount.toString('hex'));
      hash.hex();

      //console.log(hash.toString('hex'));
      //ECDSA digital signature using the senders key
      const signature = secp256k1.sign(hash.toString('hex'), userPrivateKey);

      //console.log(signature)
      // Digital Signature Verification part
      /* const stringUserPubKey = user.transaction_publicKey;
       const listUserPubliceKey = stringUserPubKey.split(',').map(Number);
       const userPublicKey = new Uint8Array(listUserPubliceKey);

       const verify = secp256k1.verify(signature, hash.toString(), userPublicKey) === true;
       console.log(verify);*/

      const recipientsPublicKey = Uint8Array.from(Buffer.from(recUser.transactionKeypair[1], 'hex'))

      //console.log(recipientsPublicKey)
      //Using Elliptic curve Deffie hellman (ECDH) to create the Sessionkey (your private key + public key of recipient)
      const sessionKey = secp256k1.getSharedSecret(userPrivateKey, recipientsPublicKey);
      const sessionKeyHash = crypto.createHash('sha256').update(sessionKey.toString('hex')).digest();

      //console.log(sessionKeyHash);
      //This is the 96 bit initialisation vector (Have to be stored in DB)
      const iv = crypto.randomBytes(12);
      const ivHex = iv.toString('hex');
      //cipher used is AES-Golais Counter Mode (GCM)
      const cipher = crypto.createCipheriv('aes-256-gcm', sessionKeyHash, iv);

      signature.r = signature.r.toString();
      signature.s = signature.s.toString();
      const sign = JSON.stringify(signature);

      console.log("sign hex string 2", sign)
      const cashDigitalSignature = sendAmount + "_" + sign;
      // console.log(cashDigitalSignature);
      let encryptedSendAmount = cipher.update(cashDigitalSignature, 'utf-8', 'hex');
      encryptedSendAmount += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      const authTagHex = authTag.toString('hex');

      const amountTag = encryptedSendAmount + authTagHex
      //console.log('Encrypted Data:', encryptedSendAmount);

      //console.log(encryptedSendAmount, iv);


      // const newIV = Buffer.from(ivHex, 'hex');
      // const decipher = crypto.createDecipheriv('aes-256-gcm', sessionKeyHash, newIV);
      // decipher.setAuthTag(authTag);
      // let decrypt = decipher.update(encryptedSendAmount, 'hex', 'utf8');
      // decrypt += decipher.final('utf8');
      // console.log(decrypt)



      // console.log(ivHex);




      //Encrypted
      const newSendTransaction = new Transaction({
        dateTime: dateTime,
        transactionParty: recUser._id,
        type: "send",
        cashDigitalSignature: amountTag,
        IV: ivHex
      });


      console.log("nst", newSendTransaction)
      //Testing to see if shared key same
      /* const p = new Uint8Array([170, 106, 216, 136, 79, 88, 97, 161, 219, 225, 142, 176, 192, 227, 1, 20, 155, 246, 158, 229, 158, 139, 168, 93, 253, 173, 10, 19, 32, 142, 98, 190]);
       const pub = user.transaction_publicKey;
       const listpub = pub.split(',').map(Number);
       const ppub = new Uint8Array(listpub);
       
       const same = secp256k1.getSharedSecret(p, ppub);
       const sameHash = crypto.createHash('sha256').update(same.toString('hex')).digest();
       
       
       console.log(sameHash);*/

      const newReceiveTransaction = new Transaction({
        dateTime: dateTime,
        transactionParty: user._id,
        type: "receive",
        cashDigitalSignature: amountTag,
        IV: ivHex
      });
      console.log("nrt", newReceiveTransaction)

      // Save the new transactions to the database
      await newSendTransaction.save();
      await newReceiveTransaction.save();

      // Find the user by userId and update the transactionIds array
      const sender = await User.findByIdAndUpdate(
        userId,
        { $push: { transactionIds: newSendTransaction._id } },
        { new: true }
      );
      if (!sender) {
        return res.status(404).json({ msg: "Sender not found" });
      }

      // Find the recipient by userId and update the transactionIds array
      const recipient = await User.findByIdAndUpdate(
        recUser._id,
        { $push: { transactionIds: newReceiveTransaction._id, transactionQueueIds: newReceiveTransaction._id } },
        { new: true }
      );
      if (!recipient) {
        return res.status(404).json({ msg: "Recipient not found" });
      }


      // const recipientSendQueue = await User.findByIdAndUpdate(
      //   recUser._id, 

      //     {$push: { transactionQueueIds : newReceiveTransaction._id} },
      //     {new: true }

      // );
      // if (!recipient) {
      //   return res.status(404).json({ msg: "Recipient not found" });
      // }

      const log = await createLog(user._id, `Performed Transaction ${clientIP} ${userAgent}`, newSendTransaction._id)
      await log.save()

      await addLog(log)

      await sendEmail({
        to: user.email,
        subject: "DB-SEIS Performed Transaction",
        text: `You have performed a transaction of ${amount} ${currency} to ${recipient.fullName} on ${new Date(Date.now()).toLocaleString()}.`
      })

      // Sending both user and recipient data in the response
      res.json({ user, recipient });

      // res.json({ user });
    } catch (error) {
      console.error(error);
      res.status(500).send("Server Error");
    }
  });

// To view the latest transaction on the home page 'Jun'
// http://localhost:8080/api/transactions/by-user-latest
router.route("/by-user-latest").post(jwtValidationMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub; // get user ID from the token
    // Find the user and get their transaction IDs
    const user = await User.findById(userId)


    const transactionKeypair = req.user.transactionKeypair

    if (!user) {
      return res.status(404).json("User not found")
    }
    const transactionIds = user.transactionIds;

    // Find transactions that match the IDs and are within the date range
    // const transactions = await Transaction.find({
    //   _id: { $in: transactionIds },
    // }).sort({ dateTime: -1 }).limit(1);

    const transactions = await Transaction.find({
      _id: { $in: transactionIds },

    }).populate('transactionParty', 'fullName').sort({ dateTime: -1 }).limit(1);

    let transactionsToReturn = []


    //logged in user private key
    const userPrivateKey = Uint8Array.from(Buffer.from(transactionKeypair[0], 'hex'))
    //logged in user public key to use to verify senders package
    const userPublicKey = Uint8Array.from(Buffer.from(transactionKeypair[1], 'hex'))




    for (let i = 0; i < transactions.length; i++) {
      //Retrieving other parties public key
      const sendersAccount = await User.findById(transactions[i].transactionParty);
      const senderPublic = Uint8Array.from(Buffer.from(sendersAccount.transactionKeypair[1], 'hex'))


      //logged in user public key to use to verify senders package
      const userPublicKey = Uint8Array.from(Buffer.from(transactionKeypair[1], 'hex'))

      //preshared key between 2 parties using ECCDH
      const sessionKey = secp256k1.getSharedSecret(userPrivateKey, senderPublic);
      const sessionKeyHash = crypto.createHash('sha256').update(sessionKey.toString('hex')).digest();

      //Retrieve IV
      const ivHex = transactions[i].IV;
      const IV = Buffer.from(ivHex, 'hex')

      //Retrieve amount concatenated with the digital signature and concatenated Auth Tag
      const amtAuth = transactions[i].cashDigitalSignature;

      //Digital signature
      const amtDigitalSig = amtAuth.slice(0, -32);

      //Auth Tag
      const authTagHex = amtAuth.slice(-32);
      const authTag = Buffer.from(authTagHex, 'hex');

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
      const msgHash = sha256.create();
      msgHash.update(amtObject.toString());
      msgHash.hex();

      //integrity check using the digital signature True: allow, False: deny (means altered)
      const isValidReceiver = secp256k1.verify(digitalSignature, msgHash.toString('hex'), senderPublic)




      //logged in user who sent the package digital signature
      const isValidUser = secp256k1.verify(digitalSignature, msgHash.toString('hex'), userPublicKey)
      const amount = amtObject.amount;
      const currency = amtObject.currency;
      const transactionType = transactions[i].type



      if (isValidReceiver == true && transactionType === "receive") {
        // const dateTime = amtObject.dateTime;
        // const amount = amtObject.amount;
        // const currency = amtObject.currency;

        // console.log(dateTime, amount, currency);

        transactionsToReturn.push({
          dateTime: transactions[i].dateTime,
          transactionParty: transactions[i].transactionParty.fullName,
          type: transactions[i].type,
          amount: amount,
          currency: currency
        })
      }


      else if (isValidUser == true && transactionType === "send") {

        transactionsToReturn.push({
          dateTime: transactions[i].dateTime,
          transactionParty: transactions[i].transactionParty.fullName,
          type: transactions[i].type,
          amount: amount,
          currency: currency
        })


      }

      else if (isValidReceiver == false && transactionType === "receive" || isValidUser == false && transactionType === "send") {

        console.log("File has been tampered");

      }



    }


    res.json(transactionsToReturn);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

// Get the transaction keypair belonging to the user
// http://localhost:8080/api/transactions/get-transaction-keypair
router.route("/get-transaction-keypair").get(jwtValidationMiddleware, async (req, res) => {
  try {

    const transactionKeypair = req.user.transactionKeypair
    res.json(transactionKeypair);

  } catch (error) {

    console.error(error);
    res.status(500).send("Server Error");

  }
});

// Log exporting of transaction history
// http://localhost:8080/api/transactions/log-export-transactions
router
  .route("/log-export-transactions")
  .get(jwtValidationMiddleware, async (req, res) => {
    const userAgent = req.headers['user-agent'];

    const forwarded = req.headers['x-forwarded-for'];
    const clientIP = forwarded ? forwarded.split(/, /)[0] : req.socket.remoteAddress;

    try {
      const userId = req.user.sub; // Extract userId from the token

      const log = await createLog(userId, `Export Transaction History ${clientIP} ${userAgent}`)
      await log.save()

      await addLog(log)

      res.json("Successfully logged exporting of transactions for user");
    } catch (error) {
      console.error(error);
      res.status(500).send("Server Error");
    }
  });



module.exports = router;
