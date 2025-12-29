import '../command_client.dart';
import '../models.dart';

class NotesService {
  const NotesService(this._client);

  final CockpitCommandClient _client;

  Future<List<Note>> listForEntity({
    required String entityType,
    required int entityId,
  }) async {
    final result = await _client.invoke<dynamic>(
      'kg_list_notes_for_entity',
      payload: <String, dynamic>{
        'entityType': entityType,
        'entity_type': entityType,
        'entityId': entityId,
        'entity_id': entityId,
      },
    );
    return mapJsonList(result, Note.fromJson);
  }

  Future<Note> get(int id) {
    return _client.invoke<Note>(
      'kg_get_note',
      payload: <String, dynamic>{'id': id},
      parser: (data) => mapJson<Note>(data, Note.fromJson),
    );
  }

  Future<Note> create(CreateNoteInput input) {
    final body = input.toJson();
    return _client.invoke<Note>(
      'kg_create_note',
      payload: <String, dynamic>{
        ...body,
        'input': body,
      },
      parser: (data) => mapJson<Note>(data, Note.fromJson),
    );
  }

  Future<Note> update(UpdateNoteInput input) {
    return _client.invoke<Note>(
      'kg_update_note',
      payload: input.toPayload(),
      parser: (data) => mapJson<Note>(data, Note.fromJson),
    );
  }

  Future<void> delete(int id) {
    return _client.invoke<void>(
      'kg_delete_note',
      payload: <String, dynamic>{'id': id},
    );
  }
}
