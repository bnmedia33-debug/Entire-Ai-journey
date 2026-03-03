# AI Tutor Chatbot for Students - Project Documentation

## 1. Abstract
The "AI Tutor Chatbot for Students" is an intelligent academic support system designed to provide personalized, 24/7 tutoring to students. By leveraging Large Language Models (LLMs) and Retrieval-Augmented Generation (RAG), the system offers step-by-step explanations for complex problems across various subjects like Programming, Mathematics, and Science. The project aims to bridge the gap between classroom learning and independent study by providing an interactive, conversational interface for academic queries.

## 2. Introduction
In the modern educational landscape, students often require immediate assistance outside of classroom hours. Traditional tutoring can be expensive or inaccessible. This project introduces a web-based AI Chatbot that acts as a virtual tutor. It uses advanced Natural Language Processing (NLP) to understand student queries and provide context-aware, accurate responses.

## 3. Problem Statement
Students face several challenges in their academic journey:
- Lack of immediate help during self-study.
- Difficulty in understanding complex, multi-step solutions.
- Inconsistent quality of information found on the internet.
- High cost of private tutoring.

## 4. Solution Explanation
The proposed solution is a full-stack web application featuring:
- **User Authentication**: Secure registration and login for students.
- **Subject-Specific Support**: Tailored AI responses based on the chosen subject.
- **RAG Integration**: A local knowledge base that provides factual context to the AI, ensuring higher accuracy.
- **Chat History**: Persistent storage of previous conversations for review.
- **Modern UI**: A clean, responsive interface built with React and Tailwind CSS.

## 5. System Architecture
The system follows a classic Client-Server architecture:
- **Frontend**: React.js for the user interface, utilizing Lucide-React for icons and Motion for animations.
- **Backend**: Node.js with Express.js handling API requests, authentication, and AI integration.
- **Database**: SQLite (via `better-sqlite3`) for storing user data, chat history, and the RAG knowledge base.
- **AI Engine**: Google Gemini API (via `@google/genai`) for generating intelligent, conversational responses.

## 6. Modules Description
- **Auth Module**: Handles user registration, password hashing (Bcrypt), and session management (JWT).
- **Chat Module**: Manages the real-time conversation between the student and the AI.
- **RAG Module**: Searches the local database for relevant "textbook" snippets to ground the AI's responses.
- **History Module**: Retrieves and displays past interactions for each user.

## 7. Advantages and Limitations
### Advantages:
- **24/7 Availability**: Students can learn at any time.
- **Personalized Pace**: Students can ask follow-up questions until they understand.
- **Cost-Effective**: Scalable solution with minimal per-user cost.
- **Context-Aware**: RAG ensures the AI stays within the scope of the curriculum.

### Limitations:
- **Internet Dependency**: Requires an active connection to access the AI API.
- **Knowledge Base Scope**: The RAG system is only as good as the data provided in the `knowledge_base` table.
- **AI Hallucinations**: While minimized by RAG, the AI may still occasionally provide incorrect information.

## 8. Future Scope
- **Voice Integration**: Allowing students to ask questions via voice commands.
- **Image Recognition**: Enabling students to upload photos of handwritten problems.
- **Admin Dashboard**: A comprehensive panel for teachers to monitor student progress and update the knowledge base.
- **Multi-Language Support**: Tutoring in regional languages.

## 9. Conclusion
The AI Tutor Chatbot represents a significant step forward in educational technology. By combining the reasoning capabilities of LLMs with the factual grounding of RAG, it provides a reliable and accessible tool for students to enhance their learning experience.

---

## Setup Instructions (Local Run)

1. **Clone the project** and ensure Node.js is installed.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment**:
   - Create a `.env` file based on `.env.example`.
   - Add your `GEMINI_API_KEY` (Get one from [Google AI Studio](https://aistudio.google.com/)).
   - Set a `JWT_SECRET` for security.
4. **Run the Application**:
   ```bash
   npm run dev
   ```
5. **Access the App**: Open `http://localhost:3000` in your browser.

*Note: This project uses SQLite for ease of setup. The database file `tutor.db` will be created automatically on the first run.*
