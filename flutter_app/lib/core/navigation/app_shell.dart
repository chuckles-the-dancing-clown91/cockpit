import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

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

    final content = AnimatedSwitcher(
      duration: const Duration(milliseconds: 200),
      switchInCurve: Curves.easeInOut,
      switchOutCurve: Curves.easeInOut,
      child: navigationShell,
    );

    if (isWide) {
      return Scaffold(
        body: SafeArea(
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
      body: SafeArea(child: content),
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
