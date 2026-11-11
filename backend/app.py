
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db_connection
from datetime import date, datetime

app = Flask(__name__)
CORS(app)


def get_data():
    return request.get_json(silent=True) or {}


def convert_dates(rows):
    for row in rows:
        for key, value in row.items():
            if isinstance(value, (date, datetime)):
                row[key] = value.isoformat()
    return rows


# HOME AND CONNECTION TEST

@app.route("/")
def home():
    return "LifeLine Backend is Running!"


@app.route("/api/health")
def health():
    import os
    print("FLASK DB PASSWORD SET:", bool(os.getenv("DB_PASSWORD")))

    try:
        db = get_db_connection()
        db.close()
        return jsonify({"status": "success", "message": "Database connected"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# USER REGISTRATION

@app.route("/api/register", methods=["POST"])
def register():
    data = get_data()

    name = data.get("name", "").strip()
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not name or not username or not password:
        return jsonify({"message": "All fields are required"}), 400

    email = username.lower() + "@lifeline.local"
    password_hash = generate_password_hash(password)

    db = get_db_connection()
    cursor = db.cursor()

    try:
        cursor.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)",
            (name, email, password_hash)
        )
        db.commit()
        return jsonify({"message": "Registration successful"}), 201

    except Exception:
        db.rollback()
        return jsonify({"message": "Username already exists"}), 409

    finally:
        cursor.close()
        db.close()


# USER LOGIN

@app.route("/api/login", methods=["POST"])
def login():
    data = get_data()

    username = data.get("username", "").strip().lower()
    password = data.get("password", "")

    email = username + "@lifeline.local"

    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if user and check_password_hash(user["password_hash"], password):
            return jsonify({
                "message": "Login successful",
                "name": user["name"]
            })

        return jsonify({"message": "Invalid username or password"}), 401

    finally:
        cursor.close()
        db.close()


# GET ALL DONORS

@app.route("/api/donors", methods=["GET"])
def get_donors():
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM donors ORDER BY id")
        donors = convert_dates(cursor.fetchall())

        for d in donors:
            d["group"] = d.pop("blood_group")
            d["lastDate"] = d.pop("last_donation_date")
            d["status"] = d.pop("availability")

        return jsonify(donors)

    finally:
        cursor.close()
        db.close()


# ADD DONOR

@app.route("/api/donors", methods=["POST"])
def add_donor():
    data = get_data()

    db = get_db_connection()
    cursor = db.cursor()

    try:
        cursor.execute("""
            INSERT INTO donors
            (name, age, gender, blood_group, phone, email,
             address, city, availability, last_donation_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data.get("name"),
            data.get("age"),
            data.get("gender"),
            data.get("group"),
            data.get("phone"),
            data.get("email"),
            data.get("address"),
            data.get("city"),
            data.get("status", "Available"),
            data.get("lastDate") or None
        ))

        db.commit()
        return jsonify({"message": "Donor added successfully"}), 201

    except Exception as e:
        db.rollback()
        return jsonify({"message": str(e)}), 400

    finally:
        cursor.close()
        db.close()


# UPDATE DONOR

@app.route("/api/donors/<int:donor_id>", methods=["PUT"])
def update_donor(donor_id):
    data = get_data()

    db = get_db_connection()
    cursor = db.cursor()

    try:
        cursor.execute("""
            UPDATE donors SET
            name=%s, age=%s, gender=%s, blood_group=%s,
            phone=%s, email=%s, address=%s, city=%s,
            availability=%s, last_donation_date=%s
            WHERE id=%s
        """, (
            data.get("name"),
            data.get("age"),
            data.get("gender"),
            data.get("group"),
            data.get("phone"),
            data.get("email"),
            data.get("address"),
            data.get("city"),
            data.get("status", "Available"),
            data.get("lastDate") or None,
            donor_id
        ))

        db.commit()

        if cursor.rowcount == 0:
            return jsonify({"message": "Donor not found"}), 404

        return jsonify({"message": "Donor updated successfully"})

    except Exception as e:
        db.rollback()
        return jsonify({"message": str(e)}), 400

    finally:
        cursor.close()
        db.close()


# DELETE DONOR

@app.route("/api/donors/<int:donor_id>", methods=["DELETE"])
def delete_donor(donor_id):
    db = get_db_connection()
    cursor = db.cursor()

    try:
        cursor.execute("DELETE FROM donors WHERE id=%s", (donor_id,))
        db.commit()

        if cursor.rowcount == 0:
            return jsonify({"message": "Donor not found"}), 404

        return jsonify({"message": "Donor deleted successfully"})

    finally:
        cursor.close()
        db.close()


# GET ALL BLOOD REQUESTS

@app.route("/api/requests", methods=["GET"])
def get_requests():
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM blood_requests ORDER BY id")
        rows = convert_dates(cursor.fetchall())

        for r in rows:
            r["name"] = r.pop("requester_name")
            r["phone"] = r.pop("contact_number")
            r["group"] = r.pop("blood_group")
            r["units"] = r.pop("units_needed")
            r["hospital"] = r.pop("hospital_name")
            r["city"] = r.pop("location")
            r["date"] = r.pop("required_date")
            r["urgency"] = r.pop("priority")
            r["notes"] = r.pop("details")

        return jsonify(rows)

    finally:
        cursor.close()
        db.close()


# ADD BLOOD REQUEST

@app.route("/api/requests", methods=["POST"])
def add_request():
    data = get_data()

    db = get_db_connection()
    cursor = db.cursor()

    try:
        cursor.execute("""
            INSERT INTO blood_requests
            (requester_name, patient_name, blood_group, units_needed,
             hospital_name, contact_number, location, priority,
             status, required_date, details)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data.get("name"),
            None,
            data.get("group"),
            data.get("units", 1),
            data.get("hospital"),
            data.get("phone"),
            data.get("city"),
            data.get("urgency", "Normal"),
            data.get("status", "Open"),
            data.get("date") or None,
            data.get("notes")
        ))

        db.commit()
        return jsonify({"message": "Blood request added successfully"}), 201

    except Exception as e:
        db.rollback()
        return jsonify({"message": str(e)}), 400

    finally:
        cursor.close()
        db.close()


# UPDATE BLOOD REQUEST

@app.route("/api/requests/<int:request_id>", methods=["PUT"])
def update_request(request_id):
    data = get_data()

    db = get_db_connection()
    cursor = db.cursor()

    try:
        cursor.execute("""
            UPDATE blood_requests SET
            requester_name=%s, blood_group=%s, units_needed=%s,
            hospital_name=%s, contact_number=%s, location=%s,
            priority=%s, status=%s, required_date=%s, details=%s
            WHERE id=%s
        """, (
            data.get("name"),
            data.get("group"),
            data.get("units", 1),
            data.get("hospital"),
            data.get("phone"),
            data.get("city"),
            data.get("urgency", "Normal"),
            data.get("status", "Open"),
            data.get("date") or None,
            data.get("notes"),
            request_id
        ))

        db.commit()

        if cursor.rowcount == 0:
            return jsonify({"message": "Request not found"}), 404

        return jsonify({"message": "Blood request updated successfully"})

    except Exception as e:
        db.rollback()
        return jsonify({"message": str(e)}), 400

    finally:
        cursor.close()
        db.close()


# DELETE BLOOD REQUEST

@app.route("/api/requests/<int:request_id>", methods=["DELETE"])
def delete_request(request_id):
    db = get_db_connection()
    cursor = db.cursor()

    try:
        cursor.execute("DELETE FROM blood_requests WHERE id=%s", (request_id,))
        db.commit()

        if cursor.rowcount == 0:
            return jsonify({"message": "Request not found"}), 404

        return jsonify({"message": "Blood request deleted successfully"})

    finally:
        cursor.close()
        db.close()


# ==========================================
# DONATION HISTORY API
# ==========================================

@app.route("/api/donations", methods=["GET"])
def get_donations():
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                dh.id,
                dh.donor_id,
                d.name AS donor_name,
                dh.donation_date,
                dh.units,
                dh.hospital_name,
                dh.notes
            FROM donation_history dh
            JOIN donors d ON dh.donor_id = d.id
            ORDER BY dh.donation_date DESC, dh.id DESC
        """)

        donations = cursor.fetchall()

        for donation in donations:
            if donation["donation_date"]:
                donation["donation_date"] = donation["donation_date"].isoformat()

        return jsonify(donations)

    finally:
        cursor.close()
        db.close()


@app.route("/api/donations", methods=["POST"])
def add_donation():
    data = get_data()

    donor_id = data.get("donor_id")
    donation_date = data.get("donation_date")
    units = data.get("units", 1)
    hospital_name = data.get("hospital_name", "")
    notes = data.get("notes", "")

    if not donor_id or not donation_date:
        return jsonify({
            "message": "Donor and donation date are required"
        }), 400

    try:
        units = int(units)

        if units < 1:
            return jsonify({"message": "Units must be at least 1"}), 400

        db = get_db_connection()
        cursor = db.cursor()

        try:
            cursor.execute("""
                INSERT INTO donation_history
                (donor_id, donation_date, units, hospital_name, notes)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                donor_id,
                donation_date,
                units,
                hospital_name,
                notes
            ))

            cursor.execute("""
                UPDATE donors
                SET last_donation_date = %s
                WHERE id = %s
            """, (donation_date, donor_id))

            db.commit()

            return jsonify({
                "message": "Donation recorded successfully"
            }), 201

        except Exception:
            db.rollback()
            raise

        finally:
            cursor.close()
            db.close()

    except ValueError:
        return jsonify({"message": "Invalid units"}), 400
    except Exception as error:
        return jsonify({"message": str(error)}), 400

if __name__ == "__main__":
    app.run(debug=True)
