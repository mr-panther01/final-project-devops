from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.models import Task
from app.schemas import TaskCreate, TaskUpdate, TaskResponse, TaskStats

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

@router.get("", response_model=List[TaskResponse])
def get_tasks(
    status: Optional[str] = Query(None, description="Filter by status (TODO, IN_PROGRESS, DONE)"),
    priority: Optional[str] = Query(None, description="Filter by priority (LOW, MEDIUM, HIGH, CRITICAL)"),
    search: Optional[str] = Query(None, description="Search by title"),
    db: Session = Depends(get_db)
):
    query = db.query(Task)
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if search:
        query = query.filter(Task.title.ilike(f"%{search}%"))
    return query.order_by(Task.created_at.desc()).all()

@router.get("/stats", response_model=TaskStats)
def get_task_stats(db: Session = Depends(get_db)):
    tasks = db.query(Task).all()
    total = len(tasks)
    todo = sum(1 for t in tasks if t.status == "TODO")
    in_progress = sum(1 for t in tasks if t.status == "IN_PROGRESS")
    done = sum(1 for t in tasks if t.status == "DONE")
    
    by_priority = {
        "LOW": sum(1 for t in tasks if t.priority == "LOW"),
        "MEDIUM": sum(1 for t in tasks if t.priority == "MEDIUM"),
        "HIGH": sum(1 for t in tasks if t.priority == "HIGH"),
        "CRITICAL": sum(1 for t in tasks if t.priority == "CRITICAL"),
    }
    return TaskStats(
        total=total,
        todo=todo,
        in_progress=in_progress,
        done=done,
        by_priority=by_priority
    )

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found")
    return task

@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    task = Task(
        title=task_in.title,
        description=task_in.description,
        status=task_in.status,
        priority=task_in.priority
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task_in: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found")
    
    update_data = task_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    
    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found")
    db.delete(task)
    db.commit()
    return None
