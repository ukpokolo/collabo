# Collabo — Real-time Kanban Board

## Project Overview
Full-stack demo app for learning Laravel backend architecture with real-time features.
- **Backend:** Laravel 11 + Reverb (WebSocket broadcasting) + queued jobs
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS + Laravel Echo + Pusher JS

## Core Concepts to Learn
1. REST API CRUD in Laravel
2. Broadcasting events with Laravel Reverb
3. Presence channels and channel authorization
4. Background queues/jobs

## MVP Features
1. Live kanban board (To Do / In Progress / Done)
2. Presence indicators (who's online)
3. Background job when a task is marked done

## Project Structure
```
collabo/
├── backend/          # Laravel application
└── frontend/         # Next.js application
```

## Quick Start (Backend)
1. Install Composer dependencies: `cd backend && composer install`
2. Copy `.env.example` to `.env` and configure database
3. Run migrations: `php artisan migrate`
4. Start Reverb: `php artisan reverb:start --debug`
5. Start queue worker: `php artisan queue:work`
6. Start Laravel: `php artisan serve`

## Quick Start (Frontend)
1. Install dependencies: `cd frontend && npm install`
2. Copy `.env.local.example` to `.env.local`
3. Run dev server: `npm run dev`

## Interview Talking Points
- Difference between public, private, and presence channels
- Why broadcasting uses a queue connection
- Why background jobs shouldn't block HTTP responses
