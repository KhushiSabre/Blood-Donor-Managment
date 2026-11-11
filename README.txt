# LifeLine - Blood Donor Management System

## Run in VS Code
1. Extract this ZIP file.
2. Open the `blood_donor_frontend` folder in VS Code.
3. Open `index.html` with the Live Server extension, or double-click it in a browser.
4. Demo login: username `admin`, password `admin123`.

## Included frontend features
- Login and registration screens (browser demo only)
- Dashboard with donor and open-request statistics
- Add, view, update, delete donor records
- Search donors by name, phone, city or blood group
- Filter donors by blood group and availability
- Store last donation date and donor availability status
- Blood request management: create, view, update, delete
- Record requested blood group, units, hospital, city, required date and urgency
- Search and filter blood requests
- Blood group and availability summaries
- Export donor records to CSV
- Responsive layout using Bootstrap

## Important project notes
This is the frontend prototype. It stores demo records in browser localStorage so the interface can be tested before connecting the Flask + MySQL backend. This is not secure authentication or central database storage. Do not enter real donor/patient information.

The dashboard initially contains fictional sample donor records. Blood requests start empty. The donor/request data is only administrative. The system does not determine medical eligibility or guarantee blood compatibility. A hospital/blood bank must verify compatibility, eligibility and availability.

Next step: replace localStorage operations with Flask API requests and store data in MySQL.
