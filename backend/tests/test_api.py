import pytest

def test_health_check(client):
    """Test /health endpoint returns 200 OK and status healthy."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_ready_check(client):
    """Test /ready endpoint verifies database connectivity."""
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"

def test_metrics_endpoint(client):
    """Test /metrics endpoint returns prometheus format."""
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests" in response.text or "process_virtual_memory_bytes" in response.text or "# HELP" in response.text

def test_create_task(client):
    """Test POST /api/tasks creates a new task."""
    payload = {
        "title": "Setup EKS Cluster",
        "description": "Provision AWS EKS with Terraform",
        "status": "TODO",
        "priority": "HIGH"
    }
    response = client.post("/api/tasks", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["title"] == payload["title"]
    assert data["status"] == "TODO"
    assert data["priority"] == "HIGH"

def test_get_tasks_and_filter(client):
    """Test GET /api/tasks and query parameters."""
    client.post("/api/tasks", json={"title": "Task 1", "status": "TODO", "priority": "LOW"})
    client.post("/api/tasks", json={"title": "Task 2", "status": "DONE", "priority": "CRITICAL"})

    # All tasks
    response = client.get("/api/tasks")
    assert response.status_code == 200
    assert len(response.json()) == 2

    # Filter by status
    response_todo = client.get("/api/tasks?status=TODO")
    assert response_todo.status_code == 200
    assert len(response_todo.json()) == 1
    assert response_todo.json()[0]["title"] == "Task 1"

def test_update_task(client):
    """Test PUT /api/tasks/{id} updates task status and title."""
    create_res = client.post("/api/tasks", json={"title": "Draft Architecture", "status": "TODO", "priority": "MEDIUM"})
    task_id = create_res.json()["id"]

    update_payload = {"status": "IN_PROGRESS", "priority": "HIGH"}
    update_res = client.put(f"/api/tasks/{task_id}", json=update_payload)
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "IN_PROGRESS"
    assert update_res.json()["priority"] == "HIGH"
    assert update_res.json()["title"] == "Draft Architecture"

def test_delete_task(client):
    """Test DELETE /api/tasks/{id} deletes the task."""
    create_res = client.post("/api/tasks", json={"title": "Temporary Task"})
    task_id = create_res.json()["id"]

    delete_res = client.delete(f"/api/tasks/{task_id}")
    assert delete_res.status_code == 204

    get_res = client.get(f"/api/tasks/{task_id}")
    assert get_res.status_code == 404

def test_task_stats(client):
    """Test GET /api/tasks/stats returns aggregate metrics."""
    client.post("/api/tasks", json={"title": "T1", "status": "TODO", "priority": "LOW"})
    client.post("/api/tasks", json={"title": "T2", "status": "IN_PROGRESS", "priority": "HIGH"})
    client.post("/api/tasks", json={"title": "T3", "status": "DONE", "priority": "CRITICAL"})

    response = client.get("/api/tasks/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert data["todo"] == 1
    assert data["in_progress"] == 1
    assert data["done"] == 1
    assert data["by_priority"]["HIGH"] == 1
    assert data["by_priority"]["CRITICAL"] == 1

def test_task_validation_error(client):
    """Test POST /api/tasks with empty title returns 422 Unprocessable Entity."""
    response = client.post("/api/tasks", json={"title": ""})
    assert response.status_code == 422

def test_update_nonexistent_task(client):
    """Test PUT /api/tasks/9999 returns 404 Not Found."""
    response = client.put("/api/tasks/9999", json={"title": "Non-existent"})
    assert response.status_code == 404
