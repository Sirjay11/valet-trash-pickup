/* ==========================================================================
   VALETFLOW PRO — DATA LAYER, EVENT STORE & ANALYTICS ENGINE
   ========================================================================== */

// ── DEMO PORTFOLIO DATA ──────────────────────────────────────────────────
const PORTFOLIO = {
  org: { id:'org1', name:'SirJay Valet Services', plan:'enterprise' },
  regions: [
    { id: 'all', name: 'All Regions (Portfolio)' },
    { id: 'atlanta_north', name: 'Atlanta North Portfolio' },
    { id: 'atlanta_south', name: 'Atlanta South & Metro' },
    { id: 'midtown_luxury', name: 'Midtown & High-Rise' }
  ],
  themes: [
    { id: 'default', name: 'ValetFlow Emerald (Default)', accent: '#10b981', darkBg: '#090d16', cardBg: 'rgba(18, 24, 38, 0.75)' },
    { id: 'greystar', name: 'Greystar Executive Blue', accent: '#2563eb', darkBg: '#0b1329', cardBg: 'rgba(23, 37, 84, 0.75)' },
    { id: 'lincoln', name: 'Lincoln Property Forest', accent: '#059669', darkBg: '#061712', cardBg: 'rgba(6, 44, 32, 0.75)' },
    { id: 'maa', name: 'MAA Royal Purple', accent: '#7c3aed', darkBg: '#120b29', cardBg: 'rgba(46, 16, 101, 0.75)' }
  ],
  properties: [
    { id:'p1', name:'Oakridge Luxury Apartments', address:'1420 Oakridge Blvd', units:180, buildings:6, serviceWindow:'8:00 PM – 10:00 PM', schedule:'Sun–Thu', lat:33.749, lng:-84.388, region:'atlanta_north' },
    { id:'p2', name:'The Grand Reserve', address:'880 Reserve Way', units:140, buildings:4, serviceWindow:'8:30 PM – 10:30 PM', schedule:'Sun–Thu', lat:33.755, lng:-84.395, region:'atlanta_north' },
    { id:'p3', name:'Sunburst Ridge', address:'320 Sunburst Dr', units:100, buildings:3, serviceWindow:'9:00 PM – 11:00 PM', schedule:'Sun,Tue,Thu', lat:33.762, lng:-84.380, region:'atlanta_south' },
    { id:'p4', name:'Parkside Apartments', address:'450 Park Ave S', units:412, buildings:12, serviceWindow:'7:30 PM – 10:30 PM', schedule:'Sun–Thu', lat:33.770, lng:-84.370, region:'atlanta_south' },
    { id:'p5', name:'River Oaks', address:'2100 River Oaks Pkwy', units:287, buildings:8, serviceWindow:'8:00 PM – 10:00 PM', schedule:'Sun–Thu', lat:33.745, lng:-84.400, region:'atlanta_south' },
    { id:'p6', name:'The Lofts at Midtown', address:'155 10th St NE', units:194, buildings:5, serviceWindow:'8:00 PM – 10:00 PM', schedule:'Mon–Fri', lat:33.782, lng:-84.383, region:'midtown_luxury' },
    { id:'p7', name:'Summit Creek', address:'700 Summit Blvd', units:156, buildings:4, serviceWindow:'8:30 PM – 10:30 PM', schedule:'Sun–Thu', lat:33.738, lng:-84.410, region:'atlanta_north' },
    { id:'p8', name:'Heritage Pointe', address:'925 Heritage Ln', units:88, buildings:3, serviceWindow:'8:00 PM – 10:00 PM', schedule:'Mon,Wed,Fri', lat:33.792, lng:-84.375, region:'atlanta_north' },
    { id:'p9', name:'Willow Bend', address:'1330 Willow Creek Rd', units:210, buildings:6, serviceWindow:'8:00 PM – 10:00 PM', schedule:'Sun–Thu', lat:33.735, lng:-84.420, region:'atlanta_south' },
    { id:'p10', name:'Magnolia Gardens', address:'465 Magnolia St', units:120, buildings:4, serviceWindow:'9:00 PM – 11:00 PM', schedule:'Sun–Thu', lat:33.755, lng:-84.360, region:'atlanta_north' },
    { id:'p11', name:'Cypress Point', address:'800 Cypress Ave', units:76, buildings:2, serviceWindow:'8:30 PM – 10:30 PM', schedule:'Tue,Thu,Sat', lat:33.768, lng:-84.392, region:'midtown_luxury' },
    { id:'p12', name:'The Meridian', address:'1200 Meridian Blvd', units:340, buildings:10, serviceWindow:'7:00 PM – 10:00 PM', schedule:'Sun–Thu', lat:33.780, lng:-84.405, region:'midtown_luxury' }
  ],
  drivers: [
    { id:'d1', name:'Marcus Vance', email:'marcus@valetflow.com', status:'active' },
    { id:'d2', name:'Sarah Jenkins', email:'sarah@valetflow.com', status:'active' },
    { id:'d3', name:'Devon Carter', email:'devon@valetflow.com', status:'active' },
    { id:'d4', name:'Alex Torres', email:'alex@valetflow.com', status:'active' },
    { id:'d5', name:'Kim Nguyen', email:'kim@valetflow.com', status:'active' },
    { id:'d6', name:'Jordan Blake', email:'jordan@valetflow.com', status:'active' }
  ],
  // Tonight's route assignments
  routes: [
    { id:'r1', propertyId:'p1', driverId:'d1', status:'in_progress', progress:81, startTime:'8:02 PM' },
    { id:'r2', propertyId:'p2', driverId:'d2', status:'in_progress', progress:75, startTime:'8:25 PM' },
    { id:'r3', propertyId:'p3', driverId:'d3', status:'in_progress', progress:91, startTime:'8:40 PM' },
    { id:'r4', propertyId:'p4', driverId:'d4', status:'in_progress', progress:62, startTime:'7:35 PM' },
    { id:'r5', propertyId:'p5', driverId:'d5', status:'delayed', progress:48, startTime:'8:10 PM' },
    { id:'r6', propertyId:'p6', driverId:'d6', status:'in_progress', progress:94, startTime:'8:00 PM' },
    { id:'r7', propertyId:'p7', driverId:'d1', status:'scheduled', progress:0, startTime:'—' },
    { id:'r8', propertyId:'p8', driverId:'d2', status:'completed', progress:100, startTime:'8:00 PM' },
    { id:'r9', propertyId:'p9', driverId:'d3', status:'scheduled', progress:0, startTime:'—' },
    { id:'r10', propertyId:'p10', driverId:'d4', status:'scheduled', progress:0, startTime:'—' },
    { id:'r11', propertyId:'p12', driverId:'d5', status:'in_progress', progress:38, startTime:'7:15 PM' },
    { id:'r12', propertyId:'p11', driverId:'d6', status:'completed', progress:100, startTime:'8:30 PM' }
  ],
  // Authentication and authorization must come from the backend. Never add
  // passwords, PINs, access codes, or role authority to this public bundle.
  admins: []
};

// ── EVENT STORE ──────────────────────────────────────────────────────────
class EventStore {
  constructor() {
    this.events = [];
    this._load();
    if (this.events.length === 0) this._seedDemoEvents();
  }
  emit(type, data, ts) {
    const evt = { id: 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2,7), type, ts: ts || new Date().toISOString(), ...data };
    this.events.push(evt);
    this._save();
    return evt;
  }
  query(filter) {
    return this.events.filter(e => {
      for (const k in filter) { if (e[k] !== filter[k]) return false; }
      return true;
    });
  }
  recent(n) { return this.events.slice(-n); }
  byProperty(pid) { return this.events.filter(e => e.propertyId === pid); }
  byDriver(did) { return this.events.filter(e => e.driverId === did); }
  byType(type) { return this.events.filter(e => e.type === type); }
  today() {
    const d = new Date().toISOString().slice(0,10);
    return this.events.filter(e => e.ts && e.ts.startsWith(d));
  }
  lastNDays(n) {
    const cutoff = new Date(Date.now() - n * 86400000).toISOString();
    return this.events.filter(e => e.ts >= cutoff);
  }
  _save() {
    // Demo events stay in memory. Production events must use authenticated,
    // server-side storage with retention and access controls.
  }
  _load() {
    this.events = [];
  }
  reset() { this.events = []; this._seedDemoEvents(); this._save(); }
  initializeDemoData() {
    if (this.events.length === 0) {
      this._seedDemoEvents();
    }
  }

  _seedDemoEvents() {
    const now = new Date();
    const props = PORTFOLIO.properties;
    const drivers = PORTFOLIO.drivers;
    // Generate 30 days of historical events
    for (let day = 29; day >= 0; day--) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      date.setHours(20, 0, 0, 0);
      props.forEach((p, pi) => {
        const driverIdx = (pi + day) % drivers.length;
        const driver = drivers[driverIdx];
        const baseComplete = 0.92 + Math.random() * 0.07; // 92-99% completion
        const onTime = 0.90 + Math.random() * 0.09;
        const totalPickups = p.units;
        const completed = Math.floor(totalPickups * baseComplete);
        const missed = totalPickups - completed;
        const complaints = Math.floor(Math.random() * 3);
        const routeDuration = 60 + Math.floor(Math.random() * 60); // 60-120 min
        const ts = new Date(date); ts.setMinutes(Math.floor(Math.random()*30));
        // Route start event
        this.events.push({ id:`evt_h_${day}_${pi}_rs`, type:'route_started', ts:ts.toISOString(), propertyId:p.id, driverId:driver.id, routeDuration, totalPickups });
        // Route complete event
        const endTs = new Date(ts.getTime() + routeDuration * 60000);
        this.events.push({ id:`evt_h_${day}_${pi}_rc`, type:'route_completed', ts:endTs.toISOString(), propertyId:p.id, driverId:driver.id, completed, missed, onTimeRate: Math.round(onTime*100), complaints, routeDuration });
        // Missed pickup events
        for (let m = 0; m < missed; m++) {
          this.events.push({ id:`evt_h_${day}_${pi}_m${m}`, type:'pickup_missed', ts:endTs.toISOString(), propertyId:p.id, driverId:driver.id, unitNumber:`${Math.floor(Math.random()*900)+100}`, reason:['access_blocked','no_trash_out','skip_requested','driver_delay'][Math.floor(Math.random()*4)] });
        }
        // Complaint events
        for (let c = 0; c < complaints; c++) {
          const cTs = new Date(endTs.getTime() + Math.floor(Math.random()*7200000));
          this.events.push({ id:`evt_h_${day}_${pi}_c${c}`, type:'resident_complaint', ts:cTs.toISOString(), propertyId:p.id, message:['Trash not collected','Pickup was very late','Driver left mess','Missed my unit'][Math.floor(Math.random()*4)], resolved: Math.random() > 0.15, resolutionHours: 2 + Math.floor(Math.random()*22) });
        }
      });
    }
    // Tonight's live events
    const tonight = new Date(now); tonight.setHours(20, 0, 0, 0);
    PORTFOLIO.routes.forEach(r => {
      const p = props.find(x => x.id === r.propertyId);
      const d = drivers.find(x => x.id === r.driverId);
      if (!p || !d) return;
      if (r.status === 'completed' || r.status === 'in_progress' || r.status === 'delayed') {
        const st = new Date(tonight); st.setMinutes(parseInt(r.startTime) > 7 ? (parseInt(r.startTime)-7)*60 : 0);
        this.events.push({ id:`evt_t_${r.id}_rs`, type:'route_started', ts:st.toISOString(), propertyId:p.id, driverId:d.id, totalPickups:p.units });
        const completed = Math.floor(p.units * r.progress / 100);
        for (let i = 0; i < Math.min(completed, 20); i++) {
          const pTs = new Date(st.getTime() + (i+1)*120000);
          this.events.push({ id:`evt_t_${r.id}_p${i}`, type:'pickup_completed', ts:pTs.toISOString(), propertyId:p.id, driverId:d.id, unitNumber:`${100+i}`, buildingId:`b${Math.floor(i/5)+1}`, gpsVerified:false, simulated:true });
        }
        if (r.status === 'completed') {
          this.events.push({ id:`evt_t_${r.id}_rc`, type:'route_completed', ts:new Date(st.getTime()+5400000).toISOString(), propertyId:p.id, driverId:d.id, completed:p.units, missed:0, onTimeRate:98, complaints:0, routeDuration:90 });
        }
      }
    });
    // Tonight's exceptions
    this.events.push({ id:'evt_exc_1', type:'exception_detected', ts:new Date(tonight.getTime()+4200000).toISOString(), propertyId:'p5', severity:'critical', exceptionType:'route_delayed', description:'Route running 22 minutes behind schedule', recommendedAction:'Reassign Buildings 7-8 to available driver', status:'open', driverId:'d5' });
    this.events.push({ id:'evt_exc_2', type:'exception_detected', ts:new Date(tonight.getTime()+3600000).toISOString(), propertyId:'p4', severity:'warning', exceptionType:'missed_pickups', description:'7 resident-reported missed pickups in Buildings C and D', recommendedAction:'Dispatch follow-up sweep for Buildings C-D', status:'open', driverId:'d4' });
    this.events.push({ id:'evt_exc_3', type:'exception_detected', ts:new Date(tonight.getTime()+2400000).toISOString(), propertyId:'p5', severity:'warning', exceptionType:'access_problem', description:'Gate code changed at Building D — driver unable to enter', recommendedAction:'Contact property manager for updated access code', status:'in_progress', driverId:'d5' });
    this.events.push({ id:'evt_exc_4', type:'exception_detected', ts:new Date(tonight.getTime()+1800000).toISOString(), propertyId:'p12', severity:'info', exceptionType:'driver_delay', description:'Driver started 15 minutes late due to traffic', recommendedAction:'Monitor route progress — may self-correct', status:'resolved', driverId:'d5' });
    this._save();
  }

  submitResidentIssue(issueData) {
    const evtId = 'evt_res_' + Date.now();
    const issueEvt = {
      id: evtId,
      type: 'resident_complaint',
      ts: new Date().toISOString(),
      propertyId: issueData.propertyId || 'p1',
      unitNumber: issueData.unitNumber || '101',
      issueType: issueData.issueType || 'missed_pickup',
      description: issueData.description || 'Resident reported issue via Resident UX Portal',
      resolved: false,
      contact: issueData.contact || ''
    };
    this.events.push(issueEvt);

    // Also trigger exception if critical
    if (issueData.issueType === 'missed_pickup' || issueData.issueType === 'damaged_bin') {
      this.events.push({
        id: 'evt_exc_res_' + Date.now(),
        type: 'exception_detected',
        ts: new Date().toISOString(),
        propertyId: issueData.propertyId || 'p1',
        severity: 'warning',
        exceptionType: issueData.issueType,
        description: `Resident Report (${issueData.unitNumber}): ${issueData.description}`,
        recommendedAction: 'Dispatch driver for targeted sweep or bin replacement',
        status: 'open'
      });
    }
    this._save();
    return issueEvt;
  }
}

// ── ANALYTICS ENGINE ─────────────────────────────────────────────────────
class AnalyticsEngine {
  constructor(store) { this.store = store; }

  portfolioHealth(regionId = 'all') {
    const props = regionId && regionId !== 'all' ? PORTFOLIO.properties.filter(p => p.region === regionId) : PORTFOLIO.properties;
    const scores = props.map(p => this.propertyReliability(p.id));
    const avg = scores.length ? scores.reduce((a,b) => a + b.score, 0) / scores.length : 100;
    const healthy = scores.filter(s => s.score >= 90).length;
    const attention = scores.filter(s => s.score >= 70 && s.score < 90).length;
    const critical = scores.filter(s => s.score < 70).length;
    const propIds = new Set(props.map(p => p.id));
    const last30 = this.store.lastNDays(30).filter(e => propIds.has(e.propertyId));
    const completions = last30.filter(e => e.type === 'route_completed');
    const totalCompleted = completions.reduce((a,e) => a + (e.completed||0), 0);
    const totalScheduled = completions.reduce((a,e) => a + (e.completed||0) + (e.missed||0), 0);
    const completionRate = totalScheduled ? Math.round(totalCompleted/totalScheduled*1000)/10 : 0;
    return { score: Math.round(avg), healthy, attention, critical, totalProperties: props.length, completionRate, totalUnits: props.reduce((a,p) => a+p.units, 0) };
  }

  propertyReliability(pid) {
    const evts = this.store.byProperty(pid).filter(e => e.type === 'route_completed');
    const last30 = evts.filter(e => e.ts >= new Date(Date.now()-30*86400000).toISOString());
    if (last30.length === 0) return { score:95, onTime:95, completion:95, satisfaction:95, resolution:95 };
    const avgOnTime = last30.reduce((a,e) => a+(e.onTimeRate||95),0) / last30.length;
    const totalC = last30.reduce((a,e) => a+(e.completed||0),0);
    const totalS = last30.reduce((a,e) => a+(e.completed||0)+(e.missed||0),0);
    const completionRate = totalS ? totalC/totalS*100 : 95;
    const complaints = this.store.byProperty(pid).filter(e => e.type==='resident_complaint' && e.ts >= new Date(Date.now()-30*86400000).toISOString());
    const resolved = complaints.filter(c => c.resolved);
    const satisfaction = complaints.length ? Math.max(70, 100 - complaints.length * 1.5) : 96;
    const resolution = resolved.length && complaints.length ? Math.round(resolved.length/complaints.length*100) : 95;
    const score = Math.round(avgOnTime * 0.35 + completionRate * 0.30 + satisfaction * 0.20 + resolution * 0.15);
    return { score: Math.min(100, score), onTime: Math.round(avgOnTime), completion: Math.round(completionRate*10)/10, satisfaction: Math.round(satisfaction), resolution };
  }

  tonightStatus(regionId = 'all') {
    let props = PORTFOLIO.properties;
    if (regionId && regionId !== 'all') props = props.filter(p => p.region === regionId);
    const propIds = new Set(props.map(p => p.id));
    const routes = PORTFOLIO.routes.filter(r => propIds.has(r.propertyId));
    const results = routes.map(r => {
      const p = PORTFOLIO.properties.find(x => x.id === r.propertyId);
      const d = PORTFOLIO.drivers.find(x => x.id === r.driverId);
      const completed = Math.floor((p?.units||100) * r.progress / 100);
      const rel = this.propertyReliability(r.propertyId);
      const exceptions = this.openExceptions().filter(e => e.propertyId === r.propertyId);
      let health = 'healthy';
      if (exceptions.some(e => e.severity === 'critical') || r.status === 'delayed') health = 'critical';
      else if (exceptions.length > 0 || r.progress < 40) health = 'attention';
      return { ...r, property: p, driver: d, completed, total: p?.units||0, reliability: rel, health, exceptions: exceptions.length };
    });
    const totalScheduled = results.reduce((a,r) => a + r.total, 0);
    const totalCompleted = results.reduce((a,r) => a + r.completed, 0);
    return { routes: results, totalScheduled, totalCompleted, completionPct: totalScheduled ? Math.round(totalCompleted/totalScheduled*1000)/10 : 0 };
  }

  openExceptions() {
    return this.store.byType('exception_detected').filter(e => e.status !== 'resolved').sort((a,b) => {
      const sev = { critical:0, warning:1, info:2 };
      return (sev[a.severity]||2) - (sev[b.severity]||2);
    });
  }

  allExceptions() {
    return this.store.byType('exception_detected').sort((a,b) => b.ts.localeCompare(a.ts));
  }

  driverPerformance(did) {
    const evts = this.store.byDriver(did).filter(e => e.type === 'route_completed');
    const last30 = evts.filter(e => e.ts >= new Date(Date.now()-30*86400000).toISOString());
    const totalRoutes = last30.length;
    const avgOnTime = totalRoutes ? last30.reduce((a,e) => a+(e.onTimeRate||95),0)/totalRoutes : 95;
    const totalCompleted = last30.reduce((a,e) => a+(e.completed||0),0);
    const totalMissed = last30.reduce((a,e) => a+(e.missed||0),0);
    const avgDuration = totalRoutes ? Math.round(last30.reduce((a,e) => a+(e.routeDuration||90),0)/totalRoutes) : 90;
    return { totalRoutes, avgOnTime:Math.round(avgOnTime), completionRate: totalCompleted+totalMissed ? Math.round(totalCompleted/(totalCompleted+totalMissed)*1000)/10 : 98, avgDuration };
  }

  recentProofOfService(n=10) {
    return this.store.byType('pickup_completed').slice(-n).reverse().map(e => {
      const p = PORTFOLIO.properties.find(x => x.id === e.propertyId);
      const d = PORTFOLIO.drivers.find(x => x.id === e.driverId);
      return { ...e, propertyName: p?.name||'Unknown', driverName: d?.name||'Unknown' };
    });
  }

  monthlyTrend(pid) {
    const weeks = [0,1,2,3].map(w => {
      const start = new Date(Date.now() - (w+1)*7*86400000).toISOString();
      const end = new Date(Date.now() - w*7*86400000).toISOString();
      const evts = this.store.byProperty(pid).filter(e => e.type==='route_completed' && e.ts >= start && e.ts < end);
      const comp = evts.reduce((a,e)=>a+(e.completed||0),0);
      const total = evts.reduce((a,e)=>a+(e.completed||0)+(e.missed||0),0);
      return { week: `Week ${4-w}`, completionRate: total ? Math.round(comp/total*1000)/10 : 0, routes: evts.length };
    }).reverse();
    return weeks;
  }

  avgResolutionTime() {
    const complaints = this.store.byType('resident_complaint').filter(c => c.resolved);
    if (!complaints.length) return 6.4;
    return Math.round(complaints.reduce((a,c) => a + (c.resolutionHours||6), 0) / complaints.length * 10) / 10;
  }

  generateExecutiveReport(regionId = 'all') {
    const props = regionId && regionId !== 'all' ? PORTFOLIO.properties.filter(p => p.region === regionId) : PORTFOLIO.properties;
    const propIds = new Set(props.map(p => p.id));
    const last30 = this.store.lastNDays(30).filter(e => propIds.has(e.propertyId));
    const completions = last30.filter(e => e.type === 'route_completed');
    const totalPickupsCompleted = completions.reduce((a,e) => a + (e.completed||0), 0) || 38450;
    const totalMissed = completions.reduce((a,e) => a + (e.missed||0), 0) || 112;
    const totalUnitsServiced = props.reduce((a,p) => a + p.units, 0);
    const avgSlaResolutionHours = this.avgResolutionTime();
    const portfolioHealth = this.portfolioHealth(regionId);

    const propertyBreakdown = props.map(p => {
      const rel = this.propertyReliability(p.id);
      const pRoutes = completions.filter(c => c.propertyId === p.id);
      const pServiced = pRoutes.reduce((a,e) => a + (e.completed||0), 0) || Math.round(p.units * 26);
      return {
        id: p.id,
        name: p.name,
        units: p.units,
        reliabilityScore: rel.score,
        onTimeRate: rel.onTime,
        pickupsCompleted: pServiced,
        missedPickups: Math.round(p.units * 0.04),
        violationsLogged: Math.round(p.units * 0.12)
      };
    });

    return {
      generatedAt: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      regionName: PORTFOLIO.regions.find(r => r.id === regionId)?.name || 'All Regions',
      totalProperties: props.length,
      totalUnitsServiced,
      totalPickupsCompleted,
      serviceComplianceRate: portfolioHealth.completionRate || 99.4,
      portfolioReliabilityScore: portfolioHealth.score,
      avgSlaResolutionHours,
      totalViolationsLogged: Math.round(totalUnitsServiced * 0.14),
      estimatedFineRevenue: '$' + (Math.round(totalUnitsServiced * 0.14 * 25)).toLocaleString(),
      propertyBreakdown
    };
  }
}

// ── PROPERTY INTELLIGENCE MODEL (Phase 3) ──────────────────────────────
class PropertyIntelligence {
  constructor(store) { this.store = store; }

  getProfile(pid) {
    const p = PORTFOLIO.properties.find(x => x.id === pid) || PORTFOLIO.properties[0];
    const evts = this.store.byProperty(pid);
    const completedRoutes = evts.filter(e => e.type === 'route_completed');
    const missedPickups = evts.filter(e => e.type === 'pickup_missed');
    const complaints = evts.filter(e => e.type === 'resident_complaint');

    // Calculated baseline metrics
    const avgSecPerDoor = completedRoutes.length ? Math.round((completedRoutes.reduce((a,r) => a + (r.routeDuration||90), 0) * 60) / (completedRoutes.length * p.units)) : 28;
    const gateIssues = evts.filter(e => e.type === 'exception_detected' && e.exceptionType === 'access_problem').length;
    const gateReliability = Math.max(78, 100 - gateIssues * 4);
    const avgHistoricalPace = Math.round((p.units / (completedRoutes.reduce((a,r) => a + (r.routeDuration||90), 0) / (completedRoutes.length||1))) * 10) / 10; // doors/min
    const peakDelayRisk = p.units > 250 ? 'High (Door density)' : p.buildings > 8 ? 'Moderate (Building spread)' : 'Low';
    const commonExceptionType = gateIssues > 2 ? 'Access Gate Failures' : missedPickups.length > 5 ? 'Uncollected Doors' : 'Late Put-Outs';

    return {
      property: p,
      avgSecPerDoor,
      gateReliability,
      avgHistoricalPace,
      peakDelayRisk,
      commonExceptionType,
      totalHistoricalRoutes: completedRoutes.length,
      totalMissed: missedPickups.length,
      totalComplaints: complaints.length
    };
  }
}

// ── DELAY PREDICTOR (Phase 3) ───────────────────────────────────────────
class DelayPredictor {
  constructor(store, propIntel) {
    this.store = store;
    this.propIntel = propIntel;
  }

  predictRoute(route) {
    const p = PORTFOLIO.properties.find(x => x.id === route.propertyId);
    if (!p) return null;
    const profile = this.propIntel.getProfile(p.id);

    // Dynamic risk calculation
    const progress = route.progress || 0;
    const isStarted = route.status === 'in_progress' || route.status === 'delayed';
    const currentStatus = route.status;

    let delayMinutes = 0;
    let confidence = 85;
    let riskLevel = 'low';
    let rootCause = 'Normal pace';

    if (currentStatus === 'delayed') {
      delayMinutes = 22;
      riskLevel = 'high';
      confidence = 94;
      rootCause = 'Access delay & pace mismatch at mid-route';
    } else if (isStarted && progress < 45 && p.units > 250) {
      delayMinutes = 14;
      riskLevel = 'medium';
      confidence = 82;
      rootCause = 'High door density bottleneck in Buildings 5-8';
    } else if (isStarted && profile.gateReliability < 85) {
      delayMinutes = 9;
      riskLevel = 'medium';
      confidence = 78;
      rootCause = 'Historical gate access code failure risk';
    } else if (currentStatus === 'completed') {
      delayMinutes = 0;
      riskLevel = 'low';
      confidence = 99;
      rootCause = 'Completed on schedule';
    }

    const estimatedEndTime = new Date(Date.now() + Math.max(5, Math.floor((100 - progress) * 1.1) + delayMinutes) * 60000);

    return {
      routeId: route.id,
      propertyName: p.name,
      propertyId: p.id,
      progress,
      riskLevel,
      delayMinutes,
      confidence,
      rootCause,
      estimatedEndTime: estimatedEndTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    };
  }

  getAllPredictions() {
    return PORTFOLIO.routes.map(r => this.predictRoute(r)).filter(Boolean);
  }
}

// ── ANOMALY DETECTOR (Phase 3) ──────────────────────────────────────────
class AnomalyDetector {
  constructor(store) { this.store = store; }

  detectAnomalies() {
    const anomalies = [];
    const events = this.store.events;
    const tonightEvts = this.store.today();

    // 1. Check for abnormal service pace (too fast / skipped doors)
    PORTFOLIO.routes.forEach(r => {
      if (r.progress > 90 && r.status === 'in_progress') {
        const p = PORTFOLIO.properties.find(x => x.id === r.propertyId);
        anomalies.push({
          id: 'anom_' + r.id + '_speed',
          severity: 'warning',
          type: 'Abnormal Pace Spike',
          propertyName: p?.name || 'Property',
          propertyId: r.propertyId,
          description: `Service completed 35% faster than 30-day baseline for ${p?.name}. Possible unrecorded skips.`,
          recommendation: 'Trigger random quality inspection audit for tonight\'s completed buildings.',
          detectedAt: 'Just now'
        });
      }
    });

    // 2. Check for recurring gate issues
    const gateFailures = events.filter(e => e.type === 'exception_detected' && e.exceptionType === 'access_problem');
    if (gateFailures.length > 0) {
      const p5 = PORTFOLIO.properties.find(p => p.id === 'p5');
      anomalies.push({
        id: 'anom_gate_p5',
        severity: 'critical',
        type: 'Recurring Access Failure Pattern',
        propertyName: p5?.name || 'River Oaks',
        propertyId: 'p5',
        description: 'Gate code failure detected on 3 consecutive Sunday services at River Oaks.',
        recommendation: 'Issue automated update request to Property Manager for persistent gate code.',
        detectedAt: '12m ago'
      });
    }

    // 3. Violation cluster anomaly
    anomalies.push({
      id: 'anom_viol_p4',
      severity: 'info',
      type: 'Violation Spike',
      propertyName: 'Parkside Apartments',
      propertyId: 'p4',
      description: '45% increase in loose trash violations detected in Building C over last 7 days.',
      recommendation: 'Send target non-compliance warning flyer to Building C residents.',
      detectedAt: '28m ago'
    });

    return anomalies;
  }
}

// ── AI INSIGHTS ENGINE (Enhanced Phase 3) ────────────────────────────────
class AIEngine {
  constructor(analytics) {
    this.analytics = analytics;
    this.propIntel = new PropertyIntelligence(analytics.store);
    this.delayPredictor = new DelayPredictor(analytics.store, this.propIntel);
    this.anomalyDetector = new AnomalyDetector(analytics.store);
  }

  operationsBrief() {
    const exceptions = this.analytics.openExceptions();
    const tonight = this.analytics.tonightStatus();
    const predictions = this.delayPredictor.getAllPredictions();
    const highRisk = predictions.filter(p => p.riskLevel === 'high');
    const anomalies = this.anomalyDetector.detectAnomalies();

    const parts = [];
    if (highRisk.length) parts.push(`AI Predicts ${highRisk.length} route delay risk tonight (${highRisk.map(h=>h.propertyName).join(', ')}).`);
    if (anomalies.length) parts.push(`${anomalies.length} operational pattern anomalies detected by AI.`);
    exceptions.forEach(ex => {
      if (ex.severity === 'critical') parts.push(`${PORTFOLIO.properties.find(p=>p.id===ex.propertyId)?.name||'Property'}: ${ex.description}.`);
    });
    if (!parts.length) parts.push('All properties are operating normally tonight. No anomalies or delay risks detected.');
    return parts.join(' ');
  }

  recommendations() {
    const recs = [];
    const predictions = this.delayPredictor.getAllPredictions();
    const anomalies = this.anomalyDetector.detectAnomalies();

    // Add predictive recommendations
    predictions.forEach(p => {
      if (p.riskLevel === 'high' || p.riskLevel === 'medium') {
        recs.push({
          severity: p.riskLevel === 'high' ? 'critical' : 'warning',
          property: p.propertyName,
          title: `Predicted Delay (+${p.delayMinutes}m)`,
          detail: `AI models predict route completion delay at ${p.propertyName}. Root cause: ${p.rootCause} (Confidence: ${p.confidence}%).`,
          action: 'Preemptively dispatch secondary porter to assist'
        });
      }
    });

    // Add anomaly recommendations
    anomalies.forEach(a => {
      recs.push({
        severity: a.severity,
        property: a.propertyName,
        title: a.type,
        detail: a.description,
        action: a.recommendation
      });
    });

    // Historical pattern detection
    PORTFOLIO.properties.forEach(p => {
      const rel = this.analytics.propertyReliability(p.id);
      if (rel.score < 85) {
        recs.push({ severity:'warning', property:p.name, title:'Below Target Reliability', detail:`${p.name} reliability score is ${rel.score}/100 (target: 90+). On-time: ${rel.onTime}%, Completion: ${rel.completion}%.`, action:'Schedule operational review for this property' });
      }
    });
    if (!recs.length) recs.push({ severity:'info', property:'Portfolio', title:'Strong Performance', detail:'All properties meeting or exceeding targets. Continue monitoring.', action:'No immediate action required' });
    return recs;
  }

  answerQuery(q) {
    const ql = q.toLowerCase();
    const tonight = this.analytics.tonightStatus();
    const portfolio = this.analytics.portfolioHealth();
    const predictions = this.delayPredictor.getAllPredictions();
    const anomalies = this.anomalyDetector.detectAnomalies();

    if (ql.includes('predict') || ql.includes('delay') || ql.includes('eta')) {
      return predictions.map(p => `• ${p.propertyName}: ${p.riskLevel.toUpperCase()} RISK (+${p.delayMinutes}m) — ${p.rootCause} (Est. finish: ${p.estimatedEndTime}, ${p.confidence}% confidence)`).join('\n');
    }
    if (ql.includes('anomal') || ql.includes('pattern') || ql.includes('unusual')) {
      return anomalies.map(a => `• [${a.severity.toUpperCase()}] ${a.propertyName}: ${a.type} — ${a.description}`).join('\n');
    }
    if (ql.includes('tonight') || ql.includes('happening')) {
      return `Tonight's service: ${tonight.totalCompleted} of ${tonight.totalScheduled} pickups completed (${tonight.completionPct}%). ${tonight.routes.filter(r=>r.status==='in_progress').length} routes active, ${tonight.routes.filter(r=>r.status==='delayed').length} delayed, ${tonight.routes.filter(r=>r.status==='completed').length} completed.`;
    }
    if (ql.includes('risk') || ql.includes('attention') || ql.includes('problem')) {
      const issues = tonight.routes.filter(r => r.health !== 'healthy');
      return issues.length ? issues.map(r => `• ${r.property?.name}: ${r.health === 'critical' ? 'CRITICAL' : 'Needs attention'} — ${r.progress}% complete, ${r.exceptions} exceptions`).join('\n') : 'No properties currently at risk.';
    }
    if (ql.includes('driver') || ql.includes('porter')) {
      return PORTFOLIO.drivers.map(d => { const perf = this.analytics.driverPerformance(d.id); return `• ${d.name}: ${perf.totalRoutes} routes, ${perf.avgOnTime}% on-time, ${perf.completionRate}% completion`; }).join('\n');
    }
    if (ql.includes('score') || ql.includes('reliab')) {
      return PORTFOLIO.properties.map(p => { const r = this.analytics.propertyReliability(p.id); return `• ${p.name}: ${r.score}/100`; }).join('\n');
    }
    return `Portfolio: ${portfolio.score}/100 reliability across ${portfolio.totalProperties} properties (${portfolio.totalUnits} units). Ask about "predictions / delays", "anomalies", "tonight", "properties at risk", or "reliability scores".`;
  }
}

console.log('[ValetFlow] Data layer loaded — EventStore, AnalyticsEngine, AIEngine, PropertyIntelligence, DelayPredictor, AnomalyDetector ready.');
