import React, { useEffect } from 'react';
import { Form, Container, Row, Col, Card, Button, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Link } from 'react-router-dom';
import './Profile.css';
import { faL } from '@fortawesome/free-solid-svg-icons';
import { sendVerificationEmail } from '../Services/EmailService';
import { sendOtp } from '../Services/VerifyUser';

const Profile = () => {
    // const token = sessionStorage.getItem('token');
    const nameRegex = /^[A-Za-z\s]+$/;
    const regex = /^[0-9]*$/;

    // ensure that phone number is 8 digits, unique, and not empty
    // ensure that email is unique and not empty

    // use the endpoint login-2fa to send token to user email and verify otp 
    // 
    const [userData, setUserData] = React.useState(
        {
            fullName: "",
            dateOfBirth: "",
            email: "",
            phoneNumber: "",
            address_block: "",
            address_street: "",
            address_building: "",
            address_postal: "",
            address_unit_floor: "",
            address_unit_number: "",
        }
    );
    const [isEditing, setIsediting] = React.useState(false);
    const [show, setShow] = React.useState(false);
    const [OtpData, setOtpData] = React.useState('')
    const [isOtpVerified, setIsOtpVerified] = React.useState(false);
    const [passwordButton, setPasswordButton] = React.useState(false);


    const navigate = useNavigate()


    // send the otp token to user email
    const handleEditProfile = () => {
        setShow(true);
        sendOtp(userData.email);
    }

    const handlePasswordChange = () => {
        setShow(true)
        sendOtp(userData.email)
        setPasswordButton(true)
    }

    useEffect(() => {
        if (isOtpVerified) {
            setIsediting(!isEditing);
        }
    }, [isOtpVerified])

    const handleClose = () => setShow(false);

    // send req to backend to update user data
    const saveChanges = async () => {
        try {
            const updatedData = {
                fullName: userData.fullName,
                email: userData.email,
                phoneNumber: userData.phoneNumber,
                address_block: userData.address_block,
                address_street: userData.address_street,
                address_building: userData.address_building,
                address_postal: userData.address_postal,
                address_unit_floor: userData.address_unit_floor,
                address_unit_number: userData.address_unit_number,
            };
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/users/update`, {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            })

            if (response.ok) {
                setIsediting(false);
                // console.log("updated user data successfully");
                alert("Changes saved  succesfully")
            }
            else {
                console.error("failed to update user data ", response.status);
            }
        } catch (error) {
            console.error(error)
        }
    }

    const cancelChanges = () => {
        setIsediting(false);
        window.location.reload();
        // console.log("cancel changes")
    }


    const handleSubmitOtp = async () => {
        // console.log("otp data is " + OtpData)
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/users/verifyOtpSent`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: userData.email, userOtp: OtpData })
            }).then(response => {

                if (response.status === 200) {
                    if (passwordButton) {
                        navigate("/change-password")
                    }
                    else {
                        setIsOtpVerified(true);
                    }

                    setShow(false);
                    // console.log("otp verified successfully")
                }
                else {
                    alert("wrong OTP")
                }
            })
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/users/user-data-profile`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                });
                if (response.ok) {
                    const userData = await response.json();
                    setUserData(userData);
                    // console.log("user data is fetched successfully in profile page " + JSON.stringify(userData, null, 2))
                } else {
                    console.error("Failed to fetch user data in profile page")
                }

            } catch (error) {
                console.error(" Something wrong?? ", error)
            }

        }
        fetchUserData();

    }, [])

    function formatDate(inputDate) {
        const dateObject = new Date(inputDate);

        const year = dateObject.getFullYear();
        const month = (dateObject.getMonth() + 1).toString().padStart(2, "0"); // Adding 1 because months are zero-based
        const day = dateObject.getDate().toString().padStart(2, "0");

        return `${year}-${month}-${day}`;
    }
    return (
        <Container fluid>
            <Row>
                <Form>
                    <Card >
                        <Card.Header className='fs-2'>Personal Information</Card.Header>
                        <Card.Body className='fs-4'>
                            <Form.Group className='mb-3' controlId='formFullName'>
                                <Form.Label>Full Name</Form.Label>
                                <Form.Control disabled type='text' placeholder='Enter your full name'
                                    value={userData ? userData.fullName : "loading..."} readOnly={!isEditing}
                                    onChange={(e) => {
                                        if (isEditing) {
                                            const isValid = nameRegex.test(e.target.value);
                                            if (isValid) {
                                                setUserData({ ...userData, fullName: e.target.value })
                                            }
                                        }
                                    }}
                                />
                            </Form.Group>

                            <Form.Group className='mb-3' controlId='formDateOfBirth'>
                                <Form.Label>Date of Birth</Form.Label>
                                <Form.Control placeholder={userData ? formatDate(userData.dateOfBirth) : "loading..."} disabled />
                            </Form.Group>

                            <Form.Group className='mb-3' controlId='formEmail'>
                                <Form.Label>Email address</Form.Label>
                                <Form.Control disabled type='email' placeholder='Enter email'
                                    value={userData ? userData.email : "loading..."} readOnly={!isEditing}
                                    onChange={(e) => {
                                        if (isEditing) {
                                            setUserData({ ...userData, email: e.target.value })
                                        }
                                    }}
                                />
                            </Form.Group>

                            <Form.Group className='mb-3' controlId='formMobileNumber'>
                                <Form.Label>Mobile Number</Form.Label>
                                <Form.Control type='text' placeholder='Enter your mobile number'
                                    value={userData ? userData.phoneNumber : "loading..."} readOnly={!isEditing}
                                    onChange={(e) => {
                                        if (isEditing) {
                                            const isValid = regex.test(e.target.value);
                                            if (isValid) {
                                                setUserData({ ...userData, phoneNumber: e.target.value });
                                            }
                                        }
                                    }}
                                />
                            </Form.Group>
                        </Card.Body>
                    </Card>

                    <Card>
                        <Card.Header className='fs-2'>Address Information</Card.Header>
                        <Card.Body className='fs-4'>
                            <Row md={8}>
                                <Col>
                                    <Form.Group className='mb-3' controlId='formBlock'>
                                        <Form.Label>Block Number</Form.Label>
                                        <Form.Control type='text' placeholder='Enter your block number'
                                            value={userData ? userData.address_block : "loading..."} readOnly={!isEditing}
                                            onChange={(e) => {
                                                if (isEditing) {
                                                    const isValid = regex.test(e.target.value);
                                                    if (isValid) {
                                                        setUserData({ ...userData, address_block: e.target.value })
                                                    }
                                                }
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col>
                                    <Form.Group className='mb-3' controlId='formStreet'>
                                        <Form.Label>Street </Form.Label>
                                        <Form.Control type='text' placeholder='Enter your street name'
                                            value={userData ? userData.address_street : "loading..."} readOnly={!isEditing}
                                            onChange={(e) => {
                                                if (isEditing) {

                                                    setUserData({ ...userData, address_street: e.target.value })

                                                }
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Form.Group className='mb-3' controlId='formBuilding'>
                                        <Form.Label> Building</Form.Label>
                                        <Form.Control type='text' placeholder='Enter your building name'
                                            value={userData ? userData.address_building : "loading..."} readOnly={!isEditing}
                                            onChange={(e) => {
                                                if (isEditing) {
                                                    const isValid = regex.test(e.target.value);
                                                    if (isEditing) {

                                                        setUserData({ ...userData, address_building: e.target.value })
                                                    }

                                                }
                                            }}
                                        />
                                    </Form.Group>
                                </Col>

                                <Col>
                                    <Form.Group className='mb-3' controlId='formPostalCode'>
                                        <Form.Label>Postal Code</Form.Label>
                                        <Form.Control type='text' placeholder='Enter your postal code'
                                            value={userData ? userData.address_postal : "loading..."} readOnly={!isEditing}
                                            onChange={(e) => {
                                                if (isEditing) {
                                                    const isValid = regex.test(e.target.value);
                                                    if (isValid) {
                                                        setUserData({ ...userData, address_postal: e.target.value })
                                                    }
                                                }
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Form.Group className='mb-3' controlId='formFloor'>
                                        <Form.Label>Floor</Form.Label>
                                        <Form.Control type='text' placeholder='Enter your Floor number'
                                            value={userData ? userData.address_unit_floor : "loading..."} readOnly={!isEditing}
                                            onChange={(e) => {
                                                if (isEditing) {
                                                    const isValid = regex.test(e.target.value);
                                                    if (isValid) {
                                                        setUserData({ ...userData, address_unit_floor: e.target.value })
                                                    }
                                                }
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col>
                                    <Form.Group className='mb-3' controlId='formUnitNumber'>
                                        <Form.Label>Unit Number</Form.Label>
                                        <Form.Control type='text' placeholder='Enter your unit number'
                                            value={userData ? userData.address_unit_number : "loading..."} readOnly={!isEditing}
                                            onChange={(e) => {
                                                if (isEditing) {
                                                    const isValid = regex.test(e.target.value);
                                                    if (isValid) {
                                                        setUserData({ ...userData, address_unit_number: e.target.value })
                                                    }
                                                }
                                            }
                                            }
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Form>
            </Row>
            <Row className="mb-2 profileButtons">
                <Col md={3}>
                    {isEditing ? (
                        <Button className='fs-4' variant="success" onClick={saveChanges}>
                            Save Changes
                        </Button>
                    ) : (
                        <div>
                            <Button className='fs-4' variant="primary" onClick={handleEditProfile}>
                                {isEditing ? 'Cancel' : 'Edit Profile'}
                            </Button>

                        </div>
                    )}

                    <Modal show={show} onHide={handleClose} animation={true} size='lg' aria-labelledby='contained-modal-title-vcenter' centered>
                        <Modal.Header closeButton>
                            <Modal.Title id='contained-modal-title-vcenter'>OTP Verification</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            An OTP has been sent to your email.
                            <Form.Group className='mb-3' controlId='formOTP'>
                                <Form.Label>Please verify your token</Form.Label>
                                <Form.Control type='number' placeholder='Enter your OTP number'
                                    value={OtpData}
                                    onChange={(e) => {
                                        setOtpData(e.target.value)
                                    }} />

                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={handleSubmitOtp}>
                                Submit
                            </Button>
                        </Modal.Footer>
                    </Modal>
                </Col>
                {isEditing && (
                    <Col md={3}>
                        <Button className='fs-4' variant='danger' onClick={cancelChanges}>
                            Cancel
                        </Button>
                    </Col>
                )}

                <Col md={3}>{
                    isEditing ? (
                        <>
                            {/* <Button className='fs-4 disabled' variant="danger" as={Link} to="/change-password" disabled style={{ display: 'none' }}>Change Password</Button> */}
                        </>
                    ) : <div>
                        <Button className='fs-4' variant='danger' onClick={handlePasswordChange} >Change Password</Button>
                        <Modal show={show} onHide={handleClose} animation={true} size='lg' aria-labelledby='contained-modal-title-vcenter' centered>
                            <Modal.Header closeButton>
                                <Modal.Title id='contained-modal-title-vcenter'>OTP Verification</Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                An OTP has been sent to your email.
                                <Form.Group className='mb-3' controlId='formOTP'>
                                    <Form.Label>Please verify your token</Form.Label>
                                    <Form.Control type='number' placeholder='Enter your OTP number'
                                        value={OtpData}
                                        onChange={(e) => {
                                            setOtpData(e.target.value)
                                        }} />

                                </Form.Group>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button variant="secondary" onClick={handleClose}>
                                    Cancel
                                </Button>
                                <Button variant="primary" onClick={handleSubmitOtp}>
                                    Submit
                                </Button>
                            </Modal.Footer>
                        </Modal>
                    </div>


                }
                </Col>
            </Row>
        </Container >
    );
};

export default Profile;
