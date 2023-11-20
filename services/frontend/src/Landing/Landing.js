import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

import { Form, Button, Container, Row, Col, OverlayTrigger, Alert, Tooltip, Modal } from 'react-bootstrap'

const Landing = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [userOtp, setUserOtp] = useState("")

    const [isSendOtpButtonDisabled, setIsSendOtpButtonDisabled] = useState(false)
    const [isResendOtpButtonDisabled, setIsResendOtpButtonDisabled] = useState(false)
    const [hasUserAttemptedOtp, setHasUserAttemptedOtp] = useState(false)

    const [showWrongOtpMessage, setShowWrongOtpMessage] = useState(false)

    const [isOtpSpammed, setIsOtpSpammed] = useState(false)
    const [showOtpSpamModal, setShowOtpSpamModal] = useState(false)

    const [isOtpGenerated, setIsOtpGenerated] = useState(false)
    const [showOtpEmailSentModal, setShowOtpEmailSentModal] = useState(false)

    const [step, setStep] = useState(1)

    const maxRetries = 3  // Define maximum number of retries
    const [retryCount, setRetryCount] = useState(0)
    const [resendCount, setResendCount] = useState(0)

    // sessionStorage.clear()

    const navigate = useNavigate()

    useEffect(() => {
        if (isOtpGenerated) {
            handleShowOtpEmailSentModal()
        }
    }, [isOtpGenerated])

    const handleShowOtpEmailSentModal = () => {
        setShowOtpEmailSentModal(true)
    }

    const handleHideOtpEmailSentModal = () => {
        setShowOtpEmailSentModal(false)
    }

    useEffect(() => {
        if (retryCount > 3)
            setIsOtpSpammed(true)
    }, [retryCount])

    useEffect(() => {
        if (resendCount > 3)
            setIsOtpSpammed(true)
    }, [resendCount])

    useEffect(() => {
        const freezeAccount = async () => {
            try {
                const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/users/freeze-account`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email }),
                    credentials: 'include'
                });

                if (response.status === 200) {
                    handleShowOtpSpamModal();

                    setTimeout(() => {
                        window.location.reload()
                    }, 5000);
                }
            } catch (error) {
                console.error("An error occurred while freezing the account:", error);
            }
        };

        if (isOtpSpammed) {
            freezeAccount();
        }
    }, [isOtpSpammed, navigate, email])

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setIsSendOtpButtonDisabled(false)
            setIsResendOtpButtonDisabled(false)
        }, 60000)

        return () => {
            clearTimeout(timeoutId)
        }
    }, [])

    const handleShowOtpSpamModal = () => {
        setShowOtpSpamModal(true)
    }

    const handleHideOtpSpamModal = () => {
        setShowOtpSpamModal(false)
    }

    const renderAnotherRequestTooltip = (props) => (
        <Tooltip id="button-tooltip" {...props}>
            You may only send requests every minute.
        </Tooltip>
    )

    const handleOtpChange = (e) => {
        setUserOtp(e.target.value)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        // Your login logic here
        // console.log("Email:", email, "Password:", password)

        try {
            // password stuff here
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/users/verify-login-details`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            })

            const data = await response.json()

            // Handle based on status code
            if (response.status === 200) {
                setStep(2)
                setIsOtpGenerated(true)
            }

            else if (response.status === 401) {
                console.error(data)
                // Show error message to the user
                alert("Your account is frozen.")
                setIsOtpGenerated(false)
            } else {
                setIsOtpGenerated(false)
                // console.error("Unexpected server error.")
                alert(data)
            }
        } catch (error) {
            console.error('Failed to log in:', error)
            alert("Network error. Please check your connection and try again.")
        }
    }

    const resendOtp = async () => {
        setIsResendOtpButtonDisabled(true)
        setIsSendOtpButtonDisabled(false)

        setTimeout(() => {
            setIsResendOtpButtonDisabled(false)
        }, 60000)

        if (step === 2 && email !== "") {
            fetch(`${process.env.REACT_APP_API_BASE_URL}/users/2fa-setup?email=${email}`, {
                credentials: 'include'
            }).then(response => {
                setResendCount(resendCount + 1)
            })
        }
    }

    const verifyUserOtp = async () => {
        setIsSendOtpButtonDisabled(true)
        setIsResendOtpButtonDisabled(false)

        setTimeout(() => {
            setIsSendOtpButtonDisabled(false)
        }, 60000)

        await fetch(`${process.env.REACT_APP_API_BASE_URL}/users/login-2fa-verify`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                userOtp: userOtp,
                password: password
            }),
        }).then(async response => {
            const data = await response.json()
            // console.log(data)

            if (response.status === 200) {
                navigate('/home')
            } else {
                // console.log("wrong otp")
                setShowWrongOtpMessage(true)
                setHasUserAttemptedOtp(true)

                // Only retry if the retry count is below the maximum allowed
                if (retryCount < maxRetries)
                    setRetryCount(retryCount + 1)
            }
        })
    }

    return (
        <div>
            {step === 1 ? (
                <Container className='w-50' style={{ marginTop: '5rem' }}>
                    <Row className="justify-content-center">
                        <Col md={4}>
                            <h3 className="text-center mb-4">Login</h3>
                            <Form onSubmit={handleSubmit}>
                                <Form.Group controlId="email">
                                    <Form.Label>Email Address</Form.Label>
                                    <Form.Control
                                        type="email"
                                        placeholder="Enter email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group controlId="password">
                                    <Form.Label>Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        minLength="8"
                                        required
                                    />
                                </Form.Group>

                                <div className='d-flex justify-content-center mt-3'>
                                    <Button id="login-button" variant="primary" type="submit" className="w-100">
                                        Login
                                    </Button>
                                </div>
                            </Form>

                            <div className="text-center mt-4">
                                <Link to="/register">Sign up for an Account</Link>
                            </div>

                            <div className="text-center mt-2">
                                <Link to="/forget-password">Forgot your Password?</Link>
                            </div>
                        </Col>
                    </Row>
                </Container>
            ) : (
                <div>
                    <Row md={5} className="mb-4 mx-2" style={{ display: 'flex' }}>
                        <Col>
                            <Form.Control
                                type="text"
                                placeholder="Enter OTP"
                                value={userOtp}
                                onChange={handleOtpChange}
                            />
                        </Col>
                        <Col>
                            <OverlayTrigger
                                placement="right"
                                delay={{ show: 150, hide: 400 }}
                                overlay={renderAnotherRequestTooltip}
                                trigger={['hover', 'focus']}
                            >
                                <span className="d-inline-block" style={{ cursor: 'not-allowed' }}>
                                    <Button
                                        onClick={verifyUserOtp}
                                        disabled={isSendOtpButtonDisabled}>
                                        Verify OTP
                                    </Button>
                                </span>
                            </OverlayTrigger>

                            {hasUserAttemptedOtp &&
                                <OverlayTrigger
                                    placement="right"
                                    delay={{ show: 150, hide: 400 }}
                                    overlay={renderAnotherRequestTooltip}
                                    trigger={['hover', 'focus']}
                                >
                                    <span className="d-inline-block ml-2" style={{ cursor: 'not-allowed' }}>
                                        <Button
                                            onClick={resendOtp}
                                            disabled={isResendOtpButtonDisabled}>
                                            Resend OTP
                                        </Button>
                                    </span>
                                </OverlayTrigger>
                            }
                        </Col>

                    </Row>
                    <Row className='mx-4 w-25'>
                        {
                            showWrongOtpMessage &&
                            <Alert className='py-2 mb-0 w-50' variant="danger">
                                Wrong OTP !
                            </Alert>
                        }
                    </Row>

                    <Modal show={showOtpSpamModal} onHide={handleHideOtpSpamModal}>
                        <Modal.Header closeButton>
                            <Modal.Title>OTP Verification</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            You have tried to verify your OTP too many times. We have froze your account for 30 minutes.
                            <div className="mt-3">Redirecting you to the home page in 5 seconds...</div>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleHideOtpSpamModal}>
                                Close
                            </Button>
                        </Modal.Footer>
                    </Modal>

                    <Modal show={showOtpEmailSentModal} onHide={handleHideOtpEmailSentModal}>
                        <Modal.Header closeButton>
                            <Modal.Title>OTP Email</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            An email with an OTP has been sent to you!
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleHideOtpEmailSentModal}>
                                Close
                            </Button>
                        </Modal.Footer>
                    </Modal>
                </div>
            )}
        </div>
    )
}

export default Landing