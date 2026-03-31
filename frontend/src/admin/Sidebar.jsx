import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import "../App.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTableColumns,
  faCube,
  faCartShopping,
  faPenToSquare,
  faFileLines,
  faGift,
  faUsers,
  faUserPlus,
  faUserGear,
  faGear,
  faXmark,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import axiosInstance from "../utils/axiosInstance";
import Travels from "../assets/Travel.webp";

const NAV_LINKS = [
  {
    path: "/admin/dashboard",
    label: "Dashboard",
    exact: true,
    icon: faTableColumns,
  },
  { path: "/admin/stockmanagement", label: "Stock Management", icon: faCube },
  { path: "/admin/sales", label: "Sales", icon: faCartShopping },
  { path: "/admin/editsales", label: "Edit Sales", icon: faPenToSquare },
  { path: "/admin/salesdone", label: "SDFOS", icon: faFileLines },
  { path: "/admin/OTB", label: "OTB", icon: faGift },
  { path: "/admin/urase", label: "URASE", icon: faUsers },
  { path: "/admin/agent", label: "Add Agent", icon: faUserPlus },
  { path: "/admin/staff", label: "Add Staff", icon: faUserGear },
  { path: "/admin/settings", label: "Settings", icon: faGear },
];

const resolveRole = () => {
  const keys = ["role", "adminRole", "agentRole", "staffRole"];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v) return String(v).toLowerCase();
  }

  try {
    const staffUserRaw = localStorage.getItem("staffUser");
    if (staffUserRaw) {
      const parsed = JSON.parse(staffUserRaw);
      if (parsed?.role) return String(parsed.role).toLowerCase();
    }
  } catch (_) {}

  try {
    const adminUserRaw = localStorage.getItem("adminUser");
    if (adminUserRaw) {
      const parsed = JSON.parse(adminUserRaw);
      if (parsed?.role) return String(parsed.role).toLowerCase();
    }
  } catch (_) {}

  try {
    const agentUserRaw = localStorage.getItem("agentUser");
    if (agentUserRaw) {
      const parsed = JSON.parse(agentUserRaw);
      if (parsed?.role) return String(parsed.role).toLowerCase();
    }
  } catch (_) {}

  if (localStorage.getItem("adminToken")) return "admin";
  if (localStorage.getItem("agentToken")) return "agent";
  if (localStorage.getItem("staffToken")) return "staff";

  return null;
};

export default function Sidebar() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [isOpen, setIsOpen] = useState(false);
  const [logo, setLogo] = useState(null);
  const [otb, setOtb] = useState([]);
  const [blinkOTB, setBlinkOTB] = useState(false);
  const [blinkURASE, setBlinkURASE] = useState(false);
  const navigate = useNavigate();
  const role = resolveRole();
  const location = useLocation();

  const uploadsBase = API_URL
    ? API_URL.replace(/\/api\/?$/, "") + "/uploads"
    : "/uploads";

  useEffect(() => {
    const mainLogo = async () => {
      try {
        const response = await axiosInstance.get(`${API_URL}/get-logo`);

        let logoUrl = null;

        if (response.data?.logo?.logo) {
          logoUrl = `${uploadsBase}/${response.data.logo.logo}`;
        }

        if (logoUrl) {
          setLogo(`${logoUrl}?v=${Date.now()}`);
        } else {
          setLogo(null);
        }
      } catch (error) {
        console.error("Logo fetch error:", error);
        setLogo(null);
      }
    };

    mainLogo();
  }, [API_URL, uploadsBase]);

  useEffect(() => {
    const lastSeenOTB =
      parseInt(localStorage.getItem("lastSeenOTBCreatedAt")) || 0;
    const lastSeenURASE =
      parseInt(localStorage.getItem("lastSeenURASECreatedAt")) || 0;

    const fetchAllotbs = async () => {
      try {
        const response = await axiosInstance.get(`${API_URL}/allotbs`);
        const data = response.data?.data || [];
        setOtb(data);

        const uraseIds = data.map((item) => item.id);
        localStorage.setItem("uraseIds", uraseIds.join(","));

        const blockedIds = (localStorage.getItem("uraseBlockedIds") || "")
          .split(",")
          .filter(Boolean)
          .map(Number);

        const hasActiveUrase = uraseIds.some((id) => !blockedIds.includes(id));

        if (data.length > 0) {
          const latestCreated = new Date(data[0].created_at).getTime();

          if (
            latestCreated > lastSeenOTB &&
            location.pathname !== "/admin/OTB"
          ) {
            setBlinkOTB(true);
          }

          if (latestCreated > lastSeenURASE && hasActiveUrase) {
            setBlinkURASE(true);
          } else {
            setBlinkURASE(false);
          }
        } else {
          setBlinkURASE(false);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchAllotbs();
    const interval = setInterval(fetchAllotbs, 1000);
    return () => clearInterval(interval);
  }, [API_URL, location.pathname]);

  const toggleSidebar = () => setIsOpen((s) => !s);
  const closeSidebar = () => setIsOpen(false);

  const handleLogout = (e) => {
    e.stopPropagation();
    if (e?.stopPropagation) e.stopPropagation();
    [
      "isAuthenticated",
      "adminToken",
      "staffToken",
      "agentToken",
      "adminUser",
      "staffUser",
      "agentUser",
      "role",
      "adminRole",
      "staffRole",
      "agentRole",
    ].forEach((k) => localStorage.removeItem(k));
    closeSidebar();

    localStorage.clear();
    navigate("/", { replace: true });
  };

  if (role === "staff" || role === "agent") {
    visibleLinks = NAV_LINKS.filter((l) => l.path === "/admin/dashboard");
  }

  const handleOTBClick = () => {
    if (otb.length > 0) {
      const latestOTB = new Date(otb[0].created_at).getTime();
      localStorage.setItem("lastSeenOTBCreatedAt", latestOTB);
      setBlinkOTB(false);
    }
  };

  const [navLinks, setNavLinks] = useState(NAV_LINKS);

  useEffect(() => {
    const updateNavLabels = async () => {
      try {
        const res = await axiosInstance.get(`${API_URL}/allpagedata`);
        const pages = res.data?.result || [];

        const updatedNav = NAV_LINKS.map((link) => {
          if (link.path === "/admin/OTB") {
            const found = pages.find((p) =>
              p.title.toLowerCase().includes("otb"),
            );
            return found ? { ...link, label: found.title } : link;
          }

          if (link.path === "/admin/salesdone") {
            const found = pages.find((p) =>
              p.title.toLowerCase().includes("sdfos"),
            );
            return found ? { ...link, label: found.title } : link;
          }

          if (link.path === "/admin/urase") {
            const found = pages.find((p) =>
              p.title.toLowerCase().includes("urase"),
            );
            return found ? { ...link, label: found.title } : link;
          }

          return link;
        });

        setNavLinks(updatedNav);
      } catch (error) {
        console.error(error);
      }
    };

    updateNavLabels();
  }, []);

  return (
    <>
      <nav className="navbar navbar-light bg-light d-md-none mobile-navbar-toggle">
        <div className="container-fluid">
          <button
            className="btn btn-outline-success update-update1"
            onClick={toggleSidebar}
            aria-label="Open sidebar"
          >
            ☰
          </button>
          <Link to="/admin/dashboard" onClick={closeSidebar}>
            <img
              src={logo || Travels}
              alt="logo"
              className="logo-image mb-2 mt-0"
              loading="eager"
              style={{ width: "108px", height: "50px" }}
            />
          </Link>
        </div>
      </nav>

      {isOpen && <div className="mobile-overlay" onClick={closeSidebar}></div>}

      <div className={`mobile-sidebar d-md-none ${isOpen ? "open" : ""}`}>
        <div className="p-0 d-flex flex-column h-100">
          <div className="d-flex justify-content-between align-items-center">
            <Link to="/admin/dashboard" onClick={closeSidebar}>
              <img
                src={logo || Travels}
                alt="logo"
                className="logo-image mb-2 mt-2"
                loading="eager"
                style={{ width: "106px", height: "50px" }}
              />
            </Link>

            <button
              title="Close"
              className="btn-closed"
              onClick={closeSidebar}
              aria-label="Close sidebar"
            >
              <FontAwesomeIcon icon={faXmark} className="text-light" />
            </button>
          </div>

          <hr className="text-light mt-0 mb-2" />

          <div className="list-group list-group-flush ms-2 me-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.exact}
                className={({ isActive }) =>
                  [
                    "list-group-item rounded-2 list-group-item-action mb-0 ms-2 border-0",
                    isActive ? "active" : "",
                  ].join(" ")
                }
                onClick={() => {
                  closeSidebar();
                  if (link.path === "/admin/OTB") handleOTBClick();
                }}
              >
                <FontAwesomeIcon icon={link.icon} />
                <span className="ms-2 label-span">{link.label}</span>

                {link.path === "/admin/OTB" && blinkOTB && (
                  <div className="blink-box blink-box1 ms-2"></div>
                )}

                {link.path === "/admin/urase" && blinkURASE && (
                  <div className="blink-box ms-2"></div>
                )}
              </NavLink>
            ))}
          </div>

          <div className="mt-auto pt-0 mb-2">
            <hr className="mb-0 text-danger" />
            <div
              className="text-start mt-2 d-flex align-items-center logout-color ps-3 py-2"
              onClick={handleLogout}
            >
              <FontAwesomeIcon
                icon={faRightFromBracket}
                className="logout-col1or fw-light me-2"
              />
              Logout
            </div>
          </div>
        </div>
      </div>

      <aside
        className="d-none d-md-block admin-sidebar"
        aria-label="Admin sidebar"
      >
        <div className="p-0 d-flex flex-column" style={{ minHeight: "100%" }}>
          <Link to="/admin/dashboard">
            <img
              src={logo || Travels}
              alt="logo"
              className="logo-image mb-2 mt-2"
              loading="eager"
              style={{ width: "206px", height: "70px" }}
            />
          </Link>

          <hr className="text-light mt-0 mb-2" />

          <div className="list-group rounded-0 me-3">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.exact}
                className={({ isActive }) =>
                  [
                    "list-group-item list-group-item-action mb-0 ms-2 border-0",
                    isActive ? "active" : "",
                  ].join(" ")
                }
                onClick={() => {
                  if (link.path === "/admin/OTB") handleOTBClick();
                }}
              >
                <FontAwesomeIcon icon={link.icon} />
                <span className="ms-2 label-span">{link.label}</span>

                {link.path === "/admin/OTB" && blinkOTB && (
                  <div className="blink-box blink-box1 ms-2 mb-0 p-0"></div>
                )}

                {link.path === "/admin/urase" && blinkURASE && (
                  <div className="blink-box ms-2 mb-0 p-0"></div>
                )}
              </NavLink>
            ))}
          </div>

          <div className="mt-auto pt-0 mb-2">
            <hr className="mb-0 text-danger" />
            <div
              className="text-start mt-2 d-flex align-items-center logout-color ps-3 py-2"
              onClick={handleLogout}
            >
              <FontAwesomeIcon
                icon={faRightFromBracket}
                className="fw-light me-2"
              />
              Logout
            </div>
          </div>
        </div>
      </aside>

      <div className="content-wrapper"></div>
    </>
  );
}
