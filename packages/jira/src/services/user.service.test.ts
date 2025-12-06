import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from './user.service.js';
import type { HttpClient, HttpResponse } from '@felixgeelhaar/sdk-core';

// Create mock HTTP client
function createMockHttpClient(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    use: vi.fn(),
    getBaseUrl: vi.fn().mockReturnValue('https://example.atlassian.net'),
    getAuth: vi.fn(),
  } as unknown as HttpClient;
}

function createMockResponse<T>(data: T): HttpResponse<T> {
  return {
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    data,
    request: { method: 'GET', url: '/test', headers: {} },
    responseTime: 100,
  };
}

function createMockUser(accountId: string, name: string) {
  return {
    self: `https://example.atlassian.net/rest/api/3/user?accountId=${accountId}`,
    accountId,
    displayName: name,
    active: true,
    emailAddress: `${name.toLowerCase().replace(' ', '.')}@example.com`,
    avatarUrls: {
      '48x48': 'https://example.com/avatar.png',
      '24x24': 'https://example.com/avatar-24.png',
      '16x16': 'https://example.com/avatar-16.png',
      '32x32': 'https://example.com/avatar-32.png',
    },
  };
}

describe('UserService', () => {
  let service: UserService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new UserService(mockHttp, '/rest/api/3');
  });

  describe('getCurrentUser', () => {
    it('should fetch the current user', async () => {
      const mockUser = createMockUser('user123', 'John Doe');

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUser));

      const user = await service.getCurrentUser();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/myself', {}, undefined);
      expect(user.accountId).toBe('user123');
      expect(user.displayName).toBe('John Doe');
    });

    it('should fetch the current user with expand options', async () => {
      const mockUser = createMockUser('user123', 'John Doe');

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUser));

      await service.getCurrentUser({ expand: ['groups', 'applicationRoles'] });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/myself',
        expect.objectContaining({
          expand: 'groups,applicationRoles',
        }),
        undefined
      );
    });
  });

  describe('get', () => {
    it('should fetch a user by account ID', async () => {
      const mockUser = createMockUser('user456', 'Jane Smith');

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUser));

      const user = await service.get('user456');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user',
        expect.objectContaining({
          accountId: 'user456',
        }),
        undefined
      );
      expect(user.accountId).toBe('user456');
    });
  });

  describe('search', () => {
    it('should search for users by query', async () => {
      const mockUsers = [
        createMockUser('user1', 'John Doe'),
        createMockUser('user2', 'John Smith'),
      ];

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUsers));

      const users = await service.search({ query: 'john' });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/search',
        expect.objectContaining({
          query: 'john',
        }),
        undefined
      );
      expect(users).toHaveLength(2);
    });

    it('should search with pagination', async () => {
      const mockUsers = [createMockUser('user1', 'Test User')];

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUsers));

      await service.search({
        query: 'test',
        startAt: 10,
        maxResults: 20,
      });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/search',
        expect.objectContaining({
          query: 'test',
          startAt: 10,
          maxResults: 20,
        }),
        undefined
      );
    });
  });

  describe('getAssignable', () => {
    it('should get users assignable to a project', async () => {
      const mockUsers = [
        createMockUser('user1', 'Developer 1'),
        createMockUser('user2', 'Developer 2'),
      ];

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUsers));

      const users = await service.getAssignable({ project: 'PROJECT' });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/assignable/search',
        expect.objectContaining({
          project: 'PROJECT',
        }),
        undefined
      );
      expect(users).toHaveLength(2);
    });

    it('should get users assignable to an issue', async () => {
      const mockUsers = [createMockUser('user1', 'Developer 1')];

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUsers));

      await service.getAssignable({ issueKey: 'PROJECT-123' });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/assignable/search',
        expect.objectContaining({
          issueKey: 'PROJECT-123',
        }),
        undefined
      );
    });
  });

  describe('getAssignableForProject', () => {
    it('should be a convenience method for getAssignable with project', async () => {
      const mockUsers = [createMockUser('user1', 'Developer 1')];

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUsers));

      const users = await service.getAssignableForProject('PROJECT', { query: 'dev' });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/assignable/search',
        expect.objectContaining({
          project: 'PROJECT',
          query: 'dev',
        }),
        undefined
      );
      expect(users).toHaveLength(1);
    });
  });

  describe('getAssignableForIssue', () => {
    it('should be a convenience method for getAssignable with issue', async () => {
      const mockUsers = [createMockUser('user1', 'Developer 1')];

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUsers));

      const users = await service.getAssignableForIssue('PROJECT-123');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/assignable/search',
        expect.objectContaining({
          issueKey: 'PROJECT-123',
        }),
        undefined
      );
      expect(users).toHaveLength(1);
    });
  });

  describe('getProjectMembers', () => {
    it('should get project members', async () => {
      const mockUsers = [
        createMockUser('user1', 'Member 1'),
        createMockUser('user2', 'Member 2'),
        createMockUser('user3', 'Member 3'),
      ];

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUsers));

      const users = await service.getProjectMembers('PROJECT');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/viewissue/search',
        expect.objectContaining({
          projectKey: 'PROJECT',
        }),
        undefined
      );
      expect(users).toHaveLength(3);
    });

    it('should search project members with query', async () => {
      const mockUsers = [createMockUser('user1', 'John Member')];

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUsers));

      await service.getProjectMembers('PROJECT', { query: 'john' });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/viewissue/search',
        expect.objectContaining({
          projectKey: 'PROJECT',
          query: 'john',
        }),
        undefined
      );
    });
  });
});
