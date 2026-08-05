import "./Register.css";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  Eye,
  EyeOff,
  Music,
} from "lucide-react";

import { register } from "../../services/auth";

function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] =
    useState("");

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
      await register(
        email,
        password,
        fullName
      );

      navigate("/");
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Registration failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-overlay">
        <div className="register-card">

          <div className="register-logo">
            <Music size={46} />

            <h1>Grove</h1>

            <p>
              Create your account
            </p>
          </div>

          <h2>Join Grove</h2>

          <form
            onSubmit={handleSubmit}
          >
            <label>
              Full Name
            </label>

            <input
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) =>
                setFullName(
                  e.target.value
                )
              }
              required
            />

            <label>
              Email
            </label>

            <input
              type="email"
              placeholder="example@email.com"
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
                placeholder="Password"
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
              <p className="register-error">
                {error}
              </p>
            )}

            <button
              className="register-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Creating Account..."
                : "Create Account"}
            </button>

          </form>

          <div className="register-footer">
            Already have an account?

            <Link to="/login">
              Log In
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Register;