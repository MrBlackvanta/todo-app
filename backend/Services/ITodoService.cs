public interface ITodoService
{
    Task<TodoListDto?> GetAsync(Guid id, CancellationToken token);

    Task<TodoListDto> SaveAsync(
        Guid id,
        IReadOnlyList<TodoItemDto> items,
        CancellationToken token
    );
}
