import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/taskApi";

function CreateUser() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.password
    ) {
      alert("All fields are required");
      return;
    }

    try {
      setLoading(true);

      await API.post("/auth/users", formData);

      alert("User created successfully");

      navigate("/admin/users");
    } catch (error) {
      console.error("Create user error:", error);

      alert(
        error.response?.data?.message ||
          "Failed to create user"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">

      <div className="page-header">
        <div>
          <h1>Create User</h1>

          <p>
            Add a new user to the system
          </p>
        </div>
      </div>

      <div className="form-card">

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Name</label>

            <input
              type="text"
              name="name"
              placeholder="Enter user name"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Email</label>

            <input
              type="email"
              name="email"
              placeholder="Enter user email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
            />
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
                ? "Creating..."
                : "Create User"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default CreateUser;