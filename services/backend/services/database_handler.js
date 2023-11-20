const forge = require('node-forge')
const secp256k1 = require('@noble/curves/secp256k1').secp256k1
const sha256 = require('sha256')

const { Log } = require('../models/model_log')

async function createLog(userid, content, transactionId) {

    const publicKey = Uint8Array.from(Buffer.from(process.env.PUBLIC_KEY, 'hex'))
    const ephemeralPrivateKey = secp256k1.utils.randomPrivateKey()
    const ephemeralPublicKey = secp256k1.getPublicKey(ephemeralPrivateKey)
    const sharedSecret = forge.util.hexToBytes(sha256(secp256k1.getSharedSecret(ephemeralPrivateKey, publicKey).slice(1)))
    console.log(forge.util.bytesToHex(secp256k1.getSharedSecret(ephemeralPrivateKey, publicKey).slice(1)))

    const IV = forge.random.getBytesSync(12)

    let cipher = forge.cipher.createCipher('AES-GCM', sharedSecret)
    cipher.start({
        iv: IV,
        tagLength: 128
    });
    cipher.update(forge.util.createBuffer(content))
    cipher.finish()

    const currentDate = new Date()

    const log = new Log({
        user: userid,
        description: cipher.output.toHex() + cipher.mode.tag.toHex() + forge.util.bytesToHex(IV),
        key: forge.util.bytesToHex(ephemeralPublicKey),
        dateTime: new Date(currentDate.getTime() + 8 * 60 * 60 * 1000)
    })

    if (transactionId)
        log.transaction = transactionId

    return log
}

module.exports = { createLog }