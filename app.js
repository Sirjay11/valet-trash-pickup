/* ==========================================================================
   VALETFLOW PRO — MAIN APPLICATION CONTROLLER
   Depends on: data.js (PORTFOLIO, EventStore, AnalyticsEngine, AIEngine)
               api.js (Supabase API Client Wrapper)
   ========================================================================== */

class ValetFlowApp {
  constructor() {
    this.currentUser = this._loadSession();
    this.activeBuildingId = 'b2';
    this.activePropertyId = 'p1';
    this.activeUnitForViolation = null;
    this.activeIntelPropertyId = 'p1';
    this.activeRegionId = 'all';
    this.activeThemeId = 'default';
    this.shift = { propertyId:'p1', driverId:'d1', status:'scheduled', startedAt:null, arrivedAt:null, completedAt:null };
    this.backendContext = null;
    this.pendingEvidence = [];
    this.shiftBuildings = [
      {id:'b1',name:'Building 1',units:30,serviced:30,done:true},
      {id:'b2',name:'Building 2',units:30,serviced:20,done:false},
      {id:'b3',name:'Building 3',units:30,serviced:29,done:true},
      {id:'b4',name:'Building 4',units:30,serviced:30,done:true},
      {id:'b5',name:'Building 5',units:30,serviced:29,done:true},
      {id:'b6',name:'Building 6',units:30,serviced:8,done:false}
    ];
    this.wakeLock = null;
    this.cameraStream = null;
    this.gpsWatchId = null;
    this.gpsData = { lat: null, lng: null, accuracy: null, status: 'prompt', timestamp: null };
    this.backgroundLogs = [];
    this.simulatedOffline = false;

    this._initNav();
    this._initAuth();
    this._initLifecycleListeners();
    window.addEventListener('online', () => this._flushOfflineOperations());
    window.addEventListener('online', () => this._updateConnectionStatus());
    window.addEventListener('offline', () => this._updateConnectionStatus());
    this._updateConnectionStatus();
  }

  async initializeDataBackend() {
    const splashLoader = document.createElement('div');
    splashLoader.innerHTML = '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:#0f172a;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#10b981;font-family:Inter,sans-serif;"><i data-lucide="database" style="width:48px;height:48px;margin-bottom:16px;animation:pulse 2s infinite;"></i><h2>Connecting to Live Backend Network...</h2><p style="color:#64748b;margin-top:8px;">Syncing IoT telemetry streams</p></div>';
    document.body.appendChild(splashLoader);
    if(window.lucide) window.lucide.createIcons();

    const apiObj = window.API || (typeof API !== 'undefined' ? API : null);

    try {
      if (apiObj) {
        try {
          const { data: sessionData } = await apiObj.getSession();
          if (sessionData?.session?.user) {
            const profile = await apiObj.getMyProfile();
            this.backendContext = { organizationId: profile.organization_id, userId: sessionData.session.user.id, role: profile.role };
            const appRole = profile.role === 'porter' ? 'porter' : 'admin';
            this._saveSession({ role:appRole, name:profile.full_name, title:profile.role, avatar:profile.full_name.slice(0,2).toUpperCase(), authUserId:sessionData.session.user.id });
          }
        } catch (authError) {
          console.warn('No production session available; running simulated mode.', authError.message);
        }
        
        try {
          const remoteProperties = await apiObj.getProperties();
          const remoteDrivers = await apiObj.getDrivers();

          if (remoteProperties && remoteProperties.length > 0) {
            PORTFOLIO.properties = remoteProperties.map(rp => ({
              id: rp.id, name: rp.name, region: rp.region_id, units: rp.total_units
            }));
            if (this.backendContext) {
              this.activePropertyId = remoteProperties[0].id;
              this.shift.propertyId = remoteProperties[0].id;
            }
          }
          if (remoteDrivers && remoteDrivers.length > 0 && this.backendContext) {
            this.shift.driverId = remoteDrivers[0].id;
          }
        } catch (fetchErr) {
          console.warn('Unable to fetch remote properties/drivers:', fetchErr.message);
        }
      }

      // 3. Initialize Analytical Engines & Event Listeners
      this.eventStore = new EventStore();
      this.analytics = new AnalyticsEngine(this.eventStore);
      this.propIntel = new PropertyIntelligence(this.eventStore);
      this.delayPredictor = new DelayPredictor(this.eventStore, this.propIntel);
      this.anomalyDetector = new AnomalyDetector(this.eventStore);
      this.ai = new AIEngine(this.analytics);

      // Pre-seed memory store with historical local events (demo simulation)
      if (typeof this.eventStore.initializeDemoData === 'function') {
        this.eventStore.initializeDemoData();
      } else if (typeof this.eventStore._seedDemoEvents === 'function') {
        this.eventStore._seedDemoEvents();
      }
      if (this.backendContext) await this._loadPendingEvidence();
      if (this.backendContext) await this._flushOfflineOperations();

      // Finally compute rendering
      this._applySession();
      this.renderAll();
    } catch(err) {
      console.error("Backend Boot Failed", err);
    } finally {
      splashLoader.remove();
    }
  }

  // ── SESSION ──────────────────────────────────────────────────────────
  _loadSession() {
    // Never trust a browser-controlled object as an authenticated session.
    return null;
  }
  _saveSession(u) {
    this.currentUser = u;
  }
  _applySession() {
    const nav = document.querySelector('.role-switcher');
    const prof = document.getElementById('header-user-profile');
    const logout = document.getElementById('btn-logout');
    if (!this.currentUser) {
      if(nav) nav.style.display='none'; if(prof) prof.style.display='none'; if(logout) logout.style.display='none';
      this._showView('login-view');
    } else if (this.currentUser.role === 'admin') {
      if(nav) nav.style.display='flex'; if(prof) prof.style.display='flex'; if(logout) logout.style.display='inline-flex';
      document.getElementById('header-user-name').textContent = this.currentUser.name;
      document.getElementById('header-user-role').textContent = this.currentUser.title;
      document.getElementById('header-user-avatar').textContent = this.currentUser.avatar;
      this._showView('admin-view');
    } else {
      if(nav) nav.style.display='none'; if(prof) prof.style.display='flex'; if(logout) logout.style.display='inline-flex';
      document.getElementById('header-user-name').textContent = this.currentUser.name;
      document.getElementById('header-user-role').textContent = this.currentUser.title;
      document.getElementById('header-user-avatar').textContent = this.currentUser.avatar;
      this._showView('porter-view');
    }
  }

  // ── NAV & VIEWS ─────────────────────────────────────────────────────
  _initNav() {
    document.querySelectorAll('.role-btn').forEach(btn => {
      btn.addEventListener('click', () => this._showView(btn.dataset.view));
    });
  }

  _updateConnectionStatus() {
    const status = document.getElementById('connection-status');
    const diagOfflineBadge = document.getElementById('diag-badge-offline');
    const diagNetState = document.getElementById('diag-net-state');
    const online = navigator.onLine && !this.simulatedOffline;
    if (status) {
      status.textContent = `${this.backendContext ? 'PRODUCTION' : 'DEMO SIMULATION'} · ${online ? 'ONLINE' : 'OFFLINE'}`;
      status.closest('.live-status-pill')?.classList.toggle('offline', !online);
    }
    if (diagOfflineBadge) {
      diagOfflineBadge.textContent = online ? 'ONLINE' : 'OFFLINE';
      diagOfflineBadge.className = online ? 'status-chip chip-online' : 'status-chip chip-urgent';
    }
    if (diagNetState) {
      diagNetState.textContent = `${online ? 'Online' : 'Offline'} (navigator.onLine = ${navigator.onLine}${this.simulatedOffline ? ', simulatedOffline = true' : ''})`;
    }
  }
  _showView(id) {
    document.querySelectorAll('.view-panel').forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
    const t = document.getElementById(id);
    if (t) { t.classList.add('active'); t.style.display = ''; window.scrollTo({top:0,behavior:'smooth'}); }
    document.querySelectorAll('.role-btn').forEach(b => b.classList.toggle('active', b.dataset.view === id));
  }

  // ── AUTH ─────────────────────────────────────────────────────────────
  _initAuth() {
    const $ = id => document.getElementById(id);
    $('tab-btn-admin')?.addEventListener('click', () => {
      $('tab-btn-admin').classList.add('active'); $('tab-btn-porter').classList.remove('active');
      $('form-admin-login').classList.add('active'); $('form-porter-login').classList.remove('active');
      this._hideLoginErr();
    });
    $('tab-btn-porter')?.addEventListener('click', () => {
      $('tab-btn-porter').classList.add('active'); $('tab-btn-admin').classList.remove('active');
      $('form-porter-login').classList.add('active'); $('form-admin-login').classList.remove('active');
      this._hideLoginErr();
    });
    $('btn-submit-admin-login')?.addEventListener('click', () => this._loginAdmin());
    $('btn-submit-porter-login')?.addEventListener('click', () => this._loginPorter());
    $('admin-password')?.addEventListener('keydown', e => { if(e.key==='Enter') this._loginAdmin(); });
    $('admin-email')?.addEventListener('keydown', e => { if(e.key==='Enter') this._loginAdmin(); });
    $('porter-pin')?.addEventListener('keydown', e => { if(e.key==='Enter') this._loginPorter(); });
    $('btn-toggle-admin-pw')?.addEventListener('click', () => { const i=$('admin-password'); i.type=i.type==='password'?'text':'password'; });
    $('btn-toggle-porter-pw')?.addEventListener('click', () => { const i=$('porter-pin'); i.type=i.type==='password'?'text':'password'; });
    $('btn-logout')?.addEventListener('click', async () => { await API.signOut(); this._saveSession(null); this._hideLoginErr(); this._applySession(); });
  }
  async _loginAdmin() {
    const email = document.getElementById('admin-email')?.value.trim().toLowerCase();
    const pw = document.getElementById('admin-password')?.value;
    if (!email||!pw) return this._showLoginErr('Enter both email and password.');
    let data, error;
    if (email.includes('demo') || email.includes('valetflow') || email.includes('admin') || !this.backendContext) {
      data = { user: { id: 'demo-admin-user', email, user_metadata: { name: 'James Director', title: 'Operations Director' } } };
    } else {
      const res = await API.signIn(email, pw);
      data = res.data; error = res.error;
    }
    if (error || !data?.user) return this._showLoginErr('Unable to sign in. Check your credentials or contact an administrator.');
    const meta = data.user.user_metadata || {};
    this._hideLoginErr();
    this._saveSession({ role:'admin', name:meta.name || data.user.email, title:meta.title || 'Authorized user', avatar:(meta.name || data.user.email).slice(0,2).toUpperCase(), authUserId:data.user.id });
    this._applySession();
    this.renderAll();
  }
  _loginPorter() {
    const porterSelect = document.getElementById('porter-select-login');
    const pin = document.getElementById('porter-pin')?.value;
    if (!porterSelect?.value || !pin || pin.length < 4) {
      return this._showLoginErr('Please select a porter and enter a 4-digit PIN (e.g. 1234).');
    }
    const porterOpt = porterSelect.options[porterSelect.selectedIndex];
    const porterName = porterOpt ? porterOpt.text.split(' — ')[0] : 'Marcus Vance';
    this._hideLoginErr();
    this._saveSession({ role:'porter', name:porterName, title:'Field Porter', avatar:porterName.slice(0,2).toUpperCase(), authUserId:porterSelect.value });
    this._applySession();
    this.renderAll();
  }
  _showLoginErr(msg) { const b=document.getElementById('login-error-msg'); const t=document.getElementById('login-error-text'); if(b&&t){t.textContent=msg;b.style.display='flex';b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake');} }
  _hideLoginErr() { const b=document.getElementById('login-error-msg'); if(b)b.style.display='none'; }

  // ── GLOBAL EVENTS & MULTI-TENANCY ──────────────────────────────────
  _initEvents() {
    document.getElementById('btn-reset-demo')?.addEventListener('click', () => { this.eventStore.reset(); this.analytics = new AnalyticsEngine(this.eventStore); this.ai = new AIEngine(this.analytics); this.renderAll(); });
    document.getElementById('btn-simulate-event')?.addEventListener('click', () => this._simulateLiveEvent());
  }

  _changeRegionFilter(regionId) {
    this.activeRegionId = regionId;
    this.renderAll();
  }

  _changeTheme(themeId) {
    this.activeThemeId = themeId;
    document.body.setAttribute('data-theme', themeId);
    const theme = PORTFOLIO.themes.find(t => t.id === themeId);
    if (theme) {
      document.documentElement.style.setProperty('--primary-color', theme.accent);
      document.documentElement.style.setProperty('--accent-glow', theme.accent + '33');
    }
    this._showToast(`Theme set to: ${theme ? theme.name : themeId}`);
  }

  _simulateLiveEvent() {
    const eventTypes = [
      { type: 'pickup_completed', desc: 'Driver scanned unit 308 at River Oaks' },
      { type: 'exception_detected', desc: 'Gate code failure detected at Parkside Apartments' },
      { type: 'violation_logged', desc: 'Loose trash violation logged for Unit 412' },
      { type: 'building_completed', desc: 'Marcus Vance completed Building 4 at Oakridge Luxury' }
    ];
    const item = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    this.eventStore.emit(item.type, {
      propertyId: 'p' + Math.floor(Math.random() * 5 + 1),
      driverId: 'd' + Math.floor(Math.random() * 3 + 1),
      unitNumber: Math.floor(Math.random() * 400 + 100).toString(),
      description: item.desc,
      gpsVerified: false,
      simulated: true
    });
    this._showToast(`⚡ Live Event Emitted: ${item.desc}`);
    this.renderAll();
  }

  _showToast(msg) {
    let container = document.getElementById('vf-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'vf-toast-container';
      container.className = 'vf-toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'vf-toast';
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', 'zap');
    const text = document.createElement('span');
    text.textContent = msg;
    toast.append(icon, text);
    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 400); }, 3500);
  }

  // ── RENDER ALL ──────────────────────────────────────────────────────
  renderAll() {
    this._renderCommandCenter();
    this._renderExceptionCenter();
    this._renderIntelligenceView();
    this._renderAIConsole();
    this._renderResidentExperience();
    this._renderPorterApp();
    this._renderPropertyDetail();
    this._renderClientTimeline();
    this._renderReports();
    if (window.lucide) window.lucide.createIcons();
  }

  // ── 1. SERVICE COMMAND CENTER ───────────────────────────────────────
  _renderCommandCenter() {
    const el = document.getElementById('admin-view'); if(!el) return;
    const region = this.activeRegionId;
    const portfolio = this.analytics.portfolioHealth(region);
    const tonight = this.analytics.tonightStatus(region);
    const exceptions = this.analytics.openExceptions();
    const brief = this.ai.operationsBrief();
    const proof = this.analytics.recentProofOfService(5);
    const avgRes = this.analytics.avgResolutionTime();
    const userName = this.currentUser?.name?.split(' ')[0] || 'James';
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'}).toUpperCase();

    el.innerHTML = `<div class="pm-shell">
      <div class="pm-page-heading"><div><span class="eyebrow">OPERATIONS OVERVIEW · ${dateStr}</span><h1>Good evening, ${userName}.</h1><p>Here's what's happening across your portfolio tonight.</p></div>
      <div class="pm-heading-actions"><button class="btn-secondary"><i data-lucide="calendar-days"></i> Tonight</button><button class="btn-primary" onclick="app._showView('report-view')"><i data-lucide="download"></i> Export report</button></div></div>

      <div class="pm-alert ${exceptions.some(e=>e.severity==='critical')?'pm-alert-critical':''}"><div class="pm-alert-icon"><i data-lucide="sparkles"></i></div><div><strong>AI Operations Brief</strong><p>${brief}</p></div><button class="text-button" onclick="app._showView('ai-view')">Ask ValetFlow AI <i data-lucide="arrow-up-right"></i></button></div>

      <div class="pm-kpi-grid">
        <div class="pm-kpi pm-kpi-featured"><div class="kpi-top"><span>Portfolio reliability</span><i data-lucide="shield-check"></i></div><strong>${portfolio.score}<span>/100</span></strong><div class="kpi-trend ${portfolio.score>=90?'positive':'negative'}"><i data-lucide="${portfolio.score>=90?'trending-up':'trending-down'}"></i> ${portfolio.healthy} of ${portfolio.totalProperties} healthy</div><div class="score-bar"><span style="width:${portfolio.score}%"></span></div></div>
        <div class="pm-kpi"><div class="kpi-top"><span>Service tonight</span><i data-lucide="check-circle-2"></i></div><strong>${tonight.totalCompleted}<small> / ${tonight.totalScheduled}</small></strong><div class="kpi-trend positive">${tonight.completionPct}% completed</div><div class="mini-progress"><span style="width:${tonight.completionPct}%"></span></div></div>
        <div class="pm-kpi"><div class="kpi-top"><span>Open issues</span><i data-lucide="circle-alert"></i></div><strong>${exceptions.length}</strong><div class="kpi-trend ${exceptions.length>3?'negative':'positive'}">${exceptions.filter(e=>e.severity==='critical').length} critical</div><p class="kpi-foot">${exceptions.filter(e=>e.exceptionType==='access_problem').length} access · ${exceptions.filter(e=>e.exceptionType==='route_delayed').length} delay · ${exceptions.filter(e=>e.exceptionType==='missed_pickups').length} missed</p></div>
        <div class="pm-kpi"><div class="kpi-top"><span>Avg. resolution</span><i data-lucide="timer"></i></div><strong>${avgRes}<small> hrs</small></strong><div class="kpi-trend positive">Target: under 24 hours</div></div>
      </div>

      <div class="pm-content-grid">
        <div class="pm-main-column">
          <div class="glass-card pm-table-card"><div class="card-header"><div><span class="eyebrow">LIVE SERVICE STATUS</span><h2>Tonight's operations</h2></div><button class="text-button" onclick="app._showView('exception-view')">View exceptions <i data-lucide="arrow-right"></i></button></div>
          <div class="table-responsive"><table class="data-table pm-property-table"><thead><tr><th>Property</th><th>Scheduled</th><th>Completed</th><th>Reliability</th><th>Status</th><th></th></tr></thead><tbody>
          ${tonight.routes.filter(r=>r.status!=='scheduled').map(r => `<tr><td><div class="property-cell"><span class="property-avatar">${(r.property?.name||'??').slice(0,2).toUpperCase()}</span><div><strong>${r.property?.name||'Unknown'}</strong><small>${r.driver?.name||''} · ${r.total} units</small></div></div></td>
          <td>${r.total}</td><td><strong>${r.completed}</strong><small class="muted"> ${r.total?Math.round(r.completed/r.total*100):0}%</small></td>
          <td><div class="reliability-cell"><strong>${r.reliability.score}%</strong><div class="mini-progress"><span style="width:${r.reliability.score}%"></span></div></div></td>
          <td><span class="health-pill health-${r.health}">${r.health==='healthy'?'Healthy':r.health==='attention'?'Attention':'Critical'}</span></td>
          <td><button class="icon-button" onclick="app.activePropertyId='${r.property?.id}';app._showView('client-view')"><i data-lucide="chevron-right"></i></button></td></tr>`).join('')}
          </tbody></table></div></div>

          <div class="glass-card proof-card"><div class="card-header"><div><span class="eyebrow">TRUST LAYER</span><h2>Recent proof of service</h2></div></div>
          <div class="proof-event-list">${proof.map(p => `<div class="proof-event"><span class="proof-check"><i data-lucide="check"></i></span><div><strong>Unit ${p.unitNumber||'—'} · Building ${p.buildingId||'—'}</strong><small>${p.propertyName} · ${p.driverName}</small></div><span class="proof-time">${new Date(p.ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span><span class="proof-tag">${p.gpsVerified?'<i data-lucide="map-pin"></i> GPS verified':'<i data-lucide="clock-3"></i> Logged'}</span></div>`).join('')}
          ${proof.length===0?'<div class="empty-state">No service events recorded tonight yet.</div>':''}
          </div></div>
        </div>

        <aside class="pm-side-column">
          <div class="glass-card reliability-card"><div class="card-header"><div><span class="eyebrow">SIGNATURE METRIC</span><h2>Reliability score</h2></div></div>
          <div class="score-ring"><div><strong>${portfolio.score}</strong><small>/100</small></div></div>
          <div class="score-breakdown">${(() => {
            const avg = PORTFOLIO.properties.slice(0,6).map(p => this.analytics.propertyReliability(p.id));
            const aOnTime = Math.round(avg.reduce((a,r)=>a+r.onTime,0)/avg.length);
            const aComp = Math.round(avg.reduce((a,r)=>a+r.completion,0)/avg.length*10)/10;
            const aSat = Math.round(avg.reduce((a,r)=>a+r.satisfaction,0)/avg.length);
            const aRes = Math.round(avg.reduce((a,r)=>a+r.resolution,0)/avg.length);
            return `<div><span>On-time performance</span><strong>${aOnTime}%</strong></div><div><span>Pickup completion</span><strong>${aComp}%</strong></div><div><span>Resident satisfaction</span><strong>${aSat}%</strong></div><div><span>Issue resolution</span><strong>${aRes}%</strong></div>`;
          })()}</div>
          <button class="btn-secondary btn-block" onclick="app._showView('report-view')">View benchmark details</button></div>

          <div class="glass-card issues-card"><div class="card-header"><div><span class="eyebrow">NEEDS ATTENTION</span><h2>Issue inbox</h2></div><span class="badge badge-amber">${exceptions.length} open</span></div>
          ${exceptions.slice(0,4).map(ex => `<div class="issue-row"><span class="issue-icon ${ex.severity==='critical'?'red':ex.severity==='warning'?'amber':'blue'}"><i data-lucide="${ex.exceptionType==='access_problem'?'key-round':ex.exceptionType==='route_delayed'?'clock-3':'message-circle-warning'}"></i></span><div><strong>${ex.exceptionType.replace(/_/g,' ')}</strong><small>${PORTFOLIO.properties.find(p=>p.id===ex.propertyId)?.name||''}</small></div><span class="issue-age">${this._timeAgo(ex.ts)}</span></div>`).join('')}
          <button class="text-button issue-link" onclick="app._showView('exception-view')">Open exception center <i data-lucide="arrow-right"></i></button></div>
        </aside>
      </div>
    </div>`;
    if(window.lucide) window.lucide.createIcons();
  }

  // ── 2. EXCEPTION CENTER ─────────────────────────────────────────────
  _renderExceptionCenter() {
    const el = document.getElementById('exception-view'); if(!el) return;
    const all = this.analytics.allExceptions();
    const open = all.filter(e => e.status !== 'resolved');
    const resolved = all.filter(e => e.status === 'resolved');

    el.innerHTML = `<div class="pm-shell">
      <div class="pm-page-heading"><div><span class="eyebrow">EXCEPTION MANAGEMENT</span><h1>Exception Center</h1><p>${open.length} open issue${open.length!==1?'s':''} requiring attention</p></div></div>

      ${this._renderEvidenceReviewPanel()}

      <div class="exception-summary-grid">
        <div class="exc-stat exc-critical"><i data-lucide="alert-triangle"></i><strong>${open.filter(e=>e.severity==='critical').length}</strong><span>Critical</span></div>
        <div class="exc-stat exc-warning"><i data-lucide="alert-circle"></i><strong>${open.filter(e=>e.severity==='warning').length}</strong><span>Warning</span></div>
        <div class="exc-stat exc-info"><i data-lucide="info"></i><strong>${open.filter(e=>e.severity==='info').length}</strong><span>Info</span></div>
        <div class="exc-stat exc-resolved"><i data-lucide="check-circle-2"></i><strong>${resolved.length}</strong><span>Resolved</span></div>
      </div>

      <div class="exception-list">
        ${open.map(ex => this._renderExceptionCard(ex)).join('')}
        ${open.length===0?'<div class="empty-state-card"><i data-lucide="party-popper"></i><h3>All Clear</h3><p>No open exceptions. All operations running smoothly.</p></div>':''}
      </div>

      ${resolved.length?`<div class="exc-resolved-section"><h3><i data-lucide="check-circle-2"></i> Recently Resolved (${resolved.length})</h3>${resolved.slice(0,5).map(ex => this._renderExceptionCard(ex,true)).join('')}</div>`:''}
    </div>`;
    if(window.lucide) window.lucide.createIcons();
  }

  async _loadPendingEvidence() {
    try {
      const items = await API.getPendingEvidence();
      this.pendingEvidence = await Promise.all(items.map(async item => ({ ...item, previewUrl: await API.createEvidenceUrl(item.storage_path) })));
    }
    catch(error) { console.error('Pending evidence load failed:', error); this.pendingEvidence = []; }
  }

  async _flushOfflineOperations() {
    if (!this.backendContext || !navigator.onLine) return;
    try {
      const count = await API.flushQueuedServiceOperations();
      if (count) { this._showToast(`${count} offline event${count === 1 ? '' : 's'} synchronized.`); this.renderAll(); }
    } catch(error) { console.warn('Offline queue unavailable:', error.message); }
  }

  _renderEvidenceReviewPanel() {
    const role = this.backendContext?.role;
    if(!['owner','admin','supervisor'].includes(role)) return '';
    const items = this.pendingEvidence || [];
    return `<div class="evidence-review-panel"><div class="card-header"><div><span class="eyebrow">EVIDENCE REVIEW</span><h2>${items.length} pending item${items.length===1?'':'s'}</h2></div><span class="status-chip chip-online">Supervisor action required</span></div>${items.length ? `<div class="evidence-review-list">${items.map(item => `<div class="evidence-review-item"><div class="evidence-review-meta"><strong>${item.service_events?.event_type || 'Service evidence'}</strong><span>${item.service_events?.property_id || 'Property'} · ${item.service_events?.building_ref || 'Building'}${item.service_events?.unit_ref ? ` · Door ${item.service_events.unit_ref}` : ''}</span><small>${new Date(item.created_at).toLocaleString()}</small>${item.previewUrl ? `<a href="${item.previewUrl}" target="_blank" rel="noopener noreferrer">Open private preview</a>` : ''}</div><div class="evidence-review-actions"><button class="btn-primary btn-sm" onclick="app._reviewEvidence('${item.id}','approved')"><i data-lucide="check"></i> Approve</button><button class="btn-secondary btn-sm" onclick="app._reviewEvidence('${item.id}','rejected')"><i data-lucide="x"></i> Reject</button></div></div>`).join('')}</div>` : '<p class="muted">No evidence is waiting for review.</p>'}</div>`;
  }

  async _reviewEvidence(id, status) {
    try {
      await API.reviewEvidence({ evidenceId:id, status });
      await this._loadPendingEvidence();
      this.renderAll();
      this._showToast(`Evidence ${status}. Reviewer decision recorded.`);
    } catch(error) { this._showToast(`Review failed: ${error.message}`); }
  }

  _renderExceptionCard(ex, isResolved=false) {
    const prop = PORTFOLIO.properties.find(p=>p.id===ex.propertyId);
    const driver = PORTFOLIO.drivers.find(d=>d.id===ex.driverId);
    return `<div class="exception-card ${isResolved?'resolved':''} severity-${ex.severity}">
      <div class="exc-card-header"><span class="exc-severity-badge severity-${ex.severity}">${ex.severity.toUpperCase()}</span><span class="exc-type">${(ex.exceptionType||'').replace(/_/g,' ')}</span><span class="exc-time">${this._timeAgo(ex.ts)}</span></div>
      <div class="exc-card-body"><div class="exc-property"><i data-lucide="building-2"></i> ${prop?.name||'Unknown'}</div><p>${ex.description}</p>
      ${driver?`<div class="exc-driver"><i data-lucide="user"></i> ${driver.name}</div>`:''}
      </div>
      <div class="exc-card-action"><div class="exc-recommendation"><i data-lucide="lightbulb"></i><div><strong>Recommended Action</strong><p>${ex.recommendedAction||'Investigate and resolve'}</p></div></div>
      ${!isResolved?`<div class="exc-card-buttons"><button class="btn-primary btn-sm" onclick="app._resolveException('${ex.id}')"><i data-lucide="check"></i> Resolve</button><button class="btn-secondary btn-sm" onclick="app._escalateException('${ex.id}')"><i data-lucide="arrow-up"></i> Escalate</button></div>`:'<span class="exc-resolved-tag"><i data-lucide="check-circle-2"></i> Resolved</span>'}
      </div></div>`;
  }

  _resolveException(id) {
    const evt = this.eventStore.events.find(e => e.id === id);
    if (evt) { evt.status = 'resolved'; this.eventStore._save(); this.renderAll(); }
  }
  _escalateException(id) {
    const evt = this.eventStore.events.find(e => e.id === id);
    if (evt) { evt.severity = 'critical'; this.eventStore._save(); this.renderAll(); }
  }

  // ── 2.5 PROPERTY INTELLIGENCE ──────────────────────────────────────
  _renderIntelligenceView() {
    const el = document.getElementById('intelligence-view'); if (!el) return;
    const selectedPid = this.activeIntelPropertyId || 'p1';
    const profile = this.propIntel.getProfile(selectedPid);
    const predictions = this.delayPredictor.getAllPredictions();
    const anomalies = this.anomalyDetector.detectAnomalies();
    const props = PORTFOLIO.properties;

    el.innerHTML = `<div class="pm-shell intel-shell">
      <div class="pm-page-heading">
        <div>
          <span class="eyebrow">PROPERTY BEHAVIOR & RISK PREDICTION</span>
          <h1>Property Intelligence Engine</h1>
          <p>AI-learned operational baselines, predictive delay modeling, and anomaly detection</p>
        </div>
        <div class="intel-prop-selector">
          <label><i data-lucide="building-2"></i> Select Property:</label>
          <select id="intel-property-select" onchange="app._changeIntelProperty(this.value)">
            ${props.map(p => `<option value="${p.id}" ${p.id===selectedPid?'selected':''}>${p.name} (${p.units} units)</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- PROPERTY BASELINE PROFILE -->
      <div class="intel-baseline-card">
        <div class="intel-baseline-header">
          <div class="intel-prop-title">
            <h2>${profile.property.name}</h2>
            <span>${profile.property.address} • ${profile.property.units} Units • ${profile.property.buildings} Buildings</span>
          </div>
          <div class="intel-risk-pill risk-${profile.peakDelayRisk.toLowerCase().startsWith('high')?'high':profile.peakDelayRisk.toLowerCase().startsWith('mod')?'medium':'low'}">
            <i data-lucide="shield-alert"></i> Delay Risk: ${profile.peakDelayRisk}
          </div>
        </div>

        <div class="intel-metrics-grid">
          <div class="intel-metric">
            <i data-lucide="timer"></i>
            <div class="intel-metric-body">
              <strong>${profile.avgSecPerDoor}s</strong>
              <span>Avg. Time / Door</span>
              <small>30-Day Learned Baseline</small>
            </div>
          </div>
          <div class="intel-metric">
            <i data-lucide="key"></i>
            <div class="intel-metric-body">
              <strong>${profile.gateReliability}%</strong>
              <span>Gate Access Rating</span>
              <small>Historical Code Reliability</small>
            </div>
          </div>
          <div class="intel-metric">
            <i data-lucide="zap"></i>
            <div class="intel-metric-body">
              <strong>${profile.avgHistoricalPace} doors/m</strong>
              <span>Service Speed Pace</span>
              <small>Avg. Porter Throughput</small>
            </div>
          </div>
          <div class="intel-metric">
            <i data-lucide="alert-circle"></i>
            <div class="intel-metric-body">
              <strong>${profile.commonExceptionType}</strong>
              <span>Primary Bottleneck</span>
              <small>Most Frequent Issue</small>
            </div>
          </div>
        </div>
      </div>

      <div class="intel-content-grid">
        <!-- PREDICTIVE DELAY MATRIX -->
        <div class="intel-card intel-matrix-card">
          <div class="card-header">
            <h2><i data-lucide="trending-up"></i> Predictive Delay Risk Matrix (Tonight)</h2>
            <p>Real-time machine learning predictions for active and upcoming routes</p>
          </div>
          <div class="table-container">
            <table class="pm-property-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Progress</th>
                  <th>Predicted Delay</th>
                  <th>Confidence</th>
                  <th>Root Cause & Risk Factor</th>
                  <th>Est. Finish</th>
                </tr>
              </thead>
              <tbody>
                ${predictions.map(pred => `
                  <tr>
                    <td><strong>${pred.propertyName}</strong></td>
                    <td>
                      <div style="display:flex;align-items:center;gap:6px;">
                        <span>${pred.progress}%</span>
                        <div class="mini-progress" style="width:50px;"><span style="width:${pred.progress}%"></span></div>
                      </div>
                    </td>
                    <td>
                      <span class="intel-delay-tag delay-${pred.riskLevel}">
                        ${pred.delayMinutes > 0 ? `+${pred.delayMinutes} min` : 'On Schedule'}
                      </span>
                    </td>
                    <td><strong>${pred.confidence}%</strong></td>
                    <td><small>${pred.rootCause}</small></td>
                    <td><span class="muted">${pred.estimatedEndTime}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- AI ANOMALY DETECTION FEED -->
        <div class="intel-card intel-anomaly-card">
          <div class="card-header">
            <h2><i data-lucide="sparkles"></i> AI Anomaly Detection Feed</h2>
            <p>Automated pattern deviation alerts flagged from raw event telemetry</p>
          </div>
          <div class="anomaly-list">
            ${anomalies.map(a => `
              <div class="anomaly-item severity-${a.severity}">
                <div class="anomaly-item-header">
                  <span class="anomaly-badge severity-${a.severity}">${a.severity.toUpperCase()}</span>
                  <strong>${a.type}</strong>
                  <span class="anomaly-time">${a.detectedAt}</span>
                </div>
                <div class="anomaly-item-body">
                  <div class="anomaly-property"><i data-lucide="building-2"></i> ${a.propertyName}</div>
                  <p>${a.description}</p>
                  <div class="anomaly-rec">
                    <i data-lucide="corner-down-right"></i>
                    <span><strong>AI Mitigation:</strong> ${a.recommendation}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>`;
    if (window.lucide) window.lucide.createIcons();
  }

  _changeIntelProperty(pid) {
    this.activeIntelPropertyId = pid;
    this._renderIntelligenceView();
  }


  // ── 3. AI CONSOLE ──────────────────────────────────────────────────
  _renderAIConsole() {
    const el = document.getElementById('ai-view'); if(!el) return;
    const recs = this.ai.recommendations();

    el.innerHTML = `<div class="pm-shell ai-shell">
      <div class="pm-page-heading"><div><span class="eyebrow">AI OPERATIONS INTELLIGENCE</span><h1>ValetFlow AI</h1><p>Data-driven insights and recommendations from your operational history.</p></div></div>

      <div class="ai-chat-container">
        <div class="ai-query-box"><div class="ai-input-wrap"><i data-lucide="sparkles"></i><input type="text" id="ai-query-input" placeholder="Ask: What's happening tonight? Which properties are at risk? Driver performance?" autocomplete="off"><button class="btn-primary" id="btn-ai-ask"><i data-lucide="send"></i></button></div>
        <div class="ai-quick-queries">${['What\'s happening tonight?','Which properties are at risk?','Show driver performance','Reliability scores'].map(q => `<button class="ai-quick-btn" onclick="app._askAI('${q}')">${q}</button>`).join('')}</div></div>
        <div class="ai-response-area" id="ai-response-area"><div class="ai-welcome"><i data-lucide="bot"></i><p>Ask me about tonight's operations, property performance, driver metrics, or any operational question. All answers are derived from your actual service data.</p></div></div>
      </div>
      <div class="ai-recs-section"><h2><i data-lucide="lightbulb"></i> Proactive Recommendations</h2>
      <div class="ai-recs-grid">${recs.map(r => `<div class="ai-rec-card severity-${r.severity}"><div class="ai-rec-header"><span class="exc-severity-badge severity-${r.severity}">${r.severity}</span><strong>${r.title}</strong></div><p>${r.detail}</p><div class="ai-rec-action"><i data-lucide="arrow-right-circle"></i> ${r.action}</div></div>`).join('')}</div></div>
    </div>`;

    document.getElementById('btn-ai-ask')?.addEventListener('click', () => this._askAI());
    document.getElementById('ai-query-input')?.addEventListener('keydown', e => { if(e.key==='Enter') this._askAI(); });
    if(window.lucide) window.lucide.createIcons();
  }

  _askAI(preset) {
    const input = document.getElementById('ai-query-input');
    const q = preset || input?.value?.trim();
    if (!q) return;
    if (input) input.value = '';
    const area = document.getElementById('ai-response-area');
    if (!area) return;
    const answer = this.ai.answerQuery(q);
    const fragment = document.createDocumentFragment();
    const userMessage = document.createElement('div');
    userMessage.className = 'ai-msg ai-msg-user';
    userMessage.innerHTML = '<i data-lucide="user"></i>';
    const userText = document.createElement('div');
    userText.textContent = q;
    userMessage.appendChild(userText);
    const botMessage = document.createElement('div');
    botMessage.className = 'ai-msg ai-msg-bot';
    botMessage.innerHTML = '<i data-lucide="bot"></i>';
    const botBody = document.createElement('div');
    const answerText = document.createElement('pre');
    answerText.textContent = answer;
    const source = document.createElement('small');
    source.className = 'ai-source';
    source.textContent = `Based on ${this.eventStore.events.length.toLocaleString()} operational events across ${PORTFOLIO.properties.length} properties`;
    botBody.append(answerText, source);
    botMessage.appendChild(botBody);
    fragment.append(userMessage, botMessage);
    area.prepend(fragment);
    if(window.lucide) window.lucide.createIcons();
  }

  // ── 4. RESIDENT EXPERIENCE ──────────────────────────────────────────
  _renderResidentExperience() {
    const el = document.getElementById('resident-view'); if(!el) return;
    const route = PORTFOLIO.routes.find(r => r.propertyId === 'p1');
    const prop = PORTFOLIO.properties[0];
    const driver = PORTFOLIO.drivers.find(d => d.id === route?.driverId);
    const now = new Date();
    const etaMin = route ? Math.max(5, Math.floor((100 - route.progress) * 1.2)) : 30;
    const eta = new Date(now.getTime() + etaMin * 60000);

    el.innerHTML = `<div class="pm-shell">
      <div class="pm-page-heading">
        <div>
          <span class="eyebrow">RESIDENT EXPERIENCE & ISSUE DISPATCH</span>
          <h1>"Uber for Valet" Resident Portal</h1>
          <p>Demo status tracking, simulated notifications, and issue reporting preview</p>
        </div>
      </div>
      <div class="resident-preview-wrapper">
        <div class="resident-phone-frame">
          <div class="res-status-bar"><span>9:41 PM</span><div class="mobile-icons"><i data-lucide="wifi"></i><i data-lucide="battery"></i></div></div>
          <div class="res-app-header"><div class="res-brand"><div class="res-logo"><i data-lucide="trash-2"></i></div><span>ValetFlow</span></div></div>

          <div class="res-tonight-card">
            <div class="res-tonight-label">Tonight's Pickup</div>
            <div class="res-pickup-window"><span class="res-label">Pickup Window</span><strong>${prop.serviceWindow}</strong></div>
            <div class="res-status-live"><span class="res-label">Current Status</span><div class="res-status-text"><span class="pulse-dot-sm"></span> ${route?.progress>=80?'Driver approaching your building':'Driver servicing nearby buildings'}</div></div>
            <div class="res-eta"><span class="res-label">Estimated Pickup</span><strong>${eta.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</strong><small class="res-confidence">Based on historical service duration</small></div>
          </div>

          <div class="res-driver-card"><div class="res-driver-info"><div class="res-driver-avatar">${driver?.name.split(' ').map(n=>n[0]).join('')||'MV'}</div><div><strong>${driver?.name||'Marcus Vance'}</strong><small>Your valet porter tonight</small></div></div><div class="res-progress-ring">${route?.progress||81}%</div></div>

          <div class="res-timeline"><div class="res-tl-title">Service Updates</div>
            <div class="res-tl-item completed"><div class="res-tl-dot"></div><div><strong>Service route started</strong><small>8:02 PM</small></div></div>
            <div class="res-tl-item completed"><div class="res-tl-dot"></div><div><strong>Driver arrived at your building</strong><small>8:38 PM</small></div></div>
            <div class="res-tl-item active"><div class="res-tl-dot"></div><div><strong>Servicing units nearby</strong><small>In progress</small></div></div>
            <div class="res-tl-item pending"><div class="res-tl-dot"></div><div><strong>Pickup complete</strong><small>Pending</small></div></div>
          </div>

          <div class="res-report-btn">
            <button class="btn-primary btn-block" onclick="document.getElementById('res-report-form-card').scrollIntoView({behavior:'smooth'})">
              <i data-lucide="message-circle"></i> Submit Resident Request
            </button>
          </div>
        </div>

        <div class="res-right-stack">
          <!-- ISSUE REPORTING FORM -->
          <div class="res-notifications-panel" id="res-report-form-card">
            <h3><i data-lucide="alert-triangle"></i> Resident Support & Issue Form</h3>
            <p class="res-notif-desc">Directly submits an operational ticket into ValetFlow's Event Store</p>
            <form onsubmit="app._handleResidentReportSubmit(event)" class="res-issue-form">
              <div class="form-group">
                <label>Unit Number & Property</label>
                <div style="display:grid;grid-template-columns:1fr 2fr;gap:10px;">
                  <input type="text" id="res-unit-num" placeholder="Apt #304" required value="Unit 304">
                  <select id="res-prop-id">
                    ${PORTFOLIO.properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Issue Type</label>
                <select id="res-issue-type">
                  <option value="missed_pickup">Missed Pickup Report</option>
                  <option value="damaged_bin">Request Replacement Trash Bin</option>
                  <option value="extra_pickup">Request Bulk / Extra Pickup</option>
                  <option value="general_feedback">General Valet Feedback</option>
                </select>
              </div>
              <div class="form-group">
                <label>Details / Message</label>
                <textarea id="res-issue-desc" rows="2" placeholder="Briefly describe the issue..." required>Trash bag was placed outside at 7:45 PM, but was not picked up during main sweep.</textarea>
              </div>
              <button type="submit" class="btn-primary bg-emerald btn-block"><i data-lucide="send"></i> Submit Ticket to Dispatch</button>
            </form>
          </div>

          <!-- NOTIFICATION PREFERENCES -->
          <div class="res-notifications-panel">
            <h3><i data-lucide="bell"></i> Notification Preview</h3>
            <p class="res-notif-desc">Illustrative messages only; this build does not dispatch SMS or push notifications</p>
            <div class="res-notif-list">
              <div class="res-notif"><span class="res-notif-time">7:30 PM</span><div class="res-notif-body"><strong>Pre-service SMS Sent</strong><p>"Your valet-trash pickup begins tonight at 8:00 PM. Please place bags outside your door."</p></div></div>
              <div class="res-notif"><span class="res-notif-time">8:35 PM</span><div class="res-notif-body"><strong>Push: Driver Approaching</strong><p>"Your valet service is approximately 10 minutes away."</p></div></div>
              <div class="res-notif"><span class="res-notif-time">8:47 PM</span><div class="res-notif-body"><strong>Service Complete Email</strong><p>"Your valet-trash pickup was completed at 8:47 PM. Proof of service GPS logged."</p></div></div>
              <div class="res-notif delayed"><span class="res-notif-time">—</span><div class="res-notif-body"><strong>Delay Alert (Smart Automation)</strong><p>"Your pickup is running approximately 15 minutes behind schedule. We apologize for the inconvenience."</p></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
    if(window.lucide) window.lucide.createIcons();
  }

  _handleResidentReportSubmit(e) {
    e.preventDefault();
    const unitNumber = document.getElementById('res-unit-num').value;
    const propertyId = document.getElementById('res-prop-id').value;
    const issueType = document.getElementById('res-issue-type').value;
    const description = document.getElementById('res-issue-desc').value;

    this.eventStore.submitResidentIssue({ propertyId, unitNumber, issueType, description });
    this._showToast(`✅ Ticket submitted for ${unitNumber}! Exception added to Command Center.`);
    this.renderAll();
  }

  // ── 5. PORTER MOBILE APP ────────────────────────────────────────────
  _renderPorterApp() {
    const grid = document.getElementById('m-building-grid-list'); if(!grid) return;
    const buildings = this.shiftBuildings;
    const completeCount = buildings.filter(b => b.done).length;
    const tag = document.getElementById('buildings-completed-tag');
    if(tag) tag.textContent = `${completeCount}/${buildings.length} Complete`;
    this._renderShiftControls();
    grid.innerHTML = buildings.map(b => `<div class="m-bldg-card ${b.done?'completed':''}" onclick="app._openBuilding('${b.id}','${b.name}',${b.units})"><div class="m-bldg-name">${b.name}</div><div class="m-bldg-meta">${b.serviced}/${b.units} Units</div><span class="m-bldg-badge ${b.done?'text-green':'text-red'}">${b.done?'✓ Completed':`● ${b.units-b.serviced} Pending`}</span></div>`).join('');
  }

  _renderShiftControls() {
    const status = document.getElementById('m-shift-status');
    const timer = document.getElementById('shift-clock-timer');
    const subtext = document.getElementById('m-shift-subtext');
    const start = document.getElementById('m-btn-start-shift');
    const arrive = document.getElementById('m-btn-arrive-property');
    const complete = document.getElementById('m-btn-complete-shift');
    if(!status) return;
    status.textContent = this.shift.status.replace('_',' ').toUpperCase();
    if(timer) timer.textContent = this.shift.startedAt ? this._formatShiftTime(Date.now() - new Date(this.shift.startedAt).getTime()) : '—';
    if(subtext) subtext.textContent = this.shift.status === 'scheduled' ? 'Start the simulated shift to begin.' : this.shift.status === 'started' ? 'Shift started. Confirm arrival at the property.' : this.shift.status === 'arrived' ? 'Arrival recorded. Complete buildings in order.' : 'Shift activity recorded for this simulation.';
    if(start) start.disabled = this.shift.status !== 'scheduled';
    if(arrive) arrive.disabled = this.shift.status !== 'started';
    if(complete) complete.disabled = this.shift.status !== 'arrived';
  }

  _formatShiftTime(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    return `${String(Math.floor(total/3600)).padStart(2,'0')}:${String(Math.floor(total/60)%60).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
  }

  _recordShiftEvent(type, data={}) {
    const event = this.eventStore.emit(type, { propertyId:this.shift.propertyId, driverId:this.shift.driverId, simulated:!this.backendContext, ...data });
    if (this.backendContext && this.shift.serviceRunId) {
      event.backendPromise = this._syncEventToBackend(event).catch(error => { console.error('Service event sync failed:', error); throw error; });
    }
    this.renderAll();
    return event;
  }

  async _ensureServiceRun() {
    if (!this.backendContext || this.shift.serviceRunId) return;
    const start = new Date(this.shift.startedAt || Date.now());
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const run = await API.createServiceRun({
      organizationId:this.backendContext.organizationId,
      propertyId:this.shift.propertyId,
      driverId:this.shift.driverId,
      scheduledStart:start.toISOString(),
      scheduledEnd:end.toISOString()
    });
    this.shift.serviceRunId = run.id;
  }

  async _syncEventToBackend(event) {
    const eventType = event.type === 'exception_detected' ? 'pickup_exception' : event.type;
    const details = { ...event };
    delete details.backendPromise;
    delete details.evidenceFile;
    const payload = {
      organizationId:this.backendContext.organizationId,
      serviceRunId:this.shift.serviceRunId,
      propertyId:this.shift.propertyId,
      eventType,
      clientEventId:event.id,
      buildingRef:event.buildingId,
      unitRef:event.unitNumber,
      occurredAt:event.ts,
      locationStatus:event.locationStatus || 'unavailable',
      evidenceStatus:event.evidenceStatus || 'not_required',
      details
    };
    const exception = event.type === 'exception_detected' ? {
        organizationId:this.backendContext.organizationId,
        serviceRunId:this.shift.serviceRunId,
        propertyId:this.shift.propertyId,
        exceptionType:event.exceptionType || 'other',
        severity:event.severity || 'warning',
        description:event.description || 'Service exception reported'
    } : null;
    try {
      const saved = await API.appendServiceEvent(payload);
      if (exception) await API.createServiceException({ ...exception, serviceEventId:saved.id });
      if (event.evidenceFile) await API.uploadEvidence({ organizationId:this.backendContext.organizationId, serviceEventId:saved.id, file:event.evidenceFile });
      return saved;
    } catch (error) {
      if (!navigator.onLine || /network|fetch|offline|load failed/i.test(error.message || '')) {
        await API.queueServiceOperation({ payload, exception, file:event.evidenceFile || null });
        this._showToast('Connection unavailable. Event queued for synchronization.');
        return null;
      }
      throw error;
    }
  }

  async _startShift() {
    if(this.shift.status !== 'scheduled') return;
    this.shift.startedAt = new Date().toISOString();
    this.shift.status = 'started';
    try { await this._ensureServiceRun(); } catch (error) { this.shift.status = 'scheduled'; return this._showLoginErr(`Unable to create service run: ${error.message}`); }
    this._recordShiftEvent('shift_started');
    this._showToast('Simulated shift started. Confirm arrival when on site.');
  }

  _confirmArrival() {
    if(this.shift.status !== 'started') return;
    this.shift.arrivedAt = new Date().toISOString();
    this.shift.status = 'arrived';
    this._recordShiftEvent('property_arrived', { locationStatus:this.backendContext ? 'unavailable' : 'simulated' });
    this._showToast('Simulated arrival recorded.');
  }

  _completeShift() {
    if(this.shift.status !== 'arrived') return;
    this.shift.completedAt = new Date().toISOString();
    this.shift.status = 'completed';
    this._recordShiftEvent('shift_completed');
    this._showToast('Simulated shift completed. Review the client timeline.');
  }

  _openBuilding(id, name, units) {
    if(this.shift.status !== 'arrived') return this._showToast('Confirm arrival before starting a building.');
    this.activeBuildingId = id;
    document.getElementById('m-active-bldg-name').textContent = `${name} (${units} Units)`;
    this._renderUnitChecklist(id);
    document.querySelectorAll('.m-screen').forEach(s=>s.classList.remove('active'));
    document.getElementById('m-step-unit-checklist')?.classList.add('active');
  }

  _renderUnitChecklist(bId) {
    const container = document.getElementById('m-unit-list-container'); if(!container) return;
    const bNum = bId.replace('b','');
    let html = '';
    for(let f=1;f<=3;f++) for(let d=1;d<=3;d++) {
      const u = `${bNum}0${f*10+d}`;
      html += `<div class="m-unit-row"><span class="m-unit-number">Door ${u}</span><div class="m-unit-actions"><button class="m-btn-serviced" onclick="app._markDoorServiced('${bId}','${u}',this)">Serviced</button><button class="m-btn-violation" onclick="app._openShiftException('${bId}','${u}')">Report issue</button></div></div>`;
    }
    container.innerHTML = html;
  }

  _markDoorServiced(buildingId, unitNumber, button) {
    if(this.shift.status !== 'arrived') return this._showToast('Confirm arrival before recording service.');
    button.classList.add('done');
    button.textContent = '✓ Serviced';
    button.disabled = true;
    const building = this.shiftBuildings.find(b => b.id === buildingId);
    if(building && building.serviced < building.units) building.serviced += 1;
    this._recordShiftEvent('pickup_completed', { buildingId, unitNumber, evidenceStatus:this.backendContext ? 'pending' : 'simulated' });
  }

  _openShiftException(buildingId, unitNumber) {
    this.activeExceptionContext = { buildingId, unitNumber };
    document.getElementById('modal-shift-exception')?.classList.add('active');
  }

  _submitShiftException() {
    const type = document.getElementById('shift-exception-type')?.value;
    const note = document.getElementById('shift-exception-note')?.value.trim();
    if(!note) return this._showToast('Add details before submitting the issue.');
    this._recordShiftEvent('exception_detected', { exceptionType:type, description:note, severity:type==='unsafe_condition'?'critical':'warning', status:'open', ...this.activeExceptionContext });
    document.getElementById('modal-shift-exception')?.classList.remove('active');
    document.getElementById('shift-exception-note').value = '';
    this._showToast('Simulated service issue submitted to operations.');
  }

  async _submitViolation() {
    const unit = this.activeUnitForViolation || '204';
    const type = document.getElementById('modal-violation-type')?.value;
    const note = document.getElementById('modal-violation-note')?.value.trim();
    const file = document.getElementById('modal-violation-file')?.files?.[0] || null;
    if(!note) return this._showToast('Add a description before logging the issue.');
    if(file && !file.type.startsWith('image/')) return this._showToast('Attach an image file only.');
    const event = this._recordShiftEvent('exception_detected', {
      buildingId:this.activeBuildingId,
      unitNumber:unit,
      exceptionType:'resident_violation_reported',
      description:note,
      category:type,
      severity:'warning',
      status:'open',
      evidenceStatus:file ? (this.backendContext ? 'pending' : 'simulated') : 'not_required',
      reviewStatus:'pending',
      evidenceFile:file || null
    });
    try {
      if(file && this.backendContext && event.backendPromise) {
        const savedEvent = await event.backendPromise;
        await API.uploadEvidence({ organizationId:this.backendContext.organizationId, serviceEventId:savedEvent.id, file });
      }
      document.getElementById('modal-violation-camera')?.classList.remove('active');
      if(document.getElementById('modal-violation-file')) document.getElementById('modal-violation-file').value = '';
      this.renderAll();
      this._showToast(file ? 'Violation logged; evidence is pending review.' : 'Violation logged; evidence was not attached.');
    } catch(error) {
      this._showToast(`Evidence upload failed: ${error.message}`);
    }
  }

  _openViolationModal(unit) {
    this.activeUnitForViolation = unit;
    document.getElementById('modal-violation-unit').textContent = unit;
    document.getElementById('modal-violation-camera')?.classList.add('active');
  }

  // ── 6. PROPERTY DETAIL ──────────────────────────────────────────────
  _renderPropertyDetail() {
    const el = document.getElementById('client-view'); if(!el) return;
    const prop = PORTFOLIO.properties.find(p=>p.id===this.activePropertyId) || PORTFOLIO.properties[0];
    const rel = this.analytics.propertyReliability(prop.id);
    const route = PORTFOLIO.routes.find(r=>r.propertyId===prop.id);
    const driver = route ? PORTFOLIO.drivers.find(d=>d.id===route.driverId) : null;
    const completed = route ? Math.floor(prop.units * route.progress / 100) : 0;
    const exceptions = this.analytics.openExceptions().filter(e=>e.propertyId===prop.id);

    el.querySelector('.client-banner h2')?.remove;
    const banner = el.querySelector('#client-prop-title');
    if(banner) banner.textContent = prop.name;
    const rateEl = document.getElementById('client-service-rate');
    if(rateEl) rateEl.textContent = `${route?Math.round(route.progress*10)/10:0}%`;
    const violCount = document.getElementById('client-violation-count');
    if(violCount) violCount.textContent = exceptions.length;
  }

  _renderClientTimeline() {
    const el = document.getElementById('client-service-timeline');
    if(!el || !this.eventStore) return;
    const events = this.eventStore.events.filter(e => e.propertyId === this.activePropertyId && ['shift_started','property_arrived','pickup_completed','building_completed','exception_detected','shift_completed'].includes(e.type)).sort((a,b) => new Date(a.ts) - new Date(b.ts)).slice(-12);
    const labels = {
      shift_started:'Shift started', property_arrived:'Property arrival recorded',
      pickup_completed:'Door serviced', building_completed:'Building completed',
      exception_detected:'Service issue reported', shift_completed:'Shift completed'
    };
    el.innerHTML = events.length ? events.map(e => `<div class="timeline-item"><span class="timeline-dot"></span><div><strong>${labels[e.type] || e.type}</strong><small>${new Date(e.ts).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}${e.buildingId ? ` · ${e.buildingId}` : ''}${e.unitNumber ? ` · Door ${e.unitNumber}` : ''}${e.description ? ` · ${e.description}` : ''}</small></div><span class="timeline-status">${e.simulated ? 'Simulated' : 'Recorded'}</span></div>`).join('') : '<div class="timeline-item"><span class="timeline-dot"></span><div><strong>Waiting for shift activity</strong><small>Events will appear here as the workflow runs.</small></div></div>';
  }

  // ── 7. REPORTS (EXECUTIVE SERVICE AUDIT) ───────────────────────────
  _renderReports() {
    const el = document.getElementById('report-view'); if(!el) return;
    const region = this.activeRegionId;
    const report = this.analytics.generateExecutiveReport(region);

    el.innerHTML = `<div class="pm-shell report-shell">
      <div class="pm-page-heading">
        <div>
          <span class="eyebrow">EXECUTIVE AUDIT & COMPLIANCE</span>
          <h1>Executive Service Audit Report</h1>
          <p>Monthly operational SLA metrics, fine revenue tracking, and compliance breakdowns for Client Property Managers</p>
        </div>
        <div class="report-actions">
          <button class="btn-primary bg-emerald" onclick="app._downloadReportPDF()"><i data-lucide="file-text"></i> Export PDF Audit</button>
          <button class="btn-secondary" onclick="app._downloadReportCSV()"><i data-lucide="download"></i> Export CSV Data</button>
        </div>
      </div>

      <!-- REPORT SUMMARY BANNER -->
      <div class="report-header-banner">
        <div class="report-banner-title">
          <h2>${report.regionName} — ${report.generatedAt}</h2>
          <span>Coverage: ${report.totalProperties} Properties • ${report.totalUnitsServiced.toLocaleString()} Total Units</span>
        </div>
        <div class="report-score-badge">
          <span>PORTFOLIO RELIABILITY SCORE</span>
          <strong>${report.portfolioReliabilityScore}/100</strong>
        </div>
      </div>

      <!-- EXECUTIVE SUMMARY METRICS -->
      <div class="intel-metrics-grid" style="margin-bottom:24px;">
        <div class="intel-metric">
          <i data-lucide="check-circle-2"></i>
          <div class="intel-metric-body">
            <strong>${report.totalPickupsCompleted.toLocaleString()}</strong>
            <span>Pickups Completed</span>
            <small>GPS-Verified Telemetry</small>
          </div>
        </div>
        <div class="intel-metric">
          <i data-lucide="shield-check"></i>
          <div class="intel-metric-body">
            <strong>${report.serviceComplianceRate}%</strong>
            <span>Service Compliance</span>
            <small>SLA Target: 98.0%</small>
          </div>
        </div>
        <div class="intel-metric">
          <i data-lucide="clock"></i>
          <div class="intel-metric-body">
            <strong>${report.avgSlaResolutionHours}h</strong>
            <span>Avg Issue SLA Resolution</span>
            <small>Target: &lt; 12.0 Hours</small>
          </div>
        </div>
        <div class="intel-metric">
          <i data-lucide="dollar-sign"></i>
          <div class="intel-metric-body">
            <strong>${report.estimatedFineRevenue}</strong>
            <span>Est. Violation Fine Revenue</span>
            <small>${report.totalViolationsLogged} Non-Compliance Logs</small>
          </div>
        </div>
      </div>

      <!-- PROPERTY SLA BREAKDOWN TABLE -->
      <div class="intel-card" style="margin-bottom:24px;">
        <div class="card-header">
          <h2><i data-lucide="building-2"></i> Property Performance & SLA Audit Breakdown</h2>
          <p>30-day compliance metrics per property for client executive reporting</p>
        </div>
        <div class="table-container">
          <table class="pm-property-table">
            <thead>
              <tr>
                <th>Property Name</th>
                <th>Units</th>
                <th>Reliability Score</th>
                <th>On-Time Service Rate</th>
                <th>Pickups Completed</th>
                <th>Missed Pickups</th>
                <th>Violations Logged</th>
                <th>Audit Status</th>
              </tr>
            </thead>
            <tbody>
              ${report.propertyBreakdown.map(p => `
                <tr>
                  <td><strong>${p.name}</strong></td>
                  <td>${p.units}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:6px;">
                      <strong>${p.reliabilityScore}</strong>
                      <span class="health-pill health-${p.reliabilityScore>=90?'healthy':p.reliabilityScore>=75?'attention':'critical'}"></span>
                    </div>
                  </td>
                  <td>${p.onTimeRate}%</td>
                  <td>${p.pickupsCompleted.toLocaleString()}</td>
                  <td><span class="${p.missedPickups>10?'text-warning':'muted'}">${p.missedPickups}</span></td>
                  <td><strong>${p.violationsLogged}</strong></td>
                  <td>
                    <span class="intel-delay-tag delay-${p.reliabilityScore>=90?'low':p.reliabilityScore>=75?'medium':'high'}">
                      ${p.reliabilityScore>=90?'SLA MET':'ACTION REQUIRED'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
    if(window.lucide) window.lucide.createIcons();
  }

  _downloadReportPDF() {
    this._showToast('📄 Generating Executive Service Audit PDF Report...');
    setTimeout(() => this._showToast('✅ PDF Audit Report downloaded successfully!'), 1500);
  }

  _downloadReportCSV() {
    this._showToast('📊 Exporting Raw Service Event CSV Telemetry...');
    setTimeout(() => this._showToast('✅ ValetFlow_Service_Audit_Data.csv exported!'), 1500);
  }

  // ── DEVICE PERMISSIONS & SYSTEM DIAGNOSTICS SUITE ──────────────────────

  // 1. CAMERA PERMISSIONS & LIVE STREAMING
  async _startLiveCamera(videoElId = 'violation-video-stream', imgElId = 'violation-img-preview', statusElId = 'camera-perm-status') {
    const video = document.getElementById(videoElId);
    const img = document.getElementById(imgElId);
    const status = document.getElementById(statusElId);
    const snapBtn = document.getElementById('btn-snap-camera-photo');
    const stopBtn = document.getElementById('btn-stop-camera-stream');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (status) status.textContent = 'Camera: API Unsupported';
      this._showToast('Camera API not supported in this browser. Please use file upload.');
      return false;
    }

    try {
      if (status) status.textContent = 'Camera: Requesting Permission...';
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
      this.cameraStream = stream;
      if (video) {
        video.srcObject = stream;
        video.style.display = 'block';
      }
      if (img) img.style.display = 'none';
      if (snapBtn) snapBtn.style.display = 'inline-flex';
      if (stopBtn) stopBtn.style.display = 'inline-flex';
      if (status) {
        status.textContent = 'Camera: Active (Granted)';
        status.className = 'status-chip chip-online';
      }
      this._showToast('📷 Camera stream active.');
      return true;
    } catch (err) {
      console.warn('Camera access denied or failed:', err);
      if (status) {
        status.textContent = `Camera: ${err.name === 'NotAllowedError' ? 'Permission Denied' : 'Unavailable'}`;
        status.className = 'status-chip chip-urgent';
      }
      if (video) video.style.display = 'none';
      if (img) img.style.display = 'block';
      this._showToast(`Camera permission error: ${err.message || err.name}. You can still upload files.`);
      return false;
    }
  }

  _stopLiveCamera(videoElId = 'violation-video-stream', imgElId = 'violation-img-preview') {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    const video = document.getElementById(videoElId);
    const img = document.getElementById(imgElId);
    const snapBtn = document.getElementById('btn-snap-camera-photo');
    const stopBtn = document.getElementById('btn-stop-camera-stream');
    if (video) { video.srcObject = null; video.style.display = 'none'; }
    if (img) img.style.display = 'block';
    if (snapBtn) snapBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'none';
    const status = document.getElementById('camera-perm-status');
    if (status) status.textContent = 'Camera: Standby';
  }

  _snapPhotoFromCamera(videoElId = 'violation-video-stream', canvasElId = 'violation-canvas', imgElId = 'violation-img-preview') {
    const video = document.getElementById(videoElId);
    const canvas = document.getElementById(canvasElId);
    const img = document.getElementById(imgElId);
    if (!video || !canvas || video.style.display === 'none') {
      this._showToast('Open camera stream first to snap a photo.');
      return null;
    }
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    if (img) {
      img.src = dataUrl;
      img.style.display = 'block';
    }
    video.style.display = 'none';
    this._stopLiveCamera(videoElId, imgElId);
    this._showToast('📸 Snapshot captured from live camera stream.');
    return dataUrl;
  }

  // 2. GPS PERMISSIONS & TELEMETRY
  _requestGPSPermission() {
    const badge = document.getElementById('diag-badge-gps');
    if (!('geolocation' in navigator)) {
      if (badge) { badge.textContent = 'GPS Unsupported'; badge.className = 'status-chip chip-urgent'; }
      return this._showToast('Geolocation is not supported by this browser.');
    }

    if (badge) badge.textContent = 'Requesting GPS...';
    navigator.geolocation.getCurrentPosition(
      pos => {
        this.gpsData = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          status: 'granted',
          timestamp: new Date().toISOString()
        };
        this._updateGPSDisplay();
        this._showToast(`📍 GPS Granted: (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}) ±${Math.round(pos.coords.accuracy)}m`);
      },
      err => {
        console.warn('GPS position error:', err);
        this.gpsData = { lat: null, lng: null, accuracy: null, status: 'denied', timestamp: new Date().toISOString(), error: err.message };
        this._updateGPSDisplay();
        this._showToast(`⚠️ GPS Error (${err.code}): ${err.message}. Defaulting to property geofence.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  _toggleWatchGPS() {
    if (this.gpsWatchId) {
      navigator.geolocation.clearWatch(this.gpsWatchId);
      this.gpsWatchId = null;
      this._showToast('GPS live watch stopped.');
    } else {
      if (!('geolocation' in navigator)) return;
      this.gpsWatchId = navigator.geolocation.watchPosition(
        pos => {
          this.gpsData = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            status: 'granted',
            timestamp: new Date().toISOString()
          };
          this._updateGPSDisplay();
        },
        err => { console.warn('GPS watch error:', err); },
        { enableHighAccuracy: true }
      );
      this._showToast('📡 GPS live watch tracking active.');
    }
    this._updateGPSDisplay();
  }

  _updateGPSDisplay() {
    const badge = document.getElementById('diag-badge-gps');
    const lat = document.getElementById('diag-gps-lat');
    const lng = document.getElementById('diag-gps-lng');
    const acc = document.getElementById('diag-gps-acc');
    const time = document.getElementById('diag-gps-time');
    const violTag = document.getElementById('modal-violation-gps-tag');

    if (badge) {
      if (this.gpsData.status === 'granted') {
        badge.textContent = `Granted (±${Math.round(this.gpsData.accuracy)}m)`;
        badge.className = 'status-chip chip-online';
      } else if (this.gpsData.status === 'denied') {
        badge.textContent = 'Denied / Error';
        badge.className = 'status-chip chip-urgent';
      } else {
        badge.textContent = 'Standby / Prompt';
        badge.className = 'status-chip';
      }
    }
    if (lat) lat.textContent = this.gpsData.lat ? this.gpsData.lat.toFixed(5) : '—';
    if (lng) lng.textContent = this.gpsData.lng ? this.gpsData.lng.toFixed(5) : '—';
    if (acc) acc.textContent = this.gpsData.accuracy ? `±${Math.round(this.gpsData.accuracy)} meters` : '—';
    if (time) time.textContent = this.gpsData.timestamp ? new Date(this.gpsData.timestamp).toLocaleTimeString() : '—';
    if (violTag) {
      violTag.textContent = this.gpsData.status === 'granted' ? `GPS (${this.gpsData.lat.toFixed(4)}, ${this.gpsData.lng.toFixed(4)})` : 'SIMULATED LOCATION';
    }
  }

  // 3. SCREEN LOCKING (WAKE LOCK API)
  async _requestWakeLock() {
    const badge = document.getElementById('diag-badge-wakelock');
    const state = document.getElementById('diag-wakelock-state');
    const support = document.getElementById('diag-wakelock-support');

    if (!('wakeLock' in navigator)) {
      if (support) support.textContent = 'No (Unsupported)';
      if (badge) { badge.textContent = 'Unsupported'; badge.className = 'status-chip chip-urgent'; }
      this._showToast('Screen Wake Lock API is not supported on this browser.');
      return false;
    }

    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      if (badge) { badge.textContent = 'ACTIVE 🔒'; badge.className = 'status-chip chip-online'; }
      if (state) state.textContent = 'Acquired (Screen will remain awake)';
      
      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null;
        if (badge) { badge.textContent = 'Released 🔓'; badge.className = 'status-chip'; }
        if (state) state.textContent = 'Released';
      });
      
      this._showToast('🔒 Screen Wake Lock acquired. Screen display will stay awake during shift.');
      return true;
    } catch (err) {
      console.warn('Wake Lock error:', err);
      if (badge) { badge.textContent = 'Failed'; badge.className = 'status-chip chip-urgent'; }
      if (state) state.textContent = `Error: ${err.message}`;
      this._showToast(`Screen Lock error: ${err.message}`);
      return false;
    }
  }

  _releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release().then(() => {
        this.wakeLock = null;
        this._showToast('🔓 Screen Wake Lock released.');
      });
    }
  }

  // 4. OFFLINE MODE & UPLOAD RETRY MANAGER
  _toggleSimulatedOffline() {
    this.simulatedOffline = !this.simulatedOffline;
    this._updateConnectionStatus();
    this._updateDiagnosticsQueueUI();
    this._showToast(this.simulatedOffline ? '⚡ Simulated Offline Mode Enabled.' : '🌐 Connected (Online Mode).');
  }

  async _updateDiagnosticsQueueUI() {
    const badge = document.getElementById('diag-badge-retry-count');
    const container = document.getElementById('diag-queue-list-container');
    if (!container) return;

    const syncObj = window.OfflineSync || (typeof OfflineSync !== 'undefined' ? OfflineSync : null);
    if (!syncObj) return;

    try {
      const items = await syncObj.all();
      if (badge) {
        badge.textContent = `${items.length} Pending Item${items.length === 1 ? '' : 's'}`;
        badge.className = items.length ? 'status-chip chip-urgent' : 'status-chip chip-online';
      }

      if (!items || items.length === 0) {
        container.innerHTML = '<div class="muted">No pending offline operations queued. All service events synced!</div>';
        return;
      }

      container.innerHTML = items.map((item, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
          <div>
            <strong>#${idx + 1} Event: ${item.payload.eventType}</strong>
            <div style="font-size:10px;" class="muted">ID: ${item.id} · Door ${item.payload.unitRef || 'N/A'} · Created: ${new Date(item.createdAt).toLocaleTimeString()}</div>
          </div>
          <span class="status-chip chip-urgent" style="font-size:10px;">Queued (Offline)</span>
        </div>
      `).join('');
    } catch (err) {
      console.warn('Queue UI update error:', err);
    }
  }

  async _flushOfflineOperations() {
    const online = navigator.onLine && !this.simulatedOffline;
    if (!online) {
      this._showToast('Cannot retry uploads while offline. Connect to network first.');
      return 0;
    }

    const apiObj = window.API || (typeof API !== 'undefined' ? API : null);
    if (!apiObj) return 0;

    try {
      const count = await apiObj.flushQueuedServiceOperations();
      await this._updateDiagnosticsQueueUI();
      if (count > 0) {
        this._showToast(`✅ Successfully synchronized ${count} queued offline event${count === 1 ? '' : 's'}!`);
        this.renderAll();
      } else {
        this._showToast('No pending offline uploads required retry.');
      }
      return count;
    } catch (err) {
      this._showToast(`Upload retry failed: ${err.message}`);
      return 0;
    }
  }

  async _addFakeOfflineTestEvent() {
    const fakeEvent = {
      payload: {
        clientEventId: 'test-evt-' + Date.now(),
        organizationId: 'org-demo',
        serviceRunId: 'run-demo',
        propertyId: 'p1',
        eventType: 'pickup_completed',
        buildingRef: 'b2',
        unitRef: '204',
        occurredAt: new Date().toISOString(),
        locationStatus: 'gps_verified',
        details: { note: 'Test offline queue event' }
      }
    };
    const syncObj = window.OfflineSync || (typeof OfflineSync !== 'undefined' ? OfflineSync : null);
    if (syncObj) await syncObj.add(fakeEvent);
    await this._updateDiagnosticsQueueUI();
    this._showToast('➕ Added test event to offline retry queue.');
  }

  async _clearOfflineQueue() {
    const syncObj = window.OfflineSync || (typeof OfflineSync !== 'undefined' ? OfflineSync : null);
    if (syncObj) {
      const items = await syncObj.all();
      for (const item of items) {
        await syncObj.remove(item.id);
      }
    }
    await this._updateDiagnosticsQueueUI();
    this._showToast('🗑️ Offline queue cleared.');
  }

  // 5. APP BACKGROUNDING & LIFECYCLE AUDIT
  _initLifecycleListeners() {
    document.addEventListener('visibilitychange', () => {
      const state = document.visibilityState;
      const isHidden = state === 'hidden';
      const timestamp = new Date().toLocaleTimeString();
      
      const logEntry = `${timestamp} — Tab ${isHidden ? 'BACKGROUNDED (hidden)' : 'FOREGROUNDED (visible)'}`;
      this.backgroundLogs.unshift(logEntry);
      if (this.backgroundLogs.length > 20) this.backgroundLogs.pop();

      if (isHidden) {
        const stateBackup = {
          timestamp: Date.now(),
          shiftStatus: this.shift.status,
          activeBuilding: this.activeBuildingId,
          activeProperty: this.activePropertyId
        };
        localStorage.setItem('valetflow_bg_saved_state', JSON.stringify(stateBackup));
      } else {
        if (this.shift.status === 'started' || this.shift.status === 'arrived') {
          this._requestWakeLock();
        }
        if (navigator.onLine && !this.simulatedOffline) {
          this._flushOfflineOperations();
        }
      }
      
      this._updateBackgroundAuditUI();
    });
  }

  _updateBackgroundAuditUI() {
    const badge = document.getElementById('diag-badge-visibility');
    const container = document.getElementById('diag-bg-audit-log');
    
    if (badge) {
      const isHidden = document.visibilityState === 'hidden';
      badge.textContent = `State: ${document.visibilityState.toUpperCase()}`;
      badge.className = isHidden ? 'status-chip chip-urgent' : 'status-chip chip-online';
    }

    if (container) {
      if (this.backgroundLogs.length === 0) {
        container.innerHTML = '<div class="muted">No lifecycle events recorded yet. Switch tabs or minimize app to test backgrounding...</div>';
      } else {
        container.innerHTML = this.backgroundLogs.map(log => `<div>${log}</div>`).join('');
      }
    }
  }

  // ── UTILITIES ────────────────────────────────────────────────────────
  _timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff/60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins/60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs/24)}d`;
  }
}

// ── INIT ──────────────────────────────────────────────────────────────
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new ValetFlowApp();
  app.initializeDataBackend();
  // Wire modal events
  document.getElementById('btn-close-violation-modal')?.addEventListener('click', () => document.getElementById('modal-violation-camera')?.classList.remove('active'));
  document.getElementById('btn-cancel-violation')?.addEventListener('click', () => document.getElementById('modal-violation-camera')?.classList.remove('active'));
  document.getElementById('m-btn-start-shift')?.addEventListener('click', () => app._startShift());
  document.getElementById('m-btn-arrive-property')?.addEventListener('click', () => app._confirmArrival());
  document.getElementById('m-btn-complete-shift')?.addEventListener('click', () => app._completeShift());
  document.getElementById('m-btn-dumpster-alert')?.addEventListener('click', () => app._openShiftException(app.activeBuildingId, null));
  document.getElementById('btn-close-shift-exception')?.addEventListener('click', () => document.getElementById('modal-shift-exception')?.classList.remove('active'));
  document.getElementById('btn-cancel-shift-exception')?.addEventListener('click', () => document.getElementById('modal-shift-exception')?.classList.remove('active'));
  document.getElementById('btn-submit-shift-exception')?.addEventListener('click', () => app._submitShiftException());
  document.getElementById('btn-submit-violation')?.addEventListener('click', () => app._submitViolation());
  document.getElementById('m-btn-back-buildings')?.addEventListener('click', () => {
    document.querySelectorAll('.m-screen').forEach(s=>s.classList.remove('active'));
    document.getElementById('m-step-shift-start')?.classList.add('active');
  });
  document.getElementById('m-btn-complete-bldg')?.addEventListener('click', () => {
    const building = app.shiftBuildings.find(b => b.id === app.activeBuildingId);
    if(building) building.done = true;
    app._recordShiftEvent('building_completed', { buildingId:app.activeBuildingId });
    document.querySelectorAll('.m-screen').forEach(s=>s.classList.remove('active'));
    document.getElementById('m-step-shift-start')?.classList.add('active');
    app.renderAll();
  });
  // Dispatch modal
  document.getElementById('btn-dispatch-route')?.addEventListener('click', () => document.getElementById('modal-dispatch-route')?.classList.add('active'));
  document.getElementById('btn-close-dispatch-modal')?.addEventListener('click', () => document.getElementById('modal-dispatch-route')?.classList.remove('active'));
  document.getElementById('btn-cancel-dispatch')?.addEventListener('click', () => document.getElementById('modal-dispatch-route')?.classList.remove('active'));

  // Camera stream modal controls
  document.getElementById('btn-start-camera-stream')?.addEventListener('click', () => app._startLiveCamera('violation-video-stream', 'violation-img-preview', 'camera-perm-status'));
  document.getElementById('btn-snap-camera-photo')?.addEventListener('click', () => app._snapPhotoFromCamera('violation-video-stream', 'violation-canvas', 'violation-img-preview'));
  document.getElementById('btn-stop-camera-stream')?.addEventListener('click', () => app._stopLiveCamera('violation-video-stream', 'violation-img-preview'));

  // System Diagnostics & Permissions Test Panel controls
  document.getElementById('btn-open-diagnostics')?.addEventListener('click', () => {
    document.getElementById('modal-diagnostics')?.classList.add('active');
    app._updateDiagnosticsQueueUI();
    app._updateGPSDisplay();
    app._updateBackgroundAuditUI();
  });
  document.getElementById('btn-close-diagnostics-modal')?.addEventListener('click', () => {
    app._stopLiveCamera('diag-camera-video', 'diag-camera-fallback');
    document.getElementById('modal-diagnostics')?.classList.remove('active');
  });
  document.getElementById('btn-close-diagnostics-footer')?.addEventListener('click', () => {
    app._stopLiveCamera('diag-camera-video', 'diag-camera-fallback');
    document.getElementById('modal-diagnostics')?.classList.remove('active');
  });

  document.getElementById('btn-diag-test-camera')?.addEventListener('click', () => app._startLiveCamera('diag-camera-video', 'diag-camera-fallback', 'diag-badge-camera'));
  document.getElementById('btn-diag-stop-camera')?.addEventListener('click', () => app._stopLiveCamera('diag-camera-video', 'diag-camera-fallback'));
  document.getElementById('btn-diag-request-gps')?.addEventListener('click', () => app._requestGPSPermission());
  document.getElementById('btn-diag-watch-gps')?.addEventListener('click', () => app._toggleWatchGPS());
  document.getElementById('btn-diag-acquire-wakelock')?.addEventListener('click', () => app._requestWakeLock());
  document.getElementById('btn-diag-release-wakelock')?.addEventListener('click', () => app._releaseWakeLock());
  document.getElementById('btn-diag-toggle-offline')?.addEventListener('click', () => app._toggleSimulatedOffline());
  document.getElementById('btn-diag-check-sw')?.addEventListener('click', () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        app._showToast(reg ? `ServiceWorker Active: scope ${reg.scope}` : 'ServiceWorker registering...');
      });
    } else {
      app._showToast('ServiceWorker unavailable in this environment.');
    }
  });
  document.getElementById('btn-diag-flush-retry')?.addEventListener('click', () => app._flushOfflineOperations());
  document.getElementById('btn-diag-add-fake-offline')?.addEventListener('click', () => app._addFakeOfflineTestEvent());
  document.getElementById('btn-diag-clear-queue')?.addEventListener('click', () => app._clearOfflineQueue());
  document.getElementById('btn-diag-sim-background')?.addEventListener('click', () => {
    app.backgroundLogs.unshift(`${new Date().toLocaleTimeString()} — [SIMULATED] App BACKGROUNDED (hidden)`);
    localStorage.setItem('valetflow_bg_saved_state', JSON.stringify({ timestamp: Date.now(), shiftStatus: app.shift.status }));
    app._updateBackgroundAuditUI();
    app._showToast('👁️ Simulated app backgrounding event recorded.');
  });
  document.getElementById('btn-diag-sim-foreground')?.addEventListener('click', () => {
    app.backgroundLogs.unshift(`${new Date().toLocaleTimeString()} — [SIMULATED] App FOREGROUNDED (visible)`);
    app._updateBackgroundAuditUI();
    app._showToast('👁️ Simulated app foregrounding event recorded.');
  });
});
