# FarmLog Connect

Agricultural field data collection application designed for offline-first usage, geotagged photo capture, and digital form processing.

## Overview

FarmLog Connect is a comprehensive field data collection tool built for agricultural supervisors and administrators. It allows seamless digital capture of farmer records, AI-powered scanning of paper forms, and offline-first functionality for remote areas with poor connectivity. The platform features a bilingual UI (Hindi + English) and leverages modern web technologies wrapped in a React Native application.

## Features

- **Role-Based Access Control**:
  - **Admin**: Complete system oversight, user management, global record viewing, and data export.
  - **Supervisor**: Primary field worker interface for creating farmer profiles, filling digital forms, and scanning paper forms.
  - **Farmer**: End-user portal to view personal profiles and submitted surveys.
- **Offline-First with Auto-Sync**: Data is stored locally in IndexedDB when offline and automatically syncs to Azure Cosmos DB when connectivity is restored.
- **Geotagged Photo Capture**: GPS-stamped field photos uploaded directly to Azure Blob Storage.
- **AI-Powered Form Scanner**: Uses Azure Computer Vision to parse and digitize physical paper forms.
- **Bilingual Interface**: Native support for English and Hindi.

## Tech Stack

| Category           | Technology                                             |
| ------------------ | ------------------------------------------------------ |
| **Frontend**       | React 19, Vite, TanStack Router, TailwindCSS, Radix UI |
| **Mobile**         | React Native, Expo WebView                             |
| **Database**       | Azure Cosmos DB                                        |
| **Storage**        | Azure Blob Storage                                     |
| **AI / Vision**    | Azure Computer Vision                                  |
| **Authentication** | JWT (Email/Password)                                   |
| **Deployment**     | Azure Static Web Apps / Vercel                         |

## Project Structure

```text
farmlog-connect/
├── .github/          # GitHub Actions workflows and templates
├── assets/           # Static assets and icons for Expo
├── docs/             # Additional documentation (Architecture)
├── native/           # React Native Expo wrapper application
├── scripts/          # Database setup and initialization scripts
├── src/
│   ├── components/   # Reusable UI components and feature flows
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Core utilities (auth, db, storage, sync, types)
│   └── routes/       # Page-level routing modules
└── package.json      # Node.js dependencies and scripts
```

## Prerequisites

- Node.js (v22 recommended)
- npm (v10+)
- Azure Account (for Cosmos DB, Blob Storage, and Computer Vision services)

## Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd farmlog-connect
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Configuration

The application requires various environment variables to function correctly, particularly for Azure services and JWT authentication.

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in the required values. See `.env.example` for the required keys.

> **Note:** Never commit your `.env` file to version control.

## Initialization & Setup

Before running the application, you need to initialize your Azure Cosmos DB schema and create a default admin account.

1. **Initialize Cosmos DB Schema:**

   ```bash
   node scripts/setup-cosmos.cjs
   ```

2. **Seed Admin Account:**
   ```bash
   node scripts/seed-admin.cjs
   ```
   _(By default, this creates an admin with email `admin@farmlog.com` and password `Admin@123`. Please change the password upon first login!)_

## Running the Project

**Local Development:**

```bash
npm run dev
```

Starts the Vite development server.

**Production Build:**

```bash
npm run build
```

Compiles the web application for production.

**Preview Build:**

```bash
npm run preview
```

Locally previews the production build.

**Start Expo Mobile App:**

```bash
npm run start
```

Starts the Expo development server for the mobile wrapper.

## Deployment

The repository includes a GitHub Actions workflow (`.github/workflows/azure-static-web-apps-black-desert-0764e6b00.yml`) configured for automatic deployment to **Azure Static Web Apps**.

Ensure all required secrets (matching your `.env` keys) are added to your GitHub repository secrets for the CI/CD pipeline to successfully build and deploy the app.

## Contributing

See `CONTRIBUTING.md` for guidelines on how to contribute to this project.

## License

_(No explicit license provided. Please consult the repository owner before using or distributing.)_
