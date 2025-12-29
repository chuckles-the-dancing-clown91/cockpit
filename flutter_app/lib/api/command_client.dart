import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

import 'backend_environment.dart';

typedef JsonMap = Map<String, dynamic>;

class CommandInvocationException implements Exception {
  CommandInvocationException({
    required this.command,
    required this.transport,
    this.statusCode,
    this.body,
    this.cause,
  });

  final String command;
  final String transport;
  final int? statusCode;
  final String? body;
  final Object? cause;

  @override
  String toString() {
    final status = statusCode != null ? ' (status $statusCode)' : '';
    final payload = body != null ? ' body: $body' : '';
    final rootCause = cause != null ? ' cause: $cause' : '';
    return 'CommandInvocationException[$transport] $command$status$payload$rootCause';
  }
}

/// Abstraction over the transport mechanism used to reach the Rust backend.
abstract class CommandTransport {
  String get label;

  Future<dynamic> invoke(
    String command, {
    JsonMap? payload,
  });
}

/// HTTP transport that hits the Axum headless bridge.
class HttpCommandTransport implements CommandTransport {
  HttpCommandTransport({
    required this.environment,
    http.Client? client,
  }) : _client = client ?? http.Client();

  final BackendEnvironment environment;
  final http.Client _client;

  @override
  String get label => 'http';

  @override
  Future<dynamic> invoke(
    String command, {
    JsonMap? payload,
  }) async {
    final response = await _client.post(
      environment.commandUri,
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode(<String, dynamic>{
        'command': command,
        if (payload != null) 'payload': payload,
      }),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw CommandInvocationException(
        command: command,
        transport: label,
        statusCode: response.statusCode,
        body: response.body,
      );
    }

    final decoded = jsonDecode(response.body);
    if (decoded is Map<String, dynamic> && decoded.containsKey('result')) {
      return decoded['result'];
    }
    return decoded;
  }
}

/// Native channel transport that mirrors the Tauri command bridge.
class MethodChannelCommandTransport implements CommandTransport {
  MethodChannelCommandTransport({
    required this.channelName,
    MethodChannel? channel,
  }) : _channel = channel ?? MethodChannel(channelName);

  final String channelName;
  final MethodChannel _channel;

  @override
  String get label => 'method_channel';

  @override
  Future<dynamic> invoke(
    String command, {
    JsonMap? payload,
  }) async {
    final result = await _channel.invokeMethod<dynamic>(
      'invoke',
      <String, dynamic>{
        'command': command,
        if (payload != null) 'payload': payload,
      },
    );
    return result;
  }
}

/// Fallback transport that tries the primary channel first and then falls back.
class HybridCommandTransport implements CommandTransport {
  HybridCommandTransport({
    required this.primary,
    required this.fallback,
  });

  final CommandTransport primary;
  final CommandTransport fallback;

  @override
  String get label => 'hybrid(${primary.label} -> ${fallback.label})';

  @override
  Future<dynamic> invoke(
    String command, {
    JsonMap? payload,
  }) async {
    try {
      return await primary.invoke(command, payload: payload);
    } on PlatformException catch (_) {
      // Missing plugin or not running inside a native shell.
    } on CommandInvocationException {
      // HTTP failure; try the fallback.
    }

    return fallback.invoke(command, payload: payload);
  }
}

/// High-level client used by the domain services.
class CockpitCommandClient {
  CockpitCommandClient({
    BackendEnvironment? environment,
    CommandTransport? transport,
    http.Client? httpClient,
    MethodChannel? methodChannel,
  })  : environment = environment ?? BackendEnvironment.fromEnvironment(),
        transport = transport ?? _buildTransport(environment, httpClient, methodChannel);

  final BackendEnvironment environment;
  final CommandTransport transport;

  Future<T> invoke<T>(
    String command, {
    JsonMap? payload,
    T Function(dynamic data)? parser,
  }) async {
    final result = await transport.invoke(command, payload: payload);
    if (parser != null) {
      return parser(result);
    }
    return result as T;
  }
}

CommandTransport _buildTransport(
  BackendEnvironment? environment,
  http.Client? httpClient,
  MethodChannel? methodChannel,
) {
  final resolvedEnv = environment ?? BackendEnvironment.fromEnvironment();

  final primary = resolvedEnv.preferNative
      ? MethodChannelCommandTransport(
          channelName: resolvedEnv.methodChannelName,
          channel: methodChannel,
        )
      : HttpCommandTransport(
          environment: resolvedEnv,
          client: httpClient,
        );

  final fallback = resolvedEnv.preferNative
      ? HttpCommandTransport(
          environment: resolvedEnv,
          client: httpClient,
        )
      : MethodChannelCommandTransport(
          channelName: resolvedEnv.methodChannelName,
          channel: methodChannel,
        );

  return HybridCommandTransport(primary: primary, fallback: fallback);
}
