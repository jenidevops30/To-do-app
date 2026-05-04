.PHONY: help build up down logs test clean restart shell-backend shell-frontend health

# Default target
help:
	@echo "Todo List Application - Docker Commands"
	@echo "========================================"
	@echo ""
	@echo "Setup & Build:"
	@echo "  make build              Build all Docker images"
	@echo "  make build-backend      Build backend image only"
	@echo "  make build-frontend     Build frontend image only"
	@echo ""
	@echo "Running Services:"
	@echo "  make up                 Start all services"
	@echo "  make up-d               Start all services in background"
	@echo "  make down               Stop all services"
	@echo "  make restart            Restart all services"
	@echo ""
	@echo "Logs & Monitoring:"
	@echo "  make logs               View all logs"
	@echo "  make logs-backend       View backend logs"
	@echo "  make logs-frontend      View frontend logs"
	@echo "  make ps                 Show running containers"
	@echo "  make health             Check service health"
	@echo ""
	@echo "Testing:"
	@echo "  make test               Run all tests"
	@echo "  make test-backend       Run backend tests"
	@echo "  make test-frontend      Run frontend tests"
	@echo ""
	@echo "Development:"
	@echo "  make shell-backend      Open shell in backend container"
	@echo "  make shell-frontend     Open shell in frontend container"
	@echo "  make lint               Run linters"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean              Stop services and remove containers"
	@echo "  make clean-all          Remove everything including volumes"
	@echo "  make clean-images       Remove all images"
	@echo ""

# Build targets
build:
	@echo "Building all Docker images..."
	docker-compose build

build-backend:
	@echo "Building backend image..."
	docker-compose build backend

build-frontend:
	@echo "Building frontend image..."
	docker-compose build frontend

build-no-cache:
	@echo "Building all images without cache..."
	docker-compose build --no-cache

# Service management
up:
	@echo "Starting all services..."
	docker-compose up

up-d:
	@echo "Starting all services in background..."
	docker-compose up -d
	@echo "Services started. Access at:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:5000/api"

down:
	@echo "Stopping all services..."
	docker-compose down

restart:
	@echo "Restarting all services..."
	docker-compose restart

restart-backend:
	@echo "Restarting backend..."
	docker-compose restart backend

restart-frontend:
	@echo "Restarting frontend..."
	docker-compose restart frontend

# Logs
logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

logs-tail:
	docker-compose logs --tail=100

# Status
ps:
	docker-compose ps

health:
	@echo "Checking service health..."
	@echo ""
	@echo "Backend health:"
	@curl -s http://localhost:5000/api/health || echo "Backend not responding"
	@echo ""
	@echo ""
	@echo "Frontend health:"
	@curl -s http://localhost:3000/health || echo "Frontend not responding"
	@echo ""

# Testing
test: test-backend test-frontend

test-backend:
	@echo "Running backend tests..."
	docker-compose exec backend pytest -v

test-backend-coverage:
	@echo "Running backend tests with coverage..."
	docker-compose exec backend pytest --cov=. --cov-report=html

test-frontend:
	@echo "Running frontend tests..."
	docker-compose exec frontend npm test

test-all:
	@echo "Running all tests..."
	docker-compose exec backend pytest -v
	docker-compose exec frontend npm test

# Development shells
shell-backend:
	@echo "Opening shell in backend container..."
	docker-compose exec backend /bin/bash

shell-frontend:
	@echo "Opening shell in frontend container..."
	docker-compose exec frontend /bin/sh

python-shell:
	@echo "Opening Python shell in backend container..."
	docker-compose exec backend python

# Linting and formatting
lint:
	@echo "Running linters..."
	docker-compose exec backend python -m flake8 .
	docker-compose exec frontend npm run lint

format:
	@echo "Formatting code..."
	docker-compose exec backend python -m black .
	docker-compose exec frontend npm run format

# Database operations
db-reset:
	@echo "Resetting database..."
	docker-compose down -v
	docker-compose up -d
	@echo "Database reset complete"

db-backup:
	@echo "Backing up database..."
	@mkdir -p ./backups
	@docker cp todo-backend:/app/data/todos.db ./backups/todos.db.backup
	@echo "Database backed up to ./backups/todos.db.backup"

db-restore:
	@echo "Restoring database from backup..."
	@docker cp ./backups/todos.db.backup todo-backend:/app/data/todos.db
	@echo "Database restored"

# Cleanup
clean:
	@echo "Stopping and removing containers..."
	docker-compose down

clean-all:
	@echo "Removing all containers, volumes, and networks..."
	docker-compose down -v
	@echo "Cleanup complete"

clean-images:
	@echo "Removing all images..."
	docker rmi todo-backend:latest todo-frontend:latest
	@echo "Images removed"

clean-volumes:
	@echo "Removing all volumes..."
	docker volume prune -f
	@echo "Volumes removed"

prune:
	@echo "Pruning unused Docker resources..."
	docker system prune -f
	@echo "Prune complete"

# Development workflow
dev: up-d logs

dev-stop: down

dev-reset: clean-all build up-d

# Production
prod-build:
	@echo "Building production images..."
	docker-compose build --no-cache

prod-up:
	@echo "Starting production services..."
	docker-compose -f docker-compose.yml up -d

prod-down:
	@echo "Stopping production services..."
	docker-compose down

# Utility
version:
	@echo "Docker version:"
	@docker --version
	@echo "Docker Compose version:"
	@docker-compose --version

info:
	@echo "System Information:"
	@echo "==================="
	@echo ""
	@echo "Docker Images:"
	@docker images | grep -E "todo-|REPOSITORY"
	@echo ""
	@echo "Running Containers:"
	@docker-compose ps
	@echo ""
	@echo "Networks:"
	@docker network ls | grep -E "todo-|DRIVER"
	@echo ""
	@echo "Volumes:"
	@docker volume ls | grep -E "todo-|DRIVER"

# Help for specific commands
help-docker:
	@echo "Docker Compose Help:"
	@docker-compose --help

help-docker-build:
	@echo "Docker Build Help:"
	@docker build --help

# Development with hot reload
dev-watch:
	@echo "Starting services with hot reload..."
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Quick start
quick-start: build up-d health
	@echo ""
	@echo "✓ Application started successfully!"
	@echo ""
	@echo "Access the application at:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:5000/api"
	@echo ""
	@echo "View logs with: make logs"
	@echo "Run tests with: make test"
	@echo "Stop services with: make down"

# Status check
status: ps health

# All-in-one commands
full-setup: clean-all build up-d test health
	@echo ""
	@echo "✓ Full setup complete!"

full-clean: clean-all clean-images clean-volumes prune
	@echo ""
	@echo "✓ Full cleanup complete!"
