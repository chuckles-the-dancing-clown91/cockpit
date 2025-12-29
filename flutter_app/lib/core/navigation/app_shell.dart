import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../theme/theme_controller.dart';

class AppNavigationScaffold extends ConsumerWidget {
  const AppNavigationScaffold({
    required this.navigationShell,
    super.key,
  });

  final StatefulNavigationShell navigationShell;

  static final List<_NavigationDestination> _destinations = [
    _NavigationDestination(
      title: 'Ideas',
      icon: Icons.lightbulb,
      route: '/ideas',
    ),
    _NavigationDestination(
      title: 'Writing',
      icon: Icons.edit_outlined,
      route: '/writing',
    ),
    _NavigationDestination(
      title: 'Notes',
      icon: Icons.note_alt_outlined,
      route: '/notes',
    ),
    _NavigationDestination(
      title: 'Research',
      icon: Icons.travel_explore_outlined,
      route: '/research',
    ),
  ];

  void _onDestinationSelected(int index) {
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;
    final platformBrightness = MediaQuery.of(context).platformBrightness;
    final themeMode = ref.watch(themeModeProvider);
    final themeController = ref.read(themeModeProvider.notifier);
    final isWide = MediaQuery.of(context).size.width >= 1100;
    final selectedIndex = navigationShell.currentIndex;

    final navigationRail = NavigationRail(
      selectedIndex: selectedIndex,
      onDestinationSelected: _onDestinationSelected,
      backgroundColor: colorScheme.surfaceContainerLow,
      indicatorColor: colorScheme.secondaryContainer,
      labelType: NavigationRailLabelType.all,
      destinations: [
        for (final dest in _destinations)
          NavigationRailDestination(
            icon: Icon(dest.icon),
            selectedIcon: Icon(dest.icon, color: colorScheme.onSecondaryContainer),
            label: Text(dest.title),
          ),
      ],
    );

    final navigationBar = NavigationBar(
      selectedIndex: selectedIndex,
      onDestinationSelected: _onDestinationSelected,
      destinations: [
        for (final dest in _destinations)
          NavigationDestination(
            icon: Icon(dest.icon),
            label: dest.title,
            tooltip: dest.route,
          ),
      ],
    );

    final appBar = AppBar(
      title: const Text('Cockpit'),
      actions: [
        IconButton(
          tooltip: 'Toggle light/dark',
          onPressed: themeController.toggleLightDark,
          icon: Icon(themeController.iconFor(platformBrightness)),
        ),
        PopupMenuButton<ThemeMode>(
          tooltip: 'Theme mode',
          initialValue: themeMode,
          position: PopupMenuPosition.under,
          onSelected: themeController.setThemeMode,
          itemBuilder: (context) => [
            _buildThemeModeMenuItem(
              context,
              value: ThemeMode.system,
              label: 'System default',
              icon: Icons.brightness_auto_rounded,
              isSelected: themeMode == ThemeMode.system,
            ),
            _buildThemeModeMenuItem(
              context,
              value: ThemeMode.light,
              label: 'Light',
              icon: Icons.light_mode_rounded,
              isSelected: themeMode == ThemeMode.light,
            ),
            _buildThemeModeMenuItem(
              context,
              value: ThemeMode.dark,
              label: 'Dark',
              icon: Icons.dark_mode_rounded,
              isSelected: themeMode == ThemeMode.dark,
            ),
          ],
        ),
      ],
    );

    final content = AnimatedSwitcher(
      duration: const Duration(milliseconds: 200),
      switchInCurve: Curves.easeInOut,
      switchOutCurve: Curves.easeInOut,
      child: navigationShell,
    );

    if (isWide) {
      return Scaffold(
        appBar: appBar,
        body: SafeArea(
          top: false,
          child: Row(
            children: [
              navigationRail,
              const VerticalDivider(width: 1),
              Expanded(child: content),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: appBar,
      body: SafeArea(top: false, child: content),
      bottomNavigationBar: navigationBar,
    );
  }
}

class _NavigationDestination {
  const _NavigationDestination({
    required this.title,
    required this.icon,
    required this.route,
  });

  final String title;
  final IconData icon;
  final String route;
}

PopupMenuItem<ThemeMode> _buildThemeModeMenuItem(
  BuildContext context, {
  required ThemeMode value,
  required String label,
  required IconData icon,
  required bool isSelected,
}) {
  final colorScheme = Theme.of(context).colorScheme;
  return PopupMenuItem<ThemeMode>(
    value: value,
    child: Row(
      children: [
        Icon(icon, color: colorScheme.onSurfaceVariant),
        const SizedBox(width: 12),
        Expanded(child: Text(label)),
        if (isSelected) Icon(Icons.check, color: colorScheme.primary),
      ],
    ),
  );
}
