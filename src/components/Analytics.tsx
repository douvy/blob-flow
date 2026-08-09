"use client";

import Script from 'next/script';
import { ANALYTICS_WEBSITE_ID, SITE_URL } from '@/constants';
import {
  ANALYTICS_BEFORE_SEND,
  ANALYTICS_HOST_URL,
  ANALYTICS_SCRIPT_PATH,
  beforeSend,
  trackedDomain,
} from '@/lib/analytics';

// Assigned at module scope rather than from an effect: next/script injects the
// tracker once hydration is done, and the hook has to be on window before the
// tracker sends its first pageview.
if (typeof window !== 'undefined') {
  window[ANALYTICS_BEFORE_SEND] = beforeSend;
}

/**
 * Loads the Umami tracker, which collects pageviews on its own: it hooks
 * history.pushState and replaceState and reports 300ms after each one, which
 * is what makes App Router navigations land with the new page's title rather
 * than the previous one's.
 *
 * Renders nothing unless NEXT_PUBLIC_UMAMI_WEBSITE_ID is set, so development
 * and unconfigured deployments stay clean. The script and the endpoint it
 * reports to are both served from this origin by the /api/stats proxy, so no
 * analytics hostname appears in the page.
 *
 * Umami stores no cookies and no personal data, so this needs no consent
 * banner; data-do-not-track additionally honors browsers that send the DNT
 * signal, at the cost of undercounting those visitors.
 */
export default function Analytics() {
  if (!ANALYTICS_WEBSITE_ID) return null;

  return (
    <Script
      src={ANALYTICS_SCRIPT_PATH}
      strategy="afterInteractive"
      data-website-id={ANALYTICS_WEBSITE_ID}
      data-host-url={ANALYTICS_HOST_URL}
      data-domains={trackedDomain(SITE_URL)}
      data-do-not-track="true"
      data-before-send={ANALYTICS_BEFORE_SEND}
    />
  );
}
