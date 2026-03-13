import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import "../App.css";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faEdit,
  faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import axiosInstance from "../utils/axiosInstance";


function Staff() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [agent, setAgent] = useState({
    staff_agent: "",
    staff_email: "",
    staff_password: "",
  });

  const [staffList, setStaffList] = useState([]);
  const [dropdownIndex, setDropdownIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

  const [activeAction, setActiveAction] = useState({
    index: null,
    type: null,
  });

  const [editValues, setEditValues] = useState({
    staff_agent: "",
    staff_email: "",
    staff_password: "",
  });

  const [search, setSearch] = useState("");
  const editNameRef = useRef(null);

  const fetchStaff = useCallback(
    async ({ force = false, signal } = {}) => {
      if (editingIndex !== null && !force) return;

      try {
        const response = await axiosInstance.get(`${API_URL}/allstaffs`, { signal });
        const staffRaw = response.data?.data || [];
        const formattedData = staffRaw.map((s) => ({
          staff_agent: s.staff_agent ?? "",
          staff_email: s.staff_email ?? "",
          staff_password: s.staff_password ?? "",
          raw: {
            ...s,
            can_view_fares: Number(s.can_view_fares) === 1 ? 1 : 0,
          },
        }));

        setStaffList(formattedData);
        return formattedData;
      } catch (error) {
        if (axios.isCancel?.(error)) {
        } else {
          console.error("❌ Error fetching staff:", error);
        }
        throw error;
      }
    },
    [API_URL, editingIndex],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchStaff({ force: true, signal: controller.signal }).catch(() => {});
    return () => {
      controller.abort();
    };
  }, [fetchStaff]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAgent((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axiosInstance.post(`${API_URL}/staffpost`, agent, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data?.success) {
        toast.success(response.data.message || "Staff added successfully!");

        setAgent({
          staff_agent: "",
          staff_email: "",
          staff_password: "",
        });

        await fetchStaff({ force: true });
      } else {
        toast.error(response.data?.message || "Something went wrong");
      }
    } catch (err) {
      console.error("Error in handleSubmit:", err);

      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Server connection failed.";

      toast.error(serverMsg);
    }
  };

  const toggleDropdown = (index, e) => {
    if (e) e.stopPropagation();
    if (dropdownIndex === index) {
      setDropdownIndex(null);
      return;
    }
    setEditingIndex(null);
    setDropdownIndex(index);
  };

  const startEdit = (index, staff, e) => {
    if (e) e.stopPropagation();
    if (editingIndex === index) {
      setEditingIndex(null);
      return;
    }
    setEditingIndex(index);
    setDropdownIndex(null);
    setEditValues({
      staff_agent: staff.staff_agent ?? "",
      staff_email: staff.staff_email ?? "",
      staff_password: "",
    });

    setTimeout(() => {
      editNameRef.current?.focus();
      const el = editNameRef.current;
      if (el && typeof el.selectionStart === "number") {
        const len = el.value?.length ?? 0;
        el.setSelectionRange(len, len);
      }
    }, 0);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditValues((prev) => ({ ...prev, [name]: value }));
  };

  const cancelEdit = (e) => {
    if (e) e.stopPropagation();
    setEditingIndex(null);
    setActiveAction({ index: null, type: null });
  };

  const saveEdit = async (displayedIndex, e) => {
    if (e) e.stopPropagation();

    const displayedStaff = staffList.filter((s) => {
      const q = search.trim().toLowerCase();
      return (
        !q ||
        s.staff_agent?.toLowerCase().includes(q) ||
        s.staff_email?.toLowerCase().includes(q)
      );
    });

    const agentToUpdate = displayedStaff[displayedIndex];

    if (!agentToUpdate) {
      toast.error("Staff not found.");
      setEditingIndex(null);
      setActiveAction({ index: null, type: null });
      return;
    }

    const agentId = agentToUpdate.raw?.id;

    try {
      const payload = {
        staff_agent: editValues.staff_agent,
        staff_email: editValues.staff_email,
      };

      if (editValues.staff_password?.trim()) {
        payload.staff_password = editValues.staff_password;
      }

      const response = await axiosInstance.put(
        `${API_URL}/editstaff/${agentId}`,
        payload,
      );

      if (response.data?.success) {
        toast.success("Staff credentials updated successfully");

        setStaffList((prev) => {
          const copy = [...prev];
          const idx = copy.findIndex((s) => s.raw?.id === agentId);

          if (idx !== -1) {
            copy[idx] = {
              ...copy[idx],
              staff_agent: editValues.staff_agent,
              staff_email: editValues.staff_email,
              raw: {
                ...copy[idx].raw,
                staff_agent: editValues.staff_agent,
                staff_email: editValues.staff_email,
              },
            };
          }

          return copy;
        });

        setEditingIndex(null);
        setActiveAction({ index: null, type: null });

        setEditValues({
          staff_agent: "",
          staff_email: "",
          staff_password: "",
        });

        await fetchStaff({ force: true });
      } else {
        toast.error(response.data?.message || "Failed to update staff");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error while updating staff");
    }
  };

  const itemsPerPage = 42;
  const [currentPage, setCurrentPage] = useState(1);

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!Array.isArray(staffList)) return [];
    if (!q) return staffList;
    return staffList.filter(
      (s) =>
        (s.staff_agent || "").toLowerCase().includes(q) ||
        (s.staff_email || "").toLowerCase().includes(q),
    );
  }, [staffList, search]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredStaff.length / itemsPerPage));
  }, [filteredStaff, itemsPerPage]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const paginatedStaff = useMemo(() => {
    if (!Array.isArray(filteredStaff) || filteredStaff.length === 0) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStaff.slice(start, start + itemsPerPage);
  }, [filteredStaff, currentPage, itemsPerPage]);

  const paginatedStartIndex = (currentPage - 1) * itemsPerPage;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const updatePermission = async (agentId, value, field) => {
    if (!agentId || !field) return;

    const prevValue = staffList.find(
      (s) => (s.raw?.id ?? s.raw?.agent_id ?? s.raw?.staff_id) === agentId,
    )?.raw?.[field];

    setStaffList((prev) =>
      prev.map((s) => {
        const id = s.raw?.id ?? s.raw?.agent_id ?? s.raw?.staff_id;
        return id === agentId
          ? {
              ...s,
              raw: {
                ...s.raw,
                [field]: value,
              },
            }
          : s;
      }),
    );

    try {
      await axiosInstance.put(`${API_URL}/staff/toggle/${agentId}`, {
        field,
        value,
      });

      toast.success("Permission updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update permission");

      setStaffList((prev) =>
        prev.map((s) => {
          const id = s.raw?.id ?? s.raw?.agent_id ?? s.raw?.staff_id;
          return id === agentId
            ? {
                ...s,
                raw: {
                  ...s.raw,
                  [field]: prevValue,
                },
              }
            : s;
        }),
      );
    }
  };

  return (
    <div className="content-wrapper">
      <div className="d-flex flex-wrap justify-content-start mb-0 text-center border header-customization gap-5 px-1 m-0 py-3 mt-0">
        <form onSubmit={handleSubmit}>
          <div className="row g-2 ms-1 me-1 align-items-center">
            <div className="col-12 col-sm-6 col-lg-3">
              <input
                type="text"
                placeholder="Staff Name"
                className="form-control sector-link sector-wise"
                name="staff_agent"
                value={agent.staff_agent}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <input
                type="email"
                placeholder="Staff Email"
                className="form-control sector-link sector-wise"
                name="staff_email"
                value={agent.staff_email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <input
                type="password"
                placeholder="Staff Password"
                className="form-control sector-link sector-wise"
                name="staff_password"
                value={agent.staff_password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-12 col-sm-6 col-lg-3 d-flex gap-2">
              <button
                className="btn btn-light flex-shrink-0 text-light update-update"
                type="submit"
              >
                Add
              </button>

              <input
                type="search"
                className="form-control sector-link sector-wise"
                placeholder="Search Staff"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </form>
      </div>

      <div className="row p-2">
        {filteredStaff.length === 0 ? (
          <div className="text-center fw-medium text-danger">
            No staff available.
          </div>
        ) : (
          paginatedStaff.map((staff, idx) => {
            const displayedIndex = paginatedStartIndex + idx;
            const keyId = staff.raw?.id ?? staff.staff_email ?? displayedIndex;

            return (
              <div
                className="col-12 col-md-12 col-lg-6 col-xl-4 col-xxl-4 mb-2 pb-1"
                key={keyId}
              >
                <div className="table-responsive rounded-2 border">
                  <table className="table table-sm table-fixed mb-0">
                    <thead
                      className="table-transparent"
                      style={{ height: "37px" }}
                    >
                      <tr>
                        <th className="text-truncate align-middle name-col px-2">
                          <span className="group-pnr" style={{ maxWidth: 160 }}>
                            {staff.staff_agent}
                          </span>
                        </th>

                        <th className="email-col align-middle">
                          <span style={{ maxWidth: 200 }}>
                            {staff.staff_email}
                          </span>
                        </th>

                        <th className="text-center align-middle action-col">
                          <div className="d-flex justify-content-center align-items-center gap-0">
                            <span
                              className={`action-icon ${
                                activeAction.index === displayedIndex &&
                                activeAction.type === "perm"
                                  ? "active"
                                  : ""
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveAction((prev) => {
                                  if (
                                    prev.index === displayedIndex &&
                                    prev.type === "perm"
                                  ) {
                                    return { index: null, type: null };
                                  }
                                  return {
                                    index: displayedIndex,
                                    type: "perm",
                                  };
                                });

                                toggleDropdown(displayedIndex, e);
                              }}
                              title="Permissions"
                            >
                              <FontAwesomeIcon
                                icon={faUserShield}
                                className="edit-icon"
                              />
                            </span>

                            <span
                              className={`action-icon py-2 ${
                                activeAction.index === displayedIndex &&
                                activeAction.type === "edit"
                                  ? "active"
                                  : ""
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();

                                setActiveAction((prev) => {
                                  if (
                                    prev.index === displayedIndex &&
                                    prev.type === "edit"
                                  ) {
                                    return { index: null, type: null };
                                  }
                                  return {
                                    index: displayedIndex,
                                    type: "edit",
                                  };
                                });

                                startEdit(displayedIndex, staff, e);
                              }}
                              title="Edit"
                            >
                              <FontAwesomeIcon
                                icon={faEdit}
                                className="edit-icon"
                              />
                            </span>
                          </div>
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {editingIndex === displayedIndex ? (
                        <tr>
                          <td colSpan={3} className="text-start px-3 py-2">
                            <div className="row g-2">
                              <div className="col-12">
                                <input
                                  ref={editNameRef}
                                  type="text"
                                  name="staff_agent"
                                  value={editValues.staff_agent}
                                  onChange={handleEditChange}
                                  className="form-control form-control-sm sector-wise"
                                  placeholder="Staff name"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>

                              <div className="col-12">
                                <input
                                  type="email"
                                  name="staff_email"
                                  value={editValues.staff_email}
                                  onChange={handleEditChange}
                                  className="form-control form-control-sm sector-wise"
                                  placeholder="Staff email"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>

                              <div className="col-12">
                                <input
                                  type="password"
                                  name="staff_password"
                                  value={editValues.staff_password}
                                  onChange={handleEditChange}
                                  className="form-control form-control-sm sector-wise"
                                  placeholder="New password"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>

                              <div className="col-12 d-flex gap-2">
                                <button
                                  className="btn btn-sm btn-success update-update"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={(e) => saveEdit(displayedIndex, e)}
                                >
                                  Save
                                </button>

                                <button
                                  className="btn btn-sm btn-outline-success update-update1"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={cancelEdit}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : dropdownIndex === displayedIndex ? (
                        <>
                          <tr>
                            <td
                              colSpan={2}
                              className="text-start ps-3 border-bottom-0"
                            >
                              <Link
                                className="text-decoration-none item-color"
                                to="/admin/staff"
                              >
                                Can View Fares
                              </Link>
                            </td>

                            <td className="border-bottom-0">
                              <div
                                className="checkbox-wrapper d-flex justify-content-center w-100"
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                  const agentId =
                                    staff.raw?.id ??
                                    staff.raw?.agent_id ??
                                    staff.raw?.staff_id;

                                  const newValue =
                                    Number(staff.raw?.can_view_fares) === 1
                                      ? 0
                                      : 1;

                                  updatePermission(
                                    agentId,
                                    newValue,
                                    "can_view_fares",
                                  );
                                }}
                              >
                                {Number(staff.raw?.can_view_fares) === 1 ? (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide lucide-check tick-svg"
                                  >
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                ) : (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide lucide-x tick-cross"
                                  >
                                    <path d="M18 6 6 18" />
                                    <path d="M6 6 18 18" />
                                  </svg>
                                )}
                              </div>
                            </td>
                          </tr>

                          <tr>
                            <td
                              colSpan={2}
                              className="text-start ps-3 border-bottom-0"
                            >
                              <Link
                                className="text-decoration-none item-color"
                                to="/admin/staff"
                              >
                                Can View Sales
                              </Link>
                            </td>

                            <td className="border-bottom-0">
                              <div
                                className="checkbox-wrapper d-flex justify-content-center w-100"
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                  const agentId =
                                    staff.raw?.id ??
                                    staff.raw?.agent_id ??
                                    staff.raw?.staff_id;

                                  const newValue =
                                    Number(staff.raw?.can_view_sales) === 1
                                      ? 0
                                      : 1;

                                  setStaffList((prev) =>
                                    prev.map((s) => {
                                      const id =
                                        s.raw?.id ??
                                        s.raw?.agent_id ??
                                        s.raw?.staff_id;
                                      return id === agentId
                                        ? {
                                            ...s,
                                            raw: {
                                              ...s.raw,
                                              can_view_sales: newValue,
                                            },
                                          }
                                        : s;
                                    }),
                                  );

                                  updatePermission(
                                    agentId,
                                    newValue,
                                    "can_view_sales",
                                  );
                                }}
                              >
                                {Number(staff.raw?.can_view_sales) === 1 ? (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide lucide-check tick-svg"
                                  >
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                ) : (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide lucide-x tick-cross"
                                  >
                                    <path d="M18 6 6 18" />
                                    <path d="M6 6 18 18" />
                                  </svg>
                                )}
                              </div>
                            </td>
                          </tr>

                          <tr>
                            <td
                              colSpan={2}
                              className="text-start ps-3  border-bottom-0"
                            >
                              <Link
                                className="text-decoration-none item-color"
                                to="/admin/staff"
                              >
                                Can Edit Stock
                              </Link>
                            </td>

                            <td className="border-bottom-0">
                              <div
                                className="checkbox-wrapper d-flex justify-content-center w-100"
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                  const agentId =
                                    staff.raw?.id ??
                                    staff.raw?.agent_id ??
                                    staff.raw?.staff_id;

                                  const newValue =
                                    Number(staff.raw?.can_edit_stock) === 1
                                      ? 0
                                      : 1;

                                  updatePermission(
                                    agentId,
                                    newValue,
                                    "can_edit_stock",
                                  );
                                }}
                              >
                                {Number(staff.raw?.can_edit_stock) === 1 ? (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide lucide-check tick-svg"
                                  >
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                ) : (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide lucide-x tick-cross"
                                  >
                                    <path d="M18 6 6 18" />
                                    <path d="M6 6 18 18" />
                                  </svg>
                                )}
                              </div>
                            </td>
                          </tr>

                          <tr>
                            <td colSpan={2} className="text-start ps-3">
                              <Link
                                className="item-color text-decoration-none"
                                to="/admin/staff"
                              >
                                Can Manage Staff
                              </Link>
                            </td>

                            <td className="border-bottom-0">
                              <div
                                className="checkbox-wrapper d-flex justify-content-center w-100"
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                  const agentId =
                                    staff.raw?.id ??
                                    staff.raw?.agent_id ??
                                    staff.raw?.staff_id;

                                  const newValue =
                                    Number(staff.raw?.can_manage_staff) === 1
                                      ? 0
                                      : 1;

                                  updatePermission(
                                    agentId,
                                    newValue,
                                    "can_manage_staff",
                                  );
                                }}
                              >
                                {Number(staff.raw?.can_manage_staff) === 1 ? (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide lucide-check tick-svg"
                                  >
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                ) : (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide lucide-x tick-cross"
                                  >
                                    <path d="M18 6 6 18" />
                                    <path d="M6 6 18 18" />
                                  </svg>
                                )}
                              </div>
                            </td>
                          </tr>
                        </>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="d-flex justify-content-center gap-2 align-items-center mt-3">
          <button
            type="button"
            className="btn btn-sm btn-outline-success pagination-button1 d-flex align-items-center"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <FontAwesomeIcon icon={faChevronLeft} className="custom-awesome1" />{" "}
            Prev
          </button>

          <span className="small fw-medium text-dark">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            className="btn btn-sm btn-outline-success pagination-button1 d-flex align-items-center"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <FontAwesomeIcon icon={faChevronRight} className="custom-awesome" />
          </button>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={1000} />
    </div>
  );
}

export default Staff;
