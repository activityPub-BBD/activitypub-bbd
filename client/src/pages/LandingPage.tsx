import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import "../styles/LandingPage.css";

export default function ChirpLanding() {
  const [showUsernameForm, setShowUsernameForm] = useState(false);
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { setUser, setJwt, setNeedsUsername, user, jwt } = useAuthContext();
  const navigate = useNavigate();

  // Redirect if user is already authenticated and has username
  useEffect(() => {
    if (user && user.displayName) {
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
            console.log(data.user);
            console.log(data.jwt);
            
            if (data.needsUsername) {
              setNeedsUsername(true);
              setShowUsernameForm(true);
            } else {
              setUser(data.user);
              navigate('/home');
            }
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
  }, [setJwt, setUser, setNeedsUsername, navigate]);

  const handleUsernameSubmit = async () => {
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    if (username.length < 3 || username.length > 20) {
      setError("Username must be between 3 and 20 characters");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/setup-displayName`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: username.trim(), 
          jwt 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setNeedsUsername(false);
        navigate('/home');
      } else {
        setError(data.error || 'Username setup failed');
      }
    } catch (error) {
      console.error('Username setup failed:', error);
      setError('Username setup failed');
    } finally {
      setIsLoading(false);
    }
  };

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
          {!showUsernameForm ? (
            <>
              <div className="logo-container">
                <h1 className="auth-logo">Get Started</h1>
              </div>

              <div className="auth-form-container">
                {error && <div className="error-message">{error}</div>}
                
                <button
                  onClick={handleGoogleAuth}
                  className="google-auth-button"
                  disabled={isLoading}
                >
                  <svg
                    className="google-icon"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                  >
                    <path
                      fill="#EA4335"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {isLoading ? 'Signing in...' : 'Sign in with Google'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="logo-container">
                <h1 className="auth-logo">Chirp</h1>
              </div>

              <div className="auth-form-container">
                <p className="username-prompt">Choose your username</p>
                
                {error && <div className="error-message">{error}</div>}
                
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="username-input"
                  disabled={isLoading}
                  maxLength={20}
                />
                
                <button
                  onClick={handleUsernameSubmit}
                  className="complete-button"
                  disabled={isLoading || !username.trim()}
                >
                  {isLoading ? 'Setting up...' : 'Complete Setup'}
                </button>
              </div>
            </>
          )}
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