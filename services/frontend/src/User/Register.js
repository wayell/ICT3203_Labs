import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { Alert, Modal, Tooltip, Overlay, Form, Button, Container, Card, Row, Col, OverlayTrigger } from 'react-bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons'

import { sendVerificationEmail } from '../Services/EmailService'

import { useSocket } from '../App'

const Register = () => {
    const socket = useSocket()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    const [phoneNumberExists, setPhoneNumberExists] = useState(false)

    const [showWrongOtpMessage, setShowWrongOtpMessage] = useState(false)
    const [showPhoneNumberExistsModal, setShowPhoneNumberExistsModal] = useState(false)

    const [isOtpSpammed, setIsOtpSpammed] = useState(false)
    const [showOtpSpamModal, setShowOtpSpamModal] = useState(false)

    const [isOtpGenerated, setIsOtpGenerated] = useState(false)
    const [showOtpEmailSentModal, setShowOtpEmailSentModal] = useState(false)

    const [isEmailVerified, setIsEmailVerified] = useState(false)
    const [showEmailVerifiedModal, setShowEmailVerifiedModal] = useState(false)

    const [isEmailSent, setIsEmailSent] = useState(false)
    const [showEmailSentModal, setShowEmailSentModal] = useState(false)

    const [isOtpVerified, setIsOtpVerified] = useState(false)
    const [showAccountRegisteredModal, setShowAccountRegisteredModal] = useState(false)

    const [isSendButtonDisabled, setIsSendButtonDisabled] = useState(false)
    const [isSendOtpButtonDisabled, setIsSendOtpButtonDisabled] = useState(false)
    const [isResendOtpButtonDisabled, setIsResendOtpButtonDisabled] = useState(false)

    const [isFormValid, setIsFormValid] = useState(false)

    const [showEnterValidAddressTooltip, setShowEnterValidAddressTooltip] = useState(false)
    const [showAlreadyExistsTooltip, setShowAlreadyExistsTooltip] = useState(false)

    const [showPassword, setShowPassword] = useState(false)

    const [step, setStep] = useState(1)

    // const [stepOneReg, setStepOneReg] = useState("")
    const [userOtp, setUserOtp] = useState("")
    const [hasUserAttemptedOtp, setHasUserAttemptedOtp] = useState(false)

    const maxRetries = 3  // Define maximum number of retries
    const [retryCount, setRetryCount] = useState(0)
    const [resendCount, setResendCount] = useState(0)

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword)
    }

    const target = useRef(null)
    const navigate = useNavigate()

    const [formData, setFormData] = useState({
        fullName: '',
        dateOfBirth: '',
        phoneNumber: '',
        email: '',
        password: '',
        address_block: '',
        address_street: '',
        address_unit_floor: '',
        address_unit_number: '',
        address_postal: '',
        address_building: ''
    })

    const [criteria, setCriteria] = useState({
        length: false
    })

    useEffect(() => {
        if (retryCount > 3)
            setIsOtpSpammed(true)
    }, [retryCount])

    useEffect(() => {
        if (resendCount > 3)
            setIsOtpSpammed(true)
    }, [resendCount])

    useEffect(() => {
        const checkFormValidity = () => {
            const { fullName, phoneNumber, email, dateOfBirth, password, address_street, address_postal } = formData

            if (fullName && phoneNumber && email && dateOfBirth && password && address_street
                && address_postal && isEmailVerified && phoneNumber.length <= 8) {
                setIsFormValid(true)
            } else {
                setIsFormValid(false)
            }
        }

        checkFormValidity()
    }, [formData, isEmailVerified])


    useEffect(() => {
        if (step === 2 && formData.email !== "") {
            handleHideEmailSentModal()
            handleHideEmailVerifiedModal()
            handleHideOtpEmailSentModal()

            fetch(`${process.env.REACT_APP_API_BASE_URL}/users/2fa-setup?email=${formData.email}`, {
                credentials: 'include',
            }).then(response => {
                if (response.status === 200)
                    setIsOtpGenerated(true)
                else
                    setIsOtpGenerated(false)
            })
        }
    }, [step, formData.email])

    useEffect(() => {
        if (phoneNumberExists) {
            handleShowPhoneNumberExistsModal()
        }
    }, [phoneNumberExists])

    useEffect(() => {
        if (isEmailVerified) {
            handleShowEmailVerifiedModal()
        }
    }, [isEmailVerified])

    useEffect(() => {
        if (isEmailSent) {
            handleShowEmailSentModal()
        }
    }, [isEmailSent])

    useEffect(() => {
        if (isOtpVerified) {
            handleShowAccountRegisteredModal()
        }
    }, [isOtpVerified])

    useEffect(() => {
        if (isOtpGenerated) {
            handleShowOtpEmailSentModal()
        }
    }, [isOtpGenerated])

    useEffect(() => {
        if (isOtpSpammed) {
            handleShowOtpSpamModal()

            setTimeout(() => {
                window.location.href = '/'  // Causes a full page reload
            }, 5000)
        }
    }, [isOtpSpammed])

    useEffect(() => {
        handleHideAccountRegisteredModal()
        handleHideEmailSentModal()
        handleHideOtpEmailSentModal()

        // Listener for the 'email-verified' event
        const handleEmailVerified = (data) => {
            // console.log(`Your email ${data.email} has been verified`)
            setIsEmailVerified(true)
            // navigate('/register')
        }
        socket.on('email-verified', handleEmailVerified)

        // Clean up the listener when the component is unmounted
        return () => {
            socket.off('email-verified', handleEmailVerified)
        }
    }, [socket])

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setIsSendButtonDisabled(false)
            setIsSendOtpButtonDisabled(false)
            setIsResendOtpButtonDisabled(false)
        }, 60000)

        return () => {
            clearTimeout(timeoutId)
        }
    }, [])

    const handleShowEmailVerifiedModal = () => {
        setShowEmailVerifiedModal(true)
    }

    const handleHideEmailVerifiedModal = () => {
        setShowEmailVerifiedModal(false)
    }

    const handleShowEmailSentModal = () => {
        setShowEmailSentModal(true)
    }

    const handleHideEmailSentModal = () => {
        setShowEmailSentModal(false)
    }

    const handleShowOtpEmailSentModal = () => {
        setShowOtpEmailSentModal(true)
    }

    const handleHideOtpEmailSentModal = () => {
        setShowOtpEmailSentModal(false)
    }

    const handleShowAccountRegisteredModal = () => {
        setShowAccountRegisteredModal(true)
    }

    const handleHideAccountRegisteredModal = () => {
        setShowAccountRegisteredModal(false)
    }

    const handleShowOtpSpamModal = () => {
        setShowOtpSpamModal(true)
    }

    const handleHideOtpSpamModal = () => {
        setShowOtpSpamModal(false)
    }

    const handleShowPhoneNumberExistsModal = () => {
        setShowPhoneNumberExistsModal(true)
    }

    const handleHidePhoneNumberExistsModal = () => {
        setShowPhoneNumberExistsModal(false)
    }

    const handleOtpChange = (e) => {
        setUserOtp(e.target.value)
    }

    const resendOtp = async () => {
        // Disable the button for 1 minute
        setIsResendOtpButtonDisabled(true)
        setIsSendOtpButtonDisabled(false)
        setIsEmailVerified(false)
        setIsEmailSent(false)
        setIsOtpVerified(false)

        if (step === 2 && formData.email !== "") {
            handleHideEmailSentModal()
            handleHideEmailVerifiedModal()
            handleHideOtpEmailSentModal()

            fetch(`${process.env.REACT_APP_API_BASE_URL}/users/2fa-setup?email=${formData.email}`, {
                credentials: 'include',
            }).then(response => {
                setResendCount(resendCount + 1)
            })
        }
    }

    const verifyUserOtp = async () => {

        // Disable the button for 1 minute
        setIsSendOtpButtonDisabled(true)
        setIsEmailVerified(false)
        setIsEmailSent(false)
        setIsOtpVerified(false)

        setTimeout(() => {
            setIsSendOtpButtonDisabled(false)
        }, 60000)  // 60000 milliseconds is 1 minute

        await fetch(`${process.env.REACT_APP_API_BASE_URL}/users/2fa-verify`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: formData.email,
                userOtp: userOtp,
            }),
        })
            .then(response => {
                if (response.status === 200) {
                    // console.log("otp verified")
                    createUser()
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


    const createUser = async () => {
        await fetch(`${process.env.REACT_APP_API_BASE_URL}/users/register`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...formData
            }),
        })
            .then(response => {
                if (response.status === 200) {
                    setIsOtpVerified(true)
                    // new user register here then create acc immedaiately
                    // redirect to landing page (that has login form) after 5s
                    setTimeout(() => {
                        navigate('/')
                    }, 5000)
                }

                // else
                //     response.text().then(text => console.log(text))
            })
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData({
            ...formData,
            [name]: value,
        })
    }

    const handleAlphabetsOnlyInputChange = (event) => {
        const onlyTextPattern = /^[a-zA-Z\s]*$/

        const { value } = event.target

        // If the value matches the onlyTextPattern (i.e., it contains only alphabets)
        if (onlyTextPattern.test(value) || value === "") { // also allow empty string for backspace/delete
            handleInputChange(event)
        }
    }

    const handleNumberOnlyInputChange = (event) => {
        const onlyNumbersPattern = /^[0-9]*$/

        const { value } = event.target

        // If the value matches the onlyNumbersPattern (i.e., it contains only numbers)
        if (onlyNumbersPattern.test(value) || value === "") { // also allow empty string for backspace/delete
            handleInputChange(event)
        }
        // else ignore the input
    }

    const handlePasswordChange = (event) => {
        const password = event.target.value
        setFormData({ ...formData, password: password })

        // Check password length
        const length = password.length >= 8

        setCriteria({ length })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (formData.phoneNumber.length > 8) {
            alert('Phone number should not be more than 8 characters long.');
            return;
        }

        if (step === 1) {
            // password stuff here

            // NIST breached password and phone number validation here through an endpoint
            await fetch(`${process.env.REACT_APP_API_BASE_URL}/users/validate-details`, {
                method: 'POST', // specify the HTTP method
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    password: formData.password,
                    phoneNumber: formData.phoneNumber
                })
            })
                .then(response => {
                    if (response.status === 200)
                        setStep(2)
                    else if (response.status === 400)
                        setPhoneNumberExists(true)
                    else if (response.status === 401)
                        alert("Password is not secure")
                    else
                        console.log("Server error")
                })
        }
    }

    const handleSendVerificationEmail = async () => {
        try {
            if (emailRegex.test(formData.email)) {

                // --------------------------------------------------------------- Revert after debugging!!! Remove the 4 lines below and uncomment the rest
                setIsEmailSent(true)
                setShowEnterValidAddressTooltip(false)
                setShowAlreadyExistsTooltip(false)
                setIsEmailVerified(false)

                // Disable the button for 1 minute
                 setIsSendButtonDisabled(true)
 
                 setTimeout(() => {
                     setIsSendButtonDisabled(false)
                 }, 60000)  // 60000 milliseconds is 1 minute
 
                 setShowEnterValidAddressTooltip(false)
                 setShowAlreadyExistsTooltip(false)
 
                 var statusCode = await sendVerificationEmail(formData.email)
 
                 // console.log(statusCode)
                 if (statusCode === 200) {
                     setIsEmailSent(true)
                     setShowEnterValidAddressTooltip(false)
                     setShowAlreadyExistsTooltip(false)
                     socket.emit('verify-email', { email: formData.email })
                 }
 
                 else {
                     setIsEmailSent(false)
                     alert("Error")
 
                     setShowEnterValidAddressTooltip(false)
                     setShowAlreadyExistsTooltip(true)
                     setTimeout(() => setShowAlreadyExistsTooltip(false), 5000)  // hide the tooltip after 5 seconds
                 } 

            } else {
                setShowEnterValidAddressTooltip(true)  // show the tooltip if email is invalid
                setTimeout(() => setShowEnterValidAddressTooltip(false), 5000)  // hide the tooltip after 5 seconds
            }
        } catch (error) {
            console.error('Failed to send verification email:', error)
        }
    }

    const renderPleaseVerifyTooltip = (props) => (
        <Tooltip id="button-tooltip" {...props}>
            Please verify your email and fill up all fields.
        </Tooltip>
    )

    const renderAnotherRequestTooltip = (props) => (
        <Tooltip id="button-tooltip" {...props}>
            You may only send requests every minute.
        </Tooltip>
    )

    return (
        <Container fluid>
            <Form onSubmit={handleSubmit} className="registration-form mx-auto mt-3">
                <Row className="mb-4">
                    <h4 className="mx-3">
                        {
                            step === 1 ? "Registration" : step === 2 ? "OTP Setup" : ""
                        }
                    </h4>
                </Row>

                {step === 1 && (
                    <div>
                        <Row className="mb-4">
                            {/* User Account Details */}
                            <Col md={7}>
                                <Card className="mx-3">
                                    <Card.Header as="h5">User Account Details</Card.Header>
                                    <Card.Body>
                                        <Form.Group controlId="formEmail">
                                            <Form.Label column sm="12">Email *</Form.Label>
                                            <Col sm="12">
                                                <Row>
                                                    <Col sm="7">
                                                        <div style={{ display: "flex", position: 'relative' }}>
                                                            <Form.Control
                                                                type="email"
                                                                placeholder="Enter your email"
                                                                name="email"
                                                                value={formData.email}
                                                                onChange={handleInputChange}
                                                                ref={target}
                                                                isInvalid={showEnterValidAddressTooltip}
                                                                required
                                                            />
                                                            {isEmailVerified && (  /* Conditionally render the check icon */
                                                                <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }}>
                                                                    <FontAwesomeIcon icon={faCheckCircle} />
                                                                </div>
                                                            )}
                                                        </div>


                                                        <Overlay target={target.current} show={showEnterValidAddressTooltip} placement="top">
                                                            {(props) => (
                                                                <Tooltip id="overlay-valid-address" {...props}>
                                                                    Please enter a valid email address.
                                                                </Tooltip>
                                                            )}
                                                        </Overlay>

                                                        <Overlay target={target.current} show={showAlreadyExistsTooltip} placement="top">
                                                            {(props) => (
                                                                <Tooltip id="overlay-already-exists" {...props}>
                                                                    A verification email has already been sent to you.
                                                                </Tooltip>
                                                            )}
                                                        </Overlay>
                                                    </Col>
                                                    <Col sm="5">
                                                        <OverlayTrigger
                                                            placement="right"
                                                            delay={{ show: 150, hide: 400 }}
                                                            overlay={renderAnotherRequestTooltip}
                                                            trigger={['hover', 'focus']}
                                                        >
                                                            <span className="d-inline-block" style={{ cursor: 'not-allowed' }}>
                                                                <Button
                                                                    onClick={handleSendVerificationEmail}
                                                                    disabled={isSendButtonDisabled}
                                                                >
                                                                    Send Verification Email
                                                                </Button>
                                                            </span>
                                                        </OverlayTrigger>
                                                    </Col>
                                                </Row>
                                            </Col>
                                        </Form.Group>

                                        <Form.Group controlId="formPassword" className="mt-3">
                                            <Form.Label>Password *</Form.Label>
                                            <div style={{ display: 'flex', gap: "1.5rem" }}>
                                                <Form.Control
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="Password"
                                                    name="password"
                                                    value={formData.password}
                                                    onChange={handlePasswordChange}
                                                    disabled={!isEmailVerified}
                                                    style={{ width: '57%' }}
                                                    minLength="8"
                                                    maxLength="64"
                                                    required
                                                />
                                                <Button
                                                    variant="outline-secondary"
                                                    onClick={togglePasswordVisibility}
                                                    hidden={!isEmailVerified}
                                                    style={{ flexShrink: 0 }}
                                                >
                                                    {showPassword ? "Hide" : "Show"}
                                                </Button>
                                            </div>

                                            <Form.Text className="password-criteria" hidden={!isEmailVerified}>
                                                <div>
                                                    At least 8 characters {criteria.length ? <FontAwesomeIcon icon={faCheckCircle} /> : ''}
                                                </div>
                                            </Form.Text>
                                        </Form.Group>
                                    </Card.Body>
                                </Card>
                            </Col>

                            {/* Personal Details */}
                            <Col md={5}>
                                <Card className="mx-3">
                                    <Card.Header as="h5">Personal Details</Card.Header>
                                    <Card.Body>
                                        <Form.Group controlId="formFullName">
                                            <Form.Label>Full Name *</Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="Enter your full name"
                                                name="fullName"
                                                value={formData.fullName}
                                                onChange={handleAlphabetsOnlyInputChange}
                                                disabled={!isEmailVerified}
                                                required
                                            />
                                        </Form.Group>

                                        <Form.Group controlId="formPhoneNumber" className="mt-3">
                                            <Form.Label>Phone Number (+65) *</Form.Label>
                                            <Form.Control
                                                type="tel"
                                                placeholder="Enter your phone number"
                                                name="phoneNumber"
                                                value={formData.phoneNumber}
                                                onChange={handleNumberOnlyInputChange}
                                                disabled={!isEmailVerified}
                                                maxLength="8"
                                                required
                                            />
                                        </Form.Group>

                                        <Form.Group controlId="formDateOfBirth" className="mt-3">
                                            <Form.Label>Date of Birth *</Form.Label>
                                            <Form.Control
                                                type="date"
                                                placeholder="Enter your date of birth"
                                                name="dateOfBirth"

                                                value={formData.dateOfBirth}
                                                onChange={handleInputChange}
                                                disabled={!isEmailVerified}
                                                required
                                            />
                                        </Form.Group>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        <Row className="mb-4" style={{ display: 'flex', alignItems: 'flex-end' }}>
                            {/* Address Details */}
                            <Col md={7}>
                                <Card className="mx-3">
                                    <Card.Header as="h5">Address Details</Card.Header>
                                    <Card.Body>
                                        <Row>
                                            {/* Left Column */}
                                            <Col>
                                                <Form.Group controlId="formAddressBlock">
                                                    <Form.Label>Block</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Enter your block no."
                                                        name="address_block"
                                                        value={formData.address_block}
                                                        onChange={handleInputChange}
                                                        disabled={!isEmailVerified}
                                                    />
                                                </Form.Group>

                                                <Form.Group controlId="formAddressStreet" className="mt-3">
                                                    <Form.Label>Street *</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Enter your street name"
                                                        name="address_street"
                                                        value={formData.address_street}
                                                        onChange={handleInputChange}
                                                        disabled={!isEmailVerified}
                                                        required
                                                    />
                                                </Form.Group>

                                                <Form.Group className="mt-3">
                                                    <Form.Label>Unit No.</Form.Label>
                                                    <Row>
                                                        <Col md={4}>
                                                            <Form.Group controlId="formAddressUnitFloor">
                                                                <Form.Control
                                                                    type="text"
                                                                    placeholder="Floor"
                                                                    name="address_unit_floor"
                                                                    value={formData.address_unit_floor}
                                                                    onChange={handleInputChange}
                                                                    disabled={!isEmailVerified}
                                                                />
                                                            </Form.Group>
                                                        </Col>
                                                        <Col xs="auto" className="my-auto">-</Col>
                                                        <Col md={4}>
                                                            <Form.Group controlId="formAddressUnitNumber">
                                                                <Form.Control
                                                                    type="text"
                                                                    placeholder="Unit"
                                                                    name="address_unit_number"
                                                                    value={formData.address_unit_number}
                                                                    onChange={handleInputChange}
                                                                    disabled={!isEmailVerified}
                                                                />
                                                            </Form.Group>
                                                        </Col>
                                                    </Row>
                                                </Form.Group>

                                            </Col>

                                            {/* Right Column */}
                                            <Col>
                                                <Form.Group controlId="formAddressPostal">
                                                    <Form.Label>Postal Code *</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Enter your postal code"
                                                        name="address_postal"
                                                        value={formData.postal}
                                                        onChange={handleNumberOnlyInputChange}
                                                        disabled={!isEmailVerified}
                                                        required
                                                    />
                                                </Form.Group>

                                                <Form.Group controlId="formAddressBuilding" className="mt-3">
                                                    <Form.Label>Building</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        placeholder="Enter your building name"
                                                        name="address_building"
                                                        value={formData.building}
                                                        onChange={handleInputChange}
                                                        disabled={!isEmailVerified}
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>
                            </Col>

                            <Col md={5} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <OverlayTrigger
                                    placement="right"
                                    delay={{ show: 150, hide: 400 }}
                                    overlay={renderPleaseVerifyTooltip}
                                    trigger={isFormValid ? [] : ['hover', 'focus']}
                                >
                                    <span style={{ display: 'inline-block' }}>
                                        <Button id="next_button"
                                            variant="primary"
                                            type="submit"
                                            disabled={!isFormValid}
                                            style={{ padding: '1rem 1rem', fontSize: '1.2rem' }}
                                        >
                                            Next <i className="fas fa-chevron-right"></i>
                                        </Button>
                                    </span>
                                </OverlayTrigger>
                            </Col>
                        </Row>
                    </div>
                )}

                {
                    step === 2 &&
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
                }


                <Modal show={showEmailSentModal} onHide={handleHideEmailSentModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>Verification Email</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        An email with a verification link has been sent to you!
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleHideEmailSentModal}>
                            Close
                        </Button>
                    </Modal.Footer>
                </Modal>

                <Modal show={showEmailVerifiedModal} onHide={handleHideEmailVerifiedModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>Email Verification Success</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        You have successfully verified your email!
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleHideEmailVerifiedModal}>
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

                <Modal show={showAccountRegisteredModal} onHide={handleHideAccountRegisteredModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>Account Registration Successful</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        You have successfully verified your OTP. An account has been registered with your particulars.
                        <div className="mt-3">Redirecting you to the login page in 5 seconds...</div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleHideAccountRegisteredModal}>
                            Close
                        </Button>
                    </Modal.Footer>
                </Modal>

                <Modal show={showPhoneNumberExistsModal} onHide={handleHidePhoneNumberExistsModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>Phone Number</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        A user with that phone number already exists!
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleHidePhoneNumberExistsModal}>
                            Close
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Form>
        </Container>
    )
}

export default Register