### Nagrik - AI-Powered Civic Issue Reporter & Management System

Nagrik is a full-stack web application designed to bridge the gap between citizens and municipal authorities. It enables users to snap and report local civic issues (like potholes, garbage dumps, and street light failures) and automatically analyzes them using **Google Gemini AI** for instant categorization, description generation, and severity assessment.


# Tech Stack :-

* **Frontend:** React.js, Vite, Tailwind CSS, Lucide Icons
* **Backend:** FastAPI, Python, SlowAPI (Rate Limiting)
* **Database:** TiDB Serverless (MySQL-compatible)
* **AI Integration:** Google Gemini AI SDK
* **Deployment:** Vercel (Frontend), Render (Backend)


# Key Features :-

* **AI-Powered Issue Reporting:** Upload a photo of a civic issue, and Gemini AI automatically detects the category, writes a clear description, and assesses severity.
* **Multi-Language Support:** View and report issues in multiple regional and global languages.
* **Admin Dashboard:** Secure JWT-based authentication system with invite-code signup for municipal admins.
* **Issue Management:** Track status updates, view municipal analytics, and generate AI-driven weekly summaries.


# Future Additions :-

* **Enhanced Admin Verification:** Implement strict verification for municipal admins requiring official government email domains (e.g., `@gov.in` or `@nic.in`) to ensure platform security and authenticity.
* **Citizen Profiles & Authentication:** Allow users to log in, track their own reported issues, and earn civic points for community contributions.
* **Automated GPS Routing:** Automatically route reported issues to the correct municipal ward or specific department based on precise geolocation data.
* **Real-time Notifications:** Email, SMS, or in-app alerts to users whenever the status of their reported issue changes (e.g., "In Progress" to "Resolved").
* **Public Upvoting System:** Allow community members to upvote severe issues in their area to prioritize municipal action.
* **Mobile Application:** Porting the platform to React Native or Flutter to provide native Android and iOS experiences.


# Local Development Setup :-

--> 1. Clone the Repository
```bash
git clone [https://github.com/your-username/Nagrik-Civic-Reporter.git](https://github.com/your-username/Nagrik-Civic-Reporter.git)
cd Nagrik-Civic-Reporter
```

--> 2. Backend Setup :-
    cd backend, 
    python -m venv .venv, 
    source .venv/bin/activate (# On Windows use: .venv\Scripts\activate), 
    pip install -r requirements.txt
    
  Create a .env file inside the backend folder:
    DB_HOST=your_tidb_host, 
    DB_USER=your_tidb_user, 
    DB_PASSWORD=your_tidb_password, 
    DB_NAME=your_tidb_database, 
    DB_PORT=4000, 
    GEMINI_API_KEY=your_gemini_api_key, 
    JWT_SECRET=your_jwt_secret  
    
  Run the backend server: 
    uvicorn main:app --reload --port 8000,

--> 3. Frontend Setup :-
    cd frontend, 
    npm install

  Create a .env file inside the frontend folder:
    VITE_API_URL=http://localhost:8000

  Run the frontend development server:
    npm run dev

# Live Deployment :-

  Frontend: Hosted on Vercel, 
  Backend: Hosted on Render, 
  Database: TiDB Serverless Cloud 
  
