/* ==========================================================================
   VALETFLOW PRO - APPLICATION LOGIC & STATE MANAGEMENT
   ========================================================================== */

// INITIAL STATE DATA MODEL
const INITIAL_DATA = {
  properties: [
    {
      id: "p1",
      name: "Oakridge Luxury Apartments",
      address: "1420 Oakridge Blvd",
      totalUnits: 180,
      buildingsCount: 6,
      gateCode: "#8492",
      compactorCode: "4920",
      compactorStatus: "Operational (65% Full)",
      activePorter: "Marcus Vance",
      schedule: "Sun, Mon, Tue, Wed, Thu (8:00 PM)"
    },
    {
      id: "p2",
      name: "The Grand Reserve",
      address: "880 Reserve Way",
      totalUnits: 140,
      buildingsCount: 4,
      gateCode: "*1029",
      compactorCode: "1029",
      compactorStatus: "Operational (40% Full)",
      activePorter: "Sarah Jenkins",
      schedule: "Sun, Mon, Tue, Wed, Thu (8:30 PM)"
    },
    {
      id: "p3",
      name: "Sunburst Ridge",
      address: "320 Sunburst Dr",
      totalUnits: 100,
      buildingsCount: 3,
      gateCode: "#5512",
      compactorCode: "9901",
      compactorStatus: "Attention Needed (85% Full)",
      activePorter: "Devon Carter",
      schedule: "Sun, Tue, Thu (9:00 PM)"
    }
  ],

  porters: [
    {
      id: "porter-1",
      name: "Marcus Vance",
      assignedPropertyId: "p1",
      assignedPropertyName: "Oakridge Luxury Apartments",
      clockInTime: "8:02 PM",
      status: "Active on Route",
      progress: "81%",
      unitsServiced: 146,
      violationsLogged: 3
    },
    {
      id: "porter-2",
      name: "Sarah Jenkins",
      assignedPropertyId: "p2",
      assignedPropertyName: "The Grand Reserve",
      clockInTime: "8:25 PM",
      status: "Active on Route",
      progress: "75%",
      unitsServiced: 105,
      violationsLogged: 2
    },
    {
      id: "porter-3",
      name: "Devon Carter",
      assignedPropertyId: "p3",
      assignedPropertyName: "Sunburst Ridge",
      clockInTime: "8:40 PM",
      status: "Active on Route",
      progress: "91%",
      unitsServiced: 91,
      violationsLogged: 1
    }
  ],

  buildings: [
    { id: "b1", propertyId: "p1", name: "Building 1", unitsCount: 30, completed: true, servicedUnits: 30, violationsCount: 0 },
    { id: "b2", propertyId: "p1", name: "Building 2", unitsCount: 30, completed: false, servicedUnits: 20, violationsCount: 1 },
    { id: "b3", propertyId: "p1", name: "Building 3", unitsCount: 30, completed: true, servicedUnits: 29, violationsCount: 1 },
    { id: "b4", propertyId: "p1", name: "Building 4", unitsCount: 30, completed: true, servicedUnits: 30, violationsCount: 0 },
    { id: "b5", propertyId: "p1", name: "Building 5", unitsCount: 30, completed: true, servicedUnits: 29, violationsCount: 1 },
    { id: "b6", propertyId: "p1", name: "Building 6", unitsCount: 30, completed: false, servicedUnits: 8, violationsCount: 0 }
  ],

  violations: [
    {
      id: "v101",
      propertyId: "p1",
      propertyName: "Oakridge Luxury Apartments",
      unitNumber: "204",
      buildingName: "Building 2",
      porterName: "Marcus Vance",
      category: "Unbagged / Loose Trash",
      fineAmount: 25,
      timestamp: "8:42 PM",
      dateStr: "Aug 12, 2026",
      status: "Pending Review",
      photoUrl: "assets/violation_sample.png",
      note: "Loose unbagged trash resting next to doorstep without approved valet container."
    },
    {
      id: "v102",
      propertyId: "p1",
      propertyName: "Oakridge Luxury Apartments",
      unitNumber: "312",
      buildingName: "Building 3",
      porterName: "Marcus Vance",
      category: "Unapproved Container",
      fineAmount: 25,
      timestamp: "8:55 PM",
      dateStr: "Aug 12, 2026",
      status: "Approved Notice Sent",
      photoUrl: "assets/violation_sample.png",
      note: "Cardboard box used as trash bin instead of issued ValetFlow container."
    },
    {
      id: "v103",
      propertyId: "p1",
      propertyName: "Oakridge Luxury Apartments",
      unitNumber: "518",
      buildingName: "Building 5",
      porterName: "Marcus Vance",
      category: "Excessive Weight (>25 lbs)",
      fineAmount: 50,
      timestamp: "9:14 PM",
      dateStr: "Aug 12, 2026",
      status: "Pending Review",
      photoUrl: "assets/violation_sample.png",
      note: "Construction debris and heavy furniture parts left outside unit."
    },
    {
      id: "v104",
      propertyId: "p2",
      propertyName: "The Grand Reserve",
      unitNumber: "108",
      buildingName: "Building 1",
      porterName: "Sarah Jenkins",
      category: "Early Trash Put-Out",
      fineAmount: 25,
      timestamp: "7:15 PM",
      dateStr: "Aug 12, 2026",
      status: "Pending Review",
      photoUrl: "assets/violation_sample.png",
      note: "Trash placed outside doorstep at 2:00 PM (Rules state after 6:00 PM)."
    }
  ],

  activityLogs: [
    { time: "9:18 PM", text: "Marcus Vance logged a violation at Oakridge Luxury (Unit 518).", type: "violation" },
    { time: "8:55 PM", text: "Marcus Vance completed Building 3 walkthrough (30/30 units).", type: "success" },
    { time: "8:40 PM", text: "Devon Carter clocked in via GPS at Sunburst Ridge.", type: "system" },
    { time: "8:25 PM", text: "Sarah Jenkins clocked in via GPS at The Grand Reserve.", type: "system" },
    { time: "8:02 PM", text: "Marcus Vance clocked in via GPS at Oakridge Luxury Apartments.", type: "system" }
  ]
};

// GLOBAL APP CONTROLLER STATE
class ValetFlowApp {
  constructor() {
    this.data = this.loadState();
    this.currentUser = this.loadUserSession();
    this.activeBuildingId = "b2";
    this.activeUnitNumberForViolation = null;
    this.initViews();
    this.initEventListeners();
    this.initMapCanvas();
    this.applyUserSession();
    this.renderAll();
  }

  loadState() {
    const saved = localStorage.getItem("valetflow_state");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error("Error loading state", e); }
    }
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  saveState() {
    localStorage.setItem("valetflow_state", JSON.stringify(this.data));
  }

  loadUserSession() {
    const savedUser = localStorage.getItem("valetflow_user");
    if (savedUser) {
      try { return JSON.parse(savedUser); } catch (e) { console.error("Error loading user session", e); }
    }
    return null; // Null means not logged in -> show login screen
  }

  saveUserSession(user) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem("valetflow_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("valetflow_user");
    }
  }

  loginAsAdmin(email = "admin@valetflow.com") {
    const user = {
      role: "admin",
      name: "James Doe",
      title: "Operations Director",
      avatar: "JD",
      email: email
    };
    this.saveUserSession(user);
    this.applyUserSession();
    this.switchViewPanel("admin-view");
  }

  loginAsPorter(porterId = "porter-1") {
    const porter = this.data.porters.find(p => p.id === porterId) || this.data.porters[0];
    const initials = porter.name.split(' ').map(n => n[0]).join('');
    const user = {
      role: "porter",
      name: porter.name,
      title: `Field Porter (${porter.assignedPropertyName.split(' ')[0]})`,
      avatar: initials,
      porterId: porter.id,
      assignedPropertyId: porter.assignedPropertyId
    };
    this.saveUserSession(user);
    this.applyUserSession();
    this.switchViewPanel("porter-view");
  }

  logout() {
    this.saveUserSession(null);
    this.applyUserSession();
    this.switchViewPanel("login-view");
  }

  applyUserSession() {
    const roleSwitcher = document.querySelector(".role-switcher");
    const userProfile = document.getElementById("header-user-profile");
    const logoutBtn = document.getElementById("btn-logout");
    const userNameEl = document.getElementById("header-user-name");
    const userRoleEl = document.getElementById("header-user-role");
    const userAvatarEl = document.getElementById("header-user-avatar");

    if (!this.currentUser) {
      // Logged Out State -> Show Login Screen
      if (roleSwitcher) roleSwitcher.style.display = "none";
      if (userProfile) userProfile.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "none";
      this.switchViewPanel("login-view");
    } else if (this.currentUser.role === "admin") {
      // Admin Logged In -> Show All Hub Controls
      if (roleSwitcher) roleSwitcher.style.display = "flex";
      if (userProfile) userProfile.style.display = "flex";
      if (logoutBtn) logoutBtn.style.display = "inline-flex";
      if (userNameEl) userNameEl.textContent = this.currentUser.name;
      if (userRoleEl) userRoleEl.textContent = this.currentUser.title;
      if (userAvatarEl) userAvatarEl.textContent = this.currentUser.avatar;
      this.switchViewPanel("admin-view");
    } else if (this.currentUser.role === "porter") {
      // Porter Logged In -> Dedicated Standalone Porter Mobile App
      if (roleSwitcher) roleSwitcher.style.display = "none"; // Direct Mobile App view!
      if (userProfile) userProfile.style.display = "flex";
      if (logoutBtn) logoutBtn.style.display = "inline-flex";
      if (userNameEl) userNameEl.textContent = this.currentUser.name;
      if (userRoleEl) userRoleEl.textContent = this.currentUser.title;
      if (userAvatarEl) userAvatarEl.textContent = this.currentUser.avatar;
      this.switchViewPanel("porter-view");
    }
  }

  switchViewPanel(viewId) {
    document.querySelectorAll(".view-panel").forEach(p => p.classList.remove("active"));
    const target = document.getElementById(viewId);
    if (target) target.classList.add("active");

    const roleBtns = document.querySelectorAll(".role-btn");
    roleBtns.forEach(btn => {
      if (btn.getAttribute("data-view") === viewId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  resetDemo() {
    this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.saveState();
    this.renderAll();
    alert("🔄 Demo Data Reset: Pre-populated demo dataset loaded.");
  }

  resetLiveShift() {
    // Clear all violations and reset shift progress for a real live field shift
    this.data.violations = [];
    this.data.buildings.forEach(b => {
      b.completed = false;
      b.servicedUnits = 0;
      b.violationsCount = 0;
    });
    this.data.porters.forEach(p => {
      p.unitsServiced = 0;
      p.violationsLogged = 0;
      p.progress = "0%";
      p.status = "Active on Route";
    });
    this.data.activityLogs.unshift({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: "🚀 LIVE SHIFT INITIALIZED: Clean operational dataset started for tonight's run.",
      type: "system"
    });
    this.saveState();
    this.renderAll();
    alert("🚀 Live Shift Mode Activated: Clean shift initialized. All properties reset for real-time field operation.");
  }

  // NAV & VIEW SWITCHING
  initViews() {
    const roleBtns = document.querySelectorAll(".role-btn");
    roleBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const targetViewId = btn.getAttribute("data-view");
        this.switchViewPanel(targetViewId);
      });
    });
  }

  initEventListeners() {
    // AUTHENTICATION TAB SWITCHES ON LOGIN VIEW
    document.getElementById("tab-btn-admin")?.addEventListener("click", () => {
      document.getElementById("tab-btn-admin").classList.add("active");
      document.getElementById("tab-btn-porter").classList.remove("active");
      document.getElementById("form-admin-login").classList.add("active");
      document.getElementById("form-porter-login").classList.remove("active");
    });

    document.getElementById("tab-btn-porter")?.addEventListener("click", () => {
      document.getElementById("tab-btn-porter").classList.add("active");
      document.getElementById("tab-btn-admin").classList.remove("active");
      document.getElementById("form-porter-login").classList.add("active");
      document.getElementById("form-admin-login").classList.remove("active");
    });

    // ADMIN LOGIN BUTTON CLICK
    document.getElementById("btn-submit-admin-login")?.addEventListener("click", () => {
      const email = document.getElementById("admin-email")?.value || "admin@valetflow.com";
      this.loginAsAdmin(email);
    });

    // PORTER LOGIN BUTTON CLICK
    document.getElementById("btn-submit-porter-login")?.addEventListener("click", () => {
      const porterId = document.getElementById("porter-select-login")?.value || "porter-1";
      this.loginAsPorter(porterId);
    });

    // AUTO-FILL DEMO BUTTONS
    document.getElementById("btn-quick-fill-admin")?.addEventListener("click", () => {
      document.getElementById("admin-email").value = "admin@valetflow.com";
      document.getElementById("admin-password").value = "admin123";
      this.loginAsAdmin("admin@valetflow.com");
    });

    document.getElementById("btn-quick-fill-porter")?.addEventListener("click", () => {
      document.getElementById("porter-select-login").value = "porter-1";
      this.loginAsPorter("porter-1");
    });

    // LOG OUT BUTTON
    document.getElementById("btn-logout")?.addEventListener("click", () => {
      if (confirm("Log out of ValetFlow Pro session?")) {
        this.logout();
      }
    });

    // LIVE SHIFT MODE RESET & DEMO RESET
    document.getElementById("btn-reset-demo")?.addEventListener("click", () => {
      if (confirm("Reset all operational demo data to initial state?")) {
        this.resetDemo();
      }
    });

    document.getElementById("btn-live-reset")?.addEventListener("click", () => {
      if (confirm("Start clean Live Shift Mode? (Clears all current shift completion stats and violations for a fresh live field run)")) {
        this.resetLiveShift();
      }
    });

    // Mobile Navigation Buttons
    document.getElementById("m-btn-back-buildings")?.addEventListener("click", () => {
      this.switchMobileScreen("m-step-shift-start");
    });

    document.getElementById("m-btn-complete-bldg")?.addEventListener("click", () => {
      const bldg = this.data.buildings.find(b => b.id === this.activeBuildingId);
      if (bldg) {
        bldg.completed = true;
        this.saveState();
        this.renderAll();
        alert(`🎉 Walkthrough completed for ${bldg.name}!`);
        this.switchMobileScreen("m-step-shift-start");
      }
    });

    document.getElementById("m-btn-dumpster-alert")?.addEventListener("click", () => {
      const issue = prompt("Enter Facility / Compactor Issue (e.g. 'Compactor Door Locked' or 'Dumpster Overflowing'):", "Compactor chute jammed by mattress.");
      if (issue) {
        this.data.activityLogs.unshift({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `🚨 FACILITY ALERT: ${issue} (Logged by Marcus Vance)`,
          type: "urgent"
        });
        this.saveState();
        this.renderAll();
        alert("Alert logged and sent to Property Manager!");
      }
    });

    // Modal Events
    document.getElementById("btn-close-violation-modal")?.addEventListener("click", () => this.closeViolationModal());
    document.getElementById("btn-cancel-violation")?.addEventListener("click", () => this.closeViolationModal());
    document.getElementById("btn-submit-violation")?.addEventListener("click", () => this.submitViolationModal());

    // Dispatch Modal Events
    document.getElementById("btn-dispatch-route")?.addEventListener("click", () => {
      document.getElementById("modal-dispatch-route")?.classList.add("active");
    });
    document.getElementById("btn-close-dispatch-modal")?.addEventListener("click", () => {
      document.getElementById("modal-dispatch-route")?.classList.remove("active");
    });
    document.getElementById("btn-cancel-dispatch")?.addEventListener("click", () => {
      document.getElementById("modal-dispatch-route")?.classList.remove("active");
    });
    document.getElementById("btn-confirm-dispatch")?.addEventListener("click", () => {
      const porter = document.getElementById("dispatch-porter-select").value;
      const propId = document.getElementById("dispatch-property-select").value;
      const prop = this.data.properties.find(p => p.id === propId);

      this.data.activityLogs.unshift({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `🚚 Route Dispatched: ${porter} assigned to ${prop.name}.`,
        type: "system"
      });
      document.getElementById("modal-dispatch-route")?.classList.remove("active");
      this.saveState();
      this.renderAll();
      alert(`Route successfully dispatched to ${porter}!`);
    });

    // Bulk Request Form
    document.getElementById("form-bulk-request")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const unit = document.getElementById("bulk-unit").value;
      const item = document.getElementById("bulk-item-type").value;
      const notes = document.getElementById("bulk-notes").value;

      this.data.activityLogs.unshift({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `📦 Bulk Removal Request: ${item} at ${unit} (${notes})`,
        type: "bulk"
      });

      this.saveState();
      this.renderAll();
      alert(`Bulk pick-up request created for ${unit}! Added to porter task list.`);
      document.getElementById("form-bulk-request").reset();
    });

    // Client Property Switcher
    document.getElementById("client-prop-selector")?.addEventListener("change", (e) => {
      const selectedId = e.target.value;
      const prop = this.data.properties.find(p => p.id === selectedId);
      if (prop) {
        document.getElementById("client-prop-title").textContent = prop.name;
      }
    });

    document.getElementById("btn-client-export-report")?.addEventListener("click", () => {
      // Trigger report tab
      document.querySelector('[data-view="report-view"]')?.click();
    });
  }

  switchMobileScreen(screenId) {
    document.querySelectorAll(".m-screen").forEach(s => s.classList.remove("active"));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.add("active");
  }

  // RENDER MAIN OPERATIONAL ENGINE
  renderAll() {
    this.renderAdminStats();
    this.renderRoutesTable();
    this.renderViolationQueue();
    this.renderPropertySummaryList();
    this.renderPorterMobileApp();
    this.renderClientPortal();
    this.renderNightlyReport();
    if (window.lucide) window.lucide.createIcons();
  }

  renderAdminStats() {
    const totalServiced = this.data.porters.reduce((acc, p) => acc + p.unitsServiced, 0);
    const totalGoal = 420;
    const pct = ((totalServiced / totalGoal) * 100).toFixed(1);

    document.getElementById("units-serviced-count").textContent = `${totalServiced} / ${totalGoal}`;
    document.getElementById("units-serviced-pct").textContent = `${pct}%`;
    document.getElementById("units-progress-bar").style.width = `${pct}%`;

    const totalViolations = this.data.violations.length;
    document.getElementById("admin-violation-count").textContent = totalViolations;
    document.getElementById("queue-count-badge").textContent = `${totalViolations} Logged`;
  }

  renderRoutesTable() {
    const tbody = document.getElementById("routes-table-body");
    if (!tbody) return;

    tbody.innerHTML = this.data.porters.map(p => `
      <tr>
        <td>
          <div class="table-porter-cell">
            <div class="table-avatar">${p.name.split(' ').map(n=>n[0]).join('')}</div>
            <span>${p.name}</span>
          </div>
        </td>
        <td>${p.assignedPropertyName}</td>
        <td>
          <div style="font-weight:700;">${p.progress}</div>
          <div class="progress-bar-sm" style="width:100px;">
            <div class="progress-fill" style="width:${p.progress};"></div>
          </div>
        </td>
        <td>${p.clockInTime}</td>
        <td><span class="status-chip chip-online">${p.status}</span></td>
        <td>
          <button class="btn-secondary btn-sm" onclick="app.viewPorterRoute('${p.id}')">
            <i data-lucide="eye"></i> Track
          </button>
        </td>
      </tr>
    `).join('');
  }

  viewPorterRoute(porterId) {
    document.querySelector('[data-view="porter-view"]')?.click();
  }

  renderViolationQueue() {
    const container = document.getElementById("admin-violation-queue");
    if (!container) return;

    container.innerHTML = this.data.violations.map(v => `
      <div class="queue-item">
        <div class="queue-item-header">
          <img src="${v.photoUrl}" class="queue-img-thumb" alt="Violation">
          <div class="queue-info">
            <div class="queue-title">
              <span class="queue-unit">Unit ${v.unitNumber}</span>
              <span class="queue-fine-tag">$${v.fineAmount} Fine</span>
            </div>
            <div class="queue-meta">
              ${v.propertyName} • ${v.category} • ${v.timestamp}
            </div>
            <div class="queue-note">"${v.note}"</div>
          </div>
        </div>
        <div class="queue-actions">
          <button class="btn-primary btn-sm" onclick="app.approveViolation('${v.id}')" title="Approve Notice">
            <i data-lucide="check"></i> Approve
          </button>
          <button class="btn-secondary btn-sm" onclick="app.dismissViolation('${v.id}')" title="Dismiss">
            <i data-lucide="x"></i> Dismiss
          </button>
        </div>
      </div>
    `).join('');
  }

  approveViolation(vId) {
    const v = this.data.violations.find(x => x.id === vId);
    if (v) {
      v.status = "Approved Notice Sent";
      this.saveState();
      this.renderAll();
      alert(`Violation approved! Lease notice sent to Property Manager for Unit ${v.unitNumber}.`);
    }
  }

  dismissViolation(vId) {
    this.data.violations = this.data.violations.filter(x => x.id !== vId);
    this.saveState();
    this.renderAll();
  }

  renderPropertySummaryList() {
    const container = document.getElementById("property-summary-list");
    if (!container) return;

    container.innerHTML = this.data.properties.map(p => `
      <div class="prop-compact-item">
        <div>
          <div class="prop-compact-name">${p.name}</div>
          <div class="prop-compact-sub">${p.totalUnits} Units • Gate: ${p.gateCode} • Compactor: ${p.compactorCode}</div>
        </div>
        <span class="status-chip chip-online">Valet: ${p.activePorter.split(' ')[0]}</span>
      </div>
    `).join('');
  }

  // PORTER MOBILE FIELD APP RENDER
  renderPorterMobileApp() {
    // Render building grid
    const bldgGrid = document.getElementById("m-building-grid-list");
    if (!bldgGrid) return;

    bldgGrid.innerHTML = this.data.buildings.map(b => `
      <div class="m-bldg-card ${b.completed ? 'completed' : ''}" onclick="app.openBuildingWalkthrough('${b.id}')">
        <div class="m-bldg-name">${b.name}</div>
        <div class="m-bldg-meta">${b.servicedUnits} / ${b.unitsCount} Units</div>
        <span class="m-bldg-badge ${b.completed ? 'text-green' : 'text-red'}">
          ${b.completed ? '✓ Completed' : `● ${b.unitsCount - b.servicedUnits} Pending`}
        </span>
      </div>
    `).join('');

    // If unit walkthrough screen active, re-render unit list
    if (document.getElementById("m-step-unit-checklist")?.classList.contains("active")) {
      this.renderUnitChecklist();
    }
  }

  openBuildingWalkthrough(buildingId) {
    this.activeBuildingId = buildingId;
    const bldg = this.data.buildings.find(b => b.id === buildingId);
    if (!bldg) return;

    document.getElementById("m-active-bldg-name").textContent = `${bldg.name} (${bldg.unitsCount} Units)`;
    document.getElementById("m-bldg-unit-progress").textContent = `${bldg.servicedUnits}/${bldg.unitsCount}`;
    this.renderUnitChecklist();
    this.switchMobileScreen("m-step-unit-checklist");
  }

  renderUnitChecklist() {
    const container = document.getElementById("m-unit-list-container");
    if (!container) return;

    const bldg = this.data.buildings.find(b => b.id === this.activeBuildingId);
    if (!bldg) return;

    // Generate 10 simulated units per building
    const bldgNum = bldg.name.split(' ')[1];
    let html = '';
    for (let floor = 1; floor <= 3; floor++) {
      for (let door = 1; door <= 3; door++) {
        const unitNum = `${bldgNum}0${floor * 10 + door}`;
        const isViolation = this.data.violations.some(v => v.unitNumber === unitNum);

        html += `
          <div class="m-unit-row">
            <span class="m-unit-number">Door ${unitNum}</span>
            <div class="m-unit-actions">
              <button class="m-btn-serviced" onclick="app.markUnitServiced('${unitNum}', this)">
                Serviced
              </button>
              <button class="m-btn-violation ${isViolation ? 'done' : ''}" onclick="app.triggerViolationModal('${unitNum}')">
                ${isViolation ? 'Violation Logged' : 'Violation'}
              </button>
            </div>
          </div>
        `;
      }
    }
    container.innerHTML = html;
  }

  markUnitServiced(unitNum, btnEl) {
    btnEl.classList.add("done");
    btnEl.textContent = "✓ Serviced";
    // Update count stats
    const bldg = this.data.buildings.find(b => b.id === this.activeBuildingId);
    if (bldg && bldg.servicedUnits < bldg.unitsCount) {
      bldg.servicedUnits += 1;
      this.saveState();
      this.renderAdminStats();
    }
  }

  // VIOLATION MODAL SIMULATOR
  triggerViolationModal(unitNum) {
    this.activeUnitNumberForViolation = unitNum;
    document.getElementById("modal-violation-unit").textContent = unitNum;
    document.getElementById("modal-violation-camera")?.classList.add("active");
  }

  closeViolationModal() {
    document.getElementById("modal-violation-camera")?.classList.remove("active");
  }

  submitViolationModal() {
    const unit = this.activeUnitNumberForViolation || "204";
    const type = document.getElementById("modal-violation-type").value;
    const note = document.getElementById("modal-violation-note").value;

    const fineMap = {
      "Unbagged / Loose Trash": 25,
      "Unapproved Container": 25,
      "Excessive Weight (>25 lbs)": 50,
      "Hazardous / Bio-Waste": 100,
      "Early Trash Put-Out": 25,
      "Damaged Bin": 35
    };

    const newViolation = {
      id: "v" + Date.now(),
      propertyId: "p1",
      propertyName: "Oakridge Luxury Apartments",
      unitNumber: unit,
      buildingName: "Building 2",
      porterName: "Marcus Vance",
      category: type,
      fineAmount: fineMap[type] || 25,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateStr: "Aug 12, 2026",
      status: "Pending Review",
      photoUrl: "assets/violation_sample.png",
      note: note
    };

    this.data.violations.unshift(newViolation);
    
    // Add activity log
    this.data.activityLogs.unshift({
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `⚠️ Violation Logged: Unit ${unit} (${type}) by Marcus Vance.`,
      type: "violation"
    });

    this.closeViolationModal();
    this.saveState();
    this.renderAll();
    alert(`📸 Violation successfully recorded for Unit ${unit}! Photo evidence attached.`);
  }

  // RENDER CLIENT PROPERTY MANAGER PORTAL
  renderClientPortal() {
    const cardsContainer = document.getElementById("client-violation-cards");
    if (cardsContainer) {
      cardsContainer.innerHTML = this.data.violations.map(v => `
        <div class="violation-card-pm">
          <img src="${v.photoUrl}" class="v-card-img" alt="Violation photo">
          <div class="v-card-body">
            <div class="v-card-header">
              <span class="v-card-unit">Unit ${v.unitNumber}</span>
              <span class="v-card-fine">$${v.fineAmount} Fine</span>
            </div>
            <div class="v-card-type">${v.category}</div>
            <div class="v-card-sub">${v.propertyName} • Logged at ${v.timestamp}</div>
            <div class="v-card-footer">
              <button class="btn-secondary btn-sm" onclick="alert('Downloading official PDF violation notice for Unit ${v.unitNumber}...')">
                <i data-lucide="file-text"></i> Lease Notice PDF
              </button>
            </div>
          </div>
        </div>
      `).join('');
    }

    const timelineContainer = document.getElementById("client-timeline");
    if (timelineContainer) {
      timelineContainer.innerHTML = this.data.activityLogs.map(log => `
        <div class="timeline-item">
          <div class="t-icon"><i data-lucide="check"></i></div>
          <div>
            <div>${log.text}</div>
            <div class="t-time">${log.time}</div>
          </div>
        </div>
      `).join('');
    }
  }

  // RENDER NIGHTLY REPORT DOCUMENT
  renderNightlyReport() {
    const vTable = document.getElementById("report-violations-table");
    if (vTable) {
      vTable.innerHTML = this.data.violations.map(v => `
        <tr>
          <td><strong>Unit ${v.unitNumber}</strong></td>
          <td>${v.category}</td>
          <td>${v.timestamp}</td>
          <td><img src="${v.photoUrl}" class="report-img-thumb" alt="Proof"></td>
          <td><strong>$${v.fineAmount}</strong></td>
        </tr>
      `).join('');
    }

    const bTable = document.getElementById("report-buildings-table");
    if (bTable) {
      bTable.innerHTML = this.data.buildings.map(b => `
        <tr>
          <td><strong>${b.name}</strong></td>
          <td>${b.unitsCount} Units</td>
          <td>${b.servicedUnits} Serviced</td>
          <td>${b.violationsCount} Logged</td>
          <td><span style="color:#059669; font-weight:700;">${b.completed ? '100% Verified' : 'In Progress'}</span></td>
        </tr>
      `).join('');
    }
  }

  // CANVAS MAP SIMULATOR RENDER
  initMapCanvas() {
    const canvas = document.getElementById("fleet-map-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const resizeCanvas = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let step = 0;
    const animateMap = () => {
      step += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Grid / Complex Roads
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Draw Apartment Buildings
      const buildings = [
        { x: 60, y: 50, w: 100, h: 60, label: "Bldg 1 (Done)", color: "#10b981" },
        { x: 200, y: 50, w: 100, h: 60, label: "Bldg 2 (Active)", color: "#f59e0b" },
        { x: 340, y: 50, w: 100, h: 60, label: "Bldg 3 (Done)", color: "#10b981" },
        { x: 60, y: 160, w: 100, h: 60, label: "Bldg 4 (Done)", color: "#10b981" },
        { x: 200, y: 160, w: 100, h: 60, label: "Bldg 5 (Done)", color: "#10b981" },
        { x: 340, y: 160, w: 100, h: 60, label: "Bldg 6 (Pending)", color: "#3b82f6" }
      ];

      buildings.forEach(b => {
        ctx.fillStyle = b.color + "22";
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        ctx.fillStyle = "#ffffff";
        ctx.font = "10px sans-serif";
        ctx.fillText(b.label, b.x + 8, b.y + 35);
      });

      // Draw Porter GPS Live Marker (Moving around Bldg 2)
      const porterX = 250 + Math.sin(step) * 30;
      const porterY = 80 + Math.cos(step) * 15;

      // Glow circle
      ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
      ctx.beginPath();
      ctx.arc(porterX, porterY, 14 + Math.sin(step * 3) * 4, 0, Math.PI * 2);
      ctx.fill();

      // Core Marker
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(porterX, porterY, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("Marcus (Porter)", porterX + 10, porterY + 4);

      requestAnimationFrame(animateMap);
    };

    animateMap();
  }
}

// INITIALIZE APPLICATION
let app;
document.addEventListener("DOMContentLoaded", () => {
  app = new ValetFlowApp();
});
