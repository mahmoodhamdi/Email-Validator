/**
 * @jest-environment node
 */
import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  test('should return healthy status', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
  });

  test('should include version', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.version).toBe('1.0.0');
  });

  test('should include timestamp', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.timestamp).toBeDefined();
    expect(new Date(data.timestamp).getTime()).not.toBeNaN();
  });

  test('should include endpoints list', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.endpoints).toBeDefined();
    expect(data.endpoints.validate).toBe('POST /api/validate');
    expect(data.endpoints.validateBulk).toBe('POST /api/validate-bulk');
    expect(data.endpoints.health).toBe('GET /api/health');
  });
});
