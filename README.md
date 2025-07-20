# AI Voice & Text Assistant Frontend

This is a modern, responsive frontend for an AI-powered assistant, designed to interact with a backend service (like a Google Calendar agent). It provides two distinct user interfaces: a traditional text-based query input and a hands-free voice recording interface.

The application is built with a modern frontend stack including React, Vite, and Tailwind CSS, and features a clean, component-based architecture using shadcn/ui.

## Features

-   **Dual Interaction Modes**:
    -   **Text Interface**: Type a request to get a formatted Markdown response.
    -   **Voice Interface**: Record your voice, send it for processing, and receive both a text summary and a playable audio response.
-   **Dynamic UI**: The interface includes loading states with skeletons and provides user feedback through toast notifications.
-   **Responsive Design**: Built with Tailwind CSS for a seamless experience on all screen sizes.
-   **Environment-based Configuration**: Easily switch between local development and production backend endpoints using `.env` files.
-   **Secure Context Awareness**: The voice recording feature intelligently checks for secure contexts (HTTPS or localhost) required for microphone access.

## Tech Stack

-   **Framework**: React with TypeScript
-   **Build Tool**: Vite
-   **Styling**: Tailwind CSS
-   **UI Components**: shadcn/ui
-   **Icons**: Lucide React
-   **Notifications**: Sonner

## Prerequisites

-   Node.js (v18 or newer recommended)
-   npm, yarn, or pnpm

## Getting Started

Follow these steps to get the project running on your local machine.

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd test-frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

This project requires a backend URL to be configured. Create a `.env.local` file in the root of the project:

```bash
touch .env.local
```

Then, add the following line to the file, pointing it to your local backend server.

**File: `.env.local`**
```
VITE_API_URL=http://127.0.0.1:8080/assistant
```

### 4. Run the Development Server

```bash
npm run dev
```

The application should now be running at `http://localhost:5173` (or another port if 5173 is in use).

## Available Scripts

-   `npm run dev`: Starts the Vite development server with Hot Module Replacement (HMR).
-   `npm run build`: Compiles and bundles the application for production into the `dist/` directory.
-   `npm run preview`: Serves the production build locally to preview it before deployment.

## Backend API Requirement

This is a frontend-only application and **requires a separate backend service** to be running. The frontend expects the backend to be available at the URL specified in `VITE_API_URL`.

The backend must expose an `/assistant` endpoint that can handle two types of `POST` requests:

#### 1. Text-based Query

-   **Content-Type**: `application/json`
-   **Request Body**:
    ```json
    {
      "query": "Get my events for next week"
    }
    ```
-   **Success Response Body**: A JSON object containing the markdown text. The frontend checks for `result`, `output`, or `message` keys.
    ```json
    {
      "result": "### Upcoming Events..."
    }
    ```

#### 2. Voice-based Query

-   **Content-Type**: `multipart/form-data`
-   **Request Body**: `FormData` containing a file/blob with the key `audio`.
-   **Success Response Body**: A JSON object with the markdown text and a base64-encoded audio string for the TTS response.
    ```json
    {
      "text": "### Upcoming Events...",
      "audio_b64": "SUQzBAAAAA...",
      "mime": "audio/mpeg"
    }
    ```