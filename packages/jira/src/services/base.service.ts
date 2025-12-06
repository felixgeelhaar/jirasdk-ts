import type { z } from 'zod';
import type { HttpClient, HttpResponse, RequestOptions } from '@felixgeelhaar/sdk-core';
import { ResponseValidationError } from '@felixgeelhaar/sdk-core';

/**
 * Base service class for all Jira services
 *
 * Provides common functionality for making API requests
 * and validating responses with Zod schemas.
 */
export abstract class BaseService {
  protected readonly http: HttpClient;
  protected readonly basePath: string;

  constructor(http: HttpClient, basePath: string) {
    this.http = http;
    this.basePath = basePath;
  }

  /**
   * Build the full API path
   */
  protected buildPath(path: string): string {
    return `${this.basePath}${path}`;
  }

  /**
   * Make a GET request and validate the response
   */
  protected async getMethod<T>(
    path: string,
    schema: z.ZodType<T>,
    params?: Record<string, string | number | boolean | string[] | undefined>,
    options?: RequestOptions
  ): Promise<T> {
    const response = await this.http.get(this.buildPath(path), params, options);
    return this.validateResponse(response, schema);
  }

  /**
   * Make a GET request without response validation
   */
  protected async getMethodRaw<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean | string[] | undefined>,
    options?: RequestOptions
  ): Promise<HttpResponse<T>> {
    return this.http.get<T>(this.buildPath(path), params, options);
  }

  /**
   * Make a POST request and validate the response
   */
  protected async postMethod<T>(
    path: string,
    schema: z.ZodType<T>,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const response = await this.http.post(this.buildPath(path), body, options);
    return this.validateResponse(response, schema);
  }

  /**
   * Make a POST request without response validation
   */
  protected async postMethodRaw<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<HttpResponse<T>> {
    return this.http.post<T>(this.buildPath(path), body, options);
  }

  /**
   * Make a PUT request and validate the response
   */
  protected async putMethod<T>(
    path: string,
    schema: z.ZodType<T>,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const response = await this.http.put(this.buildPath(path), body, options);
    return this.validateResponse(response, schema);
  }

  /**
   * Make a PUT request without response validation
   */
  protected async putMethodRaw<T = unknown>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<HttpResponse<T>> {
    return this.http.put<T>(this.buildPath(path), body, options);
  }

  /**
   * Make a PATCH request and validate the response
   */
  protected async patchMethod<T>(
    path: string,
    schema: z.ZodType<T>,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const response = await this.http.patch(this.buildPath(path), body, options);
    return this.validateResponse(response, schema);
  }

  /**
   * Make a DELETE request
   */
  protected async deleteMethod(path: string, options?: RequestOptions): Promise<void> {
    await this.http.delete(this.buildPath(path), options);
  }

  /**
   * Make a DELETE request and validate the response
   */
  protected async deleteMethodWithResponse<T>(
    path: string,
    schema: z.ZodType<T>,
    options?: RequestOptions
  ): Promise<T> {
    const response = await this.http.delete(this.buildPath(path), options);
    return this.validateResponse(response, schema);
  }

  /**
   * Validate response data against a Zod schema
   */
  protected validateResponse<T>(response: HttpResponse, schema: z.ZodType<T>): T {
    const result = schema.safeParse(response.data);
    if (!result.success) {
      throw ResponseValidationError.fromZodError(result.error);
    }
    return result.data;
  }

  /**
   * Build query parameters for GET requests
   * Filters out undefined values
   */
  protected buildParams(
    params: Record<string, string | number | boolean | string[] | undefined>
  ): Record<string, string | number | boolean | string[]> {
    const result: Record<string, string | number | boolean | string[]> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Convert array to comma-separated string for query params
   */
  protected arrayToCommaSeparated(arr?: string[]): string | undefined {
    return arr?.join(',');
  }
}
