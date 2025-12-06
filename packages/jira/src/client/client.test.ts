import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  JiraClient,
  createJiraClient,
  withApiVersion,
  withTimeout,
  withDebug,
  withRetry,
} from './client.js';
import { ApiTokenAuth } from '@felixgeelhaar/sdk-core';
import { ConfigValidationError } from '@felixgeelhaar/sdk-core';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('JiraClient', () => {
  const validConfig = {
    host: 'https://example.atlassian.net',
    auth: new ApiTokenAuth({
      email: 'test@example.com',
      apiToken: 'test-token',
    }),
  };

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('construction', () => {
    it('should create client with valid config', () => {
      const client = new JiraClient(validConfig);
      expect(client).toBeInstanceOf(JiraClient);
      expect(client.getHost()).toBe('https://example.atlassian.net');
    });

    it('should throw on invalid host', () => {
      expect(
        () =>
          new JiraClient({
            ...validConfig,
            host: 'not-a-url',
          })
      ).toThrow(ConfigValidationError);
    });

    it('should use default API version 3', () => {
      const client = new JiraClient(validConfig);
      expect(client.apiBasePath).toBe('/rest/api/3');
    });
  });

  describe('services', () => {
    it('should provide issues service', () => {
      const client = new JiraClient(validConfig);
      expect(client.issues).toBeDefined();
    });

    it('should provide projects service', () => {
      const client = new JiraClient(validConfig);
      expect(client.projects).toBeDefined();
    });

    it('should provide search service', () => {
      const client = new JiraClient(validConfig);
      expect(client.search).toBeDefined();
    });

    it('should provide users service', () => {
      const client = new JiraClient(validConfig);
      expect(client.users).toBeDefined();
    });

    it('should return same service instance on multiple accesses', () => {
      const client = new JiraClient(validConfig);
      const issues1 = client.issues;
      const issues2 = client.issues;
      expect(issues1).toBe(issues2);
    });
  });

  describe('functional options', () => {
    it('withApiVersion should set API version', () => {
      const client = new JiraClient(validConfig, withApiVersion('2'));
      expect(client.apiBasePath).toBe('/rest/api/2');
    });

    it('withTimeout should set timeout', () => {
      const client = new JiraClient(validConfig, withTimeout(60000));
      // We can't easily verify the timeout, but we can verify construction succeeds
      expect(client).toBeInstanceOf(JiraClient);
    });

    it('withDebug should enable debug mode', () => {
      const client = new JiraClient(validConfig, withDebug(true));
      expect(client).toBeInstanceOf(JiraClient);
    });

    it('withRetry should configure retry', () => {
      const client = new JiraClient(validConfig, withRetry(false));
      expect(client).toBeInstanceOf(JiraClient);
    });

    it('should support multiple options', () => {
      const client = new JiraClient(
        validConfig,
        withApiVersion('2'),
        withTimeout(60000),
        withDebug(true)
      );
      expect(client.apiBasePath).toBe('/rest/api/2');
    });
  });
});

describe('createJiraClient', () => {
  it('should create client via factory function', () => {
    const auth = new ApiTokenAuth({
      email: 'test@example.com',
      apiToken: 'test-token',
    });

    const client = createJiraClient({
      host: 'https://example.atlassian.net',
      auth,
    });

    expect(client).toBeInstanceOf(JiraClient);
  });
});
