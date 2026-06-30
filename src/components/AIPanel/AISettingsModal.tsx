import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ScrollView, ActivityIndicator, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../../store/settingsStore';
import { AIProvider, DEFAULT_AI_MODELS } from '../../types';
import { testAPIConnection } from '../../services/aiService';

const PROVIDERS: { key: AIProvider; label: string; color: string }[] = [
  { key: 'claude',    label: 'Claude (Anthropic)', color: '#cc785c' },
  { key: 'openai',   label: 'OpenAI',              color: '#10a37f' },
  { key: 'deepseek', label: 'DeepSeek',             color: '#4b6cf7' },
  { key: 'gemini',   label: 'Gemini (Google)',       color: '#4285f4' },
];

const COLORS = {
  bg: '#16213e',
  card: '#1a1a2e',
  border: '#2a2a4a',
  accent: '#e94560',
  active: '#00d4ff',
  text: '#ffffff',
  sub: '#a0a0b0',
  input: '#0f3460',
  success: '#00cc66',
  error: '#ff4444',
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AISettingsModal({ visible, onClose }: Props) {
  const {
    ai, setAIEnabled, setActiveProvider,
    setApiKey, setProviderEnabled,
    setAudioModel, setVideoModel, setCustomModel,
  } = useSettingsStore();

  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('claude');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [showKey, setShowKey] = useState(false);

  const providerCfg = ai.providers[selectedProvider];
  const models = providerCfg.models;

  async function handleTest() {
    setTesting(true);
    setTestResult('idle');
    const model = models.customModel || models.selectedAudioModel;
    const ok = await testAPIConnection(selectedProvider, providerCfg.apiKey, model);
    setTestResult(ok ? 'ok' : 'fail');
    setTesting(false);
  }

  function handleSave() {
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="settings" size={20} color={COLORS.active} />
              <Text style={styles.title}>AI API Settings</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.enableLabel}>AI Support</Text>
              <Switch
                value={ai.enabled}
                onValueChange={setAIEnabled}
                trackColor={{ false: '#3a3a5c', true: COLORS.accent }}
                thumbColor={ai.enabled ? '#fff' : '#888'}
              />
              <TouchableOpacity onPress={onClose} style={{ marginLeft: 12 }}>
                <Ionicons name="close" size={22} color={COLORS.sub} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.body}>
            {/* Provider tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
              {PROVIDERS.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => { setSelectedProvider(p.key); setTestResult('idle'); }}
                  style={[
                    styles.tab,
                    selectedProvider === p.key && { borderColor: p.color, backgroundColor: `${p.color}22` },
                  ]}
                >
                  <View style={[styles.tabDot, { backgroundColor: p.color }]} />
                  <Text style={[styles.tabText, selectedProvider === p.key && { color: p.color }]}>
                    {p.label}
                  </Text>
                  {providerCfg.enabled && selectedProvider === p.key && (
                    <View style={[styles.activeDot, { backgroundColor: COLORS.success }]} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView style={styles.form}>
              {/* Enable toggle */}
              <View style={styles.row}>
                <Text style={styles.label}>Enable this provider</Text>
                <Switch
                  value={providerCfg.enabled}
                  onValueChange={(v) => setProviderEnabled(selectedProvider, v)}
                  trackColor={{ false: '#3a3a5c', true: COLORS.accent }}
                  thumbColor={providerCfg.enabled ? '#fff' : '#888'}
                />
              </View>

              {/* Active provider */}
              {providerCfg.enabled && (
                <TouchableOpacity
                  onPress={() => setActiveProvider(selectedProvider)}
                  style={[
                    styles.setActiveBtn,
                    ai.activeProvider === selectedProvider && styles.setActiveBtnOn,
                  ]}
                >
                  <Text style={styles.setActiveBtnText}>
                    {ai.activeProvider === selectedProvider ? '✓ Active Provider' : 'Set as Active Provider'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* API Key */}
              <Text style={styles.label}>API Key</Text>
              <View style={styles.keyRow}>
                <TextInput
                  style={styles.input}
                  value={providerCfg.apiKey}
                  onChangeText={(v) => setApiKey(selectedProvider, v)}
                  placeholder="Enter API key..."
                  placeholderTextColor={COLORS.sub}
                  secureTextEntry={!showKey}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowKey(!showKey)} style={styles.eyeBtn}>
                  <Ionicons name={showKey ? 'eye-off' : 'eye'} size={18} color={COLORS.sub} />
                </TouchableOpacity>
              </View>

              {/* Audio model */}
              <Text style={styles.label}>Audio / Music Model</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modelRow}>
                {models.audioModels.map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setAudioModel(selectedProvider, m)}
                    style={[
                      styles.modelChip,
                      models.selectedAudioModel === m && styles.modelChipActive,
                    ]}
                  >
                    <Text style={[
                      styles.modelChipText,
                      models.selectedAudioModel === m && { color: COLORS.accent },
                    ]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Video model */}
              <Text style={styles.label}>Video Model</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modelRow}>
                {models.videoModels.map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setVideoModel(selectedProvider, m)}
                    style={[
                      styles.modelChip,
                      models.selectedVideoModel === m && styles.modelChipActive,
                    ]}
                  >
                    <Text style={[
                      styles.modelChipText,
                      models.selectedVideoModel === m && { color: COLORS.accent },
                    ]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Custom model */}
              <Text style={styles.label}>Custom Model (overrides above)</Text>
              <TextInput
                style={styles.input}
                value={models.customModel}
                onChangeText={(v) => setCustomModel(selectedProvider, v)}
                placeholder="e.g. claude-opus-4-8 (leave blank to use selected)"
                placeholderTextColor={COLORS.sub}
                autoCapitalize="none"
              />

              {/* Test */}
              <View style={styles.testRow}>
                <TouchableOpacity
                  onPress={handleTest}
                  disabled={testing || !providerCfg.apiKey}
                  style={[styles.testBtn, (!providerCfg.apiKey || testing) && { opacity: 0.5 }]}
                >
                  {testing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.testBtnText}>Test Connection</Text>
                  )}
                </TouchableOpacity>
                {testResult === 'ok' && (
                  <Text style={[styles.testResult, { color: COLORS.success }]}>✓ Connected!</Text>
                )}
                {testResult === 'fail' && (
                  <Text style={[styles.testResult, { color: COLORS.error }]}>✗ Failed. Check API key.</Text>
                )}
              </View>
            </ScrollView>
          </View>

          {/* Footer */}
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>Save & Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center',
  },
  modal: {
    backgroundColor: COLORS.card,
    borderRadius: 16, padding: 20,
    width: 560, maxWidth: '96%',
    maxHeight: '90%',
    borderWidth: 1, borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  enableLabel: { color: COLORS.sub, fontSize: 13 },
  body: { flex: 1, minHeight: 300, maxHeight: 520 },
  tabs: { marginBottom: 16 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
    marginRight: 8,
  },
  tabDot: { width: 8, height: 8, borderRadius: 4 },
  tabText: { color: COLORS.sub, fontSize: 12, fontWeight: '600' },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  form: { flex: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  label: { color: COLORS.sub, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: COLORS.input, color: COLORS.text,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 10, flex: 1,
  },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  eyeBtn: { padding: 10 },
  modelRow: { marginBottom: 10 },
  modelChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    marginRight: 6,
  },
  modelChipActive: { borderColor: COLORS.accent, backgroundColor: 'rgba(233,69,96,0.1)' },
  modelChipText: { color: COLORS.sub, fontSize: 11 },
  setActiveBtn: {
    paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#2a2a4a', alignItems: 'center', marginBottom: 12,
  },
  setActiveBtnOn: { backgroundColor: 'rgba(0,212,255,0.15)', borderWidth: 1, borderColor: COLORS.active },
  setActiveBtnText: { color: COLORS.active, fontSize: 12, fontWeight: '600' },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 12 },
  testBtn: {
    paddingHorizontal: 20, paddingVertical: 9,
    backgroundColor: COLORS.accent, borderRadius: 8,
    minWidth: 130, alignItems: 'center',
  },
  testBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  testResult: { fontSize: 13, fontWeight: '600' },
  saveBtn: {
    marginTop: 12, paddingVertical: 12,
    backgroundColor: COLORS.accent, borderRadius: 10, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
