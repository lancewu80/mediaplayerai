import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Platform, Alert, TextInput, Modal, PermissionsAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlaylistStore } from '../../store/playlistStore';
import { usePlayerStore } from '../../store/playerStore';
import { useLangStore } from '../../store/langStore';
import { MediaItem } from '../../types';
import {
  buildMediaItemFromPath,
  scanDirectory,
  savePlaylistToFile,
  loadPlaylistFromFile,
  isSupportedFormat,
} from '../../services/playlistService';
import MediaLibraryPicker from './MediaLibraryPicker';
import { formatTime } from '../../services/audioService';

const COLORS = {
  bg: '#16213e', card: '#1a1a2e', border: '#2a2a4a',
  accent: '#e94560', active: '#00d4ff',
  text: '#ffffff', sub: '#a0a0b0',
  hover: '#252548', playing: 'rgba(233,69,96,0.12)',
};

function MediaIcon({ type }: { type: 'audio' | 'video' }) {
  return (
    <Ionicons
      name={type === 'video' ? 'videocam' : 'musical-notes'}
      size={14}
      color={type === 'video' ? COLORS.active : COLORS.accent}
    />
  );
}

function PlaylistItem({
  item, index, isActive, onPlay, onRemove,
}: {
  item: MediaItem; index: number; isActive: boolean;
  onPlay: () => void; onRemove: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  function handlePress() {
    // Single click / tap plays immediately (standard media player behaviour)
    onPlay();
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={onRemove}
      // @ts-ignore web only
      onMouseEnter={() => setHovered(true)}
      // @ts-ignore web only
      onMouseLeave={() => setHovered(false)}
      style={[
        styles.item,
        isActive && styles.itemActive,
        hovered && !isActive && styles.itemHover,
      ]}
    >
      <Text style={styles.itemIndex}>{index + 1}</Text>
      <MediaIcon type={item.type} />
      <View style={styles.itemInfo}>
        <Text style={[styles.itemTitle, isActive && { color: COLORS.accent }]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.artist && (
          <Text style={styles.itemArtist} numberOfLines={1}>{item.artist}</Text>
        )}
      </View>
      {item.duration !== undefined && (
        <Text style={styles.itemDuration}>{formatTime(item.duration)}</Text>
      )}
      {isActive && (
        <Ionicons name="volume-medium" size={14} color={COLORS.accent} style={{ marginLeft: 4 }} />
      )}
    </TouchableOpacity>
  );
}

export default function PlaylistPanel() {
  const {
    activePlaylist, addItems, removeItem, clearPlaylist,
    importPlaylist, exportPlaylist,
  } = usePlaylistStore();
  const { currentItem, currentIndex, setCurrentItem } = usePlayerStore();

  const { t } = useLangStore();
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [mediaLibVisible, setMediaLibVisible] = useState(false);

  const items = activePlaylist?.items ?? [];

  // ── File/Dir pickers (web/Electron) ──────────────────────────────────────

  async function handleAddFiles() {
    if (Platform.OS === 'web' && (window as any).electronAPI) {
      const paths: string[] = await (window as any).electronAPI.openFileDialog({
        multiSelections: true,
        filters: [
          { name: 'Media', extensions: ['mp3','wav','flac','aac','m4a','ogg','wma','opus','mp4','mkv','avi','mov','wmv','flv','webm','mpg','mpeg','m4v'] },
        ],
      });
      if (paths?.length) {
        addItems(paths.filter(isSupportedFormat).map((p) => buildMediaItemFromPath(p)));
      }
    } else if (Platform.OS !== 'web') {
      // Mobile: expo-document-picker v10+ API: { canceled, assets: [{uri, name, mimeType}] }
      try {
        const { getDocumentAsync } = await import('expo-document-picker');
        const result = await getDocumentAsync({ type: '*/*', multiple: true } as any);
        if (!result.canceled && result.assets?.length) {
          addItems(
            result.assets
              .filter((f: any) => isSupportedFormat(f.name ?? f.uri))
              .map((f: any) => buildMediaItemFromPath(f.name ?? f.uri, f.uri))
          );
        }
      } catch (err) {
        console.error('Document picker error:', err);
        Alert.alert(t('error') || 'Error', (err as any).message || 'Failed to open file picker');
      }
    } else {
      // Browser (not Electron): use input[type=file]
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'audio/*,video/*';
      input.onchange = () => {
        const files = Array.from(input.files ?? []);
        addItems(
          files.map((f) => buildMediaItemFromPath(f.name, URL.createObjectURL(f)))
        );
      };
      input.click();
    }
  }

  async function handleAddDirectory() {
    if (Platform.OS === 'web' && (window as any).electronAPI) {
      const dir: string = await (window as any).electronAPI.openDirectoryDialog();
      if (dir) {
        const newItems = await scanDirectory(dir);
        addItems(newItems);
      }
    } else if (Platform.OS !== 'web') {
      // Mobile: open MediaLibrary folder picker
      setMediaLibVisible(true);
    } else if (Platform.OS === 'web') {
      // Browser: webkitdirectory
      const input = document.createElement('input');
      input.type = 'file';
      (input as any).webkitdirectory = true;
      input.onchange = () => {
        const files = Array.from(input.files ?? []);
        addItems(
          files
            .filter((f) => isSupportedFormat(f.name))
            .map((f) => buildMediaItemFromPath(f.name, URL.createObjectURL(f)))
        );
      };
      input.click();
    }
  }

  async function handleExport() {
    const pl = exportPlaylist();
    if (!pl) return;
    const json = JSON.stringify(pl, null, 2);

    if (Platform.OS === 'web' && (window as any).electronAPI) {
      const savePath: string = await (window as any).electronAPI.saveFileDialog({
        defaultPath: `${pl.name}.json`,
        filters: [{ name: 'Playlist', extensions: ['json'] }],
      });
      if (savePath) await savePlaylistToFile(pl, savePath);
    } else if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${pl.name}.json`; a.click();
    }
  }

  async function handleImport() {
    if (Platform.OS === 'web' && (window as any).electronAPI) {
      const paths: string[] = await (window as any).electronAPI.openFileDialog({
        filters: [{ name: 'Playlist', extensions: ['json'] }],
      });
      if (paths?.[0]) {
        const pl = await loadPlaylistFromFile(paths[0]);
        importPlaylist(pl);
      }
    } else if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const text = await file.text();
        const pl = JSON.parse(text);
        importPlaylist(pl);
      };
      input.click();
    }
  }

  function handlePlay(item: MediaItem, index: number) {
    setCurrentItem(item, index);
  }

  return (
    <View style={styles.container}>
      {/* Media Library Folder Picker (mobile only) */}
      <MediaLibraryPicker
        visible={mediaLibVisible}
        onClose={() => setMediaLibVisible(false)}
        onAdd={(newItems) => addItems(newItems)}
      />
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <Text style={styles.playlistName} numberOfLines={1}>
          {activePlaylist?.name ?? t('playlist')}
          <Text style={styles.itemCount}> ({items.length})</Text>
        </Text>

        <View style={styles.toolbarActions}>
          <TouchableOpacity onPress={handleAddFiles} style={styles.toolBtn}>
            <Ionicons name="add" size={18} color={COLORS.sub} />
            <Text style={styles.toolBtnText}>{t('addFiles')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAddDirectory} style={styles.toolBtn}>
            <Ionicons name="folder-open" size={16} color={COLORS.sub} />
            <Text style={styles.toolBtnText}>{t('addDir')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleImport} style={styles.toolBtn}>
            <Ionicons name="cloud-upload" size={16} color={COLORS.sub} />
            <Text style={styles.toolBtnText}>{t('importPlaylist')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExport} style={styles.toolBtn}>
            <Ionicons name="cloud-download" size={16} color={COLORS.sub} />
            <Text style={styles.toolBtnText}>{t('exportPlaylist')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearPlaylist} style={styles.toolBtn}>
            <Ionicons name="trash" size={16} color={COLORS.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="musical-notes" size={48} color={COLORS.border} />
          <Text style={styles.emptyText}>{t('emptyPlaylist')}</Text>
          <Text style={styles.emptySubText}>{t('emptyPlaylistSub')}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={({ item, index }) => (
            <PlaylistItem
              item={item}
              index={index}
              isActive={currentItem?.id === item.id}
              onPlay={() => handlePlay(item, index)}
              onRemove={() => removeItem(item.id)}
            />
          )}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  toolbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  playlistName: { color: COLORS.text, fontSize: 14, fontWeight: '600', flex: 1 },
  itemCount: { color: COLORS.sub, fontSize: 12, fontWeight: '400' },
  toolbarActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toolBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  toolBtnText: { color: COLORS.sub, fontSize: 11 },
  list: { flex: 1 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    gap: 8,
  },
  itemActive: { backgroundColor: COLORS.playing },
  itemHover: { backgroundColor: COLORS.hover },
  itemIndex: { color: COLORS.sub, fontSize: 11, width: 24, textAlign: 'right' },
  itemInfo: { flex: 1, overflow: 'hidden' },
  itemTitle: { color: COLORS.text, fontSize: 13 },
  itemArtist: { color: COLORS.sub, fontSize: 11, marginTop: 1 },
  itemDuration: { color: COLORS.sub, fontSize: 11 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
  emptyText: { color: COLORS.sub, fontSize: 16, fontWeight: '600' },
  emptySubText: { color: COLORS.border, fontSize: 13, textAlign: 'center' },
});
