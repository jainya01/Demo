import { useEffect, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faEye,
  faEyeSlash,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import axiosInstance from "../utils/axiosInstance";

function Settings() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [logo, setLogo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState([]);
  const [emailForm, setEmailForm] = useState({ email: "", description: "" });
  const [emailErrors, setEmailErrors] = useState({});
  const [nameErrors, setNameErrors] = useState({});
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchLogo = async () => {
      try {
        const response = await axiosInstance.get(`${API_URL}/get-logo`, {
          signal: controller.signal,
        });

        const data = response.data;

        if (data.success && data.logo && data.logo.logo) {
          const baseURL = API_URL.replace(/\/api$/, "");
          setLogo(`${baseURL}/uploads/${data.logo.logo}`);
        } else {
          setLogo(null);
        }
      } catch (error) {
        if (axios.isCancel(error)) return;

        console.error("Error fetching logo:", error);
        setLogo(null);
      }
    };

    fetchLogo();

    return () => {
      controller.abort();
    };
  }, [API_URL]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleLogoUpload = async () => {
    if (!file) {
      toast.warning("Please select a logo first!", {
        position: "bottom-right",
        autoClose: 1000,
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const response = await axiosInstance.post(
        `${API_URL}/change-logo`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      if (response.data.success) {
        const baseURL = API_URL.replace(/\/api$/, "");
        setLogo(`${baseURL}/uploads/${response.data.file.filename}`);
        setPreview(null);
        setFile(null);

        toast.success(
          "Logo updated successfully. Refresh the page to see changes.",
          {
            position: "bottom-right",
            autoClose: 1000,
          },
        );
      }
    } catch (error) {
      toast.error("Failed to upload logo. Please try again.", {
        position: "bottom-right",
        autoClose: 1000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (ev) => {
    const { name, value } = ev.target;
    setEmailForm((s) => ({ ...s, [name]: value }));
    setEmailErrors((s) => ({ ...s, [name]: undefined }));
    setNameErrors((s) => ({ ...s, [name]: undefined }));
  };

  const handleEmailSubmit = async (ev) => {
    ev.preventDefault();

    setEmailSubmitting(true);
    try {
      const payload = {
        email: (emailForm.email || "").trim(),
        description: (emailForm.description || "").trim(),
      };

      const response = await axiosInstance.post(`${API_URL}/postmail`, payload);

      const isSuccess =
        (response.data && response.data.success === true) ||
        response.status === 200;

      if (isSuccess) {
        const newRow = {
          id: response.data?.insertedId ?? Date.now(),
          email: payload.email,
          description: payload.description,
        };

        setEmails((prev) =>
          Array.isArray(prev) ? [newRow, ...prev] : [newRow],
        );

        setEmailForm({ email: "", description: "" });

        toast.success("Company email added successfully", {
          position: "bottom-right",
          autoClose: 1000,
        });
      } else {
        console.error("API error adding email:", response.data);
        toast.error(response.data?.message || "Failed to add email", {
          position: "bottom-right",
          autoClose: 1000,
        });
      }
    } catch (err) {
      console.error("Error adding email:", err);
      toast.error("Failed to add company email", {
        position: "bottom-right",
        autoClose: 1000,
      });
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleEmailDelete = async (idOrNull, index = null) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this company email?",
    );
    if (!confirmed) return;

    const idForApi = idOrNull ?? emails[index]?.id ?? null;
    const deletingKey = idForApi ?? index;

    setDeletingId(deletingKey);

    try {
      if (idForApi == null) {
        setEmails((prev) => prev.filter((_, i) => i !== index));

        toast.success("Email deleted successfully");
        return;
      }

      const response = await axiosInstance.delete(
        `${API_URL}/emaildelete/${idForApi}`,
      );

      const success =
        (response && response.status === 200) ||
        (response.data &&
          (response.data.success === true ||
            response.data === "deleted" ||
            response.data === "Email deleted" ||
            (typeof response.data === "object" &&
              response.data.message &&
              /deleted/i.test(response.data.message))));

      if (success) {
        setEmails((prev) =>
          prev.filter((e) => String(e.id) !== String(idForApi)),
        );

        toast.success("Email deleted successfully");
      } else {
        toast.error("Failed to delete email");
      }
    } catch (err) {
      toast.error("Something went wrong while deleting email");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const allemails = async () => {
      try {
        const response = await axiosInstance.get(`${API_URL}/allemails`, {
          signal: controller.signal,
        });

        setEmails(response.data.data || []);
      } catch (error) {
        if (axios.isCancel(error)) {
        } else {
          console.error("Error fetching emails:", error);
        }
      }
    };

    allemails();

    return () => {
      controller.abort();
    };
  }, [API_URL]);

  const [adminEmailSubmitting, setAdminEmailSubmitting] = useState(false);
  const [adminEmail, setAdminEmail] = useState([]);

  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [deletingId1, setDeletingId1] = useState(null);

  const fetchAdmins = async () => {
    try {
      const response = await axiosInstance.get(`${API_URL}/alladmindata`);
      const list = response.data?.data || [];

      const findIdInObject = (obj) => {
        if (!obj || typeof obj !== "object") return null;
        const directKeys = Object.keys(obj);

        const keyByName = directKeys.find((k) => /^id$/i.test(k));
        if (keyByName) return obj[keyByName];

        const keyEndsId = directKeys.find((k) => /id$/i.test(k));
        if (keyEndsId) return obj[keyEndsId];

        const numericKey = directKeys.find((k) => {
          const v = obj[k];
          return (
            (typeof v === "number" && Number.isFinite(v) && v > 0) ||
            (typeof v === "string" && /^\d+$/.test(v) && Number(v) > 0)
          );
        });
        if (numericKey) return obj[numericKey];

        for (const k of directKeys) {
          const v = obj[k];
          if (v && typeof v === "object") {
            const nested = findIdInObject(v);
            if (nested != null) return nested;
          }
        }

        return null;
      };

      const normalized = list.map((r) => {
        const found = findIdInObject(r);
        return {
          ...r,
          id: found != null ? String(found) : null,
        };
      });

      setAdminEmail(normalized);
    } catch (error) {
      console.error("Error fetching admins", error);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, [API_URL]);

  function formatAxiosError(err) {
    if (!err) return "Unknown error";
    if (err.response) {
      const status = err.response.status;
      const data = err.response.data;
      const serverMsg =
        (data && (data.message || data.error || data.msg || data.reason)) ||
        (typeof data === "string" ? data : null);
      return `Server ${status}${serverMsg ? `: ${serverMsg}` : ""}`;
    }
    if (err.request) {
      return "No response from server (request sent)";
    }
    return `Client error: ${err.message}`;
  }

  const handleAdminEmailSubmit = async (ev) => {
    ev.preventDefault();
    setAdminEmailSubmitting(true);

    try {
      const name = (adminForm.name || "").trim();
      const email = (adminForm.email || "").trim();
      const password = (adminForm.password || "").trim();

      if (!name) {
        toast.error("Please enter full name");
        setAdminEmailSubmitting(false);
        return;
      }

      if (name.length < 3) {
        toast.error("Full name must be at least 3 characters");
        setAdminEmailSubmitting(false);
        return;
      }

      if (!email) {
        toast.error("Please enter admin email");
        setAdminEmailSubmitting(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast.error("Enter a valid email address");
        setAdminEmailSubmitting(false);
        return;
      }

      if (!password || password.length < 6) {
        toast.error("Password must be at least 6 characters");
        setAdminEmailSubmitting(false);
        return;
      }

      const payload = {
        name,
        email,
        password,
      };

      const response = await axiosInstance.post(
        `${API_URL}/postadminmail`,
        payload,
        {
          headers: { Accept: "application/json" },
          validateStatus: () => true,
        },
      );

      const isSuccess =
        response.status === 200 ||
        response.status === 201 ||
        response.data?.success ||
        response.data?.insertedId;

      if (isSuccess) {
        await fetchAdmins();

        setAdminForm({
          name: "",
          email: "",
          password: "",
        });

        toast.success("Admin added successfully", {
          position: "bottom-right",
          autoClose: 1000,
        });
      } else {
        const serverMsg =
          response.data?.message || response.data?.error || response.data?.msg;

        toast.error(serverMsg || "Failed to add admin", {
          position: "bottom-right",
          autoClose: 1600,
        });
      }
    } catch (err) {
      const msg = formatAxiosError(err);
      toast.error(msg, {
        position: "bottom-right",
        autoClose: 2000,
      });
    } finally {
      setAdminEmailSubmitting(false);
    }
  };

  const handleAdminDelete = async (idOrNull, index = null) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this admin?",
    );
    if (!confirmed) return;

    const itemsId = idOrNull ?? `tmp-${index}`;
    setDeletingId1(itemsId);

    try {
      if (idOrNull == null) {
        setAdminEmail((prev) => prev.filter((_, i) => i !== index));
        return;
      }

      const idNum = Number(idOrNull);
      if (Number.isNaN(idNum)) {
        toast.error("Cannot delete: invalid admin id");
        return;
      }

      const response = await axiosInstance.delete(
        `${API_URL}/admindelete/${idNum}`,
      );

      const success =
        (response && response.status === 200) ||
        (response?.data &&
          (response.data.success === true ||
            response.data === "deleted" ||
            response.data === "Email deleted" ||
            (typeof response.data === "object" &&
              response.data.message &&
              /deleted/i.test(response.data.message))));

      if (success) {
        await fetchAdmins();
        toast.success("Admin deleted successfully", {
          position: "bottom-right",
          autoClose: 1000,
        });
      } else {
        console.error("Delete API responded with:", response?.data);
        toast.error("Failed to delete admin");
      }
    } catch (err) {
      console.error("Error deleting admin:", err);
      toast.error("Error deleting admin");
    } finally {
      setDeletingId1(null);
    }
  };

  const handleAdminChange = (ev) => {
    const { name, value } = ev.target;
    setAdminForm((s) => ({ ...s, [name]: value }));
  };

  const [adminEmailField, setAdminEmailField] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    const toastOptions = {
      position: "bottom-right",
      autoClose: 1000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    };

    if (!selectedAdminId || !adminEmailField || !newPassword) {
      toast.error("Please fill all fields", toastOptions);
      return;
    }

    try {
      await axiosInstance.put(`${API_URL}/editadmin/${selectedAdminId}`, {
        newEmail: adminEmailField,
        newPassword: newPassword,
      });

      toast.success("Admin credentials updated successfully", toastOptions);

      setSelectedAdminId("");
      setAdminEmailField("");
      setNewPassword("");

      fetchAdmins();
    } catch (err) {
      toast.error("Failed to update admin", toastOptions);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 11;
  const totalPages = Math.ceil(emails.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmails = emails.slice(startIndex, endIndex);

  return (
    <div className="content-wrapper">
      <div className="d-flex flex-wrap justify-content-evenly mb-0 text-center border gap-3 px-1 m-0 py-3 mt-0 header-customization">
        <span className="py-1 settings-span">Settings</span>
      </div>

      <div className="container-fluid">
        <div className="row mt-3 gx-2 gy-2">
          <div className="col-lg-3 col-md-6 col-sm-6 col-12 d-flex flex-column">
            <div id="company-email-form" className="mb-2">
              <div className="card shadow-sm rounded-2">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="px-2 py-2 mt-2 custom-bold">
                    Add New Admin
                  </div>
                </div>

                <div className="card-body p-2">
                  <form onSubmit={handleAdminEmailSubmit}>
                    <div className="mb-2">
                      <label
                        htmlFor="name-input"
                        className="form-label small fw-medium mb-1"
                      >
                        Admin Name
                      </label>

                      <input
                        type="text"
                        id="name-input"
                        name="name"
                        value={adminForm.name}
                        onChange={handleAdminChange}
                        className={`form-control sector-wise settings-input ${
                          nameErrors.name ? "is-invalid" : ""
                        }`}
                        placeholder="Full Name"
                        required
                      />
                    </div>

                    <div className="mb-0">
                      <label
                        htmlFor="email-input"
                        className="form-label small fw-medium mb-1"
                      >
                        Admin email
                      </label>

                      <input
                        type="email"
                        id="email-input"
                        name="email"
                        value={adminForm.email}
                        onChange={handleAdminChange}
                        className={`form-control sector-wise settings-input ${
                          emailErrors.email ? "is-invalid" : ""
                        }`}
                        placeholder="admin@company.com"
                        required
                      />
                    </div>

                    <div className="mb-2">
                      <label
                        htmlFor="desc-input"
                        className="form-label small fw-medium mt-2 mb-1"
                      >
                        Password
                      </label>
                      <input
                        type="password"
                        className="form-control sector-wise settings-input"
                        placeholder="Create Password"
                        name="password"
                        value={adminForm.password}
                        onChange={handleAdminChange}
                        required
                      />
                    </div>

                    <div className="d-flex gap-2 justify-content-end">
                      <button
                        type="button"
                        className="btn btn-sm update-update1 border text-dark"
                        onClick={() => {
                          setAdminForm({
                            name: "",
                            email: "",
                            password: "",
                          });
                        }}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="btn btn-sm btn-success update-update px-2"
                        disabled={adminEmailSubmitting}
                      >
                        {adminEmailSubmitting ? "Adding…" : "Add"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6 col-sm-6 col-12">
            <div className="p-2 rounded-2 border-change">
              <div className="text-start d-flex justify-content-between align-items-center text-dark custom-bold mt-2">
                Change Password
              </div>

              <div style={{ height: "237px" }}>
                <form>
                  <select
                    className="form-select sector-wise settings-input mt-3"
                    value={selectedAdminId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setAdminEmailField("");
                      setSelectedAdminId(id);
                      const selectedData = adminEmail.find((a) => a.id === id);
                      if (selectedData) {
                        setAdminEmailField(selectedData.email);
                      }
                    }}
                  >
                    <option>Select a admin</option>
                    {Array.isArray(adminEmail) && adminEmail.length > 0 ? (
                      adminEmail.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.email}
                        </option>
                      ))
                    ) : (
                      <option disabled>No email admins found</option>
                    )}
                  </select>

                  <input
                    className="form-control mt-2 sector-wise settings-input"
                    placeholder="New email"
                    type="email"
                    value={adminEmailField}
                    onChange={(e) => setAdminEmailField(e.target.value)}
                    required
                  />

                  <div style={{ position: "relative" }}>
                    <input
                      className="form-control mt-2 sector-wise settings-input"
                      type={showPassword ? "text" : "password"}
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      style={{ paddingRight: "40px" }}
                    />

                    <FontAwesomeIcon
                      icon={showPassword ? faEyeSlash : faEye}
                      className="eye-hover"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        cursor: "pointer",
                        color: "#111",
                      }}
                    />
                  </div>

                  <div className="d-flex justify-content-start align-items-center gap-2 mt-1 flex-wrap">
                    <button
                      type="submit"
                      className="btn sector-submit2 mt-2 d-flex justify-content-center align-items-center border border-transparent"
                      onClick={changePassword}
                      style={{ height: "35px" }}
                    >
                      Update
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-success update-update1 mt-2 d-flex justify-content-center align-items-center text-dark border border-transparent"
                      style={{ height: "35px" }}
                      onClick={() => {
                        setAdminEmailField("");
                        setNewPassword("");
                        setSelectedAdminId("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6 col-sm-6 col-12">
            <div
              className="border rounded-2 d-flex flex-column align-items-center sector-wise px-2 bg-white"
              style={{ height: "292px" }}
            >
              <div
                className="py-2 w-100 text-start text-dark custom-bold ps-0 mt-2"
                style={{ cursor: "pointer" }}
              >
                {loading ? "Uploading..." : "Select Logo"}
              </div>

              <input
                type="file"
                id="logo-upload"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />

              <div
                className="mt-2 border bg-white d-flex justify-content-center align-items-center"
                style={{
                  width: "100%",
                  height: "100px",
                  borderRadius: "8px",
                }}
              >
                <img
                  src={preview || logo}
                  alt="Current Logo"
                  onError={(e) => (e.target.src = Travels)}
                  loading="lazy"
                  onClick={() => document.getElementById("logo-upload").click()}
                  style={{
                    width: "auto",
                    height: "80px",
                    objectFit: "contain",
                    cursor: "pointer",
                  }}
                />
              </div>

              <div className="mt-2 mb-2">
                <button
                  className="btn sector-submit2 border border-transparent"
                  onClick={handleLogoUpload}
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Change"}
                </button>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6 col-sm-6 col-12 d-flex flex-column">
            <div className="card rounded-2 shadow-sm mb-2">
              <div className="d-flex justify-content-between px-2 py-2">
                <div className="text-dark custom-bold mt-2">
                  Add company email
                </div>
              </div>

              <div style={{ height: "245px" }}>
                <div className="card-body p-2">
                  <form onSubmit={handleEmailSubmit}>
                    <div className="">
                      <label
                        htmlFor="email-input"
                        className="form-label small fw-medium mt-0 mb-1"
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        id="email-input"
                        name="email"
                        value={emailForm.email}
                        onChange={handleEmailChange}
                        className={`form-control sector-wise settings-input ${
                          emailErrors.email ? "is-invalid" : ""
                        }`}
                        placeholder="name@company.com"
                        required
                      />
                    </div>

                    <div className="mb-1">
                      <label
                        htmlFor="desc-input"
                        className="form-label mb-1 small fw-medium mt-2 mb-1"
                      >
                        Description (optional)
                      </label>
                      <textarea
                        id="desc-input"
                        name="description"
                        value={emailForm.description}
                        onChange={handleEmailChange}
                        className={`form-control sector-wise ${
                          emailErrors.description ? "is-invalid" : ""
                        }`}
                        rows={2}
                        maxLength={250}
                        placeholder="Short note about this email"
                        style={{ resize: "none" }}
                      />
                      <div className="form-text small text-end">
                        {emailForm.description.length}/250
                      </div>
                    </div>

                    <div className="d-flex gap-2 justify-content-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success update-update1 border border-transparent text-dark"
                        onClick={() => {
                          setEmailErrors({});
                          setEmailForm({ email: "", description: "" });
                        }}
                        disabled={emailSubmitting}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="btn btn-sm btn-outline-success update-update text-light"
                        disabled={emailSubmitting}
                      >
                        {emailSubmitting ? "Adding…" : "Add email"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          <div className="row gx-2 gy-2">
            <div className="col-12 col-lg-6">
              <h6 className="mb-2 admin-accounts">Admin Accounts</h6>

              {Array.isArray(adminEmail) && adminEmail.length > 0 ? (
                adminEmail.map((datas, index) => {
                  const itemsId = datas?.id ?? `tmp-${index}`;
                  const isDeleting1 =
                    deletingId1 !== null &&
                    String(deletingId1) === String(itemsId);

                  return (
                    <div
                      key={itemsId}
                      className="email-row border rounded px-1 py-2 mb-2 d-flex overflow-x-scroll overflow-admin align-items-center justify-content-between"
                    >
                      <div className="flex-grow-1">
                        <div className="email-text small ps-2 group-pnr">
                          {datas.email}
                        </div>
                      </div>

                      <div className="ms-2 d-flex align-items-center">
                        <button
                          type="button"
                          className="delete-btn btn btn-sm d-flex align-items-center fw-medium justify-content-center"
                          onClick={() => handleAdminDelete(datas.id, index)}
                          disabled={isDeleting1}
                          aria-disabled={isDeleting1}
                          title="Delete admin"
                        >
                          {isDeleting1 ? (
                            <span
                              className="spinner-border spinner-border-sm"
                              role="status"
                              aria-hidden="true"
                            />
                          ) : (
                            <span
                              className="custom-color-delete"
                              title="Delete admin"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-muted small">No admin found.</div>
              )}
            </div>

            <div className="col-12 col-lg-6">
              <h6 className="mb-2 admin-accounts">Company Emails</h6>

              <div>
                {emails.length === 0 && null}

                {Array.isArray(emails) && emails.length > 0 ? (
                  paginatedEmails.map((data, key) => {
                    const itemId = data?.id ?? key;

                    const isDeleting =
                      deletingId !== null &&
                      (deletingId === itemId ||
                        deletingId === startIndex + key);

                    return (
                      <div
                        key={itemId}
                        className="email-row border rounded px-2 py-2 mb-2"
                      >
                        <div className="flex-grow-1">
                          <div className="email-text small ps-1 group-pnr fw-medium">
                            {data.email}
                          </div>
                        </div>

                        <div className="ms-2 d-flex align-items-center">
                          <button
                            type="button"
                            className="delete-btn btn btn-sm d-flex align-items-center justify-content-center"
                            onClick={() => handleEmailDelete(itemId, key)}
                            disabled={isDeleting}
                            aria-disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <span
                                className="spinner-border spinner-border-sm"
                                role="status"
                                aria-hidden="true"
                              ></span>
                            ) : (
                              <span
                                className="custom-color-delete"
                                title="Delete email"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-muted small">No emails found.</div>
                )}

                <div className="d-flex flex-row justify-content-center align-items-center gap-3 mb-3">
                  {emails.length > itemsPerPage && (
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="bottom-right" autoClose="1000" />
    </div>
  );
}

export default Settings;
