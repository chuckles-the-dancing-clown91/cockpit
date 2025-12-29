import 'package:flutter/services.dart';

/// Abstraction over the backend invocation protocol (Tauri commands).
abstract class CommandInvoker {
  const CommandInvoker();

  Future<dynamic> invokeCommand(
    String command, {
    Map<String, dynamic>? payload,
  });
}

/// Production invoker that mirrors the Rust IPC layer exposed by Tauri.
class TauriCommandInvoker extends CommandInvoker {
  const TauriCommandInvoker({MethodChannel? channel})
      : _channel = channel ?? const MethodChannel('cockpit.backend/commands');

  final MethodChannel _channel;

  @override
  Future<dynamic> invokeCommand(
    String command, {
    Map<String, dynamic>? payload,
  }) async {
    final response = await _channel.invokeMethod<dynamic>(
      'invoke',
      <String, dynamic>{
        'command': command,
        if (payload != null) 'payload': payload,
      },
    );
    return response;
  }
}

/// Mock invoker used for development until the Flutter → Rust bridge is wired.
class MockCommandInvoker extends CommandInvoker {
  const MockCommandInvoker();

  @override
  Future<dynamic> invokeCommand(
    String command, {
    Map<String, dynamic>? payload,
  }) async {
    // This is intentionally minimal; callers provide mock responses.
    return null;
  }
}
