import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView,
  TextInput, ActivityIndicator, Switch, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoStore } from '../../store/videoStore';
import { usePlayerStore } from '../../store/playerStore';
import {
  searchSubtitles, getSubtitleDownloadUrl,
  downloadSubtitleToCache, readSubtitleFile,
  languageName, OnlineSubtitle,
} from '../../services/subtitleService';
import { SubtitleTrack, SubtitleCue } from '../../types/video';

const COLORS = {
  bg: '#16213e', card: '#1a1a2e', border: '#2a2a4a',
  accent: '#e94560', active: '#00d4ff',
  text: '#ffffff', sub: '#a0a0b0', input: '#0f3460',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onLoadCues: (cues: SubtitleCue[], trackId: string) => void;
}

const POPULAR_LANGS = [
  { code: 'en', name: 'English' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
];

export default function SubtitlePanel({ visible, onClose, onLoadCues }: Props) {
  const {
    subtitleTracks, activeSubtitleTrackId, subtitleOffset, subtitleStyle,
    setActiveSubtitleTrack, addExternalSubtitle,
    setSubtitleOffset, updateSubtitleStyle,
  } = useVideoStore();
  const { currentItem } = usePlayerStore();

  const [tab, setTab] = useState<'tracks' | 'online' | 'style'>('tracks');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLangs, setSelectedLangs] = useState(['en', 'zh-TW']);
  const [results, setResults] = useState<OnlineSubtitle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (visible && currentItem) {
      setSearchQuery(currentItem.title);
    }
  }, [visible, currentItem]);

  async function handleSearch() {
    setLoading(true); setError(null); setResults([]);
    try {
      const res = await searchSubtitles({
        query: searchQuery.trim() || currentItem?.title,
        languages: selectedLangs,
      });
      setResults(res);
      if (!res.length) setError('No subtitles found. Try a different search term.');
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleDownload(sub: OnlineSubtitle) {
    setDownloading(sub.id);
    try {
      const fileId = (sub as any)._fileId;
      const url = await getSubtitleDownloadUrl(fileId);
      const filename = `${sub.id}_${sub.languageCode}.srt`;
      const localPath = await downloadSubtitleToCache(url, filename);
      const cues = await readSubtitleFile(localPath);

      const track: SubtitleTrack = {
        id: sub.id,
        name: `${sub.name} [${sub.language}]`,
        language: sub.language,
        languageCode: sub.languageCode,
        format: 'srt',
        isExternal: true,
        uri: localPath,
      };
      addExternalSubtitle(track);
      setActiveSubtitleTrack(track.id);
      onLoadCues(cues, String(track.id));
    } catch (e: any) {
      setError(`Download failed: ${e.message}`);
    }
    setDownloading(null);
  }

  async function handleLoadLocalFile() {
    if (Platform.OS === 'web' && (window as any).electronAPI) {
      const paths: string[] = await (window as any).electronAPI.openFileDialog({
        filters: [{ name: 'Subtitles', extensions: ['srt', 'ass', 'ssa', 'vtt', 'sub'] }],
      });
      if (paths?.[0]) await _loadLocal(paths[0]);
    } else if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.srt,.ass,.ssa,.vtt,.sub';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const text = await file.text();
        const cues = await import('../../services/subtitleService').then(
          (m) => m.parseSubtitleFile(text, file.name)
        );
        const id = `local-${Date.now()}`;
        const track: SubtitleTrack = {
          id, name: file.name, format: 'srt', isExternal: true,
        };
        addExternalSubtitle(track);
        setActiveSubtitleTrack(id);
        onLoadCues(cues, id);
      };
      input.click();
    }
  }

  async function _loadLocal(path: string) {
    const cues = await readSubtitleFile(path);
    const name = path.split(/[\\/]/).pop() ?? 'subtitle';
    const id = `local-${Date.now()}`;
    const track: SubtitleTrack = { id, name, isExternal: true };
    addExternalSubtitle(track);
    setActiveSubtitleTrack(id);
    onLoadCues(cues, id);
  }

  function toggleLang(code: string) {
    setSelectedLangs((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Subtitles</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.sub} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {(['tracks', 'online', 'style'] as const).map((t) => (
              <TouchableOpacity key={t} onPress={() => setTab(t)}
                style={[styles.tab, tab === t && styles.tabActive]}>
                <Text style={[styles.tabText, tab === t && { color: COLORS.accent }]}>
                  {t === 'tracks' ? 'Tracks' : t === 'online' ? 'Online' : 'Style'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.body}>
            {/* ── Tracks tab ── */}
            {tab === 'tracks' && (
              <View>
                <TouchableOpacity onPress={() => { setActiveSubtitleTrack(null); }}
                  style={[styles.trackItem, activeSubtitleTrackId === null && styles.trackItemActive]}>
                  <Ionicons name="close-circle" size={16} color={COLORS.sub} />
                  <Text style={styles.trackName}>Disabled</Text>
                </TouchableOpacity>

                {subtitleTracks.map((t) => (
                  <TouchableOpacity key={String(t.id)}
                    onPress={() => setActiveSubtitleTrack(t.id)}
                    style={[styles.trackItem, activeSubtitleTrackId === t.id && styles.trackItemActive]}>
                    <Ionicons
                      name={t.isExternal ? 'document-text' : 'text'}
                      size={16}
                      color={activeSubtitleTrackId === t.id ? COLORS.accent : COLORS.sub}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.trackName, activeSubtitleTrackId === t.id && { color: COLORS.accent }]}>
                        {t.name}
                      </Text>
                      {t.language && (
                        <Text style={styles.trackLang}>{languageName(t.language)}</Text>
                      )}
                    </View>
                    {activeSubtitleTrackId === t.id && (
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.accent} />
                    )}
                  </TouchableOpacity>
                ))}

                <TouchableOpacity onPress={handleLoadLocalFile} style={styles.addBtn}>
                  <Ionicons name="folder-open" size={16} color={COLORS.active} />
                  <Text style={styles.addBtnText}>Load Local Subtitle File…</Text>
                </TouchableOpacity>

                {/* Offset */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Timing Offset</Text>
                  <View style={styles.offsetRow}>
                    <TouchableOpacity onPress={() => setSubtitleOffset(subtitleOffset - 500)} style={styles.offsetBtn}>
                      <Text style={styles.offsetBtnText}>-0.5s</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setSubtitleOffset(subtitleOffset - 100)} style={styles.offsetBtn}>
                      <Text style={styles.offsetBtnText}>-0.1s</Text>
                    </TouchableOpacity>
                    <View style={styles.offsetDisplay}>
                      <Text style={[styles.offsetValue, subtitleOffset !== 0 && { color: COLORS.accent }]}>
                        {subtitleOffset > 0 ? '+' : ''}{(subtitleOffset / 1000).toFixed(1)}s
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setSubtitleOffset(subtitleOffset + 100)} style={styles.offsetBtn}>
                      <Text style={styles.offsetBtnText}>+0.1s</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setSubtitleOffset(subtitleOffset + 500)} style={styles.offsetBtn}>
                      <Text style={styles.offsetBtnText}>+0.5s</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setSubtitleOffset(0)} style={styles.resetBtn}>
                      <Text style={styles.resetBtnText}>Reset</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* ── Online tab ── */}
            {tab === 'online' && (
              <View>
                <Text style={styles.sectionTitle}>Search OpenSubtitles.com</Text>
                <TextInput
                  style={styles.input}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Movie / show title…"
                  placeholderTextColor={COLORS.sub}
                />
                {/* Language filter */}
                <Text style={styles.sectionTitle}>Languages</Text>
                <View style={styles.langRow}>
                  {POPULAR_LANGS.map((l) => (
                    <TouchableOpacity key={l.code} onPress={() => toggleLang(l.code)}
                      style={[styles.langChip, selectedLangs.includes(l.code) && styles.langChipActive]}>
                      <Text style={[styles.langChipText, selectedLangs.includes(l.code) && { color: COLORS.accent }]}>
                        {l.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity onPress={handleSearch} disabled={loading} style={styles.searchBtn}>
                  {loading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.searchBtnText}>Search Subtitles</Text>}
                </TouchableOpacity>

                {error && <Text style={styles.errorText}>{error}</Text>}

                {results.map((r) => (
                  <View key={r.id} style={styles.resultItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName} numberOfLines={2}>{r.name}</Text>
                      <Text style={styles.resultMeta}>
                        {languageName(r.languageCode)}
                        {r.hearingImpaired ? ' · 🦻 HI' : ''}
                        {r.uploader ? ` · ${r.uploader}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDownload(r)}
                      disabled={downloading === r.id}
                      style={styles.downloadBtn}
                    >
                      {downloading === r.id
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Ionicons name="cloud-download" size={18} color="#fff" />}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* ── Style tab ── */}
            {tab === 'style' && (
              <View>
                <StyleRow label="Font Size">
                  <View style={styles.sizeRow}>
                    <TouchableOpacity onPress={() => updateSubtitleStyle({ fontSize: Math.max(10, subtitleStyle.fontSize - 2) })} style={styles.sizeBtn}>
                      <Ionicons name="remove" size={18} color={COLORS.sub} />
                    </TouchableOpacity>
                    <Text style={[styles.sizeValue, { fontSize: subtitleStyle.fontSize, color: COLORS.text }]}>
                      {subtitleStyle.fontSize}px
                    </Text>
                    <TouchableOpacity onPress={() => updateSubtitleStyle({ fontSize: Math.min(48, subtitleStyle.fontSize + 2) })} style={styles.sizeBtn}>
                      <Ionicons name="add" size={18} color={COLORS.sub} />
                    </TouchableOpacity>
                  </View>
                </StyleRow>

                <StyleRow label="Bold">
                  <Switch
                    value={subtitleStyle.bold}
                    onValueChange={(v) => updateSubtitleStyle({ bold: v })}
                    trackColor={{ false: '#3a3a5c', true: COLORS.accent }}
                    thumbColor="#fff"
                  />
                </StyleRow>

                <StyleRow label="Outline">
                  <Switch
                    value={subtitleStyle.outline}
                    onValueChange={(v) => updateSubtitleStyle({ outline: v })}
                    trackColor={{ false: '#3a3a5c', true: COLORS.accent }}
                    thumbColor="#fff"
                  />
                </StyleRow>

                <StyleRow label="Position">
                  <View style={styles.posRow}>
                    {(['bottom', 'top'] as const).map((p) => (
                      <TouchableOpacity key={p} onPress={() => updateSubtitleStyle({ position: p })}
                        style={[styles.posChip, subtitleStyle.position === p && styles.posChipActive]}>
                        <Text style={[styles.posChipText, subtitleStyle.position === p && { color: COLORS.accent }]}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </StyleRow>

                {/* Preview */}
                <View style={styles.preview}>
                  <View style={[
                    styles.previewSub,
                    {
                      backgroundColor: subtitleStyle.backgroundColor,
                      bottom: subtitleStyle.position === 'bottom' ? 0 : undefined,
                      top: subtitleStyle.position === 'top' ? 0 : undefined,
                    }
                  ]}>
                    <Text style={{
                      color: subtitleStyle.color,
                      fontSize: Math.min(subtitleStyle.fontSize, 18),
                      fontWeight: subtitleStyle.bold ? '700' : '400',
                      textShadowColor: subtitleStyle.outline ? '#000' : 'transparent',
                      textShadowOffset: { width: 1, height: 1 },
                      textShadowRadius: subtitleStyle.outline ? 3 : 0,
                    }}>
                      This is a subtitle preview
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function StyleRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={srStyles.row}>
      <Text style={srStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

const srStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  label: { color: COLORS.sub, fontSize: 13 },
});

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  panel: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '85%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  tabs: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { borderColor: COLORS.accent, backgroundColor: 'rgba(233,69,96,0.1)' },
  tabText: { color: COLORS.sub, fontSize: 13, fontWeight: '600' },
  body: { flex: 1 },
  trackItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 10, marginBottom: 6,
    backgroundColor: '#0f0f2a',
  },
  trackItemActive: { backgroundColor: 'rgba(233,69,96,0.12)', borderWidth: 1, borderColor: COLORS.accent },
  trackName: { color: COLORS.text, fontSize: 13 },
  trackLang: { color: COLORS.sub, fontSize: 11, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1,
    borderColor: COLORS.active, borderStyle: 'dashed',
    marginTop: 8, marginBottom: 16,
  },
  addBtnText: { color: COLORS.active, fontSize: 13 },
  section: { marginTop: 4 },
  sectionTitle: { color: COLORS.sub, fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  offsetRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  offsetBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#2a2a4a',
  },
  offsetBtnText: { color: COLORS.text, fontSize: 12 },
  offsetDisplay: {
    flex: 1, alignItems: 'center',
    paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#0f0f2a',
  },
  offsetValue: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  resetBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.accent },
  resetBtnText: { color: '#fff', fontSize: 12 },
  input: {
    backgroundColor: COLORS.input, color: COLORS.text, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 13,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 12,
  },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  langChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  langChipActive: { borderColor: COLORS.accent, backgroundColor: 'rgba(233,69,96,0.1)' },
  langChipText: { color: COLORS.sub, fontSize: 12 },
  searchBtn: {
    backgroundColor: COLORS.accent, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', marginBottom: 14,
  },
  searchBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  errorText: { color: '#ff6b6b', fontSize: 13, marginBottom: 10 },
  resultItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, borderRadius: 8, backgroundColor: '#0f0f2a',
    marginBottom: 6, gap: 10,
  },
  resultName: { color: COLORS.text, fontSize: 12 },
  resultMeta: { color: COLORS.sub, fontSize: 11, marginTop: 2 },
  downloadBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
  },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sizeBtn: { padding: 6, borderRadius: 8, backgroundColor: '#2a2a4a' },
  sizeValue: { fontWeight: '700', minWidth: 48, textAlign: 'center' },
  posRow: { flexDirection: 'row', gap: 8 },
  posChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  posChipActive: { borderColor: COLORS.accent, backgroundColor: 'rgba(233,69,96,0.1)' },
  posChipText: { color: COLORS.sub, fontSize: 12 },
  preview: {
    height: 100, backgroundColor: '#000', borderRadius: 10,
    marginTop: 16, overflow: 'hidden', position: 'relative',
    justifyContent: 'center',
  },
  previewSub: {
    position: 'absolute', left: 0, right: 0,
    alignItems: 'center', padding: 8,
  },
});
