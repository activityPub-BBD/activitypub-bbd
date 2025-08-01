import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import "../styles/LandingPage.css";

export default function ChirpLanding() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { setUser, setJwt, user } = useAuthContext();
  const navigate = useNavigate();

  // Redirect if user is already authenticated and has username
  useEffect(() => {
    if (user && user.username) {
      navigate('/home');
    }
  }, [user, navigate]);

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError("");

    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;
      const scope = 'openid email profile';
      
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}`;

      window.location.href = googleAuthUrl;
      
    } catch (error) {
      console.error('Google auth initiation failed:', error);
      setError('Failed to start Google authentication');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle the callback from Google OAuth
  useEffect(() => {
    const handleGoogleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      
      if (error) {
        setError(`Google OAuth error: ${error}`);
        return;
      }
      
      if (code) {
        setIsLoading(true);
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/auth`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
          });

          const data = await response.json();

          if (response.ok) {
            setJwt(data.jwt);
            setUser(data.user);
            navigate('/home');
            
          } else {
            setError(data.error || 'Authentication failed');
          }
        } catch (error) {
          console.error('Auth callback failed:', error);
          setError('Authentication failed');
        } finally {
          setIsLoading(false);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    handleGoogleCallback();
  }, [setJwt, setUser, navigate]);

  return (
    <div className="landing-container">
      {/* Image Showcase Section */}
      <div className="showcase-section">
        <img
          src="chirp-landing-logo.png"
          alt="Chirp Logo"
          className="landing-logo"
        />
      </div>
      
      {/* Auth Section */}
      <div className="auth-section">
        <div className="auth-container">
            <>
              <div className="logo-container">
                <h1 className="auth-logo">Get Started</h1>
              </div>

              <div className="auth-form-container">
                {error && <div className="error-message">{error}</div>}
                <button
                  onClick={handleGoogleAuth}
                  className="google-button"
                  disabled={isLoading}
                >
                  <img src={"https://img.icons8.com/color/48/000000/google-logo.png"} alt={"Google icon"} />
                  {isLoading ? 'Signing in...' : 'Sign in with Google'}
                </button>
              </div>
            </>
        </div>
      </div>
      
      <div
        style={{
          position: "absolute",
          bottom: 0,
          width: "100%",
          textAlign: "center",
          padding: "1rem 0",
          fontSize: "0.9rem",
          color: "#555",
        }}
      >
        © {new Date().getFullYear()} Chirp. All rights reserved.
      </div>
    </div>
  );
}