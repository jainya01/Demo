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

function Agent() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [agent, setAgent] = useState({
    agent_name: "",
    agent_email: "",
    agent_password: "",
  });

  const [staffList, setStaffList] = useState([]);
  const [dropdownIndex, setDropdownIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [activeAction, setActiveAction] = useState({
    index: null,
    type: null,
  });

  const [editValues, setEditValues] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [search, setSearch] = useState("");
  const itemsPerPage = 42;
  const [currentPage, setCurrentPage] = useState(1);
  const editNameRef = useRef(null);

  const fetchStaff = useCallback(
    async ({ force = false, signal } = {}) => {
      if (editingIndex !== null && !force) return;

      try {
        const response = await axiosInstance.get(`${API_URL}/allagents`, { signal });

        const agentsRaw = Array.isArray(response.data)
          ? response.data
          : response.data?.data || [];

        const formattedData = agentsRaw.map((a) => ({
          name: a.agent_name ?? "",
          email: a.agent_email ?? "",
          raw: a,
        }));

        setStaffList(formattedData);
        return formattedData;
      } catch (error) {
        if (axios.isCancel?.(error)) {
        } else {
          console.error("❌ Error fetching agents:", error);
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
      const response = await axiosInstance.post(`${API_URL}/agentpost`, agent, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data?.success) {
        toast.success(response.data.message || "Agent added successfully!");

        setAgent({
          agent_name: "",
          agent_email: "",
          agent_password: "",
        });

        await fetchStaff({ force: true });
      } else {
        toast.error(response.data?.message || "Something went wrong");
      }
    } catch (err) {
      if (err.response) {
        const serverMsg =
          err.response.data?.message ||
          err.response.data?.error ||
          "Server error";

        toast.error(serverMsg);
      } else if (err.request) {
        toast.error("No response from server.");
      } else {
        toast.error(err.message || "Request failed.");
      }
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
      name: staff.name ?? "",
      email: staff.email ?? "",
      password: "",
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

    const q = search.trim().toLowerCase();

    const displayedStaff = staffList.filter((s) => {
      return (
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    });

    const agentToUpdate = displayedStaff[displayedIndex];

    if (!agentToUpdate) {
      toast.error("Agent not found.");
      setEditingIndex(null);
      setActiveAction({ index: null, type: null });
      return;
    }

    const agentId =
      agentToUpdate.raw?.id ??
      agentToUpdate.raw?.agent_id ??
      agentToUpdate.raw?.staff_id;

    try {
      const payload = {
        agent_name: editValues.name,
        agent_email: editValues.email,
      };

      if (editValues.password?.trim()) {
        payload.agent_password = editValues.password;
      }

      const response = await axiosInstance.put(
        `${API_URL}/editagent/${agentId}`,
        payload,
      );

      if (response.data?.success) {
        toast.success("Agent credentials updated successfully");

        setStaffList((prev) =>
          prev.map((s) => {
            const id = s.raw?.id ?? s.raw?.agent_id ?? s.raw?.staff_id;

            return id === agentId
              ? {
                  ...s,
                  name: editValues.name,
                  email: editValues.email,
                  raw: {
                    ...s.raw,
                    agent_name: editValues.name,
                    agent_email: editValues.email,
                  },
                }
              : s;
          }),
        );

        setEditingIndex(null);
        setActiveAction({ index: null, type: null });

        setEditValues({ name: "", email: "", password: "" });
      } else {
        toast.error(response.data?.message || "Failed to update agent");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error while updating agent");
    }
  };

  const [agents, setAgents] = useState([]);

  useEffect(() => {
    const allStaff = async () => {
      try {
        const res = await axiosInstance.get(`${API_URL}/allagents`);
        const list = res.data?.data || [];

        const normalized = list.map((s) => ({
          ...s,
          can_view_fares: Number(s.can_view_fares) === 1 ? 1 : 0,
          can_view_agents: Number(s.can_view_agents) === 1 ? 1 : 0,
        }));

        setAgents(normalized);
      } catch (err) {
        console.error(err);
      }
    };

    allStaff();
  }, [API_URL]);

  const updatePermission = async (agentId, field, value) => {
    try {
      const payload = {
        field,
        value: Number(value),
      };

      const res = await axiosInstance.put(
        `${API_URL}/agent/toggle/${agentId}`,
        payload,
      );

      const success = res?.data?.success;

      if (success) {
        toast.success("Permission updated successfully!");
        return true;
      }

      toast.error(res?.data?.message || "Failed to update permission");
      return false;
    } catch (err) {
      console.error("Permission update error:", err);
      toast.error("Server error while updating permission");
      return false;
    }
  };

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return Array.isArray(staffList)
      ? staffList.filter((s) => {
          if (!search) return true;
          return (
            s.name?.toLowerCase().includes(q) ||
            s.email?.toLowerCase().includes(q)
          );
        })
      : [];
  }, [staffList, search]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredStaff.length / itemsPerPage));
  }, [filteredStaff, itemsPerPage]);

  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStaff.slice(start, start + itemsPerPage);
  }, [filteredStaff, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <div className="content-wrapper">
      <div className="d-flex flex-wrap justify-content-start mb-0 text-center border header-customization gap-5 px-1 m-0 py-3 mt-0">
        <form onSubmit={handleSubmit}>
          <div className="row g-2 ms-1 me-1 align-items-center">
            <div className="col-12 col-sm-6 col-lg-3">
              <input
                type="text"
                placeholder="Agent Name"
                className="form-control sector-link sector-wise"
                name="agent_name"
                value={agent.agent_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <input
                type="email"
                placeholder="Agent Email"
                className="form-control sector-link sector-wise"
                name="agent_email"
                value={agent.agent_email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <input
                type="password"
                placeholder="Agent Password"
                className="form-control sector-link sector-wise"
                name="agent_password"
                value={agent.agent_password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="col-12 col-sm-6 col-lg-3 d-flex gap-2">
              <button
                className="btn btn-light flex-shrink-0 update-update text-light"
                type="submit"
              >
                Add
              </button>

              <input
                type="search"
                className="form-control sector-link sector-wise"
                placeholder="Search Agent"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </form>
      </div>

      <div className="row p-2">
        {!paginatedStaff || paginatedStaff.length === 0 ? (
          <div className="col-12">
            <div className="text-center fw-medium text-danger">
              No agent available.
            </div>
          </div>
        ) : (
          paginatedStaff.map((staff, idx) => {
            const displayedIndex = idx;
            const globalIndex = (currentPage - 1) * itemsPerPage + idx;

            const keyId =
              staff.raw?.id ??
              staff.raw?.agent_id ??
              staff.raw?.staff_id ??
              staff.email ??
              globalIndex;

            return (
              <div
                className="col-12 col-md-12 col-lg-6 col-xl-4 col-xxl-4 mb-2 pb-1"
                key={keyId}
              >
                <div className="table-responsive rounded-2 border">
                  <table className="table table-sm table-fixed mb-0">
                    <thead
                      className="table-transparent"
                      style={{
                        height: "39px",
                      }}
                    >
                      <tr>
                        <th className="text-truncate text-start px-2 name-col align-middle">
                          <span
                            className="group-pnr"
                            style={{
                              maxWidth: 160,
                            }}
                          >
                            {staff.name}
                          </span>
                        </th>

                        <th className="email-col align-middle text-truncate">
                          <span style={{ maxWidth: 200 }}>{staff.email}</span>
                        </th>

                        <th className="text-center p-0 align-middle action-col">
                          <div className="d-flex justify-content-center align-items-center gap-0">
                            <span
                              className={`action-icon ${
                                activeAction.index === globalIndex &&
                                activeAction.type === "perm"
                                  ? "active"
                                  : ""
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();

                                setActiveAction((prev) => {
                                  if (
                                    prev.index === globalIndex &&
                                    prev.type === "perm"
                                  ) {
                                    return { index: null, type: null };
                                  }

                                  return {
                                    index: globalIndex,
                                    type: "perm",
                                  };
                                });

                                toggleDropdown(globalIndex, e);
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
                                activeAction.index === globalIndex &&
                                activeAction.type === "edit"
                                  ? "active"
                                  : ""
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();

                                setActiveAction((prev) => {
                                  if (
                                    prev.index === globalIndex &&
                                    prev.type === "edit"
                                  ) {
                                    return { index: null, type: null };
                                  }

                                  return {
                                    index: globalIndex,
                                    type: "edit",
                                  };
                                });

                                startEdit(globalIndex, staff, e);
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
                      {editingIndex === globalIndex ? (
                        <tr>
                          <td colSpan={3} className="text-start px-3 py-2">
                            <div className="row g-2">
                              <div className="col-12">
                                <input
                                  ref={editNameRef}
                                  type="text"
                                  name="name"
                                  value={editValues.name}
                                  onChange={handleEditChange}
                                  className="form-control form-control-sm sector-wise"
                                  placeholder="Agent name"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>

                              <div className="col-12">
                                <input
                                  type="email"
                                  name="email"
                                  value={editValues.email}
                                  onChange={handleEditChange}
                                  className="form-control form-control-sm sector-wise"
                                  placeholder="Agent email"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>

                              <div className="col-12">
                                <input
                                  type="password"
                                  name="password"
                                  value={editValues.password}
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
                      ) : dropdownIndex === globalIndex ? (
                        <>
                          <tr>
                            <td
                              colSpan={2}
                              className="text-start ps-3 border-bottom-0"
                            >
                              <Link
                                className="text-decoration-none item-color"
                                to="/admin/agent"
                              >
                                Can View Agents
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
                                    Number(staff.raw?.can_view_agents) === 1
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
                                              can_view_agents: newValue,
                                            },
                                          }
                                        : s;
                                    }),
                                  );

                                  updatePermission(
                                    agentId,
                                    "can_view_agents",
                                    newValue,
                                  );
                                }}
                              >
                                {Number(staff.raw?.can_view_agents) === 1 ? (
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
                                    className="lucide lucide-check w-4 h-4 tick-svg"
                                  >
                                    <path d="M20 6 9 17l-5-5"></path>
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
                                    className="lucide lucide-x w-4 h-4 tick-cross"
                                  >
                                    <path d="M18 6 6 18"></path>
                                    <path d="m6 6 12 12"></path>
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
                                className="item-color text-decoration-none"
                                to="/admin/agent"
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
                                              can_view_fares: newValue,
                                            },
                                          }
                                        : s;
                                    }),
                                  );

                                  updatePermission(
                                    agentId,
                                    "can_view_fares",
                                    newValue,
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
                                    className="lucide lucide-check w-4 h-4 tick-svg"
                                  >
                                    <path d="M20 6 9 17l-5-5"></path>
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
                                    className="lucide lucide-x w-4 h-4 tick-cross"
                                  >
                                    <path d="M18 6 6 18"></path>
                                    <path d="m6 6 12 12"></path>
                                  </svg>
                                )}
                              </div>
                            </td>
                          </tr>

                          <tr>
                            <td
                              colSpan={2}
                              className="text-danger text-start ps-3 border-bottom-0"
                            >
                              <Link
                                className="text-dark text-decoration-none"
                                to="/admin/agent"
                              >
                                Can View Sales
                              </Link>
                            </td>

                            <td className="border-bottom-0">
                              <div
                                className="checkbox-wrapper d-flex justify-content-center w-100"
                                style={{ cursor: "pointer" }}
                                onClick={async () => {
                                  const agentId =
                                    staff.raw?.id ??
                                    staff.raw?.agent_id ??
                                    staff.raw?.staff_id;

                                  const currentValue = Number(
                                    staff.raw?.can_view_sales,
                                  );
                                  const newValue = currentValue === 1 ? 0 : 1;

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

                                  try {
                                    const res = await updatePermission(
                                      agentId,
                                      "can_view_sales",
                                      newValue,
                                    );

                                    if (!res) {
                                      throw new Error(
                                        "Permission update failed",
                                      );
                                    }
                                  } catch (error) {
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
                                                can_view_sales: currentValue,
                                              },
                                            }
                                          : s;
                                      }),
                                    );
                                  }
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
                                    <path d="M20 6 9 17l-5-5"></path>
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
                                    <path d="M18 6 6 18"></path>
                                    <path d="m6 6 12 12"></path>
                                  </svg>
                                )}
                              </div>
                            </td>
                          </tr>

                          <tr>
                            <td
                              colSpan={2}
                              className="text-danger text-start ps-3 border-bottom-0"
                            >
                              <Link
                                className="text-dark text-decoration-none"
                                to="/admin/agent"
                              >
                                Can Edit Stock
                              </Link>
                            </td>

                            <td className="border-bottom-0">
                              <div
                                className="checkbox-wrapper d-flex justify-content-center w-100"
                                style={{ cursor: "pointer" }}
                                onClick={async () => {
                                  const agentId =
                                    staff.raw?.id ??
                                    staff.raw?.agent_id ??
                                    staff.raw?.staff_id;

                                  const currentValue = Number(
                                    staff.raw?.can_edit_stock,
                                  );
                                  const newValue = currentValue === 1 ? 0 : 1;

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
                                              can_edit_stock: newValue,
                                            },
                                          }
                                        : s;
                                    }),
                                  );

                                  try {
                                    const res = await updatePermission(
                                      agentId,
                                      "can_edit_stock",
                                      newValue,
                                    );

                                    if (!res) {
                                      throw new Error(
                                        "Permission update failed",
                                      );
                                    }
                                  } catch (error) {
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
                                                can_edit_stock: currentValue,
                                              },
                                            }
                                          : s;
                                      }),
                                    );
                                  }
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
                                    <path d="M20 6 9 17l-5-5"></path>
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
                                    <path d="M18 6 6 18"></path>
                                    <path d="m6 6 12 12"></path>
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

export default Agent;
