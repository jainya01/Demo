import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";
import axios from "axios";

const Login = () => {
  const API_URL = import.meta.env.VITE_API_URL;

  const [showCard, setShowCard] = useState(false);
  const [logo, setLogo] = useState([]);

  useEffect(() => {
    setTimeout(() => setShowCard(true), 100);
  }, []);

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
    <main className="crm-welcome-bg">
      <div
        className={`crm-login-wrapper col-12 col-sm-12 col-md-6 col-lg-4 ${
          showCard ? "crm-fade-in" : "crm-hidden-card"
        }`}
      >
        <div className="crm-login-card rounded-3 col-lg-12 col-md-12 col-11">
          <img
            src={logo}
            alt="User Logo"
            className="crm-logo mb-2"
            width={200}
            height={113}
            loading="eager"
            fetchPriority="high"
          />
          <div className="crm-title">Welcome to Travel CRM</div>
          <div className="crm-subtitle">Select a login option to continue</div>

          <div className="d-grid gap-3 crm-group">
            <Link
              to="/adminlogin"
              className="crm-btn crm-btn-primary-default text-decoration-none"
            >
              Admin Login
            </Link>

            <Link
              to="/agentlogin"
              className="crm-btn crm-btn-outline-default text-decoration-none"
            >
              Agent Login
            </Link>

            <Link
              to="/stafflogin"
              className="crm-btn crm-btn-outline-default text-decoration-none"
            >
              Staff Login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Login;
