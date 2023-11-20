import './App.css'
import { Container, Button, Modal } from "react-bootstrap"

import React, { useState, useEffect, useRef, createContext, useContext } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom"

import Landing from './Landing/Landing'
import Home from './Home/Home'
import Register from './User/Register'
import EmailVerificationResult from './User/EmailVerificationResult'
import PREmailVerificationResult from './User/PREmailVerificationResult'
import ForgetPassword from './User/ForgetPassword'
import Profile from './User/Profile'
import ChangePassword from './User/ChangePassword'
import Transactions from './Transactions/Transactions'
import Transfer from './Transfer/Transfer'

import AppNav from './Components/AppNav'

import socket from './Services/MySocket'
import PrivateRoute from './Components/PrivateRoute'

// Create a context
export const SocketContext = createContext()

export const useSocket = () => {
  return useContext(SocketContext)
}

function App() {
  return (
    <div className="App-container">
      <SocketContext.Provider value={socket}>
        <Router>
          <AppContent />
        </Router>
      </SocketContext.Provider>
    </div>
  )
}

function AppContent() {
  useEffect(() => {

  }, [])

  const location = useLocation()

  const hideNavbarRoutes = ['/', '/register', '/email-verification-result', '/forget-password', '/forget-password-email-verification-result']

  const navigate = useNavigate()

  const [showAutomaticLogoutModal, setShowAutomaticLogoutModal] = useState(false)

  const handleShowAutomaticLogoutModal = () => {
    setShowAutomaticLogoutModal(true)
  }

  const handleHideAutomaticLogoutModal = () => {
    setShowAutomaticLogoutModal(false)
  }

  const handleLogOut = () => {
    const logoutEndpoint = async () => {
      try {
        // Make a POST request to your logout endpoint
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/users/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        }).then(response => {
          if (response.status === 200) {
            // console.log(response.data); // "User logged out"
            // Redirect or perform any other post-logout tasks here
          }
        })
      } catch (error) {
        console.error("Error during logout:", error);
      }
    }

    logoutEndpoint()
    // Redirect user to login or landing page
    navigate('/')

    handleHideAutomaticLogoutModal()
  }

  const timerRef = useRef(null)
  const logoutTimerRef = useRef(null)

  const paths = ['/home', '/profile', '/change-password', '/transactions', '/transfer']

  const [timersSet, setTimersSet] = useState(false);

  useEffect(() => {
    // If user navigates to any of the paths and timers are not set
    if (paths.includes(location.pathname) && !timersSet) {
      // Start a new timer
      timerRef.current = setTimeout(handleShowAutomaticLogoutModal, 840000);
      logoutTimerRef.current = setTimeout(handleLogOut, 900000);

      // Mark the timers as set
      setTimersSet(true);
    }

    // Clear the timers when the component is unmounted
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
      }
    }
  }, [location.pathname]);


  return (
    <>
      {!hideNavbarRoutes.includes(location.pathname) && <AppNav />}

      <div className="App-content">
        <Routes>
          <Route path='/' element={<Landing />} />
          <Route path='/home' element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path='/register' element={<Register />} />
          <Route path='/email-verification-result' element={<EmailVerificationResult />} />
          <Route path='/forget-password-email-verification-result' element={<PREmailVerificationResult />} />
          <Route path='/forget-password' element={<ForgetPassword />} />
          <Route path='/profile' element={<PrivateRoute><Profile /></PrivateRoute>} /> {/*<PrivateRoute><Profile /></PrivateRoute>*/}
          <Route path='/change-password' element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
          <Route path='/transactions' element={<PrivateRoute><Transactions /></PrivateRoute>} />
          <Route path='/transfer' element={<PrivateRoute><Transfer /></PrivateRoute>} />
        </Routes>
      </div>

      <Modal show={showAutomaticLogoutModal} onHide={handleHideAutomaticLogoutModal}>
        <Modal.Header closeButton>
          <Modal.Title>Automated Logout</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          You will be logged out in a minute, please log in again after the automated logout.
        </Modal.Body>
      </Modal>

      <footer className="mt-5 py-3 text-center bg-light">
        <Container>
          <p>&copy {new Date().getFullYear()} DB-SEIS. All rights reserved.</p>
        </Container>
      </footer>
    </>
  )
}

export default App