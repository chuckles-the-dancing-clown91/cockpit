/// Represents the runtime profile for the backend API bridge.
enum BackendProfile { dev, prod }

/// Runtime configuration for talking to the Rust backend.
///
/// Values are pulled from `--dart-define` flags so CI builds and
/// local development can point at different transports without
/// code changes.
class BackendEnvironment {
  const BackendEnvironment({
    required this.profile,
    required this.httpBaseUrl,
    required this.commandPath,
    required this.methodChannelName,
    this.grpcEndpoint,
    this.preferNative = false,
  });

  /// Load configuration from compile-time environment (via `--dart-define`).
  factory BackendEnvironment.fromEnvironment() {
    final envName =
        const String.fromEnvironment('COCKPIT_ENV', defaultValue: 'dev')
            .toLowerCase();
    final profile =
        envName == 'prod' || envName == 'production'
            ? BackendProfile.prod
            : BackendProfile.dev;

    final httpBaseUrl = const String.fromEnvironment(
      'COCKPIT_API_URL',
      defaultValue: 'http://localhost:1420',
    );
    final commandPath = const String.fromEnvironment(
      'COCKPIT_COMMAND_PATH',
      defaultValue: '/api/command',
    );
    final methodChannelName = const String.fromEnvironment(
      'COCKPIT_NATIVE_CHANNEL',
      defaultValue: 'cockpit.backend/commands',
    );
    final grpcEndpoint =
        const String.fromEnvironment('COCKPIT_GRPC_URL', defaultValue: '');
    final preferNative =
        const bool.fromEnvironment('COCKPIT_USE_NATIVE', defaultValue: false);

    return BackendEnvironment(
      profile: profile,
      httpBaseUrl: httpBaseUrl,
      commandPath: commandPath,
      methodChannelName: methodChannelName,
      grpcEndpoint: grpcEndpoint.isEmpty ? null : grpcEndpoint,
      preferNative: preferNative,
    );
  }

  final BackendProfile profile;
  final String httpBaseUrl;
  final String commandPath;
  final String methodChannelName;
  final String? grpcEndpoint;
  final bool preferNative;

  bool get isProd => profile == BackendProfile.prod;

  Uri get commandUri => Uri.parse('$httpBaseUrl$commandPath');

  BackendEnvironment copyWith({
    BackendProfile? profile,
    String? httpBaseUrl,
    String? commandPath,
    String? methodChannelName,
    String? grpcEndpoint,
    bool? preferNative,
  }) {
    return BackendEnvironment(
      profile: profile ?? this.profile,
      httpBaseUrl: httpBaseUrl ?? this.httpBaseUrl,
      commandPath: commandPath ?? this.commandPath,
      methodChannelName: methodChannelName ?? this.methodChannelName,
      grpcEndpoint: grpcEndpoint ?? this.grpcEndpoint,
      preferNative: preferNative ?? this.preferNative,
    );
  }

  @override
  String toString() {
    return 'BackendEnvironment(profile: $profile, httpBaseUrl: $httpBaseUrl, '
        'commandPath: $commandPath, methodChannelName: $methodChannelName, '
        'grpcEndpoint: $grpcEndpoint, preferNative: $preferNative)';
  }
}
