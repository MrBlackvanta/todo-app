using Microsoft.EntityFrameworkCore;

public class TodoService(TodoDbContext db, TimeProvider clock) : ITodoService
{
    public async Task<TodoListDto?> GetAsync(Guid id, CancellationToken token)
    {
        var list = await db
            .Lists.AsNoTracking()
            .Include(entry => entry.Items)
            .FirstOrDefaultAsync(entry => entry.Id == id, token);

        return list is null ? null : ToDto(list);
    }

    public async Task<TodoListDto> SaveAsync(
        Guid id,
        IReadOnlyList<TodoItemDto> items,
        CancellationToken token
    )
    {
        var now = clock.GetUtcNow();
        var list = await db
            .Lists.Include(entry => entry.Items)
            .FirstOrDefaultAsync(entry => entry.Id == id, token);

        if (list is null)
        {
            list = new TodoList { Id = id, CreatedAt = now };
            db.Lists.Add(list);
        }
        else
        {
            db.Items.RemoveRange(list.Items);
            list.Items.Clear();
        }

        list.UpdatedAt = now;

        foreach (var (item, position) in items.Select((item, position) => (item, position)))
        {
            list.Items.Add(
                new TodoItem
                {
                    Id = item.Id,
                    ListId = id,
                    Title = item.Title.Trim(),
                    Completed = item.Completed,
                    Position = position,
                }
            );
        }

        await db.SaveChangesAsync(token);

        return ToDto(list);
    }

    private static TodoListDto ToDto(TodoList list) =>
        new(
            list.Id,
            list.UpdatedAt,
            [
                .. list
                    .Items.OrderBy(item => item.Position)
                    .Select(item => new TodoItemDto(item.Id, item.Title, item.Completed)),
            ]
        );
}
