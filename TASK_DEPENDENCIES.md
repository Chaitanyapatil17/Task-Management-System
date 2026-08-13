# Task Dependencies Feature

## Overview

Task Dependencies allow admins to create prerequisite relationships between tasks. A task cannot be moved to "In Progress" or "Done" status if its prerequisite tasks are not completed. This ensures proper task sequencing and workflow management.

## Features

### 1. Add Prerequisites to Task
- **Endpoint**: `POST /api/tasks/:id/prerequisites`
- **Auth**: JWT + Admin only
- **Body**: `{ "prerequisiteIds": ["task_id_1", "task_id_2", ...] }`
- **Validation**:
  - Checks if all prerequisite tasks exist
  - Prevents self-dependency (task cannot depend on itself)
  - Detects circular dependencies (prevents Task A → B → A cycles)
  - Prevents duplicate prerequisites
- **Response**: Returns updated task with populated prerequisites

### 2. Remove Prerequisite from Task
- **Endpoint**: `DELETE /api/tasks/:id/prerequisites/:prerequisiteId`
- **Auth**: JWT + Admin only
- **Response**: Returns updated task with prerequisites removed

### 3. Status Validation
- **Rule**: Tasks can only move to "In Progress" or "Done" if all prerequisites are "Done"
- **Status Change Attempt**: When user tries to change status, backend validates:
  - If status is "Pending" → always allowed
  - If status is "In Progress" or "Done" → checks if all prerequisites are completed
- **Error Response**: Returns 400 with list of incomplete prerequisites blocking the status change
- **User Experience**: Frontend displays error message with incomplete task details

### 4. View Dependencies
- **Task Detail Page**: Shows prerequisites section with:
  - Prerequisite task title
  - Current status (with color coding: green=Done, amber=In Progress, indigo=Pending)
  - Assigned user name
  - Due date
  - Visual indicator for completion (green background for Done tasks)
  - Link to prerequisite task details

### 5. Manage Dependencies
- **Admin Create Task Page**: New prerequisites section allowing:
  - Dropdown to select available prerequisite tasks
  - Display of selected prerequisites with ability to remove
  - Prerequisites added after task creation via API
  - Real-time filtering (completed tasks shown separately)

## Data Model

### Task Model Update

```javascript
// New field in Task schema
prerequisites: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
  },
]
```

## API Endpoints

### Add Prerequisites
```bash
POST /api/tasks/:id/prerequisites
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "prerequisiteIds": ["task_id_1", "task_id_2"]
}

Response 200:
{
  "success": true,
  "message": "Prerequisites added successfully",
  "data": {
    "_id": "task_id",
    "title": "Task Title",
    "prerequisites": [
      {
        "_id": "prereq_id",
        "title": "Prerequisite Task",
        "status": "In Progress",
        "priority": "High",
        "dueDate": "2026-08-20",
        "assignedTo": {
          "_id": "user_id",
          "name": "John Doe",
          "email": "john@example.com"
        }
      }
    ]
  }
}
```

### Update Task Status (with dependency validation)
```bash
PUT /api/tasks/:id
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

{
  "status": "In Progress",
  "title": "Task Title",
  "description": "...",
  "priority": "High"
}

Response 400 (if prerequisites incomplete):
{
  "success": false,
  "message": "Cannot change status to \"In Progress\" - 2 prerequisite task(s) must be completed first",
  "incompletePrerequisites": [
    {
      "id": "prereq_id_1",
      "title": "Setup Database",
      "status": "Pending"
    },
    {
      "id": "prereq_id_2",
      "title": "Configure API",
      "status": "In Progress"
    }
  ]
}
```

### Remove Prerequisite
```bash
DELETE /api/tasks/:id/prerequisites/:prerequisiteId
Authorization: Bearer <jwt_token>

Response 200:
{
  "success": true,
  "message": "Prerequisite removed successfully",
  "data": { ... }
}
```

## Circular Dependency Prevention

### Algorithm
The system detects circular dependencies using a depth-first traversal:

1. When admin attempts to add prerequisites to Task A
2. For each prerequisite B being added:
   - Start from B and traverse its prerequisites
   - Check if Task A appears anywhere in the dependency chain
   - If found, reject with error message

### Example Prevention
```
Scenario: Task A → Task B → Task C (exists)
Attempt: Add Task C as prerequisite to Task A
Result: Rejected - "Adding this prerequisite would create a circular dependency"
```

## User Experience

### Admin Workflow

**Creating a Task with Prerequisites:**
1. Go to Admin → Manage Tasks → "Assign Task"
2. Fill in task details (title, description, priority, etc.)
3. Select "Assign To" user
4. In "Prerequisites" section, click dropdown: "+ Add prerequisite task"
5. Select one or more prerequisite tasks
6. Selected prerequisites shown with remove (✕) buttons
7. Click "Assign Task"
8. Task created and prerequisites linked automatically

### User Workflow

**Viewing Task Details:**
1. Click on task to view details
2. Right panel shows task metadata
3. If prerequisites exist, "Prerequisites" section displays:
   - Each prerequisite task card
   - Status badge (color-coded)
   - Assigned user
   - Due date
4. Can click on prerequisite to view its details

**Attempting Status Change with Incomplete Prerequisites:**
1. User tries to move task to "In Progress"
2. Frontend receives error: "Cannot change status - X prerequisite(s) must be completed"
3. Error shows list of incomplete prerequisites with their current status
4. User must complete prerequisites first before retrying

## Security & Validation

### Admin-Only Operations
- Adding prerequisites: `protect` + `adminOnly` middleware
- Removing prerequisites: `protect` + `adminOnly` middleware
- Creating tasks: `protect` middleware (admins assign, users create for self)

### Input Validation
- Prerequisites must exist in database
- Cannot create self-dependencies
- Cannot create circular dependencies
- Cannot duplicate prerequisites
- Status changes validated before database update

### Error Handling
- Task not found: 404
- Circular dependency detected: 400
- Insufficient permissions: 403
- Invalid prerequisites: 400

## Database Performance

### Optimizations
- Prerequisites populated on demand in `getTaskById`
- Selective field projection (only needed fields populated)
- Nested population for assignedTo user details
- No additional database queries for status validation (done in memory)

### Indexes (Recommended)
```javascript
// Add to Task schema if high volume:
db.tasks.createIndex({ prerequisites: 1 })
db.tasks.createIndex({ assignedTo: 1, status: 1 })
```

## Testing Scenarios

### Test 1: Add Valid Prerequisites
- Create Task A, Task B, Task C
- Add B and C as prerequisites to A
- Verify A.prerequisites = [B._id, C._id]
- ✓ Should succeed

### Test 2: Prevent Self-Dependency
- Attempt to add Task A as prerequisite to itself
- ✓ Should return 400 error

### Test 3: Circular Dependency Detection
- Task A → Task B (exists)
- Task B → Task C (exists)
- Attempt: Add Task A as prerequisite to Task C
- ✓ Should detect cycle and reject

### Test 4: Block Status Change
- Task A has Task B as prerequisite
- Task B status = "Pending"
- Attempt to move Task A to "In Progress"
- ✓ Should return 400 with incomplete prerequisites list

### Test 5: Allow Status Change
- Task A has Task B as prerequisite
- Task B status = "Done"
- Attempt to move Task A to "In Progress"
- ✓ Should succeed

### Test 6: View Prerequisites
- Task A has prerequisites
- GET /api/tasks/:id
- ✓ Should return task with populated prerequisites

### Test 7: Remove Prerequisites
- DELETE /api/tasks/:id/prerequisites/:prereqId
- ✓ Should remove and return updated task

## Limitations & Future Enhancements

### Current Limitations
- Maximum prerequisites: No hardcoded limit (MongoDB array limit: 16MB)
- Circular check runs synchronously (minor performance impact on large chains)
- No prerequisite grouping (all must be completed, no "any of" option)

### Future Enhancements
- Dependency visualization graph
- Prerequisite groups (complete all vs. complete any)
- Async circular dependency checking
- Batch prerequisite operations
- Dependency analytics (most depended-upon tasks)
- Prerequisite notifications (when prereq is completed)

## Integration with Existing Features

### Preserved Functionality
✓ JWT authentication unchanged  
✓ Admin/User role-based access intact  
✓ Task comments and activity logs continue to work  
✓ Email notifications for task assignment/completion  
✓ File attachments (Cloudinary)  
✓ Task analytics and dashboard stats  
✓ User dashboard statistics  

### Compatible With
✓ Status tracking (Pending → In Progress → Done)  
✓ Priority levels (Low, Medium, High, Critical)  
✓ Due dates  
✓ Task search and filtering  
✓ Admin analytics  

## Troubleshooting

### Error: "Cannot change status to 'In Progress' - prerequisites incomplete"
- **Solution**: Complete all prerequisite tasks first by moving them to "Done" status

### Error: "Circular dependency detected"
- **Solution**: Review the dependency chain. A → B → C → ? (cannot add A back to C)

### Prerequisite not showing in dropdown
- **Solution**: Task may already be selected as prerequisite or doesn't exist. Refresh page.

### Changes not reflecting in task detail
- **Solution**: Hard refresh browser (Ctrl+Shift+R) to clear cache

## Support

For issues or questions regarding Task Dependencies:
1. Check this documentation
2. Review test scenarios
3. Check backend logs for error details
4. Verify JWT token validity
5. Ensure user has admin role for dependency operations
