using Microsoft.EntityFrameworkCore;

public static class DatabaseMigrations
{
    const string Key = "Migrations:Apply";

    public static async Task EnsureUpToDateAsync<TContext>(IServiceProvider services)
        where TContext : DbContext
    {
        await using var scope = services.CreateAsyncScope();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var database = scope.ServiceProvider.GetRequiredService<TContext>().Database;

        if (configuration.GetValue(Key, false))
        {
            await database.MigrateAsync();

            return;
        }

        var pending = (await database.GetPendingMigrationsAsync()).ToArray();

        if (pending.Length == 0)
        {
            return;
        }

        throw new InvalidOperationException(
            $"This build will not serve against a schema it does not match. Pending: "
                + $"{string.Join(", ", pending)}. Set Migrations__Apply=true on the one deploy "
                + $"that should run them, then remove it."
        );
    }
}
