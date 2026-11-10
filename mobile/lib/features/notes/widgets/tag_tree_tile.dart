import 'package:flutter/material.dart';

import '../../../app/theme.dart';
import '../../../l10n/messages.dart';
import '../logic/tags.dart';

/// One tag in the drawer, with its nested tags below it when expanded.
/// Each level is indented; the arrow opens and closes the level below.
class TagTreeTile extends StatelessWidget {
  const TagTreeTile({
    super.key,
    required this.node,
    required this.selectedPath,
    required this.expanded,
    required this.onSelect,
    required this.onToggle,
    this.depth = 0,
  });

  final TagNode node;

  /// The tag whose notes the list shows, if a tag is chosen.
  final String? selectedPath;

  /// Paths of the tags whose children show.
  final Set<String> expanded;
  final ValueChanged<String> onSelect;
  final ValueChanged<String> onToggle;
  final int depth;

  static const _indent = 16.0;

  @override
  Widget build(BuildContext context) {
    final messages = Messages.of(context).sections;
    final colors = NotaColors.of(context);
    final isOpen = expanded.contains(node.path);
    final hasChildren = node.children.isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        ListTile(
          selected: node.path == selectedPath,
          contentPadding: EdgeInsetsDirectional.only(start: 16 + depth * _indent, end: 8),
          leading: Icon(Icons.tag, color: colors.muted),
          minLeadingWidth: 24,
          horizontalTitleGap: 12,
          title: Text(node.name, maxLines: 1, overflow: TextOverflow.ellipsis),
          onTap: () => onSelect(node.path),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Semantics(
                label: messages.noteCount(node.count),
                child: ExcludeSemantics(child: Text('${node.count}', style: Theme.of(context).textTheme.bodySmall)),
              ),
              if (hasChildren)
                IconButton(
                  icon: Icon(isOpen ? Icons.expand_less : Icons.expand_more),
                  tooltip: isOpen ? messages.collapseTag(node.path) : messages.expandTag(node.path),
                  onPressed: () => onToggle(node.path),
                )
              else
                const SizedBox(width: 48),
            ],
          ),
        ),
        if (hasChildren && isOpen)
          for (final child in node.children)
            TagTreeTile(
              node: child,
              selectedPath: selectedPath,
              expanded: expanded,
              onSelect: onSelect,
              onToggle: onToggle,
              depth: depth + 1,
            ),
      ],
    );
  }
}
