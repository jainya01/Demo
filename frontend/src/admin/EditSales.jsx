import { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import { toast, ToastContainer } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import axiosInstance from "../utils/axiosInstance";

function EditSales() {
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

  useEffect(() => {
    const allData = async () => {
      try {
        const response = await axiosInstance.get(`${API_URL}/alleditsales`);
        setUser(response.data.data);
        setFilteredData(response.data.data);
      } catch (error) {
        console.error("error", error);
      }
    };
    allData();
  }, []);

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
        if (!item?.dot || typeof item.dot !== "string") return true;

        let formattedDot = "";

        if (/^\d{2}-\d{2}-\d{4}$/.test(item.dot)) {
          const [dd, mm, yyyy] = item.dot.split("-");
          formattedDot = `${yyyy}-${mm}-${dd}`;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(item.dot)) {
          formattedDot = item.dot;
        } else {
          return true;
        }

        return formattedDot === search.dot;
      });
    }

    setFilteredData(filtered);
    setCurrentPage(1);
  };

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
    saveAs(blob, "Edit Sales.xlsx");
  };

  return (
    <div className="content-wrapper">
      <div className="d-flex flex-wrap justify-content-between px-lg-4 px-0 mb-0 text-center gap-3 px-1 m-0 py-3 mt-0 border header-customization">
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
            className="btn btn-light sector-submit sector-submit1"
            type="submit"
          >
            Search
          </button>
        </form>
      </div>

      <div className="container-fluid px-lg-1 px-xl-4 px-xxl-4 px-2">
        <div className="row mt-3">
          <div className="col-lg-12 col-md-12 col-12 mb-0 overflow-x-auto">
            <h5 className="salesdone-page">Edited Sales</h5>

            <div className="table-wrapper overflow-y-hidden overflow-x-auto">
              <table className="table border table-hover table-sm mb-0">
                <thead className="table-transparent">
                  <tr>
                    <th className="group-pnr1 ps-3 pe-2">S/N</th>

                    <th className="group-pnr1 custom-bold">SECTOR</th>

                    <th className="group-pnr1 custom-bold">PAX NAME</th>

                    <th className="group-pnr1 custom-bold">AIRLINE</th>

                    <th className="group-pnr1 custom-bold">FARE</th>

                    <th className="group-pnr1 custom-bold">PNR</th>
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

                        <td className="group-pnr">{data.fare || "-"}</td>

                        <td className="group-pnr">{data.pnr || "-"}</td>
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

            <div className="d-flex flex-row justify-content-center align-items-center gap-3">
              {filteredData.length > itemsPerPage && (
                <div className="d-flex justify-content-center align-items-center mt-3 gap-2">
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
                <div className="mt-3 mb-2">
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

export default EditSales;
