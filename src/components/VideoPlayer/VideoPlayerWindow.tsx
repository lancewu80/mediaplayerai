/**
 * VideoPlayerWindow — cross-platform video player
 *
 * Backends:
 *   iOS / Android : react-native-vlc-media-player  (VLC, all formats)
 *   Electron      : mpv child process via IPC       (MPV, all formats + 4K)
 *   Web browser   : <video> HTML5 fallback
 *
 * Features:
 *   ✓ All formats (MKV, AVI, RMVB, HEVC, 4K, …)
 *   ✓ Embedded audio tracks + selection
 *   ✓ Subtitle overlay (SRT/ASS/VTT) with offset & style
 *   ✓ Online subtitle search (OpenSubtitles)
 *   ✓ Aspect ratio / speed control / screen lock / keep-awake
 *   ✓ Chromecast
 *   ✓ Fullscreen with auto-hiding controls
 *   ✓ Right-click context menu
 *   ✓ AI video info panel
 */

import React, {
  useState, useRef, useEffect, useCallback, Fragment,
} from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Platform, Animated, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { usePlayerStore } from '../../store/playerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useVideoStore } from '../../store/videoStore';

import { formatTime } from '../../services/audioService';
import { mpv, toVLCAspectRatio, toCSSObjectFit, getPlayerBackend } from '../../services/vlcService';
import { getActiveCues, SubtitleCue } from '../../services/subtitleService';

import AIInfoPanel from '../AIPanel/AIInfoPanel';
import SubtitlePanel from './SubtitlePanel';
import AspectRatioMenu from './AspectRatioMenu';
import AudioTrackMenu from './AudioTrackMenu';

const COLORS = {
  bg: '#000', overlay: 'rgba(0,0,0,0.6)',
  accent: '#e94560', active: '#00d4ff',
  text: '#fff', sub: '#cccccc', dim: '#888',
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Stable DOM id so we can always retrieve the real HTMLVideoElement via
// document.getElementById — React Native Web's ref gives back a host-component
// wrapper, NOT an HTMLVideoElement, so videoRef.current.currentTime is undefined.
const VIDEO_EL_ID = 'mpai-video-main';

/** Always returns the real <video> DOM element, bypassing RN-Web ref wrapping. */
function getDOMVideo(): HTMLVideoElement | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById(VIDEO_EL_ID) as HTMLVideoElement | null;
}

export default function VideoPlayerWindow({ visible, onClose }: Props) {
  // ── State & refs ────────────────────────────────────────────────────────────
  // videoRef is kept for legacy compatibility; real DOM access uses getDOMVideo()
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const vlcRef = useRef<any>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  const containerRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [aiPanelOpen, setAIPanelOpen] = useState(false);
  const [subtitlePanelOpen, setSubtitlePanelOpen] = useState(false);
  const [aspectMenuOpen, setAspectMenuOpen] = useState(false);
  const [audioMenuOpen, setAudioMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Subtitle cues state
  const [subtitleCues, setSubtitleCues] = useState<Record<string, SubtitleCue[]>>({});
  const [activeCueText, setActiveCueText] = useState('');

  const {
    currentItem, isPlaying, volume, isMuted,
    position, duration, playMode,
    setPlaying, setPosition, setDuration,
  } = usePlayerStore();
  const { getNextItem, getPrevItem, getFirstItem, getLastItem } = usePlaylistStore();
  const { currentIndex, setCurrentItem } = usePlayerStore();

  const {
    aspectRatio, activeSubtitleTrackId, subtitleOffset, subtitleStyle,
    playbackRate, isCasting, screenLocked,
    setAudioTracks, setSubtitleTracks, setActiveAudioTrack,
  } = useVideoStore();

  const backend = getPlayerBackend();

  // ── Native Fullscreen API ──────────────────────────────────────────────────
  // Sync React state with the browser's actual fullscreen state.
  // This handles the case where the user presses Escape to exit (browser does it
  // natively) as well as programmatic enter/exit.
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  function enterFullscreen() {
    const el: any = containerRef.current ?? document.documentElement;
    (el.requestFullscreen?.() ?? Promise.reject())
      .catch(() => {
        // Fallback: layout-only fullscreen (no OS fullscreen API available)
        setIsFullscreen(true);
      });
  }

  function exitFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      setIsFullscreen(false);
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement || isFullscreen) exitFullscreen();
    else enterFullscreen();
  }

  // ── Active subtitle cue ────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeSubtitleTrackId) { setActiveCueText(''); return; }
    const cues = subtitleCues[String(activeSubtitleTrackId)] ?? [];
    const active = getActiveCues(cues, position * 1000, subtitleOffset);
    setActiveCueText(active.map((c) => c.text).join('\n'));
  }, [position, activeSubtitleTrackId, subtitleCues, subtitleOffset]);

  // ── Web <video> native event listeners ────────────────────────────────────
  // React Native Web does NOT forward HTML5 media events (timeupdate, durationchange,
  // ended) via its synthetic event system.  Attach them the raw DOM way instead.
  // We also grab the real HTMLVideoElement here via getDOMVideo() so that later
  // imperative calls (currentTime, play, pause) hit the actual DOM node.
  useEffect(() => {
    if (backend !== 'html5' || !visible) return;

    // The <video> element mounts synchronously with the JSX render, but we wait
    // one tick so the DOM commit has definitely finished.
    const raf = requestAnimationFrame(() => {
      const video = getDOMVideo();
      if (!video) return;
      videoRef.current = video;   // sync the legacy ref

      function onTimeUpdate()     { setPosition(video.currentTime); }
      function onDurationChange() { const d = video.duration; setDuration(isFinite(d) ? d : 0); }
      function onEnded() {
        const next = getNextItem(
          usePlayerStore.getState().currentIndex,
          usePlayerStore.getState().playMode === 'shuffle',
        );
        if (next) usePlayerStore.getState().setCurrentItem(next.item, next.index);
        else      usePlayerStore.getState().setPlaying(false);
      }

      video.addEventListener('timeupdate',     onTimeUpdate);
      video.addEventListener('durationchange', onDurationChange);
      video.addEventListener('ended',          onEnded);

      return () => {
        video.removeEventListener('timeupdate',     onTimeUpdate);
        video.removeEventListener('durationchange', onDurationChange);
        video.removeEventListener('ended',          onEnded);
      };
    });

    return () => cancelAnimationFrame(raf);
  }, [visible, backend]);

  // ── Web <video> load new URI when item changes ─────────────────────────────
  useEffect(() => {
    if (backend !== 'html5' || !visible || !currentItem || currentItem.type !== 'video') return;

    // Give the DOM a frame to paint before we imperatively set src
    const raf = requestAnimationFrame(() => {
      const video = getDOMVideo();
      if (!video) return;
      videoRef.current = video;
      video.src = currentItem.uri;
      video.load();
      video.play().catch(() => {});
    });
    return () => cancelAnimationFrame(raf);
  }, [currentItem, visible]);

  // ── MPV Electron setup ─────────────────────────────────────────────────────
  useEffect(() => {
    if (backend !== 'mpv-electron' || !visible || !currentItem || currentItem.type !== 'video') return;

    mpv.open(currentItem.uri);

    const unsub = mpv.onStatus?.((s) => {
      setPosition(s.position);
      setDuration(s.duration);
      if (!s.paused !== isPlaying) setPlaying(!s.paused);

      // Map audio tracks
      const audio = s.audioTracks?.map((t) => ({
        id: t.id,
        name: t.title ?? `Track ${t.id}`,
        language: t.lang,
        codec: t.codec,
        channels: t.channels,
        isDefault: t.default,
      })) ?? [];
      setAudioTracks(audio);

      // Map subtitle tracks
      const subs = s.subtitleTracks?.map((t) => ({
        id: t.id,
        name: t.title ?? `Sub ${t.id}`,
        language: t.lang,
        isExternal: t.external,
        uri: t.externalFilename,
      })) ?? [];
      setSubtitleTracks(subs);
    });

    return () => { unsub?.(); };
  }, [currentItem, visible]);

  useEffect(() => {
    if (backend !== 'mpv-electron') return;
    isPlaying ? mpv.play() : mpv.pause();
  }, [isPlaying]);

  useEffect(() => {
    if (backend !== 'mpv-electron') return;
    mpv.setVolume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  useEffect(() => {
    if (backend !== 'mpv-electron') return;
    mpv.setSpeed(playbackRate);
  }, [playbackRate]);

  // Aspect ratio → MPV
  useEffect(() => {
    if (backend !== 'mpv-electron') return;
    const map: Record<string, string> = {
      'fit': '-1', 'fill': '16:9', 'stretch': '0',
      '16:9': '16:9', '4:3': '4:3', '1:1': '1:1', '21:9': '2.35:1',
    };
    mpv.setAspectRatio(map[aspectRatio] ?? '-1');
  }, [aspectRatio]);

  // Subtitle offset → MPV
  useEffect(() => {
    if (backend !== 'mpv-electron') return;
    mpv.setSubtitleDelay(subtitleOffset / 1000);
  }, [subtitleOffset]);

  // ── HTML5 play/pause ───────────────────────────────────────────────────────
  useEffect(() => {
    if (backend !== 'html5') return;
    const video = getDOMVideo();
    if (!video) return;
    isPlaying ? video.play().catch(() => {}) : video.pause();
  }, [isPlaying]);

  useEffect(() => {
    if (backend !== 'html5') return;
    const video = getDOMVideo();
    if (!video) return;
    video.volume = isMuted ? 0 : volume;
    video.playbackRate = playbackRate;
  }, [volume, isMuted, playbackRate]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    function handleKeyDown(e: KeyboardEvent) {
      // Don't steal keys from text inputs
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      switch (e.key) {
        case 'Escape':
          if (contextMenu) { setContextMenu(null); return; }
          if (document.fullscreenElement) return; // browser handles exit
          if (isFullscreen) { setIsFullscreen(false); return; }
          if (!screenLocked) onClose();
          return;

        case 'f': case 'F':
          e.preventDefault();
          toggleFullscreen();
          return;

        case ' ':                          // Space → play / pause
          e.preventDefault();
          usePlayerStore.getState().setPlaying(!usePlayerStore.getState().isPlaying);
          return;

        case 'ArrowLeft': {               // ← seek −5 s
          e.preventDefault();
          const v1 = getDOMVideo();
          handleSeek(Math.max(0, (v1?.currentTime ?? 0) - 5));
          return;
        }
        case 'ArrowRight': {              // → seek +5 s
          e.preventDefault();
          const v2 = getDOMVideo();
          const dur2 = v2 ? (isFinite(v2.duration) ? v2.duration : 0) : 0;
          if (dur2) handleSeek(Math.min(dur2, (v2?.currentTime ?? 0) + 5));
          return;
        }
        case 'j': case 'J': {            // J seek −10 s (YouTube style)
          e.preventDefault();
          const v3 = getDOMVideo();
          handleSeek(Math.max(0, (v3?.currentTime ?? 0) - 10));
          return;
        }
        case 'l': case 'L': {            // L seek +10 s
          e.preventDefault();
          const v4 = getDOMVideo();
          const dur4 = v4 ? (isFinite(v4.duration) ? v4.duration : 0) : 0;
          if (dur4) handleSeek(Math.min(dur4, (v4?.currentTime ?? 0) + 10));
          return;
        }
        case 'ArrowUp': {                 // ↑ volume +10%
          e.preventDefault();
          const s = usePlayerStore.getState();
          s.setVolume(Math.min(1, s.volume + 0.1));
          return;
        }
        case 'ArrowDown': {               // ↓ volume −10%
          e.preventDefault();
          const s = usePlayerStore.getState();
          s.setVolume(Math.max(0, s.volume - 0.1));
          return;
        }
        case 'n': case 'N':              // N next
          handleNext();
          return;
        case 'p': case 'P':              // P prev
          handlePrev();
          return;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, isFullscreen, contextMenu, screenLocked, onClose]);

  // ── Controls auto-hide ─────────────────────────────────────────────────────
  const showControls = useCallback(() => {
    setControlsVisible(true);
    Animated.timing(controlsOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    if (isFullscreen) {
      controlsTimer.current = setTimeout(() => {
        Animated.timing(controlsOpacity, { toValue: 0, duration: 500, useNativeDriver: true })
          .start(() => setControlsVisible(false));
      }, 3500);
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) {
      setControlsVisible(true);
      Animated.timing(controlsOpacity, { toValue: 1, duration: 0, useNativeDriver: true }).start();
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    } else {
      showControls();
    }
  }, [isFullscreen]);

  // ── Transport ──────────────────────────────────────────────────────────────
  function handleSeek(pos: number) {
    if (backend === 'mpv-electron') {
      mpv.seek(pos);
    } else {
      const video = getDOMVideo();
      if (video) video.currentTime = pos;
    }
    setPosition(pos);
  }

  function handleFirst()  { const r = getFirstItem();                                   if (r) setCurrentItem(r.item, r.index); }
  function handleLast()   { const r = getLastItem();                                    if (r) setCurrentItem(r.item, r.index); }
  function handlePrev()   { const r = getPrevItem(currentIndex);                        if (r) setCurrentItem(r.item, r.index); }
  function handleNext()   { const r = getNextItem(currentIndex, playMode === 'shuffle'); if (r) setCurrentItem(r.item, r.index); }

  // Read currentTime/duration directly from the real DOM element to avoid
  // stale-closure bugs and React Native Web ref-wrapping issues.
  function handleBack10() {
    const video = getDOMVideo();
    const cur = video?.currentTime ?? position;
    handleSeek(Math.max(0, cur - 10));
  }
  function handleFwd10() {
    const video = getDOMVideo();
    const cur = video?.currentTime ?? position;
    const dur = video ? (isFinite(video.duration) ? video.duration : 0) : duration;
    if (!dur) return;
    handleSeek(Math.min(dur, cur + 10));
  }

  // ── Audio track ────────────────────────────────────────────────────────────
  function handleAudioTrackChange(id: number | string) {
    if (backend === 'mpv-electron') mpv.setAudioTrack(Number(id));
  }

  // ── Subtitle cues loaded ───────────────────────────────────────────────────
  function handleLoadCues(cues: SubtitleCue[], trackId: string) {
    setSubtitleCues((prev) => ({ ...prev, [trackId]: cues }));
    // MPV: pass external sub file if available
    if (backend === 'mpv-electron') {
      const track = useVideoStore.getState().subtitleTracks.find((t) => String(t.id) === trackId);
      if (track?.uri) mpv.setSubtitleFile(track.uri);
    }
  }

  const progress = duration > 0 ? position / duration : 0;

  if (!visible || !currentItem || currentItem.type !== 'video') return null;

  // ── Subtitle overlay renderer (web / Electron) ────────────────────────────
  const SubtitleOverlay = activeCueText ? (
    <View
      style={[
        styles.subtitleOverlay,
        subtitleStyle.position === 'top' ? { top: 60 } : { bottom: isFullscreen ? 80 : 60 },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.subtitleBox, { backgroundColor: subtitleStyle.backgroundColor }]}>
        <Text style={{
          color: subtitleStyle.color,
          fontSize: subtitleStyle.fontSize,
          fontWeight: subtitleStyle.bold ? '700' : '400',
          textAlign: 'center',
          textShadowColor: subtitleStyle.outline ? '#000' : 'transparent',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: subtitleStyle.outline ? 4 : 0,
        }}>
          {activeCueText}
        </Text>
      </View>
    </View>
  ) : null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={screenLocked ? undefined : onClose}
      statusBarTranslucent
    >
      <View
        // @ts-ignore web — ref needed for requestFullscreen()
        ref={containerRef}
        style={[styles.window, isFullscreen && styles.fullscreen]}
        // @ts-ignore web
        onContextMenu={(e: any) => { e.preventDefault?.(); setContextMenu({ x: e.clientX, y: e.clientY }); }}
        onMouseMove={showControls}
        onClick={() => contextMenu && setContextMenu(null)}
      >
        {/* ── Video surface ── */}
        {backend === 'html5' && (
          // @ts-ignore — raw HTML element; ref wrapping is bypassed via getDOMVideo()
          <video
            id={VIDEO_EL_ID}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: toCSSObjectFit(aspectRatio),
              cursor: 'pointer',
              backgroundColor: '#000',
            } as any}
            // timeupdate / durationchange / ended are wired via native addEventListener
            // in the useEffect above to avoid React Native Web synthetic-event limitations.
            onClick={() => toggleFullscreen()}
          />
        )}

        {backend === 'vlc-native' && (
          <VLCPlayer
            vlcRef={vlcRef}
            uri={currentItem.uri}
            paused={!isPlaying}
            volume={isMuted ? 0 : volume}
            rate={playbackRate}
            aspectRatio={toVLCAspectRatio(aspectRatio)}
            onProgress={({ currentTime, duration: d }) => {
              setPosition(currentTime);
              if (d) setDuration(d);
            }}
            onEnd={() => {
              const next = getNextItem(currentIndex, playMode === 'shuffle');
              if (next) setCurrentItem(next.item, next.index);
              else setPlaying(false);
            }}
            onLoad={(meta: any) => {
              setAudioTracks(meta?.audioTracks ?? []);
              setSubtitleTracks(meta?.textTracks ?? []);
            }}
            onPress={() => setPlaying(!isPlaying)}
          />
        )}

        {backend === 'mpv-electron' && (
          // MPV renders into a native window overlay; show placeholder
          <View style={styles.mpvPlaceholder}>
            <Ionicons name="film" size={48} color="#333" />
            <Text style={styles.mpvText}>MPV Player (native window)</Text>
          </View>
        )}

        {/* ── Subtitle overlay ── */}
        {SubtitleOverlay}

        {/* ── Window header (non-fullscreen) ── */}
        {!isFullscreen && (
          <View style={styles.windowHeader}>
            <Text style={styles.windowTitle} numberOfLines={1}>{currentItem.title}</Text>
            <View style={styles.windowHeaderRight}>
              <HeaderBtn icon="sparkles"   onPress={() => setAIPanelOpen(!aiPanelOpen)} active={aiPanelOpen} />
              <HeaderBtn icon="expand"      onPress={() => enterFullscreen()} />
              <HeaderBtn icon="close"       onPress={onClose} color={COLORS.accent} />
            </View>
          </View>
        )}

        {/* ── AI panel (non-fullscreen) ── */}
        {!isFullscreen && aiPanelOpen && (
          <View style={styles.aiPanel}>
            <AIInfoPanel mediaType="video" />
          </View>
        )}

        {/* ── Casting badge ── */}
        {isCasting && (
          <View style={styles.castBadge}>
            <Ionicons name="cast" size={14} color={COLORS.active} />
            <Text style={styles.castText}>Casting</Text>
          </View>
        )}

        {/* ── Screen lock indicator ── */}
        {screenLocked && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={14} color="#fff" />
          </View>
        )}

        {/* ── Controls overlay ── */}
        <Animated.View
          style={[
            styles.controlsBar,
            isFullscreen && styles.controlsBarFs,
            { opacity: controlsOpacity },
          ]}
          pointerEvents={controlsVisible || !isFullscreen ? 'auto' : 'none'}
        >
          {/* Fullscreen header */}
          {isFullscreen && (
            <View style={styles.fsHeader}>
              <Text style={styles.fsTitle} numberOfLines={1}>{currentItem.title}</Text>
              <View style={styles.fsHeaderRight}>
                <HeaderBtn icon="sparkles"   onPress={() => setAIPanelOpen(!aiPanelOpen)} active={aiPanelOpen} />
                <HeaderBtn icon="contract"   onPress={() => exitFullscreen()} />
                <HeaderBtn icon="close"      onPress={onClose} color={COLORS.accent} />
              </View>
            </View>
          )}

          {/* Progress bar */}
          <View style={styles.progressRow}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <View
              style={styles.progressTrack}
              // @ts-ignore web click
              onClick={(e: any) => {
                const dur = videoRef.current?.duration ?? duration;
                if (!dur) return;
                const rect = e.currentTarget.getBoundingClientRect();
                handleSeek(((e.clientX - rect.left) / rect.width) * dur);
              }}
            >
              <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
              <View style={[styles.progressThumb, { left: `${progress * 100}%` as any }]} />
            </View>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          {/* Buttons row */}
          <View style={styles.buttonsRow}>
            {/* Transport */}
            <CtrlBtn icon="play-skip-back"   onPress={handleFirst} />
            <CtrlBtn icon="play-back"        onPress={handlePrev}  />
            <CtrlBtn icon="remove-circle-outline" onPress={handleBack10} label="-10s" />
            <TouchableOpacity onPress={() => setPlaying(!isPlaying)} style={styles.playBtn}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color="#000" />
            </TouchableOpacity>
            <CtrlBtn icon="add-circle-outline" onPress={handleFwd10} label="+10s" />
            <CtrlBtn icon="play-forward"      onPress={handleNext}  />
            <CtrlBtn icon="play-skip-forward" onPress={handleLast}  />

            <View style={styles.spacer} />

            {/* Volume */}
            <Ionicons name={isMuted ? 'volume-mute' : 'volume-medium'} size={16} color={COLORS.sub}
              // @ts-ignore
              onClick={() => usePlayerStore.getState().setMuted(!isMuted)}
              style={{ cursor: 'pointer' }}
            />
            {Platform.OS === 'web' && (
              <input
                type="range" min={0} max={1} step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  usePlayerStore.getState().setMuted(false);
                  usePlayerStore.getState().setVolume(Number(e.target.value));
                }}
                style={{ width: 80, accentColor: COLORS.accent, cursor: 'pointer' }}
              />
            )}

            {/* Feature buttons */}
            <FeatBtn icon="text"          onPress={() => setSubtitlePanelOpen(true)} tooltip="Subtitles" />
            <FeatBtn icon="musical-notes" onPress={() => setAudioMenuOpen(true)}    tooltip="Audio / Cast" />
            <FeatBtn icon="scan"          onPress={() => setAspectMenuOpen(true)}   tooltip="Aspect / Speed" />
            {isCasting && (
              <Ionicons name="cast" size={18} color={COLORS.active} style={{ marginLeft: 6 }} />
            )}
          </View>

          {/* AI panel (fullscreen) */}
          {isFullscreen && aiPanelOpen && (
            <View style={styles.fsAiPanel}>
              <AIInfoPanel mediaType="video" />
            </View>
          )}
        </Animated.View>

        {/* ── Context menu ── */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x} y={contextMenu.y}
            isFullscreen={isFullscreen}
            isPlaying={isPlaying}
            aiPanelOpen={aiPanelOpen}
            onFullscreen={() => { toggleFullscreen(); setContextMenu(null); }}
            onAI={() => { setAIPanelOpen((v) => !v); setContextMenu(null); }}
            onSubtitles={() => { setSubtitlePanelOpen(true); setContextMenu(null); }}
            onAudio={() => { setAudioMenuOpen(true); setContextMenu(null); }}
            onPlayPause={() => { setPlaying(!isPlaying); setContextMenu(null); }}
            onClose={() => { onClose(); setContextMenu(null); }}
            onDismiss={() => setContextMenu(null)}
          />
        )}
      </View>

      {/* ── Panels (rendered outside main view to avoid z-index issues) ── */}
      <SubtitlePanel
        visible={subtitlePanelOpen}
        onClose={() => setSubtitlePanelOpen(false)}
        onLoadCues={handleLoadCues}
      />
      <AspectRatioMenu
        visible={aspectMenuOpen}
        onClose={() => setAspectMenuOpen(false)}
      />
      <AudioTrackMenu
        visible={audioMenuOpen}
        onClose={() => setAudioMenuOpen(false)}
        onAudioTrackChange={handleAudioTrackChange}
      />
    </Modal>
  );
}

// ─── Helper: VLC component wrapper (mobile only) ──────────────────────────────

function VLCPlayer({ vlcRef, uri, paused, volume, rate, aspectRatio, onProgress, onEnd, onLoad, onPress }: any) {
  // Lazy import so web/Electron bundles don't explode
  const [VLC, setVLC] = useState<any>(null);
  useEffect(() => {
    import('react-native-vlc-media-player').then((m) => setVLC(() => m.default)).catch(() => {});
  }, []);

  if (!VLC) return <View style={styles.mpvPlaceholder}><Text style={styles.mpvText}>Loading VLC…</Text></View>;

  return (
    <VLC
      ref={vlcRef}
      source={{ uri }}
      paused={paused}
      volume={Math.round(volume * 200)}
      rate={rate}
      videoAspectRatio={aspectRatio}
      onProgress={onProgress}
      onEnd={onEnd}
      onLoad={onLoad}
      onPress={onPress}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' } as any}
      resizeMode="contain"
    />
  );
}

// ─── Small helper components ──────────────────────────────────────────────────

function HeaderBtn({ icon, onPress, active = false, color }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.headerBtn}>
      <Ionicons name={icon} size={17} color={color ?? (active ? COLORS.active : COLORS.dim)} />
    </TouchableOpacity>
  );
}

function CtrlBtn({ icon, onPress, label }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.ctrlBtn}
      // @ts-ignore web — belt-and-suspenders: also handle native DOM click
      // so the button works even if RN-Web's touch system has issues in Electron.
      onClick={(e: any) => { e.stopPropagation(); onPress?.(); }}
    >
      {label
        ? <Text style={styles.ctrlLabel}>{label}</Text>
        : <Ionicons name={icon} size={18} color={COLORS.text} />}
    </TouchableOpacity>
  );
}

function FeatBtn({ icon, onPress, tooltip }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.featBtn} accessibilityLabel={tooltip}>
      <Ionicons name={icon} size={17} color={COLORS.sub} />
    </TouchableOpacity>
  );
}

function ContextMenu({ x, y, isFullscreen, isPlaying, aiPanelOpen,
  onFullscreen, onAI, onSubtitles, onAudio, onPlayPause, onClose, onDismiss }: any) {
  const items = [
    { icon: isFullscreen ? 'contract' : 'expand',     label: isFullscreen ? '退出全螢幕 (Esc)' : '全螢幕',    action: onFullscreen },
    { icon: isPlaying ? 'pause' : 'play',              label: isPlaying ? '暫停' : '播放',                    action: onPlayPause },
    { icon: 'text',                                    label: '字幕…',                                        action: onSubtitles },
    { icon: 'musical-notes',                           label: '音軌 / 投放…',                                 action: onAudio },
    { icon: 'sparkles',                                label: aiPanelOpen ? '隱藏 AI 資訊' : 'AI 影片資訊',   action: onAI },
    { icon: 'arrow-back',                              label: '返回播放器 (Esc)',                              action: onClose, danger: false, hint: true },
    { icon: 'close-circle',                            label: '關閉播放器',                                   action: onClose, danger: true },
  ];
  return (
    <>
      {/* Dismiss on backdrop click */}
      <TouchableOpacity
        style={StyleSheet.absoluteFillObject}
        onPress={onDismiss}
        activeOpacity={1}
      />
      <View style={[styles.ctxMenu, { top: y, left: x }]}>
        {items.map((item, i) => (
          <React.Fragment key={i}>
            {item.hint && <View style={styles.ctxDivider} />}
            <TouchableOpacity onPress={item.action} style={styles.ctxItem}>
              <Ionicons name={item.icon as any} size={14} color={item.danger ? COLORS.accent : item.hint ? COLORS.sub : '#fff'} />
              <Text style={[styles.ctxText, item.danger && { color: COLORS.accent }, item.hint && { color: COLORS.sub }]}>{item.label}</Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  window: {
    flex: 1, backgroundColor: '#000',
    width: '100%' as any, height: '100%' as any,
  } as any,
  fullscreen: {},   // Modal already fills the screen; fullscreen just hides the header
  mpvPlaceholder: {
    position: 'absolute', inset: 0,
    alignItems: 'center', justifyContent: 'center', gap: 12,
  } as any,
  mpvText: { color: '#444', fontSize: 14 },

  // Header
  windowHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 12, paddingVertical: 8, zIndex: 10,
  },
  windowTitle: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
  windowHeaderRight: { flexDirection: 'row', gap: 2 },
  headerBtn: { padding: 7 },

  aiPanel: {
    backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 10, maxHeight: 220, borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },

  // Badges
  castBadge: {
    position: 'absolute', top: 48, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,212,255,0.15)',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#00d4ff', zIndex: 20,
  } as any,
  castText: { color: '#00d4ff', fontSize: 11, fontWeight: '700' },
  lockBadge: {
    position: 'absolute', top: 12, left: 12, zIndex: 30,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 8,
  } as any,

  // Subtitle overlay
  subtitleOverlay: {
    position: 'absolute', left: 0, right: 0, zIndex: 25,
    alignItems: 'center', paddingHorizontal: 16,
  } as any,
  subtitleBox: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, maxWidth: '90%' },

  // Controls bar
  controlsBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 12, paddingVertical: 10, zIndex: 20,
  } as any,
  controlsBarFs: { position: 'absolute', bottom: 0 },
  fsHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 6,
  },
  fsTitle: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
  fsHeaderRight: { flexDirection: 'row', gap: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  timeText: { color: '#ccc', fontSize: 11, width: 40 },
  progressTrack: {
    flex: 1, height: 4, backgroundColor: '#555',
    borderRadius: 2, overflow: 'visible', position: 'relative',
    cursor: 'pointer' as any,
  },
  progressFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 2 },
  progressThumb: {
    position: 'absolute', top: -4, width: 12, height: 12,
    borderRadius: 6, backgroundColor: '#fff',
    transform: [{ translateX: -6 }],
  } as any,
  buttonsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  playBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 4,
  },
  ctrlBtn: { padding: 7 },
  ctrlLabel: { color: COLORS.sub, fontSize: 11 },
  featBtn: { padding: 7, marginLeft: 2 },
  spacer: { flex: 1 },
  fsAiPanel: {
    marginTop: 8, backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 8, maxHeight: 200,
  },

  // Context menu
  ctxMenu: {
    position: 'absolute', backgroundColor: '#1e1e2e',
    borderRadius: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#3a3a5a',
    minWidth: 200, zIndex: 100,
    shadowColor: '#000', shadowOpacity: 0.6,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  } as any,
  ctxDivider: {
    height: 1, backgroundColor: '#3a3a5a', marginVertical: 3, marginHorizontal: 10,
  },
  ctxItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  ctxText: { color: '#fff', fontSize: 13 },
});
