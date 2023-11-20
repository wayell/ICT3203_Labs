const mailjet = require('node-mailjet').apiConnect(process.env.MAILJET_API_KEY, process.env.MAILJET_SECRET_KEY);

const sendEmail = async ({ to, subject, text }) => {
    try {
        const request = await mailjet
            .post("send", { 'version': 'v3.1' })
            .request({
                "Messages": [
                    {
                        "From": {
                            "Email": process.env.MAILJET_FROM_EMAIL,
                            "Name": "DB-SEIS"
                        },
                        "To": [
                            {
                                "Email": to,
                                "Name": "Recipient Name"
                            }
                        ],
                        "Subject": subject,
                        "TextPart": text
                    }
                ]
            });
        
        console.log(`Email sent: ${request.body.Messages[0].Status}`);
        return request;
    } catch (error) {
        console.error(`Error: ${error.message}`);
        throw new Error('Failed to send email');
    }
};

module.exports = { sendEmail };