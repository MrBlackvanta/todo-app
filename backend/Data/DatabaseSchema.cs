public sealed record DatabaseSchema(string Name)
{
    const string Key = "Database:Schema";

    const string Expected =
        "Expected the Postgres schema this service owns, such as 'invoice' or 'todo'. One "
        + "connection string serves every app on the cluster, so the schema is the only thing "
        + "that separates them.";

    public static DatabaseSchema Resolve(IConfiguration configuration)
    {
        var configured = Unwrap(configuration[Key]);

        if (configured.Length == 0)
        {
            throw new InvalidOperationException($"Database__Schema is not set. {Expected}");
        }

        if (!configured.All(IsIdentifierCharacter))
        {
            throw new InvalidOperationException(
                $"Database__Schema must contain only letters, digits and underscores so it never "
                    + $"needs quoting in generated DDL. {Expected}"
            );
        }

        return new DatabaseSchema(configured);
    }

    static string Unwrap(string? value) => value?.Trim().Trim('"', '\'').Trim() ?? string.Empty;

    static bool IsIdentifierCharacter(char character) =>
        char.IsAsciiLetterOrDigit(character) || character == '_';
}
