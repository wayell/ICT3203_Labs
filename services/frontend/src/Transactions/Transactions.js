import React, { useState, useEffect, useCallback } from "react";
import { utils, writeFile } from "xlsx";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import "bootstrap/dist/css/bootstrap.min.css";

function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [isWeekClicked, setWeekClicked] = useState(true);
  const [isMonthClicked, setMonthClicked] = useState(false);
  const [isYearClicked, setYearClicked] = useState(false);
  const [disableExport, setDisableExport] = useState(false); // State for export button
  const [loading, setLoading] = useState(true); // State for loading transactions
  const today = new Date();

  const getDateFromDaysAgo = (days) => {
    const date = new Date(today);
    date.setDate(date.getDate() - days);
    return (
      date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate()
    );
  };

  const [startDate, setStartDate] = useState(getDateFromDaysAgo(7)); // Default to the last week
  let dateToday = 0
  if (today.getDate() === 31) {
    dateToday = 31
  }
  else {

    dateToday = today.getDate() + 1

  }
  const end =
    today.getFullYear() +
    "-" +
    (today.getMonth() + 1) +
    "-" +
    (dateToday);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);

    // Retrieve the token from sessionStorage
    // const jwtToken = sessionStorage.getItem("token");

    try {
      // Include the token in the Authorization header
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/transactions/by-date-range?startDate=${startDate}&endDate=${end}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        // Check if the response is successful
        const data = await response.json();
        setTransactions(data);
      } else {
        console.error("Failed to fetch transactions");
      }
    } catch (error) {
      console.error("An error occurred while fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  }, [startDate, end]);

  // Fetch transactions when the component mounts and whenever fetchTransactions's start date changes
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  //Used for timing out export button so people can't spam
  useEffect(() => {
    if (disableExport) {
      const timer = setTimeout(() => setDisableExport(false), 30000); // 30000ms = 30secs
      return () => clearTimeout(timer); // Cleanup on component unmount
    }
  }, [disableExport]);

  const handleLastWeek = () => {
    setWeekClicked(true);
    setMonthClicked(false);
    setYearClicked(false);
    setStartDate(getDateFromDaysAgo(7));
  };

  const handleLastMonth = () => {
    setWeekClicked(false);
    setMonthClicked(true);
    setYearClicked(false);
    setStartDate(getDateFromDaysAgo(30));
  };

  const handleLastYear = () => {
    setWeekClicked(false);
    setMonthClicked(false);
    setYearClicked(true);
    setStartDate(getDateFromDaysAgo(365));
  };

  const handleExport = async () => {
    // const jwtToken = sessionStorage.getItem("token");
    
    // Create a new worksheet from the transactions data
    const ws = utils.json_to_sheet(
      transactions.map((transaction) => ({
        Date: new Date(transaction.dateTime).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        "Transaction Party": transaction.transactionParty,
        Type: transaction.type === "send" ? "Sent" : "Received",
        Amount: parseFloat(transaction.amount).toFixed(2),
        Currency: transaction.currency,
      }))
    );
    setDisableExport(true);

    // Create a new workbook with the worksheet
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Transactions");

    // Write the workbook to a file and trigger download
    writeFile(wb, "transactions.xlsx");

    await fetch(
      `${process.env.REACT_APP_API_BASE_URL}/transactions/log-export-transactions`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    ).then(res => {
      // if (res.status === 200)
        // console.log("Exported transaction history")
    })
  };

  return (
    <div className="container mt-4">
      <h1>Transaction History</h1>

      <h5>Browse your past Transactions</h5>
      <div className="d-flex justify-content-end mb-3 gap-2">
        <Button
          variant="primary"
          onClick={handleLastWeek}
          className="mr-2"
          disabled={isWeekClicked || loading}
        >
          Last Week
        </Button>
        <Button
          variant="primary"
          onClick={handleLastMonth}
          className="mr-2"
          disabled={isMonthClicked || loading}
        >
          Last Month
        </Button>
        <Button
          variant="primary"
          onClick={handleLastYear}
          className="mr-2"
          disabled={isYearClicked || loading}
        >
          Last Year
        </Button>
        <Button
          variant="success"
          onClick={handleExport}
          disabled={disableExport || loading || transactions?.length === 0}
        >
          Export
        </Button>
      </div>
      <Table bordered>
        <thead>
          <tr className="table-dark">
            <th className="center-text">Date</th>
            <th className="center-text">Transaction Party</th>
            <th className="center-text">Type</th>
            <th className="center-text">Amount</th>
            <th className="center-text">Currency</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(transactions) && transactions.length > 0 ? (
            transactions
              .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))
              .map((transaction) => (
                <tr
                  key={transaction._id}
                  className={
                    transaction.type === "send" ? "table-danger" : "table-info"
                  }
                >
                  <td className="center-text">
                    {new Date(transaction.dateTime).toLocaleDateString(
                      "en-GB",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </td>

                  <td className="center-text">
                    {transaction.transactionParty}
                  </td>
                  <td className="center-text">
                    {transaction.type === "send" ? "Sent" : "Received"}
                  </td>
                  <td className="center-text">
                    {parseFloat(transaction.amount).toFixed(2)}
                  </td>
                  <td className="center-text">{transaction.currency}</td>
                </tr>
              ))
          ) : (
            <tr>
              <td colSpan="5" className="center-text">
                No history available
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}

export default TransactionHistory;
