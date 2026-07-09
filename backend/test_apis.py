"""Sanity-check all key APIs in-process using FastAPI TestClient."""
from main import app
from fastapi.testclient import TestClient

client = TestClient(app)

def main():
    # 1. Health
    r = client.get("/health")
    print("health:", r.status_code, r.json())

    # 2. Login applicant
    r = client.post("/auth/login", json={"username": "applicant", "password": "app123"})
    print("login applicant:", r.status_code)
    tok = r.json()["access_token"]
    H = {"Authorization": f"Bearer {tok}"}

    # 3. Create draft (check new number format)
    r = client.post("/applications/draft", headers=H)
    print("draft:", r.status_code, r.json())
    app_id = r.json()["id"]

    # 4. Notifications
    r = client.get("/notifications", headers=H)
    print("notifications:", r.status_code, r.json())

    # 5. Dashboard
    r = client.get("/applications/dashboard", headers=H)
    print("dashboard:", r.status_code, {k: v for k, v in r.json().items() if k != "applications"})

    # 6. Detail (this is what the blank page renders)
    r = client.get(f"/applications/{app_id}", headers=H)
    print("detail:", r.status_code, "keys:", list(r.json().keys()))

    # 7. Update detail with policy_type -> number should regenerate to PL-...
    r = client.put(f"/applications/{app_id}/details", headers=H, json={"policy_type": "Car", "coverage_amount": 1000000})
    print("update detail:", r.status_code, "body keys:", list(r.json().keys()) if r.status_code == 200 else r.text[:200])
    if r.status_code == 200:
        print("   number after update:", r.json().get("application", {}).get("application_number"))

    # 8. Submit
    r = client.post(f"/applications/{app_id}/submit", headers=H)
    print("submit:", r.status_code, r.json()["application"]["status"])

    # 9. Login manager, check pending list
    r = client.post("/auth/login", json={"username": "manager", "password": "manager123"})
    mtok = r.json()["access_token"]
    M = {"Authorization": f"Bearer {mtok}"}
    r = client.get("/applications/dashboard", headers=M)
    print("manager dashboard pending_count:", r.json().get("pending_count"))

    # 10. Withdraw (need a fresh draft for applicant)
    r = client.post("/applications/draft", headers=H)
    wid = r.json()["id"]
    r = client.post(f"/applications/{wid}/withdraw", headers=H)
    print("withdraw:", r.status_code, r.json()["application"]["status"])

    print("ALL API CHECKS DONE")

if __name__ == "__main__":
    main()
