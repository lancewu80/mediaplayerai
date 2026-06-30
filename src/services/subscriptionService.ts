/**
 * Subscription Service — RevenueCat
 *
 * RevenueCat wraps StoreKit (iOS) and Google Play Billing (Android) with
 * a unified API. It handles:
 *   • Subscription purchase flow
 *   • Receipt validation
 *   • Restore purchases
 *   • Entitlement status (isActive / expiresAt)
 *
 * Plans:
 *   mediaplayerai_premium_monthly  — $2.99/month (7-day free trial)
 *   mediaplayerai_premium_yearly   — $19.99/year (7-day free trial, saves 44%)
 *
 * What subscribers get:
 *   ✓ No ads
 *   ✓ Network streaming (SMB, FTP, WebDAV)
 *   ✓ Google Drive & Dropbox integration
 *   ✓ Cloud decoder & codec updates
 *   ✓ Priority AI model access
 *   ✓ Offline subtitle cache
 */

import { Platform } from 'react-native';
import { AppConfig } from '../config/appConfig';
import { useSubscriptionStore, PlanType, SUBSCRIPTION_PLANS } from '../store/subscriptionStore';

const ENTITLEMENT_ID = 'premium';

// ─── SDK lazy import ──────────────────────────────────────────────────────────

let _rc: any = null;

async function getRC() {
  if (_rc) return _rc;
  if (Platform.OS === 'web') return null;
  if (!AppConfig.subscription.enabled) return null;

  try {
    _rc = await import('react-native-purchases');
    return _rc;
  } catch {
    console.warn('react-native-purchases not installed');
    return null;
  }
}

// ─── Initialise ───────────────────────────────────────────────────────────────

export async function initializeSubscriptions(): Promise<void> {
  if (!AppConfig.subscription.enabled || Platform.OS === 'web') return;

  const rc = await getRC();
  if (!rc) return;

  const apiKey = AppConfig.subscription.revenueCatApiKey;
  if (!apiKey) {
    console.warn('RevenueCat API key not set — subscriptions disabled');
    return;
  }

  await rc.default.configure({ apiKey });
  await refreshSubscriptionStatus();
}

// ─── Status check ─────────────────────────────────────────────────────────────

export async function refreshSubscriptionStatus(): Promise<void> {
  const { setSubscriber, setLoading, setError } = useSubscriptionStore.getState();

  if (!AppConfig.subscription.enabled) { setSubscriber(false); return; }
  const rc = await getRC();
  if (!rc) { setSubscriber(false); return; }

  setLoading(true);
  try {
    const info = await rc.default.getCustomerInfo();
    const entitlement = info.entitlements.active[ENTITLEMENT_ID];
    if (entitlement) {
      const expiresAt = entitlement.expirationDate
        ? new Date(entitlement.expirationDate).getTime()
        : undefined;
      const plan: PlanType = entitlement.productIdentifier?.includes('yearly') ? 'yearly' : 'monthly';
      setSubscriber(true, plan, expiresAt);
    } else {
      setSubscriber(false);
    }
  } catch (e: any) {
    setError(e.message);
    setSubscriber(false);
  } finally {
    setLoading(false);
  }
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

export async function purchasePlan(planId: PlanType): Promise<boolean> {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error(`Unknown plan: ${planId}`);

  const rc = await getRC();
  if (!rc) throw new Error('Purchases SDK not available');

  const { setSubscriber, setLoading, setError } = useSubscriptionStore.getState();

  setLoading(true);
  try {
    const offerings = await rc.default.getOfferings();
    const offering = offerings.current;
    if (!offering) throw new Error('No offerings available');

    const pkg = offering.availablePackages.find(
      (p: any) => p.product.identifier === plan.productId
    );
    if (!pkg) throw new Error(`Package ${plan.productId} not found`);

    const { customerInfo } = await rc.default.purchasePackage(pkg);
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    if (entitlement) {
      const expiresAt = entitlement.expirationDate
        ? new Date(entitlement.expirationDate).getTime()
        : undefined;
      setSubscriber(true, planId, expiresAt);
      return true;
    }
    return false;
  } catch (e: any) {
    if (!e.userCancelled) setError(e.message);
    return false;
  } finally {
    setLoading(false);
  }
}

// ─── Restore ──────────────────────────────────────────────────────────────────

export async function restorePurchases(): Promise<boolean> {
  const rc = await getRC();
  if (!rc) throw new Error('Purchases SDK not available');

  const { setSubscriber, setLoading, setError } = useSubscriptionStore.getState();

  setLoading(true);
  try {
    const info = await rc.default.restorePurchases();
    const entitlement = info.entitlements.active[ENTITLEMENT_ID];
    if (entitlement) {
      const plan: PlanType = entitlement.productIdentifier?.includes('yearly') ? 'yearly' : 'monthly';
      setSubscriber(true, plan);
      return true;
    }
    setSubscriber(false);
    return false;
  } catch (e: any) {
    setError(e.message);
    return false;
  } finally {
    setLoading(false);
  }
}
