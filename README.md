# 🗑️ ValetFlow Pro - Valet Trash Operations Platform

**ValetFlow Pro** is an end-to-end operations platform designed specifically for valet doorstep trash collection businesses. Inspired by industry standards like ValetHero, it provides tools for operations dispatch, field porter mobile workflows, proof-of-service logging, tenant violation management, and automated client reporting.

---

## ✨ Features Included

### 👑 1. Admin Operations Control Center
- **Live Fleet Geofence Map**: Real-time canvas tracking of field porters and building walkthrough progress.
- **Service Compliance Analytics**: Dynamic indicators for unit coverage %, active porters, and violation revenue tracking.
- **Night Shift Route Dispatcher**: Assign porters to properties with gate & compactor access codes.
- **Violation Approval Queue**: Review photo evidence logged by porters before generating official property notices.
- **Property Portfolio Directory**: Manage apartment contracts, unit counts, schedules, and gate/compactor codes.

### 📱 2. Porter Field Mobile App (Simulator)
- **High-Contrast Dark Theme**: Designed for night-shift visibility and single-hand mobile operation.
- **GPS Property Check-in**: Geofenced shift timer and property location lock.
- **Door-by-Door Unit Checklist**: Step-by-step building walkthroughs (Serviced vs. Violation).
- **3-Tap Camera Violation Logger**: Capture photo evidence, select violation categories (*Unbagged Trash, Unapproved Bin, Excessive Weight, Hazardous Waste*), and log fines in under 5 seconds.
- **Compactor Issue Trigger**: Real-time facility alert button for full compactors or locked gates.

### 🏢 3. Property Manager Client Portal
- **Service Assurance Metrics**: Real-time completion rates for apartment complex leasing offices.
- **Downloadable Tenant Violation Cards**: High-res photo proof cards ready to issue resident lease fine notices.
- **Bulk Item Removal Requester**: Submit requests for furniture, mattresses, and electronics.
- **Activity Timeline**: Full timestamped log of porter check-ins and building completions.

### 📄 4. Nightly Automated Summary Report
- Clean printable PDF / HTML document sent to property managers automatically at shift completion.

---

## 🚀 How to Run Locally

1. Open a terminal in the project directory:
   ```bash
   cd "c:/Users/james/Valet Trash Pickup"
   ```

2. Start a local HTTP web server:
   ```bash
   npx http-server . -p 8080
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:8080
   ```

---

## 📁 File Structure

```
├── index.html       # Main HTML SPA structure & view panels
├── styles.css       # Custom dark mode glassmorphism design system
├── app.js           # Full application state, simulator logic, canvas map & modals
├── assets/          # Real-world photos & images for violation & property previews
├── README.md        # Project documentation
```
