import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Note } from '../types/note';

type Props = {
  note: Note;
  onPress: () => void;
  onDelete: () => void;
  onChangeTheme: () => void;
};

export function NoteCard({
  note,
  onPress,
  onDelete,
  onChangeTheme,
}: Props) {
  const date = new Date(note.updatedAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.row}>
        <View style={styles.textArea}>
          <Text style={styles.title} numberOfLines={1}>
            {note.title.trim() || 'Adsız not'}
          </Text>

          <Text style={styles.preview} numberOfLines={2}>
            {note.contentHtml
              .replace(/<[^>]*>/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .trim() || 'Boş sayfa — yazmaya devam et.'}
          </Text>

          <Text style={styles.date}>{date}</Text>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={onChangeTheme}
            style={styles.menuButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Not temasını değiştir"
          >
            <Text style={styles.menuText}>⋯</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onDelete}
            style={styles.deleteButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Notu sil"
          >
            <Text style={styles.deleteText}>Sil</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFCFA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: '#EEE4E8',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textArea: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    color: '#4F4056',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  preview: {
    color: '#827780',
    fontSize: 12,
    lineHeight: 18,
  },
  date: {
    color: '#B0A3AA',
    fontSize: 10,
    marginTop: 9,
  },
  cardActions: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  menuButton: {
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  menuText: {
    color: '#80658E',
    fontSize: 26,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  deleteText: {
    color: '#B27683',
    fontSize: 12,
  },
});