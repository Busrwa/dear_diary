import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Animated, BackHandler, Keyboard, Modal, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View, ScrollView, KeyboardAvoidingView, Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import {
  RichEditor,
  RichToolbar,
  actions,
  type IconRecord,
} from 'react-native-pell-rich-editor';
import { Note } from './src/types/note';
import { PAPER_THEMES, PaperTheme } from './src/papers/paperThemes';
import { initDatabase, listNotes, saveNote, deleteNote } from './src/database/notesRepository';
import { exportNotePdf } from './src/services/pdfExport';
import { NoteCard } from './src/components/NoteCard';
import LottieView from 'lottie-react-native';

type Screen = 'list' | 'editor';



function CowEasterEgg() {
  const { width, height } = useWindowDimensions();
  const cowSize = Math.min(width * 0.28, 140);
  const startX = width;
  const endX = -cowSize;
  const cowBottom = Math.max(90, height * 0.12);
  const [cowIndex, setCowIndex] = useState<0 | 1>(0);
  const [visible, setVisible] = useState(false);

  const translateX = React.useRef(
    new Animated.Value(width + cowSize)
  ).current;

  useEffect(() => {
    let cancelled = false;
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let animation: Animated.CompositeAnimation | undefined;

    const scheduleNext = () => {
      // Her inek göründükten sonra 45–75 saniye bekle.
      const waitTime = 12000 + Math.random() * 8000;

      showTimer = setTimeout(() => {
        if (cancelled) return;

        const selectedCow: 0 | 1 =
          Math.random() < 0.5 ? 0 : 1;

        setCowIndex(selectedCow);
        setVisible(true);

        if (selectedCow === 0) {
          // Yürüyen inek: sağdan sola yalnızca bir geçiş.
          translateX.setValue(startX);

          animation = Animated.timing(translateX, {
            toValue: endX,
            duration: Math.max(
              4000,
              ((width + cowSize * 2) / 350) * 1000
            ),
            useNativeDriver: true,
          });

          animation.start(({ finished }) => {
            if (!finished || cancelled) return;

            setVisible(false);
            scheduleNext();
          });
        } else {
          // Süt içen inek: sağ altta sabit durur.
          translateX.setValue(Math.max(0, width - cowSize - 16));

          // 6 saniye sonra kaybolur.
          hideTimer = setTimeout(() => {
            if (cancelled) return;

            setVisible(false);
            scheduleNext();
          }, 6000);
        }
      }, waitTime);
    };

    scheduleNext();

    return () => {
      cancelled = true;

      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);

      animation?.stop();
      translateX.stopAnimation();
    };
  }, [width, translateX]);

  if (!visible) return null;

  const cowSource =
    cowIndex === 0
      ? require('./assets/animations/cow1.json')
      : require('./assets/animations/cow2.json');

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        bottom: cowBottom,
        width: cowSize,
        height: cowSize,
        transform: [{ translateX }],
        zIndex: 999,
        elevation: 10,
      }}
    >
      <LottieView
        source={cowSource}
        autoPlay
        loop={false}
        style={{ width: cowSize, height: cowSize }}
      />
    </Animated.View>
  );
}



function AppContent() {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [screen, setScreen] = useState<Screen>('list');
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [html, setHtml] = useState('');
  const [paper, setPaper] = useState<PaperTheme>(PAPER_THEMES[0]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('Kaydedildi');
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [themePickerMode, setThemePickerMode] = useState<'new' | 'change'>('new');
  const [noteForThemeChange, setNoteForThemeChange] = useState<Note | null>(null);

  const editorRef = React.useRef<RichEditor>(null);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestHtml = React.useRef('');
  const latestTitle = React.useRef('');
  const latestPaperId = React.useRef(PAPER_THEMES[0].id);

  const [showFormatting, setShowFormatting] = useState(false);
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  // Sadece iOS: klavye yüksekliği. Android'de her zaman 0 kalır (davranış değişmez).
  const [iosKeyboardHeight, setIosKeyboardHeight] = useState(0);
  const iosKeyboardShift = Math.max(0, iosKeyboardHeight - insets.bottom);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const showSub = Keyboard.addListener('keyboardWillShow', e =>
      setIosKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener('keyboardWillHide', () =>
      setIosKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const database = await SQLite.openDatabaseAsync('dear-diary.db');
      await initDatabase(database);
      const rows = await listNotes(database);
      if (mounted) {
        setDb(database);
        setNotes(rows);
      }
    })().catch((error) => {
      console.error(error);
      Alert.alert('Başlatılamadı', 'Yerel not veritabanı hazırlanırken bir sorun oluştu.');
    });
    return () => {
      mounted = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const refreshNotes = useCallback(async () => {
    if (db) setNotes(await listNotes(db));
  }, [db]);

  const openNewNote = () => {
    setThemePickerMode('new');
    setNoteForThemeChange(null);
    setShowThemePicker(true);
  };

  const createNewNoteWithTheme = (selectedPaper: PaperTheme) => {
    const now = Date.now();

    const note: Note = {
      id: `note-${now}-${Math.random().toString(36).slice(2, 8)}`,
      title: '',
      contentHtml: '<p><br></p>',
      paperId: selectedPaper.id,
      createdAt: now,
      updatedAt: now,
    };

    setActiveNote(note);
    setTitle('');
    setHtml('<p><br></p>');
    latestTitle.current = '';
    latestHtml.current = '<p><br></p>';
    latestPaperId.current = selectedPaper.id;
    setPaper(selectedPaper);
    setSaveMessage('Henüz kaydedilmedi');
    setShowThemePicker(false);
    setScreen('editor');
  };

  const changeNoteTheme = async (selectedPaper: PaperTheme) => {
    if (!db || !noteForThemeChange) return;

    try {
      const updatedNote: Note = {
        ...noteForThemeChange,
        paperId: selectedPaper.id,
        updatedAt: Date.now(),
      };

      await saveNote(db, updatedNote);
      setNotes(await listNotes(db));

      if (activeNote?.id === updatedNote.id) {
        setActiveNote(updatedNote);
        setPaper(selectedPaper);
        latestPaperId.current = selectedPaper.id;
      }

      setShowThemePicker(false);
      setNoteForThemeChange(null);
    } catch (error) {
      console.error(error);
      Alert.alert('Tema değiştirilemedi', 'Lütfen tekrar deneyin.');
    }
  };

  const selectTheme = (selectedPaper: PaperTheme) => {
    if (themePickerMode === 'new') {
      createNewNoteWithTheme(selectedPaper);
    } else {
      void changeNoteTheme(selectedPaper);
    }
  };

  const openNote = (note: Note) => {
    setActiveNote(note);
    setTitle(note.title);
    setHtml(note.contentHtml || '<p><br></p>');
    latestTitle.current = note.title;
    latestHtml.current = note.contentHtml || '<p><br></p>';
    latestPaperId.current = note.paperId;
    setPaper(PAPER_THEMES.find(p => p.id === note.paperId) ?? PAPER_THEMES[0]);
    setSaveMessage('Kaydedildi');
    setScreen('editor');
  };

  const persist = useCallback(async (manual = false) => {
    if (!db || !activeNote) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setSaving(true);
    setSaveMessage('Kaydediliyor…');
    try {
      const updated: Note = {
        ...activeNote,
        title: latestTitle.current.trim(),
        contentHtml: latestHtml.current || '<p><br></p>',
        paperId: latestPaperId.current,
        updatedAt: Date.now(),
      };
      await saveNote(db, updated);
      setActiveNote(updated);
      setNotes(await listNotes(db));
      setSaving(false);
      setSaveMessage(manual ? 'Kaydedildi' : 'Otomatik kaydedildi');
    } catch (error) {
      console.error(error);
      setSaving(false);
      setSaveMessage('Kayıt başarısız');
      Alert.alert('Kaydedilemedi', 'Not cihazınıza kaydedilemedi. Lütfen yeniden deneyin.');
    }
  }, [db, activeNote]);

  const scheduleSave = useCallback(() => {
    setSaveMessage('Değişiklik var');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void persist(false); }, 650);
  }, [persist]);

  useEffect(() => {
    latestTitle.current = title;
    if (screen === 'editor' && activeNote && title !== activeNote.title) scheduleSave();
  }, [title]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    latestPaperId.current = paper.id;
    if (screen === 'editor' && activeNote && paper.id !== activeNote.paperId) scheduleSave();
  }, [paper]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleContentChange = (value: string) => {
    setHtml(value);
    latestHtml.current = value;
    scheduleSave();
  };

  const goBack = async () => {
    setShowFormatting(false);
    if (saveTimer.current) await persist(false);
    setScreen('list');
    setActiveNote(null);
  };

  // Android geri tuşu: panel açıksa kapat, editördeyse kaydedip listeye dön.
  const backPressRef = React.useRef<() => boolean>(() => false);
  backPressRef.current = () => {
    if (screen !== 'editor') return false;
    if (showFormatting) {
      setShowFormatting(false);
      return true;
    }
    void goBack();
    return true;
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () =>
      backPressRef.current()
    );
    return () => sub.remove();
  }, []);

  const handleDelete = (note: Note) => {
    setNoteToDelete(note);
  };

  const confirmDelete = async () => {
    if (!db || !noteToDelete) return;

    try {
      await deleteNote(db, noteToDelete.id);
      setNotes(await listNotes(db));

      if (activeNote?.id === noteToDelete.id) {
        setActiveNote(null);
        setScreen('list');
      }

      setNoteToDelete(null);
    } catch (error) {
      console.error(error);
      setNoteToDelete(null);
      Alert.alert('Silinemedi', 'Not silinirken bir sorun oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleExport = async () => {
    if (!activeNote) return;
    // Son düzenlemeyi dışa aktarmadan önce kalıcılaştır.
    if (saveTimer.current) await persist(true);
    try {
      await exportNotePdf({
        title: latestTitle.current || 'Dear Diary',
        contentHtml: latestHtml.current,
        paper: PAPER_THEMES.find(p => p.id === latestPaperId.current) ?? PAPER_THEMES[0],
      });
    } catch (error) {
      console.error(error);
      Alert.alert('PDF oluşturulamadı', 'Lütfen tekrar deneyin.');
    }
  };
  const themePickerModal = (
    <Modal
      visible={showThemePicker}
      transparent
      animationType="fade"
      onRequestClose={() => setShowThemePicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>
            {themePickerMode === 'new' ? 'Sayfanı seç ✿' : 'Temanı değiştir'}
          </Text>

          <Text style={styles.modalMessage}>
            Sana en güzel gelen kâğıdı seç.
          </Text>

          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {PAPER_THEMES.map(item => (
              <TouchableOpacity
                key={item.id}
                onPress={() => selectTheme(item)}
                style={styles.themeOption}
              >
                <View
                  style={[
                    styles.themePreview,
                    { backgroundColor: item.backgroundColor },
                  ]}
                >
                  <Text style={{ color: item.textColor, fontSize: 10 }}>
                    Sevgili günlük...
                  </Text>

                  {item.id === 'lined-blue' && (
                    <View style={styles.previewLines} />
                  )}

                  {item.id === 'grid-sage' && (
                    <View style={styles.previewGrid} />
                  )}
                </View>

                <Text style={styles.themeOptionText}>{item.name}</Text>
                <Text style={styles.themeArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.themeCancelButton}
            onPress={() => setShowThemePicker(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.themeCancelButtonText}>Vazgeç</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const deleteModal = (
    <Modal
      visible={noteToDelete !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setNoteToDelete(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalIcon}>
            <Text style={styles.modalEmoji}>✿</Text>
          </View>

          <Text style={styles.modalTitle}>Bu sayfayı silelim mi?</Text>

          <Text style={styles.modalMessage}>
            “{noteToDelete?.title.trim() || 'Başlıksız not'}” kalıcı olarak silinecek.
            Bu işlem geri alınamaz.
          </Text>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setNoteToDelete(null)}
            >
              <Text style={styles.cancelButtonText}>Vazgeç</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteConfirmButton}
              onPress={() => void confirmDelete()}
            >
              <Text style={styles.deleteConfirmText}>Evet, sil</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (!db) {
    return (
      <SafeAreaView style={styles.loading}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.brand}>Dear Diary</Text>
        <Text style={styles.muted}>Günlüğün hazırlanıyor…</Text>
      </SafeAreaView>
    );
  }

  if (screen === 'list') {
    return (
      <SafeAreaView style={styles.container}>
        {themePickerModal}
        {deleteModal}
        <CowEasterEgg />
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Dear Diary</Text>
            <Text style={styles.subtitle}>Kendine ait küçük bir alan.</Text>
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={openNewNote} accessibilityLabel="Yeni not oluştur">
            <Text style={styles.primaryButtonText}>＋ Yeni</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.noteList}>
          {notes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>✿</Text>
              <Text style={styles.emptyTitle}>İlk sayfan seni bekliyor.</Text>
              <Text style={styles.muted}>Yeni bir not oluştur ve aklından geçenleri yaz.</Text>
            </View>
          ) : notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onPress={() => openNote(note)}
              onDelete={() => handleDelete(note)}
              onChangeTheme={() => {
                setThemePickerMode('change');
                setNoteForThemeChange(note);
                setShowThemePicker(true);
              }}
            />
          ))}
        </ScrollView>
        <Text style={styles.footer}>Yaz, sakla, kendine dön.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {themePickerModal}
      {deleteModal}
      <StatusBar barStyle="dark-content" />
      <View style={styles.editorHeader}>
        <TouchableOpacity onPress={goBack} style={styles.headerAction}>
          <Text style={styles.headerActionText}>‹ Notlar</Text>
        </TouchableOpacity>
        <Text style={styles.saveStatus}>{saving ? 'Kaydediliyor…' : saveMessage}</Text>
        <TouchableOpacity onPress={() => void persist(true)} style={styles.headerAction}>
          <Text style={styles.headerActionText}>Kaydet</Text>
        </TouchableOpacity>
      </View>



      <View style={[styles.editorContent, { paddingBottom: iosKeyboardShift }]}>
        <KeyboardAvoidingView
          style={styles.editorBody}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
          enabled={Platform.OS !== 'ios'}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.paperOuter}>
            <View style={[styles.paper, { backgroundColor: paper.backgroundColor }]}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Bugünün başlığı…"
                placeholderTextColor="#9B8E84"
                style={[styles.noteTitle, { color: paper.textColor }]}
                multiline
                maxLength={120}
              />

              <RichEditor
                ref={editorRef}
                initialContentHTML={html}
                onChange={handleContentChange}
                placeholder="Sevgili günlük…"
                style={[styles.richEditor, { backgroundColor: paper.backgroundColor }]}
                editorStyle={{
                  backgroundColor: paper.backgroundColor,
                  color: paper.textColor,
                  placeholderColor: '#9B8E84',

                  contentCSSText: `
                  font-family: Georgia, 'Noto Serif', serif;
                  font-size: 16px;
                  line-height: 1.7;
                  background-color: ${paper.backgroundColor};
                  color: ${paper.textColor};
                  ${paper.css}
                `,

                }}
                useContainer={false}
                initialHeight={420}
              />

            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.formatButtonRow}>
          <TouchableOpacity
            onPress={() => setShowFormatting(true)}
            style={styles.fixedFormatButton}
            accessibilityLabel="Biçimlendirme araçlarını aç"
            activeOpacity={0.85}
          >
            <Text style={styles.fixedFormatButtonText}>Aa  Biçimlendir</Text>
            <Text style={styles.fixedFormatButtonArrow}>⌃</Text>
          </TouchableOpacity>
        </View>


        <View style={styles.bottomBar}>
          <Text style={styles.bottomHint}>Bu not cihazında saklanır.</Text>
          <TouchableOpacity style={styles.exportButton} onPress={() => void handleExport()}>
            <Text style={styles.exportButtonText}>PDF dışa aktar ↗</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showFormatting && (
        <View
          style={[
            styles.formatInlineOverlay,
            iosKeyboardHeight > 0 && { bottom: iosKeyboardHeight },
          ]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.formatPanel,
              {
                maxHeight: (screenHeight - iosKeyboardHeight) * 0.6,
                paddingBottom: (iosKeyboardHeight > 0 ? 12 : Math.max(insets.bottom, 12)) + 8,
              },
            ]}
          >
            <View style={styles.formatPanelHeader}>
              <View>
                <Text style={styles.formatPanelTitle}>Yazı araçları</Text>
                <Text style={styles.formatPanelSubtitle}>
                  Metnini dilediğin gibi düzenle.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowFormatting(false)}
                style={styles.formatCloseButton}
                accessibilityLabel="Paneli kapat"
              >
                <Text style={styles.formatCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <RichToolbar
                editor={editorRef}
                actions={[
                  actions.setBold,
                  actions.setItalic,
                  actions.setUnderline,
                  actions.heading1,
                  actions.heading2,
                  'paragraph',
                  actions.insertBulletsList,
                  actions.insertOrderedList,
                  actions.setStrikethrough,
                ]}
                iconTint="#78648B"
                selectedIconTint="#A36E9D"
                style={styles.toolbar}
                iconMap={{
                  [actions.heading1]: ({ tintColor }: IconRecord) => (
                    <Text style={{ color: tintColor, fontWeight: 'bold', fontSize: 16 }}>H1</Text>
                  ),
                  [actions.heading2]: ({ tintColor }: IconRecord) => (
                    <Text style={{ color: tintColor, fontWeight: 'bold', fontSize: 14 }}>H2</Text>
                  ),
                  paragraph: ({ tintColor }: IconRecord) => (
                    <Text style={{ color: tintColor, fontWeight: 'bold', fontSize: 15 }}>P</Text>
                  ),
                }}
              />

              <View style={styles.colorRow}>
                <Text style={styles.colorLabel}>Yazı rengi</Text>

                {[
                  '#55463F',
                  '#8C5AA7',
                  '#B85F78',
                  '#477A68',
                  '#3F6F9B',
                  '#C17B37',
                ].map(color => (
                  <TouchableOpacity
                    key={color}
                    accessibilityLabel={`Yazı rengi ${color}`}
                    onPress={() => {
                      // Toolbar'daki B düğmesiyle aynı adım: önce editörü odakla.
                      (editorRef.current as any)?.showAndroidKeyboard?.();
                      editorRef.current?.setForeColor(color);
                    }}
                    style={[styles.colorDot, { backgroundColor: color }]}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F2ED' },
  loading: { flex: 1, backgroundColor: '#F7F2ED', alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: '#4F4056', fontSize: 29, fontWeight: '600', letterSpacing: -0.8 },
  subtitle: { color: '#8A7D87', fontSize: 13, marginTop: 4 },
  muted: { color: '#8A7D87', fontSize: 13, marginTop: 8 },
  primaryButton: { backgroundColor: '#8E729B', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 20 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '600' },
  noteList: { paddingHorizontal: 18, paddingBottom: 30, flexGrow: 1 },
  emptyState: { flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyEmoji: { color: '#B89BBE', fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: '#4F4056', fontSize: 18, fontWeight: '600' },
  footer: { color: '#A99DA4', fontSize: 11, textAlign: 'center', padding: 12 },
  editorHeader: { paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerAction: { padding: 8 },
  headerActionText: { color: '#80658E', fontWeight: '600', fontSize: 14 },
  saveStatus: { color: '#998C95', fontSize: 11, flex: 1, textAlign: 'center' },
  paperPicker: { paddingBottom: 10 },
  paperOptions: { paddingHorizontal: 14, gap: 8 },
  paperChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 18, borderWidth: 1, borderColor: '#E7DDE4', backgroundColor: '#FFFCFA' },
  paperChipSelected: { borderColor: '#9878A5', backgroundColor: '#F0E8F3' },
  paperSwatch: { width: 13, height: 13, borderRadius: 7, borderWidth: 0.5, borderColor: '#D5CDD1' },
  paperChipText: { color: '#675B66', fontSize: 11 },
  editorBody: { flex: 1 },
  editorContent: { flex: 1 },
  paperOuter: { paddingHorizontal: 12, paddingBottom: 22 },
  paper: { minHeight: 560, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24, borderRadius: 5, borderWidth: 1, borderColor: '#E8DFD8', shadowColor: '#5D4B5A', shadowOpacity: 0.05, shadowRadius: 7, shadowOffset: { width: 0, height: 2 } },
  noteTitle: { fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }), fontSize: 23, fontWeight: '600', paddingVertical: 8, marginBottom: 8, minHeight: 42 },
  toolbar: { backgroundColor: '#F5EDF4', borderRadius: 10, borderWidth: 0, marginBottom: 10 },
  richEditor: { minHeight: 420, flex: 1 },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E8DFE5', marginTop: 10, flexWrap: 'wrap' },
  colorLabel: { color: '#887A86', fontSize: 12, marginRight: 2 },
  colorDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#FFFFFF' },
  bottomBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#EAE1E7', backgroundColor: '#FBF8F5' },
  bottomHint: { color: '#A2969F', fontSize: 10, flex: 1 },
  exportButton: { backgroundColor: '#8E729B', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 18 },
  exportButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(48, 37, 50, 0.38)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFCFA',
    borderRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFE3EC',
  },
  modalIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F0E8F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalEmoji: {
    fontSize: 30,
    color: '#8E729B',
  },
  modalTitle: {
    color: '#4F4056',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalMessage: {
    color: '#8A7D87',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: '#F2EBF1',
  },
  cancelButtonText: {
    color: '#715C79',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: '#A85F78',
  },
  deleteConfirmText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  themeOption: {
    width: 280,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEE4E8',
    backgroundColor: '#FFFCFA',
  },
  themePreview: {
    width: 52,
    height: 64,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E3D9E0',
    padding: 5,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  previewLines: {
    height: 22,
    marginTop: 3,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#D7E3F0',
  },
  previewGrid: {
    height: 22,
    marginTop: 3,
    borderWidth: 1,
    borderColor: '#D7E3D9',
  },
  themeOptionText: {
    flex: 1,
    marginLeft: 14,
    color: '#4F4056',
    fontSize: 15,
    fontWeight: '600',
  },
  themeArrow: {
    color: '#8E729B',
    fontSize: 24,
  },
  themeCancelButton: {
    width: '100%',
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2EBF1',
    borderWidth: 1,
    borderColor: '#E7D9E8',
  },

  themeCancelButtonText: {
    color: '#715C79',
    fontSize: 14,
    fontWeight: '600',
  },

  formatToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 11,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#F5EDF4',
  },
  formatToggleText: {
    color: '#78648B',
    fontSize: 12,
    fontWeight: '600',
  },
  formatToggleArrow: {
    color: '#78648B',
    fontSize: 16,
  },
  formatModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(48, 37, 50, 0.25)',
  },
  formatBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  formatInlineOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  formatPanel: {
    backgroundColor: '#FFFCFA',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 30 : 18,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#EFE3EC',
    gap: 10,
    elevation: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#5D4B5A',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -3 },
      },
      default: {},
    }),
  },
  formatPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  formatPanelTitle: {
    color: '#4F4056',
    fontSize: 17,
    fontWeight: '600',
  },
  formatPanelSubtitle: {
    color: '#8A7D87',
    fontSize: 12,
    marginTop: 3,
  },
  formatCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5EDF4',
  },
  formatCloseText: {
    color: '#78648B',
    fontSize: 16,
  },
  normalTextButton: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 7,
    backgroundColor: '#F5EDF4',
  },
  normalTextButtonLabel: {
    color: '#78648B',
    fontSize: 12,
    fontWeight: '600',
  },
  fixedFormatButton: {
    alignSelf: 'center',
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#8E729B',
    shadowColor: '#5D4B5A',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  fixedFormatButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  fixedFormatButtonArrow: {
    color: '#FFFFFF',
    fontSize: 16,
  },

  formatButtonRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#F7F2ED',
  },


});

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}