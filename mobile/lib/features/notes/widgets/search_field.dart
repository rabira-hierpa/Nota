import 'package:flutter/material.dart';

import '../../../app/app_scope.dart';
import '../../../app/theme.dart';
import '../../../l10n/messages.dart';
import '../state/notes_store.dart';

/// The search box over the note list: words narrow the list as they are
/// typed, `#tags` keep only notes carrying them.
class SearchField extends StatefulWidget {
  const SearchField({super.key});

  @override
  State<SearchField> createState() => _SearchFieldState();
}

class _SearchFieldState extends State<SearchField> {
  final _controller = TextEditingController();
  NotesStore? _store;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final store = AppScope.of(context).notes;
    if (store == _store) return;
    _store?.removeListener(_followStore);
    _store = store..addListener(_followStore);
    _controller.text = store.query;
  }

  @override
  void dispose() {
    _store?.removeListener(_followStore);
    _controller.dispose();
    super.dispose();
  }

  /// The query can be cleared from elsewhere ("Search all notes" keeps it, a section change doesn't touch it).
  void _followStore() {
    final query = _store?.query ?? '';
    if (query != _controller.text) _controller.text = query;
  }

  void _clear() {
    _controller.clear();
    _store?.query = '';
  }

  @override
  Widget build(BuildContext context) {
    final messages = Messages.of(context).notes;
    final colors = NotaColors.of(context);
    return TextField(
      controller: _controller,
      onChanged: (value) => _store?.query = value,
      textInputAction: TextInputAction.search,
      onTapOutside: (_) => FocusManager.instance.primaryFocus?.unfocus(),
      decoration: InputDecoration(
        hintText: messages.searchPlaceholder,
        isDense: true,
        prefixIcon: Icon(Icons.search, color: colors.muted, semanticLabel: messages.search),
        suffixIcon: ListenableBuilder(
          listenable: _controller,
          builder: (context, _) => _controller.text.isEmpty
              ? const SizedBox.shrink()
              : IconButton(icon: const Icon(Icons.close), tooltip: messages.clearSearch, onPressed: _clear),
        ),
      ),
    );
  }
}
