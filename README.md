# LoopAI Ingestion API

A RESTful API for processing batches of IDs with priority-based queuing and rate limiting.

## API Endpoints

### 1. Ingestion Endpoint

**POST /ingest**

Creates a new ingestion job with the provided IDs and priority.

**Request Body**
```json
{
  "ids": [1, 2, 3, 4, 5],
  "priority": "MEDIUM"
}
```

**Response**
```json
{
  "ingestion_id": "abc123"
}
```

### 2. Status Endpoint

**GET /status/:ingestion_id**

Retrieves the status of a specific ingestion job.

**Response**
```json
{
  "ingestion_id": "abc123",
  "status": "triggered",
  "batches": [
    {
      "batch_id": "123",
      "ids": [1, 2, 3],
      "status": "completed"
    }
  ]
}
```

## Features

- Priority-based processing (HIGH, MEDIUM, LOW)
- Rate limiting (3 IDs per 5 seconds)
- Batch processing (3 IDs per batch)
- Status tracking for each batch
- Asynchronous processing
- Unique ingestion IDs
- Input validation

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Run the server:
```bash
node index.js
```

3. Run tests:
```bash
npm test
```

## Error Handling

- 400 Bad Request: Invalid input (invalid IDs or priority)
- 404 Not Found: Invalid ingestion ID
- 500 Internal Server Error: Processing failures

## Testing

The project includes comprehensive tests for:
- Ingestion endpoint validation
- Status endpoint behavior
- Batch processing
- Priority handling
- Rate limiting

## Technology Stack

- Node.js
- Express
- UUID
- Jest (testing)
- Supertest (testing)
