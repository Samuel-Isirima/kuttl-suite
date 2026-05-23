# Website Snapshot API Documentation

## Overview

The Website Snapshot API provides a comprehensive backend for managing website state serialization and AI embeddings. This system enables context-aware website customization by capturing complete website snapshots and generating embeddings for intelligent AI processing.

## Architecture

```
Frontend (InterceptJS) 
    ↓ HTTP API
Backend API Server
    ↓ Async Processing
Embedding Pipeline
    ↓ Storage  
PostgreSQL + Vector Storage
```

## Core Components

### 1. Website Snapshots

Complete serialization of website state including:
- **Components**: DOM tree with visual state, relationships, and interactions
- **Styles**: CSS rules, design tokens, and computed styles  
- **Layout**: Container structures, responsive breakpoints, positioning
- **Customizations**: User patches, modification history, AI-generated changes
- **Metadata**: Performance metrics, browser info, capture metadata

### 2. Embedding Pipeline

AI-powered context generation:
- **Full Snapshot Embeddings**: Complete website understanding
- **Component Embeddings**: Individual element context
- **Style Embeddings**: Design system patterns
- **Layout Embeddings**: Structural relationships

### 3. Asynchronous Processing

Background embedding generation:
- Snapshots processed immediately
- Embeddings generated asynchronously  
- Status available via HTTP endpoints
- No real-time sync needed

---

## API Endpoints

### Authentication

All endpoints require authentication via JWT token:
```http
Authorization: Bearer <jwt_token>
```

### Snapshots

#### Create Snapshot
```http
POST /api/v1/snapshots
Content-Type: application/json

{
  "website_id": "example.com",
  "session_id": "session-123",
  "version": "v1.2.3",
  "components": [...],
  "styles": {...},
  "layout": {...},
  "customizations": {...},
  "metadata": {...}
}
```

Response:
```json
{
  "id": "uuid",
  "website_id": "example.com",
  "version": "v1.2.3", 
  "created_at": "2024-01-01T12:00:00Z"
}
```

#### Get Snapshot
```http
GET /api/v1/snapshots/{id}
```

#### List Snapshots
```http
GET /api/v1/snapshots?website_id=example.com&limit=20&offset=0
```

#### Delete Snapshot  
```http
DELETE /api/v1/snapshots/{id}
```

#### Get Statistics
```http
GET /api/v1/snapshots/stats?website_id=example.com
```

### Diffs

#### Create Diff
```http
POST /api/v1/snapshots/diffs

{
  "from_snapshot": "uuid1",
  "to_snapshot": "uuid2", 
  "components": {...},
  "styles": {...},
  "layout": {...},
  "customizations": {...}
}
```

#### Get Diff
```http
GET /api/v1/snapshots/diffs/{id}
```

#### List Diffs
```http
GET /api/v1/snapshots/diffs?website_id=example.com
```

### Embeddings

#### Search Similar Components
```http
POST /api/v1/snapshots/search

{
  "website_id": "example.com",
  "query": "red buttons with rounded corners",
  "limit": 10
}
```

Response:
```json
{
  "query": "red buttons with rounded corners",
  "results": [
    {
      "id": "uuid",
      "snapshot_id": "uuid", 
      "target_id": "component-uid",
      "vector_type": "component",
      "content": "Button element with red background...",
      "metadata": {
        "component_type": "button",
        "semantic_role": "button",
        "has_customizations": true,
        "interaction_level": "interactive"
      },
      "created_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

#### Get Snapshot Embeddings
```http
GET /api/v1/snapshots/{id}/embeddings
```

Response:
```json
{
  "snapshot_id": "uuid",
  "status": "completed",
  "embeddings": [
    {
      "id": "uuid",
      "vector_type": "component",
      "target_id": "component-uid",
      "dimensions": 1536,
      "model": "text-embedding-3-small",
      "token_count": 245,
      "metadata": {...},
      "created_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Context

#### Get Website Context
```http
GET /api/v1/snapshots/context?website_id=example.com
```

Response:
```json
{
  "website_id": "example.com",
  "user_id": "uuid",
  "latest_snapshot": {
    "id": "uuid",
    "version": "v1.2.3", 
    "created_at": "2024-01-01T12:00:00Z",
    "component_count": 42,
    "patch_count": 5
  },
  "totals": {
    "components": 200,
    "customizations": 25,
    "snapshots": 10
  },
  "generated_at": "2024-01-01T12:00:00Z"
}
```

---

## Frontend Integration

### JavaScript Client Example

```javascript
import { init, createSnapshot, createDiff } from 'interceptjs';

// Initialize InterceptJS with serialization
const intercept = init({
  root: document.body,
  debug: true,
  uidAttribute: 'data-uid',
  descriptionAttribute: 'data-description'
});

// Create snapshot
async function createAndSyncSnapshot() {
  // Create local snapshot
  const localSnapshot = intercept.createSnapshot(
    'my-website.com',
    'user-123',
    'session-456'  
  );

  // Send to backend
  try {
    const response = await fetch('/api/v1/snapshots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        website_id: localSnapshot.metadata.website_id,
        session_id: localSnapshot.metadata.session_id,
        version: localSnapshot.metadata.version,
        components: localSnapshot.components,
        styles: localSnapshot.styles,
        layout: localSnapshot.layout,
        customizations: localSnapshot.customizations,
        metadata: localSnapshot.metadata
      })
    });

    const result = await response.json();
    console.log('Snapshot created:', result);
    
    return result;
  } catch (error) {
    console.error('Failed to create snapshot:', error);
  }
}

// Check embedding status if needed
async function checkEmbeddingStatus(snapshotId) {
  try {
    const response = await fetch(`/api/v1/snapshots/${snapshotId}/embeddings`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const result = await response.json();
    console.log('Embedding status:', result.status);
    
    if (result.status === 'completed') {
      console.log('Embeddings ready:', result.embeddings);
      // Enable AI-powered features
    } else {
      console.log('Embeddings still processing...');
      // Optionally check again later
    }
    
    return result;
  } catch (error) {
    console.error('Failed to check embedding status:', error);
  }
}

// AI-powered component search
async function searchSimilarComponents(query) {
  try {
    const response = await fetch('/api/v1/snapshots/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        website_id: 'my-website.com',
        query: query,
        limit: 5
      })
    });

    const results = await response.json();
    console.log('Similar components found:', results);
    return results;
  } catch (error) {
    console.error('Search failed:', error);
  }
}

// Example usage
async function handleSnapshotCreation() {
  // 1. Create snapshot
  const snapshot = await createAndSyncSnapshot();
  
  // 2. Optionally check embedding status later
  setTimeout(async () => {
    const embeddingStatus = await checkEmbeddingStatus(snapshot.id);
    if (embeddingStatus.status === 'completed') {
      // 3. Now you can use AI search
      const searchResults = await searchSimilarComponents('blue buttons with icons');
      searchResults.results.forEach(component => {
        console.log(`Found: ${component.content}`);
      });
    }
  }, 5000); // Check after 5 seconds
}
```

---

## Database Schema

### Key Tables

- `website_snapshots` - Complete snapshot storage
- `snapshot_diffs` - Incremental changes between snapshots
- `embedding_vectors` - AI-generated embeddings with metadata
- `website_contexts` - Cached context summaries
- `ai_processing_jobs` - Background processing queue

### Indexes

Optimized for common query patterns:
- Website + User lookups
- Timestamp-based ordering
- Vector similarity (when using pgvector)
- JSONB content queries

---

## Configuration

### Environment Variables

```bash
# AI Provider
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
EMBEDDING_MODEL=text-embedding-3-small

# Database  
DATABASE_URL=postgresql://user:pass@localhost/kuttl

# Server
PORT=8080
ALLOWED_ORIGINS=https://myapp.com

# Features
ENABLE_WEBSOCKETS=true
ENABLE_EMBEDDINGS=true
BACKGROUND_PROCESSING=true
```

### Performance Tuning

```bash
# Embedding Configuration
EMBEDDING_CHUNK_SIZE=1000
EMBEDDING_OVERLAP_SIZE=100
EMBEDDING_BATCH_SIZE=10
SIMILARITY_THRESHOLD=0.8

# Connection Limits
MAX_WEBSOCKET_CONNECTIONS=1000
MAX_SNAPSHOT_SIZE_MB=50
RATE_LIMIT_PER_MINUTE=60
```

---

## Production Deployment

### Requirements

- PostgreSQL 14+ with JSONB support
- Optional: pgvector extension for vector similarity
- Redis for session management (recommended)
- Load balancer for horizontal scaling

### Scaling Considerations

- **Horizontal Scaling**: Multiple API instances with shared database
- **Background Processing**: Queue system for embedding generation
- **Caching**: Redis cache for frequent context queries
- **Database Optimization**: Proper indexing for JSONB queries

### Monitoring

Key metrics to track:
- Snapshot creation rate and size
- Embedding processing time and success rate
- HTTP request latency and throughput
- Database query performance and storage growth
- AI API usage and costs

---

## Error Handling

### HTTP Error Codes

- `400` - Bad Request (invalid JSON, missing parameters)
- `401` - Unauthorized (missing/invalid auth token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (snapshot/diff not found)
- `413` - Payload Too Large (snapshot exceeds size limit)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error (database/processing errors)

### Retry Strategy

- HTTP requests: Exponential backoff for 5xx errors
- Embedding processing: Retry failed jobs with delay
- Background tasks: Dead letter queue for failed operations
- Database timeouts: Connection pooling and retry logic

---

## Security

### Authentication

- JWT tokens with user ID and permissions
- Token expiration and refresh handling
- API rate limiting per user/IP

### Data Privacy

- User data isolation by user_id
- Snapshot access control and ownership validation
- Optional data encryption at rest

### Input Validation

- JSON schema validation for all endpoints
- Sanitization of user-provided content
- Size limits on snapshots and requests

This efficient HTTP API enables powerful context-aware website customization with full AI understanding of website state, user modifications, and design patterns. The simplified architecture avoids real-time overhead while providing all necessary functionality through standard REST endpoints and asynchronous processing.