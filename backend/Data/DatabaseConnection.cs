using Npgsql;

public static class DatabaseConnection
{
    const string Expected =
        "Expected the PostgreSQL session pooler URI from the provider's dashboard, shaped like "
        + "postgresql://user:password@host:5432/postgres. Replace the whole [YOUR-PASSWORD] "
        + "placeholder including its brackets, and percent-encode any @ : / ? # [ ] the password "
        + "contains.";

    public static string Resolve(IConfiguration configuration)
    {
        var configured = Unwrap(configuration.GetConnectionString("Default"));

        if (configured.Length == 0)
        {
            throw new InvalidOperationException($"ConnectionStrings__Default is not set. {Expected}");
        }

        if (!IsPostgresUri(configured))
        {
            if (!configured.Contains('='))
            {
                throw new InvalidOperationException(
                    $"ConnectionStrings__Default is neither a URI nor a key-value connection "
                        + $"string. {Expected}"
                );
            }

            return configured;
        }

        if (!Uri.TryCreate(configured, UriKind.Absolute, out var uri))
        {
            throw new InvalidOperationException(
                $"ConnectionStrings__Default starts with a PostgreSQL scheme but does not parse "
                    + $"as a URI. {Expected}"
            );
        }

        return Expand(uri);
    }

    static string Unwrap(string? value) => value?.Trim().Trim('"', '\'').Trim() ?? string.Empty;

    static bool IsPostgresUri(string value) =>
        value.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
        || value.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase);

    static string Expand(Uri uri)
    {
        var credentials = uri.GetComponents(UriComponents.UserInfo, UriFormat.UriEscaped)
            .Split(':', 2);

        return new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port < 0 ? 5432 : uri.Port,
            Database = uri.AbsolutePath.Trim('/'),
            Username = Uri.UnescapeDataString(credentials[0]),
            Password =
                credentials.Length > 1 ? Uri.UnescapeDataString(credentials[1]) : string.Empty,
            SslMode = SslMode.Require,
            MaxPoolSize = 10,
        }.ConnectionString;
    }
}
