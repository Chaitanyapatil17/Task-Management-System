import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/taskApi";

function CreateAdmin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    setError("");
    setFieldErrors({});
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Validation logic
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm password";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    // Client-side validation
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setLoading(true);

      await API.post("/auth/admins", {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      alert("Admin created successfully");

      navigate("/admin/users");
    } catch (err) {
      console.error("Create admin error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to create admin"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">

      <div className="page-header">
        <div>
          <h1>Create Admin</h1>

          <p>
            Add a new admin user to the system
          </p>
        </div>
      </div>

      <div className="form-card">

        {error && (
          <div className="form-error-banner">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* Name field */}
          <div className="form-group">
            <label>Full Name</label>

            <input
              type="text"
              name="name"
              placeholder="Enter admin name"
              value={formData.name}
              onChange={handleChange}
              className={fieldErrors.name ? "input-error" : ""}
            />

            {fieldErrors.name && (
              <span className="form-error">
                {fieldErrors.name}
              </span>
            )}
          </div>

          {/* Email field */}
          <div className="form-group">
            <label>Email Address</label>

            <input
              type="email"
              name="email"
              placeholder="Enter admin email"
              value={formData.email}
              onChange={handleChange}
              className={fieldErrors.email ? "input-error" : ""}
            />

            {fieldErrors.email && (
              <span className="form-error">
                {fieldErrors.email}
              </span>
            )}
          </div>

          {/* Password field */}
          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              name="password"
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={handleChange}
              className={fieldErrors.password ? "input-error" : ""}
            />

            {fieldErrors.password && (
              <span className="form-error">
                {fieldErrors.password}
              </span>
            )}
          </div>

          {/* Confirm Password field */}
          <div className="form-group">
            <label>Confirm Password</label>

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={fieldErrors.confirmPassword ? "input-error" : ""}
            />

            {fieldErrors.confirmPassword && (
              <span className="form-error">
                {fieldErrors.confirmPassword}
              </span>
            )}
          </div>

          {/* Admin Role Info */}
          <div className="admin-info-banner">
            <strong>Note:</strong> This account will be created with <strong>Admin</strong> role and will have full access to manage users, tasks, and system settings.
          </div>

          <div className="form-actions">

            <button
              type="button"
              className="cancel-button"
              onClick={() =>
                navigate("/admin/users")
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading
                ? "Creating Admin..."
                : "Create Admin"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default CreateAdmin;
