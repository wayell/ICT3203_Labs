import React from "react";
import { useState, useEffect } from "react";
import { Container, Row, Col } from "react-bootstrap";

const EmailVerificationResult = () => {
    const [isEmailVerified, setIsEmailVerified] = useState(false)

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const result = urlParams.get('result');
        setIsEmailVerified(result === 'true');
    }, []);

    return (
        <Container fluid style={{ height: '100vh' }}>
            <Row className="justify-content-center align-items-center" style={{ height: '50%' }}>
                <Col xs={12} className="text-center">
                    {
                        isEmailVerified ?
                            <h2>
                                Your email has been verified successfully! <br />
                                You may close this page and return to the registration process.
                            </h2>
                            :
                            <h2>
                                The token for your email verification has expired. <br />
                                You may close this page and request for another verification link to be sent to your email.
                            </h2>
                    }
                </Col>
            </Row>
        </Container>
    );
};

export default EmailVerificationResult;
