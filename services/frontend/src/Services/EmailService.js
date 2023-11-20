const sendVerificationEmail = async (email) => {
    try {
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/users/send-email-verification`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            console.error(`Error: ${response.statusText}`); // Log error message
        }

        return response.status;  // returning the status code to the calling function
    } catch (error) {
        console.error('Failed to send verification email:', error);
        throw error; 
    }
}

module.exports = {
    sendVerificationEmail
}