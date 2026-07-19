from flask import Flask, render_template, request, jsonify, session
import os
import json
from datetime import datetime

app = Flask(__name__)
app.secret_key = "khwarizmi_school_secret_key_1404"

# پوشه و فایل ذخیره داده‌ها
DATA_FOLDER = "data"
if not os.path.exists(DATA_FOLDER):
    os.makedirs(DATA_FOLDER)

DATA_FILE = os.path.join(DATA_FOLDER, "school.data")

# ==================== ساختار پیش‌فرض دیتابیس ====================
DEFAULT_DATA = {
    "users": {},           # {"1234567890": {"nationalCode": "...", "firstName": "...", ...}}
    "candidates": [],     # [{"id": 1, "name": "...", "class": "...", ...}]
    "votes": {},          # {"1234567890": {"selectedIds": [...], "timestamp": "..."}}
    "election": {"active": False}
}

# ==================== توابع خواندن/نوشتن ====================
def read_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            return DEFAULT_DATA.copy()
    return DEFAULT_DATA.copy()

def write_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ==================== توابع کمکی ====================
def get_users():
    return read_data().get("users", {})

def get_candidates():
    return read_data().get("candidates", [])

def get_votes():
    return read_data().get("votes", {})

def get_election_status():
    return read_data().get("election", {}).get("active", False)

def save_all(users=None, candidates=None, votes=None, election=None):
    data = read_data()
    if users is not None:
        data["users"] = users
    if candidates is not None:
        data["candidates"] = candidates
    if votes is not None:
        data["votes"] = votes
    if election is not None:
        data["election"] = election
    write_data(data)

# ==================== مدیریت کاربران ====================
def find_user_by_national_code(national_code):
    users = get_users()
    return users.get(national_code)

def register_user(national_code, first_name, last_name, role):
    data = read_data()
    users = data["users"]
    
    if national_code in users:
        return {"success": False, "message": "این کد ملی قبلاً ثبت شده است!"}
    
    users[national_code] = {
        "nationalCode": national_code,
        "firstName": first_name,
        "lastName": last_name,
        "role": role,
        "hasVoted": False,
        "votedAt": None,
        "createdAt": datetime.now().isoformat()
    }
    write_data(data)
    return {"success": True, "user": users[national_code]}

def login_user(national_code):
    user = find_user_by_national_code(national_code)
    if not user:
        return {"success": False, "message": "این کد ملی ثبت نشده است! لطفاً ابتدا ثبت‌نام کنید."}
    return {"success": True, "user": user}

# ==================== مدیریت نامزدها ====================
def add_candidate(name, class_name, slogan, img):
    data = read_data()
    candidates = data["candidates"]
    
    new_id = int(datetime.now().timestamp() * 1000)
    candidate = {
        "id": new_id,
        "name": name,
        "class": class_name,
        "slogan": slogan,
        "img": img or "https://randomuser.me/api/portraits/lego/1.jpg"
    }
    candidates.append(candidate)
    write_data(data)
    return candidate

def delete_candidate(candidate_id):
    data = read_data()
    data["candidates"] = [c for c in data["candidates"] if c["id"] != candidate_id]
    write_data(data)

# ==================== مدیریت آراء ====================
def cast_vote(national_code, selected_ids):
    data = read_data()
    users = data["users"]
    votes = data["votes"]
    
    if national_code in votes:
        return {"success": False, "message": "شما قبلاً رأی داده‌اید!"}
    
    votes[national_code] = {
        "nationalCode": national_code,
        "selectedIds": selected_ids,
        "timestamp": datetime.now().isoformat()
    }
    
    # به روزرسانی وضعیت رأی در کاربر
    if national_code in users:
        users[national_code]["hasVoted"] = True
        users[national_code]["votedAt"] = datetime.now().isoformat()
    
    write_data(data)
    return {"success": True, "message": "رأی شما با موفقیت ثبت شد!"}

# ==================== مدیریت انتخابات ====================
def set_election_status(active):
    data = read_data()
    data["election"] = {"active": active}
    write_data(data)

# ==================== روت‌های صفحات ====================
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/voting")
def voting():
    return render_template("voting.html")

@app.route("/admin")
def admin():
    return render_template("admin.html")

# ==================== API ها ====================
@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json()
    national_code = data.get("nationalCode")
    result = login_user(national_code)
    if result["success"]:
        session["user"] = result["user"]
    return jsonify(result)

@app.route("/api/register", methods=["POST"])
def api_register():
    data = request.get_json()
    result = register_user(
        data.get("nationalCode"),
        data.get("firstName"),
        data.get("lastName"),
        data.get("role")
    )
    if result["success"]:
        session["user"] = result["user"]
    return jsonify(result)

@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.pop("user", None)
    return jsonify({"success": True})

@app.route("/api/current_user", methods=["GET"])
def api_current_user():
    return jsonify({"user": session.get("user")})

@app.route("/api/candidates", methods=["GET"])
def api_get_candidates():
    return jsonify({"candidates": get_candidates()})

@app.route("/api/candidates", methods=["POST"])
def api_add_candidate():
    data = request.get_json()
    candidate = add_candidate(
        data.get("name"),
        data.get("class"),
        data.get("slogan"),
        data.get("img")
    )
    return jsonify({"success": True, "candidate": candidate})

@app.route("/api/candidates/<int:candidate_id>", methods=["DELETE"])
def api_delete_candidate(candidate_id):
    delete_candidate(candidate_id)
    return jsonify({"success": True})

@app.route("/api/vote", methods=["POST"])
def api_vote():
    data = request.get_json()
    national_code = data.get("nationalCode")
    selected_ids = data.get("selectedIds")
    result = cast_vote(national_code, selected_ids)
    return jsonify(result)

@app.route("/api/votes", methods=["GET"])
def api_get_votes():
    return jsonify({"votes": get_votes()})

@app.route("/api/users", methods=["GET"])
def api_get_users():
    return jsonify({"users": get_users()})

@app.route("/api/election/status", methods=["GET"])
def api_get_election_status():
    return jsonify({"active": get_election_status()})

@app.route("/api/election/status", methods=["POST"])
def api_set_election_status():
    data = request.get_json()
    set_election_status(data.get("active"))
    return jsonify({"success": True})

@app.route("/api/reset", methods=["POST"])
def api_reset():
    write_data(DEFAULT_DATA.copy())
    session.clear()
    return jsonify({"success": True})

if __name__ == "__main__":
    app.run(debug=True)