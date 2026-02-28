# Saved Interviews Implementation

## Overview

This implementation provides a complete solution for saving, managing, and persisting user interviews in the Naild application. The solution follows industry-standard patterns and integrates seamlessly with your existing architecture.

## Architecture

### Backend Components

#### 1. Persistence Service (Spring Boot + MySQL, separate service)
- Interview persistence and authentication live in the Spring Boot API (`http://localhost:8080/api/v1`)
- This repository contains the Next.js app and FastAPI AI service, which integrate with that Spring API
- Interview data is persisted server-side; frontend also includes fallback behavior when the Spring API is unavailable

#### 2. Spring Boot API Endpoints
- `GET /api/v1/interviews` - Get user's interviews
- `GET /api/v1/interviews/{id}` - Get specific interview
- `POST /api/v1/interviews` - Create new interview
- `PUT /api/v1/interviews/{id}/messages` - Update interview messages
- `PUT /api/v1/interviews/{id}/current_question_index` - Persist interview progress
- `PUT /api/v1/interviews/{id}/status` - Update interview status
- `PUT /api/v1/interviews/{id}/grading` - Save grading results
- `DELETE /api/v1/interviews/{id}` - Delete interview

#### 3. FastAPI Integration
- FastAPI runs on `http://localhost:8081` and provides AI endpoints (`/transcription`, `/generate_questions`, `/interview_ack`, `/grade_interview`)
- `POST /grade_interview` optionally forwards grading to Spring Boot when `interview_id` is provided
- Interview status/progress updates are sent directly from the frontend to Spring Boot (`/status`, `/current_question_index`)

### Frontend Components

#### 1. Interview Service (`src/app/services/interviewService.ts`)
- Centralized API communication
- Type-safe request/response handling
- Error handling and fallback mechanisms

#### 2. Enhanced Sidebar (`src/app/components/Sidebar.tsx`)
- Loading states for better UX
- Delete functionality with confirmation
- Status indicators (Completed/In Progress)
- Hover effects and smooth transitions

#### 3. Updated Interview Page (`src/app/interview/page.tsx`)
- Automatic loading of saved interviews
- Real-time persistence of interview progress
- Graceful fallback to in-memory storage
- Error handling for network issues

## Key Features

### 1. Automatic Interview Persistence
- Interviews are saved immediately upon creation
- Real-time message updates during conversation
- Automatic status updates (active → completed)

### 2. Resume Functionality
- Users can pick up interviews where they left off
- All conversation history is preserved
- Question progress is maintained

### 3. Grading Integration
- Grading results are automatically saved
- Interview status updates to "completed"
- Results are displayed with detailed feedback

### 4. Interview Management
- Delete interviews from sidebar
- View interview status and progress
- Clean, intuitive interface

## Database Schema

```sql
CREATE TABLE interviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    languages JSON,
    difficulty VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    questions JSON,
    messages JSON,
    current_question_index INT,
    grading_result JSON,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## API Response Format

### Interview Object
```json
{
  "id": 1,
  "title": "Frontend Developer Interview",
  "role": "Frontend Developer",
  "languages": "[\"JavaScript\", \"React\"]",
  "difficulty": "mid",
  "status": "active",
  "questions": "[\"Question 1\", \"Question 2\"]",
  "messages": "[{\"id\": \"1\", \"role\": \"interviewer\", \"content\": \"Hello\"}]",
  "currentQuestionIndex": 0,
  "gradingResult": null,
  "createdAt": "2024-01-01T10:00:00",
  "updatedAt": "2024-01-01T10:30:00"
}
```

## Implementation Steps

### 1. Database Setup
The MySQL database will automatically create the `interviews` table when you start the Spring Boot application (Hibernate auto-ddl).

### 2. Backend Deployment
1. Start your Spring Boot application (port 8080)
2. Start your FastAPI application (port 8081)
3. Ensure MySQL is running and accessible

### 3. Frontend Integration
The frontend automatically integrates with the new APIs. No additional setup required.

## Error Handling

### Network Failures
- Graceful fallback to in-memory storage
- User-friendly error messages
- Automatic retry mechanisms

### Database Issues
- Proper exception handling in Spring Boot
- Meaningful error responses
- Logging for debugging

## Security Considerations

### Authentication
- All endpoints require valid JWT tokens
- User-specific data isolation
- Secure cookie-based authentication

### Data Validation
- Input validation on all endpoints
- SQL injection prevention via JPA
- XSS protection through proper encoding

## Performance Optimizations

### Database
- Indexed foreign keys for fast queries
- JSON fields for flexible data storage
- Efficient query patterns

### Frontend
- Lazy loading of interview data
- Optimistic UI updates
- Debounced API calls

## Future Enhancements

### 1. Interview Analytics
- Track completion rates
- Performance metrics
- User engagement analytics

### 2. Advanced Features
- Interview templates
- Custom question sets
- Collaborative interviews

### 3. Mobile Support
- Responsive design
- Progressive Web App features
- Offline capabilities

## Testing

### Backend Testing
```bash
# Test interview creation
curl -X POST http://localhost:8080/api/v1/interviews \
  -H "Content-Type: application/json" \
  -H "Cookie: token=your-jwt-token" \
  -d '{"title":"Test Interview","role":"Developer","languages":["JavaScript"],"difficulty":"mid","questions":["Question 1"]}'
```

### Frontend Testing
- Test interview creation flow
- Verify persistence across page reloads
- Test delete functionality
- Validate grading result display

## Monitoring

### Key Metrics
- Interview creation rate
- Completion rate
- Average interview duration
- Error rates

### Logging
- API request/response logging
- Error tracking
- Performance monitoring

## Deployment Notes

### Environment Variables
- Database connection strings
- JWT secret keys
- API endpoints

### Database Migration
- Automatic schema creation
- Data migration scripts (if needed)
- Backup strategies

This implementation provides a robust, scalable solution for interview persistence that follows industry best practices and integrates seamlessly with your existing architecture. 
