import { Button, Card, Col, Container, Form, Row, Modal } from "react-bootstrap";
import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

const ChangePassword = () => {
    // const token = sessionStorage.getItem('token');
    const [isPasswordValid, setIsPasswordValid] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [FormData, setFormData] = useState({
        password: '',
        confirmPassword: '',
        currentPassword: ''
    });

    const renderToolTip = (props) => (
        < Tooltip id="password-tooltip" {...props}>
            Password Does not Match
        </Tooltip >
    )


    const navigate = useNavigate();

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    }

    const passwordOk = (password) => {
        return password.length >= 8;
    }

    const handleCurrentPassword = (e) => {
        const currentPassword = e.target.value;
        setFormData({ ...FormData, currentPassword: currentPassword });
    }

    const handlePasswordChange = (e) => {
        const newPassword = e.target.value;
        const isBothValid = newPassword === FormData.confirmPassword && passwordOk(newPassword);
        setFormData({ ...FormData, password: newPassword });
        setIsPasswordValid(isBothValid);
    }

    const handleConfirmPassword = (e) => {
        const confirmPassword = e.target.value;
        const isBothValid = confirmPassword === FormData.password && passwordOk(confirmPassword);
        setFormData({ ...FormData, confirmPassword: confirmPassword });
        setIsPasswordValid(isBothValid);
    }

    const handleSubmitPwd = async () => {
        try {
            // const password = { password: FormData.password }
            // const confirmNewPassword = { confirmNewPassword: FormData.confirmPassword };

            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/users/change-password`, {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify({ password: FormData.password, confirmNewPassword: FormData.confirmPassword, currentPassword: FormData.currentPassword })
            });

            if (response.status === 200) {
                alert('Password has been changed successfully!');
                setFormData({ password: '', confirmPassword: '' });
                setIsPasswordValid(false); // Reset password validity
                navigate('/profile')
            } else {
                if (response.status === 403) {
                    alert('Password has been breached before, please try another one!')
                }
                else {
                    alert('Password change failed! Try again later');
                }
            }
        } catch (error) {
            console.error(error);
        }
    }


    return (
        <div>
            <Container fluid className="w-50">
                <Card className="mt-6">
                    <Card.Header className='fs-3'>Change Password</Card.Header>
                    <Card.Body className="fs-4">
                        <Form>
                            <Form.Group controlId="formCurrentPassword">
                                <Form.Label>Current Password</Form.Label>
                                <Form.Control
                                    className="col-6 mb-3"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter your current password"
                                    value={FormData.currentPassword}
                                    onChange={(e) => { handleCurrentPassword(e) }}
                                    minLength="8"
                                    required
                                />
                                <Form.Text className="text-muted fs-6">
                                </Form.Text>

                            </Form.Group>

                            <Form.Group controlId="formPassword">
                                <Form.Label>New Password</Form.Label>
                                <Form.Control
                                    className="col-6 mb-3"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter a new password"
                                    value={FormData.password}
                                    onChange={(e) => { handlePasswordChange(e) }}
                                    minLength="8"
                                    required
                                />
                                <Form.Text className="text-muted fs-6">
                                </Form.Text>

                            </Form.Group>

                            <Form.Group controlId="formConfirmPassword">
                                <Form.Label>Confirm New Password</Form.Label>
                                <Form.Control
                                    className="col-6"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Confirm your new password"
                                    value={FormData.confirmPassword}
                                    onChange={(e) => handleConfirmPassword(e)}
                                    minLength="8"
                                    required
                                />
                                <Form.Text className="text-muted fs-6">
                                    Passwords must be at least 8 characters long.
                                </Form.Text>
                            </Form.Group>

                        </Form>
                        <Row>
                            <Col md={3} className="text-center ">
                                <OverlayTrigger
                                    placement="left"
                                    delay={{ show: 250, hide: 400 }}
                                    overlay={renderToolTip}
                                    show={!isPasswordValid}
                                >
                                    <Button
                                        className='mt-3 mx-auto'
                                        variant="primary"
                                        type="submit"
                                        disabled={!isPasswordValid}
                                        onClick={handleSubmitPwd}
                                    >
                                        Change Password
                                    </Button>
                                </OverlayTrigger>

                            </Col>

                            <Col md={3} className="text-center">
                                <Button
                                    className='mt-3 mx-auto'
                                    variant="secondary"
                                    onClick={togglePasswordVisibility}
                                >
                                    {showPassword ? 'Hide Password' : 'Show Password'}
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            </Container>

        </div>
    );
};

export default ChangePassword;
