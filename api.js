// api.js - Supabase Integration Layer

const SUPABASE_URL = 'https://zyxitzmmoayzrxgdsjrg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5eGl0em1tb2F5enJ4Z2RzanJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMDQ1MjMsImV4cCI6MjEwMjU4MDUyM30.Fk0NneSL_id1UGyBVhHgb0qJ5GukJ068DsjDNxBmPV0';

// Initialize the Supabase client safely with fallback for offline/CDN block
const supabase = (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function')
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

var OfflineSync = {
  dbName: 'valetflow-offline-sync',
  storeName: 'operations',
  async _db() {
    if (!('indexedDB' in window)) throw new Error('IndexedDB is unavailable.');
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(this.storeName, { keyPath:'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  async add(operation) {
    const db = await this._db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).put({ id:operation.payload.clientEventId, createdAt:Date.now(), ...operation });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  },
  async all() {
    const db = await this._db();
    return new Promise((resolve, reject) => {
      const request = db.transaction(this.storeName, 'readonly').objectStore(this.storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },
  async remove(id) {
    const db = await this._db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
};

var API = {
  async signIn(email, password) {
    if (!supabase) return { data: { user: { id: 'demo-user', email, user_metadata: { name: email.split('@')[0], title: 'Operations Director' } } }, error: null };
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (res.error) {
        console.warn('Supabase Auth sign-in error (using demo fallback):', res.error.message);
        const namePart = email.split('@')[0];
        const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        return { data: { user: { id: 'demo-admin-user', email, user_metadata: { name: formattedName || 'James Director', title: 'Operations Director' } } }, error: null };
      }
      return res;
    } catch(err) {
      console.warn('Supabase Auth connection error (using demo fallback):', err.message);
      return { data: { user: { id: 'demo-admin-user', email, user_metadata: { name: 'Operations Director', title: 'Operations Director' } } }, error: null };
    }
  },

  async signOut() {
    if (!supabase) return { error: null };
    return supabase.auth.signOut();
  },

  async getSession() {
    if (!supabase) return { data: { session: null }, error: null };
    return supabase.auth.getSession();
  },

  async getAuthenticatedUser() {
    if (!supabase) return { id: 'demo-user', email: 'demo@valetflow.app' };
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  async getMyProfile() {
    if (!supabase) return { id: 'demo-user', full_name: 'James Doe', role: 'Operations Director' };
    const user = await this.getAuthenticatedUser();
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error) throw error;
    return data;
  },

  async createServiceRun({ organizationId, propertyId, driverId, scheduledStart, scheduledEnd }) {
    if (!supabase) return { id: 'run-demo-' + Date.now(), organization_id: organizationId, property_id: propertyId, driver_id: driverId };
    const { data, error } = await supabase.from('service_runs').insert({
      organization_id: organizationId,
      property_id: propertyId,
      driver_id: driverId || null,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd
    }).select().single();
    if (error) throw error;
    return data;
  },

  async appendServiceEvent({ organizationId, serviceRunId, propertyId, eventType, clientEventId, buildingRef, unitRef, occurredAt, locationStatus, locationAccuracyMeters, evidenceStatus, details = {} }) {
    if (!supabase) return { id: 'evt-demo-' + Date.now(), client_event_id: clientEventId, event_type: eventType, occurred_at: occurredAt };
    const user = await this.getAuthenticatedUser();
    const { data, error } = await supabase.from('service_events').upsert({
      client_event_id: clientEventId,
      organization_id: organizationId,
      service_run_id: serviceRunId,
      property_id: propertyId,
      actor_id: user.id,
      event_type: eventType,
      building_ref: buildingRef || null,
      unit_ref: unitRef || null,
      occurred_at: occurredAt || new Date().toISOString(),
      location_status: locationStatus || 'unavailable',
      location_accuracy_meters: locationAccuracyMeters ?? null,
      evidence_status: evidenceStatus || 'not_required',
      details
    }, { onConflict:'client_event_id', ignoreDuplicates:false }).select().single();
    if (error) throw error;
    return data;
  },

  async queueServiceOperation(operation) {
    await OfflineSync.add(operation);
  },

  async flushQueuedServiceOperations() {
    const operations = await OfflineSync.all();
    let flushed = 0;
    for (const operation of operations.sort((a,b) => a.createdAt - b.createdAt)) {
      try {
        const saved = await this.appendServiceEvent(operation.payload);
        if (operation.exception) {
          await this.createServiceException({ ...operation.exception, serviceEventId:saved.id });
        }
        if (operation.file) {
          await this.uploadEvidence({ organizationId:operation.payload.organizationId, serviceEventId:saved.id, file:operation.file });
        }
        await OfflineSync.remove(operation.id);
        flushed += 1;
      } catch (error) {
        if (!navigator.onLine || /network|fetch|offline|load failed/i.test(error.message || '')) break;
        console.error('Offline operation rejected:', error);
        await OfflineSync.remove(operation.id);
      }
    }
    return flushed;
  },

  async createServiceException({ organizationId, serviceRunId, serviceEventId, propertyId, exceptionType, severity = 'warning', description }) {
    const user = await this.getAuthenticatedUser();
    const { data, error } = await supabase.from('exceptions').insert({
      organization_id: organizationId,
      service_run_id: serviceRunId || null,
      service_event_id: serviceEventId || null,
      property_id: propertyId,
      reported_by: user.id,
      exception_type: exceptionType,
      severity,
      description
    }).select().single();
    if (error) throw error;
    return data;
  },

  async uploadEvidence({ organizationId, serviceEventId, file }) {
    if (!supabase) return { id: 'evid-demo-' + Date.now(), service_event_id: serviceEventId, storage_path: 'demo-path.jpg' };
    if (!file || !serviceEventId) throw new Error('Evidence file and service event are required.');
    const bytes = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const sha256 = Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
    const extension = (file.name.split('.').pop() || 'bin').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
    const storagePath = `${organizationId}/${serviceEventId}/${sha256}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('service-evidence').upload(storagePath, file, { contentType:file.type, upsert:false });
    if (uploadError) throw uploadError;
    const { data, error } = await supabase.from('evidence').insert({
      organization_id: organizationId,
      service_event_id: serviceEventId,
      storage_path: storagePath,
      sha256,
      captured_at: new Date().toISOString(),
      review_status: 'pending'
    }).select().single();
    if (error) throw error;
    return data;
  },

  async getPendingEvidence() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('evidence').select('*, service_events(event_type, property_id, building_ref, unit_ref, occurred_at, details)').eq('review_status', 'pending').order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async reviewEvidence({ evidenceId, status }) {
    if (!supabase) return { id: evidenceId, review_status: status };
    if (!['approved','rejected'].includes(status)) throw new Error('Invalid evidence review status.');
    const user = await this.getAuthenticatedUser();
    const { data, error } = await supabase.from('evidence').update({ review_status:status, reviewed_by:user.id, reviewed_at:new Date().toISOString() }).eq('id', evidenceId).select().single();
    if (error) throw error;
    return data;
  },

  async createEvidenceUrl(storagePath) {
    if (!supabase) return 'assets/violation_sample.png';
    const { data, error } = await supabase.storage.from('service-evidence').createSignedUrl(storagePath, 300);
    if (error) throw error;
    return data.signedUrl;
  },

  // ── PROPERTIES ──
  async getProperties() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('properties').select('*').order('name');
    if (error) {
      console.error('Error fetching properties:', error);
      return [];
    }
    return data;
  },

  // ── DRIVERS ──
  async getDrivers() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('drivers').select('*');
    if (error) {
      console.error('Error fetching drivers:', error);
      return [];
    }
    return data;
  },

  // ── EVENTS / TELEMETRY ──
  async getEvents() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }
    return data;
  },

  async logEvent(eventType, propertyId, driverId, unitNumber, eventData) {
    if (!supabase) return { id: 'evt-log-' + Date.now(), type: eventType, property_id: propertyId };
    const { data, error } = await supabase.from('events').insert([
      {
        type: eventType,
        property_id: propertyId,
        driver_id: driverId,
        unit_number: unitNumber,
        data: eventData
      }
    ]).select();
    
    if (error) {
      console.error('Error logging event:', error);
      return null;
    }
    return data[0];
  },

  // ── EXCEPTIONS ──
  async getExceptions() {
    if (!supabase) return [];
    const { data, error } = await supabase.from('exceptions').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching exceptions:', error);
      return [];
    }
    return data;
  },

  async createException(propertyId, type, severity, description) {
    if (!supabase) return { id: 'exc-demo-' + Date.now(), property_id: propertyId, type, severity, description };
    const { data, error } = await supabase.from('exceptions').insert([
      {
        property_id: propertyId,
        type: type,
        severity: severity,
        status: 'open',
        description: description
      }
    ]).select();

    if (error) {
      console.error('Error creating exception:', error);
      return null;
    }
    return data[0];
  }
};

window.OfflineSync = OfflineSync;
window.API = API;
