const express = require('express');
const { v4: uuidv4 } = require('uuid');
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Priority enum
const Priority = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

// Batch status enum
const BatchStatus = {
  YET_TO_START: 'yet_to_start',
  TRIGGERED: 'triggered',
  COMPLETED: 'completed'
};

// Job status enum
const JobStatus = {
  YET_TO_START: 'yet_to_start',
  TRIGGERED: 'triggered',
  COMPLETED: 'completed'
};

// Function to calculate job status from batch statuses
const calculateJobStatus = (batchStatuses) => {
  if (batchStatuses.every(status => status === BatchStatus.COMPLETED)) {
    return JobStatus.COMPLETED;
  }
  if (batchStatuses.some(status => status === BatchStatus.TRIGGERED)) {
    return JobStatus.TRIGGERED;
  }
  return JobStatus.YET_TO_START;
};

// Job queue implementation
let jobQueue = [];
const processingIds = new Set();
const priorityMap = {
  [Priority.HIGH]: 0,
  [Priority.MEDIUM]: 1,
  [Priority.LOW]: 2
};

// Job tracking by ingestion_id
const jobTracking = new Map();

// Rate limiting
const BATCH_SIZE = 3;
const BATCH_INTERVAL = 5000; // 5 seconds
let lastBatchTime = 0;

// Mock API response
const mockApiResponse = (id) => ({
  id,
  data: 'processed'
});

// Process a single ID
const processId = async (id) => {
  console.log(`Processing ID: ${id}`);
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  return mockApiResponse(id);
};

// Process a batch of IDs
const processBatch = async (batch) => {
  try {
    const results = await Promise.all(batch.map(processId));
    console.log(`Batch processed: ${batch.join(', ')}`);
    
    // Update job tracking
    const batchId = uuidv4();
    batch.forEach(id => {
      const job = jobQueue.find(j => j.ids.includes(id));
      if (job) {
        const jobId = job.ingestionId;
        const tracking = jobTracking.get(jobId) || {
          ingestionId: jobId,
          status: JobStatus.TRIGGERED,
          batches: []
        };
        
        // Find or create batch entry
        let batchEntry = tracking.batches.find(b => b.ids.includes(id));
        if (!batchEntry) {
          batchEntry = {
            batchId,
            ids: batch,
            status: BatchStatus.COMPLETED
          };
          tracking.batches.push(batchEntry);
        } else {
          batchEntry.status = BatchStatus.COMPLETED;
        }
        
        // Update overall job status
        const batchStatuses = tracking.batches.map(b => b.status);
        tracking.status = calculateJobStatus(batchStatuses);
        
        jobTracking.set(jobId, tracking);
      }
    });
    
    results.forEach(result => {
      processingIds.delete(result.id);
    });
  } catch (error) {
    console.error('Error processing batch:', error);
  }
};

// Start processing jobs
const startProcessing = () => {
  const processNextBatch = async () => {
    // Remove completed jobs from queue
    jobQueue.sort((a, b) => {
      // Compare by priority first
      const priorityDiff = priorityMap[a.priority] - priorityMap[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      // If same priority, compare by creation time
      return a.createdAt - b.createdAt;
    });

    // Find next batch to process
    const nextBatch = [];
    for (let i = 0; i < jobQueue.length; i++) {
      const job = jobQueue[i];
      for (const id of job.ids) {
        if (processingIds.size < BATCH_SIZE && !processingIds.has(id)) {
          nextBatch.push(id);
          processingIds.add(id);
          if (nextBatch.length === BATCH_SIZE) {
            break;
          }
        }
      }
      if (nextBatch.length === BATCH_SIZE) break;
    }

    if (nextBatch.length > 0) {
      // Update job tracking for triggered batch
      const jobId = jobQueue.find(j => j.ids.some(id => nextBatch.includes(id))).ingestionId;
      const tracking = jobTracking.get(jobId) || {
        ingestionId: jobId,
        status: JobStatus.TRIGGERED,
        batches: []
      };
      
      // Create batch entry if it doesn't exist
      const batchEntry = {
        batchId: uuidv4(),
        ids: nextBatch,
        status: BatchStatus.TRIGGERED
      };
      
      // Check if batch already exists
      let existingBatch = tracking.batches.find(b => 
        b.ids.length === nextBatch.length && 
        b.ids.every(id => nextBatch.includes(id))
      );
      
      if (!existingBatch) {
        tracking.batches.push(batchEntry);
      }
      
      // Update overall job status
      const batchStatuses = tracking.batches.map(b => b.status);
      tracking.status = calculateJobStatus(batchStatuses);
      
      jobTracking.set(jobId, tracking);
      
      await processBatch(nextBatch);
    }

    // Remove completed jobs from queue
    jobQueue = jobQueue.filter(job => job.ids.some(id => processingIds.has(id)));

    // Schedule next batch
    const now = Date.now();
    const timeSinceLastBatch = now - lastBatchTime;
    const waitTime = Math.max(0, BATCH_INTERVAL - timeSinceLastBatch);
    lastBatchTime = now;
    setTimeout(processNextBatch, waitTime);
  };

  processNextBatch();
};

// Ingestion endpoint
app.post('/ingest', (req, res) => {
  const { ids, priority } = req.body;

  // Validate input
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'number' || id < 1 || id > 10**9 + 7)) {
    return res.status(400).json({ error: 'Invalid ids array' });
  }
  if (!Object.values(Priority).includes(priority)) {
    return res.status(400).json({ error: 'Invalid priority' });
  }

  // Generate unique ingestion ID
  const ingestionId = uuidv4();

  // Add job to queue
  jobQueue.push({
    ingestionId,
    ids,
    priority,
    createdAt: Date.now()
  });

  // Initialize tracking
  jobTracking.set(ingestionId, {
    ingestionId,
    status: JobStatus.YET_TO_START,
    batches: []
  });

  // Start processing if not already started
  if (!processingIds.size) {
    startProcessing();
  }

  res.json({ ingestion_id: ingestionId });
});

// Status endpoint
app.get('/status/:ingestionId', (req, res) => {
  const { ingestionId } = req.params;
  const tracking = jobTracking.get(ingestionId);

  if (!tracking) {
    return res.status(404).json({ error: 'Ingestion ID not found' });
  }

  // Sort batches by batchId (timestamp)
  tracking.batches.sort((a, b) => a.batchId.localeCompare(b.batchId));

  res.json({
    ingestion_id: tracking.ingestionId,
    status: tracking.status,
    batches: tracking.batches
  });
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    queue_size: jobQueue.length,
    processing_count: processingIds.size
  });
});

// Start server
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
