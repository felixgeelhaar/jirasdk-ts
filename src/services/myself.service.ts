import { BaseService } from './base.service.js';
import {
  CurrentUserSchema,
  UserPreferencesSchema,
  PreferenceValueSchema,
  SetUserPreferencesInputSchema,
  type CurrentUser,
  type UserPreferences,
  type SetUserPreferencesInput,
} from '../schemas/myself/index.js';

const MY_PREFERENCES_PATH = '/mypreferences';

/**
 * Myself service for operations on the currently authenticated user
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * // Who am I?
 * const me = await client.myself.get();
 *
 * // Read and update preferences
 * const prefs = await client.myself.getPreferences();
 * await client.myself.setPreferences({ locale: 'en_US' });
 * ```
 */
export class MyselfService extends BaseService {
  /**
   * Get the currently authenticated user
   *
   * `GET /rest/api/3/myself`
   *
   * @returns The current user
   */
  async get(): Promise<CurrentUser> {
    return this.getMethod('/myself', CurrentUserSchema);
  }

  /**
   * Get the current user's preferences
   *
   * `GET /rest/api/3/mypreferences`
   *
   * @returns The current user's preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    return this.getMethod(MY_PREFERENCES_PATH, UserPreferencesSchema);
  }

  /**
   * Set the current user's preferences
   *
   * `PUT /rest/api/3/mypreferences`
   *
   * @param input - Preferences to set
   * @returns Nothing; resolves once the preferences are stored
   */
  async setPreferences(input: SetUserPreferencesInput): Promise<void> {
    const body = SetUserPreferencesInputSchema.parse(input);
    await this.putMethodRaw(MY_PREFERENCES_PATH, body);
  }

  /**
   * Get a single preference of the current user by key
   *
   * `GET /rest/api/3/mypreferences?key={key}`
   *
   * Deviates from the Go SDK, which decodes the response into a map and then
   * indexes it by `key`. The endpoint returns the preference value itself, not
   * an object keyed by the preference name, so the Go shape never matches.
   * Non-string JSON scalars (a boolean or numeric preference) are coerced to
   * their string form.
   *
   * @param key - The preference key
   * @returns The preference value
   */
  async getPreference(key: string): Promise<string> {
    const params = this.buildParams({ key });
    return this.getMethod(MY_PREFERENCES_PATH, PreferenceValueSchema, params);
  }

  /**
   * Set a single preference of the current user
   *
   * `PUT /rest/api/3/mypreferences?key={key}`
   *
   * Deviates from the Go SDK, which sends `{[key]: value}` as the body. The
   * endpoint takes the key from the required `key` query parameter and the
   * request body is the raw value itself (a plain string, max 255 characters).
   *
   * @param key - The preference key
   * @param value - The preference value
   * @returns Nothing; resolves once the preference is stored
   */
  async setPreference(key: string, value: string): Promise<void> {
    const params = this.buildParams({ key });

    await this.http.put(this.buildPath(MY_PREFERENCES_PATH), value, { params });
  }

  /**
   * Delete a single preference of the current user
   *
   * `DELETE /rest/api/3/mypreferences?key={key}`
   *
   * @param key - The preference key
   * @returns Nothing; resolves once the preference is removed
   */
  async deletePreference(key: string): Promise<void> {
    const params = this.buildParams({ key });

    await this.http.delete(this.buildPath(MY_PREFERENCES_PATH), {
      params,
    });
  }
}
