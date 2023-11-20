import React, { useEffect, useState } from "react";
import { Form, Button, Container, Row, Col, Modal } from "react-bootstrap";
import { sendOtp } from "../Services/VerifyUser";
import "../index.css";

const Transfer = () => {
  const [formData, setFormData] = useState({
    phoneNumber: "",
    amount: "",
    currency: "SGD",
  });

  const [sgdLimit, setSgdLimit] = useState("");
  const [myrLimit, setMyrLimit] = useState("");
  const [usdLimit, setUsdLimit] = useState("");

  const [change, setChange] = useState(true);
  const [initialSgd, setInitialSgd] = useState("");
  const [initialMyr, setInitialMyr] = useState("");
  const [initialUsd, setInitialUsd] = useState("");
  const [transactionKeypair, setTransactionKeypair] = useState([]);

  const [show, setShow] = useState(false);
  const [OtpData, setOtpData] = useState("");
  const [disabledBox, setDisabledBox] = useState(true);
  const [email, setEmail] = useState("");
  const [send, setSend] = useState(false);

  const handleClose = () => setShow(false);

  const handleLimitChange = () => {
    setShow(true);
    sendOtp(email);
  };

  useEffect(() => {
    // console.log(send);
  }, [send]);

  const handleSubmitOtp = async () => {
    // Retrieve the token from sessionStorage
    // const jwtToken = sessionStorage.getItem("token");
    // console.log("otp data is " + OtpData);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/users/verifyOtpSent`,
        {
          method: "POST",
          credentials: 'include',
          headers: {
            "Content-type": "application/json"
          },
          body: JSON.stringify({ email: email, userOtp: OtpData }),
        }
      ).then((response) => {
        if (response.status === 200) {
          //if send is true means it's clicked, else it's change limit clicked
          if (send) {
            proceedWithTransaction();
          } else {
            //enable dropdown box
            setDisabledBox(false);
          }
          setShow(false);
          // console.log("otp verified successfully");
          setSend(false);
        } else {
          alert("wrong OTP");
        }
      });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Retrieve the token from sessionStorage
        // const jwtToken = sessionStorage.getItem("token");
        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/users/user-data-transfer`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json"
            },
          }
        );
        if (response.ok) {
          const user = await response.json();
          setEmail(user.email);
        } else {
          console.error("Failed to fetch user data in profile page");
        }
      } catch (error) {
        console.error(" Something wrong?? ", error);
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    // Define a function to fetch the limits
    const fetchLimits = async () => {
      try {
        // Retrieve the token from sessionStorage
        // const jwtToken = sessionStorage.getItem("token");

        const keypairResponse = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/transactions/get-transaction-keypair`,
          {
            credentials: 'include',
            headers: {
              // Authorization: `Bearer ${jwtToken}`,
            },
          }
        );

        setTransactionKeypair(keypairResponse.json());

        // Note: Add the necessary headers or configurations needed for your request
        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/transactions/get-limit`,
          {
            credentials: 'include',
            headers: {
              // Authorization: `Bearer ${jwtToken}`,
            },
          }
        );

        // Set the limits in state
        const data = await response.json();
        setSgdLimit(data.SGD);
        setInitialSgd(data.SGD);
        setMyrLimit(data.MYR);
        setInitialMyr(data.MYR);
        setUsdLimit(data.USD);
        setInitialUsd(data.USD);
      } catch (error) {
        console.error("An error occurred while fetching the limits:", error);
      }
    };

    // Call the fetch function
    fetchLimits();
  }, []);

  useEffect(() => {
    setChange(
      Number(sgdLimit) === Number(initialSgd) &&
        Number(myrLimit) === Number(initialMyr) &&
        Number(usdLimit) === Number(initialUsd)
        ? true
        : false
    );
  }, [sgdLimit, myrLimit, usdLimit, initialSgd, initialMyr, initialUsd]);

  const handleAmountChange = (e) => {
    const value = e.target.value;

    // Regular expression to match the pattern
    const pattern = /^(\d{1,5}(\.\d{0,2})?|\.?\d{1,2})$/;

    if (value === "" || pattern.test(value)) {
      setFormData((prevData) => ({
        ...prevData,
        amount: value,
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleKeyPress = (e, maxLength) => {
    if (
      !/^[0-9]*?[0-9]*$/.test(e.key) ||
      (maxLength && e.target.value.length >= maxLength)
    ) {
      e.preventDefault();
    }
  };

  const handleAmountBlur = (e) => {
    let value = e.target.value;

    // If value contains a dot and no digits after the dot, format it
    if (/^\d+\.$/.test(value)) {
      value = `${value}00`;
    } else if (/^\d+\.\d$/.test(value)) {
      value = `${value}0`;
    }

    setFormData((prevData) => ({
      ...prevData,
      amount: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.amount > 1000) {
      setSend(true);
      setShow(true);
      sendOtp(email);
      return; // Stop the execution here, and wait for OTP verification
    }

    // If amount <= 1000, or after OTP is verified, then proceed
    proceedWithTransaction();
  };

  const proceedWithTransaction = async () => {
    try {
      // Retrieve the token from sessionStorage
      // const jwtToken = sessionStorage.getItem("token");

      // Structure the transaction data
      const transactionData = {
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        dateTime: new Date().toISOString(), // current dateTime in ISO format
        phoneNumber: formData.phoneNumber
      };

      // console.log(transactionData)

      // POST request to add a send and receive transaction
      const addResponse = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/transactions/add-transaction`,
        {
          method: "POST",
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(transactionData)
        }
      );
      if (!addResponse.ok) {
        // Get the error message from the JSON body
        const errorData = await addResponse.json();
        alert(errorData.msg); // Alert the error message
        throw new Error("Failed to add sender transaction.");
      } else {
        alert("Transfer successful!");
      }
      setFormData({ phoneNumber: "", amount: "", currency: "SGD" });
    } catch (error) {
      console.error(error);
    }
  };

  const handleChangeLimit = async (e) => {
    e.preventDefault();

    try {
      // Retrieve the token from sessionStorage
      // const jwtToken = sessionStorage.getItem("token");

      // Structure the transaction data
      const limitData = {
        newSgd: sgdLimit,
        newMyr: myrLimit,
        newUsd: usdLimit,
      };

      // PATCH req to change limit
      const changeResponse = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/transactions/change-limit`,
        {
          method: "PATCH",
          credentials: 'include',
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(limitData),
        }
      );
      if (!changeResponse.ok) {
        // Get the error message from the JSON body
        const errorData = await changeResponse.json();
        alert(errorData.msg); // Alert the error message
        throw new Error("Failed to update limit.");
      } else {
        setInitialSgd(sgdLimit);
        setInitialMyr(myrLimit);
        setInitialUsd(usdLimit);
        alert("Limits updated.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Container className="transfer-container" fluid>
      <Form onSubmit={handleSubmit}>
        <h2>Transfer:</h2>
        <Form.Group className="mb-3">
          <Form.Label>Phone Number of Recipient (+65):</Form.Label>
          <Form.Control
            type="text"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            onKeyPress={(e) => handleKeyPress(e, 8)}
            onPaste={(e) => e.preventDefault()}
            placeholder="E.g. 80088008"
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Amount:</Form.Label>
          <Form.Control
            type="text"
            name="amount"
            value={formData.amount}
            onChange={handleAmountChange}
            onPaste={(e) => e.preventDefault()}
            onBlur={handleAmountBlur} // Format the value when input loses focus
            placeholder="E.g. 123"
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Row>
            <Col md={2} className="align-self-center">
              <Form.Label>Currency:</Form.Label>
            </Col>
            <Col md={3}>
              <Form.Select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="center-text"
              >
                <option value="SGD">SGD</option>
                <option value="MYR">MYR</option>
                <option value="USD">USD</option>
              </Form.Select>
            </Col>
          </Row>
        </Form.Group>

        <Button variant="primary" type="submit">
          Send
        </Button>
      </Form>
      <Container className="mt-5">
        <h2>Transfer Limit:</h2>
        <Form>
          <Row className="mb-3">
            <Button
              className="fs-5"
              variant="primary"
              onClick={handleLimitChange}
            >
              Change Limit
            </Button>
            <Modal
              show={show}
              onHide={handleClose}
              animation={true}
              size="lg"
              aria-labelledby="contained-modal-title-vcenter"
              centered
            >
              <Modal.Header closeButton>
                <Modal.Title id="contained-modal-title-vcenter">
                  OTP Verification
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                An OTP has been sent to your email.
                <Form.Group className="mb-3" controlId="formOTP">
                  <Form.Label>Please verify your token</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Enter your OTP number"
                    value={OtpData}
                    onChange={(e) => {
                      setOtpData(e.target.value);
                    }}
                  />
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
            <Col>
              <Form.Label>SGD Limit</Form.Label>
              <Form.Select
                disabled={disabledBox}
                onChange={(e) => {
                  setSgdLimit(e.target.value);
                }}
                value={sgdLimit}
              >
                <option value="1000">1000</option>
                <option value="2000">2000</option>
                <option value="5000">5000</option>
                <option value="10000">10000</option>
              </Form.Select>
            </Col>
            <Col>
              <Form.Label>MYR Limit</Form.Label>
              <Form.Select
                disabled={disabledBox}
                onChange={(e) => {
                  setMyrLimit(e.target.value);
                }}
                value={myrLimit}
              >
                <option value="1000">1000</option>
                <option value="2000">2000</option>
                <option value="5000">5000</option>
                <option value="10000">10000</option>
              </Form.Select>
            </Col>
            <Col>
              <Form.Label>USD Limit</Form.Label>
              <Form.Select
                disabled={disabledBox}
                onChange={(e) => setUsdLimit(e.target.value)}
                value={usdLimit}
              >
                <option value="1000">1000</option>
                <option value="2000">2000</option>
                <option value="5000">5000</option>
                <option value="10000">10000</option>
              </Form.Select>
            </Col>
          </Row>
          <Button
            variant="primary"
            type="button"
            onClick={handleChangeLimit}
            disabled={change}
          >
            Make Changes
          </Button>
        </Form>
      </Container>
    </Container>
  );
};

export default Transfer;
