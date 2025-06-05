const request = require('supertest');
const { v4: uuidv4 } = require('uuid');

// Mock processId function
jest.mock('../index.js', () => {
  const original = jest.requireActual('../index.js');
  const mockProcessId = jest.fn();
  return {
    ...original,
    processId: mockProcessId
  };
});

const app = require('../index.js');
const mockProcessId = app.processId;

let server;

beforeAll(() => {
  server = app.listen(0);
});

afterAll((done) => {
  server.close(done);
});

describe('Ingestion API', () => {
  let testIngestionId;

  beforeEach(() => {
    testIngestionId = uuidv4();
    mockProcessId.mockReset();
  });

  test('should create ingestion with valid IDs', async () => {
    const response = await request(server)
      .post('/ingest')
      .send({ ids: [1, 2, 3, 4, 5], priority: 'MEDIUM' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('ingestion_id');
    expect(typeof response.body.ingestion_id).toBe('string');
  });

  test('should return error for invalid IDs', async () => {
    const response = await request(server)
      .post('/ingest')
      .send({ ids: ['a', 'b', 'c'], priority: 'MEDIUM' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Invalid ids array');
  });

  test('should return error for invalid priority', async () => {
    const response = await request(server)
      .post('/ingest')
      .send({ ids: [1, 2, 3], priority: 'INVALID' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Invalid priority');
  });

  test('should process IDs asynchronously', async () => {
    const ids = [1, 2, 3, 4, 5];
    const response = await request(server)
      .post('/ingest')
      .send({ ids, priority: 'MEDIUM' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(mockProcessId).toHaveBeenCalledTimes(0); // Should be processed asynchronously
  });
});

describe('Status API', () => {
  let testIngestionId;

  beforeEach(() => {
    testIngestionId = uuidv4();
  });

  test('should return status for valid ingestion_id', async () => {
    // Create ingestion first
    const response = await request(server)
      .post('/ingest')
      .send({ ids: [1, 2, 3, 4, 5], priority: 'MEDIUM' })
      .set('Content-Type', 'application/json');

    const { ingestion_id } = response.body;

    // Check status
    const statusResponse = await request(server)
      .get(`/status/${ingestion_id}`);

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body).toHaveProperty('ingestion_id');
    expect(statusResponse.body).toHaveProperty('status');
    expect(statusResponse.body).toHaveProperty('batches');
    expect(Array.isArray(statusResponse.body.batches)).toBe(true);
  });

  test('should return error for invalid ingestion_id', async () => {
    const response = await request(server)
      .get(`/status/${testIngestionId}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Ingestion ID not found');
  });

  test('should show correct batch status progression', async () => {
    // Create ingestion
    const response = await request(server)
      .post('/ingest')
      .send({ ids: [1, 2, 3, 4, 5], priority: 'MEDIUM' })
      .set('Content-Type', 'application/json');

    const { ingestion_id } = response.body;

    // Check initial status (should be triggered)
    const statusResponse1 = await request(server)
      .get(`/status/${ingestion_id}`);

    expect(statusResponse1.body.status).toBe('triggered');

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check final status (should be completed)
    const statusResponse2 = await request(server)
      .get(`/status/${ingestion_id}`);

    expect(statusResponse2.body.status).toBe('completed');
  });
});

describe('Ingestion API', () => {
  let testIngestionId;

  beforeEach(() => {
    testIngestionId = uuidv4();
    mockProcessId.mockReset();
  });

  test('should create ingestion with valid IDs', async () => {
    const response = await request(app)
      .post('/ingest')
      .send({ ids: [1, 2, 3, 4, 5], priority: 'MEDIUM' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('ingestion_id');
    expect(typeof response.body.ingestion_id).toBe('string');
  });

  test('should return error for invalid IDs', async () => {
    const response = await request(app)
      .post('/ingest')
      .send({ ids: ['a', 'b', 'c'], priority: 'MEDIUM' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Invalid ids array');
  });

  test('should return error for invalid priority', async () => {
    const response = await request(app)
      .post('/ingest')
      .send({ ids: [1, 2, 3], priority: 'INVALID' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Invalid priority');
  });

  test('should process IDs asynchronously', async () => {
    const ids = [1, 2, 3, 4, 5];
    const response = await request(app)
      .post('/ingest')
      .send({ ids, priority: 'MEDIUM' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(mockProcessId).toHaveBeenCalledTimes(0); // Should be processed asynchronously
  });
});

describe('Status API', () => {
  let testIngestionId;

  beforeEach(() => {
    testIngestionId = uuidv4();
  });

  test('should return status for valid ingestion_id', async () => {
    // Create ingestion first
    const response = await request(app)
      .post('/ingest')
      .send({ ids: [1, 2, 3, 4, 5], priority: 'MEDIUM' })
      .set('Content-Type', 'application/json');

    const { ingestion_id } = response.body;

    // Check status
    const statusResponse = await request(app)
      .get(`/status/${ingestion_id}`);

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body).toHaveProperty('ingestion_id');
    expect(statusResponse.body).toHaveProperty('status');
    expect(statusResponse.body).toHaveProperty('batches');
    expect(Array.isArray(statusResponse.body.batches)).toBe(true);
  });

  test('should return error for invalid ingestion_id', async () => {
    const response = await request(app)
      .get(`/status/${testIngestionId}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Ingestion ID not found');
  });

  test('should show correct batch status progression', async () => {
    // Create ingestion
    const response = await request(app)
      .post('/ingest')
      .send({ ids: [1, 2, 3, 4, 5], priority: 'MEDIUM' })
      .set('Content-Type', 'application/json');

    const { ingestion_id } = response.body;

    // Check initial status (should be triggered)
    const statusResponse1 = await request(app)
      .get(`/status/${ingestion_id}`);

    expect(statusResponse1.body.status).toBe('triggered');

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check final status (should be completed)
    const statusResponse2 = await request(app)
      .get(`/status/${ingestion_id}`);

    expect(statusResponse2.body.status).toBe('completed');
  });
});
