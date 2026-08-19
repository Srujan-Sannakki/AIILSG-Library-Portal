# AIILSG Library Portal

A simple library management portal developed during my **Rural Internship at the All India Institute of Local Self-Government (AIILSG)**.

The project provides a web-based platform for managing and accessing library resources such as books and PDF documents.

## Features

- Browse library resources
- Search and view books
- Upload and access PDF documents
- Admin-side resource management
- Authentication support
- Cloudinary support for file storage
- Responsive interface
- MongoDB database integration

## Tech Stack

**Frontend**
- React
- Vite
- CSS / Tailwind CSS
- Axios

**Backend**
- Node.js
- Express.js
- MongoDB
- Mongoose

**Other**
- JWT
- bcrypt
- Multer
- Cloudinary

## Project Structure

```text
AIILSG-Library-Portal/
│
├── public/
├── src/                 # React frontend
│
├── server/              # Express backend
│   ├── server.js
│   └── uploads/
│
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## Getting Started

### Prerequisites

Ensure the following dependencies are installed on the local development environment:
*   Node.js (v18 or higher recommended)
*   npm, yarn, or pnpm package manager
*   Git

### Installation Steps

1. **Clone the repository:**
```bash
git clone https://github.com/Srujan-Sannakki/AIILSG-Library-Portal.git
cd AIILSG-Library-Portal
```

2. **Install core dependencies:**
```bash
npm install
```

3. **Configure Environment Variables:**
Create a .env file inside the server folder and add the required configuration for MongoDB, JWT, and Cloudinary.
Example:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
4. **Start the backend:**
```bash
cd server
node server.js
```

5. **Start the frontend:**
Open another terminal from the project root:
```bash
npm run dev
```
The frontend will normally be available at:
http://localhost:5173

## Project Status
This project is currently under development.

The current version focuses on the core library portal, resource management, PDF uploads, and frontend-backend integration.

More features can be added as the project develops.

## Future Improvements

Some features that can be added in future versions include:

* Book issue and return system
* Student borrowing history
* Better search and filtering
* Admin dashboard improvements
* Email notifications
* Book reservation
* Library analytics
* Improved role-based access
* More advanced document management

## Project Context

This project was developed as part of my Rural Internship at the All India Institute of Local Self-Government (AIILSG).

## Author
**S Srujan**

Developed during Rural Internship at
**All India Institute of Local Self-Government (AIILSG)**