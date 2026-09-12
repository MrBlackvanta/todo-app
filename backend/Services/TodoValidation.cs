public static class TodoValidation
{
    public static string? Reject(SaveTodoListRequest request)
    {
        if (request.Items.Count > TodoLimits.ItemCount)
        {
            return $"A list holds at most {TodoLimits.ItemCount} items.";
        }

        var seen = new HashSet<string>(StringComparer.Ordinal);

        foreach (var item in request.Items)
        {
            if (string.IsNullOrWhiteSpace(item.Id) || item.Id.Length > TodoLimits.IdLength)
            {
                return $"Every item needs an id of at most {TodoLimits.IdLength} characters.";
            }

            if (!seen.Add(item.Id))
            {
                return "Item ids must be unique within a list.";
            }

            var title = item.Title.Trim();

            if (title.Length == 0)
            {
                return "An item title cannot be empty.";
            }

            if (title.Length > TodoLimits.TitleLength)
            {
                return $"An item title is at most {TodoLimits.TitleLength} characters.";
            }
        }

        return null;
    }
}
