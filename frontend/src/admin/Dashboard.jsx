import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { exportAirlineExcel } from "../utils/exportExcel";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGlobe,
  faUserGroup,
  faPlane,
  faFileLines,
  faChevronDown,
  faSearch,
  faBell,
  faChevronRight,
  faChevronLeft,
  faEdit,
  faX,
} from "@fortawesome/free-solid-svg-icons";
import { Link, useParams } from "react-router-dom";

function Dashboard() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [globalQuery, setGlobalQuery] = useState("");
  const [stockList, setStockList] = useState([]);
  const [filteredStockList, setFilteredStockList] = useState([]);
  const [sales, setSales] = useState([]);
  const [openIndex, setOpenIndex] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [paxQuery, setPaxQuery] = useState("");
  const itemsPerPage = 11;

  function isDotExpired(value) {
    const d = parseToDateObj(value);
    if (!d) return true;
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  }

  const [stock, setStock] = useState({
    stock_id: "",
    sector: "",
    pax: "",
    dot: "",
    dotb: "",
    airline: "",
    agent: "",
  });

  const [chartStats, setChartStats] = useState([
    { name: "Total Sector", value: 18, icon: faGlobe },
    { name: "Total Passenger", value: 35, icon: faUserGroup },
    { name: "Total Airlines", value: 16, icon: faPlane },
    { name: "Total PNR", value: 15, icon: faFileLines },
  ]);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const fetchData = async () => {
      try {
        const [stocksRes, salesRes] = await Promise.all([
          axios.get(`${API_URL}/allstocks`, { signal: controller.signal }),
          axios.get(`${API_URL}/allsales`, { signal: controller.signal }),
        ]);

        if (!mounted) return;

        const stockData = Array.isArray(stocksRes.data?.data)
          ? stocksRes.data.data
          : [];

        const salesData = Array.isArray(salesRes.data?.data)
          ? salesRes.data.data
          : [];

        setStockList(stockData);
        setSales(salesData);

        const nonExpiredStocks = stockData.filter(
          (item) => !isDotExpired(item.dot),
        );

        const latestSaleMap = {};

        salesData.forEach((sale) => {
          if (!sale.stock_id) return;

          const time = new Date(
            sale.updated_at || sale.created_at || 0,
          ).getTime();

          if (
            !latestSaleMap[sale.stock_id] ||
            time > latestSaleMap[sale.stock_id]
          ) {
            latestSaleMap[sale.stock_id] = time;
          }
        });

        const sortedStocks = [...nonExpiredStocks].sort((a, b) => {
          const aSaleTime = latestSaleMap[a.id] || 0;
          const bSaleTime = latestSaleMap[b.id] || 0;

          const aStockTime = new Date(
            a.updated_at || a.created_at || 0,
          ).getTime();

          const bStockTime = new Date(
            b.updated_at || b.created_at || 0,
          ).getTime();

          const aFinalTime = Math.max(aSaleTime, aStockTime);
          const bFinalTime = Math.max(bSaleTime, bStockTime);

          return bFinalTime - aFinalTime;
        });

        setFilteredStockList(sortedStocks);
      } catch (error) {
        if (!axios.isCancel(error)) {
          setStockList([]);
          setFilteredStockList([]);
          setSales([]);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [API_URL]);

  const [salesPageState, setSalesPageState] = useState({});
  const [searchType, setSearchType] = useState("");
  const [pnrQuery, setPnrQuery] = useState("");
  const [searchedPax, setSearchedPax] = useState("");

  useEffect(() => {
    const totalPassenger = Array.isArray(sales) ? sales.length : 0;

    if (!Array.isArray(stockList) || stockList.length === 0) {
      setChartStats([
        { name: "Total Sector", value: 0, icon: faGlobe },
        { name: "Total Passenger", value: totalPassenger, icon: faUserGroup },
        { name: "Total Airlines", value: 0, icon: faPlane },
        { name: "Total PNR", value: 0, icon: faFileLines },
      ]);
      return;
    }

    const sectorSet = new Set(
      stockList.map((s) => (s.sector || "").toString().trim()).filter(Boolean),
    );
    const totalSector = sectorSet.size;

    const airlineSet = new Set(
      stockList.map((s) => (s.airline || "").toString().trim()).filter(Boolean),
    );
    const totalAirlines = airlineSet.size;

    const pnrSet = new Set(
      stockList.map((s) => (s.pnr || "").toString().trim()).filter(Boolean),
    );
    const totalPnr = pnrSet.size;

    setChartStats([
      { name: "Total Sector", value: totalSector, icon: faGlobe },
      { name: "Total Passenger", value: totalPassenger, icon: faUserGroup },
      { name: "Total Airlines", value: totalAirlines, icon: faPlane },
      { name: "Total PNR", value: totalPnr, icon: faFileLines },
    ]);
  }, [stockList, sales]);

  useEffect(() => {
    if (!sales || sales.length === 0) {
      setChartData([]);
      return;
    }

    const fareByYear = {};
    const currentYear = new Date().getFullYear();

    sales.forEach((item) => {
      let year;

      const date = item.dot || item.dotb;
      if (date) {
        year = parseToDateObj(date)?.getFullYear();
      }

      if (!year && item.created_at) {
        year = new Date(item.created_at).getFullYear();
      }

      if (!year) return;

      const fare = parseFloat(item.fare) || 0;

      fareByYear[year] = (fareByYear[year] || 0) + fare;
    });

    const startYear = currentYear - 9;

    const chartArray = Array.from({ length: 10 }, (_, i) => {
      const year = startYear + i;

      return {
        year,
        sell: fareByYear[year] || 0,
      };
    });

    setChartData(chartArray);
  }, [sales]);

  const toggleDropdown = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleSearch = (e) => {
    e.preventDefault();

    if (searchType === "pnr") {
      const q = String(pnrQuery || "")
        .trim()
        .toLowerCase();

      const filtered = stockList.filter(
        (s) =>
          !isDotExpired(s.dot) &&
          String(s.pnr || "")
            .toLowerCase()
            .includes(q),
      );

      setFilteredStockList(filtered);
      setCurrentPage(1);
      return;
    }

    if (searchType === "dot") {
      if (!stock.dot) return;

      const qDate = parseToDateObj(stock.dot);

      const filtered = stockList.filter((s) => {
        if (isDotExpired(s.dot)) return false;

        const sDate = parseToDateObj(s.dot);
        if (!qDate || !sDate) return false;

        return (
          sDate.getFullYear() === qDate.getFullYear() &&
          sDate.getMonth() === qDate.getMonth() &&
          sDate.getDate() === qDate.getDate()
        );
      });

      setFilteredStockList(filtered);
      setCurrentPage(1);
      return;
    }

    if (searchType === "pax") {
      const q = paxQuery.trim().toLowerCase();

      if (!q) return;
      setSearchedPax(q);

      const filteredStocks = stockList.filter((stock) => {
        if (isDotExpired(stock.dot)) return false;

        const relatedSales = sales.filter(
          (s) => String(s.stock_id) === String(stock.id),
        );

        return relatedSales.some((sale) => {
          const paxName = String(sale.pax || sale.name || "")
            .trim()
            .toLowerCase();

          return paxName === q;
        });
      });

      setFilteredStockList(filteredStocks);
      setCurrentPage(1);
      return;
    }

    if (searchType === "sector") {
      const originQ = origin.trim().toLowerCase();
      const destinationQ = destination.trim().toLowerCase();
      const dateQ = stock.dot ? parseToDateObj(stock.dot) : null;
      const pnrQ = String(stock.pnr || "")
        .trim()
        .toLowerCase();

      const filtered = stockList.filter((s) => {
        if (isDotExpired(s.dot)) return false;

        let sectorRaw = String(s.sector || "")
          .toLowerCase()
          .replace(/[–—→]/g, "-")
          .replace(/\s+to\s+/g, "-")
          .replace(/\s*\/\s*/g, "-")
          .replace(/\s+/g, " ")
          .trim();

        const parts = sectorRaw.split(/[\s-]+/).filter(Boolean);
        if (parts.length < 2) return false;

        const sectorOrigin = parts[0];
        const sectorDestination = parts[parts.length - 1];

        let matchesSector = true;

        if (originQ && destinationQ) {
          matchesSector =
            sectorOrigin === originQ && sectorDestination === destinationQ;
        } else if (originQ) {
          matchesSector = sectorOrigin.startsWith(originQ);
        } else if (destinationQ) {
          matchesSector = sectorDestination.endsWith(destinationQ);
        }

        if (!matchesSector) return false;

        if (dateQ) {
          const sDate = parseToDateObj(s.dot);
          if (!sDate) return false;

          const sameDate =
            sDate.getFullYear() === dateQ.getFullYear() &&
            sDate.getMonth() === dateQ.getMonth() &&
            sDate.getDate() === dateQ.getDate();

          if (!sameDate) return false;
        }

        if (pnrQ) {
          const stockPnr = String(s.pnr || "").toLowerCase();
          if (!stockPnr.includes(pnrQ)) return false;
        }

        return true;
      });

      setFilteredStockList(filtered);
      setCurrentPage(1);
      return;
    }
  };

  const groupedBySectorAll = useMemo(() => {
    if (!Array.isArray(filteredStockList)) return [];

    const map = {};

    filteredStockList.forEach((item) => {
      if (isDotExpired(item.dot)) return;

      const sectorKey = (item.sector || "").trim().toLowerCase();

      if (!map[sectorKey]) {
        map[sectorKey] = { sector: item.sector, items: [] };
      }

      map[sectorKey].items.push(item);
    });

    return Object.values(map);
  }, [filteredStockList]);

  const totalPages = useMemo(() => {
    return Math.ceil((groupedBySectorAll.length || 0) / itemsPerPage);
  }, [groupedBySectorAll.length, itemsPerPage]);

  const paginatedGroupedSectors = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;

    return groupedBySectorAll
      .filter((g) => g.items.some((it) => !isDotExpired(it.dot)))
      .slice(start, start + itemsPerPage);
  }, [groupedBySectorAll, currentPage, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages]);

  const totalPax = useMemo(() => {
    if (!Array.isArray(filteredStockList) || filteredStockList.length === 0)
      return 0;

    return filteredStockList.reduce((sum, stock) => {
      const totalSeats = Number(stock.pax) || 0;

      let soldSeats = Number(stock.sold) || 0;

      if (!stock.sold && Array.isArray(sales)) {
        soldSeats = sales.filter(
          (s) => String(s.stock_id) === String(stock.id),
        ).length;
      }

      const seatsLeft = Math.max(0, totalSeats - soldSeats);

      return sum + seatsLeft;
    }, 0);
  }, [filteredStockList, sales]);

  function parseToDateObj(value) {
    if (!value) return null;

    if (value instanceof Date && !isNaN(value)) return value;

    if (typeof value === "string") {
      const s = value.trim();

      const yxx = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
      if (yxx) {
        const [, y, a, b] = yxx.map(Number);

        let day, month;

        if (a > 12) {
          day = a;
          month = b;
        } else if (b > 12) {
          month = a;
          day = b;
        } else {
          month = a;
          day = b;
        }

        return new Date(y, month - 1, day);
      }

      const xxxy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
      if (xxxy) {
        let [, a, b, y] = xxxy;
        y = y.length === 2 ? (Number(y) < 70 ? "20" + y : "19" + y) : y;

        a = Number(a);
        b = Number(b);

        let day, month;

        if (a > 12) {
          day = a;
          month = b;
        } else if (b > 12) {
          month = a;
          day = b;
        } else {
          day = a;
          month = b;
        }

        return new Date(Number(y), month - 1, day);
      }

      const fallback = new Date(s);
      if (!isNaN(fallback)) return fallback;
    }

    return null;
  }

  function formatDateDisplay(d) {
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) return "-";

    const day = String(d.getDate()).padStart(2, "0");
    const monthNames = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();

    return `${day} ${month} ${year}`;
  }

  function formatDot(value) {
    const d = parseToDateObj(value);
    return formatDateDisplay(d);
  }

  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("");
  const [staff, setStaff] = useState([]);

  const [permissions, setPermissions] = useState({
    can_view_agents: 0,
    can_view_fares: 0,
    can_view_sales: 0,
    can_edit_stock: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const staffResponse = await axios.get(`${API_URL}/allstaffs`);
        const staffs = staffResponse.data?.data || staffResponse.data || [];

        if (isMounted) {
          setStaff(staffs);
        }

        const admin = JSON.parse(localStorage.getItem("adminUser"));
        const staffUser = JSON.parse(localStorage.getItem("staffUser"));
        const agentUser = JSON.parse(localStorage.getItem("agentUser"));

        if (agentUser) {
          if (isMounted) setRole("agent");

          const agentRes = await axios.get(`${API_URL}/allagents`);
          const agents = agentRes.data?.data || [];

          const me = agents.find((a) => String(a.id) === String(agentUser.id));

          if (isMounted) {
            setPermissions({
              can_view_agents: Number(me?.can_view_agents) || 0,
              can_view_fares: Number(me?.can_view_fares) || 0,
              can_view_sales: Number(me?.can_view_sales) || 0,
              can_edit_stock: Number(me?.can_edit_stock) || 0,
            });
          }
          return;
        }

        if (admin) {
          if (isMounted) {
            setRole("admin");
            setPermissions({
              can_view_agents: 1,
              can_view_fares: 1,
              can_view_sales: 1,
              can_edit_stock: 1,
            });
          }
          return;
        }

        if (staffUser) {
          if (isMounted) setRole("staff");

          const me = staffs.find((s) => String(s.id) === String(staffUser.id));

          if (isMounted) {
            setPermissions({
              can_view_fares: Number(me?.can_view_fares) || 0,
              can_view_sales: Number(me?.can_view_sales) || 0,
              can_edit_stock: Number(me?.can_edit_stock) || 0,
            });
          }
          return;
        }

        if (isMounted) {
          setRole("");
          setPermissions({ can_view_agents: 0, can_view_fares: 0 });
        }
      } catch (err) {
        console.error("Auth init failed:", err);
        if (isMounted) {
          setRole("");
          setPermissions({ can_view_agents: 0, can_view_fares: 0 });
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [API_URL]);

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  const swapValues = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const [showModal, setShowModal] = useState(false);
  const modalRef1 = useRef();
  const { id } = useParams();
  const [admin, setAdmin] = useState([]);

  const [editData, setEditData] = useState({
    id: "",
    sector: "",
    pax: "",
    dot: "",
    fare: "",
    airline: "",
    flightno: "",
    pnr: "",
  });

  const formatToInputDate = (value) => {
    if (!value) return "";
    const [dd, mm, yyyy] = value.split("-");
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef1.current && !modalRef1.current.contains(event.target)) {
        setShowModal(false);
      }
    }

    if (showModal) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showModal, setShowModal]);

  useEffect(() => {
    if (!id) return;
    somestocks();
  }, [id]);

  const somestocks = async () => {
    try {
      const response = await axios.get(`${API_URL}/somestocksdata/${id}`);

      const data = response.data?.data;

      if (!data) return;

      setEditData({
        id: data.id || "",
        sector: data.sector || "",
        pax: data.pax || "",
        dot: formatToInputDate(data.dot),
        fare: data.fare || "",
        airline: data.airline || "",
        flightno: data.flightno || "",
        pnr: data.pnr || "",
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async () => {
    if (!editData.id) {
      toast.warn("No record selected to update.");
      return;
    }

    try {
      const response = await axios.put(
        `${API_URL}/updatestocks/${editData.id}`,
        {
          sector: editData.sector,
          pax: editData.pax,
          dot: editData.dot,
          fare: editData.fare,
          airline: editData.airline,
          flightno: editData.flightno,
          pnr: editData.pnr,
        },
      );

      setShowModal(false);

      if (typeof fetchData === "function") {
        fetchData();
      }

      toast.success(response.data?.message || "Stock updated successfully!");
    } catch (err) {
      console.error("Update error:", err);

      if (err.response?.data?.message) {
        toast.error(`Update failed: ${err.response.data.message}`);
      } else if (err.message) {
        toast.error(`Update failed: ${err.message}`);
      } else {
        toast.error("Update failed. Please try again.");
      }
    }
  };

  useEffect(() => {
    const adminData = async () => {
      try {
        const adminUser = JSON.parse(localStorage.getItem("adminUser"));
        const response = await axios.get(`${API_URL}/alladmindata`);
        const admins = response.data.data || [];
        const currentAdmin = admins.find((a) => a.id === adminUser?.id);
        setAdmin(currentAdmin);
      } catch (error) {
        console.error("error", error);
      }
    };

    adminData();
  }, []);

  const getInitials = (name) => {
    if (!name) return "";

    const parts = name.split(" ");
    return parts
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  };

  const [urase, setUrase] = useState([]);

  useEffect(() => {
    const uraseData = async () => {
      try {
        const response = await axios.get(`${API_URL}/allotbs`);
        const data = response.data?.data || [];
        const uraseBlockedIds = localStorage.getItem("uraseBlockedIds") || "";
        const blockedIds = uraseBlockedIds
          .split(",")
          .filter(Boolean)
          .map(Number);

        const notMatched = data.filter(
          (item) => !blockedIds.includes(Number(item.id)),
        );

        setUrase(notMatched);
      } catch (error) {
        console.error("error", error);
      }
    };

    uraseData();
  }, []);

  return (
    <>
      <div className="content-wrapper">
        <div className="d-flex flex-wrap border p-2 header-customization">
          <div className="d-flex flex-grow-1 header-search">
            <div className="input-group">
              <div className="search-wrapper">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="text-dark search-icon1"
                />

                <input
                  type="search"
                  className="form-control sector-wise search-input"
                  placeholder="Search flights, bookings, agents..."
                  value={globalQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setGlobalQuery(value);

                    const q = value.trim().toLowerCase();

                    const activeStock = stockList.filter((stock) => {
                      return !isDotExpired(stock.dot);
                    });

                    if (!q) {
                      const activeStocks = stockList.filter(
                        (s) => !isDotExpired(s.dot),
                      );
                      setFilteredStockList(activeStocks);
                      setCurrentPage(1);
                      return;
                    }

                    const filtered = activeStock.filter((stock) => {
                      const sectorMatch = (stock.sector || "")
                        .toLowerCase()
                        .includes(q);
                      const pnrMatch = (stock.pnr || "")
                        .toLowerCase()
                        .includes(q);
                      const airlineMatch = (stock.airline || "")
                        .toLowerCase()
                        .includes(q);
                      const flightMatch = (stock.flightno || "")
                        .toLowerCase()
                        .includes(q);

                      const agentMatch = sales.some(
                        (s) =>
                          String(s.stock_id) === String(stock.id) &&
                          (s.agent || "").toLowerCase().includes(q),
                      );

                      const paxMatch = sales.some(
                        (s) =>
                          String(s.stock_id) === String(stock.id) &&
                          (s.pax || s.name || "").toLowerCase().includes(q),
                      );

                      return (
                        sectorMatch ||
                        pnrMatch ||
                        airlineMatch ||
                        flightMatch ||
                        agentMatch ||
                        paxMatch
                      );
                    });

                    setFilteredStockList(filtered);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="d-flex align-items-center ms-lg-auto gap-3 mt-2 mt-md-0">
            <div className="badge rounded-pill ms-0 ms-md-2 px-3 seats-pax">
              <span
                className={totalPax > 0 ? "seats-available" : "text-danger"}
              >
                {totalPax > 0
                  ? `Total ${totalPax} Seats Available`
                  : "No Seats Available"}
              </span>
            </div>

            <Link className="text-decoration-none text-dark" to="/admin/urase">
              <div className="position-relative poniter-class">
                <FontAwesomeIcon icon={faBell} />
                <div
                  className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-flex align-items-center justify-content-center"
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    fontSize: "11px",
                    padding: 0,
                  }}
                >
                  {urase.length}
                </div>
              </div>
            </Link>

            <Link
              className="text-decoration-none text-dark"
              to="/admin/settings"
            >
              <div className="d-flex align-items-center gap-2 poniter-class">
                <div
                  className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center fw-bold"
                  style={{ width: "36px", height: "36px" }}
                >
                  {getInitials(admin?.name)}
                </div>

                <div>
                  <div className="fw-semibold">{admin?.name}</div>
                  <small className="text-muted fw-medium">{admin?.role}</small>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <form onSubmit={handleSearch}>
          <div className="d-flex align-items-center flex-wrap gap-2 ms-lg-2 ms-1 w-100 mt-3 mb-3">
            <div style={{ minWidth: "200px" }}>
              <div
                className={`dropdown-wrapper text-start ${open ? "open" : ""}`}
              >
                <select
                  className="custom-select text-dark"
                  value={searchType}
                  onFocus={() => setOpen(true)}
                  onBlur={() => setOpen(false)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchType(value);
                    setOpen(false);

                    if (!value) {
                      const activeStocks = stockList.filter(
                        (s) => !isDotExpired(s.dot),
                      );
                      setFilteredStockList(activeStocks);
                      setCurrentPage(1);
                    }
                  }}
                >
                  <option value="">Select & Option</option>
                  <option value="sector">Search Sector</option>
                  <option value="pnr">PNR</option>
                  <option value="dot">DOT</option>
                  <option value="pax">PAX Name</option>
                </select>

                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`dropdown-icon ${open ? "rotate" : ""}`}
                />
              </div>
            </div>

            {searchType === "sector" && (
              <>
                <div
                  style={{ width: "400px" }}
                  className="origin-d1esti me-1 d-flex align-items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Enter Origin"
                    className="form-control sector-wise"
                    value={origin}
                    onChange={(e) => {
                      const value = e.target.value;
                      setOrigin(value);

                      if (value.trim() === "") {
                        const nonExpired = stockList.filter(
                          (s) => !isDotExpired(s.dot),
                        );

                        setFilteredStockList(nonExpired);
                        setCurrentPage(1);
                      }
                    }}
                  />

                  <svg
                    onClick={swapValues}
                    className="custom-svg-color"
                    width="40"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M8 3 4 7l4 4" />
                    <path d="M4 7h16" />
                    <path d="m16 21 4-4-4-4" />
                    <path d="M20 17H4" />
                  </svg>

                  <input
                    type="text"
                    placeholder="Enter Destination"
                    className="form-control sector-wise"
                    value={destination}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDestination(value);

                      if (
                        value.trim() === "" &&
                        origin.trim() === "" &&
                        !stock.dot &&
                        !stock.pnr
                      ) {
                        const nonExpired = stockList.filter(
                          (s) => !isDotExpired(s.dot),
                        );

                        setFilteredStockList(nonExpired);
                        setCurrentPage(1);
                      }
                    }}
                  />
                </div>

                <div>
                  <input
                    type="date"
                    className="form-control dot-wise rounded-3"
                    value={stock.dot}
                    onChange={(e) => {
                      const value = e.target.value;

                      setStock((prev) => ({ ...prev, dot: value }));

                      if (
                        !value &&
                        origin.trim() === "" &&
                        destination.trim() === "" &&
                        !stock.pnr
                      ) {
                        const nonExpired = stockList.filter(
                          (s) => !isDotExpired(s.dot),
                        );

                        setFilteredStockList(nonExpired);
                        setCurrentPage(1);
                      }
                    }}
                    style={{ height: "32px" }}
                  />
                </div>

                <input
                  type="text"
                  className="form-control pnr-wise rounded-3"
                  placeholder="PNR Number"
                  value={stock.pnr}
                  onChange={(e) => {
                    const value = e.target.value;

                    setStock((prev) => ({ ...prev, pnr: value }));

                    if (
                      value.trim() === "" &&
                      origin.trim() === "" &&
                      destination.trim() === "" &&
                      !stock.dot
                    ) {
                      const nonExpired = stockList.filter(
                        (s) => !isDotExpired(s.dot),
                      );

                      setFilteredStockList(nonExpired);
                      setCurrentPage(1);
                    }
                  }}
                  style={{ height: "32px" }}
                />
              </>
            )}

            {searchType === "pnr" && (
              <input
                type="search"
                className="form-control pnr-wise rounded-3"
                placeholder="PNR Number"
                value={pnrQuery}
                onChange={(e) => {
                  const value = e.target.value;

                  setPnrQuery(value);

                  if (value.trim() === "") {
                    const nonExpired = stockList.filter(
                      (s) => !isDotExpired(s.dot),
                    );

                    setFilteredStockList(nonExpired);
                    setCurrentPage(1);
                  }
                }}
                required
                style={{ height: "32px" }}
              />
            )}

            {searchType === "dot" && (
              <input
                type="date"
                className="form-control pnr-wise rounded-3"
                style={{ width: "220px", height: "32px" }}
                value={stock.dot}
                onChange={(e) => {
                  const value = e.target.value;

                  setStock((prev) => ({ ...prev, dot: value }));

                  if (!value) {
                    const nonExpired = stockList.filter(
                      (s) => !isDotExpired(s.dot),
                    );

                    setFilteredStockList(nonExpired);
                    setCurrentPage(1);
                  }
                }}
                required
              />
            )}

            {searchType === "pax" && (
              <input
                type="search"
                className="form-control pnr-wise rounded-3"
                placeholder="PAX Name"
                style={{ width: "220px", height: "32px" }}
                value={paxQuery}
                onChange={(e) => {
                  const value = e.target.value;

                  setPaxQuery(value);

                  if (value.trim() === "") {
                    const nonExpired = stockList.filter(
                      (s) => !isDotExpired(s.dot),
                    );

                    setFilteredStockList(nonExpired);
                    setSearchedPax("");
                    setCurrentPage(1);
                  }
                }}
                required
              />
            )}

            <div className="mt-0">
              <button
                className="btn d-flex align-items-center gap-1 custom-button"
                type="submit"
              >
                Search
              </button>
            </div>
          </div>
        </form>

        <div className="container-fluid py-2 dashboard">
          <div className="row">
            <div className="col-12 col-lg-8">
              <div className="card chart-wrapper border ps-0">
                <div className="mb-3 sales-overview ms-3">Sales Overview</div>
                <ResponsiveContainer width="100%" height={470}>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 0, right: 20, bottom: 0, left: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="salesGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#178c75"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#178c75"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis dataKey="year" />

                    <YAxis
                      tickFormatter={(value) =>
                        value >= 1000000
                          ? `${value / 1000000}M`
                          : value >= 1000
                            ? `${value / 1000}K`
                            : value
                      }
                    />

                    <Tooltip
                      formatter={(value) =>
                        new Intl.NumberFormat().format(value)
                      }
                    />

                    <Area
                      type="monotone"
                      dataKey="sell"
                      stroke="#178c75"
                      strokeWidth={2.5}
                      fill="url(#salesGradient)"
                      dot={{ r: 3, fill: "#178c75" }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="row row-cols-2 row-cols-sm-2 row-cols-lg-4 mt-1 g-3 mb-3">
                {Array.isArray(chartStats) &&
                  chartStats.map((item, i) => (
                    <div key={i} className="col">
                      <div className="card dashboard-stat-card h-100 border shadow-sm">
                        <div className="card-body text-center">
                          <FontAwesomeIcon
                            icon={item.icon}
                            className="mb-2 custom-icon-color"
                            size="lg"
                          />

                          <h6 className="text-muted mt-1">{item.name}</h6>
                          <div className="mb-0 item-value">{item.value}</div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="col-12 col-lg-4">
              {Array.isArray(paginatedGroupedSectors) &&
              paginatedGroupedSectors.length > 0 ? (
                paginatedGroupedSectors.map((group, idx) => {
                  const serial = (currentPage - 1) * itemsPerPage + idx + 1;

                  const toInt = (v) => (Number.isFinite(+v) ? +v : 0);

                  const totalSeats = group.items.reduce(
                    (sum, it) => sum + toInt(it.pax),
                    0,
                  );
                  const seatsSold = group.items.reduce(
                    (sum, it) => sum + toInt(it.sold),
                    0,
                  );
                  const seatsLeft = Math.max(0, totalSeats - seatsSold);
                  const sectorStockIds = group.items.map((it) => String(it.id));

                  const salesForSector =
                    permissions.can_view_sales === 1 && Array.isArray(sales)
                      ? sales.filter((s) => {
                          const stockMatch = sectorStockIds.includes(
                            String(s.stock_id),
                          );
                          if (!stockMatch) return false;

                          if (searchType === "pax") {
                            const query = searchedPax;
                            if (!query) return true;

                            const paxName = String(s.pax || s.name || "")
                              .trim()
                              .toLowerCase();

                            return paxName === query;
                          }

                          return true;
                        })
                      : [];

                  const salesPerPage = 7;
                  const salesPage = salesPageState[group.sector] || 1;
                  const start = (salesPage - 1) * salesPerPage;
                  const paginatedSales = salesForSector.slice(
                    start,
                    start + salesPerPage,
                  );
                  const totalPages = Math.ceil(
                    salesForSector.length / salesPerPage,
                  );

                  const goToPage = (p) => {
                    setSalesPageState((prev) => ({
                      ...prev,
                      [group.sector]: p,
                    }));
                  };

                  return (
                    <div
                      key={group.sector + serial}
                      className={`size-text mb-3 ${
                        openIndex === serial ? "size-text-active" : ""
                      }`}
                    >
                      <div
                        className="flight-header d-flex justify-content-between align-items-center"
                        onClick={() => toggleDropdown(serial)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="d-flex align-items-center">
                          <div>
                            <FontAwesomeIcon
                              icon={faPlane}
                              className="sector-plane"
                            />
                          </div>
                          <span className="group-pnr ms-2 me-1 custom-bold">
                            {group.sector}
                          </span>{" "}
                          |{" "}
                          <span className="group-pnr1 ms-1 me-1 fw-medium">
                            {group.items?.[0]?.flightno ?? "-"}
                          </span>{" "}
                          |
                          <span className="seats-left ms-1">
                            <strong>{seatsLeft}</strong> Seats Left
                          </span>
                        </div>

                        <div className="d-flex align-items-center gap-0">
                          {(role === "staff" || role === "agent") &&
                            permissions.can_edit_stock === 1 && (
                              <div
                                className="d-flex align-items-center"
                                title="Edit"
                              >
                                <FontAwesomeIcon
                                  icon={faEdit}
                                  className="ms-1 me-1 custom-color-delete custom-color-edit"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const item = group.items[0];
                                    setEditData({
                                      id: item.id,
                                      sector: item.sector || "",
                                      pax: item.pax || "",
                                      dot: item.dot
                                        ? formatToInputDate(item.dot)
                                        : "",
                                      fare: item.fare || "",
                                      airline: item.airline || "",
                                      pnr: item.pnr || "",
                                      flightno: item.flightno || "",
                                    });

                                    setShowModal(true);
                                  }}
                                />
                              </div>
                            )}

                          <div className="ms-1 d-flex align-items-center">
                            {openIndex === serial ? (
                              <svg
                                className="svg-current cursor-pointer"
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M8 12h8"></path>
                              </svg>
                            ) : (
                              <svg
                                className="svg-current cursor-pointer"
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M8 12h8"></path>
                                <path d="M12 8v8"></path>
                              </svg>
                            )}
                          </div>
                        </div>

                        {showModal && (
                          <>
                            <div className="custom-modal-overlay1"></div>

                            <div
                              className="modal fade show d-block"
                              tabIndex="-1"
                            >
                              <div
                                className="modal-dialog modal-dialog-centered"
                                ref={modalRef1}
                              >
                                <div className="modal-content custom-color">
                                  <div className="modal-header">
                                    <div className="d-flex justify-content-between align-items-center w-100">
                                      <h5 className="modal-title text-dark">
                                        Edit Stock
                                      </h5>

                                      <FontAwesomeIcon
                                        icon={faX}
                                        className="text-dark"
                                        style={{ cursor: "pointer" }}
                                        onClick={() => setShowModal(false)}
                                      />
                                    </div>
                                  </div>

                                  <div className="modal-body">
                                    <div className="mb-2">
                                      <label className="form-label text-dark fw-medium">
                                        Sector Name
                                      </label>
                                      <input
                                        type="text"
                                        className="form-control sector-wise"
                                        placeholder="Sector Name"
                                        name="sector"
                                        value={editData.sector}
                                        onChange={(e) =>
                                          setEditData({
                                            ...editData,
                                            sector: e.target.value,
                                          })
                                        }
                                      />
                                    </div>

                                    <div className="mb-2">
                                      <label className="form-label text-dark fw-medium">
                                        PAXQ
                                      </label>
                                      <input
                                        type="number"
                                        className="form-control sector-wise no-spinner"
                                        placeholder="PAXQ"
                                        name="pax"
                                        value={editData.pax}
                                        onChange={(e) =>
                                          setEditData({
                                            ...editData,
                                            pax: e.target.value,
                                          })
                                        }
                                      />
                                    </div>

                                    <div className="mb-2">
                                      <label className="form-label text-dark fw-medium">
                                        DOT
                                      </label>
                                      <input
                                        type="date"
                                        className="form-control sector-wise"
                                        name="dot"
                                        value={editData.dot}
                                        onChange={(e) =>
                                          setEditData({
                                            ...editData,
                                            dot: e.target.value,
                                          })
                                        }
                                      />
                                    </div>

                                    <div className="mb-2">
                                      <label className="form-label text-dark fw-medium">
                                        Fare
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="Fare"
                                        className="form-control sector-wise"
                                        name="fare"
                                        value={editData.fare}
                                        onChange={(e) =>
                                          setEditData({
                                            ...editData,
                                            fare: e.target.value,
                                          })
                                        }
                                      />
                                    </div>

                                    <div className="mb-2">
                                      <label className="form-label text-dark fw-medium">
                                        Airline
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="Airline"
                                        className="form-control sector-wise"
                                        name="airline"
                                        value={editData.airline}
                                        onChange={(e) =>
                                          setEditData({
                                            ...editData,
                                            airline: e.target.value,
                                          })
                                        }
                                      />
                                    </div>

                                    <div className="mb-2">
                                      <label className="form-label text-dark fw-medium">
                                        PNR
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="PNR"
                                        className="form-control sector-wise"
                                        name="pnr"
                                        value={editData.pnr}
                                        onChange={(e) =>
                                          setEditData({
                                            ...editData,
                                            pnr: e.target.value,
                                          })
                                        }
                                      />
                                    </div>

                                    <div className="mb-2">
                                      <label className="form-label text-dark fw-medium">
                                        Flight No
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="Flight No"
                                        className="form-control sector-wise"
                                        name="flightno"
                                        value={editData.flightno}
                                        onChange={(e) =>
                                          setEditData({
                                            ...editData,
                                            flightno: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                  </div>

                                  <div className="modal-footer">
                                    <button
                                      className="btn btn-outline-success update-update1"
                                      onClick={() => setShowModal(false)}
                                    >
                                      Cancel
                                    </button>

                                    <button
                                      className="btn sector-submit"
                                      onClick={handleUpdate}
                                    >
                                      Update
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {openIndex === serial && (
                        <div className="flight-body border border-light p-1">
                          {group.items.map((item) => {
                            const itemTotalSeats = Number(item.pax) || 0;

                            const itemSales = Array.isArray(sales)
                              ? sales.filter(
                                  (s) => String(s.stock_id) === String(item.id),
                                )
                              : [];

                            const itemSeatsSold = itemSales.reduce(
                              (sum, s) => sum + (Number(s.sold) || 1),
                              0,
                            );
                            const itemSeatsLeft = Math.max(
                              0,
                              itemTotalSeats - itemSeatsSold,
                            );

                            return (
                              <div
                                key={item.id}
                                className="px-2 bg-transparent rounded mb-2 card border-0 typography px-0"
                              >
                                <div className="d-flex justify-content-between mb-1">
                                  <span>
                                    <strong className="group-pnr custom-bold">
                                      PNR:
                                    </strong>{" "}
                                    <span className="seats-left">
                                      {item.pnr}
                                    </span>
                                  </span>

                                  <span className="text-center">
                                    <strong className="group-pnr custom-bold">
                                      COST:
                                    </strong>{" "}
                                    <span className="seats-left">
                                      {role === "admin"
                                        ? item.fare + "/-"
                                        : (role === "staff" ||
                                              role === "agent") &&
                                            permissions.can_view_fares === 1
                                          ? item.fare + "/-"
                                          : "***"}
                                    </span>
                                  </span>

                                  <span className="text-end">
                                    <span className="group-pnr custom-bold">
                                      SUPPLIER:
                                    </span>{" "}
                                    <span className="seats-left">AL HAMD</span>
                                  </span>
                                </div>

                                <div className="d-flex justify-content-between1">
                                  <span className="text-start">
                                    <strong className="group-pnr custom-bold">
                                      Date:
                                    </strong>{" "}
                                    <span className="group-pnr">
                                      {formatDot(item.dot)}
                                    </span>
                                  </span>
                                  <span className="text-start ms-1">
                                    <strong className="group-pnr custom-bold">
                                      Airline:
                                    </strong>{" "}
                                    <span className="group-pnr">
                                      {item.airline}
                                    </span>
                                  </span>
                                </div>

                                <div className="d-flex gap-4 mt-2">
                                  <span className="seats-left">
                                    Total: {itemTotalSeats}
                                  </span>
                                  <span className="group-pnr custom-bold">
                                    Sold: {itemSeatsSold}
                                  </span>
                                  <span className="seats-left">
                                    Left: {itemSeatsLeft}
                                  </span>
                                </div>
                              </div>
                            );
                          })}

                          <div className="table-responsive mt-0">
                            <table className="table text-center mb-0 sales-table">
                              <thead>
                                <tr>
                                  <th
                                    className="group-pnr1 custom-bold"
                                    style={{ width: "10%" }}
                                  >
                                    SL.NO
                                  </th>

                                  <th
                                    className="group-pnr1 custom-bold"
                                    style={{ width: "30%" }}
                                  >
                                    PAX NAME
                                  </th>
                                  <th
                                    className="group-pnr1 custom-bold"
                                    style={{ width: "30%" }}
                                  >
                                    DATE
                                  </th>
                                  <th
                                    className="group-pnr1 custom-bold"
                                    style={{ width: "30%" }}
                                  >
                                    AGENT
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedSales.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan="4"
                                      className="sales-record fw-medium"
                                      style={{ fontSize: "14px" }}
                                    >
                                      No sales available.
                                    </td>
                                  </tr>
                                ) : (
                                  paginatedSales.map((sale, i) => (
                                    <tr key={`sale-${sale.id}-${i}`}>
                                      <td>{start + i + 1}</td>

                                      <td className="group-pnr">
                                        {sale.pax ?? sale.name ?? "-"}
                                      </td>

                                      <td
                                        className="group-pnr"
                                        style={{ whiteSpace: "nowrap" }}
                                      >
                                        {formatDot(sale.dotb ?? sale.dot)}
                                      </td>

                                      <td className="group-pnr">
                                        {role === "admin" || role === "staff"
                                          ? sale.agent || "-"
                                          : role === "agent" &&
                                              permissions.can_view_agents === 1
                                            ? sale.agent || "-"
                                            : "***"}
                                      </td>
                                    </tr>
                                  ))
                                )}

                                {salesForSector.length > salesPerPage && (
                                  <tr>
                                    <td colSpan="4" className="text-center p-2">
                                      <button
                                        className="btn btn-sm btn-success mx-1"
                                        disabled={salesPage === 1}
                                        onClick={() => goToPage(salesPage - 1)}
                                      >
                                        Prev
                                      </button>

                                      <span className="small text-dark mx-2">
                                        Page {salesPage} of {totalPages}
                                      </span>
                                      <button
                                        className="btn btn-sm btn-success mx-1"
                                        disabled={salesPage === totalPages}
                                        onClick={() => goToPage(salesPage + 1)}
                                      >
                                        Next
                                      </button>
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {salesForSector.length > 0 && (
                            <div className="d-flex justify-content-center mt-1 mb-2">
                              <button
                                className="btn px-2 py-1 hover-download"
                                onClick={() => {
                                  const sectorStockIds = group.items.map((it) =>
                                    String(it.id),
                                  );

                                  const sectorSales = sales.filter((s) =>
                                    sectorStockIds.includes(String(s.stock_id)),
                                  );

                                  if (!sectorSales.length) {
                                    alert("No passenger data found");
                                    return;
                                  }

                                  const airlineName = group.items[0].airline;
                                  exportAirlineExcel(sectorSales, airlineName);
                                }}
                              >
                                Download
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="mb-3">
                  <div className="p-0 rounded bg-white text-start">
                    <p
                      className="mb-0 fw-medium border rounded px-2 py-2 sales-record"
                      style={{ fontSize: "14px" }}
                    >
                      No records found for the selected search criteria.
                    </p>
                  </div>
                </div>
              )}

              {totalPages > 1 && (
                <div className="d-flex justify-content-center gap-2 align-items-center mt-0">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success pagination-button1 d-flex align-items-center"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <FontAwesomeIcon
                      icon={faChevronLeft}
                      className="custom-awesome1"
                    />{" "}
                    Prev
                  </button>

                  <span className="small fw-medium text-dark">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success pagination-button1 d-flex align-items-center"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next{" "}
                    <FontAwesomeIcon
                      icon={faChevronRight}
                      className="custom-awesome"
                    />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <ToastContainer position="bottom-right" autoClose={1500} />
      </div>
    </>
  );
}

export default Dashboard;
