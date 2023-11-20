import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

function PrivateRoute({ children }) {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {

    const middlewareCheck = async () => {
      await fetch(`${process.env.REACT_APP_API_BASE_URL}/users/middleware-check`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(async res => {
        if (res.status === 200) {
          await fetch(`${process.env.REACT_APP_API_BASE_URL}/transactions/update-receiver-balance`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          }).then(res => {
            if (res.status === 200)
              setIsAuthenticated(true);
          })
        }
        else {
          setIsAuthenticated(false)
        }
        setIsLoading(false);
      })
    };

    middlewareCheck();
  }, [location.pathname]); // This useEffect will run when the pathname changes

  if (isLoading) {
    return null; // or you could return a loading spinner or something
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}

export default PrivateRoute;