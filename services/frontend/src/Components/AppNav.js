import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { Link } from 'react-router-dom';
import { NavDropdown, Button } from 'react-bootstrap';

const AppNav = () => {
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

    return (
        /* 
        navbar should have some sort of conditional rendering to 
        show different nav items when user is logged in or out

        eg. sign up/login > sign out
        */

        <Navbar bg="primary" expand="lg" data-bs-theme='light' color='primary'>
            <Navbar.Brand as={Link} to="/home" style={{ marginLeft: '2vw' }}>
                <img
                    src='/Logo.webp'
                    width="120"
                    height="80"
                    alt="Logo"
                    className="d-inline-block align-top"
                />
            </Navbar.Brand>

            <Navbar.Toggle aria-controls="appnav-navbar-nav" />

            <Navbar.Collapse id="appnav-navbar-nav">
                <Nav style={{ fontSize: "25px" }} className="me-auto">
                    <Nav.Link as={Link} to="/transfer">
                        <Button style={{ fontSize: "25px" }} variant="primary">Transfer</Button>
                    </Nav.Link>
                    <Nav.Link as={Link} to="/transactions">
                        <Button style={{ fontSize: "25px" }} variant="primary">Transactions</Button>
                    </Nav.Link>
                    <Nav.Link as={Link} to="/profile">
                        <Button style={{ fontSize: "25px" }} variant='primary'> Profile</Button>
                    </Nav.Link>
                    {/* <NavDropdown title="Profile" id="navBarScrollingDropdown">
                        <NavDropdown.Item as={Link} to="/profile" style={{ fontSize: "20px", color: "black" }}>
                            View Profile
                        </NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/change-password" style={{ fontSize: "20px", color: "black" }}>
                            Change Password
                        </NavDropdown.Item> */}
                    {/* <NavDropdown.Divider />
                        <NavDropdown.Item as={Link} to="/" style={{ fontSize: "20px", color: "black" }}>
                            Sign Out
                        </NavDropdown.Item> */}
                    {/* </NavDropdown> */}
                </Nav>

                <Nav>
                    <Nav.Link as={Link} to="/" onClick={logoutEndpoint} style={{ fontSize: "25px", marginRight: '2vw' }}>
                        Sign Out
                    </Nav.Link>
                </Nav>
            </Navbar.Collapse>

        </Navbar >
    )
}

export default AppNav;