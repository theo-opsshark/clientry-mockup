"use server";

import { createClient } from "@supabase/supabase-js";

export interface PortalData {
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
}

/**
 * In-memory cache for portal branding data.
 */
const portalDataCache = new Map<string, PortalData>();

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Get portal branding data (name, logo, color) by portal ID.
 * Cached in-memory — portal branding rarely changes.
 */
export async function getPortalData(
  portalId: string
): Promise<PortalData | null> {
  const cached = portalDataCache.get(portalId);
  if (cached) return cached;

  const supabase = getServiceClient();
  const { data: portal } = await supabase
    .from("portals")
    .select("name, slug, logo_url, primary_color")
    .eq("id", portalId)
    .single();

  if (!portal) return null;

  const portalData: PortalData = {
    name: portal.name,
    slug: portal.slug,
    logoUrl: portal.logo_url,
    primaryColor: portal.primary_color ?? "#06b6d4",
  };

  portalDataCache.set(portalId, portalData);
  return portalData;
}
