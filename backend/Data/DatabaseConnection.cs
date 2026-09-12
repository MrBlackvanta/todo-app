using Npgsql;

public static class DatabaseConnection
{
    public static string Resolve(IConfiguration configuration)
    {
        var configured = configuration.GetConnectionString("Default");

        if (string.IsNullOrWhiteSpace(configured))
        {
            throw new InvalidOperationException(
                "ConnectionStrings__Default is not set. Supply the PostgreSQL session pooler "
                    + "URI from the database provider's dashboard."
            );
        }

        return Uri.TryCreate(configured, UriKind.Absolute, out var uri)
            && uri.Scheme is "postgres" or "postgresql"
            ? Expand(uri)
            : configured;
    }

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
