"use server";

import { createClient } from "@supabase/supabase-js";
import {
  getRequestTypes,
  getRequestTypeFields,
  createRequest,
} from "@/lib/jira-backend";
import { getProformaForm } from "@/lib/jira";
import { getJiraConfig } from "@/lib/config";
import type { RequestType, RequestTypeField, ProformaForm } from "@/lib/jira";
import { getCurrentUser } from "./auth";

/**
 * Resolve the current user's portalId (null when AUTH_ENABLED=false).
 */
async function resolvePortalId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.portalId ?? null;
}

/**
 * Fetch portal-visible request types from JSM.
 * Filters out internal-only types (empty groupIds).
 * If admin has configured visible request types, filters by those.
 */
export async function getPortalRequestTypes(): Promise<RequestType[]> {
  const portalId = await resolvePortalId();
  const allTypes = await getRequestTypes(portalId ?? "demo");

  // Check if admin has configured request type visibility
  if (!portalId) return allTypes;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: portalTypes } = await supabase
    .from("portal_request_types")
    .select("jira_request_type_id, enabled, display_name, display_order")
    .eq("portal_id", portalId);

  // If no portal_request_types rows exist, show all (backward compatible)
  if (!portalTypes || portalTypes.length === 0) return allTypes;

  // Build a map of configured types
  const configMap = new Map(
    portalTypes.map((pt) => [pt.jira_request_type_id, pt])
  );

  // Filter to enabled types, apply display name overrides, sort by display_order
  return allTypes
    .filter((rt) => {
      const config = configMap.get(rt.id);
      // If not in config, default to enabled (show it)
      return config ? config.enabled : true;
    })
    .map((rt) => {
      const config = configMap.get(rt.id);
      if (config?.display_name) {
        return { ...rt, name: config.display_name };
      }
      return rt;
    })
    .sort((a, b) => {
      const orderA = configMap.get(a.id)?.display_order ?? 999;
      const orderB = configMap.get(b.id)?.display_order ?? 999;
      return orderA - orderB;
    });
}

/**
 * Fetch field definitions for a specific request type.
 * Filters out non-visible fields and attachment fields.
 */
export async function getPortalRequestTypeFields(
  requestTypeId: string
): Promise<RequestTypeField[]> {
  const portalId = await resolvePortalId();
  const data = await getRequestTypeFields(portalId ?? "demo", requestTypeId);

  return data.requestTypeFields.filter(
    (f) => f.visible && f.jiraSchema.items !== "attachment"
  );
}

/**
 * Fetch the Proforma form for a request type (if one exists).
 */
export async function getPortalProformaForm(
  requestTypeId: string
): Promise<ProformaForm | null> {
  const portalId = await resolvePortalId();
  const config = await getJiraConfig(portalId);
  return getProformaForm(config, requestTypeId);
}

/**
 * Submit a new service request to JSM.
 * Handles both standard JSM fields and Proforma answers.
 */
export async function submitRequest(
  requestTypeId: string,
  fieldValues: Record<string, unknown>,
  proformaFormId?: string
): Promise<{ issueKey: string; webUrl: string }> {
  const user = await getCurrentUser();
  const portalId = user?.portalId ?? "demo";

  // Separate Proforma answers from standard Jira fields
  const jiraFields: Record<string, unknown> = {};
  const proformaAnswers: Record<string, { text?: string; choices?: string[]; date?: string; users?: string[] }> = {};

  for (const [key, value] of Object.entries(fieldValues)) {
    if (value === "" || value === null || value === undefined) continue;

    if (key.startsWith("proforma_")) {
      const questionId = key.replace("proforma_", "");
      const strValue = String(value);

      if (Array.isArray(value)) {
        proformaAnswers[questionId] = { choices: value.map(String) };
      } else {
        proformaAnswers[questionId] = { text: strValue };
      }
    } else {
      jiraFields[key] = value;
    }
  }

  // raiseOnBehalfOf in createRequest auto-creates the Jira customer if needed.
  // We can't set display name without Jira Admin permission, so we skip that.
  const result = await createRequest(
    portalId,
    requestTypeId,
    jiraFields,
    user?.email
  );

  // If we have Proforma answers and a form ID, submit them
  if (proformaFormId && Object.keys(proformaAnswers).length > 0) {
    const config = await getJiraConfig(user?.portalId);
    await submitProformaAnswers(
      config,
      result.issueId,
      proformaFormId,
      proformaAnswers
    );
  }

  return { issueKey: result.issueKey, webUrl: result._links.web };
}

/**
 * Submit Proforma form answers to an existing issue.
 */
async function submitProformaAnswers(
  config: { baseUrl: string; email: string; apiToken: string; serviceDeskId: string },
  issueId: string,
  formId: string,
  answers: Record<string, { text?: string; choices?: string[]; date?: string; users?: string[] }>
): Promise<void> {
  const { getAuthHeaders: getHeaders } = await import("@/lib/jira");

  // Get cloud ID
  const tenantRes = await fetch(`${config.baseUrl}/_edge/tenant_info`);
  const { cloudId } = (await tenantRes.json()) as { cloudId: string };

  // Format answers for Proforma API
  const formattedAnswers: Record<string, unknown> = {};
  for (const [qId, answer] of Object.entries(answers)) {
    if (answer.choices) {
      formattedAnswers[qId] = { choices: answer.choices.map((id) => ({ id })) };
    } else if (answer.text) {
      formattedAnswers[qId] = { text: answer.text };
    }
  }

  const url = `https://api.atlassian.com/jira/forms/cloud/${cloudId}/issue/${issueId}/form/${formId}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: getHeaders(config),
    body: JSON.stringify({ answers: formattedAnswers }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Proforma submission failed ${res.status}: ${body}`);
    throw new Error("Failed to submit form answers. Your ticket was created but some form data may be missing.");
  }
}
