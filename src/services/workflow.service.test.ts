import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowService } from './workflow.service.js';
import type { HttpClient, HttpResponse } from '../transport/index.js';

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

function createMockWorkflow(id: string, name: string): unknown {
  return {
    id,
    name,
    description: 'A workflow',
    isDefault: false,
  };
}

function createMockScheme(id: number): unknown {
  return {
    id,
    name: `Scheme ${String(id)}`,
    draft: false,
    defaultWorkflow: 'classic-default-workflow',
  };
}

describe('WorkflowService', () => {
  let service: WorkflowService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new WorkflowService(mockHttp, '/rest/api/3');
  });

  describe('getTransitions', () => {
    it('should fetch transitions for an issue', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          expand: 'transitions',
          transitions: [{ id: '31', name: 'Done', to: { id: '10001', name: 'Done' } }],
        })
      );

      const transitions = await service.getTransitions('PROJ-123');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJ-123/transitions',
        {},
        undefined
      );
      expect(transitions).toHaveLength(1);
      expect(transitions[0]?.name).toBe('Done');
    });

    it('should build query params from options', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ transitions: [] }));

      await service.getTransitions('PROJ-123', {
        expand: ['transitions.fields'],
        transitionId: '31',
        skipRemoteOnlyCondition: true,
      });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJ-123/transitions',
        {
          expand: 'transitions.fields',
          transitionId: '31',
          skipRemoteOnlyCondition: true,
        },
        undefined
      );
    });

    it('should throw when the response fails validation', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ nope: true }));

      await expect(service.getTransitions('PROJ-123')).rejects.toThrow();
    });
  });

  describe('doTransition', () => {
    it('should POST the transition payload', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(undefined));

      await service.doTransition('PROJ-123', {
        transition: { id: '31' },
        fields: { resolution: { name: 'Fixed' } },
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJ-123/transitions',
        { transition: { id: '31' }, fields: { resolution: { name: 'Fixed' } } },
        undefined
      );
    });

    it('should reject an empty transition id', async () => {
      await expect(service.doTransition('PROJ-123', { transition: { id: '' } })).rejects.toThrow();
    });
  });

  describe('list', () => {
    it('should search workflows with pagination params', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          startAt: 0,
          maxResults: 50,
          total: 1,
          isLast: true,
          values: [createMockWorkflow('1', 'Default')],
        })
      );

      const result = await service.list({ workflowName: 'Default', startAt: 0, maxResults: 50 });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/workflow/search',
        { workflowName: 'Default', startAt: 0, maxResults: 50 },
        undefined
      );
      expect(result.values).toHaveLength(1);
    });
  });

  describe('iterate / all', () => {
    it('should page through all workflows', async () => {
      vi.mocked(mockHttp.get)
        .mockResolvedValueOnce(
          createMockResponse({
            startAt: 0,
            maxResults: 2,
            total: 3,
            isLast: false,
            values: [createMockWorkflow('1', 'A'), createMockWorkflow('2', 'B')],
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            startAt: 2,
            maxResults: 2,
            total: 3,
            isLast: true,
            values: [createMockWorkflow('3', 'C')],
          })
        );

      const names: string[] = [];
      for await (const workflow of service.iterate({ maxResults: 2 })) {
        names.push(workflow.name);
      }

      expect(names).toEqual(['A', 'B', 'C']);
      expect(mockHttp.get).toHaveBeenCalledTimes(2);
    });

    it('should collect all workflows into an array', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          startAt: 0,
          maxResults: 50,
          total: 1,
          isLast: true,
          values: [createMockWorkflow('1', 'A')],
        })
      );

      const workflows = await service.all();

      expect(workflows).toHaveLength(1);
    });

    it('should stop on an empty page', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ startAt: 0, maxResults: 50, total: 0, values: [] })
      );

      const workflows = await service.all();

      expect(workflows).toEqual([]);
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('get', () => {
    it('should fetch a workflow by id', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse(createMockWorkflow('1', 'Default'))
      );

      const workflow = await service.get('1');

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/workflow/1', undefined, undefined);
      expect(workflow.name).toBe('Default');
    });

    it('should URL-encode a workflow name', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse(createMockWorkflow('1', 'My Workflow'))
      );

      await service.get('My Workflow');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/workflow/My%20Workflow',
        undefined,
        undefined
      );
    });
  });

  describe('statuses', () => {
    it('should fetch all statuses', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse([{ id: '10000', name: 'To Do' }])
      );

      const statuses = await service.getAllStatuses();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/status', undefined, undefined);
      expect(statuses[0]?.name).toBe('To Do');
    });

    it('should fetch a status by id', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ id: '10000', name: 'To Do' })
      );

      const status = await service.getStatus('10000');

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/status/10000', undefined, undefined);
      expect(status.id).toBe('10000');
    });

    it('should fetch all status categories', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse([{ id: 2, key: 'new', name: 'To Do', colorName: 'blue-gray' }])
      );

      const categories = await service.getStatusCategories();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/statuscategory', undefined, undefined);
      expect(categories[0]?.key).toBe('new');
    });

    it('should fetch a status category by key', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ id: 3, key: 'done', name: 'Done' })
      );

      const category = await service.getStatusCategory('done');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/statuscategory/done',
        undefined,
        undefined
      );
      expect(category.id).toBe(3);
    });
  });

  describe('workflow schemes', () => {
    it('should fetch a workflow scheme by id', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(createMockScheme(10000)));

      const scheme = await service.getWorkflowScheme(10000);

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/workflowscheme/10000',
        undefined,
        undefined
      );
      expect(scheme.id).toBe(10000);
    });

    it('should list workflow schemes', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ startAt: 0, maxResults: 50, total: 1, values: [createMockScheme(1)] })
      );

      const result = await service.listWorkflowSchemes({ startAt: 0, maxResults: 50 });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/workflowscheme',
        { startAt: 0, maxResults: 50 },
        undefined
      );
      expect(result.values).toHaveLength(1);
    });

    it('should page through workflow schemes', async () => {
      vi.mocked(mockHttp.get)
        .mockResolvedValueOnce(
          createMockResponse({
            startAt: 0,
            maxResults: 1,
            total: 2,
            values: [createMockScheme(1)],
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            startAt: 1,
            maxResults: 1,
            total: 2,
            values: [createMockScheme(2)],
          })
        );

      const ids: number[] = [];
      for await (const scheme of service.iterateWorkflowSchemes({ maxResults: 1 })) {
        ids.push(scheme.id);
      }

      expect(ids).toEqual([1, 2]);
    });

    it('should collect all workflow schemes', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ startAt: 0, maxResults: 50, total: 1, values: [createMockScheme(1)] })
      );

      const schemes = await service.allWorkflowSchemes();

      expect(schemes).toHaveLength(1);
    });

    it('should create a workflow scheme', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(createMockScheme(10000)));

      const scheme = await service.createWorkflowScheme({
        name: 'My Scheme',
        issueTypeMappings: { '10001': 'software-simplified-workflow' },
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/workflowscheme',
        { name: 'My Scheme', issueTypeMappings: { '10001': 'software-simplified-workflow' } },
        undefined
      );
      expect(scheme.id).toBe(10000);
    });

    it('should reject creating a scheme without a name', async () => {
      await expect(service.createWorkflowScheme({ name: '' })).rejects.toThrow();
    });

    it('should update a workflow scheme', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse(createMockScheme(10000)));

      await service.updateWorkflowScheme(10000, { description: 'Updated' });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/workflowscheme/10000',
        { description: 'Updated' },
        undefined
      );
    });

    it('should delete a workflow scheme', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(undefined));

      await service.deleteWorkflowScheme(10000);

      expect(mockHttp.delete).toHaveBeenCalledWith('/rest/api/3/workflowscheme/10000', undefined);
    });

    it('should set the workflow for an issue type', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse(undefined));

      await service.setWorkflowSchemeIssueType(10000, {
        issueType: '10001',
        workflow: 'software-simplified-workflow',
      });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/workflowscheme/10000/issuetype/10001',
        { issueType: '10001', workflow: 'software-simplified-workflow' },
        undefined
      );
    });

    it('should reject setting an empty issue type', async () => {
      await expect(service.setWorkflowSchemeIssueType(10000, { issueType: '' })).rejects.toThrow();
    });

    it('should delete the workflow for an issue type', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(undefined));

      await service.deleteWorkflowSchemeIssueType(10000, '10001');

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/workflowscheme/10000/issuetype/10001',
        undefined
      );
    });

    it('should throw when a scheme response fails validation', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ id: 'not-a-number' }));

      await expect(service.getWorkflowScheme(10000)).rejects.toThrow();
    });
  });
});
