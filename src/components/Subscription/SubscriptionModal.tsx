import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionStore, SUBSCRIPTION_PLANS, PlanType } from '../../store/subscriptionStore';
import { purchasePlan, restorePurchases } from '../../services/subscriptionService';
import { AppConfig } from '../../config/appConfig';

const COLORS = {
  bg: '#0d0d1e', card: '#1a1a2e', border: '#2a2a4a',
  accent: '#e94560', gold: '#f5c518', active: '#00d4ff',
  text: '#ffffff', sub: '#a0a0b0',
};

const FEATURES = [
  { icon: 'ban',             text: 'No ads — ever'                          },
  { icon: 'server',          text: 'SMB / FTP / WebDAV streaming'            },
  { icon: 'logo-google',     text: 'Google Drive direct playback'            },
  { icon: 'logo-dropbox',    text: 'Dropbox direct playback'                 },
  { icon: 'sparkles',        text: 'Priority AI model access'                },
  { icon: 'cloud-download',  text: 'Cloud decoder & codec updates'           },
  { icon: 'document-text',   text: 'Offline subtitle cache'                  },
  { icon: 'refresh-circle',  text: 'Continuous updates & new format support' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SubscriptionModal({ visible, onClose }: Props) {
  const { isSubscriber, plan, expiresAt, loading, error } = useSubscriptionStore();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  async function handlePurchase() {
    if (!AppConfig.subscription.enabled) {
      Alert.alert('Not available', 'Subscription is not enabled in this build.');
      return;
    }
    setPurchasing(true);
    const ok = await purchasePlan(selectedPlan);
    setPurchasing(false);
    if (ok) onClose();
  }

  async function handleRestore() {
    setRestoring(true);
    const ok = await restorePurchases();
    setRestoring(false);
    if (ok) {
      Alert.alert('Restored!', 'Your Premium subscription has been restored.');
      onClose();
    } else {
      Alert.alert('No purchase found', 'No active subscription was found for this account.');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          {/* Header */}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={COLORS.sub} />
          </TouchableOpacity>

          <View style={styles.heroRow}>
            <Ionicons name="diamond" size={36} color={COLORS.gold} />
            <View>
              <Text style={styles.heroTitle}>MediaPlayer AI Premium</Text>
              <Text style={styles.heroSub}>Unlock the full experience</Text>
            </View>
          </View>

          {/* Already subscribed */}
          {isSubscriber ? (
            <View style={styles.activeBox}>
              <Ionicons name="checkmark-circle" size={20} color="#00cc66" />
              <Text style={styles.activeText}>
                Active {plan} plan
                {expiresAt ? ` · renews ${new Date(expiresAt).toLocaleDateString()}` : ''}
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Features */}
              <View style={styles.features}>
                {FEATURES.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <View style={styles.featureIcon}>
                      <Ionicons name={f.icon as any} size={16} color={COLORS.gold} />
                    </View>
                    <Text style={styles.featureText}>{f.text}</Text>
                  </View>
                ))}
              </View>

              {/* Plan cards */}
              <View style={styles.plans}>
                {SUBSCRIPTION_PLANS.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setSelectedPlan(p.id)}
                    style={[styles.planCard, selectedPlan === p.id && styles.planCardActive]}
                  >
                    {p.savings && (
                      <View style={styles.savingsBadge}>
                        <Text style={styles.savingsBadgeText}>{p.savings}</Text>
                      </View>
                    )}
                    <Text style={[styles.planLabel, selectedPlan === p.id && { color: COLORS.accent }]}>
                      {p.label}
                    </Text>
                    <View style={styles.planPriceRow}>
                      <Text style={styles.planPrice}>{p.price}</Text>
                      <Text style={styles.planPeriod}>{p.period}</Text>
                    </View>
                    {p.id === 'monthly' && (
                      <Text style={styles.planNote}>
                        {AppConfig.subscription.trialDays}-day free trial
                      </Text>
                    )}
                    {p.id === 'yearly' && (
                      <Text style={styles.planNote}>≈ $1.67/month</Text>
                    )}
                    {selectedPlan === p.id && (
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.accent}
                        style={styles.planCheck} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Error */}
              {error && <Text style={styles.errorText}>{error}</Text>}

              {/* CTA */}
              <TouchableOpacity
                onPress={handlePurchase}
                disabled={purchasing || loading}
                style={[styles.purchaseBtn, (purchasing || loading) && { opacity: 0.6 }]}
              >
                {purchasing
                  ? <ActivityIndicator color="#fff" />
                  : (
                    <Text style={styles.purchaseBtnText}>
                      {selectedPlan === 'monthly'
                        ? `Start ${AppConfig.subscription.trialDays}-Day Free Trial`
                        : 'Subscribe Yearly — Best Value'}
                    </Text>
                  )}
              </TouchableOpacity>

              {/* Sub-actions */}
              <View style={styles.subActions}>
                <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.textBtn}>
                  {restoring
                    ? <ActivityIndicator size="small" color={COLORS.sub} />
                    : <Text style={styles.textBtnText}>Restore Purchases</Text>}
                </TouchableOpacity>
              </View>

              {/* Legal */}
              <Text style={styles.legal}>
                Subscription auto-renews until cancelled. Cancel any time in your App Store /
                Google Play account settings. By subscribing you agree to our Terms of Service
                and Privacy Policy. Payment will be charged to your store account at purchase
                confirmation.
              </Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  panel: {
    backgroundColor: COLORS.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '92%',
  },
  closeBtn: { position: 'absolute', top: 20, right: 20, zIndex: 10, padding: 6 } as any,
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  heroTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  heroSub: { color: COLORS.sub, fontSize: 13, marginTop: 2 },
  activeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(0,204,102,0.1)',
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#00cc66',
  },
  activeText: { color: '#00cc66', fontSize: 14, fontWeight: '600' },
  features: { marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  featureIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(245,197,24,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  featureText: { color: COLORS.text, fontSize: 14 },
  plans: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  planCard: {
    flex: 1, borderRadius: 16, borderWidth: 2, borderColor: COLORS.border,
    padding: 16, backgroundColor: COLORS.card, position: 'relative',
  } as any,
  planCardActive: { borderColor: COLORS.accent, backgroundColor: 'rgba(233,69,96,0.08)' },
  savingsBadge: {
    position: 'absolute', top: -10, right: 10,
    backgroundColor: COLORS.gold, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  } as any,
  savingsBadgeText: { color: '#000', fontSize: 10, fontWeight: '800' },
  planLabel: { color: COLORS.sub, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  planPrice: { color: COLORS.text, fontSize: 22, fontWeight: '800' },
  planPeriod: { color: COLORS.sub, fontSize: 12 },
  planNote: { color: COLORS.sub, fontSize: 11, marginTop: 4 },
  planCheck: { position: 'absolute', top: 10, left: 10 } as any,
  errorText: { color: '#ff6b6b', fontSize: 12, marginBottom: 12, textAlign: 'center' },
  purchaseBtn: {
    backgroundColor: COLORS.accent, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  purchaseBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  subActions: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  textBtn: { padding: 8 },
  textBtnText: { color: COLORS.sub, fontSize: 12 },
  legal: { color: '#444', fontSize: 10, textAlign: 'center', lineHeight: 16, marginBottom: 8 },
});
