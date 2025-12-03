# Deployment Guide for FeedbackFlow

This guide outlines the steps to deploy the FeedbackFlow application to **Render.com**.

## Prerequisites

- A [Render](https://render.com) account.
- A [GitHub](https://github.com) account with this repository pushed.
- A [Google Cloud Console](https://console.cloud.google.com) project for OAuth credentials.

## Step 1: Database Setup (PostgreSQL)

1.  Log in to your Render Dashboard.
2.  Click **New +** and select **PostgreSQL**.
3.  Fill in the details:
    -   **Name**: `feedbackflow-db`
    -   **Database**: `feedbackflow`
    -   **User**: `feedbackflow`
    -   **Region**: Select one close to you (e.g., Frankfurt or Oregon).
    -   **Plan**: Free (for testing) or Starter.
4.  Click **Create Database**.
5.  Once created, copy the **Internal Database URL** (starts with `postgres://...`). You will need this for the backend.

## Step 2: Backend Deployment

1.  Click **New +** and select **Web Service**.
2.  Connect your GitHub repository `feedbackflow-app`.
3.  Configure the service:
    -   **Name**: `feedbackflow-backend`
    -   **Region**: Same as your database.
    -   **Branch**: `main`
    -   **Root Directory**: `backend` (Important!)
    -   **Runtime**: Node
    -   **Build Command**: `npm install && npm run build`
    -   **Start Command**: `npm start`
4.  **Environment Variables**:
    -   Click **Advanced** or **Environment**.
    -   Add the following variables:
        -   `NODE_ENV`: `production`
        -   `DATABASE_URL`: (Paste the **Internal Database URL** from Step 1)
        -   `JWT_SECRET`: (Generate a secure random string, e.g., using `openssl rand -hex 32`)
        -   `GOOGLE_CLIENT_ID`: (Your Google OAuth Client ID)
        -   `GOOGLE_CLIENT_SECRET`: (Your Google OAuth Client Secret)
        -   `FRONTEND_URL`: (Leave empty for now, update later with frontend URL)
5.  Click **Create Web Service**.
6.  Wait for deployment to finish. Copy the service URL (e.g., `https://feedbackflow-backend.onrender.com`).

## Step 3: Frontend Deployment

1.  Click **New +** and select **Static Site**.
2.  Connect the same GitHub repository.
3.  Configure the service:
    -   **Name**: `feedbackflow-frontend`
    -   **Branch**: `main`
    -   **Root Directory**: `frontend` (Important!)
    -   **Build Command**: `npm install && npm run build`
    -   **Publish Directory**: `dist`
4.  **Environment Variables**:
    -   Add the following variables:
        -   `VITE_API_URL`: The Backend URL from Step 2 (e.g., `https://feedbackflow-backend.onrender.com/api/v1`) **Note: Append `/api/v1`**
        -   `VITE_GOOGLE_CLIENT_ID`: (Your Google OAuth Client ID)
5.  Click **Create Static Site**.
6.  Wait for deployment. Copy the frontend URL (e.g., `https://feedbackflow-frontend.onrender.com`).

## Step 4: Final Configuration

1.  **Update Google Cloud Console**:
    -   Go to your Google Cloud Console > APIs & Services > Credentials.
    -   Edit your OAuth 2.0 Client ID.
    -   Add the **Frontend URL** (from Step 3) to **Authorized JavaScript origins**.
    -   Add the **Frontend URL** to **Authorized redirect URIs** (if used).
2.  **Update Backend CORS (Optional but Recommended)**:
    -   If your backend restricts CORS, add the Frontend URL to the `CORS_ORIGIN` environment variable in the Backend service settings on Render.

## Verification

1.  Open the Frontend URL.
2.  Try to Log in with Google.
3.  Verify data loads from the database.

