
const API_BASE = "http://127.0.0.1:5000/api";

let donors = [];
let requests = [];
let donations = [];
let currentUser = "Admin";
let requestModal;
let donorModal;

const $ = (id) => document.getElementById(id);

// ==========================================
// API CONNECTION
// ==========================================

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(API_BASE + endpoint, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    let result = {};

    try {
        result = await response.json();
    } catch (error) {
        result = {};
    }

    if (!response.ok) {
        throw new Error(result.message || "Server request failed.");
    }

    return result;
}

async function loadDonors() {
    const [donorData, requestData, donationData] = await Promise.all([
        apiRequest("/donors"),
        apiRequest("/requests"),
        apiRequest("/donations")
    ]);

    donors = donorData;
    requests = requestData;
    donations = donationData;
}

// ==========================================
// TOAST MESSAGE
// ==========================================

function showToast(message) {
    $("toastMessage").textContent = message;

    bootstrap.Toast.getOrCreateInstance($("appToast"), {
        delay: 2500
    }).show();
}

// ==========================================
// LOGIN AND REGISTRATION
// ==========================================

function switchAuth(mode) {
    const login = mode === "login";

    $("loginForm").classList.toggle("d-none", !login);
    $("registerForm").classList.toggle("d-none", login);

    $("showLogin").className = login
        ? "btn btn-danger"
        : "btn btn-outline-danger";

    $("showRegister").className = login
        ? "btn btn-outline-danger"
        : "btn btn-danger";

    $("authMessage").textContent = "";
}

function enterApp(name) {
    currentUser = name || "User";

    $("loggedUser").textContent = currentUser;

    $("authScreen").classList.add("d-none");
    $("appShell").classList.remove("d-none");

    renderAll();
}

function logout() {
    $("appShell").classList.add("d-none");
    $("authScreen").classList.remove("d-none");

    $("loginPassword").value = "";

    switchAuth("login");
}

// ==========================================
// NAVIGATION
// ==========================================

function navigate(page) {
    document.querySelectorAll(".page-section").forEach(el => {
        el.classList.add("d-none");
    });

    $(page + "Page").classList.remove("d-none");

    document.querySelectorAll(".sidebar .nav-link[data-page]").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.page === page);
    });

    $("sidebar").classList.remove("open");

    if (page === "dashboard") renderDashboard();
    if (page === "donors") renderDonors();
    if (page === "requests") renderRequests();
    if (page === "reports") renderReports();
    if (page === "donation-history") renderDonationHistory();
}

// ==========================================
// COMMON FUNCTIONS
// ==========================================

function statusBadge(status) {
    return `<span class="status-pill ${status === "Available" ? "" : "off"}">${escapeHtml(status)}</span>`;
}

function donorCell(d) {
    return `
        <div class="donor-name">${escapeHtml(d.name)}</div>
        <div class="donor-sub">${escapeHtml(d.email || "Email not provided")}</div>
    `;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[ch]));
}

// ==========================================
// DASHBOARD
// ==========================================

function renderDashboard() {
    $("totalDonors").textContent = donors.length;

    $("aPositive").textContent =
        donors.filter(d => d.group === "A+").length;

    $("availableDonors").textContent =
        donors.filter(d => d.status === "Available").length;

    $("groupCount").textContent =
        new Set(donors.map(d => d.group)).size;

    $("openRequests").textContent =
        requests.filter(r =>
            r.status === "Open" || r.status === "In Progress"
        ).length;

    const recent = [...donors].slice(-5).reverse();

    $("recentDonors").innerHTML = recent.length
        ? recent.map(d => `
            <tr>
                <td>${donorCell(d)}</td>
                <td><span class="blood-pill">${escapeHtml(d.group)}</span></td>
                <td>${escapeHtml(d.city)}</td>
                <td>${statusBadge(d.status)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="4" class="empty-state">No donor records yet.</td></tr>`;

    renderGroupBars($("bloodGroupSummary"));

    const recentReq = [...requests].slice(-5).reverse();

    $("recentRequests").innerHTML = recentReq.length
        ? recentReq.map(r => `
            <tr>
                <td>
                    <div class="donor-name">${escapeHtml(r.name)}</div>
                    <div class="donor-sub">${escapeHtml(r.hospital)}</div>
                </td>
                <td><span class="blood-pill">${escapeHtml(r.group)}</span></td>
                <td>${r.units}</td>
                <td>${escapeHtml(r.city)}</td>
                <td>
                    <span class="priority-pill ${r.urgency === "Urgent" ? "urgent" : ""}">
                        ${escapeHtml(r.urgency)}
                    </span>
                </td>
                <td>${requestStatusBadge(r.status)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="6" class="empty-state">No blood requests added yet.</td></tr>`;
}

// ==========================================
// BLOOD GROUP SUMMARY
// ==========================================

function renderGroupBars(target) {
    const groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

    const counts = groups.map(g => ({
        group: g,
        count: donors.filter(d => d.group === g).length
    }));

    const max = Math.max(1, ...counts.map(x => x.count));

    target.innerHTML = counts.map(x => `
        <div class="group-row">
            <span class="group-tag">${x.group}</span>
            <div class="progress-track">
                <div class="progress-fill" style="width:${x.count / max * 100}%"></div>
            </div>
            <span class="group-value">${x.count}</span>
        </div>
    `).join("");
}

// ==========================================
// DONOR SEARCH AND FILTER
// ==========================================

function filteredDonors() {
    const q = $("searchInput").value.trim().toLowerCase();
    const group = $("groupFilter").value;
    const status = $("statusFilter").value;

    return donors.filter(d => {
        const searchable = [
            d.name, d.phone, d.city, d.group, d.email
        ].join(" ").toLowerCase();

        return (!q || searchable.includes(q)) &&
            (!group || d.group === group) &&
            (!status || d.status === status);
    });
}

// ==========================================
// DISPLAY DONORS
// ==========================================

function renderDonors() {
    const rows = filteredDonors();

    $("recordCount").textContent =
        `${rows.length} record${rows.length === 1 ? "" : "s"}`;

    $("donorTableBody").innerHTML = rows.length
        ? rows.map(d => `
            <tr>
                <td>${donorCell(d)}</td>
                <td><span class="blood-pill">${escapeHtml(d.group)}</span></td>
                <td>${escapeHtml(d.phone)}</td>
                <td>${escapeHtml(d.city)}</td>
                <td>${d.lastDate
                    ? new Date(d.lastDate + "T00:00:00").toLocaleDateString("en-IN")
                    : "—"}
                </td>
                <td>${statusBadge(d.status)}</td>
                <td>
                    <button class="action-btn" title="Edit" onclick="editDonor(${d.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="action-btn delete" title="Delete" onclick="deleteDonor(${d.id})">
                        <i class="bi bi-trash3"></i>
                    </button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="7" class="empty-state">No matching donor records found.</td></tr>`;
}

// ==========================================
// BLOOD REQUEST STATUS
// ==========================================

function requestStatusBadge(status) {
    const cls = {
        "Open": "open",
        "In Progress": "progress",
        "Fulfilled": "fulfilled",
        "Cancelled": "cancelled"
    }[status] || "";

    return `<span class="request-status ${cls}">${escapeHtml(status)}</span>`;
}

// ==========================================
// REQUEST SEARCH AND FILTER
// ==========================================

function filteredRequests() {
    const q = $("requestSearch").value.trim().toLowerCase();
    const status = $("requestStatusFilter").value;
    const urgency = $("requestUrgencyFilter").value;

    return requests.filter(r => {
        const text = [
            r.name, r.phone, r.group, r.hospital, r.city
        ].join(" ").toLowerCase();

        return (!q || text.includes(q)) &&
            (!status || r.status === status) &&
            (!urgency || r.urgency === urgency);
    }).sort((a, b) =>
        (a.urgency === "Urgent" ? 0 : 1) -
        (b.urgency === "Urgent" ? 0 : 1)
    );
}

// ==========================================
// DISPLAY REQUESTS
// ==========================================

function renderRequests() {
    const rows = filteredRequests();

    $("requestCount").textContent =
        `${rows.length} request${rows.length === 1 ? "" : "s"}`;

    $("requestTableBody").innerHTML = rows.length
        ? rows.map(r => `
            <tr>
                <td>
                    <div class="donor-name">${escapeHtml(r.name)}</div>
                    <div class="donor-sub">${escapeHtml(r.phone)}</div>
                </td>
                <td><span class="blood-pill">${escapeHtml(r.group)}</span></td>
                <td>${r.units}</td>
                <td>
                    <div>${escapeHtml(r.hospital)}</div>
                    <div class="donor-sub">${escapeHtml(r.city)}</div>
                </td>
                <td>${r.date
                    ? new Date(r.date + "T00:00:00").toLocaleDateString("en-IN")
                    : "—"}
                </td>
                <td>
                    <span class="priority-pill ${r.urgency === "Urgent" ? "urgent" : ""}">
                        ${escapeHtml(r.urgency)}
                    </span>
                </td>
                <td>${requestStatusBadge(r.status)}</td>
                <td>
                    <button class="action-btn" title="Edit" onclick="editRequest(${r.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="action-btn delete" title="Delete" onclick="deleteRequest(${r.id})">
                        <i class="bi bi-trash3"></i>
                    </button>
                </td>
            </tr>
        `).join("")
        : `<tr><td colspan="8" class="empty-state">No blood requests found.</td></tr>`;
}

// ==========================================
// ADD AND UPDATE BLOOD REQUEST
// ==========================================

function openRequestModal(r = null) {
    $("requestForm").reset();

    $("requestId").value = r ? r.id : "";

    $("requestModalTitle").textContent =
        r ? "Update blood request" : "New blood request";

    $("requestUnits").value = r ? r.units : 1;

    if (r) {
        $("requesterName").value = r.name;
        $("requesterPhone").value = r.phone;
        $("requestGroup").value = r.group;
        $("requestHospital").value = r.hospital;
        $("requestCity").value = r.city;
        $("requestDate").value = r.date || "";
        $("requestUrgency").value = r.urgency;
        $("requestStatus").value = r.status;
        $("requestNotes").value = r.notes || "";
    } else {
        $("requestStatus").value = "Open";
        $("requestDate").value = new Date().toISOString().slice(0, 10);
    }

    requestModal.show();
}

function editRequest(id) {
    const r = requests.find(x => x.id === id);

    if (r) {
        openRequestModal(r);
    }
}

async function deleteRequest(id) {
    const r = requests.find(x => x.id === id);

    if (!r || !confirm(`Delete blood request from ${r.name}?`)) {
        return;
    }

    try {
        await apiRequest("/requests/" + id, {
            method: "DELETE"
        });

        await loadDonors();
        renderAll();

        showToast("Blood request deleted successfully.");

    } catch (error) {
        console.error(error);
        showToast("Could not delete request: " + error.message);
    }
}

// ==========================================
// DONATION HISTORY DISPLAY
// ==========================================

function renderDonationHistory() {

    $("donationDonor").innerHTML =
        `<option value="">Select donor</option>` +
        donors.map(d =>
            `<option value="${d.id}">
                ${escapeHtml(d.name)} (${escapeHtml(d.group)})
            </option>`
        ).join("");

    $("donationTableBody").innerHTML = donations.length
        ? donations.map(d => `
            <tr>
                <td>${escapeHtml(d.donor_name)}</td>
                <td>${d.donation_date
                    ? new Date(d.donation_date + "T00:00:00").toLocaleDateString("en-IN")
                    : "—"}</td>
                <td>${escapeHtml(d.units)}</td>
                <td>${escapeHtml(d.hospital_name || "—")}</td>
                <td>${escapeHtml(d.notes || "—")}</td>
            </tr>
        `).join("")
        : `<tr>
            <td colspan="5" class="empty-state">
                No donation records yet.
            </td>
        </tr>`;
}

// ==========================================
// REPORTS
// ==========================================

function renderReports() {
    renderGroupBars($("reportGroups"));

    const available =
        donors.filter(d => d.status === "Available").length;

    const unavailable = donors.length - available;

    const pct = donors.length
        ? Math.round(available / donors.length * 100)
        : 0;

    $("availabilitySummary").innerHTML = `
        <div class="d-flex justify-content-between small mb-2">
            <span>Open / in progress requests</span>
            <b>${requests.filter(r =>
                r.status === "Open" || r.status === "In Progress"
            ).length}</b>
        </div>

        <div class="d-flex justify-content-between small mb-2">
            <span>Fulfilled requests</span>
            <b>${requests.filter(r => r.status === "Fulfilled").length}</b>
        </div>

        <hr>

        <div class="d-flex justify-content-between small mb-2">
            <span>Available donors</span>
            <b>${available}</b>
        </div>

        <div class="progress mb-3" style="height:9px">
            <div class="progress-bar"
                style="width:${pct}%;background:#2da56c">
            </div>
        </div>

        <div class="d-flex justify-content-between small mb-2">
            <span>Unavailable donors</span>
            <b>${unavailable}</b>
        </div>

        <div class="progress" style="height:9px">
            <div class="progress-bar bg-secondary"
                style="width:${donors.length ? 100 - pct : 0}%">
            </div>
        </div>

        <p class="small text-secondary mt-3 mb-0">
            ${pct}% of saved records are currently marked available.
        </p>
    `;
}

// ==========================================
// REFRESH ALL SECTIONS
// ==========================================

function renderAll() {
    renderDashboard();
    renderDonors();
    renderRequests();
    renderReports();
    renderDonationHistory();
}

// ==========================================
// ADD AND UPDATE DONOR
// ==========================================

function openDonorModal(d = null) {
    $("donorForm").reset();

    $("donorId").value = d ? d.id : "";

    $("modalTitle").textContent =
        d ? "Update donor details" : "Add new donor";

    if (d) {
        $("donorName").value = d.name;
        $("donorPhone").value = d.phone;
        $("donorEmail").value = d.email || "";
        $("donorGroup").value = d.group;
        $("donorAge").value = d.age;
        $("donorCity").value = d.city;
        $("donorLastDate").value = d.lastDate || "";
        $("donorStatus").value = d.status;
        $("donorAddress").value = d.address || "";
    }

    donorModal.show();
}

function editDonor(id) {
    const d = donors.find(x => x.id === id);

    if (d) {
        openDonorModal(d);
    }
}

async function deleteDonor(id) {
    const d = donors.find(x => x.id === id);

    if (!d || !confirm(`Delete donor record for ${d.name}?`)) {
        return;
    }

    try {
        await apiRequest("/donors/" + id, {
            method: "DELETE"
        });

        await loadDonors();
        renderAll();

        showToast("Donor record deleted successfully.");

    } catch (error) {
        console.error(error);
        showToast("Could not delete donor: " + error.message);
    }
}

// ==========================================
// EXPORT DONOR REPORT
// ==========================================

function exportCSV() {
    const headers = [
        "Name", "Phone", "Email", "Blood Group",
        "Age", "City", "Last Donation", "Status", "Address"
    ];

    const rows = donors.map(d => [
        d.name, d.phone, d.email, d.group,
        d.age, d.city, d.lastDate, d.status, d.address
    ]);

    const csv = [headers, ...rows]
        .map(row => row.map(v =>
            `"${String(v ?? "").replace(/"/g, '""')}"`
        ).join(","))
        .join("\n");

    downloadCSV(csv, "blood_donor_report.csv");
}

// ==========================================
// EXPORT REQUEST REPORT
// ==========================================

function exportRequestsCSV() {
    const headers = [
        "Requester", "Phone", "Blood Group", "Units",
        "Hospital", "City", "Required By", "Priority",
        "Status", "Notes"
    ];

    const rows = requests.map(r => [
        r.name, r.phone, r.group, r.units, r.hospital,
        r.city, r.date, r.urgency, r.status, r.notes
    ]);

    const csv = [headers, ...rows]
        .map(row => row.map(v =>
            `"${String(v ?? "").replace(/"/g, '""')}"`
        ).join(","))
        .join("\n");

    downloadCSV(csv, "blood_requests_report.csv");
}

function downloadCSV(csv, filename) {
    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}

// ==========================================
// PAGE INITIALIZATION AND EVENT LISTENERS
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

    donorModal = new bootstrap.Modal($("donorModal"));
    requestModal = new bootstrap.Modal($("requestModal"));

    try {
        await loadDonors();
        renderAll();
    } catch (error) {
        console.error("Loading data failed:", error);
        alert("Could not load data from the server. Please check Flask and MySQL.");
    }

    // LOGIN AND REGISTRATION NAVIGATION

    $("showLogin").addEventListener("click", () => switchAuth("login"));
    $("showRegister").addEventListener("click", () => switchAuth("register"));

    // LOGIN

    $("loginForm").addEventListener("submit", async e => {
        e.preventDefault();

        const username = $("loginUsername").value.trim();
        const password = $("loginPassword").value;

        try {
            const result = await apiRequest("/login", {
                method: "POST",
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            enterApp(result.name || result.user?.name || username);

        } catch (error) {
            $("authMessage").textContent =
                error.message || "Invalid username or password.";

            $("authMessage").className = "small mt-3 text-danger";
        }
    });

    // REGISTRATION

    $("registerForm").addEventListener("submit", async e => {
        e.preventDefault();

        const name = $("regName").value.trim();
        const username = $("regUsername").value.trim();
        const password = $("regPassword").value;

        try {
            await apiRequest("/register", {
                method: "POST",
                body: JSON.stringify({
                    name: name,
                    username: username,
                    password: password
                })
            });

            $("authMessage").textContent =
                "Account created successfully. You can now log in.";

            $("authMessage").className = "small mt-3 text-success";

            $("loginUsername").value = username;
            $("loginPassword").value = "";

            $("registerForm").reset();

            switchAuth("login");

        } catch (error) {
            $("authMessage").textContent = error.message;
            $("authMessage").className = "small mt-3 text-danger";
        }
    });

    // LOGOUT

    $("logoutBtn").addEventListener("click", logout);

    // NAVIGATION

    document.querySelectorAll(".sidebar [data-page]").forEach(btn => {
        btn.addEventListener("click", () => navigate(btn.dataset.page));
    });

    document.querySelectorAll("[data-goto]").forEach(btn => {
        btn.addEventListener("click", () => navigate(btn.dataset.goto));
    });

    // DONOR BUTTONS

    $("quickAddBtn").addEventListener("click", () => openDonorModal());
    $("addDonorBtn").addEventListener("click", () => openDonorModal());

    // DONOR SEARCH AND FILTERS

    $("searchInput").addEventListener("input", renderDonors);
    $("groupFilter").addEventListener("change", renderDonors);
    $("statusFilter").addEventListener("change", renderDonors);

    // DONOR EXPORT

    $("exportBtn").addEventListener("click", exportCSV);

    // BLOOD REQUEST BUTTONS

    $("addRequestBtn").addEventListener("click", () => openRequestModal());

    // REQUEST SEARCH AND FILTERS

    $("requestSearch").addEventListener("input", renderRequests);
    $("requestStatusFilter").addEventListener("change", renderRequests);
    $("requestUrgencyFilter").addEventListener("change", renderRequests);

    // MOBILE MENU

    $("menuBtn").addEventListener("click", () => {
        $("sidebar").classList.toggle("open");
    });

    // DONOR FORM SUBMIT

    $("donorForm").addEventListener("submit", async e => {

        e.preventDefault();

        const id = $("donorId").value;

        const data = {
            name: $("donorName").value.trim(),
            phone: $("donorPhone").value.trim(),
            email: $("donorEmail").value.trim(),
            group: $("donorGroup").value,
            age: Number($("donorAge").value),
            city: $("donorCity").value.trim(),
            lastDate: $("donorLastDate").value || null,
            status: $("donorStatus").value,
            address: $("donorAddress").value.trim()
        };

        const duplicate = donors.some(d =>
            d.phone === data.phone && d.id !== Number(id)
        );

        if (duplicate) {
            showToast("This phone number is already registered.");
            return;
        }

        try {
            if (id) {
                await apiRequest("/donors/" + id, {
                    method: "PUT",
                    body: JSON.stringify(data)
                });
            } else {
                await apiRequest("/donors", {
                    method: "POST",
                    body: JSON.stringify(data)
                });
            }

            await loadDonors();

            donorModal.hide();
            renderAll();

            showToast(id
                ? "Donor details updated successfully."
                : "New donor added successfully."
            );

        } catch (error) {
            console.error("Donor save error:", error);
            showToast("Could not save donor: " + error.message);
        }
    });

    // BLOOD REQUEST FORM SUBMIT

    $("requestForm").addEventListener("submit", async e => {

        e.preventDefault();

        const id = $("requestId").value;

        const data = {
            name: $("requesterName").value.trim(),
            phone: $("requesterPhone").value.trim(),
            group: $("requestGroup").value,
            units: Number($("requestUnits").value),
            hospital: $("requestHospital").value.trim(),
            city: $("requestCity").value.trim(),
            date: $("requestDate").value || null,
            urgency: $("requestUrgency").value,
            status: $("requestStatus").value,
            notes: $("requestNotes").value.trim()
        };

        try {
            if (id) {
                await apiRequest("/requests/" + id, {
                    method: "PUT",
                    body: JSON.stringify(data)
                });
            } else {
                await apiRequest("/requests", {
                    method: "POST",
                    body: JSON.stringify(data)
                });
            }

            await loadDonors();

            requestModal.hide();
            renderAll();

            showToast(id
                ? "Blood request updated successfully."
                : "Blood request saved successfully."
            );

        } catch (error) {
            console.error("Request save error:", error);
            showToast("Could not save request: " + error.message);
        }
    });

    // DONATION HISTORY FORM SUBMIT

    $("donationDate").value = new Date().toISOString().slice(0, 10);

    $("donationForm").addEventListener("submit", async e => {

        e.preventDefault();

        const data = {
            donor_id: Number($("donationDonor").value),
            donation_date: $("donationDate").value,
            units: Number($("donationUnits").value),
            hospital_name: $("donationHospital").value.trim(),
            notes: $("donationNotes").value.trim()
        };

        try {
            await apiRequest("/donations", {
                method: "POST",
                body: JSON.stringify(data)
            });

            $("donationForm").reset();
            $("donationUnits").value = 1;
            $("donationDate").value = new Date().toISOString().slice(0, 10);

            await loadDonors();
            renderAll();

            showToast("Donation recorded successfully.");

        } catch (error) {
            console.error("Donation save error:", error);
            showToast("Could not save donation: " + error.message);
        }
    });

});
