import { useState, useEffect } from "react";
import "../App.css";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

function AgentLogin() {
  const API_URL = import.meta.env.VITE_API_URL;

  const navigate = useNavigate();

  const [logo, setLogo] = useState([]);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const handleAgentLogin = async (e) => {
    e.preventDefault();
    setAdminError("");
    setAdminLoading(true);

    try {
      const response = await axios.post(`${API_URL}/agentlogin`, {
        agent_email: adminUsername,
        agent_password: adminPassword,
      });

      if (response.status === 200) {
        const agent = response.data?.agent ?? null;
        const token = response.data?.token ?? null;

        localStorage.setItem("isAuthenticated", "true");

        if (token) {
          localStorage.setItem("token", token);
        }

        if (agent) {
          localStorage.setItem("agentUser", JSON.stringify(agent));

          const normalizedRole = String(agent.role || "agent").toLowerCase();

          localStorage.setItem("agentRole", normalizedRole);
          localStorage.setItem("role", normalizedRole);
        } else {
          localStorage.setItem("role", "agent");
        }

        navigate("/admin/dashboard");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || "Server error. Please try again";

      setAdminError(msg);
    } finally {
      setAdminLoading(false);
    }
  };

  const uploadsBase = API_URL
    ? API_URL.replace(/\/api\/?$/, "") + "/uploads"
    : "/uploads";

  useEffect(() => {
    const dynamicLogo = async () => {
      try {
        const response = await axios.get(`${API_URL}/get-logo`);
        const logoFile = response.data.logo.logo;
        setLogo(`${uploadsBase}/${logoFile}`);
      } catch (error) {
        console.error("error", error);
      }
    };

    dynamicLogo();
  }, []);

  return (
    <main className="admin-login-bg d-flex justify-content-center align-items-center">
      <div className="login-card-wrapper col-12 col-md-8 col-lg-5">
        <div className="card shadow-lg border-0 rounded-2 p-4">
          <div className="text-center mb-3">
            <Link to="/">
              <img
                src={logo}
                alt="User Logo"
                className="crm-logo"
                width={200}
                height={113}
                loading="eager"
                fetchPriority="high"
              />
            </Link>
            <div className="custom-login">Agent Login</div>
          </div>

          <form onSubmit={handleAgentLogin} className="login-form">
            <div className="mb-3">
              <label className="form-label fw-medium">Email or Username</label>
              <input
                type="text"
                placeholder="Enter your email or username"
                className="form-control form-control-fields sector-wise rounded-5"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                required
              />
            </div>

            <div className="mb-4 position-relative">
              <label className="form-label fw-medium">Password</label>
              <div className="position-relative">
                <input
                  type={showAdminPassword ? "text" : "password"}
                  placeholder="Password"
                  className="form-control form-control-fields sector-wise rounded-5 pe-5"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
                <FontAwesomeIcon
                  icon={showAdminPassword ? faEyeSlash : faEye}
                  className="password-toggle-icon"
                  onClick={() => setShowAdminPassword((v) => !v)}
                />
              </div>
              {adminError && <p className="text-danger mt-2">{adminError}</p>}
            </div>

            <div className="d-grid gap-2">
              <button
                type="submit"
                className="btn btn-admin-login"
                disabled={adminLoading}
              >
                {adminLoading ? "Logging in..." : "Login"}
              </button>

              <Link to="/" className="back-link">
                Back
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export default AgentLogin;
