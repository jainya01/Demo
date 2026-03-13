import { useEffect, useRef, useState } from "react";
import axios from "axios";
import ExcelJS from "exceljs";
import { toast, ToastContainer } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
import {
  faChevronRight,
  faChevronLeft,
} from "@fortawesome/free-solid-svg-icons";

function SalesDone() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [user, setUser] = useState([]);
  const itemsPerPage = 21;
  const [currentPage, setCurrentPage] = useState(1);

  const [search, setSearch] = useState({
    pnr: "",
    dot: "",
  });

  const [filteredData, setFilteredData] = useState([]);
  const [showDate1, setShowDate1] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setSearch((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();

    if (!search.pnr && !search.dot) {
      toast.error("Please fill either PNR or Date");
      return;
    }

    let filtered = Array.isArray(user) ? user : [];

    if (search.pnr) {
      filtered = filtered.filter((item) =>
        item?.pnr?.toLowerCase().includes(search.pnr.toLowerCase()),
      );
    }

    if (search.dot) {
      filtered = filtered.filter((item) => {
        if (!item?.dot || typeof item.dot !== "string") return false;

        let formattedDot = "";

        if (/^\d{2}-\d{2}-\d{4}$/.test(item.dot)) {
          const [dd, mm, yyyy] = item.dot.split("-");
          formattedDot = `${yyyy}-${mm}-${dd}`;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(item.dot)) {
          formattedDot = item.dot;
        } else {
          return false;
        }

        return formattedDot === search.dot;
      });
    }

    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const allData = async () => {
    try {
      const response = await axios.get(`${API_URL}/allsalesdone`);
      setUser(response.data.data);
      setFilteredData(response.data.data);
    } catch (error) {
      console.error("error", error);
    }
  };

  useEffect(() => {
    allData();
  }, []);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = Array.isArray(filteredData)
    ? filteredData.slice(startIndex, endIndex)
    : [];

  const handleDownload = async () => {
    if (!paginatedData || paginatedData.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("EditSales");

    worksheet.addRow([
      "ID",
      "SECTOR",
      "PAX",
      "DOT",
      "DOTB",
      "AIRLINE",
      "AGENT",
      "FARE",
      "PNR",
    ]);

    paginatedData.forEach((item) => {
      worksheet.addRow([
        item.id,
        item.sector || "-",
        item.pax || "-",
        item.dot || "-",
        item.dotb || "-",
        item.airline || "-",
        item.agent || "-",
        item.fare || "-",
        item.pnr || "-",
      ]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "Sales Done.xlsx");
  };

  const deleteData = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this record?",
    );

    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_URL}/deletesource/${id}`);

      setUser((prev) => prev.filter((item) => item.id !== id));
      setFilteredData((prev) => prev.filter((item) => item.id !== id));

      toast.success("Deleted successfully");
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const modalRef = useRef();
  const inputRef = useRef();
  const agentDropdownRef = useRef();
  const agentInputRef = useRef();
  const dropdownRef = useRef();
  const [showModal, setShowModal] = useState(false);
  const [agents, setAgents] = useState([]);
  const [showAgentList, setShowAgentList] = useState([]);

  const formatForDateInput = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [dd, mm, yyyy] = dateStr.split("-");
      return `${yyyy}-${mm}-${dd}`;
    }

    return "";
  };

  const [editData, setEditData] = useState({
    id: "",
    sector: "",
    pax: "",
    dot: "",
    dotb: "",
    airline: "",
    fare: "",
    pnr: "",
    agent: "",
  });

  const handleUpdate = async () => {
    if (!editData.id) {
      toast.warn("No record selected to update.");
      return;
    }

    try {
      const response = await axios.put(
        `${API_URL}/updatesalessource/${editData.id}`,
        {
          sector: editData.sector,
          pax: editData.pax,
          dot: editData.dot,
          dotb: editData.dotb,
          airline: editData.airline,
          fare: editData.fare,
          pnr: editData.pnr,
          agent: editData.agent,
        },
      );

      setShowModal(false);

      if (typeof allData === "function") {
        allData();
      }

      toast.success(response.data?.message || "Record updated successfully!");
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
    const agents = async () => {
      try {
        const response = await axios.get(`${API_URL}/allagents`);
        setAgents(response.data.data || []);
      } catch (error) {
        console.error("error", error);
      }
    };
    agents();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowModal(false);
      }

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSectorList(false);
      }

      if (
        agentDropdownRef.current &&
        !agentDropdownRef.current.contains(event.target) &&
        agentInputRef.current &&
        !agentInputRef.current.contains(event.target)
      ) {
        setShowAgentList(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="content-wrapper">
      <div className="d-flex flex-wrap justify-content-between px-lg-3 text-center gap-3 px-1 py-3 border header-customization">
        <form
          className="d-flex flex-row gap-2 flex-wrap ms-2 ms-lg-0"
          onSubmit={handleSearch}
        >
          <input
            type="search"
            className="form-control sector-link1 sector-wise"
            placeholder="Search By PNR"
            name="pnr"
            value={search.pnr}
            onChange={handleChange}
          />

          <input
            type={showDate1 ? "date" : "text"}
            className="form-control sector-link1 sector-wise"
            placeholder="Select date"
            name="dot"
            value={search.dot}
            onFocus={() => setShowDate1(true)}
            onBlur={(e) => {
              if (!e.target.value) setShowDate1(false);
            }}
            onChange={handleChange}
          />

          <button
            className="btn btn-light sector-link sector-submit1"
            type="submit"
          >
            Search
          </button>
        </form>
      </div>

      <div className="container-fluid px-lg-1 px-xl-4 px-xxl-4 px-2">
        <div className="row mt-3">
          <div className="col-lg-12 col-md-12 col-12 mt-3 mt-lg-0 overflow-x-auto">
            <h5 className="salesdone-page">Sales done from other source</h5>

            <div className="table-wrapper overflow-y-hidden overflow-x-auto">
              <table className="table border table-hover table-sm mb-0">
                <thead className="table-transparent">
                  <tr>
                    <th className="group-pnr1 ps-3 pe-2">S/N</th>

                    <th className="group-pnr1 custom-bold">SECTOR</th>

                    <th className="group-pnr1 custom-bold">PAX</th>

                    <th className="group-pnr1 custom-bold">AIRLINE</th>

                    <th className="group-pnr1 custom-bold">PNR</th>

                    <th className="group-pnr1 pe-2">ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((data, index) => (
                      <tr key={data.id ?? index}>
                        <td className="group-pnr pt-2 ps-3">
                          {startIndex + index + 1}
                        </td>

                        <td className="group-pnr py-2">{data.sector || "-"}</td>

                        <td className="group-pnr">{data.pax || "-"}</td>

                        <td className="group-pnr">{data.airline || "-"}</td>

                        <td className="group-pnr">{data.pnr || "-"}</td>

                        <td>
                          <span title="Edit">
                            <FontAwesomeIcon
                              icon={faEdit}
                              className="custom-color-delete custom-color-edit"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditData({
                                  id: data.id,
                                  sector: data.sector || "",
                                  pax: data.pax || "",
                                  dot: formatForDateInput(data.dot),
                                  dotb: formatForDateInput(data.dotb),
                                  airline: data.airline || "",
                                  fare: data.fare || "",
                                  pnr: data.pnr || "",
                                  agent: data.agent || "",
                                });
                                setShowModal(true);
                              }}
                            />
                          </span>

                          <span title="Delete">
                            <FontAwesomeIcon
                              icon={faTrash}
                              className="custom-color-delete ms-2"
                              style={{ cursor: "pointer" }}
                              onClick={() => deleteData(data.id)}
                            />
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center text-danger fw-bold"
                      >
                        No records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {showModal && (
              <>
                <div className="custom-modal-overlay"></div>
                <div className="modal fade show d-block border" tabIndex="-1">
                  <div
                    className="modal-dialog modal-dialog-centered"
                    ref={modalRef}
                  >
                    <div className="modal-content custom-color">
                      <div className="modal-header py-2">
                        <h5 className="modal-title text-dark">Edit: SDFOS</h5>

                        <button
                          type="button"
                          title="Cut"
                          className="btn-close btn-close-white"
                          onClick={() => setShowModal(false)}
                        ></button>
                      </div>

                      <div className="modal-body">
                        <div className="mb-2 position-relative">
                          <label className="form-label text-dark fw-mediu">
                            Sector Name
                          </label>

                          <input
                            ref={inputRef}
                            type="text"
                            className="form-control sector-wise"
                            placeholder="Sector Name"
                            name="sector"
                            value={editData.sector || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                sector: e.target.value,
                              })
                            }
                            onFocus={() => setShowSectorList(true)}
                            autoComplete="off"
                          />
                        </div>

                        <div className="mb-2">
                          <label className="form-label text-dark fw-medium">
                            PAX Name
                          </label>
                          <input
                            type="text"
                            className="form-control sector-wise"
                            placeholder="PAX Name"
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
                            placeholder="Dot"
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
                            DOTB
                          </label>
                          <input
                            type="date"
                            className="form-control sector-wise"
                            placeholder="Dotb"
                            name="dotb"
                            value={editData.dotb}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                dotb: e.target.value,
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
                            className="form-control sector-wise"
                            placeholder="Airline"
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
                            Fare
                          </label>
                          <input
                            type="text"
                            className="form-control sector-wise"
                            placeholder="Fare"
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
                            PNR
                          </label>
                          <input
                            type="text"
                            className="form-control sector-wise"
                            placeholder="PNR"
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

                        <div className="mb-2 position-relative">
                          <label className="form-label text-dark fw-medium">
                            Agent Name
                          </label>

                          <input
                            type="search"
                            value={editData.agent}
                            ref={agentInputRef}
                            onFocus={() => setShowAgentList(true)}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                agent: e.target.value,
                              })
                            }
                            className="form-control sector-wise"
                            placeholder="Select Agent"
                          />

                          {showAgentList && (
                            <ul
                              ref={agentDropdownRef}
                              className="list-group position-absolute w-100 list-group-custom p-0 border"
                              style={{
                                zIndex: 1055,
                                maxHeight: "130px",
                                overflowY: "auto",
                                backgroundColor: "white",
                              }}
                            >
                              {agents
                                .filter((a) =>
                                  (a.agent_name || "")
                                    .toLowerCase()
                                    .includes(
                                      (editData.agent || "").toLowerCase(),
                                    ),
                                )
                                .map((agent) => (
                                  <li
                                    key={agent.id}
                                    className="list-group-item-action text-dark px-3 rounded-0"
                                    style={{
                                      cursor: "pointer",
                                      padding: "5px 0px",
                                    }}
                                    onClick={() => {
                                      setEditData({
                                        ...editData,
                                        agent: agent.agent_name || "",
                                      });
                                      setShowAgentList(false);
                                    }}
                                  >
                                    {agent.agent_name || "Unnamed Agent"}
                                  </li>
                                ))}
                            </ul>
                          )}
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

            <div className="d-flex flex-row justify-content-center align-items-center gap-3 mb-3">
              {filteredData.length > itemsPerPage && (
                <div className="d-flex justify-content-center align-items-center gap-2">
                  <button
                    className="btn btn-sm btn-outline-success pagination-button1 d-flex align-items-center"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
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
                    className="btn btn-sm btn-outline-success pagination-button1 d-flex align-items-center"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                  >
                    Next{" "}
                    <FontAwesomeIcon
                      icon={faChevronRight}
                      className="custom-awesome"
                    />
                  </button>
                </div>
              )}

              {filteredData.length > 0 && (
                <div className="mt-2 mb-2">
                  <button
                    className="btn btn-success download-btn d-flex align-items-center"
                    onClick={handleDownload}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ marginRight: "6px" }}
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="bottom-right" autoClose={1500} />
    </div>
  );
}

export default SalesDone;
