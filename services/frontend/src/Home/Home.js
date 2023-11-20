import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Row, Col, Button } from "react-bootstrap";
import ChartCurrency from "./ChartCurrency";

const Home = () => {
    // const token = sessionStorage.getItem('token');

    const [accountData, setAccountDetails] = React.useState(
        {
            accountNumber: '',
            amountSgd: 0,
            amountUsd: 0,
            amountMyr: 0
        }
    );
    const [transactions, setTransactions] = React.useState(
        {
            type: '',
            transactionParty: '',
            amount: 0,
            currency: '',
            dateTime: ''
        }
    );

    const navigate = useNavigate()

    useEffect(() => {
        const fetchData = async () => {
            try {
                const responseAccount = await fetch(`${process.env.REACT_APP_API_BASE_URL}/bankaccounts/account`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (responseAccount.ok) {
                    const accountData = await responseAccount.json();
                    setAccountDetails(accountData);
                    // console.log("account details here: " + JSON.stringify(accountData, null, 2));
                } else {
                    console.error('Failed to fetch account details');
                    // navigate("/")
                }

                const responseTransactions = await fetch(`${process.env.REACT_APP_API_BASE_URL}/transactions/by-user-latest`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (responseTransactions.ok) {
                    const transaction = await responseTransactions.json();
           
                    setTransactions(transaction);
                    // console.log("Transaction details here: " + JSON.stringify(transaction, null, 2));
                } else {
                    console.error('Failed to fetch transactions');
                }


            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }
        fetchData();

    }, [])
    const firstTransaction = transactions[0] ? transactions[0] : null;


    useEffect(() => {
        // This will re-run whenever transactions change.
    }, [transactions]);

    const chartData = {
        labels: ['SGD', 'USD', 'MYR'],
        datasets: [
            {
                label: 'Value',
                backgroundColor: "#0069b4b3",
                borderColor: "#0069b4",
                borderWidth: 1,
                hoverBackgroundColor: "#0069b447",
                hoverBorderColor: "#0069b4",
                data: [accountData ? accountData.amountSgd : "loading",
                accountData ? accountData.amountUsd : "loading",
                accountData ? accountData.amountMyr : "loading"],
            },
        ],
    }

    return (
        <div>
            <Card>
                <Card.Header as="h2">Account Summary </Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={6}>
                            <p className="fs-3">Account Number: {accountData ? accountData.accountNumber : 'Loading...'}</p>
                            <p className="fs-3 font-weight-bold mt-5">Account Balances:</p>
                            <p className="fs-4"> Available Balance SGD: ${accountData ? accountData.amountSgd : 'Loading...'}</p>
                            <p className="fs-4"> Available Balance USD: ${accountData ? accountData.amountUsd : 'Loading...'} </p>
                            <p className="fs-4"> Available Balance MYR: ${accountData ? accountData.amountMyr : 'Loading...'} </p>
                        </Col>
                        <Col md={6}>
                            <ChartCurrency data={chartData} />
                        </Col>
                    </Row>

                </Card.Body>
            </Card>

            <Card>
                <Card.Header as="h2">Latest Transaction</Card.Header>
                <Card.Body>
                    {firstTransaction ? ( // Check if firstTransaction exists
                        <Row>
                            <Col md={6}>
                                <p className="fs-4">Transaction Type: {firstTransaction.type === 'send' ? "Sent" : "Received"}</p>
                            </Col>
                            <Col md={6}>
                                <p className="fs-4">{firstTransaction.type === 'send' ? "To" : "From"}: {firstTransaction.transactionParty}</p>
                            </Col>
                            <Col md={6}>
                                <p className="fs-4">
                                    Amount ${firstTransaction.currency}: {firstTransaction.amount}
                                </p>
                            </Col>
                        </Row>
                    ) : (
                        <p className="fs-4">Loading...</p>
                    )}
                </Card.Body>
            </Card>

            {/* <Button onClick={fetchUsers}></Button> */}

            {/* Other content for the Home component */}
        </div>


    );
};

export default Home;