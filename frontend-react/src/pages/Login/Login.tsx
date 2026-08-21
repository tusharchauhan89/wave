import "./Login.css";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  Eye,
  EyeOff,
} from "lucide-react";

import { login } from "../../services/auth";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await login(email, password);

      // After successful login,
      // go to the Grove home page.
      navigate("/");
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Login failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-overlay">

        <div className="login-card">

          <div className="login-logo">

            <img
              src="/grove-logo.png"
              alt="Grove"
              className="grove-logo-image"
            />

            <h1>Grove</h1>

            <p>
              Music for Everyone
            </p>

          </div>

          <h2>
            Welcome Back
          </h2>

          <form
            onSubmit={handleSubmit}
          >

            <label>
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              required
            />

            <label>
              Password
            </label>

            <div className="password-box">

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Enter password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>

            </div>

            {error && (
              <p className="login-error">
                {error}
              </p>
            )}

            <button
              className="login-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Signing In..."
                : "Log In"}
            </button>

          </form>

          <div className="login-footer">

            <span>
              Don't have an account?
            </span>

            <Link to="/register">
              Sign Up
            </Link>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;