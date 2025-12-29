# Headless HTTP bridge (Tauri-free)

The Cockpit backend now exposes a lightweight HTTP command bridge so mobile or
Flutter clients can call the same domain handlers without embedding Tauri.

## Endpoint

```
POST http://localhost:1420/api/command
Content-Type: application/json
```

Body:

```json
{
  "command": "list_ideas",
  "payload": {
    "status": "in_progress",
    "limit": 10,
    "offset": 0
  }
}
```

Response:

```json
{
  "result": [
    { "id": 1, "title": "...", "status": "in_progress", "updatedAt": "..." }
  ]
}
```

## Flutter example

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<void> fetchIdeas() async {
  final uri = Uri.parse('http://localhost:1420/api/command');
  final response = await http.post(
    uri,
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'command': 'list_ideas',
      'payload': {'limit': 5, 'offset': 0}
    }),
  );

  if (response.statusCode == 200) {
    final data = jsonDecode(response.body)['result'];
    print('Ideas: $data');
  } else {
    throw Exception('Bridge error ${response.statusCode}: ${response.body}');
  }
}
```

## Notes

- Commands mirror the previous Tauri command names; payloads use camelCase.
- Set `COCKPIT_HTTP_PORT` to change the listening port (default `1420`).
- Event-driven actions (window creation, live webviews) are not available in
  headless mode and will return an error.
