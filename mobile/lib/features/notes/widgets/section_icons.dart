import 'package:flutter/material.dart';

import '../logic/sections.dart';

/// Each section's icon, the same in the drawer and in its empty state.
IconData sectionIcon(NoteSection section) => switch (section) {
  AllSection() => Icons.notes,
  TodaySection() => Icons.today_outlined,
  TodoSection() => Icons.check_box_outlined,
  FavoritesSection() => Icons.star_outline,
  UntaggedSection() => Icons.label_off_outlined,
  VoiceSection() => Icons.mic_none,
  ArchiveSection() => Icons.archive_outlined,
  TrashSection() => Icons.delete_outline,
  TagSection() => Icons.tag,
};
