public class TodoItem
{
    public string Id { get; init; } = "";

    public Guid ListId { get; init; }

    public string Title { get; set; } = "";

    public bool Completed { get; set; }

    public int Position { get; set; }
}
