const sendOtp = async (email) => {
    // const token = sessionStorage.getItem('token');
    try {
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/users/2fa-usage?email=${email}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-type': 'application/json'
            },
        });

        if (response.status === 200) {
            // console.log("OTP Sent successfully")
        }
        else {
            // console.log("OTP NOT SENT", response.status)
        }
    } catch (error) {
        console.error('Failed to send verification email:', error);
        throw error;
    }
}

module.exports = { sendOtp }

