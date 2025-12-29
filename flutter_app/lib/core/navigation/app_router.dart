import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../domains/ideas/ideas_screen.dart';
import '../../domains/notes/notes_screen.dart';
import '../../domains/research/research_screen.dart';
import '../../domains/writing/writing_screen.dart';
import 'app_shell.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/ideas',
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return AppNavigationScaffold(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/ideas',
                name: 'ideas',
                pageBuilder: (context, state) => const NoTransitionPage(
                  child: IdeasScreen(),
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/writing',
                name: 'writing',
                pageBuilder: (context, state) => const NoTransitionPage(
                  child: WritingScreen(),
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/notes',
                name: 'notes',
                pageBuilder: (context, state) => const NoTransitionPage(
                  child: NotesScreen(),
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/research',
                name: 'research',
                pageBuilder: (context, state) => const NoTransitionPage(
                  child: ResearchScreen(),
                ),
              ),
            ],
          ),
        ],
      ),
    ],
    // Keep navigation state alive while swapping tabs.
    restorationScopeId: 'cockpit-router',
    observers: [
      HeroController(),
    ],
  );
});
