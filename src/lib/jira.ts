/**
 * Jira Service Management API client.
 * All functions accept a JiraConfig so they work per-tenant.
 * Token never reaches the browser — server actions only.
 */

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  serviceDeskId: string;
}

// ─── Response Types ──────────────────────────────────────────

export interface RequestType {
  id: string;
  name: string;
  description: string;
  icon: {
    id: string;
    _links: {
      iconUrls: {
        "48x48": string;
        "24x24": string;
      };
    };
  };
  serviceDeskId: string;
  groupIds: string[];
}

export interface FieldValidValue {
  value: string;
  label: string;
  children: FieldValidValue[];
}

export interface RequestTypeField {
  fieldId: string;
  name: string;
  description: string;
  required: boolean;
  defaultValues: unknown[];
  validValues: FieldValidValue[];
  jiraSchema: {
    type: string;
    system?: string;
    items?: string;
    custom?: string;
  };
  visible: boolean;
}

export interface JiraRequest {
  issueId: string;
  issueKey: string;
  requestTypeId: string;
  serviceDeskId: string;
  createdDate: {
    iso8601: string;
    jpirelative: string;
    friendly: string;
  };
  reporter: {
    accountId: string;
    emailAddress: string;
    displayName: string;
    active: boolean;
  };
  requestFieldValues: Array<{
    fieldId: string;
    label: string;
    value: unknown;
  }>;
  currentStatus: {
    status: string;
    statusCategory: "UNDEFINED" | "NEW" | "INDETERMINATE" | "DONE";
    statusDate: {
      iso8601: string;
      friendly: string;
    };
  };
  _links: {
    web: string;
    self: string;
  };
}

export interface JiraComment {
  id: string;
  body: string;
  public: boolean;
  author: {
    accountId: string;
    emailAddress: string;
    displayName: string;
    active: boolean;
  };
  created: {
    iso8601: string;
    friendly: string;
  };
}

export interface CreatedRequest {
  issueKey: string;
  issueId: string;
  _links: {
    web: string;
    self: string;
  };
}

interface PaginatedResponse<T> {
  size: number;
  start: number;
  limit: number;
  isLastPage: boolean;
  values: T[];
}

// ─── Proforma Types ─────────────────────────────────────────

export interface ProformaChoice {
  id: string;
  label: string;
  other: boolean;
}

export interface ProformaQuestion {
  label: string;
  description: string;
  type: string; // tl=text line, pg=paragraph, cs=choice single, cd=choice dropdown, cm=choice multi, da=date, no=number, us=user single, um=user multi, ts=text short
  choices?: ProformaChoice[];
  jiraField?: string;
  questionKey?: string;
  validation: {
    rq: boolean; // required
    wh?: boolean;
  };
}

export interface ProformaCondition {
  i: {
    co: {
      cIds: Record<string, string[]>; // questionId → choice IDs
    };
  };
  o: {
    sIds: string[]; // section IDs to show
    t: string; // "sh" = show
  };
}

export interface ProformaSection {
  sectionType: string;
  name?: string;
  conditions?: string[]; // condition IDs
}

export interface ProformaForm {
  id: string;
  design: {
    conditions: Record<string, ProformaCondition>;
    layout: Array<{
      version: number;
      type: string;
      content: unknown[];
    }>;
    questions: Record<string, ProformaQuestion>;
    sections: Record<string, ProformaSection>;
    settings: {
      name: string;
      submit?: { lock: boolean; pdf: boolean };
    };
  };
  publish: {
    portalRequestTypeIds: number[];
    submitOnCreate: boolean;
    validateOnCreate: boolean;
  };
}

// ─── Internal Helpers ────────────────────────────────────────

/**
 * Service account tokens (scoped) require Bearer auth + api.atlassian.com gateway.
 * Personal API tokens use Basic auth + direct site URL.
 */
export function isServiceAccount(config: JiraConfig): boolean {
  return config.email.includes("@serviceaccount.atlassian.com");
}

export function getAuthHeaders(config: JiraConfig): Record<string, string> {
  if (isServiceAccount(config)) {
    return {
      Authorization: `Bearer ${config.apiToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }
  const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");
  return {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

/**
 * Build the base URL for API calls.
 * Service accounts must use the api.atlassian.com gateway with cloud ID.
 * Personal tokens use the direct site URL.
 */
export async function getApiBase(config: JiraConfig): Promise<string> {
  if (isServiceAccount(config)) {
    const cloudId = await getCloudId(config);
    return `https://api.atlassian.com/ex/jira/${cloudId}`;
  }
  return config.baseUrl;
}

async function serviceDeskUrl(config: JiraConfig, path: string): Promise<string> {
  const base = await getApiBase(config);
  return `${base}/rest/servicedeskapi/servicedesk/${config.serviceDeskId}${path}`;
}

async function requestUrl(config: JiraConfig, path: string): Promise<string> {
  const base = await getApiBase(config);
  return `${base}/rest/servicedeskapi/request${path}`;
}

async function jiraFetch<T>(url: string, config: JiraConfig, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...getAuthHeaders(config), ...init?.headers },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jira API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Get all request types for the service desk.
 * Filters out internal-only types (groupIds is empty).
 */
export async function getRequestTypes(config: JiraConfig): Promise<RequestType[]> {
  const url = await serviceDeskUrl(config, "/requesttype?limit=50");
  const data = await jiraFetch<PaginatedResponse<RequestType>>(url, config);
  return data.values.filter((rt) => rt.groupIds.length > 0);
}

/**
 * Get field definitions for a specific request type.
 */
export async function getRequestTypeFields(
  config: JiraConfig,
  requestTypeId: string
): Promise<{ requestTypeFields: RequestTypeField[]; canRaiseOnBehalfOf: boolean }> {
  const url = await serviceDeskUrl(config, `/requesttype/${requestTypeId}/field`);
  return jiraFetch(url, config);
}

/**
 * Create a new service request (ticket).
 */
export async function createRequest(
  config: JiraConfig,
  requestTypeId: string,
  fieldValues: Record<string, unknown>,
  raiseOnBehalfOf?: string
): Promise<CreatedRequest> {
  const body: Record<string, unknown> = {
    serviceDeskId: config.serviceDeskId,
    requestTypeId,
    requestFieldValues: fieldValues,
  };
  if (raiseOnBehalfOf) {
    body.raiseOnBehalfOf = raiseOnBehalfOf;
  }

  const url = await requestUrl(config, "");
  return jiraFetch<CreatedRequest>(url, config, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Get requests where the user participated (submitted or was mentioned).
 */
export async function getMyRequests(
  config: JiraConfig,
  options?: { start?: number; limit?: number }
): Promise<PaginatedResponse<JiraRequest>> {
  const start = options?.start ?? 0;
  const limit = options?.limit ?? 50;
  const url = await requestUrl(config, `?requestOwnership=ALL_REQUESTS&start=${start}&limit=${limit}`);
  return jiraFetch(url, config);
}

/**
 * Get all requests for an organization (manager view).
 */
export async function getOrgRequests(
  config: JiraConfig,
  organizationId: string,
  options?: { start?: number; limit?: number }
): Promise<PaginatedResponse<JiraRequest>> {
  const start = options?.start ?? 0;
  const limit = options?.limit ?? 50;
  const url = await requestUrl(config, `?organizationId=${organizationId}&start=${start}&limit=${limit}`);
  return jiraFetch(url, config);
}

/**
 * Get a single request by its issue key (e.g. "ITSM-123").
 */
export async function getRequestByKey(
  config: JiraConfig,
  issueKey: string
): Promise<JiraRequest> {
  const url = await requestUrl(config, `/${issueKey}?expand=requestFieldValues`);
  return jiraFetch(url, config);
}

/**
 * Get public comments on a request.
 */
export async function getRequestComments(
  config: JiraConfig,
  issueKey: string,
  options?: { start?: number; limit?: number }
): Promise<PaginatedResponse<JiraComment>> {
  const start = options?.start ?? 0;
  const limit = options?.limit ?? 50;
  const url = await requestUrl(config, `/${issueKey}/comment?public=true&start=${start}&limit=${limit}`);
  return jiraFetch(url, config);
}

/**
 * Add a public comment to a request.
 */
export async function addRequestComment(
  config: JiraConfig,
  issueKey: string,
  body: string
): Promise<JiraComment> {
  const url = await requestUrl(config, `/${issueKey}/comment`);
  return jiraFetch<JiraComment>(url, config, {
    method: "POST",
    body: JSON.stringify({ body, public: true }),
  });
}

/**
 * Get organizations visible to the authenticated user.
 */
export async function getOrganizations(
  config: JiraConfig
): Promise<PaginatedResponse<{ id: string; name: string }>> {
  const base = await getApiBase(config);
  return jiraFetch(`${base}/rest/servicedeskapi/organization`, config);
}

/**
 * Get SLA information for a request.
 */
export async function getRequestSlas(
  config: JiraConfig,
  issueKey: string
): Promise<PaginatedResponse<{
  id: string;
  name: string;
  completedCycles: Array<{ remainingTime: { friendly: string }; breached: boolean }>;
  ongoingCycle: { remainingTime: { friendly: string }; breached: boolean } | null;
}>> {
  const url = await requestUrl(config, `/${issueKey}/sla`);
  return jiraFetch(url, config);
}

/**
 * Get the Atlassian cloud ID for this site.
 * Cached per-baseUrl since different portals may connect to different Jira sites.
 */
const cloudIdCache = new Map<string, string>();

async function getCloudId(config: JiraConfig): Promise<string> {
  const cached = cloudIdCache.get(config.baseUrl);
  if (cached) return cached;
  // _edge/tenant_info is public — no auth needed, always use direct site URL
  const res = await fetch(`${config.baseUrl}/_edge/tenant_info`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to get cloud ID");
  const data = (await res.json()) as { cloudId: string };
  cloudIdCache.set(config.baseUrl, data.cloudId);
  return data.cloudId;
}

/**
 * Get the Proforma form for a request type (if one exists).
 * Returns null if no Proforma form is configured.
 */
export async function getProformaForm(
  config: JiraConfig,
  requestTypeId: string
): Promise<ProformaForm | null> {
  const cloudId = await getCloudId(config);
  const url = `https://api.atlassian.com/jira/forms/cloud/${cloudId}/servicedesk/${config.serviceDeskId}/requesttype/${requestTypeId}/form`;

  const res = await fetch(url, {
    headers: getAuthHeaders(config),
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Proforma API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<ProformaForm>;
}

/**
 * Add a user (by accountId) to a Jira organization.
 */
export async function addUserToOrganization(
  config: JiraConfig,
  orgId: string,
  accountIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const base = await getApiBase(config);
  const url = `${base}/rest/servicedeskapi/organization/${orgId}/users`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...getAuthHeaders(config),
      },
      body: JSON.stringify({ accountIds }),
      cache: "no-store",
    });

    // 204 = success, 200 = success
    if (res.ok || res.status === 204) {
      return { success: true };
    }

    const body = await res.text();
    return { success: false, error: `Add to org API ${res.status}: ${body}` };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Add a customer to a specific service desk project by email.
 * First creates the customer account, then adds to the service desk.
 * Both calls use X-ExperimentalApi header.
 */
export async function addCustomerToServiceDesk(
  config: JiraConfig,
  emails: string[]
): Promise<{ success: boolean; error?: string }> {
  const base = await getApiBase(config);

  for (const email of emails) {
    // Step 1: Create the customer account (or find existing)
    const createUrl = `${base}/rest/servicedeskapi/customer`;
    try {
      const createRes = await fetch(createUrl, {
        method: "POST",
        headers: {
          ...getAuthHeaders(config),
          "X-ExperimentalApi": "opt-in",
        },
        body: JSON.stringify({ email, displayName: email }),
        cache: "no-store",
      });

      let accountId: string | undefined;

      if (createRes.status === 201) {
        const data = (await createRes.json()) as { accountId: string };
        accountId = data.accountId;
        console.log("[addCustomerToSD] Created customer, accountId:", accountId);
      } else if (createRes.status === 409) {
        // Already exists — look up accountId
        accountId = (await findCustomerAccountId(config, email)) ?? undefined;
        console.log("[addCustomerToSD] Customer exists, accountId:", accountId);
      } else {
        const body = await createRes.text();
        console.log("[addCustomerToSD] Create customer failed:", createRes.status, body);
        return { success: false, error: `Create customer ${createRes.status}: ${body}` };
      }

      // Step 2: Add to the service desk
      if (accountId) {
        const addUrl = `${base}/rest/servicedeskapi/servicedesk/${config.serviceDeskId}/customer`;
        const addRes = await fetch(addUrl, {
          method: "POST",
          headers: getAuthHeaders(config),
          body: JSON.stringify({ accountIds: [accountId] }),
          cache: "no-store",
        });
        const addBody = await addRes.text();
        console.log("[addCustomerToSD] Add to service desk:", addRes.status, addBody);
      }
    } catch (err) {
      console.error("[addCustomerToSD] Error:", String(err));
      return { success: false, error: String(err) };
    }
  }

  return { success: true };
}

/**
 * Create or find a JSM customer by email with a display name.
 * If the customer already exists, JSM returns 409 — we treat that as success.
 * This ensures raiseOnBehalfOf shows the customer's real name, not just their email.
 */
export async function createOrFindCustomer(
  config: JiraConfig,
  email: string,
  displayName: string
): Promise<{ success: boolean; accountId?: string; error?: string }> {
  const base = await getApiBase(config);
  const url = `${base}/rest/servicedeskapi/customer`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...getAuthHeaders(config),
        "X-ExperimentalApi": "opt-in",
      },
      body: JSON.stringify({ email, displayName }),
      cache: "no-store",
    });

    // 201 = created — parse response for accountId
    if (res.status === 201) {
      const data = (await res.json()) as { accountId: string };
      return { success: true, accountId: data.accountId };
    }

    // 409 = already exists — need to look up accountId via user search
    if (res.status === 409) {
      const accountId = await findCustomerAccountId(config, email);
      return { success: true, accountId: accountId ?? undefined };
    }

    const body = await res.text();
    return { success: false, error: `JSM customer API ${res.status}: ${body}` };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Look up a customer's accountId by email using Jira user search.
 */
async function findCustomerAccountId(
  config: JiraConfig,
  email: string
): Promise<string | null> {
  const base = await getApiBase(config);
  const url = `${base}/rest/api/3/user/search?query=${encodeURIComponent(email)}`;

  try {
    const res = await fetch(url, {
      headers: getAuthHeaders(config),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const users = (await res.json()) as Array<{ accountId: string; emailAddress?: string }>;
    const match = users.find(
      (u) => u.emailAddress?.toLowerCase() === email.toLowerCase()
    );
    return match?.accountId ?? users[0]?.accountId ?? null;
  } catch {
    return null;
  }
}
