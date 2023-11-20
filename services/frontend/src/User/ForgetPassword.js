import { useState, useEffect, useRef } from "react"

import { useNavigate } from 'react-router-dom'

import { Form, Row, Col, Container, Modal, Button, Tooltip, OverlayTrigger, Overlay, Alert } from "react-bootstrap"

import { useSocket } from '../App'

const ForgetPassword = () => {
    const socket = useSocket()

    const navigate = useNavigate()

    const target = useRef(null)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    const [userOtp, setUserOtp] = useState("")

    const [showOtpEmailSentModal, setShowOtpEmailSentModal] = useState(false)
    const [isOtpGenerated, setIsOtpGenerated] = useState(false)

    const [isEmailVerified, setIsEmailVerified] = useState(false)
    const [showEmailVerifiedModal, setShowEmailVerifiedModal] = useState(false)
    const [isSendButtonDisabled, setIsSendButtonDisabled] = useState(false)

    const [showEnterValidAddressTooltip, setShowEnterValidAddressTooltip] = useState(false)
    const [showAlreadyExistsTooltip, setShowAlreadyExistsTooltip] = useState(false)

    const [isEmailSent, setIsEmailSent] = useState(false)
    const [showEmailSentModal, setShowEmailSentModal] = useState(false)

    const [isOtpSpammed, setIsOtpSpammed] = useState(false)
    const [showOtpSpamModal, setShowOtpSpamModal] = useState(false)

    const [step, setStep] = useState(1)

    const [email, setEmail] = useState("")

    const maxRetries = 3  // Define maximum number of retries
    const [retryCount, setRetryCount] = useState(0)
    const [resendCount, setResendCount] = useState(0)

    const [isSendOtpButtonDisabled, setIsSendOtpButtonDisabled] = useState(false)
    const [isResendOtpButtonDisabled, setIsResendOtpButtonDisabled] = useState(false)
    const [hasUserAttemptedOtp, setHasUserAttemptedOtp] = useState(false)
    const [showWrongOtpMessage, setShowWrongOtpMessage] = useState(false)

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [privateRecoveryKey, setPrivateRecoveryKey] = useState("")

    const [showModal, setShowModal] = useState(false);

    const handleResetSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        try {
            // password stuff here
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/users/reset-password`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email, password, confirmPassword, privateRecoveryKey }),
            });

            if (response.status === 200) {
                setShowModal(true);
                setTimeout(() => {
                    navigate('/');
                }, 5000);
            } else {
                const data = await response.json();
                alert(data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        const sendOtpEmail = async () => {
            try {
                const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/users/forget-password-send-2fa`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: email })
                })

                const data = await response.json()

                // OTP verified
                if (response.status === 200) {
                    setIsOtpGenerated(true)
                } else {
                    alert(data)
                }
            } catch (error) {
                console.error("An error occurred:", error)
            }
        }

        if (step === 2 && email !== "") {
            handleHideEmailSentModal()
            handleHideEmailVerifiedModal()
            handleHideOtpEmailSentModal()

            sendOtpEmail()
        }
    }, [step, email])


    const handleShowOtpEmailSentModal = () => {
        setShowOtpEmailSentModal(true)
    }

    const handleHideOtpEmailSentModal = () => {
        setShowOtpEmailSentModal(false)
    }

    const renderAnotherRequestTooltip = (props) => (
        <Tooltip id="button-tooltip" {...props}>
            You may only send requests every minute.
        </Tooltip>
    )

    const handleShowOtpSpamModal = () => {
        setShowOtpSpamModal(true)
    }

    const handleHideOtpSpamModal = () => {
        setShowOtpSpamModal(false)
    }

    const handleOtpChange = (e) => {
        setUserOtp(e.target.value)
    }

    const resendOtp = async () => {
        setIsResendOtpButtonDisabled(true)
        setIsSendOtpButtonDisabled(false)

        setTimeout(() => {
            setIsResendOtpButtonDisabled(false)
        }, 60000)

        if (step === 2 && email !== "") {
            await fetch(`${process.env.REACT_APP_API_BASE_URL}/users/send-email-forget-password`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email })
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

        await fetch(`${process.env.REACT_APP_API_BASE_URL}/users/forget-password-2fa-verify`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                userOtp: userOtp,
            }),
        })
            .then(async response => {
                const data = await response.json()

                if (response.status === 200) {
                    // console.log("otp verified")
                    setStep(3)
                } else {
                    alert(data)
                    setShowWrongOtpMessage(true)
                    setHasUserAttemptedOtp(true)

                    // Only retry if the retry count is below the maximum allowed
                    if (retryCount < maxRetries)
                        setRetryCount(retryCount + 1)
                }
            })
    }

    useEffect(() => {
        const handleEmailVerified = (data) => {
            setIsEmailVerified(true)
        }
        socket.on('forget-password-email-verified', handleEmailVerified)

        // Clean up the listener when the component is unmounted
        return () => {
            socket.off('forget-password-email-verified', handleEmailVerified)
        }
    }, [socket])

    useEffect(() => {
        if (isEmailSent) {
            handleShowEmailSentModal()
        }
    }, [isEmailSent])


    const handleShowEmailSentModal = () => {
        setShowEmailSentModal(true)
    }

    const handleHideEmailSentModal = () => {
        setShowEmailSentModal(false)
    }

    useEffect(() => {
        if (isOtpGenerated) {
            handleShowOtpEmailSentModal()
        }
    }, [isOtpGenerated])

    useEffect(() => {
        if (retryCount > 3)
            setIsOtpSpammed(true)
    }, [retryCount])

    useEffect(() => {
        if (resendCount > 3)
            setIsOtpSpammed(true)
    }, [resendCount])

    useEffect(() => {
        if (isOtpSpammed) {
            handleShowOtpSpamModal()

            setTimeout(() => {
                navigate('/')
            }, 5000)
        }
    }, [isOtpSpammed, navigate])

    useEffect(() => {
        if (isEmailVerified) {
            handleShowEmailVerifiedModal()
            setStep(2)
        }
    }, [isEmailVerified])

    const handleShowEmailVerifiedModal = () => {
        setShowEmailVerifiedModal(true)
    }

    const handleHideEmailVerifiedModal = () => {
        setShowEmailVerifiedModal(false)
    }

    const handleInputChange = (e) => {
        setEmail(e.target.value) // Access the value of the input field directly
    }


    const handleSubmit = async (e) => {
        e.preventDefault()

        if (step === 1) {
            if (emailRegex.test(email)) {
                // Disable the button for 1 minute
                setIsSendButtonDisabled(true)

                setTimeout(() => {
                    setIsSendButtonDisabled(false)
                }, 60000)  // 60000 milliseconds is 1 minute

                setShowEnterValidAddressTooltip(false)
                setShowAlreadyExistsTooltip(false)

                await fetch(`${process.env.REACT_APP_API_BASE_URL}/users/send-email-forget-password`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: email })
                })
                    .then(async response => {
                        if (response.status === 200) {
                            setIsEmailSent(true)
                            socket.emit('verify-forget-password-email', { email: email })
                        }

                        else if (response.status === 400) {
                            const data = await response.json()
                            alert(data)
                        }

                        else
                            alert("Server error")
                    })

            } else {
                setShowEnterValidAddressTooltip(true)  // show the tooltip if email is invalid
                setTimeout(() => setShowEnterValidAddressTooltip(false), 5000)  // hide the tooltip after 5 seconds
            }
        }
    }

    const renderPleaseVerifyTooltip = (props) => (
        <Tooltip id="button-tooltip" {...props}>
            Please enter a valid email.
        </Tooltip>
    )

    return (
        <Container fluid>
            <Form onSubmit={handleSubmit} className="registration-form mx-auto mt-3">
                <Row className="mb-4">
                    <h4 className="mx-3">
                        {
                            step === 1 ? "Forget Password - Email Verification" : step === 2 ? "Forget Password - OTP Verification" : ""
                        }
                    </h4>
                </Row>

                {step === 1 && (
                    <Row className="mb-4">
                        <Col sm="12">
                            <Row>
                                <Col sm="7">
                                    <div style={{ display: "flex", position: 'relative' }}>
                                        <Form.Control
                                            type="email"
                                            placeholder="Enter your email"
                                            name="email"
                                            value={email || ""}
                                            ref={target}
                                            onChange={handleInputChange}
                                            isInvalid={showEnterValidAddressTooltip}
                                            required
                                        />
                                    </div>

                                    <Overlay target={target.current} show={showEnterValidAddressTooltip} placement="top">
                                        {(props) => (
                                            <Tooltip id="overlay-valid-address" {...props}>
                                                Please fill up the email input field with a valid email address.
                                            </Tooltip>
                                        )}
                                    </Overlay>

                                    <Overlay target={target.current} show={showAlreadyExistsTooltip} placement="top">
                                        {(props) => (
                                            <Tooltip id="overlay-already-exists" {...props}>
                                                An email has already been sent to you.
                                            </Tooltip>
                                        )}
                                    </Overlay>
                                </Col>
                                <Col sm="5">
                                    <OverlayTrigger
                                        placement="right"
                                        delay={{ show: 150, hide: 400 }}
                                        overlay={renderPleaseVerifyTooltip}
                                        trigger={['hover', 'focus']}
                                    >
                                        <span className="d-inline-block" style={{ cursor: 'not-allowed' }}>
                                            <Button id="forget_button"
                                                onClick={handleSubmit}
                                                disabled={isSendButtonDisabled}
                                            >
                                                Send Forget Password Email
                                            </Button>
                                        </span>
                                    </OverlayTrigger>
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                )}

                {step === 2 && (
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
                    </div>
                )}
            </Form>

            {step === 3 && (
                <Form onSubmit={handleResetSubmit} className="mx-auto mt-5" style={{ maxWidth: '400px' }}>
                    {showModal && (
                        <Modal show={showModal} onHide={() => setShowModal(false)}>
                            <Modal.Header closeButton>
                                <Modal.Title>Password Reset Successful</Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                Your password has been reset successfully. You will be redirected to the login page shortly.
                            </Modal.Body>
                        </Modal>
                    )}

                    {true && (
                        <div className="p-4 border rounded">
                            <Form.Group controlId="formPrivateRecoveryKey" className="mb-3">
                                <Form.Label>Private Recovery Key</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Enter your private recovery key"
                                    value={privateRecoveryKey}
                                    onChange={(e) => setPrivateRecoveryKey(e.target.value)}
                                    required
                                />
                                <Form.Text className="text-muted">
                                    You may find this recovery key in the email sent to you when you first registered for an account.
                                </Form.Text>
                            </Form.Group>

                            <Form.Group controlId="formPassword" className="mb-3">
                                <Form.Label>Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="Enter your new password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength="8"
                                    required
                                />
                                <Form.Text className="text-muted">
                                    Password must be at least 8 characters long.
                                </Form.Text>
                            </Form.Group>

                            <Form.Group controlId="formConfirmPassword" className="mb-4">
                                <Form.Label>Confirm Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="Confirm your new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    minLength="8"
                                    required
                                />
                                <Form.Text className="text-muted">
                                    Confirm password must be at least 8 characters long.
                                </Form.Text>
                            </Form.Group>

                            <Button variant="primary" type="submit" className="w-100">
                                Reset Password
                            </Button>
                        </div>
                    )}
                </Form>
            )}


            <Modal show={showOtpSpamModal} onHide={handleHideOtpSpamModal}>
                <Modal.Header closeButton>
                    <Modal.Title>OTP Verification</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    You have tried to verify your OTP too many times.
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

            <Modal show={showEmailVerifiedModal} onHide={handleHideEmailVerifiedModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Password Reset - Email Verification Success</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    You have successfully verified your email
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleHideEmailVerifiedModal}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showEmailSentModal} onHide={handleHideEmailSentModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Verification Email</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    An email with a password reset link has been sent to you!
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleHideEmailSentModal}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    )
}

export default ForgetPassword