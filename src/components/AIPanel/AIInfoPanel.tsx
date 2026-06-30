import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../../store/playerStore';
import { useSettingsStore } from '../../store/settingsStore';
import { querySongInfo, searchLyrics, queryVideoInfo } from '../../services/aiService';
import { startRecording, recognizeSong } from '../../services/recognitionService';
import { SongInfo, VideoInfo, LyricsResult } from '../../types';

const COLORS = {
  bg: '#16213e', card: '#1a1a2e', border: '#2a2a4a',
  accent: '#e94560', active: '#00d4ff',
  text: '#ffffff', sub: '#a0a0b0',
};

interface Props {
  mediaType?: 'audio' | 'video';
}

export default function AIInfoPanel({ mediaType = 'audio' }: Props) {
  const { currentItem } = usePlayerStore();
  const { ai } = useSettingsStore();

  const [loading, setLoading] = useState<string | null>(null);
  const [songInfo, setSongInfo] = useState<SongInfo | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [lyrics, setLyrics] = useState<LyricsResult | null>(null);
  const [recognition, setRecognition] = useState<string | null>(null);
  const [humText, setHumText] = useState('');
  const [humModalVisible, setHumModalVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [lyricsVisible, setLyricsVisible] = useState(false);

  if (!ai.enabled) {
    return (
      <View style={styles.disabledBox}>
        <Ionicons name="radio-button-off" size={16} color={COLORS.sub} />
        <Text style={styles.disabledText}>AI support is disabled</Text>
      </View>
    );
  }

  async function handleQueryInfo() {
    if (!currentItem) return;
    setLoading('info');
    try {
      if (mediaType === 'video') {
        const info = await queryVideoInfo(ai, currentItem.title);
        setVideoInfo(info);
      } else {
        const info = await querySongInfo(ai, currentItem.title, currentItem.artist);
        setSongInfo(info);
      }
    } catch (e: any) {
      setSongInfo({ title: 'Error', description: e.message });
    }
    setLoading(null);
  }

  async function handleSearchLyrics() {
    if (!currentItem) return;
    setLoading('lyrics');
    try {
      const result = await searchLyrics(ai, currentItem.title, currentItem.artist);
      setLyrics(result);
      setLyricsVisible(true);
    } catch (e: any) {
      setLyrics({ lyrics: `Error: ${e.message}` });
      setLyricsVisible(true);
    }
    setLoading(null);
  }

  async function handleListenRecognize() {
    setIsRecording(true);
    setRecognition(null);
    try {
      const session = await startRecording();
      setTimeout(async () => {
        const data = await session.stop();
        const result = await recognizeSong(ai, data);
        setRecognition(result);
        setIsRecording(false);
      }, 8000);
    } catch (e: any) {
      setRecognition(`Error: ${e.message}`);
      setIsRecording(false);
    }
  }

  async function handleHumSearch() {
    if (!humText.trim()) return;
    setLoading('hum');
    try {
      const result = await recognizeSong(ai, humText);
      setRecognition(result);
    } catch (e: any) {
      setRecognition(`Error: ${e.message}`);
    }
    setLoading(null);
    setHumModalVisible(false);
  }

  const info = mediaType === 'video' ? videoInfo : songInfo;

  return (
    <View style={styles.container}>
      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleQueryInfo}
          disabled={!currentItem || loading === 'info'}
          style={[styles.actionBtn, (!currentItem || loading === 'info') && styles.disabled]}
        >
          {loading === 'info' ? (
            <ActivityIndicator size="small" color={COLORS.active} />
          ) : (
            <Ionicons name="information-circle" size={16} color={COLORS.active} />
          )}
          <Text style={styles.actionText}>
            {mediaType === 'video' ? 'Video Info' : 'Song Info'}
          </Text>
        </TouchableOpacity>

        {mediaType === 'audio' && (
          <TouchableOpacity
            onPress={handleSearchLyrics}
            disabled={!currentItem || loading === 'lyrics'}
            style={[styles.actionBtn, (!currentItem || loading === 'lyrics') && styles.disabled]}
          >
            {loading === 'lyrics' ? (
              <ActivityIndicator size="small" color={COLORS.active} />
            ) : (
              <Ionicons name="document-text" size={16} color={COLORS.active} />
            )}
            <Text style={styles.actionText}>Lyrics</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleListenRecognize}
          disabled={isRecording}
          style={[styles.actionBtn, isRecording && styles.recordingBtn]}
        >
          {isRecording ? (
            <ActivityIndicator size="small" color={COLORS.accent} />
          ) : (
            <Ionicons name="mic" size={16} color={COLORS.accent} />
          )}
          <Text style={[styles.actionText, isRecording && { color: COLORS.accent }]}>
            {isRecording ? 'Listening…' : 'Listen ID'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setHumModalVisible(true)}
          style={styles.actionBtn}
        >
          <Ionicons name="musical-note" size={16} color={COLORS.accent} />
          <Text style={styles.actionText}>Hum Search</Text>
        </TouchableOpacity>
      </View>

      {/* Recognition result */}
      {recognition && (
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>Recognition Result:</Text>
          <Text style={styles.resultText}>{recognition}</Text>
        </View>
      )}

      {/* Info display */}
      {info && (
        <ScrollView style={styles.infoBox} nestedScrollEnabled>
          {mediaType === 'video' && videoInfo ? (
            <>
              <InfoRow label="Title"    value={videoInfo.title} />
              <InfoRow label="Director" value={videoInfo.director} />
              <InfoRow label="Year"     value={videoInfo.year} />
              <InfoRow label="Genre"    value={videoInfo.genre} />
              <InfoRow label="Rating"   value={videoInfo.rating} />
              <InfoRow label="Duration" value={videoInfo.duration} />
              <InfoRow label="Cast"     value={videoInfo.cast?.join(', ')} />
              <InfoRow label="Summary"  value={videoInfo.summary} multiline />
            </>
          ) : songInfo ? (
            <>
              <InfoRow label="Title"       value={songInfo.title} />
              <InfoRow label="Artist"      value={songInfo.artist} />
              <InfoRow label="Album"       value={songInfo.album} />
              <InfoRow label="Year"        value={songInfo.year} />
              <InfoRow label="Genre"       value={songInfo.genre} />
              <InfoRow label="Language"    value={songInfo.language} />
              <InfoRow label="Description" value={songInfo.description} multiline />
            </>
          ) : null}
        </ScrollView>
      )}

      {/* Lyrics modal */}
      <Modal visible={lyricsVisible} transparent animationType="slide" onRequestClose={() => setLyricsVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.lyricsModal}>
            <View style={styles.lyricsHeader}>
              <Text style={styles.lyricsTitle}>
                Lyrics{currentItem ? ` — ${currentItem.title}` : ''}
              </Text>
              <TouchableOpacity onPress={() => setLyricsVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.sub} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.lyricsText}>{lyrics?.lyrics}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Hum search modal */}
      <Modal visible={humModalVisible} transparent animationType="fade" onRequestClose={() => setHumModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.humModal}>
            <Text style={styles.humTitle}>Hum to Search</Text>
            <Text style={styles.humDesc}>
              Describe the melody, rhythm, or lyrics you remember:
            </Text>
            <TextInput
              style={styles.humInput}
              value={humText}
              onChangeText={setHumText}
              placeholder="e.g. 'da da da dum, slow sad song, starts with piano'"
              placeholderTextColor={COLORS.sub}
              multiline
              numberOfLines={3}
            />
            <View style={styles.humActions}>
              <TouchableOpacity onPress={() => setHumModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleHumSearch}
                disabled={!humText.trim() || loading === 'hum'}
                style={[styles.searchBtn, (!humText.trim() || loading === 'hum') && { opacity: 0.5 }]}
              >
                {loading === 'hum' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.searchBtnText}>Search</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value, multiline }: { label: string; value?: string; multiline?: boolean }) {
  if (!value) return null;
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}:</Text>
      <Text style={[infoStyles.value, multiline && { flex: 1 }]}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 4, flexWrap: 'wrap' },
  label: { color: COLORS.sub, fontSize: 12, width: 80, fontWeight: '600' },
  value: { color: COLORS.text, fontSize: 12, flexShrink: 1 },
});

const styles = StyleSheet.create({
  container: { padding: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  recordingBtn: { borderColor: COLORS.accent, backgroundColor: 'rgba(233,69,96,0.1)' },
  disabled: { opacity: 0.4 },
  actionText: { color: COLORS.sub, fontSize: 12 },
  resultBox: {
    backgroundColor: 'rgba(0,212,255,0.08)',
    borderRadius: 8, padding: 10, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.active,
  },
  resultLabel: { color: COLORS.active, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  resultText: { color: COLORS.text, fontSize: 13 },
  infoBox: { maxHeight: 160, backgroundColor: '#0f0f2a', borderRadius: 8, padding: 10 },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center',
  },
  lyricsModal: {
    backgroundColor: COLORS.card, borderRadius: 12,
    padding: 20, width: 480, maxWidth: '95%',
    maxHeight: '80%', borderWidth: 1, borderColor: COLORS.border,
  },
  lyricsHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  lyricsTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  lyricsText: { color: COLORS.text, fontSize: 14, lineHeight: 24 },
  humModal: {
    backgroundColor: COLORS.card, borderRadius: 12,
    padding: 20, width: 400, maxWidth: '95%',
    borderWidth: 1, borderColor: COLORS.border,
  },
  humTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  humDesc: { color: COLORS.sub, fontSize: 13, marginBottom: 10 },
  humInput: {
    backgroundColor: '#0f3460', color: COLORS.text,
    borderRadius: 8, padding: 12, fontSize: 13,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 14, minHeight: 70, textAlignVertical: 'top',
  },
  humActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  cancelBtn: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  cancelText: { color: COLORS.sub, fontSize: 13 },
  searchBtn: {
    paddingHorizontal: 24, paddingVertical: 9,
    backgroundColor: COLORS.accent, borderRadius: 8,
  },
  searchBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  disabledBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    padding: 8, opacity: 0.5,
  },
  disabledText: { color: COLORS.sub, fontSize: 12 },
});
