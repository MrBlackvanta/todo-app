public record TodoItemDto(string Id, string Title, bool Completed);

public record TodoListDto(Guid Id, DateTimeOffset UpdatedAt, IReadOnlyList<TodoItemDto> Items);

public record SaveTodoListRequest(IReadOnlyList<TodoItemDto> Items);
